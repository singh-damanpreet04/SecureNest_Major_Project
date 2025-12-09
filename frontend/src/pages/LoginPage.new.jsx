import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Mail, Lock, MessageSquare, Eye, EyeOff, Loader2 } from "lucide-react";

const LoginPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const { login, isLoggingIn } = useAuthStore();
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await login(formData);
            if (response?.user) {
                toast.success('Login successful!');
                navigate('/');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.response?.data?.message || 'Login failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 bg-[#1E1E2D] p-8 sm:p-12 lg:p-20 flex items-center justify-center">
                <div className="w-full max-w-md">
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                        <p className="text-gray-400">Sign in to your account</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                                    Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="block w-full bg-[#2A2A3F] border border-[#3F3F52] rounded-lg py-3 pl-10 pr-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                                        Password
                                    </label>
                                    <Link to="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        className="block w-full bg-[#2A2A3F] border border-[#3F3F52] rounded-lg py-3 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                            >
                                {isLoggingIn ? (
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                ) : null}
                                Sign In
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-400">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-medium">
                                Create account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Image/Content */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-[#1E1E2D] to-[#2D1E2D] p-12 relative overflow-hidden">
                <div className="relative z-10 text-center max-w-md">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-6">
                        <MessageSquare className="h-8 w-8 text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Join our community</h2>
                    <p className="text-gray-300 mb-8">Connect with people around the world and start chatting in real-time.</p>
                    
                    <div className="flex justify-center space-x-2">
                        {[1, 2, 3].map((dot) => (
                            <div 
                                key={dot}
                                className={`w-2.5 h-2.5 rounded-full ${dot === 1 ? 'bg-purple-400' : 'bg-gray-600'}`}
                            />
                        ))}
                    </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full bg-purple-500/10 blur-3xl"></div>
                <div className="absolute bottom-1/4 left-1/4 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl"></div>
            </div>
        </div>
    );
};

export default LoginPage;
