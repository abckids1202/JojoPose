import type { Point2D } from './types'

export interface ImageSize { width: number; height: number }
export interface StageRect { left: number; top: number; width: number; height: number }

/** Converts a pointer in an object-fit:contain stage into image-normalized coordinates. */
export function stageToImagePoint(clientX: number, clientY: number, stage: StageRect, image: ImageSize): Point2D {
  const aspect = image.width / Math.max(1, image.height)
  const stageAspect = stage.width / Math.max(1, stage.height)
  const renderedWidth = stageAspect > aspect ? stage.height * aspect : stage.width
  const renderedHeight = stageAspect > aspect ? stage.height : stage.width / aspect
  const left = stage.left + (stage.width - renderedWidth) / 2
  const top = stage.top + (stage.height - renderedHeight) / 2
  return { x: Math.max(0, Math.min(1, (clientX - left) / renderedWidth)), y: Math.max(0, Math.min(1, (clientY - top) / renderedHeight)) }
}
