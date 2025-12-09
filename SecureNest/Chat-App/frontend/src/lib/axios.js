import axios from "axios";

// Create axios instance with base URL and credentials
const axiosInstance = axios.create({
    baseURL: "http://localhost:5003/api",
    withCredentials: true, // Important: This sends cookies with requests
});

// Request interceptor to add auth token to headers
axiosInstance.interceptors.request.use(
    (config) => {
        // Skip adding token for auth routes
        if (config.url.includes('/auth/')) {
            return config;
        }
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // If token exists, add it to the headers
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 Unauthorized
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isAuthRoute = originalRequest.url.includes('/auth/');
        
        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
            originalRequest._retry = true;
            
            try {
                // Try to refresh the token
                const response = await axios.get(
                    'http://localhost:5003/api/auth/check',
                    { 
                        withCredentials: true,
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    }
                );
                
                if (response.data.success && response.data.token) {
                    // Update the token in localStorage
                    localStorage.setItem('token', response.data.token);
                    
                    // Update the Authorization header
                    originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
                    
                    // Retry the original request with new token
                    return axiosInstance(originalRequest);
                }
                
                // If we get here, token refresh failed
                throw new Error('Failed to refresh token');
                
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                
                // Clear any invalid tokens
                localStorage.removeItem('token');
                
                // Only redirect if not already on login/signup page
                if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
                    window.location.href = '/login';
                }
                
                return Promise.reject(refreshError);
            }
        }
        
        // For any other error, just reject it
        return Promise.reject(error);
    }
);

export { axiosInstance };