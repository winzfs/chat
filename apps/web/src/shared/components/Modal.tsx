import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

type ModalProps = {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  onClose: () => void;
  preventClose?: boolean;
};

export function Modal({ children, className = '', labelledBy, onClose, preventClose = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
      (first ?? panelRef.current)?.focus();
    });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !preventClose) onClose();
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, preventClose]);

  return createPortal(
    <div className="app-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (!preventClose && event.target === event.currentTarget) onClose();
    }}>
      <div aria-labelledby={labelledBy} aria-modal="true" className={`app-modal-panel ${className}`.trim()} ref={panelRef} role="dialog" tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
