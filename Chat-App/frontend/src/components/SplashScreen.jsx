import { motion } from "framer-motion";
import { useEffect, useState, useRef, useMemo } from "react";
import { LockKeyhole } from "lucide-react";

// Option A — Nest Reveal
// - Deep teal base
// - SVG concentric circle outline drawing
// - Swirling particles
// - SecureNest slides in
// - Fade out

const CIRCLES = [70, 100, 130]; // radii
const GOLD = "#f5d37d"; // soft gold glow
const CYAN = "#67e8f9";
const BUBBLE_GRADIENT = "linear-gradient(135deg, #14b8a6, #ffffff, #f43f5e)"; // teal/white/rose

// Particle layout (swirl around center)
const PCOUNT = 32;
const particles = Array.from({ length: PCOUNT }).map((_, i) => ({
  id: i,
  r: 140 + (i % 3) * 10,
  delay: (i % 8) * 0.15,
  size: 5 - (i % 3),
}));

// Bubble bloom (Option D) configuration
const BLOOM_COUNT = 18;
const BLOOM_RADIUS = 110;
const bloomBubbles = Array.from({ length: BLOOM_COUNT }).map((_, i) => {
  const angle = (i / BLOOM_COUNT) * Math.PI * 2;
  const tx = Math.cos(angle) * BLOOM_RADIUS;
  const ty = Math.sin(angle) * BLOOM_RADIUS;
  const initials = [
    { x: -320, y: -140 }, { x: 320, y: -120 }, { x: -300, y: 160 }, { x: 300, y: 140 },
    { x: -260, y: 0 }, { x: 260, y: -10 }, { x: -200, y: 180 }, { x: 220, y: 170 },
    { x: -160, y: -170 }, { x: 180, y: -160 }, { x: -320, y: 40 }, { x: 320, y: 20 },
  ];
  const initial = initials[i % initials.length];
  return { id: i, initial, tx, ty };
});

// Digital cocoon data lines (Bezier arcs around center)
const LINE_PATHS = [
  "M110,210 C160,120 260,120 310,210",
  "M120,240 C180,150 240,150 300,240",
  "M130,180 C190,120 230,120 290,180",
  "M110,200 C160,260 260,260 310,200",
];

// Title letters for staggered reveal
const TITLE = "SecureNest".split("");

// Simple 2D network sphere approximation (two rings + diagonals)
const RING_R = 120;
const RING_POINTS = 18;
const ringA = Array.from({ length: RING_POINTS }).map((_, i) => {
  const a = (i / RING_POINTS) * Math.PI * 2;
  return { x: Math.cos(a) * RING_R, y: Math.sin(a) * (RING_R * 0.6) };
});
const ringB = Array.from({ length: RING_POINTS }).map((_, i) => {
  const a = ((i + 0.5) / RING_POINTS) * Math.PI * 2;
  return { x: Math.cos(a) * (RING_R * 0.8), y: Math.sin(a) * (RING_R * 0.5) };
});

