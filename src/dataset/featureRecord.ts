import type { FaceLandmarkMap, LandmarkMap, PoseFeatures } from '../pose/types'

export const POSE_LABELS = ['dio', 'giorno', 'jolyne', 'jonathan', 'metallica', 'negative'] as const
export type PoseLabel = typeof POSE_LABELS[number]

export interface FeatureRecord {
  id: string
  poseLabel: PoseLabel
  participantId: string
  sessionId: string
  cameraAngle: string
  timestamp: string
  bodyLandmarks: LandmarkMap
  faceLandmarks: FaceLandmarkMap
  features: Record<string, number>
  quality: number
  faceQuality: number
}

export const FEATURE_ORDER = [
  'left_elbow_angle', 'right_elbow_angle', 'left_shoulder_angle', 'right_shoulder_angle', 'left_knee_angle', 'right_knee_angle', 'left_hip_angle', 'right_hip_angle', 'shoulder_tilt', 'hip_tilt', 'torso_lean', 'leg_spread', 'arm_span', 'head_offset_x', 'head_offset_y', 'left_wrist_x', 'left_wrist_y', 'right_wrist_x', 'right_wrist_y', 'left_knee_x', 'left_knee_y', 'right_knee_x', 'right_knee_y', 'face_eye_distance', 'face_eye_tilt', 'face_nose_offset_x', 'face_nose_offset_y', 'face_mouth_width', 'face_length', 'face_nose_to_mouth',
] as const

export function featuresToVector(features: Record<string, number>): number[] { return FEATURE_ORDER.map(name => Number.isFinite(features[name]) ? features[name] : 0) }
export function poseFeaturesToVector(features: PoseFeatures): number[] { return featuresToVector(features.values) }
export function createFeatureRecord(input: { poseLabel: PoseLabel; participantId: string; sessionId: string; cameraAngle: string; bodyLandmarks: LandmarkMap; faceLandmarks: FaceLandmarkMap; features: PoseFeatures }): FeatureRecord {
  return { id: `${input.sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, poseLabel: input.poseLabel, participantId: input.participantId, sessionId: input.sessionId, cameraAngle: input.cameraAngle, timestamp: new Date().toISOString(), bodyLandmarks: input.bodyLandmarks, faceLandmarks: input.faceLandmarks, features: Object.fromEntries(FEATURE_ORDER.map(name => [name, input.features.values[name] ?? 0])), quality: input.features.quality, faceQuality: input.features.faceQuality }
}
