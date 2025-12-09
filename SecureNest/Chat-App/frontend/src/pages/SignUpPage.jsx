import { Loader2, User, Mail, Lock, Eye, EyeOff, MessageCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import axios from 'axios';
import OtpInput from '../components/OtpInput';
import AuthLayout from '../components/AuthLayout';
import PageTransition from '../components/PageTransition';
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
        duration: 1.5,
        repeat: Infinity,
        delay: delay,
        ease: 'easeInOut',
      }}
    />
  );
};

// API base URL - Update to use port 5003 for backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';

const SignUpPage = () => {
    const navigate = useNavigate();
    const { signup, isLoading } = useAuthStore();
    
    // State for form data and UI
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        username: "",
        email: "",
        password: ""
    });
    const [showOtp, setShowOtp] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otp, setOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Validate password strength


    // Handle sending OTP
    const handleSendOtp = async () => {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email || !emailRegex.test(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        try {
            setIsSendingOtp(true);
            const response = await axios.post(`${API_BASE_URL}/api/auth/signup/otp/send`, {
                email: formData.email.trim().toLowerCase(),
                name: formData.fullName.trim(),
                username: formData.username.trim(),
                password: formData.password
            });
            
            if (response.data.success) {
                toast.success('Verification code sent to your email');
                setShowOtp(true);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to send verification code';
            toast.error(errorMessage);
        } finally {
            setIsSendingOtp(false);
        }
    };

    // Handle form submission (first step - send OTP)
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // If OTP is already shown, don't submit the form
        if (showOtp) return;
        
        // Validate all fields
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        // Handle OTP sending
        await handleSendOtp();
    };

    // Handle OTP verification and complete signup

    // Validate form fields
    const validateForm = () => {
        const errors = {};
        const { fullName, username, email, password } = formData;
        
        if (!fullName.trim()) errors.fullName = 'Full name is required';
        if (!username.trim()) errors.username = 'Username is required';
        if (!email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Please enter a valid email address';
        }
        
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            errors.password = passwordErrors[0];
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle OTP verification and complete signup
    const handleVerifyOtp = async (enteredOtp) => {
        if (!enteredOtp || enteredOtp.length !== 6) {
            toast.error('Please enter a valid 6-digit code');
            return false;
        }

        try {
            setIsVerifyingOtp(true);
            const response = await axios.post(`${API_BASE_URL}/api/auth/signup/otp/verify`, {
                email: formData.email.trim().toLowerCase(),
                otp: enteredOtp
            });

            if (response.data.success) {
                toast.success('Account created successfully! You are now logged in.');
                // Store user data in localStorage or context
                if (response.data.user) {
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                }
                try { celebrate(1200); } catch {}
                setShowCelebration(true);
                setTimeout(() => navigate('/'), 800);
                return true;
            }
            return false;
        } catch (error) {
            console.error('OTP verification error:', error);
            const errorMessage = error.response?.data?.message || 
                               (error.code === 'ERR_NETWORK' 
                                ? 'Unable to connect to the server. Please check your connection.' 
                                : 'Failed to verify OTP');
            toast.error(errorMessage);
            return false;
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // Password validation rules
    const validatePassword = (password) => {
        const errors = [];
        
        if (password.length < 12) {
            errors.push("Password must be at least 12 characters long");
        }
        if (!/(?=.*[a-z])/.test(password)) {
            errors.push("Password must contain at least one lowercase letter");
        }
        if (!/(?=.*[A-Z])/.test(password)) {
            errors.push("Password must contain at least one uppercase letter");
        }
        if (!/(?=.*\d)/.test(password)) {
            errors.push("Password must contain at least one number");
        }
        if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?])/.test(password)) {
            errors.push("Password must contain at least one special character");
        }
        
        return errors;
    };

    // Render OTP input component
    const renderOtpInput = () => {
        if (!showOtp) return null;
        
        return (
            <div className="space-y-6 mt-4 p-4 bg-gray-800 rounded-lg">
                <div className="text-center">
                    <h3 className="text-lg font-medium">Verify Your Email</h3>
                    <p className="text-gray-400 text-sm mt-1">
                        We've sent a 6-digit code to{' '}
                        <span className="text-blue-400">{formData.email}</span>
                    </p>
                </div>

                <OtpInput 
                    length={6}
                    stepSeconds={30}
                    onComplete={async (code) => {
                        const verified = await handleVerifyOtp(code);
                        if (verified) {
                            setOtp(code);
                        }
                    }}
                    disabled={isVerifyingOtp}
                    onResend={async () => { await handleSendOtp(); }}
                    resendCooldownSeconds={60}
                />
            </div>
        );
    };

    return (
    <PageTransition>
      <AuthLayout>
      {showCelebration && (
        <CelebrationBurst onDone={() => setShowCelebration(false)} />
      )}
      <AnimatePresence mode="wait">
        {!showOtp ? (
          <motion.div
            key="signup-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full"
          >
            <StepTracker current={1} total={2} labels={["Details","Verify"]} />
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400 mb-8">Join the most secure chat platform.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className={`w-full bg-gray-800/50 border ${formErrors.fullName ? 'border-red-500' : 'border-gray-700'} rounded-lg py-2.5 pl-10 pr-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors`}
                    required
                  />
                </div>
                {formErrors.fullName && <p className="text-red-400 text-xs mt-1">{formErrors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="johndoe"
                    className={`w-full bg-gray-800/50 border ${formErrors.username ? 'border-red-500' : 'border-gray-700'} rounded-lg py-2.5 pl-10 pr-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors`}
                    required
                  />
                </div>
                {formErrors.username && <p className="text-red-400 text-xs mt-1">{formErrors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    className={`w-full bg-gray-800/50 border ${formErrors.email ? 'border-red-500' : 'border-gray-700'} rounded-lg py-2.5 pl-10 pr-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors`}
                    required
                  />
                </div>
                {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className={`w-full bg-gray-800/50 border ${formErrors.password ? 'border-red-500' : 'border-gray-700'} rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors`}
                    required
                  />
                  <button type="button" className="absolute inset-y-0 right-0 mr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={isSendingOtp}
                className="w-full mt-2 py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-105 active:scale-100"
              >
                {isSendingOtp ? (
                  <><Loader2 className="animate-spin h-5 w-5" /><span>Sending Code...</span></>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="relative inline-block font-medium text-blue-400 hover:text-blue-300 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-[2px] after:w-full after:scale-x-0 after:bg-gradient-to-r after:from-blue-400 after:to-purple-400 after:rounded-full after:transition-transform after:duration-300 hover:after:scale-x-100">Sign In</Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="otp-verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-6"
          >
            <StepTracker current={2} total={2} labels={["Details","Verify"]} />
            <div className="text-center">
              <h2 className="text-2xl font-bold">Verify Your Email</h2>
              <p className="text-gray-400 mt-1">
                We've sent a 6-digit code to{' '}
                <span className="font-semibold text-blue-400">{formData.email}</span>
              </p>
            </div>

            <OtpInput 
              length={6}
              stepSeconds={30}
              onComplete={handleVerifyOtp}
              disabled={isVerifyingOtp}
              onResend={handleSendOtp}
              resendCooldownSeconds={60}
            />

            <button
              type="button"
              onClick={() => setShowOtp(false)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center justify-center mx-auto"
              disabled={isVerifyingOtp}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Sign Up
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
    </PageTransition>
  );
};

export default SignUpPage;
