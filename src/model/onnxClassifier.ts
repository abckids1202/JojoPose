import * as ort from 'onnxruntime-web'
import { featuresToVector } from '../dataset/featureRecord'

export interface ClassifierPrediction { label: string; confidence: number; alternatives: Array<{ label: string; confidence: number }> }

export class OnnxPoseClassifier {
  private constructor(private readonly session: ort.InferenceSession, private readonly labels: string[]) {}

  static async tryLoad(): Promise<OnnxPoseClassifier | null> {
    const modelResponse = await fetch('/models/pose_classifier.onnx', { method: 'HEAD' }).catch(() => null)
    if (!modelResponse?.ok) return null
    const metadataResponse = await fetch('/models/pose_classifier.metadata.json')
    if (!metadataResponse.ok) return null
    const metadata = await metadataResponse.json() as { labels?: string[] }
    const session = await ort.InferenceSession.create('/models/pose_classifier.onnx', { executionProviders: ['wasm'] })
    return new OnnxPoseClassifier(session, metadata.labels ?? [])
  }

  async predict(features: Record<string, number>): Promise<ClassifierPrediction | undefined> {
    const inputName = this.session.inputNames[0]
    const tensor = new ort.Tensor('float32', Float32Array.from(featuresToVector(features)), [1, featuresToVector(features).length])
    const outputs = await this.session.run({ [inputName]: tensor })
    const probabilityOutput = outputs.output_probability ?? outputs.probabilities ?? outputs[this.session.outputNames[1]]
    const labelOutput = outputs.output_label ?? outputs.label ?? outputs[this.session.outputNames[0]]
    const probabilities = probabilityOutput?.data ? Array.from(probabilityOutput.data as Iterable<number>) : []
    const rawLabel = labelOutput?.data?.[0]
    const bestIndex = probabilities.length ? probabilities.indexOf(Math.max(...probabilities)) : Number(rawLabel)
    if (!Number.isFinite(bestIndex) || !this.labels[bestIndex]) return undefined
    const alternatives = probabilities.map((confidence, index) => ({ label: this.labels[index] ?? String(index), confidence })).sort((a, b) => b.confidence - a.confidence).slice(0, 3)
    return { label: this.labels[bestIndex], confidence: probabilities[bestIndex] ?? 0, alternatives }
  }
}
