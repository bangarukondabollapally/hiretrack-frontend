import { useEffect, useRef } from 'react';

let activeLockCount = 0;
let originalStyle = null;
let originalScrollY = 0;

export function useScrollLock(isOpen, modalRef = null) {
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Capture triggering element for focus return
    previousFocusRef.current = document.activeElement;

    // Lock scroll on body and documentElement
    if (activeLockCount === 0) {
      originalScrollY = window.scrollY || window.pageYOffset || 0;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      originalStyle = {
        bodyOverflow: document.body.style.overflow,
        htmlOverflow: document.documentElement.style.overflow,
        bodyPaddingRight: document.body.style.paddingRight,
        bodyPosition: document.body.style.position,
        bodyTop: document.body.style.top,
        bodyWidth: document.body.style.width,
      };

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // iOS fix
      document.body.style.position = 'fixed';
      document.body.style.top = `-${originalScrollY}px`;
      document.body.style.width = '100%';
    }

    activeLockCount++;

    // Focus management: move focus into modal if modalRef provided
    const focusTimer = setTimeout(() => {
      if (modalRef?.current) {
        const focusable = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) {
          focusable.focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    return () => {
      clearTimeout(focusTimer);
      activeLockCount = Math.max(0, activeLockCount - 1);

      if (activeLockCount === 0 && originalStyle) {
        document.documentElement.style.overflow = originalStyle.htmlOverflow || '';
        document.body.style.overflow = originalStyle.bodyOverflow || '';
        document.body.style.paddingRight = originalStyle.bodyPaddingRight || '';
        document.body.style.position = originalStyle.bodyPosition || '';
        document.body.style.top = originalStyle.bodyTop || '';
        document.body.style.width = originalStyle.bodyWidth || '';

        window.scrollTo(0, originalScrollY);
        originalStyle = null;
      }

      // Return focus to trigger element
      if (
        previousFocusRef.current &&
        document.body.contains(previousFocusRef.current) &&
        typeof previousFocusRef.current.focus === 'function'
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, modalRef]);
}

export function getActiveLockCount() {
  return activeLockCount;
}
