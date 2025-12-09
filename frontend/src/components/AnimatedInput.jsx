import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const AnimatedInput = ({ id, label, value, type = 'text', onChange, children }) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;

  const isLabelFloating = isFocused || hasValue;

  return (
    <div className="relative pt-5">
      <motion.label
        htmlFor={id}
        className="absolute left-0 text-gray-400 cursor-text"
        animate={{
          y: isLabelFloating ? -20 : 0,
          scale: isLabelFloating ? 0.875 : 1,
          color: isFocused ? '#3b82f6' : '#9ca3af',
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ originX: 0 }}
      >
        {label}
      </motion.label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full bg-transparent border-0 border-b-2 text-white pb-2 outline-none transition-all duration-300 ease-in-out border-gray-600 focus:bg-gray-800/50 focus:border-blue-500 focus:rounded-md focus:px-3 focus:py-2 appearance-none"
      />
      {children && (
        <div className="absolute right-0 top-1/2 -translate-y-1/4 transform">
            {children}
        </div>
      )}
    </div>
  );
};

export default AnimatedInput;
