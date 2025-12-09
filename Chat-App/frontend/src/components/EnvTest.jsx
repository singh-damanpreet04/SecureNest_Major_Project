import { useEffect } from 'react';

const EnvTest = () => {
  useEffect(() => {
    console.log('Environment Variables:', {
      VITE_GROQ_API_KEY: import.meta.env.VITE_GROQ_API_KEY ? '***' + import.meta.env.VITE_GROQ_API_KEY.slice(-4) : 'Not found',
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'Not found',
    });
  }, []);

  return null; // This component doesn't render anything
};

export default EnvTest;
