import { useState } from 'react';
import { axiosInstance } from '../lib/axios';
import { toast } from 'react-toastify';

const PinRecovery = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Enter password, 2: Enter OTP, 3: Set new PIN
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Start PIN recovery - Step 1: Verify password and request OTP
  const handleStartRecovery = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      // Use the correct endpoint with /auth prefix
      const res = await axiosInstance.post('/auth/recovery/pin/start', { password });
      
      if (res.data.success) {
        setEmail(res.data.email || 'your email');
        setStep(2);
        toast.success(`OTP sent to ${res.data.email}`);
      }
    } catch (error) {
      console.error('Error starting PIN recovery:', error);
      toast.error(error.response?.data?.message || 'Failed to start PIN recovery');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP - Step 2
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Use the correct endpoint with /auth prefix
      const res = await axiosInstance.post('/auth/recovery/pin/verify-otp', { otp });
      
      if (res.data.success) {
        setStep(3);
        toast.success('OTP verified successfully');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error(error.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  // Complete PIN recovery - Step 3
  const handleCompleteRecovery = async (e) => {
    e.preventDefault();
    
    if (!newPin || !confirmPin) {
      toast.error('Please enter and confirm your new PIN');
      return;
    }
    
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }
    
    if (!/^\d{4,8}$/.test(newPin)) {
      toast.error('PIN must be 4-8 digits');
      return;
    }

    setLoading(true);
    try {
      // Use the correct endpoint with /auth prefix
      const res = await axiosInstance.post('/auth/recovery/pin/complete', { 
        newPin, 
        confirmPin 
      });
      
      if (res.data.success) {
        toast.success('PIN updated successfully');
        onSuccess?.();
        onClose?.();
      }
    } catch (error) {
      console.error('Error completing PIN recovery:', error);
      toast.error(error.response?.data?.message || 'Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  // Reset all states
  const resetForm = () => {
    setStep(1);
    setPassword('');
    setOtp('');
    setNewPin('');
    setConfirmPin('');
    setLoading(false);
  };

  // Handle back button
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      resetForm();
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-[#0d1424] border border-white/10 p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {step === 1 ? 'Verify Your Identity' : 
             step === 2 ? 'Enter Verification Code' : 
             'Set New PIN'}
          </h2>
          <button 
            onClick={handleBack}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <form onSubmit={handleStartRecovery} className="space-y-4">
              <p className="text-gray-400">
                Enter your account password to start the PIN recovery process.
              </p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg bg-[#0b1220] border border-white/10 px-4 py-3 pr-12 text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={loading || !password}
                >
                  {loading ? 'Sending OTP...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-gray-400">
                We've sent a 6-digit verification code to <span className="font-medium text-white">{email}</span>.
                Please enter it below to continue.
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                className="w-full rounded-lg bg-[#0b1220] border border-white/10 px-4 py-3 text-white text-center text-2xl tracking-widest"
                autoFocus
                required
              />
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-indigo-400 hover:text-indigo-300 text-sm"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleCompleteRecovery} className="space-y-4">
              <p className="text-gray-400">
                Please enter and confirm your new 4-8 digit PIN.
              </p>
              <div className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="New PIN (4-8 digits)"
                  className="w-full rounded-lg bg-[#0b1220] border border-white/10 px-4 py-3 text-white text-center text-xl tracking-widest"
                  autoFocus
                  required
                />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Confirm New PIN"
                  className="w-full rounded-lg bg-[#0b1220] border border-white/10 px-4 py-3 text-white text-center text-xl tracking-widest"
                  required
                />
              </div>
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-indigo-400 hover:text-indigo-300 text-sm"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={
                    loading || 
                    !newPin || 
                    !confirmPin || 
                    newPin.length < 4 || 
                    newPin !== confirmPin
                  }
                >
                  {loading ? 'Updating...' : 'Update PIN'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PinRecovery;
