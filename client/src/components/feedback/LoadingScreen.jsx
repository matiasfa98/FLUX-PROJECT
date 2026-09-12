// src/components/feedback/LoadingScreen.jsx
import React from 'react';

export const LoadingScreen = () => (
  <div className="h-screen w-screen bg-flux-bg flex flex-col items-center justify-center gap-3 text-slate-400">
    <div className="w-8 h-8 rounded-lg border-2 border-flux-cyan/30 border-t-flux-cyan animate-spin" />
    <span className="text-xs font-mono tracking-widest text-slate-500 uppercase">
      Booting Flux Cockpit...
    </span>
  </div>
);

export default LoadingScreen;