// src/components/layout/SplitPane.jsx
import React from 'react';

// Vertical Divider for left/right columns
export const ColResizeHandle = ({ onMouseDown }) => (
  <div
    className="resize-handle"
    onMouseDown={onMouseDown}
    role="separator"
    tabIndex={-1}
  />
);

// Horizontal Divider for top/bottom split (Editor vs Terminal)
export const RowResizeHandle = ({ onMouseDown }) => (
  <div
    className="resize-handle-v-term"
    onMouseDown={onMouseDown}
    role="separator"
    tabIndex={-1}
  />
);