import { POSE_ENGINE_CONFIG } from './config'
import type { PoseScore, TemporalResult } from './types'

export class TemporalPoseSmoother {
  private history: Array<{ id?: string; score: PoseScore; timestamp: number }> = []
  private confirmedId?: string
  private confirmedAt = 0

  reset() { this.history = []; this.confirmedId = undefined; this.confirmedAt = 0 }

  push(score: PoseScore | undefined, timestamp = performance.now()): TemporalResult {
    const next = score ?? { poseId: 'none', displayName: 'NO POSE MATCH', percentage: 0, similarity: 0, mirrored: false, quality: 0, regions: { arms: 0, torso: 0, legs: 0, head: 0 }, feedback: [], matchedFeatures: 0, bodySimilarity: 0, faceSimilarity: 0, faceQuality: 0 }
    this.history.push({ id: score?.poseId, score: next, timestamp })
    this.history = this.history.slice(-POSE_ENGINE_CONFIG.smoothingWindowFrames)
    const grouped = new Map<string, { count: number; score: PoseScore }>()
    for (const item of this.history) if (item.id) { const previous = grouped.get(item.id); grouped.set(item.id, { count: (previous?.count ?? 0) + 1, score: item.score }) }
    const leader = [...grouped.values()].sort((a, b) => b.count - a.count)[0]
    if (!leader || leader.count / this.history.length < POSE_ENGINE_CONFIG.agreementRatio || leader.score.similarity < POSE_ENGINE_CONFIG.possibleMatchThreshold) { this.confirmedId = undefined; return { state: 'searching', holdMs: 0, stableFrames: leader?.count ?? 0 } }
    if (this.confirmedId !== leader.score.poseId) { this.confirmedId = leader.score.poseId; this.confirmedAt = timestamp; return { state: 'possible', bestMatch: leader.score, holdMs: 0, stableFrames: leader.count } }
    const holdMs = timestamp - this.confirmedAt
    if (leader.score.similarity >= POSE_ENGINE_CONFIG.confirmedMatchThreshold && holdMs >= POSE_ENGINE_CONFIG.holdDurationMs) return { state: 'held', bestMatch: leader.score, holdMs, stableFrames: leader.count }
    if (leader.score.similarity >= POSE_ENGINE_CONFIG.confirmedMatchThreshold && holdMs >= POSE_ENGINE_CONFIG.confirmationDurationMs) return { state: 'confirmed', bestMatch: leader.score, holdMs, stableFrames: leader.count }
    return { state: 'possible', bestMatch: leader.score, holdMs, stableFrames: leader.count }
  }
}
