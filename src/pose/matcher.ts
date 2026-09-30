import { POSE_ENGINE_CONFIG } from './config'
import { extractPoseFeatures, featureTolerances, regionForFeature } from './features'
import { gaussianSimilarity, weightedMean } from './math'
import { mirrorFaceLandmarks, mirrorLandmarks } from './landmarks'
import type { FaceLandmarkMap, LandmarkMap, PoseFeatures, PoseScore, ReferencePose } from './types'

function scoreAgainst(reference: ReferencePose, current: PoseFeatures, mirrored: boolean): PoseScore {
  if (!reference.annotation) return { poseId: reference.id, displayName: reference.displayName, percentage: 0, similarity: 0, mirrored, quality: 0, regions: { arms: 0, torso: 0, legs: 0, head: 0 }, feedback: ['Annotate this reference before matching.'], matchedFeatures: 0 }
  const referenceFeatures = extractPoseFeatures(reference.annotation.landmarks, reference.annotation.faceLandmarks)
  const errors: Array<{ name: string; error: number; similarity: number; weight: number }> = []
  const tolerances = { ...featureTolerances(referenceFeatures.values), ...reference.tolerances }
  for (const [name, expected] of Object.entries(referenceFeatures.values)) {
    const actual = current.values[name]
    if (actual === undefined) continue
    const error = Math.abs(actual - expected)
    errors.push({ name, error, similarity: gaussianSimilarity(error, tolerances[name] ?? POSE_ENGINE_CONFIG.defaultTolerance), weight: reference.weights[name] ?? 1 })
  }
  const similarity = weightedMean(errors.map(item => ({ value: item.similarity, weight: item.weight }))) * Math.min(1, current.quality / POSE_ENGINE_CONFIG.minimumPoseQuality)
  const regions = { arms: 0, torso: 0, legs: 0, head: 0 }
  for (const region of Object.keys(regions) as Array<keyof typeof regions>) {
    const regionItems = errors.filter(item => regionForFeature(item.name) === region)
    regions[region] = weightedMean(regionItems.map(item => ({ value: item.similarity, weight: item.weight })))
  }
  const feedback = errors.sort((a, b) => a.similarity - b.similarity).slice(0, 3).filter(item => item.similarity < .86).map(item => feedbackFor(item.name, item.error, expectedDirection(referenceFeatures.values[item.name], current.values[item.name])))
  return { poseId: reference.id, displayName: reference.displayName, percentage: Math.round(similarity * 1000) / 10, similarity, mirrored, quality: current.quality, regions, feedback, matchedFeatures: errors.length }
}

function expectedDirection(reference: number, current: number): 'more' | 'less' { return current < reference ? 'more' : 'less' }

function feedbackFor(feature: string, error: number, direction: 'more' | 'less'): string {
  const amount = Math.max(1, Math.round(error))
  const word = direction === 'more' ? 'more' : 'slightly'
  const messages: Record<string, string> = { torso_lean: `Lean your torso ${word} toward the reference.`, left_elbow_angle: `Open your left elbow about ${amount}° more.`, right_elbow_angle: `Open your right elbow about ${amount}° more.`, left_knee_angle: `Bend your left knee slightly ${direction === 'more' ? 'less' : 'more'}.`, right_knee_angle: `Bend your right knee slightly ${direction === 'more' ? 'less' : 'more'}.`, shoulder_tilt: `Tilt your shoulders about ${amount}° toward the reference.`, hip_tilt: `Shift your hips about ${amount}° toward the reference.`, arm_span: 'Extend your arms farther into the silhouette.', leg_spread: 'Adjust your stance width to match the reference.', head_offset_x: 'Move your head toward the reference line.', head_offset_y: 'Lift or lower your head to match the reference.' }
  return messages[feature] ?? `Adjust ${feature.split('_').join(' ')} toward the reference.`
}

export function comparePose(reference: ReferencePose, currentPoints: LandmarkMap, currentFacePoints: FaceLandmarkMap = {}): PoseScore {
  const current = extractPoseFeatures(currentPoints, currentFacePoints)
  const normal = scoreAgainst(reference, current, false)
  if (!reference.allowMirror) return normal
  const mirrored = scoreAgainst(reference, extractPoseFeatures(mirrorLandmarks(currentPoints), mirrorFaceLandmarks(currentFacePoints)), true)
  return mirrored.similarity > normal.similarity ? mirrored : normal
}

export function scoreAllPoses(references: ReferencePose[], currentPoints: LandmarkMap, currentFacePoints: FaceLandmarkMap = {}): PoseScore[] {
  return references.filter(reference => Boolean(reference.annotation)).map(reference => comparePose(reference, currentPoints, currentFacePoints)).sort((a, b) => b.similarity - a.similarity)
}

export function getBestMatch(references: ReferencePose[], currentPoints: LandmarkMap, currentFacePoints: FaceLandmarkMap = {}): PoseScore | undefined {
  const scores = scoreAllPoses(references, currentPoints, currentFacePoints)
  if (!scores.length) return undefined
  const best = scores[0]; const second = scores[1]
  if (best.similarity < POSE_ENGINE_CONFIG.possibleMatchThreshold || (second && best.similarity - second.similarity < POSE_ENGINE_CONFIG.minimumPoseMargin)) return undefined
  return best
}
