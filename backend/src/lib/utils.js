import jwt from 'jsonwebtoken';

// Token generation without setting cookies
export const generateToken = (userId, expiresIn = "7d") => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn
    });
};

// New method for setting auth cookies
export const setAuthCookie = (res, token, maxAge = 24 * 60 * 60 * 1000, name = 'jwt') => {
    res.cookie(name, token, {
        maxAge,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
    });
};