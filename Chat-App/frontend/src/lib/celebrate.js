import { createRoot } from 'react-dom/client';
import React from 'react';
import CelebrationBurst from '../components/CelebrationBurst';

export function celebrate(duration = 1200) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    try { root.unmount(); } catch {}
    if (container.parentNode) container.parentNode.removeChild(container);
  };

  root.render(
    React.createElement(CelebrationBurst, { onDone: cleanup })
  );

  // Fallback cleanup in case onDone doesn't fire
  setTimeout(cleanup, duration + 200);
}
