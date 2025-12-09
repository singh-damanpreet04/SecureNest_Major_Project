import User from "../models/user.models.js";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "../services/email.service.js";
import { generateSecret, generateTOTP, verifyTOTP } from "../utils/totp.utils.js";

function generateBackupCodes(count = 10) {
	const codes = [];
	for (let i = 0; i < count; i++) {
		let code = "";
		while (code.length < 10) {
			code += Math.floor(Math.random() * 10).toString();
		}
		codes.push(code);
	}
	return codes;
}

function hashCode(code) {
	return bcrypt.hashSync(code, 10);
}

export const requestBackupCodes = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: 'User not found' });
		const unused = (user.backupCodes || []).filter(c => !c.used);
		if (unused.length > 0) {
			return res.status(400).json({ message: 'You still have unused backup codes' });
		}
		const plainCodes = generateBackupCodes(10);
		user.backupCodes = plainCodes.map(c => ({ codeHash: hashCode(c), used: false }));
		await user.save();
		return res.status(200).json({ success: true, codes: plainCodes });
	} catch (e) {
		return res.status(500).json({ message: 'Failed to generate backup codes' });
	}
};

// ----- PIN MANAGEMENT -----

// GET: Check if user has a PIN
export const getPinStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('pinHash');
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json({ hasPin: !!user.pinHash });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to get PIN status' });
    }
};

// POST: Set initial PIN
export const setPin = async (req, res) => {
    try {
        const { pin } = req.body || {};
        if (!/^\d{4,8}$/.test(String(pin || '').trim())) {
            return res.status(400).json({ message: 'PIN must be 4-8 digits' });
        }
        const user = await User.findById(req.user._id).select('pinHash');
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.pinHash) return res.status(400).json({ message: 'PIN already set' });
        const salt = await bcrypt.genSalt(12);
        user.pinHash = await bcrypt.hash(pin.trim(), salt);
        await user.save();
        return res.status(200).json({ success: true, message: 'PIN set successfully' });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to set PIN' });
    }
};

