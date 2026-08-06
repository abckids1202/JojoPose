import type { PoseDefinition } from './types'

export const poses: PoseDefinition[] = [
  { id: 'jotaro', name: 'Jotaro Point', character: 'SIGNATURE / 01', accent: 'lime', difficulty: 'STARTER', focus: 'Upper body', description: 'A sharp directional line with a grounded shoulder and a clean, readable silhouette.', status: 'READY', joints: ['Right shoulder', 'Right elbow', 'Wrist line', 'Torso lean'], angle: 'Front / 15° left' },
  { id: 'dio', name: 'Dio Dramatic Lean', character: 'THEATRICAL / 02', accent: 'pink', difficulty: 'EXPERT', focus: 'Full body', description: 'Back-arched energy, lifted chest, and a diagonal that makes the whole frame feel louder.', status: 'READY', joints: ['Spine', 'Hips', 'Both shoulders', 'Knees'], angle: 'Three-quarter' },
  { id: 'giorno', name: 'Giorno Stance', character: 'COMPOSED / 03', accent: 'cyan', difficulty: 'ADVANCED', focus: 'Full body', description: 'A poised, fashion-editorial stance with open chest geometry and asymmetrical weight.', status: 'PLANNED', joints: ['Hips', 'Ankles', 'Elbows', 'Head'], angle: 'Front' },
  { id: 'joseph', name: 'Joseph Evasive', character: 'ESCAPE / 04', accent: 'orange', difficulty: 'ADVANCED', focus: 'Full body', description: 'A dynamic escape line with a strong counter-lean and a deliberately off-axis center.', status: 'EXPERIMENTAL', joints: ['Left hip', 'Right ankle', 'Shoulder line'], angle: 'Side / 30°' },
  { id: 'polnareff', name: 'Polnareff Flair', character: 'FLAIR / 05', accent: 'violet', difficulty: 'STARTER', focus: 'Upper body', description: 'An open-arm silhouette designed to test width, symmetry, and the confidence of a pose.', status: 'PLANNED', joints: ['Both elbows', 'Wrists', 'Shoulders'], angle: 'Front / wide' },
  { id: 'custom', name: 'Original Vector', character: 'YOUR CREATION / 06', accent: 'white', difficulty: 'EXPERT', focus: 'Custom', description: 'A blank canvas for the pose you invent, collect, and eventually teach the model.', status: 'PLANNED', joints: ['Choose your joints'], angle: 'Your choice' },
]

export const navItems = [
  { label: 'Home', to: '/', icon: '⌂' },
  { label: 'Live Detector', to: '/detector', icon: '◉' },
  { label: 'Pose Library', to: '/library', icon: '✦' },
  { label: 'Data Collector', to: '/collector', icon: '◎' },
  { label: 'Model Lab', to: '/lab', icon: '⌁' },
  { label: 'Methodology', to: '/methodology', icon: '▤' },
  { label: 'Gallery', to: '/gallery', icon: '▦' },
  { label: 'About', to: '/about', icon: '＋' },
]
