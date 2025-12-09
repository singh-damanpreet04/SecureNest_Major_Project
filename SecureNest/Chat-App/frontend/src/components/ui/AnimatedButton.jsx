import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';

const AnimatedButton = ({
  children,
  isLoading = false,
  isSuccess = false,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <motion.button
      className={`
        relative px-6 py-3 rounded-lg font-medium text-white
        bg-gradient-to-r from-blue-600 to-blue-700
        hover:from-blue-500 hover:to-blue-600
        focus:outline-none focus:ring-2 focus:ring-blue-500/50
        disabled:opacity-70 disabled:cursor-not-allowed
        overflow-hidden ${className}
      `}
      disabled={disabled || isLoading || isSuccess}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      whileHover={!disabled && !isLoading && !isSuccess ? {
        scale: 1.02,
        boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
      } : {}}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.span
            key="loading"
            className="flex items-center justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Loader2 className="w-5 h-5 animate-spin" />
          </motion.span>
        ) : isSuccess ? (
          <motion.span
            key="success"
            className="flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
          >
            <Check className="w-5 h-5" />
          </motion.span>
        ) : (
          <motion.span
            key="default"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
      
      {/* Ripple effect */}
      <motion.span 
        className="absolute inset-0 bg-white/20 rounded-full"
        initial={{ scale: 0, opacity: 1 }}
        whileTap={{ 
          scale: 2, 
          opacity: 0,
          transition: { duration: 0.6 }
        }}
      />
      
      {/* Glow effect */}
      <motion.div 
        className="absolute inset-0 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.3, 0],
          scale: [1, 1.2, 1.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut'
        }}
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
        }}
      />
    </motion.button>
  );
};

export default AnimatedButton;