// POST: Change existing PIN
export const changePin = async (req, res) => {
    try {
        const { oldPin, newPin } = req.body || {};
        
        // Input validation
        if (!oldPin || !newPin) {
            return res.status(400).json({ 
                success: false,
                message: 'Both current and new PIN are required' 
            });
        }
        
        // Validate PIN format
        if (!/^\d{4,8}$/.test(String(newPin).trim())) {
            return res.status(400).json({ 
                success: false,
                message: 'New PIN must be 4-8 digits' 
            });
        }
        
        // Prevent setting the same PIN
        if (oldPin === newPin) {
            return res.status(400).json({
                success: false,
                message: 'New PIN must be different from current PIN'
            });
        }
        
        // Find user and verify current PIN
        const user = await User.findById(req.user._id).select('+pinHash');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if user has a PIN set
        if (!user.pinHash) {
            return res.status(400).json({
                success: false,
                message: 'No PIN set. Please set a PIN first.'
            });
        }
        
        // Verify current PIN
        const isMatch = await bcrypt.compare(String(oldPin).trim(), user.pinHash);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Incorrect current PIN' 
            });
        }
        
        // Hash and save new PIN
        const salt = await bcrypt.genSalt(12);
        user.pinHash = await bcrypt.hash(String(newPin).trim(), salt);
        user.pinRecovery = undefined; // Clear any existing recovery attempts
        await user.save();
        
        return res.status(200).json({ 
            success: true, 
            message: 'PIN changed successfully' 
        });
        
    } catch (error) {
        console.error('Error changing PIN:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Failed to change PIN',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// PIN Recovery Flow

// Step 1: Start PIN recovery - Verify password and send OTP
export const startPinRecovery = async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ 
                success: false,
                message: 'Password is required' 
            });
        }
        
        console.log('Starting PIN recovery for user:', req.user._id);
        
        // Get user with password field
        const user = await User.findById(req.user._id).select('+password email');
        if (!user) {
            console.error('User not found:', req.user._id);
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        console.log('User found, checking authentication method...');
        
        // If user doesn't have a password, allow PIN recovery directly
        if (!user.password) {
            console.log('No password found, allowing PIN recovery directly');
            
            // Generate and save OTP
            const tempSecret = generateSecret();
            const pinRecoveryData = {
                totpSecret: tempSecret,
                requestedAt: new Date(),
                verified: false,
                email: user.email // Store email for verification
            };
            
            console.log('Saving PIN recovery data (no password):', {
                userId: user._id,
                hasTempSecret: !!tempSecret,
                requestedAt: pinRecoveryData.requestedAt.toISOString(),
                email: user.email
            });
            
            try {
                // First, clear any existing pinRecovery data
                await User.updateOne(
                    { _id: user._id },
                    { $unset: { pinRecovery: 1 } }
                );
                
                // Then set the new pinRecovery data
                const updatedUser = await User.findOneAndUpdate(
                    { _id: user._id },
                    { 
                        $set: { 
                            'pinRecovery': pinRecoveryData,
                            'lastOtpSentAt': new Date()
                        } 
                    },
                    { 
                        new: true, 
                        runValidators: true,
                        returnDocument: 'after'
                    }
                ).select('pinRecovery email');
                
                console.log('Update result (no password):', {
                    userId: updatedUser?._id,
                    hasPinRecovery: !!updatedUser?.pinRecovery,
                    hasTotpSecret: !!updatedUser?.pinRecovery?.totpSecret,
                    email: updatedUser?.email,
                    pinRecovery: updatedUser?.pinRecovery || 'none'
                });
                
                if (!updatedUser?.pinRecovery?.totpSecret) {
                    console.error('Failed to save PIN recovery data (no password)');
                    // Try to get the current state of the user document
                    const currentUser = await User.findById(user._id).select('pinRecovery');
                    console.error('Current user state:', {
                        hasPinRecovery: !!currentUser?.pinRecovery,
                        pinRecovery: currentUser?.pinRecovery || 'none',
                        rawUser: JSON.stringify(currentUser, null, 2)
                    });
                    throw new Error('Failed to save PIN recovery data');
                }
                
                // Send OTP via email
                const otp = generateTOTP(tempSecret);
                console.log('Generated OTP for user (no password):', user.email, 'OTP:', otp);
                
                try {
                    await sendOtpEmail(user.email, otp);
                    console.log('OTP email sent to (no password):', user.email);
                    
                    return res.status(200).json({
                        success: true,
                        message: 'OTP sent to your registered email',
                        email: user.email.replace(/(.{2}).*@/, '$1****@')
                    });
                } catch (emailError) {
                    console.error('Failed to send OTP email (no password):', emailError);
                    throw new Error('Failed to send OTP email');
                }
            } catch (updateError) {
                console.error('Error updating user with PIN recovery data (no password):', updateError);
                throw new Error('Failed to update user data');
            }
        }
        
        // If user has a password, verify it
        console.log('Verifying password...');
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            console.log('Password mismatch for user:', user._id);
            return res.status(401).json({ 
                success: false,
                message: 'Incorrect password' 
            });
        }
        
        // Check rate limiting
        const now = new Date();
        if (user.lastOtpSentAt && now - new Date(user.lastOtpSentAt) < 120000) {
            const timeLeft = Math.ceil((120000 - (now - new Date(user.lastOtpSentAt))) / 1000);
            return res.status(429).json({
                success: false,
                message: `Please wait ${timeLeft} seconds before requesting a new OTP`,
                cooldown: timeLeft
            });
        }
        
        // Generate and save OTP
        const tempSecret = generateSecret();
        const pinRecoveryData = {
            totpSecret: tempSecret,
            requestedAt: now,
            verified: false,
            email: user.email // Store email for verification
        };
        
        console.log('Saving PIN recovery data (with password):', {
            userId: user._id,
            hasTempSecret: !!tempSecret,
            requestedAt: pinRecoveryData.requestedAt.toISOString(),
            email: user.email
        });
        
        try {
            // First, clear any existing pinRecovery data
            await User.updateOne(
                { _id: user._id },
                { $unset: { pinRecovery: 1 } }
            );
            
            // Then set the new pinRecovery data
            const updatedUser = await User.findOneAndUpdate(
                { _id: user._id },
                { 
                    $set: { 
                        'pinRecovery': pinRecoveryData,
                        'lastOtpSentAt': now
                    } 
                },
                { 
                    new: true, 
                    runValidators: true,
                    returnDocument: 'after'
                }
            ).select('pinRecovery email');
            
            console.log('Update result (with password):', {
                userId: updatedUser?._id,
                hasPinRecovery: !!updatedUser?.pinRecovery,
                hasTotpSecret: !!updatedUser?.pinRecovery?.totpSecret,
                email: updatedUser?.email,
                pinRecovery: updatedUser?.pinRecovery || 'none'
            });
            
            if (!updatedUser?.pinRecovery?.totpSecret) {
                console.error('Failed to save PIN recovery data (with password)');
                // Try to get the current state of the user document
                const currentUser = await User.findById(user._id).select('pinRecovery');
                console.error('Current user state:', {
                    hasPinRecovery: !!currentUser?.pinRecovery,
                    pinRecovery: currentUser?.pinRecovery || 'none',
                    rawUser: JSON.stringify(currentUser, null, 2)
                });
                throw new Error('Failed to save PIN recovery data');
            }
            
            // Send OTP via email
            const otp = generateTOTP(tempSecret);
            console.log('Generated OTP for user (with password):', user.email, 'OTP:', otp);
            
            try {
                await sendOtpEmail(user.email, otp);
                console.log('OTP email sent to (with password):', user.email);
                
                return res.status(200).json({
                    success: true,
                    message: 'OTP sent to your registered email',
                    email: user.email.replace(/(.{2}).*@/, '$1****@') // Masked email
                });
            } catch (emailError) {
                console.error('Failed to send OTP email (with password):', emailError);
                throw new Error('Failed to send OTP email');
            }
        } catch (updateError) {
            console.error('Error updating user with PIN recovery data (with password):', updateError);
            throw new Error('Failed to update user data');
        }
        
    } catch (error) {
        console.error('Error in startPinRecovery:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to start PIN recovery',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Step 2: Verify OTP
export const verifyPinRecoveryOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        
        console.log('Received OTP verification request:', { 
            userId: req.user?._id, 
            otp: otp ? '****' + otp.slice(-2) : 'none' 
        });
        
        if (!otp || otp.length !== 6) {
            console.log('Invalid OTP format:', otp);
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 6-digit OTP'
            });
        }
        
        // Get user with pinRecovery data - explicitly include pinRecovery in the query
        const user = await User.findOne({
            _id: req.user._id,
            'pinRecovery.totpSecret': { $exists: true }
        }).select('pinRecovery email');
        
        if (!user) {
            console.error('User not found or no active PIN recovery:', req.user._id);
            
            // Check if user exists but has no pinRecovery data
            const userExists = await User.findById(req.user._id);
            if (userExists) {
                console.log('User exists but has no active PIN recovery data');
                return res.status(400).json({
                    success: false,
                    message: 'No active PIN recovery session found. Please start the recovery process again.'
                });
            }
            
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        console.log('User found for OTP verification:', {
            userId: user._id,
            hasPinRecovery: !!user.pinRecovery,
            pinRecovery: user.pinRecovery ? {
                hasTotpSecret: !!user.pinRecovery.totpSecret,
                verified: user.pinRecovery.verified,
                requestedAt: user.pinRecovery.requestedAt
            } : 'none'
        });
        
        if (!user.pinRecovery?.totpSecret) {
            console.error('No active PIN recovery found for user:', user.email);
            return res.status(400).json({
                success: false,
                message: 'No active PIN recovery request found. Please start the recovery process again.'
            });
        }
        
        // Check if OTP is expired (older than 10 minutes)
        const otpAge = new Date() - new Date(user.pinRecovery.requestedAt);
        const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds
        
        if (otpAge > OTP_EXPIRY) {
            console.error('OTP expired for user:', user.email, 'Age:', otpAge / 1000, 'seconds');
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }
        
        console.log('Verifying OTP with secret:', user.pinRecovery.totpSecret.substring(0, 10) + '...');
        
        try {
            // Verify OTP with a larger window (6 steps = 3 minutes with 30s steps)
            const isValid = verifyTOTP(otp, user.pinRecovery.totpSecret, 6);
            
            if (!isValid) {
                console.error('Invalid OTP provided for user:', user.email);
                // Generate what the current valid OTP would be for debugging
                try {
                    const currentOtp = generateTOTP(user.pinRecovery.totpSecret);
                    console.log('Current valid OTP would be:', currentOtp);
                    console.log('Provided OTP was:', otp);
                } catch (e) {
                    console.error('Error generating current OTP for debug:', e);
                }
                
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired OTP. Please try again.'
                });
            }
        } catch (verifyError) {
            console.error('Error during OTP verification:', verifyError);
            return res.status(400).json({
                success: false,
                message: 'Error verifying OTP. Please try again.',
                error: process.env.NODE_ENV === 'development' ? verifyError.message : undefined
            });
        }
        
        console.log('OTP verified successfully for user:', user.email);
        
        // Mark OTP as verified using findOneAndUpdate to ensure the update is applied
        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id, 'pinRecovery.totpSecret': user.pinRecovery.totpSecret },
            { 
                $set: { 
                    'pinRecovery.verified': true,
                    'pinRecovery.verifiedAt': new Date()
                } 
            },
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            console.error('Failed to update user with verified OTP status');
            throw new Error('Failed to update OTP verification status');
        }
        
        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            token: 'verified' // Simple token to indicate successful verification
        });
        
    } catch (error) {
        console.error('Error in verifyPinRecoveryOtp:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Step 3: Complete PIN recovery with new PIN
export const completePinRecovery = async (req, res) => {
    try {
        const { newPin, confirmPin } = req.body;
        
        console.log('Starting PIN recovery completion for user:', req.user._id);
        
        // Validate PIN
        if (!newPin || !confirmPin) {
            console.log('Missing PIN or confirmation');
            return res.status(400).json({
                success: false,
                message: 'Both PIN fields are required'
            });
        }
        
        if (newPin !== confirmPin) {
            console.log('PINs do not match');
            return res.status(400).json({
                success: false,
                message: 'PINs do not match'
            });
        }
        
        if (!/^\d{4,8}$/.test(newPin)) {
            console.log('Invalid PIN format:', newPin);
            return res.status(400).json({
                success: false,
                message: 'PIN must be 4-8 digits'
            });
        }
        
        // Get user with pinRecovery data
        console.log('Looking for user with verified PIN recovery:', req.user._id);
        const user = await User.findOne({
            _id: req.user._id,
            'pinRecovery.verified': true,
            'pinRecovery.totpSecret': { $exists: true }
        });
        
        if (!user) {
            console.error('No verified PIN recovery found for user:', req.user._id);
            
            // Check if user exists but has no verified recovery
            const userExists = await User.findById(req.user._id).select('pinRecovery');
            if (userExists) {
                console.log('User exists but has no verified PIN recovery:', {
                    hasPinRecovery: !!userExists.pinRecovery,
                    isVerified: userExists.pinRecovery?.verified,
                    hasTotpSecret: !!userExists.pinRecovery?.totpSecret
                });
                
                return res.status(400).json({
                    success: false,
                    message: 'No active PIN recovery session found. Please start the recovery process again.'
                });
            }
            
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if verification is not expired (10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (!user.pinRecovery.verifiedAt || new Date(user.pinRecovery.verifiedAt) < tenMinutesAgo) {
            console.log('Verification expired or missing for user:', user._id, {
                verifiedAt: user.pinRecovery.verifiedAt,
                currentTime: new Date(),
                tenMinutesAgo: tenMinutesAgo
            });
            
            // Clear the expired recovery data
            try {
                await User.updateOne(
                    { _id: user._id },
                    { $unset: { pinRecovery: 1 } }
                );
                console.log('Cleared expired PIN recovery data for user:', user._id);
            } catch (cleanupError) {
                console.error('Failed to clean up expired PIN recovery data:', cleanupError);
            }
            
            return res.status(400).json({
                success: false,
                message: 'Verification expired or invalid. Please start the recovery process again.'
            });
        }
        
        console.log('User found with verified PIN recovery, updating PIN...');
        
        // Hash and save the new PIN
        const salt = await bcrypt.genSalt(12);
        const hashedPin = await bcrypt.hash(newPin, salt);
        
        try {
            // Update user with new PIN and clear recovery data
            const updateResult = await User.updateOne(
                { 
                    _id: user._id,
                    'pinRecovery.verified': true,
                    'pinRecovery.totpSecret': { $exists: true }
                },
                { 
                    $set: { 
                        pinHash: hashedPin,
                        pinUpdatedAt: new Date()
                    },
                    $unset: { pinRecovery: 1 }
                }
            );
            
            console.log('PIN update result:', {
                matchedCount: updateResult.matchedCount,
                modifiedCount: updateResult.modifiedCount,
                acknowledged: updateResult.acknowledged
            });
            
            if (updateResult.matchedCount === 0) {
                console.error('No matching verified PIN recovery found for update');
                return res.status(400).json({
                    success: false,
                    message: 'No active PIN recovery session found. Please start the recovery process again.'
                });
            }
            
            if (updateResult.modifiedCount === 0) {
                console.error('Failed to update PIN - no changes made');
                return res.status(400).json({
                    success: false,
                    message: 'Failed to update PIN. Please try again.'
                });
            }
            
            console.log('Successfully updated PIN for user:', user._id);
            
            return res.status(200).json({
                success: true,
                message: 'PIN updated successfully'
            });
        } catch (updateError) {
            console.error('Error updating PIN:', updateError);
            return res.status(500).json({
                success: false,
                message: 'Failed to update PIN. Please try again.',
                error: process.env.NODE_ENV === 'development' ? updateError.message : undefined
            });
        }
        
    } catch (error) {
        console.error('Error in completePinRecovery:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update PIN',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// POST: Finish PIN recovery (verify OTP, then set new PIN)
export const finishPinRecovery = async (req, res) => {
    try {
        const { password, otp, newPin } = req.body || {};
        if (!password || !otp || !newPin) return res.status(400).json({ message: 'All fields are required' });
        if (!/^\d{4,8}$/.test(String(newPin).trim())) return res.status(400).json({ message: 'New PIN must be 4-8 digits' });
        const user = await User.findById(req.user._id).select('+password passwordReset');
        if (!user) return res.status(404).json({ message: 'User not found' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });
        if (!user.passwordReset?.totpSecret || !user.passwordReset?.requestedAt) {
            return res.status(400).json({ message: 'Recovery not requested or expired' });
        }
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (user.passwordReset.requestedAt < tenMinutesAgo) {
            user.passwordReset = undefined;
            await user.save();
            return res.status(400).json({ message: 'Recovery request expired. Please start again.' });
        }
        const isValid = verifyTOTP(String(otp), user.passwordReset.totpSecret, 4);
        if (!isValid) return res.status(400).json({ message: 'Invalid or expired OTP' });
        const salt = await bcrypt.genSalt(12);
        user.pinHash = await bcrypt.hash(String(newPin).trim(), salt);
        user.passwordReset = undefined;
        await user.save();
        return res.status(200).json({ success: true, message: 'PIN updated successfully' });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to complete PIN recovery' });
    }
};

export const listBackupCodes = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select('backupCodes');
		if (!user) return res.status(404).json({ message: 'User not found' });
		const remaining = (user.backupCodes || []).filter(c => !c.used).length;
		return res.status(200).json({ remaining });
	} catch (e) {
		return res.status(500).json({ message: 'Failed to get backup code status' });
	}
};

// Step 1: start recovery using email + backup code => send OTP to email
export const recoverWithBackupCode = async (req, res) => {
	try {
		const { email, backupCode } = req.body;
		if (!email || !backupCode) return res.status(400).json({ message: 'Email and backup code are required' });
		const user = await User.findOne({ email: email.toLowerCase() });
		if (!user) return res.status(404).json({ message: 'User not found' });
		const codes = user.backupCodes || [];
		const idx = codes.findIndex(c => !c.used && bcrypt.compareSync(backupCode, c.codeHash));
		if (idx === -1) return res.status(400).json({ message: 'Invalid or already used backup code' });
		// Mark as used now to prevent reuse
		codes[idx].used = true;
		codes[idx].usedAt = new Date();
		user.backupCodes = codes;
		// Issue a temporary TOTP secret for password reset, overall validity 10 minutes
        const tempSecret = generateSecret();
        const requestedAt = new Date();
        user.passwordReset = { totpSecret: tempSecret, requestedAt };
        await user.save();
        // Send current TOTP code derived from secret
        const code = generateTOTP(tempSecret);
        await sendOtpEmail(user.email, code);
        return res.status(200).json({ success: true, message: 'OTP sent to email' });
	} catch (e) {
		return res.status(500).json({ message: 'Failed to start recovery' });
	}
};

// Step 2: verify OTP and set new password
// Request TOTP for password reset
export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'No account found with this email address' 
            });
        }

        // Check if OTP was sent recently (prevent spam)
        const now = new Date();
        if (user.lastOtpSentAt) {
            const lastSent = new Date(user.lastOtpSentAt);
            const cooldownMs = 120 * 1000; // 120 seconds (2 minutes) cooldown
            const timeSinceLastOtp = now - lastSent;
            
            if (timeSinceLastOtp < cooldownMs) {
                const timeLeft = Math.ceil((cooldownMs - timeSinceLastOtp) / 1000);
                return res.status(429).json({ 
                    success: false,
                    message: `Please wait ${timeLeft} seconds before requesting a new OTP`,
                    cooldown: timeLeft
                });
            }
        }

        // Check if the user has a verified email
        if (!user.isEmailVerified) {
            return res.status(403).json({ 
                success: false,
                message: 'Please verify your email address before attempting to reset your password' 
            });
        }

        // Generate a temporary TOTP secret for password reset (valid for 10 minutes)
        const tempSecret = generateSecret();
        const requestedAt = new Date();
        user.passwordReset = { totpSecret: tempSecret, requestedAt };
        
        // Generate and send the TOTP
        const code = generateTOTP(tempSecret);
        await sendOtpEmail(user.email, code);
        // Record last sent time for cooldown enforcement
        user.lastOtpSentAt = requestedAt;
        await user.save();
        
        return res.status(200).json({ 
            success: true, 
            message: 'Password reset OTP has been sent to your email' 
        });
    } catch (error) {
        console.error('Error in requestPasswordReset:', error);
        return res.status(500).json({ message: 'Failed to process password reset request' });
    }
};

