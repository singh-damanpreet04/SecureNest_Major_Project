import jwt from "jsonwebtoken";
import User from "../models/user.models.js";
import bcrypt from "bcryptjs";
import { generateToken, setAuthCookie } from "../lib/utils.js";
import { v2 as cloudinary } from "cloudinary";
import cloudinaryConfig from "../lib/cloudinary.js";
import { sendOtpEmail } from "../services/email.service.js";
import { generateSecret, generateTOTP, verifyTOTP } from "../utils/totp.utils.js";
import crypto from 'crypto';

// Initialize Cloudinary with config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dvwndmmur",
    api_key: process.env.CLOUDINARY_API_KEY || "941449398598616",
    api_secret: process.env.CLOUDINARY_API_SECRET || "h9VKzji4y8XnfXMh8bVGPSFvPuI"
});

// No persistent storage of TOTP codes; we only store secrets as needed

/**
 * Send TOTP to user's email generated from secret
 * @param {string} email - User's email
 * @param {boolean} isLogin - Whether this is for login or signup
 * @returns {Promise<Object>} Result of the operation
 */
const sendVerificationOtp = async (email, isLogin = false) => {
    try {
        // Check if OTP was sent recently (prevent spam)
        const now = new Date();
        const user = await User.findOne({ email });
        
        if (user?.lastOtpSentAt) {
            const lastSent = new Date(user.lastOtpSentAt);
            const cooldownMs = 30 * 1000; // 30 seconds cooldown
            const timeSinceLastOtp = now - lastSent;
            
            if (timeSinceLastOtp < cooldownMs) {
                const timeLeft = Math.ceil((cooldownMs - timeSinceLastOtp) / 1000);
                return { 
                    success: false, 
                    message: `Please wait ${timeLeft} seconds before requesting a new OTP`,
                    cooldown: timeLeft
                };
            }
        }

        // Ensure TOTP secret exists for existing user (for login)
        if (isLogin && user && !user.totpSecret) {
            user.totpSecret = generateSecret();
            await user.save();
        }

        const secretToUse = user?.totpSecret || generateSecret();
        const code = generateTOTP(secretToUse);

        // Send code via email
        await sendOtpEmail(email, code);

        // Update last sent time and, if user does not exist yet, upsert with totpSecret
        await User.findOneAndUpdate(
            { email },
            {
                $setOnInsert: { totpSecret: secretToUse },
                $set: { lastOtpSentAt: new Date() }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error('Error sending OTP:', error);
        return { success: false, message: 'Failed to send OTP' };
    }
};

// In-memory store for signup TOTP secret (in production, use Redis or similar)
const signupDataStore = new Map();

// New endpoint to send OTP for signup
export const sendSignupOtp = async (req, res) => {
    const { email, name, username, password } = req.body;
    
    if (!email || !name || !username || !password) {
        return res.status(400).json({ 
            success: false,
            message: "All fields are required" 
        });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ 
        $or: [
            { email: email.toLowerCase() },
            { username: username.toLowerCase() }
        ]
    });

    if (existingUser) {
        return res.status(400).json({ 
            success: false,
            message: existingUser.email === email.toLowerCase() 
                ? "Email already registered" 
                : "Username already taken"
        });
    }

    // Add this validation right after checking for existing user
if (password.length < 12) {
    return res.status(400).json({ 
        success: false,
        message: "Password must be at least 12 characters long" 
    });
}

// Optional: Add more password complexity checks
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{12,}$/;
if (!passwordRegex.test(password)) {
    return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    });
}

    // Store signup data temporarily with a temporary TOTP secret
    const signupData = { email, name, username, password };
    const tempSecret = generateSecret();
    const requestedAt = new Date();
    signupDataStore.set(email.toLowerCase(), {
        ...signupData,
        tempSecret,
        requestedAt
    });

    // Send TOTP via email
    try {
        const code = generateTOTP(tempSecret);
        await sendOtpEmail(email, code);
        res.status(200).json({ 
            success: true, 
            message: 'OTP sent successfully' 
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        signupDataStore.delete(email.toLowerCase()); // Clean up on error
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send OTP' 
        });
    }
};