const SplashScreen = ({ onSkip }) => {
  const [audioPrimed, setAudioPrimed] = useState(false);
  const containerRef = useRef(null);
  // Memoize theme accent once to avoid DOM calls during render diffing
  const ACCENT_SHADOW = useMemo(() => {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent');
      return v && v.trim() ? v.trim() : 'rgba(20,184,166,0.45)';
    } catch { return 'rgba(20,184,166,0.45)'; }
  }, []);
  
  // Entrance sound: Pleasant startup chime (based on FakeCheck ScreenEffect)
  useEffect(() => {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const playStartupChime = () => {
      // Pleasant welcome chime (similar to FakeCheck "real" sound but adapted for startup)
      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Configure oscillators
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Connect nodes
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create pleasant startup chime sequence
      const now = audioContext.currentTime;
      
      // First chord - welcoming
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.frequency.setValueAtTime(659.25, now); // E5
      
      // Second chord (slight delay) - uplifting
      osc1.frequency.setValueAtTime(659.25, now + 0.15); // E5
      osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
      
      // Third chord - completion
      osc1.frequency.setValueAtTime(783.99, now + 0.3); // G5
      osc2.frequency.setValueAtTime(1046.5, now + 0.3); // C6
      
      // Volume envelope - 2.5 seconds total
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      
      // Start and stop
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.5);
      osc2.stop(now + 2.5);
      
      setAudioPrimed(true);
    };

    const tryStart = async () => {
      try {
        await audioContext.resume().catch(() => {});

        if (audioContext.state === 'suspended') {
          const onGesture = async () => {
            try {
              await audioContext.resume();
              playStartupChime();
            } catch {}
          };
          document.addEventListener('click', onGesture, { once: true });
          document.addEventListener('keydown', onGesture, { once: true });
        } else {
          playStartupChime();
        }
      } catch {}
    };

    tryStart();
    return () => { try { audioContext.close(); } catch {} };
  }, []);

  // Ultra-simple file-based chime for maximum compatibility
  useEffect(() => {
    let played = false;
    const candidates = ['/sounds/boot.mp3.wav', '/sounds/boot.mp3', '/sounds/boot.wav'];
    const playUrl = async (url) => {
      const a = new Audio(url);
      a.volume = 0.85;
      await a.play();
      played = true;
      setAudioPrimed(true);
      try { localStorage.setItem('sn_sound_ok', '1'); } catch {}
    };
    const tryFile = async () => {
      if (played) return;
      // If user previously allowed, try more eagerly
      const priorOk = (() => { try { return localStorage.getItem('sn_sound_ok') === '1'; } catch { return false; } })();
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok) {
            // Retry loop for the first 3 seconds to bypass transient blocks
            const start = Date.now();
            while (!played && Date.now() - start < 3000) {
              try { await playUrl(url); break; } catch { /* retry shortly */ }
              await new Promise(r => setTimeout(r, priorOk ? 100 : 250));
            }
            return;
          }
        } catch {
          // continue trying next
        }
      }
    };
    // attempt immediately
    tryFile();
    const onGesture = () => tryFile();
    // multiple soft triggers that often pass autoplay policies without explicit click
    ['pointerdown','keydown','mousemove','touchstart','visibilitychange','focus'].forEach(evt => {
      const handler = () => tryFile();
      document.addEventListener(evt, handler, { once: true });
    });
    return () => {
      // best-effort cleanup (handlers were once:true)
    };
  }, []);
  return (
    <motion.div key="splash-scene" ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: "radial-gradient(100% 100% at 50% 50%, #081c2b 0%, #072033 55%, #0b283c 100%)"
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {/* Subtle grain overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\' opacity=\'0.3\'/></svg>")'
      }} />
      {/* soft gold/white glow */}
      <div className="absolute inset-0 -z-10 opacity-30" style={{
        background: `radial-gradient(60% 60% at 50% 45%, ${GOLD}20 0%, transparent 60%)`
      }} />

      {/* Parallax camera drift */}
      <motion.div
        className="absolute inset-0"
        initial={{ x: 0, y: 0 }}
        animate={{ x: [0, -6, 4, 0], y: [0, -4, 6, 0] }}
        transition={{ duration: 5, ease: "easeInOut" }}
        style={{ pointerEvents: 'none' }}
      >
        {/* Sweeping beams (edge-to-edge) */}
        <motion.div
          className="absolute -left-1/3 top-24 h-1 w-2/3"
          style={{ background: `linear-gradient(90deg, transparent, ${CYAN}66, transparent)` }}
          initial={{ x: '-40%', opacity: 0 }}
          animate={{ x: ['-40%', '140%'], opacity: [0, 1, 0] }}
          transition={{ delay: 0.8, duration: 2.4 }}
        />
        <motion.div
          className="absolute -right-1/3 bottom-28 h-1 w-2/3"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)` }}
          initial={{ x: '40%', opacity: 0 }}
          animate={{ x: ['40%', '-140%'], opacity: [0, 1, 0] }}
          transition={{ delay: 1.2, duration: 2.4 }}
        />

        {/* Corner arcs */}
        <svg className="absolute left-0 top-0" width="220" height="220" viewBox="0 0 220 220">
          <motion.path d="M0,160 A160,160 0 0 1 160,0" fill="none" stroke={CYAN} strokeOpacity="0.28" strokeWidth="2"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 1.4 }} />
        </svg>
        <svg className="absolute right-0 bottom-0" width="220" height="220" viewBox="0 0 220 220">
          <motion.path d="M60,220 A160,160 0 0 0 220,60" fill="none" stroke={GOLD} strokeOpacity="0.22" strokeWidth="2"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.0, duration: 1.4 }} />
        </svg>

        {/* Edge particles to balance composition */}
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={`edge-${i}`}
            className="absolute rounded-full"
            style={{ width: 3, height: 3, background: CYAN, opacity: 0.75 }}
            initial={{
              x: i % 2 === 0 ? -20 : (typeof window !== 'undefined' ? window.innerWidth + 20 : 2000),
              y: 40 + (i * ((typeof window !== 'undefined' ? window.innerHeight : 800) / 20)) % ((typeof window !== 'undefined' ? window.innerHeight : 800) - 80)
            }}
            animate={{
              x: i % 2 === 0 ? [ -20, 80 ] : [ (typeof window !== 'undefined' ? window.innerWidth + 20 : 2000), (typeof window !== 'undefined' ? window.innerWidth - 80 : 1800) ],
              opacity: [0, 0.8, 0]
            }}
            transition={{ delay: 0.4 + (i % 6) * 0.15, duration: 2.2, ease: "easeInOut" }}
          />
        ))}

      {/* Tiny hint to enable sound if blocked by browser */}
      {!audioPrimed && (
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] px-2 py-1 rounded-full bg-surface/70 border border-theme text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0.4] }}
          transition={{ duration: 1.2, repeat: 1 }}
        >
          Tap once for sound
        </motion.div>
      )}
      {/* Typing indicator (chat-related) at bottom center */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 items-center pointer-events-none">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.span
            key={`ti-${i}`}
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: CYAN, opacity: 0.6 }}
            initial={{ opacity: 0.2, y: 0 }}
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
            transition={{ delay: 2.0 + i * 0.15, duration: 0.9, repeat: 2, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Message checkmarks streaming in (delivered/secure) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <svg key={`ck-${i}`} width="18" height="18" viewBox="0 0 24 24" className="absolute"
               style={{ top: i * 14, left: 0, opacity: 0.9 }}>
            <motion.path d="M1 12l5 5L23 3" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: [0, 1, 0.6], x: [-20, 0] }}
              transition={{ delay: 0.9 + i * 0.12, duration: 0.6, ease: 'easeOut' }}
            />
          </svg>
        ))}
      </div>

      {/* Right-side vertical particle stream to balance layout */}
      <div className="absolute right-10 top-1/4 pointer-events-none">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={`rs-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ right: 0, top: i * 16, background: CYAN, opacity: 0.7 }}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: [20, 0], opacity: [0, 1, 0.6] }}
            transition={{ delay: 0.6 + i * 0.06, duration: 0.8, ease: 'easeOut' }}
          />
        ))}

        {/* Left-side vertical particle rail */}
        <div className="absolute left-10 top-1/4 pointer-events-none">
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={`ls-rail-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ left: 0, top: i * 16, background: CYAN, opacity: 0.6 }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: [-20, 0], opacity: [0, 1, 0.6] }}
              transition={{ delay: 0.7 + i * 0.06, duration: 0.8, ease: 'easeOut' }}
            />
          ))}
        </div>

        {/* Top ticker beam sweep */}
        <motion.div
          className="absolute top-6 left-0 right-0 h-1 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6, 0] }}
          transition={{ delay: 0.5, duration: 3.0, ease: 'easeInOut' }}
        >
          <motion.div
            className="h-full w-1/3"
            style={{ background: `linear-gradient(90deg, transparent, ${CYAN}66, ${GOLD}55, transparent)` }}
            initial={{ x: '-30%' }}
            animate={{ x: ['-30%', '120%'] }}
            transition={{ delay: 0.6, duration: 2.4, ease: 'easeInOut' }}
          />
        </motion.div>
        {/* Side constellation clusters (fill left/right empty space) */}
        {/* LEFT CLUSTER (enlarged) */}
        <div className="absolute left-8 top-1/3 pointer-events-none" style={{ width: 320, height: 260 }}>
          {/* Connecting lines */}
          <svg width="320" height="260" viewBox="0 0 320 260" className="absolute inset-0">
            <motion.path d="M12,136 Q100,36 200,100 T308,196" fill="none" stroke={CYAN} strokeOpacity="0.28" strokeWidth="1.6"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.6, duration: 1.6 }} />
            <motion.path d="M36,206 Q140,136 252,150" fill="none" stroke={GOLD} strokeOpacity="0.26" strokeWidth="1.2"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.9, duration: 1.2 }} />
          </svg>
          {/* Nodes */}
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={`lc-${i}`}
              className="absolute rounded-full"
              style={{ width: 4, height: 4, background: i % 3 ? CYAN : '#fff', opacity: 0.95,
                left: [16, 44, 72, 100, 128, 156, 184, 212, 240, 268, 296, 224, 188, 152][i],
                top:  [126, 106, 86, 96, 112, 104, 126, 152, 176, 188, 200, 140, 120, 160][i] }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 1, 0.92], opacity: [0, 1, 0.95] }}
              transition={{ delay: 0.55 + i * 0.06, duration: 0.8 }}
            />
          ))}
          {/* Tiny lock HUD */}
          <motion.div className="absolute" style={{ left: 24, top: 24 }} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 0.8, y: 0 }} transition={{ delay: 0.9 }}>
            <svg width="38" height="38" viewBox="0 0 24 24">
              <motion.path d="M6 10V8a6 6 0 1 1 12 0v2" fill="none" stroke={CYAN} strokeWidth="1.4" strokeOpacity="0.6" />
              <motion.rect x="5" y="10" width="14" height="10" rx="2" ry="2" fill="none" stroke={GOLD} strokeWidth="1.2" strokeOpacity="0.6" />
            </svg>
          </motion.div>
        </div>

        {/* RIGHT CLUSTER */}
        <div className="absolute right-8 top-1/4 pointer-events-none" style={{ width: 280, height: 240 }}>
          <svg width="280" height="240" viewBox="0 0 280 240" className="absolute inset-0">
            <motion.path d="M12,40 Q90,70 150,36 T268,58" fill="none" stroke={GOLD} strokeOpacity="0.2" strokeWidth="1.2"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.7, duration: 1.4 }} />
            <motion.path d="M20,200 Q120,160 220,190" fill="none" stroke={CYAN} strokeOpacity="0.2" strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.95, duration: 1.3 }} />
          </svg>
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.span
              key={`rc-${i}`}
              className="absolute rounded-full"
              style={{ width: 4, height: 4, background: i % 4 === 0 ? GOLD : CYAN, opacity: 0.9,
                left: [16, 52, 88, 124, 160, 196, 232, 248, 212, 176, 140, 104][i],
                top:  [58,  44,  36,  48,  64,  52,  60,  88,  152, 176, 192, 202][i] }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 1, 0.9], opacity: [0, 1, 0.85] }}
              transition={{ delay: 0.65 + i * 0.055, duration: 0.8 }}
            />
          ))}
          {/* Mini shield outline */}
          <motion.svg width="40" height="48" viewBox="0 0 20 24" className="absolute" style={{ right: 10, top: 6 }} initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 1.0 }}>
            <defs>
              <linearGradient id="miniShield" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={CYAN} />
                <stop offset="100%" stopColor={GOLD} />
              </linearGradient>
            </defs>
            <motion.path d="M10 1 L18 5 L18 12 C18 16 14.5 19.5 10 22 C5.5 19.5 2 16 2 12 L2 5 Z" fill="none" stroke="url(#miniShield)" strokeWidth="1.2" strokeOpacity="0.85"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, delay: 1.1 }} />
          </motion.svg>
        </div>

        {/* MID-LEFT ORBIT MOTIF (right beside shield on the left) */}
        <div className="absolute pointer-events-none" style={{ left: 'calc(50% - 320px)', top: '50%', transform: 'translateY(-44%)', width: 260, height: 180 }}>
          {/* Curved guidance lines */}
          <svg width="260" height="180" viewBox="0 0 260 180" className="absolute inset-0">
            <motion.path d="M6,120 C60,40 150,30 238,86" fill="none" stroke={CYAN} strokeOpacity="0.22" strokeWidth="1.6"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.7, duration: 1.2 }} />
            <motion.path d="M18,146 C88,92 156,84 228,112" fill="none" stroke={GOLD} strokeOpacity="0.20" strokeWidth="1.2" strokeDasharray="6 8"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.9, duration: 1.0 }} />
          </svg>
          {/* Dots flowing toward shield */}
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.span key={`ml-${i}`} className="absolute w-2 h-2 rounded-full"
              style={{ left: [18, 48, 78, 108, 138, 168, 198, 218, 236][i], top: [130, 116, 106, 102, 100, 104, 108, 114, 120][i], background: i % 3 === 0 ? GOLD : CYAN, opacity: 0.9, filter: 'drop-shadow(0 0 6px rgba(103,232,249,0.35))' }}
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 1, 0.95], opacity: [0, 1, 0.95] }} transition={{ delay: 0.75 + i * 0.06, duration: 0.7 }} />
          ))}
          {/* Tiny hex badge */}
          <motion.svg width="22" height="22" viewBox="0 0 24 24" className="absolute" style={{ left: 6, top: 92 }} initial={{ opacity: 0, rotate: -12 }} animate={{ opacity: 0.9, rotate: 0 }} transition={{ delay: 1.0 }}>
            <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="none" stroke={CYAN} strokeWidth="1.4" strokeOpacity="0.7" />
          </motion.svg>
        </div>

        {/* LEFT HUD PANEL (glass + hex-grid) */}
        <motion.div
          className="block absolute left-4 top-1/2 -translate-y-1/2 rounded-2xl"
          style={{ width: 300, height: '62vh', backdropFilter: 'blur(14px) saturate(1.15)', WebkitBackdropFilter: 'blur(14px) saturate(1.15)', border: '1.5px solid rgba(103,232,249,0.25)', background: 'linear-gradient(180deg, rgba(4,18,28,0.55), rgba(4,18,28,0.25))', boxShadow: '0 10px 36px rgba(8,24,36,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
        >
          {/* Glow border */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: `0 0 0 2px ${CYAN}22, 0 0 42px ${CYAN}11` }} />
          {/* Hex grid background */}
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'140\' height=\'120\' viewBox=\'0 0 140 120\'><g fill=\'none\' stroke=\'%2367e8f922\' stroke-width=\'1\'><path d=\'M30 10l40-10 40 10 0 40-40 10-40-10z\'/><path d=\'M30 70l40-10 40 10 0 40-40 10-40-10z\'/><path d=\'M-10 40l40-10 40 10 0 40-40 10-40-10z\'/><path d=\'M70 40l40-10 40 10 0 40-40 10-40-10z\'/></g></svg>")', backgroundSize: 'auto', filter: 'contrast(1.1)' }} />
          {/* Scanline */}
          <motion.div className="absolute left-0 right-0 h-16" style={{ top: 0, background: `linear-gradient(to bottom, ${CYAN}22, transparent)` }} initial={{ y: -80, opacity: 0 }} animate={{ y: ['-80%', '120%'], opacity: [0, 1, 0] }} transition={{ delay: 0.8, duration: 2.8, repeat: Infinity, repeatDelay: 1.8 }} />
          {/* Vertical label */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-xs tracking-[0.25em] uppercase" style={{ color: '#9ecae1' }}>
            Secure • Private • End‑to‑End
          </div>
          {/* Floating dots */}
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.span key={`lh-${i}`} className="absolute w-1.5 h-1.5 rounded-full" style={{ left: 28 + ((i * 21) % 200), top: 40 + ((i * 37) % 420), background: i % 3 ? CYAN : GOLD, opacity: 0.85, filter: 'drop-shadow(0 0 6px rgba(103,232,249,0.35))' }} initial={{ y: 0, opacity: 0 }} animate={{ y: [0, -6, 0], opacity: [0, 1, 1] }} transition={{ delay: 0.6 + i * 0.08, duration: 2.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} />
          ))}
          {/* Mini stats bars */}
          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3">
            {[12, 26, 18].map((h, idx) => (
              <motion.div key={`bar-${idx}`} className="relative h-24 rounded-md bg-[#0b2233cc] border border-[#163246] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 + idx * 0.1 }}>
                <motion.div className="absolute bottom-0 left-0 right-0" style={{ background: `linear-gradient(180deg, ${CYAN}88, ${CYAN}44)` }} initial={{ height: 0 }} animate={{ height: `${h}vh` }} transition={{ delay: 1 + idx * 0.2, duration: 1.2, ease: 'easeOut' }} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Left dotted rail accent */}
        <div className="absolute left-4 bottom-24 pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.span key={`ld-${i}`} className="block w-1 h-3 rounded-sm" style={{ background: CYAN, marginTop: 6, opacity: 0.7 }} initial={{ x: -8, opacity: 0 }} animate={{ x: [ -8, 0 ], opacity: [0, 1] }} transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }} />
          ))}
        </div>

        {/* Corner brackets (TL, TR, BL, BR) */}
        <svg className="absolute left-2 top-2" width="80" height="80" viewBox="0 0 80 80">
          <motion.path d="M2,30 L2,2 L30,2" fill="none" stroke={CYAN} strokeWidth="2" strokeOpacity="0.28"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 1.2 }} />
        </svg>
        <svg className="absolute right-2 top-2" width="80" height="80" viewBox="0 0 80 80">
          <motion.path d="M50,2 L78,2 L78,30" fill="none" stroke={GOLD} strokeWidth="2" strokeOpacity="0.24"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 1.2 }} />
        </svg>
        <svg className="absolute left-2 bottom-2" width="80" height="80" viewBox="0 0 80 80">
          <motion.path d="M2,50 L2,78 L30,78" fill="none" stroke={CYAN} strokeWidth="2" strokeOpacity="0.24"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 1.2 }} />
        </svg>
        <svg className="absolute right-2 bottom-2" width="80" height="80" viewBox="0 0 80 80">
          <motion.path d="M50,78 L78,78 L78,50" fill="none" stroke={GOLD} strokeWidth="2" strokeOpacity="0.24"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9, duration: 1.2 }} />
        </svg>

        {/* Bottom waveform sweep */}
        <svg className="absolute bottom-10 left-6 right-6" height="80" viewBox="0 0 800 80">
          <motion.path
            d="M0,40 C120,10 240,70 360,40 C480,10 600,70 720,40 C760,30 780,30 800,40"
            fill="none"
            stroke={CYAN}
            strokeOpacity="0.22"
            strokeWidth="2"
            strokeDasharray="6 8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.8, duration: 2.2, ease: 'easeInOut' }}
          />
        </svg>
      </div>
      </motion.div>

      {/* Pre-Intro Pulse (0-1s): heartbeat ripple + bloom flash */}
      <motion.div
        className="absolute w-[380px] h-[380px] rounded-full"
        style={{ border: `1.5px solid ${CYAN}`, filter: 'blur(0.2px)' }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 1.15, 1], opacity: [0, 0.6, 0] }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: 420, height: 420, background: `radial-gradient(circle, #ffffff55, ${GOLD}33, transparent 70%)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0] }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />

      <div className="relative w-[420px] h-[420px] flex items-center justify-center" style={{ transform: 'translate(0px, -10px)' }}>
        {/* Central sequence refocus: atoms converge → fuse → shield → ring → title */}

        {/* Centered lock silhouette morph (suppressed to avoid overlap) */}
        <motion.div
          className="absolute"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0 }}
          style={{ zIndex: 25, filter: 'blur(0.5px)' }}
        >
          <svg width="84" height="84" viewBox="0 0 24 24">
            <motion.path d="M6 10V8a6 6 0 1 1 12 0v2" fill="none" stroke={GOLD} strokeWidth="1.2" strokeOpacity="0.7" />
            <motion.rect x="5" y="10" width="14" height="10" rx="2" ry="2" fill="none" stroke={CYAN} strokeWidth="1.2" strokeOpacity="0.7" />
          </svg>
        </motion.div>

        {/* Remove orbiting lock and swirling particles to avoid overlap */}

        {/* Remove previous nest outline/data lines to keep the sequence clean */}

        {/* Bubble bloom (Option D): float in → ring → merge (accent synced) */}
        {bloomBubbles.map((b, idx) => (
          <motion.div
            key={`bloom-${b.id}`}
            className="absolute rounded-full"
            style={{
              width: 22,
              height: 22,
              background: "transparent",
              border: "2px solid rgba(255,255,255,0.85)",
              boxShadow: `0 0 18px ${getComputedStyle(document.documentElement).getPropertyValue('--accent') || 'rgba(20,184,166,0.45)'}, 0 0 6px rgba(255,255,255,0.25)`,
              zIndex: 20,
            }}
            initial={{ x: b.initial.x, y: b.initial.y, scale: 0.6, opacity: 0 }}
            animate={{
              x: [b.initial.x, b.tx, 0],
              y: [b.initial.y, b.ty, 0],
              scale: [0.6, 1.1, 0.2],
              opacity: [0, 1, 0],
            }}
            transition={{ delay: 0.6 + idx * 0.05, duration: 2.0, ease: "easeInOut" }}
          />
        ))}

        {/* Merge pulse when bubbles converge */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: 22, height: 22, background: CYAN, zIndex: 10, filter: "blur(6px)" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 9, 0], opacity: [0, 1, 0] }}
          transition={{ delay: 1.9, duration: 0.9, ease: "easeOut" }}
        />

        {/* Shield + Saturn ring motif (appears before text) */}
        <div className="absolute" style={{ zIndex: 35 }}>
          {/* Shield outline draw */}
          <svg width="320" height="380" viewBox="0 0 200 240">
            <defs>
              <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={CYAN} />
                <stop offset="50%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor={GOLD} />
              </linearGradient>
            </defs>
            {/* Classic shield shape */}
            <motion.path
              d="M100 12 L168 50 L168 118 C168 168 138 202 100 226 C62 202 32 168 32 118 L32 50 Z"
              fill="none"
              stroke="url(#shieldGrad)"
              strokeWidth="2.5"
              strokeOpacity="0.9"
              strokeDasharray="640"
              initial={{ strokeDashoffset: 640, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: 1 }}
              transition={{ delay: 2.1, duration: 0.9, ease: 'easeInOut' }}
            />
            {/* Inner glow */}
            <motion.path
              d="M100 22 L158 54 L158 116 C158 158 133 188 100 208 C67 188 42 158 42 116 L42 54 Z"
              fill="none"
              stroke={CYAN}
              strokeOpacity="0.28"
              strokeWidth="1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0.25] }}
              transition={{ delay: 2.2, duration: 1.2, ease: 'easeOut' }}
            />
          </svg>

          {/* Planet + tilted ring inside the shield */}
          <div className="absolute left-1/2 top-1/2" style={{ transform: 'translate(-50%, -42%)', width: 360, height: 240, zIndex: 50, pointerEvents: 'none' }}>
            {/* Planet core */}
            <motion.div
              className="absolute rounded-full"
              style={{ width: 28, height: 28, left: '50%', top: '45%', transform: 'translate(-50%, -50%)', background: `radial-gradient(circle, ${GOLD}AA, #ffffff66, transparent)` }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 1, 0.95], opacity: [0, 1, 0.85] }}
              transition={{ delay: 2.35, duration: 0.7, ease: 'easeOut' }}
            />
            {/* Tilted ring (Saturn-like) */}
            <motion.svg
              width="360" height="240" viewBox="0 0 360 240"
              style={{ position: 'absolute', left: 0, top: 0 }}
              initial={{ rotate: -12, opacity: 0 }}
              animate={{ rotate: [-12, -4, -12], opacity: [0, 1, 1] }}
              transition={{ delay: 2.4, duration: 2.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            >
              <g transform="translate(180,92)">
                <ellipse cx="0" cy="0" rx="150" ry="30" fill="none" stroke={CYAN} strokeWidth="2" strokeOpacity="0.7" />
                <ellipse cx="0" cy="0" rx="168" ry="34" fill="none" stroke={GOLD} strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="8 10" />
              </g>
            </motion.svg>
          </div>
        </div>

        {/* SecureNest slides in letter-by-letter (after shield + ring) */}
        <div className="absolute flex gap-0.5 items-end" style={{ transform: "translate(0px, -2px)", zIndex: 40 }}>
          {TITLE.map((ch, i) => (
            <motion.span
              key={`ch-${i}`}
              className="text-4xl md:text-5xl font-extrabold tracking-tight"
              style={{
                color: i < 6 ? "#ffffff" : "transparent",
                background: i >= 6 ? BUBBLE_GRADIENT : undefined,
                WebkitBackgroundClip: i >= 6 ? 'text' : undefined,
              }}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 3.0 + i * 0.05, duration: 0.4, ease: "easeOut" }}
            >
              {ch}
            </motion.span>
          ))}
        </div>

        {/* Crest pop subtle outline to connect both motifs */}
        <motion.div
          className="absolute w-36 h-36 rounded-full border"
          style={{ borderColor: GOLD, zIndex: 15, boxShadow: "0 0 24px rgba(245,211,125,0.35) inset" }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 1, 0.6], scale: [0.7, 1.05, 1] }}
          transition={{ delay: 2.6, duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Fade to app */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.18, 0] }}
        transition={{ delay: 4.4, duration: 0.7, ease: "easeOut" }}
        style={{ background: `radial-gradient(circle at 50% 50%, ${CYAN}44, transparent 60%)` }}
      />

      {/* Dissolve particles outward at the end */}
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.span
          key={`d-${i}`}
          className="absolute rounded-full"
          style={{ width: 3, height: 3, background: CYAN, left: "50%", top: "50%" }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{
            x: (Math.cos((i / 28) * Math.PI * 2) * 140),
            y: (Math.sin((i / 28) * Math.PI * 2) * 80),
            opacity: [0, 1, 0],
          }}
          transition={{ delay: 4.2 + (i % 6) * 0.02, duration: 0.7, ease: "easeOut" }}
        />
      ))}

      {/* Ambient dust field (light z-depth parallax) */}
      {Array.from({ length: 36 }).map((_, i) => (
        <motion.span
          key={`af-${i}`}
          className="absolute rounded-full"
          style={{
            width: 2,
            height: 2,
            background: '#ffffff22',
            left: `${(i * 97) % 100}%`,
            top: `${(i * 53) % 100}%`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.25, 0], y: [0, (i % 2 === 0 ? -6 : 6), 0] }}
          transition={{ delay: 0.2 + (i % 5) * 0.12, duration: 2.6, ease: 'easeInOut' }}
        />
      ))}
    </motion.div>
  );
};

export default SplashScreen;
