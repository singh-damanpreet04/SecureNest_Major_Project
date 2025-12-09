import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedInput from './ui/AnimatedInput';
import AnimatedButton from './ui/AnimatedButton';

const AuthForm = ({ isLogin = true, onSubmit, isLoading = false, error: formError }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!isLogin && !formData.name) {
      newErrors.name = 'Name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      await onSubmit(formData);
      // If form submission is successful, show success state
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000); // Reset after 2 seconds
    } catch (error) {
      // Handle API errors
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  return (
    <motion.form 
      onSubmit={handleSubmit}
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {!isLogin && (
          <motion.div
            key="name"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatedInput
              id="name"
              name="name"
              type="text"
              label="Full Name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              autoComplete="name"
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatedInput
        id="email"
        name="email"
        type="email"
        label="Email Address"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        autoComplete="email"
      />
      
      <AnimatedInput
        id="password"
        name="password"
        type="password"
        label="Password"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        autoComplete={isLogin ? 'current-password' : 'new-password'}
      />
      
      {isLogin && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="text-sm text-blue-300 hover:text-white transition-colors"
            onClick={() => {}}
          >
            Forgot password?
          </button>
        </div>
      )}
      
      <AnimatePresence>
        {formError && (
          <motion.div
            className="p-3 text-sm text-red-400 bg-red-500/10 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {formError}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="pt-2">
        <AnimatedButton
          type="submit"
          className="w-full"
          isLoading={isLoading}
          isSuccess={isSuccess}
        >
          {isLogin ? 'Sign In' : 'Create Account'}
        </AnimatedButton>
      </div>
      
      <div className="text-center text-sm text-gray-400">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          className="text-blue-300 hover:text-white font-medium transition-colors"
          onClick={() => {}}
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </motion.form>
  );
};

export default AuthForm;