// New endpoint to verify OTP during signup
export const verifySignupOtp = async (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.status(400).json({ 
            success: false,
            message: "Email and OTP are required" 
        });
    }

    try {
        const normalizedEmail = email.toLowerCase();
        const signupData = signupDataStore.get(normalizedEmail);

        // Check if signup data exists
        if (!signupData) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid or expired OTP. Please request a new one." 
            });
        }

        // Check if request window (overall) has not expired (10 minutes since request)
        const now = new Date();
        const maxWindowMs = 10 * 60 * 1000;
        if (now - new Date(signupData.requestedAt) > maxWindowMs) {
            signupDataStore.delete(normalizedEmail); // Clean up expired data
            return res.status(400).json({ 
                success: false,
                message: "OTP window expired. Please request a new one." 
            });
        }

        // Verify TOTP within allowed time-step window (30 seconds)
        const isValid = verifyTOTP(otp, signupData.tempSecret, 1);
        if (!isValid) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid OTP" 
            });
        }

        // Check if email is already registered
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: "Email already registered" 
            });
        }

        // Check if username is already taken
        const usernameTaken = await User.findOne({ 
            username: signupData.username.toLowerCase() 
        });
        
        if (usernameTaken) {
            return res.status(400).json({ 
                success: false,
                message: "Username already taken" 
            });
        }

        // Create the user with the verified email
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(signupData.password, salt);

        const newUser = new User({
            fullName: signupData.name,
            username: signupData.username.toLowerCase(),
            email: signupData.email.toLowerCase(),
            password: hashedPassword,
            isEmailVerified: true
        });

        const savedUser = await newUser.save();
        
        // Clean up the temporary data
        signupDataStore.delete(normalizedEmail);

        // Generate token and set cookie
        const token = generateToken(savedUser._id);

        // Prepare user data to return (excluding sensitive info)
        const userResponse = {
            _id: savedUser._id,
            fullName: savedUser.fullName,
            username: savedUser.username,
            email: savedUser.email,
            profilePic: savedUser.profilePic,
            isEmailVerified: savedUser.isEmailVerified,
            createdAt: savedUser.createdAt
        };

        res.status(201).json({ 
            success: true,
            message: "Account created successfully",
            user: userResponse
        });
    } catch (error) {
        console.error("Error creating account:", error);
        res.status(500).json({ 
            success: false,
            message: "Error creating account" 
        });
    }
};

export const signup = async (req, res) => {
    const { fullName, username, email, password } = req.body;

    try {
        // Check if user already exists and is verified
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser && existingUser.isEmailVerified) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // Check if username is already taken by a verified user
        const usernameTaken = await User.findOne({ 
            username: username.toLowerCase(),
            isEmailVerified: true
        });
        if (usernameTaken) {
            return res.status(400).json({ message: "Username already taken" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create or update user with unverified status
        const userData = {
            name: fullName,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            isEmailVerified: false
        };

        // Create or update user
        let user;
        if (existingUser) {
            user = await User.findByIdAndUpdate(
                existingUser._id,
                { $set: userData },
                { new: true }
            );
        } else {
            user = await User.create(userData);
        }

        // Send OTP for verification
        const result = await sendVerificationOtp(user.email, false);
        if (!result.success) {
            return res.status(500).json({ message: result.message });
        }

        res.status(200).json({ 
            success: true,
            message: "OTP sent to your email" 
        });

    } catch (error) {
        console.error("Error in signup:", error);
        res.status(500).json({ message: "Error creating user" });
    }
};

// New endpoint to send OTP for login
export const sendLoginOtp = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            success: false,
            message: "Email is required" 
        });
    }

    try {
        // Check if user exists and verify password if provided
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        // Verify password if provided (for login flow)
        if (password) {
            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                return res.status(400).json({ 
                    success: false,
                    message: "Invalid password" 
                });
            }
        }

        console.log(`Sending login OTP to ${email}`);
        const result = await sendVerificationOtp(email, true);
        
        if (result.success) {
            console.log(`OTP sent successfully to ${email}`);
            res.status(200).json({ 
                success: true,
                message: result.message || "OTP sent successfully",
                email: email
            });
        } else {
            console.error(`Failed to send OTP to ${email}:`, result.message);
            res.status(400).json({ 
                success: false,
                message: result.message || "Failed to send OTP" 
            });
        }
    } catch (error) {
        console.error('Error in sendLoginOtp:', error);
        res.status(500).json({ 
            success: false,
            message: "An error occurred while processing your request" 
        });
    }
};

// New endpoint to verify OTP during login
export const verifyLoginOtp = async (req, res) => {
    const { email, otp, password } = req.body;
    
    if (!email || !otp) {
        return res.status(400).json({ 
            success: false,
            message: "Email and OTP are required" 
        });
    }

    try {
        // Find user by email (case insensitive)
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        // Verify password if provided (for login flow)
        if (password) {
            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                return res.status(400).json({ 
                    success: false,
                    message: "Invalid password" 
                });
            }
        }

        // Ensure user has a TOTP secret
        if (!user.totpSecret) {
            user.totpSecret = generateSecret();
            await user.save();
        }

        // Verify TOTP within window +/- 1 step (30 seconds)
        const isValid = verifyTOTP(otp, user.totpSecret, 1);
        if (!isValid) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid or expired OTP" 
            });
        }

        // Generate token
        const token = generateToken(user._id, '1d');
        
        // Set auth cookie
        setAuthCookie(res, token);
        
        // Prepare user data to return (excluding sensitive info)
        const userResponse = {
            _id: user._id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt
        };
        
        res.status(200).json({
            success: true,
            message: "Login successful",
            user: userResponse,
            token: token // Also send token in response for client-side storage if needed
        });
    } catch (error) {
        console.error("Error verifying login OTP:", error);
        res.status(500).json({ 
            success: false,
            message: "An error occurred while verifying OTP" 
        });
    }
};

