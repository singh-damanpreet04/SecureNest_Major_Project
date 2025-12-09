import { totp, authenticator } from 'otplib';

// Configure TOTP defaults according to RFC 6238
// 30-second step, 6 digits, sha1
_totpInit();
function _totpInit() {
  // Use authenticator since our secrets are base32
  authenticator.options = {
    step: 30,
    digits: 6,
    algorithm: 'sha1',
    window: 1 // allow +/- 1 step during verify if not overridden
  };
}

export const generateSecret = () => authenticator.generateSecret(); // base32 secret

export const generateTOTP = (secret) => {
  // authenticator expects base32 secret
  return authenticator.generate(secret);
};

export const verifyTOTP = (token, secret, window = 6) => {  // Increased default window to 6 steps (3 minutes)
  try {
    if (!token || !secret) {
      console.error('Missing token or secret for TOTP verification');
      return false;
    }

    console.log('TOTP Verification:', {
      token: token,
      secret: secret.substring(0, 10) + '...',
      window: window,
      time: new Date().toISOString()
    });
    
    // First try with the provided window
    const isValid = authenticator.verify({ token, secret, window });
    
    if (isValid) {
      console.log('TOTP verified successfully with window:', window);
      return true;
    }
    
    // If verification fails, try with a smaller window for better error reporting
    console.log('TOTP verification failed with window', window, '- trying with smaller window...');
    
    // Try with window 1 (current step only)
    const currentStepValid = authenticator.verify({ token, secret, window: 1 });
    if (currentStepValid) {
      console.log('TOTP verified with current step only');
      return true;
    }
    
    // Try with window 0 (exact match only)
    const exactMatch = authenticator.verify({ token, secret, window: 0 });
    if (exactMatch) {
      console.log('TOTP verified with exact match');
      return true;
    }
    
    // If we get here, the OTP is invalid
    console.error('TOTP verification failed - no matching token found');
    
    // Debug: Show what the valid token would be right now
    if (process.env.NODE_ENV === 'development') {
      try {
        const currentToken = authenticator.generate(secret);
        console.log('Current valid token would be:', currentToken);
      } catch (e) {
        console.error('Error generating current token for debug:', e);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in verifyTOTP:', error);
    return false;
  }
};

export const timeRemaining = () => {
  const step = authenticator.options.step || 30;
  const epoch = Math.floor(Date.now() / 1000);
  return step - (epoch % step);
};
