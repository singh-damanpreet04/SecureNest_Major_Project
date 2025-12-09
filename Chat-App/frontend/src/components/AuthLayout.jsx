import { MessageSquare, Zap, Lock, Shield, Globe, Loader2, Check, Home, ShieldCheck, LockKeyhole, Wifi, Sparkles, Users, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticlesBackground } from './ParticlesBackground';
import { GradientWave } from './GradientWave';

const AnimatedDot = ({ delay = 0 }) => {
  return (
    <motion.div
      className="w-2 h-2 rounded-full bg-blue-300/70"
      animate={{
        y: [0, -6, 0],
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        delay: delay,
        ease: 'easeInOut',
      }}
    />
  );
};

const AnimatedText = ({ text, className = '' }) => {
  return (
    <div className="overflow-hidden">
      <motion.h1 
        className={className}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {text}
      </motion.h1>
    </div>
  );
};

const AnimatedFeatureItem = ({ icon, text, delay = 0 }) => {
  return (
    <motion.div 
      className="flex items-center space-x-3 group"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + delay * 0.1 }}
      whileHover={{ x: 5 }}
    >
      <motion.div
        className="p-2 rounded-lg bg-blue-500/20"
        animate={{
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: delay * 0.2
        }}
      >
        {icon}
      </motion.div>
      <span className="text-blue-100 group-hover:text-white transition-colors">
        {text}
      </span>
    </motion.div>
  );
};

const PremiumFeatureCard = ({ icon, title, description, delay = 0, accent = 'blue' }) => {
  const accentClasses = {
    blue: 'from-blue-500/20 to-cyan-500/10 border-blue-400/30 text-blue-200 hover:border-blue-300/80',
    mint: 'from-emerald-500/20 to-teal-500/10 border-emerald-400/30 text-emerald-200 hover:border-emerald-300/80',
    gold: 'from-amber-500/20 to-orange-500/10 border-amber-400/30 text-amber-200 hover:border-amber-300/80'
  };

  return (
    <motion.div
      className={`group relative p-4 rounded-2xl bg-gradient-to-br ${accentClasses[accent]} border backdrop-blur-md transition-all duration-300 cursor-pointer`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + delay * 0.15 }}
      whileHover={{
        x: 10,
        scale: 1.03,
        boxShadow: '0 15px 35px rgba(13,105,255,0.25)',
        transition: { type: 'spring', stiffness: 400, damping: 20 }
      }}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
          animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.2 }}
        >
          {icon}
        </motion.div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1 group-hover:text-blue-50 transition-colors">{title}</h3>
          <p className="text-sm text-blue-100/80 leading-relaxed">{description}</p>
        </div>
      </div>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 0.6 }}
      />
    </motion.div>
  );
};

