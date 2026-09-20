import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { registerBackHandler } from '../../services/mobile/backButtonService';
import './BottomSheet.css';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }

    // Focus trapping inside modal
    if (e.key === 'Tab' && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = (document.activeElement as HTMLElement) || null;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      const unregisterBack = registerBackHandler(() => {
        onCloseRef.current();
        return true;
      });

      // Set initial focus to the first interactive field inside content body (not the header close button)
      const timer = setTimeout(() => {
        if (panelRef.current) {
          const contentArea = panelRef.current.querySelector<HTMLElement>('.ui-bottom-sheet__content');
          const firstFocusable = contentArea?.querySelector<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
          );

          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            panelRef.current.focus();
          }
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        unregisterBack();
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        // Restore focus to trigger
        if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
          triggerElementRef.current.focus();
        }
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div className="ui-bottom-sheet-root" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="ui-bottom-sheet__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div className="ui-bottom-sheet__panel" ref={panelRef} tabIndex={-1}>
        <div className="ui-bottom-sheet__handle-wrapper" onClick={onClose}>
          <div className="ui-bottom-sheet__handle" />
        </div>

        {(title || subtitle) && (
          <div className="ui-bottom-sheet__header">
            <div className="ui-bottom-sheet__header-texts">
              {title && <h2 className="ui-bottom-sheet__title">{title}</h2>}
              {subtitle && <p className="ui-bottom-sheet__subtitle">{subtitle}</p>}
            </div>
            <IconButton
              icon={<X size={18} />}
              aria-label="Close sheet"
              onClick={onClose}
              size="sm"
              variant="subtle"
            />
          </div>
        )}

        <div className="ui-bottom-sheet__content">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};
