import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot be longer than 30 characters']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minLength: [12, 'Password must be at least 12 characters long']
    },
    profilePic: {
        type: String,
        default: ''
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        code: String,
        expiresAt: Date,
        purpose: String
    },
    // TOTP secret used to generate time-based codes sent via email
    totpSecret: { type: String }, 
    lastOtpSentAt: Date,
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    blockedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    backupCodes: [{
        codeHash: { type: String, required: true },
        used: { type: Boolean, default: false },
        usedAt: { type: Date },
        createdAt: { type: Date, default: Date.now }
    }],
    passwordReset: {
        // Temporary TOTP secret for password reset, valid for a limited time
        totpSecret: { type: String },
        requestedAt: { type: Date },
        backupCodeHash: { type: String }
    },
    pinHash: { type: String },
    // PIN recovery data
    pinRecovery: {
        totpSecret: { type: String }, // not required
        requestedAt: { type: Date },  // not required
        verified: { type: Boolean, default: false },
        verifiedAt: { type: Date },
        email: { type: String } // not required
    },
    // Pinned chats - store user IDs in order of pinning
    pinnedChats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Per-user chat locking state
    lockedChats: [{
        peerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        locked: { type: Boolean, default: false },
        // Failed PIN attempts timestamps (keep recent history)
        failedAttempts: [{ type: Date, default: [] }],
        // Cooldown end timestamp if rate-limited
        cooldownUntil: { type: Date }
    }],
    // Removed WebAuthn fields
    // webauthnCredentials: [{
    //     credentialID: { type: String, required: true },
    //     publicKey: { type: String, required: true },
    //     counter: { type: Number, default: 0 },
    //     transports: [{ type: String }],
    //     createdAt: { type: Date, default: Date.now }
    // }],
    // webauthnCurrentChallenge: { type: String }
    
    // Theme preferences
    themePreferences: {
        timeBased: { type: Boolean, default: false },
        globalTheme: { type: String, default: 'dark' },
        morningTheme: { type: String, default: 'light' },
        afternoonTheme: { type: String, default: 'blue' },
        nightTheme: { type: String, default: 'dark' }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});


userSchema.pre('save', function(next) {
    next();
});

const User = mongoose.model('User', userSchema);
export default User;
