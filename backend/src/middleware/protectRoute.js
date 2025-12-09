import jwt from 'jsonwebtoken';
import User from '../models/user.models.js';

export const protectRoute = async (req, res, next) => {
    try {
        console.log('protectRoute: called');
        const token = req.cookies?.jwt;
        
        if (!token) {
            console.log('protectRoute: No token');
            return res.status(401).json({ message: 'Unauthorized - No Token Provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            console.log('protectRoute: Invalid token');
            return res.status(401).json({ message: 'Unauthorized - Invalid Token' });
        }

        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            console.log('protectRoute: User not found for id', decoded.userId);
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = user;
        console.log('protectRoute: user attached', user._id.toString());
        next();
    } catch (error) {
        console.error('Error in protectRoute middleware:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

export default protectRoute;