export const login = async (req, res) => {
    const { email, username, password } = req.body;
    
    if ((!email && !username) || !password) {
        return res.status(400).json({ 
            success: false,
            message: "Email/username and password are required" 
        });
    }

    try {
        // Find user by email or username
        const user = await User.findOne({
            $or: [
                { email: email?.toLowerCase() },
                { username: username?.toLowerCase() },
            ],
        }).select('+password'); // Include password for verification
        
        if (!user) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid credentials" 
            });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(403).json({ 
                success: false,
                message: "Please verify your email first",
                requiresVerification: true,
                email: user.email
            });
        }

        // Verify password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid credentials" 
            });
        }

        // If 2FA is required, send OTP
        // For now, we'll skip 2FA and just log the user in
        // const result = await sendVerificationOtp(user.email, true);
        // if (!result.success) {
        //     return res.status(500).json({ 
        //         success: false,
        //         message: result.message || "Failed to send OTP" 
        //     });
        // }

        // Generate tokens
        const token = generateToken(user._id, '1d');
        const refreshToken = generateToken(user._id, '30d');

        // Set HTTP-only cookies using setAuthCookie
        setAuthCookie(res, token, 24 * 60 * 60 * 1000, 'jwt');
        setAuthCookie(res, refreshToken, 30 * 24 * 60 * 60 * 1000, 'refreshToken');

        // Create a user object without the password for the response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({ 
            success: true,
            message: "Login successful",
            user: userResponse
        });
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Generate new tokens
        const newToken = generateToken(user._id, '1d');
        const newRefreshToken = generateToken(user._id, '30d');

        // Set HTTP-only cookies using setAuthCookie
        setAuthCookie(res, newToken, 24 * 60 * 60 * 1000, 'jwt');
        setAuthCookie(res, newRefreshToken, 30 * 24 * 60 * 60 * 1000, 'refreshToken');

        res.status(200).json({ 
            success: true,
            token: newToken
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        // Clear invalid tokens on error
        res.clearCookie('jwt');
        res.clearCookie('refreshToken');
        res.status(401).json({ message: 'Invalid refresh token' });
    }
};

