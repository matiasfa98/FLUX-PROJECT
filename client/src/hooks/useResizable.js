// src/hooks/useResizable.js
import { useState, useCallback, useRef } from 'react';

export const useResizable = ({
  initialSize = 260,
  minSize = 180,
  maxSize = 600,
  direction = 'horizontal', // 'horizontal' (width) | 'vertical' (height)
  reverse = false,          // true if dragging changes size from right/bottom
}) => {
  const [size, setSize] = useState(initialSize);
  const isDraggingRef = useRef(false);

  const startResize = useCallback(
    (e) => {
      e.preventDefault();
      isDraggingRef.current = true;

      const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const startSize = size;

      // Add CSS class from your stylesheet to lock pointer styles & disable text selection
      document.body.classList.add(
        direction === 'horizontal' ? 'resizing-active' : 'resizing-active-v'
      );

      const onMouseMove = (moveEvent) => {
        if (!isDraggingRef.current) return;
        const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - startPos;
        const newSize = reverse ? startSize - delta : startSize + delta;

        if (newSize >= minSize && newSize <= maxSize) {
          setSize(newSize);
        }
      };

      const onMouseUp = () => {
        isDraggingRef.current = false;
        document.body.classList.remove('resizing-active', 'resizing-active-v');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        // Notify any window-resize listeners (like Monaco's automaticLayout)
        window.dispatchEvent(new Event('resize'));
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [size, minSize, maxSize, direction, reverse]
  );

  return { size, startResize };
};