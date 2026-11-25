import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** A native <dialog>: Esc and the close button both call onClose. */
export function Modal({ title, onClose, children, wide, className }: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  wide?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    if (!dialog.open) dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' modal-wide' : ''}${className ? ' ' + className : ''}`}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
    >
      <div className="modal-inner">
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
