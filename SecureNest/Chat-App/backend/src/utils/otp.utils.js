/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Check if OTP is expired
 * @param {Date} expiresAt - Expiration date of the OTP
 * @returns {boolean} True if OTP is expired, false otherwise
 */
const isOtpExpired = (expiresAt) => {
    return new Date() > new Date(expiresAt);
};

/**
 * Generate OTP with expiration (default 10 minutes)
 * @param {number} [expiryMinutes=10] - Expiration time in minutes
 * @returns {Object} {code, expiresAt}
 */
const generateOtpWithExpiry = (expiryMinutes = 10) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
    
    return {
        code: generateOtp(),
        expiresAt: expiresAt
    };
};

export { generateOtp, isOtpExpired, generateOtpWithExpiry };
