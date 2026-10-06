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
export type FaceLandmarkName = 'face_left_eye' | 'face_right_eye' | 'face_nose' | 'face_mouth_left' | 'face_mouth_right' | 'face_chin'
export type FaceLandmarkMap = Partial<Record<FaceLandmarkName, Point2D>>
export type FeatureName = string

export interface PoseAnnotation {
  schemaVersion: 1 | 2
  landmarks: LandmarkMap
  faceLandmarks?: FaceLandmarkMap
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
  requiredFaceLandmarks?: FaceLandmarkName[]
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
  faceQuality: number
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
  bodySimilarity: number
  faceSimilarity: number
  faceQuality: number
}

export type DetectorState = 'idle' | 'loading' | 'camera_denied' | 'camera_error' | 'model_loading' | 'model_error' | 'no_body' | 'no_face' | 'ready' | 'no_match' | 'possible' | 'confirmed' | 'held'

export interface DetectorMetrics {
  fps: number
  inferenceMs: number
  usableLandmarks: number
  quality: number
  cameraReady: boolean
  modelReady: boolean
  faceModelReady: boolean
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
