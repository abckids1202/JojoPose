import { useEffect, useRef, useState } from 'react'
import { Camera, Download, Pause, Play, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Metric, PageIntro, StatusPill } from '../components'
import { addFeatureRecord, createFeatureRecord, downloadCsv, downloadJson, getFeatureRecords, POSE_LABELS, clearFeatureRecords, type FeatureRecord, type PoseLabel } from '../dataset'
import { usePoseDetector } from '../pose/usePoseDetector'
import '../pose-engine.css'

export default function LiveDatasetCollector() {
  const engine = usePoseDetector()
  const [poseLabel, setPoseLabel] = useState<PoseLabel>('dio')
  const [participantId, setParticipantId] = useState('person_001')
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}`)
  const [cameraAngle, setCameraAngle] = useState('front')
  const [recording, setRecording] = useState(false)
  const [records, setRecords] = useState<FeatureRecord[]>([])
  const [message, setMessage] = useState('Start the camera, then record normalized features.')
  const lastCaptureRef = useRef(0)
  const liveRef = useRef({ features: engine.currentFeatures, points: engine.currentPoints, facePoints: engine.currentFacePoints })
  liveRef.current = { features: engine.currentFeatures, points: engine.currentPoints, facePoints: engine.currentFacePoints }

  useEffect(() => { getFeatureRecords().then(setRecords).catch(() => setMessage('IndexedDB is unavailable in this browser.')) }, [])
  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => {
      const now = performance.now()
      const live = liveRef.current
      if (now - lastCaptureRef.current < 100 || live.features.quality < .6 || live.features.faceQuality < 1) return
      lastCaptureRef.current = now
      const record = createFeatureRecord({ poseLabel, participantId, sessionId, cameraAngle, bodyLandmarks: live.points, faceLandmarks: live.facePoints, features: live.features })
      addFeatureRecord(record).then(() => setRecords(previous => [...previous, record])).catch(() => setMessage('Could not save this sample to IndexedDB.'))
    }, 50)
    return () => window.clearInterval(timer)
  }, [recording, poseLabel, participantId, sessionId, cameraAngle])

  const toggleRecording = () => { if (!engine.metrics.cameraReady) { setMessage('Start the camera before recording.'); return } setRecording(previous => !previous); setMessage(recording ? 'Capture paused.' : `Recording ${poseLabel} samples at 10 Hz.`) }
  const handleClear = async () => { await clearFeatureRecords(); setRecords([]); setMessage('Dataset cleared from this browser.') }

  return <div className="page pose-engine-page"><PageIntro eyebrow="LIVE DATASET COLLECTOR / FEATURE RECORDING" title={<>Give the model<br /><em>real examples.</em></>} description="Record MediaPipe landmarks and normalized geometry from real people. No video frames are stored; only labeled feature records are saved locally." action={<div className="intro-actions"><StatusPill tone={engine.metrics.cameraReady ? 'lime' : 'muted'}>{engine.metrics.cameraReady ? 'CAMERA READY' : 'CAMERA OFF'}</StatusPill><Link to="/detector" className="button button-ghost">Open detector</Link></div>} /><div className="collector-live-grid"><section className="panel collector-live-camera"><div className="panel-top"><div><span className="mono">LOCAL FEATURE INTAKE</span><h3>{recording ? 'Recording normalized samples' : 'Camera preview'}</h3></div><div className="collector-live-actions"><button className="button button-ghost" onClick={engine.metrics.cameraReady ? engine.stop : engine.start}>{engine.metrics.cameraReady ? 'Stop camera' : 'Start camera'} <Camera size={15} /></button><button className="button button-primary" onClick={toggleRecording}>{recording ? 'Pause capture' : 'Record samples'} {recording ? <Pause size={15} /> : <Play size={15} />}</button></div></div><div className="collector-live-frame"><video ref={engine.videoRef} autoPlay muted playsInline /><div className="engine-camera-grid" />{engine.state === 'no_body' && <span>BODY NOT DETECTED</span>}{engine.state === 'no_face' && <span>FACE NOT DETECTED</span>}{!engine.metrics.cameraReady && <small>Start camera to preview landmarks.</small>}</div><div className="engine-tip"><span>{message}</span></div></section><aside className="panel collector-live-form"><div className="panel-heading"><div><span className="mono">SESSION METADATA</span><h3>Label this capture</h3></div></div><label>Pose label<select value={poseLabel} onChange={event => setPoseLabel(event.target.value as PoseLabel)}>{POSE_LABELS.map(label => <option value={label} key={label}>{label}</option>)}</select></label><label>Participant ID<input value={participantId} onChange={event => setParticipantId(event.target.value)} /></label><label>Session ID<input value={sessionId} onChange={event => setSessionId(event.target.value)} /></label><label>Camera angle<select value={cameraAngle} onChange={event => setCameraAngle(event.target.value)}><option value="front">Front</option><option value="left_diagonal">Left diagonal</option><option value="right_diagonal">Right diagonal</option><option value="side">Side</option></select></label><div className="collector-live-quality"><span className="mono">QUALITY GATE</span><strong>{Math.round(engine.currentFeatures.quality * 100)}% body / {Math.round(engine.currentFeatures.faceQuality * 100)}% face</strong><small>Samples require ≥60% body quality and all 6 face anchors.</small></div></aside></div><section className="metric-strip"><Metric value={records.length.toString()} label="Saved samples" detail="IndexedDB" /><Metric value={recording ? 'REC' : '—'} label="Capture state" detail="10 Hz target" accent="pink" /><Metric value={engine.metrics.usableLandmarks.toString()} label="Body joints" detail="live" accent="cyan" /><Metric value={Object.keys(engine.currentFacePoints).length.toString()} label="Face anchors" detail="live" accent="lime" /></section><section className="panel collector-live-log"><div className="panel-heading"><div><span className="mono">DATASET ACTIONS</span><h3>Export for training</h3></div><span className="mono">{records.length} RECORDS</span></div><div className="collector-live-actions"><button className="button button-primary" disabled={!records.length} onClick={() => downloadJson(records)}><Download size={15} /> Download JSON</button><button className="button button-ghost" disabled={!records.length} onClick={() => downloadCsv(records)}><Download size={15} /> Download CSV</button><button className="button button-ghost" disabled={!records.length} onClick={handleClear}><Trash2 size={15} /> Clear local dataset</button></div><p className="micro-note">Collect each label across multiple participants and camera conditions. Use <strong>negative</strong> for neutral standing, transitions, and near-miss poses.</p></section></div>
}
