import type { LandmarkMap, Point2D } from './types'

export const midpoint = (a: Point2D, b: Point2D): Point2D => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

export const distance = (a: Point2D, b: Point2D): number => Math.hypot(a.x - b.x, a.y - b.y)

export function jointAngle(a: Point2D, b: Point2D, c: Point2D): number | null {
  const ba = { x: a.x - b.x, y: a.y - b.y }
  const bc = { x: c.x - b.x, y: c.y - b.y }
  const aLength = Math.hypot(ba.x, ba.y)
  const cLength = Math.hypot(bc.x, bc.y)
  if (aLength < 1e-8 || cLength < 1e-8) return null
  const cosine = Math.max(-1, Math.min(1, (ba.x * bc.x + ba.y * bc.y) / (aLength * cLength)))
  return Math.acos(cosine) * 180 / Math.PI
}

export const lineAngle = (a: Point2D, b: Point2D): number => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI

export function circularAngleError(a: number, b: number): number {
  const difference = Math.abs((a - b) % 360)
  return Math.min(difference, 360 - difference)
}

export const signedAngleDelta = (a: number, b: number): number => ((a - b + 540) % 360) - 180

export const gaussianSimilarity = (error: number, sigma: number): number => Math.exp(-Math.pow(error / Math.max(1e-6, sigma), 2))

export function normalizeLandmarks(landmarks: LandmarkMap): LandmarkMap {
  const leftHip = landmarks.left_hip
  const rightHip = landmarks.right_hip
  const leftShoulder = landmarks.left_shoulder
  const rightShoulder = landmarks.right_shoulder
  if (!leftHip || !rightHip || !leftShoulder || !rightShoulder) throw new Error('Hip and shoulder landmarks are required')
  const origin = midpoint(leftHip, rightHip)
  const scale = distance(leftShoulder, rightShoulder)
  if (scale < 1e-6) throw new Error('Shoulder width is too small')
  return Object.fromEntries(Object.entries(landmarks).map(([name, point]) => [name, { x: (point.x - origin.x) / scale, y: (point.y - origin.y) / scale }])) as LandmarkMap
}

export const weightedMean = (items: Array<{ value: number; weight: number }>): number => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  return totalWeight ? items.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight : 0
}

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))
