import { useRef, useState } from 'react'
import { ArrowDownToLine, Check, ChevronLeft, ChevronRight, Download, RotateCcw, Save, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { annotationNames, annotationProgress, annotationStatus, clearAnnotation, exportReferenceBundle, faceAnnotationNames, getReferencePoses, isReferenceReady, saveAnnotation } from './pose/reference'
import type { FaceLandmarkName, LandmarkName, Point2D, PoseAnnotation, ReferencePose } from './pose/types'
import { stageToImagePoint } from './pose/annotation'
import './pose-engine.css'

type AnnotationKey = LandmarkName | FaceLandmarkName
const prettyName = (name: string) => name.split('_').join(' ').replace(/\b\w/g, char => char.toUpperCase()).replace('Face ', '')
const BODY_EDGES: Array<[LandmarkName, LandmarkName]> = [['nose', 'left_shoulder'], ['nose', 'right_shoulder'], ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'], ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'], ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'], ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'], ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']]

export default function ReferenceAnnotator() {
  const [poses, setPoses] = useState<ReferencePose[]>(() => getReferencePoses())
  const [selectedId, setSelectedId] = useState('dio')
  const [mode, setMode] = useState<'body' | 'face'>('body')
  const [activeLandmark, setActiveLandmark] = useState<AnnotationKey>('nose')
  const [dragging, setDragging] = useState<AnnotationKey | null>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 })
  const stageRef = useRef<HTMLDivElement>(null)
  const pose = poses.find(item => item.id === selectedId) ?? poses[0]
  const landmarks = pose.annotation?.landmarks ?? {}
  const faceLandmarks = pose.annotation?.faceLandmarks ?? {}
  const allNames: AnnotationKey[] = [...annotationNames, ...faceAnnotationNames]
  const requiredCount = pose.requiredLandmarks.length + (pose.requiredFaceLandmarks?.length ?? 0)
  const missing = allNames.filter(name => name.startsWith('face_') ? !faceLandmarks[name as FaceLandmarkName] : !landmarks[name as LandmarkName])
  const complete = missing.length === 0
  const activePoint = activeLandmark.startsWith('face_') ? faceLandmarks[activeLandmark as FaceLandmarkName] : landmarks[activeLandmark as LandmarkName]

  const setPoint = (name: AnnotationKey, point: Point2D) => {
    const next: PoseAnnotation = { schemaVersion: 2, landmarks: { ...landmarks, ...(name.startsWith('face_') ? {} : { [name]: point }) }, faceLandmarks: { ...faceLandmarks, ...(name.startsWith('face_') ? { [name]: point } : {}) }, imageWidth: naturalSize.width, imageHeight: naturalSize.height, updatedAt: new Date().toISOString() }
    setPoses(previous => previous.map(item => item.id === pose.id ? { ...item, annotation: next } : item))
    const nextMissing = allNames.find(item => item.startsWith('face_') ? !next.faceLandmarks?.[item as FaceLandmarkName] : !next.landmarks[item as LandmarkName])
    if (nextMissing) setActiveLandmark(nextMissing)
  }

  const pointerPoint = (event: { clientX: number; clientY: number }) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    setPoint(dragging ?? activeLandmark, stageToImagePoint(event.clientX, event.clientY, rect, naturalSize))
  }

  const save = () => { const annotation: PoseAnnotation = { schemaVersion: 2, landmarks, faceLandmarks, imageWidth: naturalSize.width, imageHeight: naturalSize.height, updatedAt: new Date().toISOString() }; saveAnnotation(pose.id, annotation); setPoses(getReferencePoses()) }
  const reset = () => { clearAnnotation(pose.id); setPoses(getReferencePoses()); setMode('body'); setActiveLandmark('nose') }
  const selectedIndex = poses.findIndex(item => item.id === selectedId)
  const nextPose = () => setSelectedId(poses[(selectedIndex + 1) % poses.length].id)
  const previousPose = () => setSelectedId(poses[(selectedIndex - 1 + poses.length) % poses.length].id)
  const activeList = mode === 'body' ? annotationNames : faceAnnotationNames
  const faceCropPoint = faceLandmarks.face_nose ?? faceLandmarks.face_left_eye ?? { x: .5, y: .25 }

  return <div className="page annotator-page"><div className="annotator-header"><div><div className="eyebrow"><span className="eyebrow-dot" />REFERENCE POSE ANNOTATOR / BODY + FACE</div><h1>Teach the artwork<br /><em>where the body is.</em></h1><p>Mark 13 body anchors and 6 stable face anchors on each original pose. Drafts are saved locally, but only complete 19-point references are used for matching.</p></div><div className="annotator-header-actions"><Link to="/detector" className="button button-ghost">Open detector</Link><button className="button button-primary" onClick={exportReferenceBundle}><Download size={15} /> Export JSON</button></div></div><div className="annotator-layout"><aside className="panel reference-list"><div className="panel-heading"><div><span className="mono">REFERENCE SET / 05</span><h3>Choose artwork</h3></div><Target size={17} /></div>{poses.map(item => { const progress = annotationProgress(item); return <button className={`reference-list-item ${item.id === pose.id ? 'selected' : ''}`} onClick={() => setSelectedId(item.id)} key={item.id}><span className="reference-thumb"><img src={item.artworkPath} alt="" /></span><span><strong>{item.displayName}</strong><small>{annotationStatus(item)}</small></span><span className={`reference-progress ${isReferenceReady(item) ? 'complete' : ''}`}>{progress}%</span></button> })}<div className="annotator-list-foot"><span className="mono">LOCAL STORAGE / SCHEMA 2</span><strong>{poses.filter(isReferenceReady).length} / {poses.length} ready</strong></div></aside><section className="panel annotation-workspace"><div className="panel-top"><div><span className="mono">{pose.displayName} / {pose.artworkPath.split('/').pop()}</span><h3>Place {mode === 'body' ? 'body' : 'face'} landmarks</h3></div><div className="annotator-nav"><button className="icon-button" onClick={previousPose}><ChevronLeft size={16} /></button><button className="icon-button" onClick={nextPose}><ChevronRight size={16} /></button></div></div><div className="annotation-mode-switch"><button className={mode === 'body' ? 'active' : ''} onClick={() => { setMode('body'); setActiveLandmark('nose') }}>BODY / 13</button><button className={mode === 'face' ? 'active' : ''} onClick={() => { setMode('face'); setActiveLandmark('face_left_eye') }}>FACE / 6</button></div><div className="annotation-stage" ref={stageRef} onClick={event => { if (!dragging) pointerPoint(event) }} onPointerMove={event => dragging && pointerPoint(event)} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}><img src={pose.artworkPath} alt={`${pose.displayName} reference artwork`} onLoad={event => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} /><svg viewBox="0 0 1 1" preserveAspectRatio="none" className="annotation-overlay"><g className="annotation-lines">{BODY_EDGES.map(([a, b]) => landmarks[a] && landmarks[b] && <line key={`${a}-${b}`} x1={landmarks[a]!.x} y1={landmarks[a]!.y} x2={landmarks[b]!.x} y2={landmarks[b]!.y} />)}</g>{annotationNames.map(name => { const point = landmarks[name]; return point ? <g key={name} className={`annotation-point body-point ${activeLandmark === name ? 'active' : ''}`} onPointerDown={event => { event.stopPropagation(); setDragging(name); setActiveLandmark(name) }}><circle cx={point.x} cy={point.y} r=".018" /><text x={point.x + .025} y={point.y - .025}>{prettyName(name)}</text></g> : null })}{faceAnnotationNames.map(name => { const point = faceLandmarks[name]; return point ? <g key={name} className={`annotation-point face-point ${activeLandmark === name ? 'active' : ''}`} onPointerDown={event => { event.stopPropagation(); setDragging(name); setActiveLandmark(name) }}><circle cx={point.x} cy={point.y} r=".014" /><text x={point.x + .02} y={point.y - .02}>{prettyName(name)}</text></g> : null })}</svg><div className="annotation-crosshair"><span>CLICK TO PLACE / DRAG TO ADJUST</span></div></div>{mode === 'face' && <div className="face-zoom" style={{ backgroundImage: `url(${pose.artworkPath})`, backgroundPosition: `${faceCropPoint.x * 100}% ${faceCropPoint.y * 100}%` }}><span className="mono">FACE ZOOM / ACTIVE REGION</span></div>}<div className="annotation-toolbar"><div><span className="mono">CURRENT TARGET</span><strong>{prettyName(activeLandmark)}</strong><small>{activePoint ? 'Placed — click another point or drag this one.' : 'Click the artwork to place this point.'}</small></div><span className={`status-pill ${complete ? '' : 'muted'}`}><span />{complete ? 'BODY + FACE COMPLETE' : `${requiredCount - missing.length} / ${requiredCount} POINTS`}</span></div></section><aside className="panel landmark-panel"><div className="panel-heading"><div><span className="mono">KEYPOINT SEQUENCE</span><h3>{mode === 'body' ? '13 body anchors' : '6 face anchors'}</h3></div><span className="mono">{Math.max(0, activeList.indexOf(activeLandmark as never) + 1)} / {activeList.length}</span></div><div className="landmark-buttons">{activeList.map((name, index) => { const point = name.startsWith('face_') ? faceLandmarks[name as FaceLandmarkName] : landmarks[name as LandmarkName]; return <button key={name} className={`${activeLandmark === name ? 'active' : ''} ${point ? 'placed' : ''}`} onClick={() => setActiveLandmark(name)}><span>{point ? <Check size={13} /> : index + 1}</span>{prettyName(name)}</button> })}</div><div className="annotator-actions"><button className="button button-primary" onClick={save}><Save size={15} /> Save draft</button><button className="button button-ghost" onClick={reset}><RotateCcw size={15} /> Reset</button></div><div className="annotator-note"><ArrowDownToLine size={16} /><p>{complete ? 'This reference is ready for matching.' : 'Complete all 13 body and 6 face anchors. Incomplete drafts remain visible but cannot produce a match.'}</p></div></aside></div><div className="annotator-footer-note"><span className="mono">BODY + FACE / LOCAL ONLY</span><p>Anime anatomy and faces are manually anchored for reliable reference geometry. Webcam face points are detected automatically and are used for orientation, not identity.</p><span className="mono">{missing.length ? 'FACE ANNOTATION REQUIRED' : 'MATCH READY'}</span></div></div>
}
