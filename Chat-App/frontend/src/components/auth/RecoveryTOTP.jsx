import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ArrowLeft, Loader2, RotateCw, Eye, EyeOff } from 'lucide-react';
import OtpInput from '../OtpInput';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';

export const RequestTOTP = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('request'); // 'request' or 'verify'
  const [emailSent, setEmailSent] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const startCooldown = () => {
    setResendCooldown(120); // 120 seconds cooldown
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Do not start cooldown on mount; only start after a successful send

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown} seconds before requesting a new OTP`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/recovery/request`, { 
        email: email.toLowerCase() 
      });
      
      if (response.data.success) {
        setEmailSent(email);
        setStep('verify');
        startCooldown();
        toast.success('A verification code has been sent to your email');
      } else if (response.data.cooldown) {
        setResendCooldown(response.data.cooldown);
        toast.error(response.data.message);
      } else {
        toast.error(response.data.message || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error requesting password reset:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send verification code';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verify') {
    return <VerifyTOTP email={emailSent} onSuccess={onSuccess} onBack={() => setStep('request')} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Reset Your Password</h2>
      <p className="text-gray-400 text-center">
        Enter your email address and we'll send you a verification code to reset your password.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || resendCooldown > 0}
          className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
            isLoading || resendCooldown > 0
              ? 'bg-blue-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              Sending...
            </>
          ) : resendCooldown > 0 ? (
            `Resend in ${resendCooldown}s`
          ) : (
            'Send Verification Code'
          )}
        </button>
        
        <button
          type="button"
          onClick={onBack}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center justify-center mx-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
        </button>
      </form>
    </div>
  );
}

const VerifyTOTP = ({ email, onSuccess, onBack }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [otp, setOtp] = useState('');
  const [isOtpComplete, setIsOtpComplete] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(120);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const startCooldown = () => {
    setResendCooldown(120); // 120 seconds cooldown
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Start cooldown when component mounts
  useEffect(() => {
    startCooldown();
  }, []);
  
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/recovery/request`, { 
        email: email.toLowerCase() 
      });
      
      if (response.data.success) {
        toast.success('A new verification code has been sent to your email');
        startCooldown();
      } else if (response.data.cooldown) {
        setResendCooldown(response.data.cooldown);
        toast.error(response.data.message);
      }
    } catch (error) {
      if (error.response?.data?.cooldown) {
        setResendCooldown(error.response.data.cooldown);
      }
      toast.error(error.response?.data?.message || 'Failed to resend verification code');
    }
  };

  const handleOtpComplete = (value) => {
    setOtp(value);
    setIsOtpComplete(value.length === 6);
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}[\]:;<>,.?~\\-]).{12,}$/;
    return passwordRegex.test(password);
  };

  const handleResetPassword = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!validatePassword(newPassword)) {
      toast.error('Password must be at least 12 characters long and include uppercase, lowercase, number, and special character');
      return;
    }

    setIsResetting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/recovery/reset`, {
        email: email.toLowerCase(),
        otp,
        newPassword,
        confirmPassword
      });
      
      if (response.data.success) {
        toast.success('Your password has been reset successfully');
        onSuccess();
      } else {
        throw new Error(response.data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        // Handle invalid OTP
        if (error.response.data.message?.toLowerCase().includes('invalid') || 
            error.response.data.message?.toLowerCase().includes('otp') ||
            error.response.data.message?.toLowerCase().includes('code')) {
          toast.error('The verification code is invalid or has expired. Please request a new one.');
        } else {
          // Handle other 400 errors (like password validation)
          toast.error(error.response.data.message || 'Invalid request. Please check your input.');
        }
      } else if (error.response?.status === 429) {
        // Handle rate limiting
        toast.error('Too many attempts. Please try again later.');
      } else {
        // Handle other errors
        toast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
      }
      
      // Clear the OTP field on error
      setOtp('');
      setIsOtpComplete(false);
    } finally {
      setIsResetting(false);
    }
  };

  const isFormValid = isOtpComplete && 
                     newPassword && 
                     confirmPassword && 
                     newPassword === confirmPassword && 
                     validatePassword(newPassword);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Reset Your Password</h2>
      <p className="text-gray-400 text-center">
        We've sent a 6-digit verification code to <span className="font-semibold text-white">{email}</span>.
        The code is valid for 2 minutes.
      </p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
          <OtpInput
            length={6}
            onComplete={handleOtpComplete}
            showCountdown={true}
            stepSeconds={120}
          />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                disabled={isResetting}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(v => !v)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-200"
                tabIndex={-1}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Must be at least 12 characters with uppercase, lowercase, number, and special character
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                disabled={isResetting}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-200"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={!isFormValid || isResetting}
          className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
            isFormValid && !isResetting
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-600 cursor-not-allowed'
          } flex items-center justify-center`}
        >
          {isResetting ? (
            <>
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              Resetting...
            </>
          ) : (
            'Reset Password'
          )}
        </button>
        
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center"
            disabled={isResetting}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Email
          </button>
          
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isResetting || resendCooldown > 0}
            className={`text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors ${resendCooldown > 0 ? 'opacity-50' : ''}`}
          >
            {resendCooldown > 0 ? (
              `Resend in ${resendCooldown} seconds`
            ) : (
              'Resend Code'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestTOTP;
