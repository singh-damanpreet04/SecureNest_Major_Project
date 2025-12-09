import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, User, UserPlus, LogIn, Home } from 'lucide-react';

// Enhanced transition variants for different page directions
const transitionVariants = {
  // Modern 3D Flip effect for forward navigation
  forward: {
    initial: { 
      rotateY: 15,
      scale: 0.96,
      opacity: 0,
      filter: 'blur(4px)'
    },
    animate: { 
      rotateY: 0,
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        opacity: { duration: 0.4 },
        filter: { duration: 0.8 }
      }
    },
    exit: {
      rotateY: -15,
      scale: 0.96,
      opacity: 0,
      filter: 'blur(4px)',
      transition: {
        duration: 0.5,
        ease: [0.7, 0, 0.84, 0],
        opacity: { duration: 0.3 }
      }
    }
  },
  // Backward navigation with perspective shift
  backward: {
    initial: { 
      rotateY: -15,
      scale: 0.96,
      opacity: 0,
      filter: 'blur(4px)'
    },
    animate: { 
      rotateY: 0,
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        opacity: { duration: 0.4 },
        filter: { duration: 0.8 }
      }
    },
    exit: {
      rotateY: 15,
      scale: 0.96,
      opacity: 0,
      filter: 'blur(4px)',
      transition: {
        duration: 0.5,
        ease: [0.7, 0, 0.84, 0],
        opacity: { duration: 0.3 }
      }
    }
  },
  // Smooth zoom and fade for modal-like transitions
  fade: {
    initial: { 
      scale: 0.98, 
      opacity: 0,
      backdropFilter: 'blur(10px)'
    },
    animate: { 
      scale: 1, 
      opacity: 1,
      backdropFilter: 'blur(0px)',
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
        scale: { duration: 0.5 }
      }
    },
    exit: { 
      scale: 1.02, 
      opacity: 0,
      backdropFilter: 'blur(10px)',
      transition: {
        duration: 0.3,
        ease: [0.6, 0, 0.7, 0],
        opacity: { duration: 0.2 }
      }
    }
  }
};

const PageTransition = ({ children }) => {
  const [navigationStack, setNavigationStack] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Track navigation direction
  useEffect(() => {
    setNavigationStack(prev => {
      // If the new location is already in the stack, it's a backward navigation
      const isBackward = prev.some(route => route.pathname === location.pathname);
      
      if (isBackward) {
        // Remove all entries after the target route
        const targetIndex = prev.findIndex(route => route.pathname === location.pathname);
        return prev.slice(0, targetIndex + 1);
      }
      
      // Add new route to stack
      return [...prev, { pathname: location.pathname, key: location.key }];
    });

    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [location]);

  // Determine transition type based on navigation direction
  const getTransitionType = () => {
    if (navigationStack.length < 2) return 'forward';
    
    const currentIndex = navigationStack.findIndex(
      route => route.pathname === location.pathname
    );
    
    if (currentIndex === -1 || currentIndex === navigationStack.length - 1) {
      return 'forward';
    }
    
    return 'backward';
  };
  
  const transitionType = getTransitionType();
  const variants = transitionVariants[transitionType] || transitionVariants.forward;

  // Determine animation based on route
  const getAnimationContent = () => {
    if (location.pathname.includes('login')) {
      return {
        icon: <LogIn className="w-16 h-16 text-blue-500" />,
        text: 'The door to your digital world is opening...',
        subtext: 'Just a moment while we verify your magic key',
        animation: {
          initial: { x: -100, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: 100, opacity: 0 },
        }
      };
    } else if (location.pathname.includes('signup')) {
      return {
        icon: <UserPlus className="w-16 h-16 text-purple-500" />,
        text: 'Crafting your personal universe...',
        subtext: 'Adding finishing touches to your digital identity',
        animation: {
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 1.2, opacity: 0 },
        }
      };
    } else {
      return {
        icon: <Home className="w-16 h-16 text-green-500" />,
        text: 'Preparing something amazing...',
        subtext: 'Good things come to those who wait',
        animation: {
          initial: { y: 20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: -20, opacity: 0 },
        }
      };
    }
  };

  const animationContent = getAnimationContent();

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className="relative z-10 min-h-screen w-full bg-white dark:bg-gray-900"
          style={{
            transformStyle: 'preserve-3d',
            perspective: '1200px',
            transformOrigin: 'center',
            willChange: 'transform, opacity, filter',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          onAnimationStart={() => {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
          }}
          onAnimationComplete={() => {
            document.body.style.overflow = 'auto';
            document.body.style.position = '';
          }}
        >
          {/* Decorative gradient elements */}
          <motion.div 
            className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full filter blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 15,
              ease: 'linear',
              repeat: Infinity,
            }}
          />
          <motion.div 
            className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-tr from-pink-400/20 to-amber-400/20 rounded-full filter blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 20,
              ease: 'linear',
              repeat: Infinity,
            }}
          />
          <div className="relative z-10">
            {children}
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {isAnimating && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <motion.div
              className="flex flex-col items-center gap-6 p-8 max-w-sm text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
            >
              <motion.div
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: [0.8, 1.1, 1],
                  opacity: 1,
                  rotate: [0, 10, -5, 0]
                }}
                transition={{ 
                  duration: 0.8,
                  ease: 'easeInOut',
                  times: [0, 0.5, 1]
                }}
              >
                <div className="relative">
                  {animationContent.icon}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full -z-10"
                    animate={{ 
                      scale: [1, 1.4, 1],
                      opacity: [0.3, 0.1, 0],
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: 'easeOut'
                    }}
                  />
                </div>
              </motion.div>
              <div className="text-center space-y-3">
                <motion.h3 
                  className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  {animationContent.text}
                </motion.h3>
                <motion.p 
                  className="text-gray-600 dark:text-gray-300 text-sm max-w-xs"
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  {animationContent.subtext}
                </motion.p>
              </div>
              <motion.div 
                className="w-full max-w-xs pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                    initial={{ width: '10%' }}
                    animate={{ 
                      width: ['10%', '90%', '10%'],
                      left: ['0%', '10%', '90%']
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageTransition;
