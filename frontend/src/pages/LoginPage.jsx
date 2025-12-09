import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, MessageSquare, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "react-toastify";
import axios from "axios";
import OtpInput from "../components/OtpInput";
import { axiosInstance } from "../lib/axios";
import AuthLayout from '../components/AuthLayout';
import AnimatedInput from '../components/AnimatedInput';
import PageTransition from '../components/PageTransition';
import { RequestTOTP } from "../components/auth/RecoveryTOTP";
import StepTracker from "../components/StepTracker";
import CelebrationBurst from "../components/CelebrationBurst";
import { celebrate } from "../lib/celebrate";

// Animated Wave Component
const AnimatedWave = () => (
  <svg width="140" height="24" viewBox="0 0 140 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <motion.path
      d="M6 12C18 4 30 20 42 12C54 4 66 20 78 12C90 4 102 20 114 12C126 4 138 20 138 12"
      stroke="url(#waveGradient)"
      strokeWidth="5"
      strokeLinecap="round"
      initial={{ pathLength: 0.7 }}
      animate={{ pathLength: [0.7, 1, 0.7] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      filter="url(#glow)"
    />
    <defs>
      <linearGradient id="waveGradient" x1="0" y1="0" x2="140" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7fffd4" />
        <stop offset="0.5" stopColor="#009efd" />
        <stop offset="1" stopColor="#a78bfa" />
      </linearGradient>
      <filter id="glow" x="-10" y="-10" width="160" height="44" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  </svg>
);

// Animated Dot Component
const AnimatedDot = ({ active, delay = 0 }) => {
  return (
    <motion.div
      className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-blue-400' : 'bg-gray-600'}`}
      animate={{
        y: [0, -8, 0],
      }}
      transition={{
        duration: 0.7,
        repeat: Infinity,
        delay: delay,
        ease: 'easeInOut',
      }}
    />
  );
};

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp' | 'recover-select' | 'recover-backup-1' | 'recover-backup-2'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "",
    otp: ""
  });
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const { login, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);
  const [showAccountDeletedMessage, setShowAccountDeletedMessage] = useState(false);

  // Check if user was redirected after account deletion
  useEffect(() => {
    if (searchParams.get('accountDeleted') === 'true') {
      setShowAccountDeletedMessage(true);
      // Remove the parameter from URL
      navigate('/login', { replace: true });
      // Hide message after 10 seconds
      setTimeout(() => {
        setShowAccountDeletedMessage(false);
      }, 10000);
    }
  }, [searchParams, navigate]);

    const handleInputChange = (name) => (e) => {
    setFormData(prev => ({ ...prev, [name]: e.target.value }));
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';

  const handleSendOtp = async () => {
    if (!formData.email || !formData.password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsSendingOtp(true);
    try {
      console.log('Sending OTP request to:', `${API_BASE_URL}/api/auth/login/otp/send`);
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login/otp/send`, 
        {
          email: formData.email,
          password: formData.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      console.log('OTP send response:', response.data);
      
      if (response.data.success) {
        setRequiresOtp(true);
        setStep('otp');
        toast.success(response.data.message || "Verification code sent to your email");
      } else {
        toast.error(response.data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send verification code';
      toast.error(errorMessage);
      
      // If there's an error but we still need to show OTP (e.g., rate limiting)
      if (error.response?.status === 429) {
        setRequiresOtp(true);
        setStep('otp');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (otp) => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      console.log('Verifying OTP for email:', formData.email);
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login/otp/verify`,
        {
          email: formData.email,
          otp: otp,
          password: formData.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: true
        }
      );

      console.log('OTP verification response:', response.data);

      if (response.data.success) {
        // Store the token from the response
        const token = response.data.token || (response.data.user && response.data.user.token);
        if (token) {
          localStorage.setItem('token', token);
          // Set default auth header for subsequent requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        // Update auth state directly with the user data from the response
        const userData = response.data.user || response.data;
        if (userData) {
          // Update the auth store directly
          useAuthStore.setState({
            authUser: userData,
            isCheckingAuth: false
          });
          
          // Celebration then redirect (global to survive route change)
          try { celebrate(1200); } catch {}
          setShowCelebration(true);
          setTimeout(() => navigate('/'), 800);
          return;
        }
      } else {
        toast.error(response.data.message || "Invalid verification code. Please try again.");
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      const errorMessage = error.response?.data?.message || 'Failed to verify code';
      toast.error(errorMessage);
      
      // If token expired or invalid, reset to login form
      if (error.response?.status === 401) {
        setStep('credentials');
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await login(formData);
      if (res?.user) {
        toast.success("Login successful!");
        navigate("/");
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 
                         (err.code === 'ERR_NETWORK' 
                          ? 'Unable to connect to the server. Please check your connection.' 
                          : 'Login failed. Please try again.');
      toast.error(errorMessage);
      // Reset to credentials step on error
      setStep('credentials');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 'credentials') {
      await handleSendOtp();
    }
    // OTP verification is handled by the OtpInput's onComplete
  };

  return (
    <PageTransition>
      <AuthLayout>
      {showCelebration && (
        <CelebrationBurst onDone={() => setShowCelebration(false)} />
      )}
      
      {/* Account Deleted Message */}
      <AnimatePresence>
        {showAccountDeletedMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Account Deleted
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your account has been deleted. Thank you for being part of SecureNest. We'll miss you, but we respect your decision. If you ever wish to rejoin, we'd be happy to have you back anytime.
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => setShowAccountDeletedMessage(false)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {step === 'credentials' ? (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full"
          >
            <StepTracker current={1} total={2} labels={["Login","Verify"]} />
            <h1 className="text-3xl font-bold text-blue-400 mb-12">Login</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              <AnimatedInput
                id="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                disabled={isSendingOtp || isLoggingIn}
              />

              <AnimatedInput
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={isSendingOtp || isLoggingIn}
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </AnimatedInput>

                            <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSendingOtp || isLoggingIn}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-semibold flex items-center justify-center space-x-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-100"
                >
                  {(isSendingOtp || isLoggingIn) ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>{isSendingOtp ? 'Sending Code...' : 'Logging In...'}</span>
                    </>
                  ) : (
                    <span>Login</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center text-sm">
              <button
                type="button"
                className="group relative inline-block font-medium text-gray-400 hover:text-white transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-[2px] after:w-full after:scale-x-0 after:bg-gradient-to-r after:from-blue-400 after:to-purple-400 after:rounded-full after:transition-transform after:duration-300 hover:after:scale-x-100"
                onClick={() => setStep('recover-totp')}
              >
                Forgot password?
              </button>
            </div>
            <div className="mt-4 text-center text-sm text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="relative inline-block font-medium text-blue-400 hover:text-blue-300 transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-[2px] after:w-full after:scale-x-0 after:bg-gradient-to-r after:from-blue-400 after:to-purple-400 after:rounded-full after:transition-transform after:duration-300 hover:after:scale-x-100">
                Sign Up
              </Link>
            </div>
          </motion.div>
        ) : step === 'otp' ? (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-6"
          >
            <StepTracker current={2} total={2} labels={["Login","Verify"]} />
            <div className="text-center">
              <h2 className="text-2xl font-bold">Enter Verification Code</h2>
              <p className="text-gray-400 mt-1">
                We've sent a 6-digit code to{' '}
                <span className="font-semibold text-blue-400">{formData.email}</span>
              </p>
            </div>

            <OtpInput 
              length={6}
              stepSeconds={30}
              onComplete={(code) => {
                setFormData(prev => ({ ...prev, otp: code }));
                handleVerifyOtp(code);
              }} 
              disabled={isVerifyingOtp}
              onResend={async () => { await handleSendOtp(); }}
              resendCooldownSeconds={60}
            />

            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center justify-center mx-auto"
              disabled={isVerifyingOtp}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </button>
          </motion.div>
        ) : step === 'recover-totp' ? (
          <motion.div
            key="recover-totp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full"
          >
            <StepTracker current={1} total={2} labels={["Request","Reset"]} />
            <RequestTOTP 
              onSuccess={() => setStep('credentials')} 
              onBack={() => setStep('credentials')} 
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthLayout>
    </PageTransition>
  );
};

export default LoginPage;

// --- Recovery using Backup Code Components ---
function RecoverBackupStep1({ onCancel, onSuccess }) {
  const [email, setEmail] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !backupCode) return;
    const codeOk = /^\d{10}$/.test(backupCode.trim());
    if (!codeOk) {
      toast.error('Please enter a valid 10-digit backup code');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/recovery/backup/start`, { email: email.trim().toLowerCase(), backupCode: backupCode.trim() });
      toast.success('OTP sent to your email');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start recovery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <StepTracker current={1} total={2} labels={["Verify","Reset"]} />
      <h2 className="text-2xl font-bold text-center">Recover using Backup Code</h2>
      <div>
        <label className="block text-sm font-semibold mb-1">Registered Email</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Backup Code</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" inputMode="numeric" maxLength={10} placeholder="10-digit code" value={backupCode} onChange={e=>setBackupCode(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">{loading ? 'Submitting...' : 'Send OTP'}</button>
      <button type="button" onClick={onCancel} className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center justify-center mx-auto">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </button>
    </form>
  )
}

function RecoverBackupStep2({ onCancel, onSuccess, emailPrefill }) {
  const [email, setEmail] = useState(emailPrefill || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !otp || !newPassword || !confirmPassword) return;
    const otpOk = /^\d{6}$/.test(otp.trim());
    if (!otpOk) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/recovery/backup/reset`, { email: email.trim().toLowerCase(), otp: otp.trim(), newPassword, confirmPassword });
      toast.success('Password reset successful');
      try { celebrate(1200); } catch {}
      setShowCelebrate(true);
      setTimeout(() => onSuccess(), 800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const [showCelebrate, setShowCelebrate] = useState(false);
  return (
    <form onSubmit={submit} className="space-y-4">
      {showCelebrate && <CelebrationBurst onDone={() => setShowCelebrate(false)} />}
      <StepTracker current={2} total={2} labels={["Verify","Reset"]} />
      <h2 className="text-2xl font-bold text-center">Verify OTP & Set New Password</h2>
      <div>
        <label className="block text-sm font-semibold mb-1">Registered Email</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">OTP</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" inputMode="numeric" maxLength={6} placeholder="6-digit OTP" value={otp} onChange={e=>setOtp(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">New Password</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required placeholder="At least 12 chars, with Aa1!" />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Confirm Password</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">{loading ? 'Submitting...' : 'Change Password'}</button>
      <button type="button" onClick={onCancel} className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center justify-center mx-auto">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </button>
    </form>
  )
}

// --- PIN + OTP Recovery Components ---
function RecoverPinStep1({ onCancel, onSuccess }) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !/^\d{4,8}$/.test(pin.trim())) {
      toast.error('Please enter a valid email and 4-8 digit PIN');
      return;
    }
    setLoading(true);
    try {
      // Changed from webauthn/auth/start to recovery/pin/otp/send
      await axios.post(`${API_BASE_URL}/api/auth/recovery/pin/otp/send`, { email: email.trim().toLowerCase(), pin: pin.trim() });
      toast.success('OTP sent to your email for password reset.');
      // Pass email to the next step (RecoverPinStep2)
      onSuccess({ email: email.trim().toLowerCase() });
    } catch (err) {
      console.error('Error sending OTP for PIN recovery:', err);
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <StepTracker current={1} total={2} labels={["Verify","Reset"]} />
      <h2 className="text-2xl font-bold text-center">Recover using PIN & OTP</h2>
      <div>
        <label className="block text-sm font-semibold mb-1">Registered Email</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">PIN</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" inputMode="numeric" maxLength={8} placeholder="4–8 digit PIN" value={pin} onChange={e=>setPin(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">{loading ? 'Verifying PIN…' : 'Verify PIN & Send OTP'}</button>
      <button type="button" onClick={onCancel} className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center justify-center mx-auto"><ArrowLeft className="h-4 w-4 mr-1" /> Back</button>
    </form>
  );
}

function RecoverPinStep2({ ctx, onCancel, onSuccess }) {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';

  const submit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!otp || !/^\d{6}$/.test(otp.trim())) {
        toast.error('Please enter a valid 6-digit OTP');
        return;
    }
    // Password policy: At least 12 characters, including uppercase, lowercase, number, and special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]).{12,}$/;
    if (!passwordRegex.test(newPassword)) {
        toast.error('New password must be at least 12 characters long and include uppercase, lowercase, number, and special character.');
        return;
    }
    setLoading(true);
    try {
      // Changed from recovery/backup/reset to recovery/pin/otp/reset
      await axios.post(`${API_BASE_URL}/api/auth/recovery/pin/otp/reset`, { email: ctx.email, otp: otp.trim(), newPassword, confirmPassword });
      toast.success('Password reset successful');
      try { celebrate(1200); } catch {}
      setShowCelebrate(true);
      setTimeout(() => onSuccess(), 800);
    } catch (err) {
      console.error('Error resetting password with PIN OTP:', err);
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  const [showCelebrate, setShowCelebrate] = useState(false);
  return (
    <form onSubmit={submit} className="space-y-4">
      {showCelebrate && <CelebrationBurst onDone={() => setShowCelebrate(false)} />}
      <StepTracker current={2} total={2} labels={["Verify","Reset"]} />
      <h2 className="text-2xl font-bold text-center">Enter OTP & Set New Password</h2>
      <div>
        <label className="block text-sm font-semibold mb-1">Registered Email</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" type="email" value={ctx.email} readOnly disabled />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">OTP</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" inputMode="numeric" maxLength={6} placeholder="6-digit OTP" value={otp} onChange={e=>setOtp(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">New Password</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required placeholder="At least 12 chars, with Aa1!" />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Confirm Password</label>
        <input className="w-full bg-[#1E1E2D] border border-[#2D2D3A] rounded-lg py-3 px-3 text-white" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">{loading ? 'Submitting…' : 'Change Password'}</button>
      <button type="button" onClick={onCancel} className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center justify-center mx-auto"><ArrowLeft className="h-4 w-4 mr-1" /> Back</button>
    </form>
  );
}
