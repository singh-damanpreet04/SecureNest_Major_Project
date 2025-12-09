import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import AuthForm from './AuthForm';
import { useInView } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      when: "beforeChildren"
    }
  },
  exit: { opacity: 0 }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  },
  exit: { y: -20, opacity: 0 }
};

const AuthContainer = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const controls = useAnimation();
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: false });

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, show success state
      console.log('Form submitted:', formData);
      // In a real app, you would handle the actual authentication here
      // and navigate to the dashboard on success
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <motion.div 
      ref={containerRef}
      className="w-full max-w-md mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate={controls}
    >
      <motion.div 
        className="text-center mb-8"
        variants={itemVariants}
      >
        <motion.h2 
          className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2"
          key={isLogin ? 'login' : 'signup'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            transition: { 
              type: 'spring', 
              stiffness: 100,
              damping: 15
            } 
          }}
          exit={{ 
            opacity: 0, 
            y: -20,
            transition: { duration: 0.2 }
          }}
        >
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </motion.h2>
        <motion.p 
          className="text-gray-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {isLogin ? 'Sign in to your account' : 'Get started with your account'}
        </motion.p>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div 
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-700/50 overflow-hidden"
          variants={itemVariants}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'signup'}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ 
                type: 'spring',
                stiffness: 100,
                damping: 15
              }}
            >
              <AuthForm 
                isLogin={isLogin} 
                onSubmit={handleSubmit}
                isLoading={isLoading}
                error={error}
              />
            </motion.div>
          </AnimatePresence>

          <motion.div 
            className="mt-6 text-center"
            variants={itemVariants}
          >
            <p className="text-sm text-gray-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <motion.button
                type="button"
                onClick={toggleAuthMode}
                className="ml-1 text-blue-400 hover:text-blue-300 font-medium focus:outline-none rounded-md px-2 py-1 -ml-2 relative group"
                disabled={isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
                <motion.span 
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                />
              </motion.button>
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <motion.div 
        className="mt-8 text-center"
        variants={itemVariants}
      >
        <div className="relative flex items-center justify-center mb-4">
          <div className="h-px bg-white/10 w-full"></div>
          <span className="px-4 text-sm text-gray-400 bg-[#0D1117] relative">
            Or continue with
          </span>
        </div>
        
        <motion.div 
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            type="button"
            className="flex items-center justify-center px-4 py-2.5 border border-white/10 rounded-lg hover:bg-white/5 transition-colors w-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </motion.button>
          <motion.button
            type="button"
            className="flex items-center justify-center px-4 py-2.5 border border-white/10 rounded-lg hover:bg-white/5 transition-colors w-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 16h-2v-6h2v6zm-1-6.891c-.607 0-1.1-.496-1.1-1.108 0-.612.492-1.108 1.1-1.108s1.1.496 1.1 1.108c0 .612-.494 1.108-1.1 1.108zm8 6.891h-1.706v-3.556c0-.976-.325-1.494-1.01-1.494-.551 0-.882.367-1.022.73-.059.137-.089.319-.089.5v3.82h-1.706v-6h1.634v.818c.255-.408.883-.997 1.867-.997 1.02 0 2.032.392 2.032 2.44v3.739z" />
            </svg>
            LinkedIn
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default AuthContainer;
