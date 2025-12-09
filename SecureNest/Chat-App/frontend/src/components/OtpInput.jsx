import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const OtpInput = ({
  length = 6,
  onComplete,
  disabled = false,
  showCountdown = true,
  stepSeconds = 30,
  onResend,
  resendCooldownSeconds = 60,
  resendLabel = 'Resend OTP',
  // If true, aligns countdown to epoch (for TOTP). If false (default), start at stepSeconds from mount/resend.
  alignToEpoch = false,
  // Optional external trigger to reset the timer (e.g., when parent confirms a resend succeeded)
  resetTrigger,
  onExpire,
}) => {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (alignToEpoch) {
      const epoch = Math.floor(Date.now() / 1000);
      return stepSeconds - (epoch % stepSeconds);
    }
    return stepSeconds; // start at full duration by default
  });
  const [expiresAt, setExpiresAt] = useState(() => (alignToEpoch ? null : Date.now() + stepSeconds * 1000));
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  // Focus the first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown logic
  useEffect(() => {
    if (!showCountdown) return;
    let interval;
    if (alignToEpoch) {
      interval = setInterval(() => {
        const epoch = Math.floor(Date.now() / 1000);
        const remaining = stepSeconds - (epoch % stepSeconds);
        setSecondsLeft(remaining);
      }, 1000);
    } else {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          const next = Math.max(0, (typeof prev === 'number' ? prev - 1 : stepSeconds - 1));
          if (next === 0) {
            clearInterval(interval);
            if (typeof onExpire === 'function') onExpire();
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showCountdown, stepSeconds, alignToEpoch, expiresAt, onExpire]);

  // Reset timer when parent triggers or when resend happens successfully
  useEffect(() => {
    if (!alignToEpoch && resetTrigger !== undefined) {
      setExpiresAt(Date.now() + stepSeconds * 1000);
      setSecondsLeft(stepSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Handle input change
  const handleChange = (e, index) => {
    const value = e.target.value;
    
    // Only allow digits
    if (value && !/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    
    // If we're pasting multiple digits, handle that in the paste handler
    if (value && value.length > 1) {
      handlePaste({ preventDefault: () => {}, clipboardData: { getData: () => value } });
      return;
    }
    
    // Update the current input
    newOtp[index] = value.slice(-1); // Only take the last character
    setOtp(newOtp);

    // Move to next input if a digit was entered and we're not at the end
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // If we're at the last input and it's filled, trigger onComplete
    if (index === length - 1 && value) {
      const isComplete = newOtp.every(digit => digit !== '');
      if (isComplete && typeof onComplete === 'function') {
        onComplete(newOtp.join(''));
      }
    }
  };

  // Handle key down
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      
      // If there's a value in the current input, clear it
      if (newOtp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
      } 
      // If current is empty and not the first input, move to previous input
      else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text/plain').trim();
    if (paste.length === length && /^\d+$/.test(paste)) {
      const newOtp = paste.split('').slice(0, length);
      setOtp(newOtp);
      
      // Focus the last input
      const lastIndex = Math.min(newOtp.length - 1, length - 1);
      inputRefs.current[lastIndex]?.focus();
      
      // Trigger onComplete if we have a full OTP
      if (newOtp.length === length && typeof onComplete === 'function') {
        onComplete(newOtp.join(''));
      }
    }
  };

  const handleResend = async () => {
    // Allow resend only when current OTP expired (secondsLeft === 0) in non-epoch mode
    if (!onResend) return;
    if (!alignToEpoch && secondsLeft > 0) return;
    try {
      await onResend();
      if (!alignToEpoch) {
        // restart countdown only after a successful resend
        setExpiresAt(Date.now() + stepSeconds * 1000);
        setSecondsLeft(stepSeconds);
      } else {
        // For TOTP alignment, optional cooldown UI
        setCooldown(resendCooldownSeconds);
      }
    } catch (e) {
      // swallow; parent can toast
    }
  };

  return (
    <div className="my-6">
      <div className="flex justify-center space-x-2 sm:space-x-3 md:space-x-4">
        {otp.map((digit, index) => (
          <motion.input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-2xl font-bold text-center bg-gray-800 border-2 ${disabled ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-700'} rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 outline-none transition-all duration-200`}
            autoComplete="one-time-code"
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
          />
        ))}
      </div>

      {(showCountdown || onResend) && (
        <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-300">
          {showCountdown && (
            secondsLeft > 0 ? (
              <span className="opacity-80">{alignToEpoch ? 'Code refreshes in' : 'Code expires in'} {secondsLeft}s</span>
            ) : (
              <span className="opacity-90 text-rose-300">Code expired. Request new OTP.</span>
            )
          )}
          {onResend && (
            <button
              type="button"
              onClick={handleResend}
              disabled={alignToEpoch ? cooldown > 0 : secondsLeft > 0}
              className={`px-3 py-1 rounded-md border ${(alignToEpoch ? cooldown > 0 : secondsLeft > 0) ? 'border-gray-700 text-gray-500 cursor-not-allowed' : 'border-blue-500 text-blue-400 hover:bg-blue-500/10'}`}
            >
              {resendLabel}{alignToEpoch && cooldown > 0 ? ` (${cooldown}s)` : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

OtpInput.propTypes = {
  length: PropTypes.number,
  onComplete: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  showCountdown: PropTypes.bool,
  stepSeconds: PropTypes.number,
  onResend: PropTypes.func,
  resendCooldownSeconds: PropTypes.number,
  resendLabel: PropTypes.string
};

export default OtpInput;
