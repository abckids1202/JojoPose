import { describe, expect, it } from 'vitest'
import { circularAngleError, distance, jointAngle, lineAngle, midpoint, normalizeLandmarks } from './math'
import { extractPoseFeatures } from './features'
import { mediaPipeFaceToLandmarks, mirrorFaceLandmarks, mirrorLandmarks } from './landmarks'
import { comparePose } from './matcher'
import { TemporalPoseSmoother } from './smoother'
import { stageToImagePoint } from './annotation'
import type { FaceLandmarkMap, LandmarkMap, PoseScore, ReferencePose } from './types'

const skeleton: LandmarkMap = {
  nose: { x: .5, y: .1 }, left_shoulder: { x: .35, y: .25 }, right_shoulder: { x: .65, y: .25 }, left_elbow: { x: .2, y: .4 }, right_elbow: { x: .8, y: .4 }, left_wrist: { x: .15, y: .58 }, right_wrist: { x: .85, y: .58 }, left_hip: { x: .4, y: .55 }, right_hip: { x: .6, y: .55 }, left_knee: { x: .38, y: .76 }, right_knee: { x: .62, y: .76 }, left_ankle: { x: .34, y: .95 }, right_ankle: { x: .66, y: .95 },
}
const face: FaceLandmarkMap = { face_left_eye: { x: .44, y: .11 }, face_right_eye: { x: .56, y: .11 }, face_nose: { x: .5, y: .15 }, face_mouth_left: { x: .46, y: .19 }, face_mouth_right: { x: .54, y: .19 }, face_chin: { x: .5, y: .23 } }

const reference: ReferencePose = { id: 'test', displayName: 'TEST', artworkPath: '/test.png', allowMirror: true, requiredLandmarks: Object.keys(skeleton) as Array<keyof typeof skeleton>, recommendedCameraAngle: 'Front', weights: {}, tolerances: {}, annotation: { schemaVersion: 2, landmarks: skeleton, imageWidth: 100, imageHeight: 100, updatedAt: new Date().toISOString() } }

describe('pose math', () => {
  it('calculates distance and midpoint', () => { expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5); expect(midpoint({ x: 0, y: 0 }, { x: 2, y: 4 })).toEqual({ x: 1, y: 2 }) })
  it('calculates stable joint and line angles', () => { expect(jointAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(180); expect(jointAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90); expect(lineAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90) })
  it('wraps circular angles across the seam', () => { expect(circularAngleError(179, -179)).toBeCloseTo(2) })
  it('normalizes translation and scale', () => { const transformed = Object.fromEntries(Object.entries(skeleton).map(([name, point]) => [name, { x: point.x * 2 + 4, y: point.y * 2 - 3 }])) as LandmarkMap; const a = normalizeLandmarks(skeleton); const b = normalizeLandmarks(transformed); expect(b.left_wrist!.x).toBeCloseTo(a.left_wrist!.x); expect(b.right_knee!.y).toBeCloseTo(a.right_knee!.y) })
})

describe('pose signatures and matching', () => {
  it('extracts features and matches a reference to itself', () => { const features = extractPoseFeatures(skeleton); expect(features.quality).toBeGreaterThan(.8); const result = comparePose(reference, skeleton); expect(result.similarity).toBeGreaterThan(.95) })
  it('accepts a mirrored pose when allowed', () => { const result = comparePose(reference, mirrorLandmarks(skeleton)); expect(result.similarity).toBeGreaterThan(.9) })
  it('extracts face landmarks, normalizes them, and mirrors them', () => { const features = extractPoseFeatures(skeleton, face); expect(features.values.face_eye_distance).toBe(1); expect(features.values.face_mouth_width).toBeCloseTo(.6667, 2); expect(mirrorFaceLandmarks(face).face_left_eye!.x).toBeCloseTo(.44) })
  it('rejects a complete face reference when the camera face is missing', () => { const faceReference: ReferencePose = { ...reference, requiredFaceLandmarks: Object.keys(face) as Array<keyof typeof face>, annotation: { ...reference.annotation!, faceLandmarks: face } }; const result = comparePose(faceReference, skeleton, {}); expect(result.similarity).toBe(0); expect(result.feedback[0]).toContain('FACE NOT DETECTED') })
})

describe('landmark extraction and annotation coordinates', () => {
  it('maps MediaPipe face indexes to named anchors', () => { const input = Array.from({ length: 300 }, () => ({ x: 0, y: 0 })); input[263] = { x: .2, y: .3 }; input[33] = { x: .8, y: .3 }; expect(mediaPipeFaceToLandmarks(input).face_left_eye).toEqual({ x: .2, y: .3 }); expect(mediaPipeFaceToLandmarks(input).face_right_eye).toEqual({ x: .8, y: .3 }) })
  it('removes object-fit contain letterboxing from pointer coordinates', () => { const point = stageToImagePoint(500, 300, { left: 100, top: 100, width: 800, height: 400 }, { width: 400, height: 800 }); expect(point.x).toBeCloseTo(.5); expect(point.y).toBeCloseTo(.5) })
})

describe('temporal confirmation', () => {
  it('does not confirm one frame and confirms a held sequence', () => { const score: PoseScore = { poseId: 'test', displayName: 'TEST', percentage: 92, similarity: .92, mirrored: false, quality: 1, regions: { arms: .9, torso: .9, legs: .9, head: .9 }, feedback: [], matchedFeatures: 20, bodySimilarity: .92, faceSimilarity: .92, faceQuality: 1 }; const smoother = new TemporalPoseSmoother(); expect(smoother.push(score, 0).state).toBe('possible'); for (let i = 1; i < 15; i++) smoother.push(score, i * 120); expect(smoother.push(score, 1800).state).toBe('held') })
})
