import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimatedInput = ({
  id,
  type = 'text',
  label,
  value,
  onChange,
  error = null,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const hasValue = value && value.toString().length > 0;

  // Auto-focus effect for error state
  useEffect(() => {
    if (error) {
      inputRef.current.focus();
    }
  }, [error]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-4 pt-6 pb-2 bg-white/5 border rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-blue-500/50
            transition-all duration-200 ease-in-out
            ${error ? 'border-red-500' : 'border-white/10 hover:border-white/20'}
            peer
          `}
          {...props}
        />
        
        <motion.label
          htmlFor={id}
          className={`
            absolute left-4 text-sm transition-all duration-200 ease-in-out
            ${error ? 'text-red-400' : 'text-gray-400'}
            ${isFocused || hasValue ? 'top-1.5 text-xs' : 'top-1/2 -translate-y-1/2'}
          `}
          initial={false}
          animate={{
            y: isFocused || hasValue ? 0 : '50%',
            scale: isFocused || hasValue ? 0.9 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20
          }}
        >
          {label}
        </motion.label>
        
        {/* Underline effect */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 origin-left"
          initial={{ scaleX: 0 }}
          animate={{ 
            scaleX: isFocused ? 1 : 0,
            opacity: isFocused ? 1 : 0.5
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p 
            className="mt-1 text-xs text-red-400"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedInput;
