import { useEffect, useState } from 'react'

export const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp'

/** Downscale closet photos before saving so IndexedDB stays small. Drops EXIF via canvas. */
export async function shrinkImage(file: Blob, maxSide = 1400, type = 'image/jpeg'): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), type, 0.9),
  )
}

export async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

/** YouCam Clothes V4 documented limits: short side >= 384, long side 512..4096, < 10 MB. */
export async function tryOnImageProblem(blob: Blob): Promise<'size' | 'dimensions' | 'unreadable' | null> {
  if (blob.size >= 10_000_000) return 'size'
  try {
    const { width, height } = await imageSize(blob)
    const [short, long] = [Math.min(width, height), Math.max(width, height)]
    return short < 384 || long < 512 || long > 4096 ? 'dimensions' : null
  } catch {
    return 'unreadable'
  }
}

/**
 * Resize a garment photo into YouCam's accepted range. Store product photos are often
 * just under the minimum; a modest upscale (up to 3x) is fine, beyond that quality suffers.
 * Returns null when the photo is too small to use.
 */
export async function fitForTryOn(blob: Blob): Promise<Blob | null> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  const { width, height } = bitmap
  const [short, long] = [Math.min(width, height), Math.max(width, height)]
  let scale = Math.max(1, 384 / short, 512 / long)
  if (long * scale > 4096) scale = 4096 / long
  if (scale > 3 || short * scale < 384) {
    bitmap.close()
    return null
  }
  if (scale === 1 && blob.size < 10_000_000 && (blob.type === 'image/jpeg' || blob.type === 'image/png')) {
    bitmap.close()
    return blob
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const result = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.92),
  )
  return result.size < 10_000_000 ? result : null
}

export function useObjectUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return setUrl(undefined)
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}

export function newId(): string {
  return crypto.randomUUID()
}
