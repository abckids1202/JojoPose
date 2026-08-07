import type { LandmarkMap, LandmarkName, PoseLandmark3D, Point2D } from './types'

export const MEDIAPIPE_INDEX: Record<LandmarkName, number> = {
  nose: 0, left_shoulder: 11, right_shoulder: 12, left_elbow: 13, right_elbow: 14,
  left_wrist: 15, right_wrist: 16, left_hip: 23, right_hip: 24, left_knee: 25,
  right_knee: 26, left_ankle: 27, right_ankle: 28,
}

export function mediaPipeToLandmarks(input: Array<Partial<PoseLandmark3D>>): LandmarkMap {
  const output: LandmarkMap = {}
  for (const [name, index] of Object.entries(MEDIAPIPE_INDEX)) {
    const point = input[index]
    if (point && typeof point.x === 'number' && typeof point.y === 'number') output[name as LandmarkName] = { x: point.x, y: point.y }
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

export const visibleLandmarkCount = (landmarks: LandmarkMap): number => Object.keys(landmarks).length

export const toPoint2D = (point: { x: number; y: number }): Point2D => ({ x: point.x, y: point.y })
