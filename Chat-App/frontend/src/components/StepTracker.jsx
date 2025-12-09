import { motion } from 'framer-motion';

const StepTracker = ({ current = 1, total = 2, labels = [] }) => {
  const steps = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="mb-6">
      <div className="relative flex items-center">
        {steps.map((n, i) => (
          <div key={n} className="flex items-center">
            <motion.div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${n <= current ? 'bg-blue-500 text-white' : 'bg-white/10 text-blue-200'}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              {n}
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div
                className={`h-0.5 w-16 mx-2 rounded ${n < current ? 'bg-blue-500' : 'bg-white/10'}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.05 + 0.1 }}
                style={{ transformOrigin: 'left' }}
              />
            )}
          </div>
        ))}
      </div>
      {labels.length > 0 && (
        <div className="mt-2 flex gap-16 text-xs text-blue-200/80">
          {labels.map((l, i) => (
            <span key={i} className={i + 1 === current ? 'text-white' : ''}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default StepTracker;
