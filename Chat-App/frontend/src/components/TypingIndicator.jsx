import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";

const Dot = ({ delay }) => (
  <motion.span
    initial={{ y: 0, opacity: 0.6 }}
    animate={{ y: -6, opacity: 1 }}
    exit={{ y: 0, opacity: 0 }}
    transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.6, delay, ease: "easeInOut" }}
    className="block w-2.5 h-2.5 bg-gray-400/80 dark:bg-gray-300/80 rounded-full"
  />
);

const containerVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
};

function TypingIndicator({ show, label = "typing…" }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-max"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          <div className="flex gap-1.5">
            <Dot delay={0.0} />
            <Dot delay={0.15} />
            <Dot delay={0.3} />
          </div>
          <span className="text-xs select-none">{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(TypingIndicator);
