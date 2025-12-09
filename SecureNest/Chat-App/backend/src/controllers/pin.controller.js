import bcrypt from 'bcryptjs';
import User from '../models/user.models.js';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import crypto from 'crypto';

const rpID = 'localhost';
const rpName = 'SecureNest';

export const setPin = async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || !/^\d{4,8}$/.test(pin)) return res.status(400).json({ message: 'PIN must be 4-8 digits' });
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.pinHash = await bcrypt.hash(pin, 10);
        await user.save();
        return res.status(200).json({ success: true });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to set PIN' });
    }
};

export const hasPin = async (req, res) => {
    const user = await User.findById(req.user._id).select('pinHash');
    return res.status(200).json({ hasPin: !!user?.pinHash });
};

export const webauthnRegisterStart = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const options = generateRegistrationOptions({
        rpID,
        rpName,
        userName: user.email,
        userID: Buffer.from(user._id.toString()),
        attestationType: 'none',
        authenticatorSelection: { userVerification: 'preferred', residentKey: 'preferred' },
        extensions: { credProps: true }
    });
    // Normalize binary fields to base64url for the browser
    if (options.user && options.user.id) {
        options.user.id = Buffer.from(options.user.id).toString('base64url');
    }
    if (options.challenge && typeof options.challenge !== 'string') {
        options.challenge = Buffer.from(options.challenge).toString('base64url');
    }
    if (Array.isArray(options.excludeCredentials)) {
        options.excludeCredentials = options.excludeCredentials.map((c) => ({
            ...c,
            id: Buffer.from(c.id).toString('base64url'),
        }));
    }
    user.webauthnCurrentChallenge = options.challenge;
    await user.save();
    return res.status(200).json(options);
};

export const webauthnRegisterFinish = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge: user.webauthnCurrentChallenge,
            expectedOrigin: `http://localhost:5173`,
            expectedRPID: rpID,
        });
        if (!verification.verified) return res.status(400).json({ message: 'Registration verification failed' });
        const { credentialID, credentialPublicKey, counter, transports } = verification.registrationInfo;
        user.webauthnCredentials.push({
            credentialID: Buffer.from(credentialID).toString('base64url'),
            publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
            counter: counter || 0,
            transports: transports || []
        });
        user.webauthnCurrentChallenge = undefined;
        await user.save();
        return res.status(200).json({ success: true });
    } catch (e) {
        return res.status(400).json({ message: 'Failed to finish registration' });
    }
};

export const webauthnAuthStart = async (req, res) => {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ message: 'Email and PIN are required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.pinHash || !(await bcrypt.compare(pin, user.pinHash))) return res.status(400).json({ message: 'Invalid PIN' });
    const allowCredentials = (user.webauthnCredentials || []).map(c => ({
        id: Buffer.from(c.credentialID, 'base64url'),
        type: 'public-key',
        transports: c.transports
    }));
    const options = generateAuthenticationOptions({
        rpID,
        allowCredentials,
        userVerification: 'preferred'
    });
    user.webauthnCurrentChallenge = options.challenge;
    await user.save();
    return res.status(200).json({ options, userId: user._id });
};

export const webauthnAuthFinish = async (req, res) => {
    try {
        const { userId, response } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const cred = (user.webauthnCredentials || []).find(c => c.credentialID === response.rawId);
        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: user.webauthnCurrentChallenge,
            expectedOrigin: `http://localhost:5173`,
            expectedRPID: rpID,
            authenticator: cred ? {
                credentialID: Buffer.from(cred.credentialID, 'base64url'),
                credentialPublicKey: Buffer.from(cred.publicKey, 'base64url'),
                counter: cred.counter
            } : undefined
        });
        if (!verification.verified) return res.status(400).json({ message: 'Authentication failed' });
        if (cred) cred.counter = verification.authenticationInfo.newCounter;
        user.webauthnCurrentChallenge = undefined;
        // Issue short-lived reset token (10 minutes)
        const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32) ?? Array.from({length:32},()=>Math.floor(Math.random()*256)))).toString('base64url');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.passwordReset = { otpCode: token, otpExpiresAt: expiresAt };
        await user.save();
        return res.status(200).json({ success: true, resetToken: token, userId: user._id });
    } catch (e) {
        return res.status(400).json({ message: 'Failed to finish authentication' });
    }
};

export const changePin = async (req, res) => {
    try {
        const { oldPin, newPin } = req.body;
        if (!oldPin || !newPin) return res.status(400).json({ message: 'Old PIN and new PIN are required' });
        if (!/^\d{4,8}$/.test(newPin)) return res.status(400).json({ message: 'New PIN must be 4-8 digits' });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.pinHash) return res.status(400).json({ message: 'No PIN set for this user' });

        const isMatch = await bcrypt.compare(oldPin, user.pinHash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid old PIN' });

        user.pinHash = await bcrypt.hash(newPin, 10);
        await user.save();

        return res.status(200).json({ success: true, message: 'PIN changed successfully' });
    } catch (e) {
        console.error('Error changing PIN:', e);
        return res.status(500).json({ message: 'Failed to change PIN' });
    }
};

export const requestPinRecoveryOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.pinRecoveryOtp = { otpCode: otp, otpExpiresAt };
        await user.save();

        // Here, integrate with your email service to send the OTP
        // For example: await sendEmail(user.email, 'PIN Recovery OTP', `Your OTP is: ${otp}`);
        console.log(`PIN Recovery OTP for ${user.email}: ${otp}`);

        return res.status(200).json({ success: true, message: 'OTP sent to email' });
    } catch (e) {
        console.error('Error requesting PIN recovery OTP:', e);
        return res.status(500).json({ message: 'Failed to request PIN recovery OTP' });
    }
};

export const resetPasswordWithPinOtp = async (req, res) => {
    try {
        const { email, otp, newPin } = req.body;
        if (!email || !otp || !newPin) return res.status(400).json({ message: 'Email, OTP, and new PIN are required' });
        if (!/^\d{4,8}$/.test(newPin)) return res.status(400).json({ message: 'New PIN must be 4-8 digits' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.pinRecoveryOtp || user.pinRecoveryOtp.otpCode !== otp || user.pinRecoveryOtp.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.pinHash = await bcrypt.hash(newPin, 10);
        user.pinRecoveryOtp = undefined; // Clear OTP after successful reset
        await user.save();

        return res.status(200).json({ success: true, message: 'PIN reset successfully' });
    } catch (e) {
        console.error('Error resetting PIN with OTP:', e);
        return res.status(500).json({ message: 'Failed to reset PIN with OTP' });
    }
};


