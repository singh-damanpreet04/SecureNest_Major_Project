import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';

const BlockUserButton = ({ userId, username, onBlockChange }) => {
    const [isBlocked, setIsBlocked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { user: currentUser } = useAuthStore();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003/api';

    useEffect(() => {
        const checkBlockStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                const response = await axios.get(
                    `${API_BASE_URL}/api/users/is-blocked/${userId}`,
                    { 
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
                setIsBlocked(response.data.data.isBlocked);
            } catch (error) {
                console.error('Error checking block status:', error);
            }
        };

        if (userId && currentUser?._id !== userId) {
            checkBlockStatus();
        }
    }, [userId, currentUser?._id, API_BASE_URL]);

    const handleBlockToggle = async () => {
        if (!userId || currentUser?._id === userId) return;
        
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            const endpoint = isBlocked ? 'unblock' : 'block';
            const response = await axios.post(
                `${API_BASE_URL}/api/users/${endpoint}/${userId}`,
                {},
                { 
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                const newBlockStatus = !isBlocked;
                setIsBlocked(newBlockStatus);
                toast.success(
                    newBlockStatus 
                        ? `${username} has been blocked` 
                        : `${username} has been unblocked`
                );
                
                if (onBlockChange) {
                    onBlockChange(userId, newBlockStatus);
                }
            }
        } catch (error) {
            console.error(`Error ${isBlocked ? 'unblocking' : 'blocking'} user:`, error);
            toast.error(
                error.response?.data?.message || 
                `Failed to ${isBlocked ? 'unblock' : 'block'} user`
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (!userId || currentUser?._id === userId) {
        return null; // Don't show block button for current user or invalid user
    }

    return (
        <button
            onClick={handleBlockToggle}
            disabled={isLoading}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isBlocked 
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
        >
            {isLoading ? (
                <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isBlocked ? 'Unblocking...' : 'Blocking...'}
                </span>
            ) : isBlocked ? (
                <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Unblock
                </span>
            ) : (
                <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Block
                </span>
            )}
        </button>
    );
};

export default BlockUserButton;
