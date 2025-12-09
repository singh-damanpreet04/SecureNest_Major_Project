import express from "express";
import {
    signup, 
    logout, 
    login, 
    updateProfile, 
    checkAuth, 
    sendSignupOtp, 
    verifySignupOtp,
    sendLoginOtp,
    verifyLoginOtp,
    updateThemePreferences,
    getThemePreferences,
    requestAccountDeletion,
    confirmAccountDeletion
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";
import { 
    requestPasswordReset, 
    resetPasswordWithTOTP,
    startPinRecovery,
    verifyPinRecoveryOtp,
    completePinRecovery,
    changePin,
    setPin,
    getPinStatus
} from "../controllers/recovery.controller.js";

const router = express.Router();

// Signup flow
router.post("/signup/otp/send", sendSignupOtp);
router.post("/signup/otp/verify", verifySignupOtp);
router.post("/signup", signup);

// Login flow
router.post("/login/otp/send", sendLoginOtp);
router.post("/login/otp/verify", verifyLoginOtp);
router.post("/login", login);

// Other auth routes
router.post("/logout", logout);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

// Password Reset with TOTP
router.post('/recovery/request', requestPasswordReset);
router.post('/recovery/reset', resetPasswordWithTOTP);

// PIN Management
router.get('/recovery/pin/status', protectRoute, getPinStatus);
router.post('/recovery/pin/start', protectRoute, startPinRecovery);
router.post('/recovery/pin/verify-otp', protectRoute, verifyPinRecoveryOtp);
router.post('/recovery/pin/complete', protectRoute, completePinRecovery);
router.post('/recovery/pin/change', protectRoute, changePin);
router.post('/recovery/pin/set', protectRoute, setPin);

// Theme Management
router.put('/theme', protectRoute, updateThemePreferences);
router.get('/theme', protectRoute, getThemePreferences);

// Account Deletion
router.post('/request-account-deletion', protectRoute, requestAccountDeletion);
router.post('/confirm-account-deletion', protectRoute, confirmAccountDeletion);

export default router;
