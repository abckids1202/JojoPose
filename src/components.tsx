import { motion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronRight, CircleHelp, Github, Menu, Pause, Play, Radio, ScanLine, Sparkles, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { navItems, poses } from './data'
import type { PoseDefinition } from './types'

export function Logo() {
  return <Link to="/" className="brand"><span className="brand-mark"><span>J</span><i /></span><span>JOJO<span className="brand-pink">.</span>VISION</span></Link>
}

export function Layout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><div className="noise" /><header className="topbar"><Logo /><nav className="desktop-nav">{navItems.slice(0, 6).map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'}>{item.label}</NavLink>)}</nav><div className="top-actions"><Link to="/detector" className="top-cta">Launch scanner <ArrowUpRight size={14} /></Link><button className="icon-button mobile-menu"><Menu size={19} /></button></div></header><main>{children}</main><footer className="footer"><div><Logo /><p>Landmark intelligence for dramatic humans.</p></div><div className="footer-links"><Link to="/about">Project notes</Link><Link to="/methodology">Methodology</Link><a href="https://github.com" target="_blank" rel="noreferrer"><Github size={14} /> GitHub</a></div><span className="mono">LOCAL-FIRST / 2026</span></footer></div>
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: React.ReactNode; description: string; action?: React.ReactNode }) {
  return <motion.section className="page-intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}><div><div className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</div><h1>{title}</h1></div><div className="intro-side"><p>{description}</p>{action}</div></motion.section>
}

export function SectionHeading({ kicker, title, copy }: { kicker: string; title: string; copy?: string }) {
  return <div className="section-heading"><div className="eyebrow"><span className="eyebrow-dot" />{kicker}</div><h2>{title}</h2>{copy && <p>{copy}</p>}</div>
}

export function StatusPill({ children, tone = 'lime' }: { children: React.ReactNode; tone?: string }) { return <span className={`status-pill ${tone}`}><span />{children}</span> }

export function Metric({ value, label, detail, accent = 'lime' }: { value: string; label: string; detail?: string; accent?: string }) { return <div className={`metric metric-${accent}`}><span className="metric-value">{value}</span><span className="metric-label">{label}</span>{detail && <span className="metric-detail">{detail}</span>}</div> }

export function AnimatedBar({ value, accent = 'lime' }: { value: number; accent?: string }) { return <div className={`bar bar-${accent}`}><motion.span initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: .9, ease: 'easeOut' }} /></div> }

export function PoseFigure({ accent = 'lime', small = false }: { accent?: string; small?: boolean }) {
  return <div className={`pose-figure figure-${accent} ${small ? 'figure-small' : ''}`}><div className="figure-ring" /><svg viewBox="0 0 300 360" aria-label="abstract pose silhouette"><circle cx="150" cy="50" r="25" /><path d="M143 77 C137 102 137 124 151 150 L134 217 L107 320 M157 77 C165 102 166 125 151 150 L178 217 L202 320 M151 148 L112 171 L64 124 M151 148 L190 166 L244 92 M112 171 L93 207 M190 166 L216 201" /></svg><div className="figure-cross cross-a" /><div className="figure-cross cross-b" /></div>
}

export function PoseCard({ pose, onOpen }: { pose: PoseDefinition; onOpen?: (pose: PoseDefinition) => void }) {
  return <motion.article className={`pose-card card-${pose.accent}`} whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 280 }}><div className="pose-card-art"><span className="card-index">{pose.character}</span><PoseFigure accent={pose.accent} small /><span className="card-angle">{pose.angle}</span></div><div className="pose-card-copy"><div className="card-top"><span className="tag">{pose.difficulty}</span><StatusPill tone={pose.status === 'READY' ? 'lime' : 'muted'}>{pose.status}</StatusPill></div><h3>{pose.name}</h3><p>{pose.description}</p><div className="pose-card-meta"><span>{pose.focus}</span><button onClick={() => onOpen?.(pose)}>View details <ChevronRight size={14} /></button></div></div></motion.article>
}

