import { useCallback, useEffect, useRef, useState } from 'react'
import { getBestMatch, scoreAllPoses } from './matcher'
import { getReferencePoses, isReferenceReady } from './reference'
import { mediaPipeFaceToLandmarks, mediaPipeToLandmarks } from './landmarks'
import { TemporalPoseSmoother } from './smoother'
import { extractPoseFeatures } from './features'
import type { OnnxPoseClassifier } from '../model/onnxClassifier'
import type { DetectorMetrics, DetectorState, FaceLandmarkMap, LandmarkMap, PoseFeatures, PoseScore, TemporalResult } from './types'

const VISION_VERSION = '0.10.35'
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm/`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
type Point3D = { x: number; y: number; z?: number; visibility?: number }
type PoseLandmarkerLike = { detectForVideo: (video: HTMLVideoElement, timestamp: number) => { poseLandmarks?: Array<Array<Point3D>> }; close: () => void }
type FaceLandmarkerLike = { detectForVideo: (video: HTMLVideoElement, timestamp: number) => { faceLandmarks?: Array<Array<Point3D>> }; close: () => void }

async function createLandmarkers(delegate: 'GPU' | 'CPU'): Promise<{ pose: PoseLandmarkerLike; face: FaceLandmarkerLike }> {
  const vision = await import('@mediapipe/tasks-vision')
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_ROOT)
  const [pose, face] = await Promise.all([
    vision.PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5 }),
    vision.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate }, runningMode: 'VIDEO', numFaces: 1, minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5, minTrackingConfidence: .5 }),
  ])
  return { pose: pose as unknown as PoseLandmarkerLike, face: face as unknown as FaceLandmarkerLike }
}

async function loadLandmarkers(): Promise<{ pose: PoseLandmarkerLike; face: FaceLandmarkerLike }> {
  try { return await createLandmarkers('GPU') } catch (gpuError) {
    try { return await createLandmarkers('CPU') } catch (cpuError) {
      const gpuMessage = gpuError instanceof Error ? gpuError.message : String(gpuError)
      const cpuMessage = cpuError instanceof Error ? cpuError.message : String(cpuError)
      throw new Error(`MediaPipe models could not load. GPU: ${gpuMessage}. CPU fallback: ${cpuMessage}`)
    }
  }
}

export function usePoseDetector(targetId?: string) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const landmarkerRef = useRef<PoseLandmarkerLike | null>(null)
  const faceLandmarkerRef = useRef<FaceLandmarkerLike | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const smootherRef = useRef(new TemporalPoseSmoother())
  const lastFrameRef = useRef(0)
  const fpsSamplesRef = useRef<number[]>([])
  const refsRef = useRef(getReferencePoses())
  const targetIdRef = useRef(targetId)
  targetIdRef.current = targetId
  const classifierRef = useRef<OnnxPoseClassifier | null>(null)
  const runTokenRef = useRef(0)
  const [state, setState] = useState<DetectorState>('idle')
  const [error, setError] = useState<string | undefined>()
  const [currentPoints, setCurrentPoints] = useState<LandmarkMap>({})
  const [currentFacePoints, setCurrentFacePoints] = useState<FaceLandmarkMap>({})
  const [currentFeatures, setCurrentFeatures] = useState<PoseFeatures>(() => extractPoseFeatures({}))
  const [scores, setScores] = useState<PoseScore[]>([])
  const [temporal, setTemporal] = useState<TemporalResult>({ state: 'searching', holdMs: 0, stableFrames: 0 })
  const [metrics, setMetrics] = useState<DetectorMetrics>({ fps: 0, inferenceMs: 0, usableLandmarks: 0, quality: 0, cameraReady: false, modelReady: false, faceModelReady: false, classifierReady: false })

  const cleanup = useCallback(() => {
    runTokenRef.current += 1
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close(); landmarkerRef.current = null
    faceLandmarkerRef.current?.close(); faceLandmarkerRef.current = null
  }, [])

  const stop = useCallback(() => {
    cleanup(); classifierRef.current = null; smootherRef.current.reset(); setCurrentPoints({}); setCurrentFacePoints({}); setCurrentFeatures(extractPoseFeatures({})); setScores([]); setTemporal({ state: 'searching', holdMs: 0, stableFrames: 0 }); setMetrics({ fps: 0, inferenceMs: 0, usableLandmarks: 0, quality: 0, cameraReady: false, modelReady: false, faceModelReady: false, classifierReady: false }); setState('idle')
  }, [cleanup])

  const start = useCallback(async () => {
    cleanup(); classifierRef.current = null; setError(undefined); setState('loading'); setMetrics(previous => ({ ...previous, cameraReady: false, modelReady: false, faceModelReady: false, classifierReady: false }))
    const runToken = runTokenRef.current
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is unavailable. Open the app on localhost or HTTPS.')
      if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) throw new Error('Camera access requires localhost or HTTPS.')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      streamRef.current = stream
      if (!videoRef.current) throw new Error('Video element is not ready.')
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setMetrics(previous => ({ ...previous, cameraReady: true }))
      setState('model_loading')
      const landmarkers = await loadLandmarkers()
      if (runToken !== runTokenRef.current) { landmarkers.pose.close(); landmarkers.face.close(); return }
      landmarkerRef.current = landmarkers.pose; faceLandmarkerRef.current = landmarkers.face
      const { OnnxPoseClassifier } = await import('../model/onnxClassifier')
      classifierRef.current = await OnnxPoseClassifier.tryLoad().catch(() => null)
      setMetrics(previous => ({ ...previous, modelReady: true, faceModelReady: true, classifierReady: Boolean(classifierRef.current) })); setState('ready')
      refsRef.current = getReferencePoses(); smootherRef.current.reset(); lastFrameRef.current = 0; fpsSamplesRef.current = []
      const loop = async () => {
        if (runToken !== runTokenRef.current) return
        const video = videoRef.current; const landmarker = landmarkerRef.current; const faceLandmarker = faceLandmarkerRef.current
        if (!video || !landmarker || !faceLandmarker || video.readyState < 2) { frameRef.current = requestAnimationFrame(() => { void loop() }); return }
        try {
          const now = performance.now(); const started = performance.now()
          const result = landmarker.detectForVideo(video, now)
          const faceResult = faceLandmarker.detectForVideo(video, now)
          const inferenceMs = performance.now() - started
          const points = mediaPipeToLandmarks(result.poseLandmarks?.[0] ?? [])
          const facePoints = mediaPipeFaceToLandmarks(faceResult.faceLandmarks?.[0] ?? [])
          const features = extractPoseFeatures(points, facePoints)
          const nextScores = scoreAllPoses(refsRef.current, points, facePoints)
          const classifierPrediction = classifierRef.current ? await classifierRef.current.predict(features.values).catch(() => undefined) : undefined
          if (runToken !== runTokenRef.current) return
          const geometricBest = getBestMatch(refsRef.current, points, facePoints)
          const modelAgrees = !classifierPrediction || classifierPrediction.confidence < .6 || !geometricBest || geometricBest.poseId === classifierPrediction.label.toLowerCase()
          const focused = targetIdRef.current ? nextScores.find(item => item.poseId === targetIdRef.current && item.similarity >= .6) : undefined
          const target = modelAgrees ? (targetIdRef.current ? focused : geometricBest) : undefined
          const nextTemporal = smootherRef.current.push(target, now)
          const delta = lastFrameRef.current ? now - lastFrameRef.current : 0
          if (delta > 0) fpsSamplesRef.current = [...fpsSamplesRef.current, 1000 / delta].slice(-20)
          lastFrameRef.current = now
          setCurrentPoints(points); setCurrentFacePoints(facePoints); setCurrentFeatures(features); setScores(nextScores); setTemporal(nextTemporal)
          setMetrics({ fps: fpsSamplesRef.current.reduce((a, b) => a + b, 0) / Math.max(1, fpsSamplesRef.current.length), inferenceMs, usableLandmarks: Object.keys(points).length, quality: features.quality, cameraReady: true, modelReady: true, faceModelReady: true, classifierReady: Boolean(classifierRef.current) })
          if (Object.keys(points).length === 0) setState('no_body')
          else if (Object.keys(facePoints).length === 0) setState('no_face')
          else setState(target ? 'ready' : 'no_match')
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Landmark inference failed.')
          setState('camera_error')
        }
        frameRef.current = requestAnimationFrame(() => { void loop() })
      }
      frameRef.current = requestAnimationFrame(() => { void loop() })
    } catch (cause) {
      const domError = cause instanceof DOMException
      const message = domError && cause.name === 'NotAllowedError' ? 'Camera permission was denied. Allow access and try again.' : cause instanceof Error ? cause.message : 'Camera or pose model could not start.'
      cleanup(); setError(message); setState(domError && cause.name === 'NotAllowedError' ? 'camera_denied' : message.includes('MediaPipe') ? 'model_error' : 'camera_error')
    }
  }, [cleanup, targetId])

  useEffect(() => () => cleanup(), [cleanup])
  return { videoRef, state, error, currentPoints, currentFacePoints, currentFeatures, scores, temporal, metrics, start, stop, retry: start, annotatedCount: refsRef.current.filter(isReferenceReady).length }
}