export const logout = (req, res) => {
    try {
        // Clear both JWT and refresh token
        res.cookie("jwt", "", { maxAge: 0 });
        res.cookie("refreshToken", "", { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0 
        });
        res.status(200).json({ message: "Logged Out Successfully" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { profilePic, removeProfilePic } = req.body;
        const userId = req.user._id;

        let updateData = { updatedAt: new Date() };

        if (removeProfilePic) {
            // Remove profile picture by setting it to null
            updateData.profilePic = null;
        } else if (profilePic) {
            console.log('Starting profile picture upload...');

            // Upload base64 image to Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload(
                    profilePic,
                    {
                        folder: 'profile-pics',
                        resource_type: 'auto',
                        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            return reject(error);
                        }
                        resolve(result);
                    }
                );
            });

            console.log('Cloudinary upload successful:', uploadResult.secure_url);
            updateData.profilePic = uploadResult.secure_url;
        } else {
            return res.status(400).json({ 
                success: false,
                message: "Either profilePic or removeProfilePic flag is required" 
            });
        }

        // Update user with the new data
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -__v');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('User profile updated successfully');

        // Return the updated user data in the expected format
        const userResponse = {
            _id: updatedUser._id,
            fullName: updatedUser.fullName,
            username: updatedUser.username,
            email: updatedUser.email,
            profilePic: updatedUser.profilePic,
            createdAt: updatedUser.createdAt
        };

        res.status(200).json({
            user: userResponse,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error("Error in updateProfile controller:", error);
        res.status(500).json({
            message: "Error updating profile",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
}

export const checkAuth = async (req, res) => {
    try {
        // First, try to get the token from the Authorization header
        let token = req.headers.authorization?.split(' ')[1];
        
        // If no token in header, try to get it from cookies
        if (!token && req.cookies?.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No authentication token provided'
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch the latest user data from the database
        const user = await User.findById(decoded.userId).select('-password -__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // If we got here, the user is authenticated
        // Generate a new token to refresh the session
        const newToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });
        
        // Update the JWT cookie using setAuthCookie
        setAuthCookie(res, newToken, 24 * 60 * 60 * 1000, 'jwt');

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                profilePic: user.profilePic,
                createdAt: user.createdAt
            },
            token: newToken // Send the new token in the response as well
        });
    } catch (error) {
        console.error("Error in checkAuth controller:", error);
        
        // Clear invalid tokens
        res.clearCookie('jwt');
        res.clearCookie('refreshToken');
        
        res.status(401).json({
            message: "Internal Server Error",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

export const updateThemePreferences = async (req, res) => {
    try {
        const userId = req.user._id;
        const { timeBased, globalTheme, morningTheme, afternoonTheme, nightTheme } = req.body;

        // Validate theme names
        const validThemes = ['light', 'dark', 'blue', 'purple', 'cyber'];
        const themes = [globalTheme, morningTheme, afternoonTheme, nightTheme].filter(Boolean);
        
        for (const theme of themes) {
            if (!validThemes.includes(theme)) {
                return res.status(400).json({ error: `Invalid theme: ${theme}` });
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                themePreferences: {
                    timeBased: timeBased || false,
                    globalTheme: globalTheme || 'dark',
                    morningTheme: morningTheme || 'light',
                    afternoonTheme: afternoonTheme || 'blue',
                    nightTheme: nightTheme || 'dark'
                }
            },
            { new: true }
        ).select('themePreferences');

        res.json({
            success: true,
            themePreferences: user.themePreferences
        });
    } catch (error) {
        console.error('Error updating theme preferences:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getThemePreferences = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('themePreferences');
        
        res.json({
            success: true,
            themePreferences: user.themePreferences || {
                timeBased: false,
                globalTheme: 'dark',
                morningTheme: 'light',
                afternoonTheme: 'blue',
                nightTheme: 'dark'
            }
        });
    } catch (error) {
        console.error('Error fetching theme preferences:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Request account deletion (send OTP)
export const requestAccountDeletion = async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user._id;

        // Get user with all fields
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        // Generate OTP for account deletion
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        
        console.log('Generated OTP:', otp);
        console.log('OTP Hash:', otpHash);
        
        // Store OTP hash and expiry
        user.otp = {
            code: otpHash,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            purpose: 'account_deletion'
        };
        
        console.log('Saving OTP to user:', user.otp);
        await user.save();
        
        // Verify it was saved correctly
        const updatedUser = await User.findById(userId);
        console.log('OTP after save:', updatedUser.otp);

        // Send OTP email
        await sendOtpEmail(user.email, otp, 'account deletion');

        res.json({ 
            success: true, 
            message: 'OTP sent to your email for account deletion verification' 
        });
    } catch (error) {
        console.error('Error requesting account deletion:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Confirm account deletion with OTP
export const confirmAccountDeletion = async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.user._id;

        // Get user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify OTP
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        
        console.log('OTP Verification Debug:');
        console.log('Received OTP:', otp);
        console.log('Generated OTP Hash:', otpHash);
        console.log('User OTP:', user.otp);
        console.log('User OTP Code:', user.otp?.code);
        console.log('OTP Match:', user.otp?.code === otpHash);
        console.log('OTP Expires At:', user.otp?.expiresAt);
        console.log('Current Time:', new Date());
        console.log('OTP Expired:', user.otp?.expiresAt < new Date());
        console.log('OTP Purpose:', user.otp?.purpose);
        
        if (!user.otp || 
            user.otp.code !== otpHash || 
            user.otp.expiresAt < new Date() ||
            user.otp.purpose !== 'account_deletion') {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Get user details for email
        const userEmail = user.email;
        const userName = user.fullName;

        // Delete user's profile picture from Cloudinary if exists
        if (user.profilePic) {
            try {
                const publicId = user.profilePic.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.log('Failed to delete profile picture:', error);
            }
        }

        // Delete user account
        await User.findByIdAndDelete(userId);

        // Send deletion confirmation email
        const deletionEmailSubject = 'Your SecureNest Account Has Been Deleted';
        const deletionEmailBody = `
Dear ${userName},

Your SecureNest account has now been deleted successfully.
Thank you for the trust, time, and presence you shared with us.
It has been a privilege to support you during your journey with our platform.
Although this marks a goodbye for now, we want you to know that our doors will always remain open.
If you ever choose to return, our community will be here to welcome you back with the same commitment and care.
Wishing you success and clarity ahead.

Warm regards,
The SecureNest Team
        `;

        try {
            await sendOtpEmail(userEmail, '', 'account_deletion_confirmation', deletionEmailSubject, deletionEmailBody);
        } catch (error) {
            console.log('Failed to send deletion confirmation email:', error);
        }

        // Clear auth cookie
        res.clearCookie('jwt');

        res.json({ 
            success: true, 
            message: 'Account deleted successfully' 
        });
    } catch (error) {
        console.error('Error confirming account deletion:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};