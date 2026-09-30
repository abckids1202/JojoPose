import { FEATURE_WEIGHTS } from './config'
import type { FaceLandmarkName, LandmarkName, PoseAnnotation, ReferencePose } from './types'

const BODY_NAMES: LandmarkName[] = ['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle']
export const faceAnnotationNames: FaceLandmarkName[] = ['face_left_eye', 'face_right_eye', 'face_nose', 'face_mouth_left', 'face_mouth_right', 'face_chin']

export const REFERENCE_POSES: ReferencePose[] = [
  { id: 'dio', displayName: 'DIO', artworkPath: '/poses/Dio.png', allowMirror: true, requiredLandmarks: BODY_NAMES, requiredFaceLandmarks: faceAnnotationNames, recommendedCameraAngle: 'Front, slight camera-left rotation', weights: { ...FEATURE_WEIGHTS, torso_lean: 2, right_knee_angle: 1.4 }, tolerances: {} },
  { id: 'giorno', displayName: 'GIORNO', artworkPath: '/poses/Giorno.jpg', allowMirror: true, requiredLandmarks: BODY_NAMES, requiredFaceLandmarks: faceAnnotationNames, recommendedCameraAngle: 'Front, full body', weights: { ...FEATURE_WEIGHTS, arm_span: 1.5, hip_tilt: 1.5 }, tolerances: {} },
  { id: 'jolyne', displayName: 'JOLYNE', artworkPath: '/poses/Jolyne.png', allowMirror: true, requiredLandmarks: BODY_NAMES, requiredFaceLandmarks: faceAnnotationNames, recommendedCameraAngle: 'Front / 20° right', weights: { ...FEATURE_WEIGHTS, left_elbow_angle: 1.6, right_elbow_angle: 1.5 }, tolerances: {} },
  { id: 'jonathan', displayName: 'JONATHAN', artworkPath: '/poses/Jonathan.png', allowMirror: true, requiredLandmarks: BODY_NAMES, requiredFaceLandmarks: faceAnnotationNames, recommendedCameraAngle: 'Front, full body', weights: { ...FEATURE_WEIGHTS, shoulder_tilt: 1.7, leg_spread: 1.2 }, tolerances: {} },
  { id: 'metallica', displayName: 'METALLICA', artworkPath: '/poses/Metallica.png', allowMirror: true, requiredLandmarks: BODY_NAMES, requiredFaceLandmarks: faceAnnotationNames, recommendedCameraAngle: 'Upper body / slight camera-left', weights: { ...FEATURE_WEIGHTS, torso_lean: 2, head_offset_x: 1.4 }, tolerances: {} },
]

const STORAGE_KEY = 'jojo-pose-reference-annotations-v1'

export function loadAnnotations(): Record<string, PoseAnnotation> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, PoseAnnotation> } catch { return {} }
}

export function saveAnnotation(poseId: string, annotation: PoseAnnotation): ReferencePose[] {
  const all = loadAnnotations(); all[poseId] = annotation; localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); return getReferencePoses()
}

export function clearAnnotation(poseId: string) { const all = loadAnnotations(); delete all[poseId]; localStorage.setItem(STORAGE_KEY, JSON.stringify(all)) }

export function getReferencePoses(): ReferencePose[] { const annotations = loadAnnotations(); return REFERENCE_POSES.map(pose => ({ ...pose, annotation: annotations[pose.id] })) }

export function exportReferenceBundle() {
  const blob = new Blob([JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), poses: getReferencePoses() }, null, 2)], { type: 'application/json' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'jojo-reference-poses.json'; link.click(); URL.revokeObjectURL(link.href)
}

export const annotationProgress = (pose: ReferencePose): number => { const body = pose.annotation ? Object.keys(pose.annotation.landmarks).length : 0; const face = pose.annotation?.faceLandmarks ? Object.keys(pose.annotation.faceLandmarks).length : 0; return Math.round((body + face) / (pose.requiredLandmarks.length + (pose.requiredFaceLandmarks?.length ?? 0)) * 100) }

export const annotationNames = ['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'] as LandmarkName[]