export function ScannerFrame({ active = false, videoRef, mirrored = false }: { active?: boolean; videoRef?: React.RefObject<HTMLVideoElement>; mirrored?: boolean }) {
  return <div className={`scanner-frame ${active ? 'scanner-active' : ''}`}><div className="scanner-toolbar"><span className="mono">CAM_01 / {active ? 'LIVE' : 'STANDBY'}</span><span className="scanner-record"><span /> REC</span></div><video ref={videoRef} className={`camera-video ${mirrored ? 'mirror' : ''}`} autoPlay muted playsInline /><div className="camera-fallback"><div className="fallback-grid" /><PoseFigure accent="lime" /><div className="fallback-copy"><ScanLine size={18} /><span>Camera preview appears here</span><small>Start the camera to begin landmark intake</small></div></div><div className="scan-corner corner-tl" /><div className="scan-corner corner-tr" /><div className="scan-corner corner-bl" /><div className="scan-corner corner-br" />{active && <div className="scan-line" />}</div>
}

export function SkeletonMini() { return <svg className="skeleton-mini" viewBox="0 0 100 130"><circle cx="50" cy="14" r="8" /><path d="M50 22v36m0-27L25 42m25-11 24 3M50 58 30 91m20-33 22 32M25 42l-8 24m57-32 9 19" /></svg> }

export function ChartBars({ values = [48, 74, 56, 86, 68, 94, 63, 79] }: { values?: number[] }) { return <div className="chart-bars">{values.map((value, i) => <div className="chart-bar-wrap" key={i}><motion.div className="chart-bar" initial={{ height: 0 }} animate={{ height: `${value}%` }} transition={{ delay: i * .06, duration: .6 }} /><span>{String(i + 1).padStart(2, '0')}</span></div>)}</div> }

export function Timeline({ items }: { items: { label: string; state: 'done' | 'now' | 'next'; detail: string }[] }) { return <div className="timeline">{items.map(item => <div className={`timeline-item ${item.state}`} key={item.label}><div className="timeline-mark">{item.state === 'done' ? <Check size={13} /> : item.state === 'now' ? <span /> : null}</div><div><span className="mono">{item.state === 'done' ? 'COMPLETE' : item.state === 'now' ? 'IN PROGRESS' : 'UP NEXT'}</span><h4>{item.label}</h4><p>{item.detail}</p></div></div>)}</div> }

export function DetailModal({ pose, onClose }: { pose: PoseDefinition; onClose: () => void }) { return <div className="modal-backdrop" onClick={onClose}><motion.div className="detail-modal" initial={{ opacity: 0, scale: .96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={onClose}><X size={18} /></button><div className="modal-art"><PoseFigure accent={pose.accent} /><span className="mono">REFERENCE VECTOR / {pose.id.toUpperCase()}</span></div><div className="modal-content"><div className="eyebrow"><span className="eyebrow-dot" />{pose.character}</div><h2>{pose.name}</h2><p>{pose.description}</p><div className="detail-grid"><div><span className="mono">KEY JOINTS</span><ul>{pose.joints.map(j => <li key={j}><Check size={14} />{j}</li>)}</ul></div><div><span className="mono">DETECTION NOTE</span><p className="detail-note">Frame the full silhouette. Keep the main line clear and hold for at least 0.8 seconds.</p><StatusPill tone={pose.status === 'READY' ? 'lime' : 'muted'}>{pose.status}</StatusPill></div></div><Link to={`/detector?target=${pose.id}`} className="button button-primary" onClick={onClose}>Try this pose <ArrowUpRight size={15} /></Link></div></motion.div></div> }

export function Toggle({ checked = false, onClick }: { checked?: boolean; onClick?: () => void }) { return <button className={`toggle ${checked ? 'on' : ''}`} onClick={onClick} aria-pressed={checked}><span /></button> }

export function EmptyState({ title, copy }: { title: string; copy: string }) { return <div className="empty-state"><CircleHelp size={23} /><h3>{title}</h3><p>{copy}</p></div> }
