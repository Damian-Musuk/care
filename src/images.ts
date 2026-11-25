/** Shrinks a photo from the phone to a sensible size for the web, plus a small thumbnail. */
export interface PreparedPhoto {
  id: string
  full: string // base64 JPEG
  thumb: string // base64 JPEG
  preview: string // object URL for showing it before it is saved
}

async function toJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<string> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that photo'))), 'image/jpeg', quality))
  const buffer = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000))
  return btoa(binary)
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const [full, thumb] = await Promise.all([toJpeg(bitmap, 1800, 0.85), toJpeg(bitmap, 480, 0.8)])
    return { id: newId(), full, thumb, preview: URL.createObjectURL(file) }
  } finally {
    bitmap.close()
  }
}
