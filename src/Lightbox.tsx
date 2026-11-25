import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Photo } from './types'

export function Lightbox({ photos, start, photoUrl, onClose }: {
  photos: Photo[]
  start: number
  photoUrl: (path: string) => string
  onClose: () => void
}) {
  const [index, setIndex] = useState(start)
  const ref = useRef<HTMLDialogElement>(null)
  const touchX = useRef<number | null>(null)
  const go = (d: number) => setIndex((i) => (i + d + photos.length) % photos.length)

  useEffect(() => {
    const dialog = ref.current!
    if (!dialog.open) dialog.showModal()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); dialog.close() }
  }, [photos.length])

  return (
    <dialog
      ref={ref}
      className="lightbox"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      <img src={photoUrl(photos[index].src)} alt="" onClick={onClose} />
      <button className="lb-btn lb-close" onClick={onClose} aria-label="Close"><X size={24} /></button>
      {photos.length > 1 && (
        <>
          <button className="lb-btn lb-prev" onClick={() => go(-1)} aria-label="Previous photo"><ChevronLeft size={28} /></button>
          <button className="lb-btn lb-next" onClick={() => go(1)} aria-label="Next photo"><ChevronRight size={28} /></button>
          <div className="lb-count">{index + 1} / {photos.length}</div>
        </>
      )}
    </dialog>
  )
}
