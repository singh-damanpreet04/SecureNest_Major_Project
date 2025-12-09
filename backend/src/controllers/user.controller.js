import User from '../models/user.models.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';

/**
 * Block a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const blockUser = async (req, res) => {
    try {
        const { userId } = req.params; // ID of the user to block
        const currentUserId = req.user._id; // ID of the current user

        if (userId === currentUserId.toString()) {
            throw new BadRequestError('You cannot block yourself');
        }

        // Check if user exists
        const userToBlock = await User.findById(userId);
        if (!userToBlock) {
            throw new NotFoundError('User not found');
        }

        // Check if already blocked
        const currentUser = await User.findById(currentUserId);
        if (currentUser.blockedUsers.includes(userId)) {
            throw new BadRequestError('User is already blocked');
        }

        // Add to blockedUsers array
        currentUser.blockedUsers.push(userId);
        await currentUser.save();

        // Add to other user's blockedBy array
        userToBlock.blockedBy.push(currentUserId);
        await userToBlock.save();

        res.status(200).json({
            success: true,
            message: 'User blocked successfully',
            data: {
                blockedUserId: userId,
                blocked: true
            }
        });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Error blocking user'
        });
    }
};

/**
 * Unblock a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const unblockUser = async (req, res) => {
    try {
        const { userId } = req.params; // ID of the user to unblock
        const currentUserId = req.user._id; // ID of the current user

        // Check if user exists
        const userToUnblock = await User.findById(userId);
        if (!userToUnblock) {
            throw new NotFoundError('User not found');
        }

        // Check if user is actually blocked
        const currentUser = await User.findById(currentUserId);
        if (!currentUser.blockedUsers.includes(userId)) {
            throw new BadRequestError('User is not blocked');
        }

        // Remove from blockedUsers array
        currentUser.blockedUsers = currentUser.blockedUsers.filter(
            id => id.toString() !== userId
        );
        await currentUser.save();

        // Remove from other user's blockedBy array
        userToUnblock.blockedBy = userToUnblock.blockedBy.filter(
            id => id.toString() !== currentUserId.toString()
        );
        await userToUnblock.save();

        res.status(200).json({
            success: true,
            message: 'User unblocked successfully',
            data: {
                unblockedUserId: userId,
                blocked: false
            }
        });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Error unblocking user'
        });
    }
};

/**
 * Get list of blocked users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBlockedUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        
        // Find current user with populated blockedUsers
        const user = await User.findById(currentUserId)
            .select('blockedUsers')
            .populate('blockedUsers', 'username fullName profilePic');

        res.status(200).json({
            success: true,
            data: {
                blockedUsers: user.blockedUsers || []
            }
        });
    } catch (error) {
        console.error('Error fetching blocked users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching blocked users'
        });
    }
};

/**
 * Check if a user is blocked by the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkIfBlocked = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;

        const currentUser = await User.findById(currentUserId);
        const isBlocked = currentUser.blockedUsers.some(id => id.toString() === userId);

        res.status(200).json({
            success: true,
            data: {
                isBlocked,
                userId
            }
        });
    } catch (error) {
        console.error('Error checking block status:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking block status'
        });
    }
};
