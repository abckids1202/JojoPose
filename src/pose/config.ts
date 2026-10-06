import type { FeatureName } from './types'

export const POSE_ENGINE_CONFIG = {
  landmarkVisibilityThreshold: 0.55,
  possibleMatchThreshold: 0.6,
  confirmedMatchThreshold: 0.78,
  releaseThreshold: 0.65,
  minimumPoseMargin: 0.07,
  minimumPoseQuality: 0.6,
  smoothingWindowFrames: 15,
  agreementRatio: 0.7,
  confirmationDurationMs: 500,
  holdDurationMs: 1200,
  defaultTolerance: 18,
  scoreFloor: 0.05,
  bodyScoreWeight: 0.75,
  faceScoreWeight: 0.25,
} as const

export const FEATURE_WEIGHTS: Record<FeatureName, number> = {
  left_elbow_angle: 1.3,
  right_elbow_angle: 1.3,
  left_shoulder_angle: 1.2,
  right_shoulder_angle: 1.2,
  left_knee_angle: 1,
  right_knee_angle: 1,
  left_hip_angle: 0.8,
  right_hip_angle: 0.8,
  shoulder_tilt: 1.4,
  hip_tilt: 1,
  torso_lean: 1.6,
  leg_spread: 0.8,
  arm_span: 1,
  head_offset_x: 0.8,
  head_offset_y: 0.8,
  left_wrist_x: 0.8,
  left_wrist_y: 0.8,
  right_wrist_x: 0.8,
  right_wrist_y: 0.8,
  left_knee_x: 0.7,
  left_knee_y: 0.7,
  right_knee_x: 0.7,
  right_knee_y: 0.7,
}

export const LANDMARK_NAMES = [
  'nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist',
  'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
] as const

export const POSE_MATCH_LABELS = [
  { min: 0, label: 'NO POSE MATCH' },
  { min: 0.6, label: 'ROUGH MATCH' },
  { min: 0.7, label: 'GOOD MATCH' },
  { min: 0.8, label: 'GREAT MATCH' },
  { min: 0.9, label: 'EXCELLENT' },
  { min: 0.97, label: 'NEAR PERFECT' },
] as const
