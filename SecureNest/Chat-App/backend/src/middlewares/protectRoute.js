import jwt from 'jsonwebtoken';
import User from '../models/user.models.js';

const protectRoute = async (req, res, next) => {
    try {
        console.log('Cookies:', req.cookies);
        console.log('Headers:', req.headers);
        
        // Try to get token from cookies first, then from Authorization header
        let token = req.cookies?.token;
        
        // If no token in cookies, check Authorization header
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token provided'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from the token
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, user not found'
            });
        }
        
        // Attach user to request object
        req.user = user;
        next();
        
    } catch (error) {
        console.error('Error in protectRoute middleware:', error);
        return res.status(401).json({
            success: false,
            message: 'Not authorized, token failed'
        });
    }
};

export { protectRoute };
