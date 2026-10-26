import { describe, expect, it } from 'vitest'
import { FEATURE_ORDER, featuresToVector } from './featureRecord'
import { recordsToCsv } from './export'

describe('dataset export', () => {
  it('creates a stable feature vector with zero-filled missing values', () => { const vector = featuresToVector({ torso_lean: 12 }); expect(vector).toHaveLength(FEATURE_ORDER.length); expect(vector[FEATURE_ORDER.indexOf('torso_lean')]).toBe(12); expect(vector[0]).toBe(0) })
  it('exports labeled records with feature headers', () => { const csv = recordsToCsv([{ id: '1', poseLabel: 'dio', participantId: 'p1', sessionId: 's1', cameraAngle: 'front', timestamp: 'now', bodyLandmarks: {}, faceLandmarks: {}, features: {}, quality: 1, faceQuality: 1 }]); expect(csv.split('\n')[0]).toContain('pose_label'); expect(csv).toContain('"dio"') })
})
