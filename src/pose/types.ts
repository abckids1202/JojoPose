export type Point2D = { x: number; y: number }

export type LandmarkName =
  | 'nose'
  | 'left_shoulder' | 'right_shoulder'
  | 'left_elbow' | 'right_elbow'
  | 'left_wrist' | 'right_wrist'
  | 'left_hip' | 'right_hip'
  | 'left_knee' | 'right_knee'
  | 'left_ankle' | 'right_ankle'

export type LandmarkMap = Partial<Record<LandmarkName, Point2D>>
export type FeatureName = string

export interface PoseAnnotation {
  landmarks: LandmarkMap
  imageWidth: number
  imageHeight: number
  updatedAt: string
}

export interface ReferencePose {
  id: string
  displayName: string
  artworkPath: string
  allowMirror: boolean
  requiredLandmarks: LandmarkName[]
  recommendedCameraAngle: string
  weights: Record<FeatureName, number>
  tolerances: Record<FeatureName, number>
  annotation?: PoseAnnotation
}

export interface PoseFeatures {
  points: LandmarkMap
  values: Record<FeatureName, number>
  regions: { arms: number; torso: number; legs: number; head: number }
  usableLandmarks: number
  missingLandmarks: LandmarkName[]
  quality: number
}

export interface PoseScore {
  poseId: string
  displayName: string
  percentage: number
  similarity: number
  mirrored: boolean
  quality: number
  regions: { arms: number; torso: number; legs: number; head: number }
  feedback: string[]
  matchedFeatures: number
}

export type DetectorState = 'idle' | 'loading' | 'camera_denied' | 'camera_error' | 'model_loading' | 'ready' | 'no_match' | 'possible' | 'confirmed' | 'held'

export interface DetectorMetrics {
  fps: number
  inferenceMs: number
  usableLandmarks: number
  quality: number
  cameraReady: boolean
  modelReady: boolean
}

export interface PoseLandmark3D extends Point2D {
  z?: number
  visibility?: number
}

export interface TemporalResult {
  state: 'searching' | 'possible' | 'confirmed' | 'held'
  bestMatch?: PoseScore
  holdMs: number
  stableFrames: number
}
