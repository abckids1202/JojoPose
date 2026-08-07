import { FEATURE_WEIGHTS, POSE_ENGINE_CONFIG } from './config'
import { distance, jointAngle, lineAngle, midpoint, normalizeLandmarks, signedAngleDelta, weightedMean } from './math'
import type { FeatureName, LandmarkMap, PoseFeatures } from './types'

function angle(points: LandmarkMap, a: keyof LandmarkMap, b: keyof LandmarkMap, c: keyof LandmarkMap): number | undefined {
  const first = points[a]; const middle = points[b]; const last = points[c]
  if (!first || !middle || !last) return undefined
  return jointAngle(first, middle, last) ?? undefined
}

function put(values: Record<FeatureName, number>, name: FeatureName, value: number | undefined) { if (value !== undefined && Number.isFinite(value)) values[name] = value }

export function extractPoseFeatures(input: LandmarkMap): PoseFeatures {
  const missingLandmarks = Object.keys(FEATURE_WEIGHTS).length ? (['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'] as const).filter(name => !input[name]) : []
  let points: LandmarkMap
  try { points = normalizeLandmarks(input) } catch { return { points: input, values: {}, regions: { arms: 0, torso: 0, legs: 0, head: 0 }, usableLandmarks: Object.keys(input).length, missingLandmarks: [...missingLandmarks], quality: 0 } }
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
  for (const name of ['left_wrist', 'right_wrist', 'left_knee', 'right_knee'] as const) {
    const point = points[name]; if (!point || !hipCenter) continue
    put(values, `${name}_x`, point.x - hipCenter.x); put(values, `${name}_y`, point.y - hipCenter.y)
  }
  const regions = {
    arms: weightedMean(['left_elbow_angle', 'right_elbow_angle', 'left_shoulder_angle', 'right_shoulder_angle'].filter(name => values[name] !== undefined).map(name => ({ value: 1, weight: FEATURE_WEIGHTS[name] ?? 1 }))),
    torso: weightedMean(['shoulder_tilt', 'hip_tilt', 'torso_lean'].filter(name => values[name] !== undefined).map(name => ({ value: 1, weight: FEATURE_WEIGHTS[name] ?? 1 }))),
    legs: weightedMean(['left_knee_angle', 'right_knee_angle', 'left_hip_angle', 'right_hip_angle', 'leg_spread'].filter(name => values[name] !== undefined).map(name => ({ value: 1, weight: FEATURE_WEIGHTS[name] ?? 1 }))),
    head: weightedMean(['head_offset_x', 'head_offset_y'].filter(name => values[name] !== undefined).map(name => ({ value: 1, weight: FEATURE_WEIGHTS[name] ?? 1 }))),
  }
  const quality = Math.min(1, Object.keys(values).length / 20) * Math.min(1, Object.keys(input).length / 13)
  return { points, values, regions, usableLandmarks: Object.keys(input).length, missingLandmarks: [...missingLandmarks], quality }
}

export const regionForFeature = (name: FeatureName): 'arms' | 'torso' | 'legs' | 'head' => name.includes('elbow') || name.includes('shoulder') || name.includes('wrist') || name === 'arm_span' ? 'arms' : name.includes('knee') || name.includes('hip') || name === 'leg_spread' ? 'legs' : name.includes('head') ? 'head' : 'torso'

export const featureTolerances = (values: Record<FeatureName, number>): Record<FeatureName, number> => Object.fromEntries(Object.keys(values).map(name => [name, name.includes('angle') || name.includes('tilt') || name === 'torso_lean' ? POSE_ENGINE_CONFIG.defaultTolerance : 0.18]))
