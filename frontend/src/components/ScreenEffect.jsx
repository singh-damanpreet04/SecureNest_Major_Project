import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const ScreenEffect = ({ status, onComplete }) => {
  const audioRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (status) {
      // Play sound effect
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }

      // Auto-hide after 5 seconds
      timeoutRef.current = setTimeout(() => {
        if (onComplete) onComplete();
      }, 5000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [status, onComplete]);

  // Enhanced sound effects using Web Audio API
  useEffect(() => {
    if (!status) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (status === 'fake') {
      // Cinematic danger siren (yelp pattern), louder but controlled (5s)
      const osc = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator(); // add slight detune for richness
      const hp = audioContext.createBiquadFilter(); // high-pass to remove muddiness
      const filter = audioContext.createBiquadFilter(); // band-pass focus
      const gain = audioContext.createGain();
      const comp = audioContext.createDynamicsCompressor();

      // Bright sources
      osc.type = 'sawtooth';
      osc2.type = 'sawtooth';
      // slight detune for stereo-like beating
      osc2.detune.setValueAtTime(7, audioContext.currentTime); // cents

      // Clean low-end then focus presence around ~1.2kHz
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(300, audioContext.currentTime);
      hp.Q.setValueAtTime(0.7, audioContext.currentTime);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, audioContext.currentTime);
      filter.Q.setValueAtTime(2.0, audioContext.currentTime);

      // Comfortable but audible loudness; compressor will tame peaks
      gain.gain.setValueAtTime(0, audioContext.currentTime);

      // Compressor settings for punch without clipping
      comp.threshold.setValueAtTime(-24, audioContext.currentTime);
      comp.knee.setValueAtTime(30, audioContext.currentTime);
      comp.ratio.setValueAtTime(12, audioContext.currentTime);
      comp.attack.setValueAtTime(0.003, audioContext.currentTime);
      comp.release.setValueAtTime(0.25, audioContext.currentTime);

      // Wiring: (osc + osc2) -> hp -> bandpass -> gain -> comp -> output
      osc.connect(hp);
      osc2.connect(hp);
      hp.connect(filter);
      filter.connect(gain);
      gain.connect(comp);
      comp.connect(audioContext.destination);

      const now = audioContext.currentTime;
      const duration = 5.0;

      // Fade in to audible level (louder baseline)
      gain.gain.linearRampToValueAtTime(0.24, now + 0.12);

      // Yelp pattern: quick upward sweep then drop, repeat
      // Sweep 700 -> 1600 Hz over ~0.35s, drop to 900 Hz over ~0.15s, short rest 0.05s
      let t = now;
      while (t < now + duration) {
        // Upward sweep
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.linearRampToValueAtTime(1600, t + 0.35);
        // mirror sweep on osc2 for slightly different curve
        osc2.frequency.setValueAtTime(740, t);
        osc2.frequency.linearRampToValueAtTime(1680, t + 0.35);

        // Quick drop
        osc.frequency.linearRampToValueAtTime(900, t + 0.5);
        osc2.frequency.linearRampToValueAtTime(940, t + 0.5);

        // Per-yelp mini envelope for clarity (louder but controlled)
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.linearRampToValueAtTime(0.24, t + 0.1);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.5);

        // Advance by one yelp (0.55s total incl. short rest)
        t += 0.55;
      }

      // Final gentle fade out
      gain.gain.exponentialRampToValueAtTime(0.002, now + duration);

      // Start/stop
      osc.start(now);
      osc2.start(now);
      osc.stop(now + duration);
      osc2.stop(now + duration);

      return () => {
        osc.disconnect();
        osc2.disconnect();
        hp.disconnect();
        filter.disconnect();
        gain.disconnect();
        comp.disconnect();
      };
      
    } else {
      // Pleasant chime for real news
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
      
      // Create pleasant chime
      const now = audioContext.currentTime;
      
      // First note
      osc1.frequency.setValueAtTime(880, now); // A5
      osc2.frequency.setValueAtTime(1318.51, now); // E6
      
      // Second note (slight delay)
      osc1.frequency.setValueAtTime(1046.5, now + 0.1); // C6
      osc2.frequency.setValueAtTime(1567.98, now + 0.1); // G6
      
      // Third note
      osc1.frequency.setValueAtTime(1318.51, now + 0.2); // E6
      osc2.frequency.setValueAtTime(1975.53, now + 0.2); // B6
      
      // Volume envelope - extended to 3 seconds
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
      
      // Start and stop - extended to 3 seconds
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 3.0);
      osc2.stop(now + 3.0);
      
      return () => {
        osc1.disconnect();
        osc2.disconnect();
        gainNode.disconnect();
      };
    }
  }, [status]);

  if (!status) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      >
        {/* Background overlay */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className={`absolute inset-0 ${
            status === 'fake'
              ? 'bg-gradient-to-br from-red-900/20 via-red-500/30 to-red-900/20'
              : 'bg-gradient-to-br from-green-900/20 via-green-400/30 to-green-900/20'
          } backdrop-blur-sm`}
        />

        {/* Animated background elements */}
        {status === 'fake' ? (
          // Fake news - warning effects
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: [0.8, 1.2, 1.5],
                  opacity: [0.6, 0.3, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-red-400/40 rounded-full"
                style={{
                  width: `${300 + i * 100}px`,
                  height: `${300 + i * 100}px`
                }}
              />
            ))}
          </div>
        ) : (
          // Real news - success effects
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{
                  scale: [0, 1.5, 2],
                  opacity: [0.8, 0.4, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-green-400/50 rounded-full"
                style={{
                  width: `${200 + i * 150}px`,
                  height: `${200 + i * 150}px`
                }}
              />
            ))}
          </div>
        )}

        {/* Main content */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -50 }}
          transition={{
            duration: 0.8,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className="relative z-10 text-center bg-gray-900/80 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl"
        >
          <motion.div
            animate={status === 'fake' ? { x: [-2, 2, -2, 0] } : { scale: [1, 1.1, 1] }}
            transition={{
              duration: status === 'fake' ? 0.5 : 2,
              repeat: status === 'fake' ? Infinity : 0,
              ease: "easeInOut"
            }}
            className={`flex flex-col items-center space-y-6 ${
              status === 'fake' ? 'text-red-400' : 'text-green-400'
            }`}
          >
            <motion.div
              animate={{
                rotate: status === 'fake' ? [0, -5, 5, 0] : [0, 360],
                scale: status === 'fake' ? [1, 1.1, 1] : [1, 1.2, 1]
              }}
              transition={{
                duration: status === 'fake' ? 0.5 : 2,
                repeat: status === 'fake' ? Infinity : 0,
                ease: "easeInOut"
              }}
              className="text-8xl"
            >
              {status === 'fake' ? (
                <FiAlertTriangle className="drop-shadow-2xl" />
              ) : (
                <FiCheckCircle className="drop-shadow-2xl" />
              )}
            </motion.div>

            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-4xl md:text-5xl font-bold tracking-wider drop-shadow-2xl mb-2"
              >
                {status === 'fake' ? '⚠️ Fake News Detected' : '✅ Verified News'}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-lg text-gray-300"
              >
                {status === 'fake'
                  ? 'This content appears to be false or misleading.'
                  : 'This content has been verified as authentic.'
                }
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ScreenEffect;
