import type { LandmarkMap, LandmarkName, PoseLandmark3D, Point2D } from './types'
import type { FaceLandmarkMap } from './types'

export const MEDIAPIPE_INDEX: Record<LandmarkName, number> = {
  nose: 0, left_shoulder: 11, right_shoulder: 12, left_elbow: 13, right_elbow: 14,
  left_wrist: 15, right_wrist: 16, left_hip: 23, right_hip: 24, left_knee: 25,
  right_knee: 26, left_ankle: 27, right_ankle: 28,
}

// Stable MediaPipe Face Mesh anchors. These are deliberately sparse and geometric,
// because the artwork is not a pixel-identical photograph of the webcam user.
export const FACE_MEDIAPIPE_INDEX = {
  face_left_eye: 263,
  face_right_eye: 33,
  face_nose: 1,
  face_mouth_left: 291,
  face_mouth_right: 61,
  face_chin: 152,
} as const

export function mediaPipeToLandmarks(input: Array<Partial<PoseLandmark3D>>): LandmarkMap {
  const output: LandmarkMap = {}
  for (const [name, index] of Object.entries(MEDIAPIPE_INDEX)) {
    const point = input[index]
    if (point && typeof point.x === 'number' && typeof point.y === 'number') output[name as LandmarkName] = { x: point.x, y: point.y }
  }
  return output
}

export function mediaPipeFaceToLandmarks(input: Array<Partial<PoseLandmark3D>>): FaceLandmarkMap {
  const output: FaceLandmarkMap = {}
  for (const [name, index] of Object.entries(FACE_MEDIAPIPE_INDEX)) {
    const point = input[index]
    if (point && typeof point.x === 'number' && typeof point.y === 'number') output[name as keyof FaceLandmarkMap] = { x: point.x, y: point.y }
  }
  return output
}

export function mirrorLandmarks(landmarks: LandmarkMap): LandmarkMap {
  const result: LandmarkMap = {}
  for (const [key, point] of Object.entries(landmarks)) {
    const mirroredKey = key.replace('left_', '__TEMP__').replace('right_', 'left_').replace('__TEMP__', 'right_') as LandmarkName
    result[mirroredKey] = { x: 1 - point.x, y: point.y }
  }
  return result
}

export function mirrorFaceLandmarks(landmarks: FaceLandmarkMap): FaceLandmarkMap {
  const result: FaceLandmarkMap = {}
  for (const [key, point] of Object.entries(landmarks)) {
    const mirroredKey = key === 'face_left_eye' ? 'face_right_eye' : key === 'face_right_eye' ? 'face_left_eye' : key === 'face_mouth_left' ? 'face_mouth_right' : key === 'face_mouth_right' ? 'face_mouth_left' : key
    result[mirroredKey as keyof FaceLandmarkMap] = { x: 1 - point.x, y: point.y }
  }
  return result
}

export const visibleLandmarkCount = (landmarks: LandmarkMap): number => Object.keys(landmarks).length

export const toPoint2D = (point: { x: number; y: number }): Point2D => ({ x: point.x, y: point.y })
