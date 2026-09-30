import { useCallback, useEffect, useRef, useState } from 'react'
import { getBestMatch, scoreAllPoses } from './matcher'
import { getReferencePoses } from './reference'
import { mediaPipeFaceToLandmarks, mediaPipeToLandmarks } from './landmarks'
import { TemporalPoseSmoother } from './smoother'
import type { DetectorMetrics, DetectorState, FaceLandmarkMap, LandmarkMap, PoseScore, TemporalResult } from './types'

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

type PoseLandmarkerLike = { detectForVideo: (video: HTMLVideoElement, timestamp: number) => { poseLandmarks?: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>> }; close: () => void }
type FaceLandmarkerLike = { detectForVideo: (video: HTMLVideoElement, timestamp: number) => { faceLandmarks?: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>> }; close: () => void }

async function createLandmarkers(): Promise<{ pose: PoseLandmarkerLike; face: FaceLandmarkerLike }> {
  const vision = await import('@mediapipe/tasks-vision')
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_ROOT)
  const [pose, face] = await Promise.all([
    vision.PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5 }),
    vision.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' }, runningMode: 'VIDEO', numFaces: 1, minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5, minTrackingConfidence: .5 }),
  ])
  return { pose: pose as unknown as PoseLandmarkerLike, face: face as unknown as FaceLandmarkerLike }
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
  const [state, setState] = useState<DetectorState>('idle')
  const [error, setError] = useState<string | undefined>()
  const [currentPoints, setCurrentPoints] = useState<LandmarkMap>({})
  const [currentFacePoints, setCurrentFacePoints] = useState<FaceLandmarkMap>({})
  const [scores, setScores] = useState<PoseScore[]>([])
  const [temporal, setTemporal] = useState<TemporalResult>({ state: 'searching', holdMs: 0, stableFrames: 0 })
  const [metrics, setMetrics] = useState<DetectorMetrics>({ fps: 0, inferenceMs: 0, usableLandmarks: 0, quality: 0, cameraReady: false, modelReady: false, faceModelReady: false })

  const stop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null
    landmarkerRef.current?.close(); landmarkerRef.current = null; faceLandmarkerRef.current?.close(); faceLandmarkerRef.current = null
    smootherRef.current.reset(); setCurrentPoints({}); setCurrentFacePoints({}); setScores([]); setTemporal({ state: 'searching', holdMs: 0, stableFrames: 0 }); setMetrics(previous => ({ ...previous, cameraReady: false, modelReady: false, faceModelReady: false, fps: 0 })); setState('idle')
  }, [])

  const start = useCallback(async () => {
    setError(undefined); setState('loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      streamRef.current = stream
      if (!videoRef.current) throw new Error('Video element is not ready')
      videoRef.current.srcObject = stream; await videoRef.current.play(); setMetrics(previous => ({ ...previous, cameraReady: true })); setState('model_loading')
      const landmarkers = await createLandmarkers(); landmarkerRef.current = landmarkers.pose; faceLandmarkerRef.current = landmarkers.face; setMetrics(previous => ({ ...previous, modelReady: true, faceModelReady: true })); setState('ready')
      refsRef.current = getReferencePoses(); smootherRef.current.reset(); lastFrameRef.current = 0
      const loop = () => {
        const video = videoRef.current; const landmarker = landmarkerRef.current; const faceLandmarker = faceLandmarkerRef.current
        if (!video || !landmarker || !faceLandmarker || video.readyState < 2) { frameRef.current = requestAnimationFrame(loop); return }
        const now = performance.now(); const started = performance.now(); const result = landmarker.detectForVideo(video, now); const inferenceMs = performance.now() - started
        const faceResult = faceLandmarker.detectForVideo(video, now); const points = mediaPipeToLandmarks(result.poseLandmarks?.[0] ?? []); const facePoints = mediaPipeFaceToLandmarks(faceResult.faceLandmarks?.[0] ?? []); const nextScores = scoreAllPoses(refsRef.current, points, facePoints); const target = targetId ? nextScores.find(item => item.poseId === targetId) : getBestMatch(refsRef.current, points, facePoints); const nextTemporal = smootherRef.current.push(target, now)
        const delta = lastFrameRef.current ? now - lastFrameRef.current : 0; if (delta > 0) { fpsSamplesRef.current = [...fpsSamplesRef.current, 1000 / delta].slice(-20) }
        lastFrameRef.current = now; setCurrentPoints(points); setCurrentFacePoints(facePoints); setScores(nextScores); setTemporal(nextTemporal); setMetrics({ fps: fpsSamplesRef.current.reduce((a, b) => a + b, 0) / Math.max(1, fpsSamplesRef.current.length), inferenceMs, usableLandmarks: Object.keys(points).length, quality: target?.quality ?? 0, cameraReady: true, modelReady: true, faceModelReady: true }); frameRef.current = requestAnimationFrame(loop)
      }
      frameRef.current = requestAnimationFrame(loop)
    } catch (cause) {
      const message = cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'Camera permission was denied. Allow access and try again.' : cause instanceof Error ? cause.message : 'Camera or pose model could not start.'
      setError(message); setState(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'camera_denied' : 'camera_error'); stop()
    }
  }, [stop, targetId])

  useEffect(() => () => stop(), [stop])
  return { videoRef, state, error, currentPoints, currentFacePoints, scores, temporal, metrics, start, stop, annotatedCount: refsRef.current.filter(item => item.annotation).length }
}
