import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

const emojis = ['🎉','🎊','✨','🥳','🎈','💥','🎆'];

const Particle = ({ idx }) => {
  const angle = (Math.random() * 80 - 40) * (Math.PI / 180);
  const distance = 120 + Math.random() * 120;
  const x = Math.cos(angle) * distance;
  const y = -Math.sin(angle) * distance - (60 + Math.random() * 60);
  const scale = 0.8 + Math.random() * 0.6;
  const rotate = Math.random() * 180 * (Math.random() > 0.5 ? -1 : 1);
  return (
    <motion.span
      initial={{ opacity: 0, y: 0, x: 0, scale: 0.6, rotate: 0 }}
      animate={{ opacity: 1, x, y, scale, rotate }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 + Math.random() * 0.4, ease: 'ease-out' }}
      className="absolute text-2xl select-none"
      style={{ left: 0, top: 0 }}
    >
      {emojis[idx % emojis.length]}
    </motion.span>
  );
};

const CelebrationBurst = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  const root = document.body;
  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="absolute left-1/2 top-[22%] -translate-x-1/2">
        {Array.from({ length: 22 }).map((_, i) => (
          <Particle key={i} idx={i} />
        ))}
      </div>
    </div>,
    root
  );
};

export default CelebrationBurst;