// Animated background dots component
const AnimatedBackground = () => {
  const dots = Array(20).fill(0);
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {dots.map((_, i) => {
        const size = Math.random() * 6 + 2;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = 3 + Math.random() * 4;
        
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blue-400/10"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${posX}%`,
              top: `${posY}%`,
            }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
};

const AuthLayout = ({ children }) => {
  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', emoji: '🌅' };
    if (hour < 18) return { text: 'Good Afternoon', emoji: '☀️' };
    return { text: 'Good Evening', emoji: '🌙' };
  };

  return (
    <motion.div 
      className="min-h-screen bg-[#0D1117] text-white flex flex-col font-sans relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      exit={{ opacity: 0 }}
    >
      {/* Background with diagonal partition */}
        <ParticlesBackground />
        {/* Professional Cybersecurity Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 z-0" />
        
        {/* Circuit trace pattern overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-10 z-0" preserveAspectRatio="none">
          <defs>
            <pattern id="circuitTrace" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <rect x="20" y="20" width="160" height="160" fill="none" stroke="#0ea5e9" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="3" fill="#0ea5e9" opacity="0.6" />
              <circle cx="150" cy="50" r="3" fill="#06b6d4" opacity="0.5" />
              <circle cx="100" cy="150" r="3" fill="#0ea5e9" opacity="0.6" />
              <line x1="50" y1="50" x2="150" y2="50" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.4" />
              <line x1="150" y1="50" x2="100" y2="150" stroke="#06b6d4" strokeWidth="0.5" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuitTrace)" />
        </svg>
        
        {/* Animated security nodes */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-cyan-400"
            style={{
              left: `${10 + i * 18}%`,
              top: `${15 + Math.sin(i) * 10}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
        
        {/* Left side: Lock icon accent */}
        <motion.div
          className="absolute left-8 top-1/4 opacity-15 z-0"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <Lock className="w-32 h-32 text-cyan-400" />
        </motion.div>
        
        {/* Right side: Shield icon accent */}
        <motion.div
          className="absolute right-8 bottom-1/4 opacity-15 z-0"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Shield className="w-32 h-32 text-blue-400" />
        </motion.div>
        
        {/* Floating security icons */}
        <motion.div
          className="absolute left-12 top-20 opacity-20 z-0"
          animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Lock className="w-16 h-16 text-cyan-400" />
        </motion.div>
        
        <motion.div
          className="absolute right-16 top-32 opacity-20 z-0"
          animate={{ x: [0, -15, 0], y: [0, 10, 0], rotate: [0, -180, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        >
          <LockKeyhole className="w-14 h-14 text-blue-400" />
        </motion.div>
        
        <motion.div
          className="absolute left-20 bottom-32 opacity-20 z-0"
          animate={{ x: [0, 10, 0], y: [0, -15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Wifi className="w-12 h-12 text-cyan-300" />
        </motion.div>
        
        {/* Glowing data particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400/60"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 5 + i * 1.5,
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'easeInOut',
            }}
          />
        ))}
        
        {/* Pulsing connection dots */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`dot-${i}`}
            className="absolute w-2 h-2 rounded-full bg-blue-400/50"
            style={{
              left: `${25 + i * 20}%`,
              bottom: `${15 + (i % 2) * 20}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
          />
        ))}
        
        {/* Rotating hexagon patterns */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`hex-${i}`}
            className="absolute opacity-15"
            style={{
              left: `${20 + i * 25}%`,
              top: `${15 + i * 20}%`,
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 15 + i * 5, repeat: Infinity, ease: 'linear' }}
          >
            <svg className="w-12 h-12" viewBox="0 0 24 24">
              <polygon
                points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1"
              />
              <circle cx="12" cy="12" r="2" fill="#0ea5e9" />
            </svg>
          </motion.div>
        ))}
        
        {/* Data stream particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`stream-${i}`}
            className="absolute w-1 h-1 rounded-full bg-cyan-400"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 40 - 20, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
        
        {/* Floating security badges */}
        <motion.div
          className="absolute right-1/4 top-1/3 bg-gradient-to-br from-cyan-500/30 to-blue-500/15 border border-cyan-400/50 rounded-xl p-3 backdrop-blur-sm shadow-lg"
          animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ShieldCheck className="w-6 h-6 text-cyan-300" />
        </motion.div>
        
        <motion.div
          className="absolute left-1/4 bottom-1/3 bg-gradient-to-br from-blue-500/30 to-cyan-500/15 border border-blue-400/50 rounded-xl p-3 backdrop-blur-sm shadow-lg"
          animate={{ y: [0, 15, 0], rotate: [0, -10, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <LockKeyhole className="w-6 h-6 text-blue-300" />
        </motion.div>
        
        <motion.div
          className="absolute right-1/3 bottom-1/4 bg-gradient-to-br from-emerald-500/30 to-cyan-500/15 border border-emerald-400/50 rounded-xl p-3 backdrop-blur-sm shadow-lg"
          animate={{ x: [0, -10, 0], y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Wifi className="w-5 h-5 text-emerald-300" />
        </motion.div>
        
        {/* Pulsing connection lines */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`line-${i}`}
            className="absolute h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent"
            style={{
              width: `${80 + i * 30}px`,
              left: `${10 + i * 20}%`,
              top: `${30 + i * 12}%`,
            }}
            animate={{
              opacity: [0, 0.8, 0],
              scaleX: [0, 1, 0],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'easeInOut',
            }}
          />
        ))}
        
        {/* Glowing orbs with trails */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute"
            style={{
              left: `${60 + i * 12}%`,
              top: `${20 + i * 25}%`,
            }}
            animate={{
              x: [0, 20, -20, 0],
              y: [0, -15, 15, 0],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-cyan-400"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.4, 0.8, 0.4],
                filter: ['blur(2px)', 'blur(0px)', 'blur(2px)'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="absolute top-0 left-0 w-2 h-2 rounded-full bg-cyan-400/50"
              animate={{
                scale: [1, 3, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        ))}
        
        {/* Rotating security rings */}
        <motion.div
          className="absolute left-1/3 top-1/4 w-20 h-20 border-2 border-cyan-400/40 rounded-full"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute left-1/3 top-1/4 w-28 h-28 border border-blue-400/30 rounded-full"
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute left-1/3 top-1/4 w-36 h-36 border border-cyan-300/20 rounded-full"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
      {/* Header with subtle animation */}
      <motion.header 
        className="px-4 sm:px-8 py-4 border-b border-gray-800/50 shadow-lg bg-[#0D1117]/80 backdrop-blur-sm sticky top-0 z-20"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          type: 'spring', 
          stiffness: 100, 
          damping: 15,
          delay: 0.2
        }}
      >
        <motion.div 
          className="flex items-center space-x-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div 
            className="p-1.5 bg-gray-800/60 rounded-lg"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <MessageSquare className="w-5 h-5 text-blue-400" />
          </motion.div>
          <motion.span 
            className="text-lg font-bold tracking-wider text-gray-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            SecureNest
          </motion.span>
        </motion.div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-grow w-full grid grid-cols-1 lg:grid-cols-12 relative z-10 gap-0">
        {/* Overlay gradient for better text readability */}
        <div className="fixed inset-0 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-0" />
        {/* Left Side - Form with floating animation */}
        <motion.div 
          className="lg:col-span-5 flex items-center justify-start pl-4 sm:pl-8 md:pl-12 p-4 sm:p-6 md:p-8 relative z-10"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            duration: 0.7, 
            delay: 0.3,
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          <motion.div 
            className="w-full max-w-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 hover:border-white/30 transition-all"
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(8px)' }}
            transition={{ delay: 0.5 }}
            whileHover={{ 
              y: -8,
              filter: 'blur(0px)',
              boxShadow: '0 20px 60px rgba(59, 130, 246, 0.3)',
              transition: { 
                type: 'spring',
                stiffness: 300,
                damping: 20
              }
            }}
          >
            {/* Floating motion when not hovered */}
            <motion.div
              animate={{
                x: [0, 8, -8, 4, -4, 0],
                y: [0, -6, 6, -4, 4, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <AnimatePresence mode="wait">
                {children}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right Side - Premium SecureNest Narrative */}
        <motion.div 
          className="lg:col-span-7 flex flex-col justify-center p-8 sm:p-10 md:p-12 relative overflow-hidden"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Soft glow accent */}
          <motion.div 
            className="absolute top-1/3 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl"
            animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 w-full space-y-8">
            {/* Greeting - enlarged with lively emoji */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-3">
                <motion.span
                  className="text-5xl inline-block"
                  animate={{ 
                    x: [0, 4, -4, 0],
                    y: [0, -5, 0],
                    rotate: [0, 8, -8, 0],
                    scale: [1, 1.08, 1]
                  }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {getGreeting().emoji}
                </motion.span>
                <div>
                  <p className="text-cyan-200 text-lg font-bold uppercase tracking-wider">{getGreeting().text}</p>
                  <p className="text-blue-100/70 text-xs uppercase tracking-widest font-semibold">Welcome to your secure space</p>
                </div>
              </div>
            </motion.div>

            {/* Headline - improved contrast */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <motion.div
                  className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex-shrink-0"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                  <Home className="w-5 h-5 text-cyan-300" />
                </motion.div>
                <AnimatedText 
                  text="SecureNest"
                  className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <p className="text-sm font-bold text-cyan-200 tracking-wide">Where privacy meets connection.</p>
              </div>
              <motion.div
                className="h-1 w-20 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full shadow-lg"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              />
              <p className="text-blue-100 text-sm leading-relaxed font-medium">
                Your <span className="text-cyan-300 font-bold">digital sanctuary</span> for private conversations with <span className="text-cyan-300 font-bold">military-grade encryption</span> and <span className="text-emerald-300 font-bold">lightning-fast delivery</span>.
              </p>
            </div>

            {/* Feature block - compact spacing */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <PremiumFeatureCard
                icon={<LockKeyhole className="w-5 h-5 text-blue-200" />}
                title="Fortress-Grade Encryption"
                description="End-to-end protection with rotating keys and zero-knowledge storage."
                delay={0}
                accent="blue"
              />
              <PremiumFeatureCard
                icon={<Wifi className="w-5 h-5 text-cyan-200" />}
                title="Lightning Delivery"
                description="Instant syncing across devices with quantum-safe transport layers."
                delay={1}
                accent="mint"
              />
              <PremiumFeatureCard
                icon={<ShieldCheck className="w-5 h-5 text-emerald-200" />}
                title="Always-On Protection"
                description="AI threat detection, biometric locks, and breach alerts 24/7."
                delay={2}
                accent="gold"
              />
            </motion.div>

            {/* Trust statement - improved contrast */}
            <motion.div 
              className="pt-4 border-t border-cyan-400/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-xs text-cyan-200 font-semibold flex items-center gap-2 uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Trusted by 120k+ users worldwide
              </p>
            </motion.div>
          </div>

          <div className="absolute bottom-8 right-8 flex space-x-3">
            <AnimatedDot delay={0} />
            <AnimatedDot delay={0.3} />
            <AnimatedDot delay={0.6} />
          </div>
        </motion.div>
      </main>
    </motion.div>
  );
};

export default AuthLayout;
