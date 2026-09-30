import { FEATURE_WEIGHTS, POSE_ENGINE_CONFIG } from './config'
import { distance, jointAngle, lineAngle, midpoint, normalizeLandmarks, signedAngleDelta, weightedMean } from './math'
import type { FaceLandmarkMap, FeatureName, LandmarkMap, PoseFeatures } from './types'

function angle(points: LandmarkMap, a: keyof LandmarkMap, b: keyof LandmarkMap, c: keyof LandmarkMap): number | undefined {
  const first = points[a]; const middle = points[b]; const last = points[c]
  if (!first || !middle || !last) return undefined
  return jointAngle(first, middle, last) ?? undefined
}

function put(values: Record<FeatureName, number>, name: FeatureName, value: number | undefined) { if (value !== undefined && Number.isFinite(value)) values[name] = value }

export function extractPoseFeatures(input: LandmarkMap, faceInput: FaceLandmarkMap = {}): PoseFeatures {
  const missingLandmarks = Object.keys(FEATURE_WEIGHTS).length ? (['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'] as const).filter(name => !input[name]) : []
  let points: LandmarkMap
  try { points = normalizeLandmarks(input) } catch { return { points: input, values: {}, regions: { arms: 0, torso: 0, legs: 0, head: 0 }, usableLandmarks: Object.keys(input).length, missingLandmarks: [...missingLandmarks], quality: 0, faceQuality: 0 } }
  const values: Record<FeatureName, number> = {}
  put(values, 'left_elbow_angle', angle(points, 'left_shoulder', 'left_elbow', 'left_wrist'))
  put(values, 'right_elbow_angle', angle(points, 'right_shoulder', 'right_elbow', 'right_wrist'))
  put(values, 'left_shoulder_angle', angle(points, 'left_elbow', 'left_shoulder', 'left_hip'))
  put(values, 'right_shoulder_angle', angle(points, 'right_elbow', 'right_shoulder', 'right_hip'))
  put(values, 'left_knee_angle', angle(points, 'left_hip', 'left_knee', 'left_ankle'))
  put(values, 'right_knee_angle', angle(points, 'right_hip', 'right_knee', 'right_ankle'))
  put(values, 'left_hip_angle', angle(points, 'left_shoulder', 'left_hip', 'left_knee'))
  put(values, 'right_hip_angle', angle(points, 'right_shoulder', 'right_hip', 'right_knee'))
  const shoulderCenter = points.left_shoulder && points.right_shoulder ? midpoint(points.left_shoulder, points.right_shoulder) : undefined
  const hipCenter = points.left_hip && points.right_hip ? midpoint(points.left_hip, points.right_hip) : undefined
  if (points.left_shoulder && points.right_shoulder) put(values, 'shoulder_tilt', lineAngle(points.left_shoulder, points.right_shoulder))
  if (points.left_hip && points.right_hip) put(values, 'hip_tilt', lineAngle(points.left_hip, points.right_hip))
  if (shoulderCenter && hipCenter) put(values, 'torso_lean', signedAngleDelta(lineAngle(shoulderCenter, hipCenter), 90))
  if (points.left_ankle && points.right_ankle) put(values, 'leg_spread', distance(points.left_ankle, points.right_ankle))
  if (points.left_wrist && points.right_wrist) put(values, 'arm_span', distance(points.left_wrist, points.right_wrist))
  if (points.nose && hipCenter) { put(values, 'head_offset_x', points.nose.x - hipCenter.x); put(values, 'head_offset_y', points.nose.y - hipCenter.y) }
  const leftEye = faceInput.face_left_eye; const rightEye = faceInput.face_right_eye; const faceNose = faceInput.face_nose; const mouthLeft = faceInput.face_mouth_left; const mouthRight = faceInput.face_mouth_right; const chin = faceInput.face_chin
  const eyeCenter = leftEye && rightEye ? midpoint(leftEye, rightEye) : undefined
  const faceScale = leftEye && rightEye ? Math.max(distance(leftEye, rightEye), 1e-6) : undefined
  if (leftEye && rightEye && faceScale) { put(values, 'face_eye_distance', 1); put(values, 'face_eye_tilt', lineAngle(leftEye, rightEye)) }
  if (faceNose && eyeCenter && faceScale) { put(values, 'face_nose_offset_x', (faceNose.x - eyeCenter.x) / faceScale); put(values, 'face_nose_offset_y', (faceNose.y - eyeCenter.y) / faceScale) }
  if (mouthLeft && mouthRight && faceScale) put(values, 'face_mouth_width', distance(mouthLeft, mouthRight) / faceScale)
  if (eyeCenter && chin && faceScale) put(values, 'face_length', distance(eyeCenter, chin) / faceScale)
  if (faceNose && mouthLeft && mouthRight && faceScale) put(values, 'face_nose_to_mouth', distance(faceNose, midpoint(mouthLeft, mouthRight)) / faceScale)
  for (const name of ['left_wrist', 'right_wrist', 'left_knee', 'right_knee'] as const) {
    const point = points[name]; if (!point || !hipCenter) continue
    put(values, `${name}_x`, point.x - hipCenter.x); put(values, `${name}_y`, point.y - hipCenter.y)
  }
  const regions = {
    arms: weightedMean(['left_elbow_angle', 'right_elbow_angle', 'left_shoulder_angle', 'right_shoulder_angle'].filter(name => values[name] !== undefined).map(name => ({ value: 1, weight: FEATURE_WEIGHTS[name] ?? 1 }))),
    torso: weightedMean(['shoulder_tilt', 'hip_tilt', 'torso_lean'].filter(name => values[name] !== undefined).map(name => ({ value: 1, weight: FEATURE_WEIGHTS[name] ?? 1 }))),
    legs: weightedMean(['left_knee_angle', 'right_knee_angle', 'left_hip_angle', 'right_hip_angle', 'leg_spread'].filter(name => values[name] !== undefined).map(name => ({ value: 1, weight: FEATURE_WEIGHTS[name] ?? 1 }))),
    head: weightedMean(['head_offset_x', 'head_offset_y', 'face_eye_distance', 'face_eye_tilt', 'face_nose_offset_x', 'face_nose_offset_y', 'face_mouth_width', 'face_length', 'face_nose_to_mouth'].filter(name => values[name] !== undefined).map(name => ({ value: 1, weight: FEATURE_WEIGHTS[name] ?? 1 }))),
  }
  const quality = Math.min(1, Object.keys(values).length / 20) * Math.min(1, Object.keys(input).length / 13)
  const faceQuality = Math.min(1, Object.keys(faceInput).length / 6)
  return { points, values, regions, usableLandmarks: Object.keys(input).length, missingLandmarks: [...missingLandmarks], quality, faceQuality }
}

export const regionForFeature = (name: FeatureName): 'arms' | 'torso' | 'legs' | 'head' => name.includes('elbow') || name.includes('shoulder') || name.includes('wrist') || name === 'arm_span' ? 'arms' : name.includes('knee') || name.includes('hip') || name === 'leg_spread' ? 'legs' : name.includes('head') ? 'head' : 'torso'

export const featureTolerances = (values: Record<FeatureName, number>): Record<FeatureName, number> => Object.fromEntries(Object.keys(values).map(name => [name, name.startsWith('face_') ? (name.includes('tilt') ? POSE_ENGINE_CONFIG.defaultTolerance : 0.12) : name.includes('angle') || name.includes('tilt') || name === 'torso_lean' ? POSE_ENGINE_CONFIG.defaultTolerance : 0.18]))