// Reset password with TOTP verification
export const resetPasswordWithTOTP = async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;

        // Validate input
        if (!email || !otp || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address' });
        }

        // Check if password reset was requested
        if (!user.passwordReset?.totpSecret || !user.passwordReset?.requestedAt) {
            return res.status(400).json({ message: 'Password reset not requested or expired' });
        }

        // Check if the reset request is older than 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (user.passwordReset.requestedAt < tenMinutesAgo) {
            user.passwordReset = undefined;
            await user.save();
            return res.status(400).json({ message: 'Password reset request has expired. Please request a new code.' });
        }

        // For recovery, use a window of 4 steps (2 minutes) to allow for slight time sync issues
        // and give users more time to enter the code
        const secret = user.passwordReset.totpSecret;
        const window = 4; // 2 minutes (4 * 30 seconds)
        
        console.log('Verifying OTP:', {
            email: email,
            otp: otp,
            secret: secret.substring(0, 10) + '...', // Log partial secret for security
            window: window,
            time: new Date().toISOString()
        });
        
        const isValid = verifyTOTP(otp, secret, window);
        
        console.log('OTP Validation Result:', {
            isValid: isValid,
            time: new Date().toISOString()
        });
        
        if (!isValid) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid or expired verification code. Please try again or request a new code.' 
            });
        }

        // Update password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // Clear the password reset data
        user.passwordReset = undefined;
        
        // Save the updated user
        await user.save();

        return res.status(200).json({ 
            success: true, 
            message: 'Password has been reset successfully' 
        });

    } catch (error) {
        console.error('Error in resetPasswordWithTOTP:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Failed to reset password. Please try again.' 
        });
    }
};
