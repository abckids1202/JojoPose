export type PoseState = 'idle' | 'scanning' | 'recognized' | 'visibility' | 'offline'

export interface PoseResult {
  label: string
  confidence: number
  holdTime: number
  state: PoseState
  feedback: string
}

export interface PoseDefinition {
  id: string
  name: string
  character: string
  accent: string
  difficulty: 'STARTER' | 'ADVANCED' | 'EXPERT'
  focus: string
  description: string
  status: 'READY' | 'PLANNED' | 'EXPERIMENTAL'
  joints: string[]
  angle: string
}

export interface SessionRecord {
  id: string
  label: string
  frames: number
  quality: string
  time: string
}
