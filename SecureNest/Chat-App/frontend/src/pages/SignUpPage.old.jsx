import { Loader2, User, Mail, Lock, Eye, EyeOff, UserCircle, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link, useNavigate } from "react-router-dom";
import AuthImagePattern from "../components/AuthImagePattern";
import { toast } from "react-toastify";

// Cloudinary configuration - replace with your actual values
const CLOUD_NAME = 'your_cloud_name';
const UPLOAD_PRESET = 'your_upload_preset';

const SignUpPage = () => {
    const navigate = useNavigate();
    const { signup, isLoading } = useAuthStore();
    const fileInputRef = useRef(null);
    
    // State for form data and UI
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        profilePic: null
    });

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        
        if (name === 'profilePic') {
            if (files && files[0]) {
                const file = files[0];
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    toast.error("File size should be less than 5MB");
                    return;
                }
                setFormData(prev => ({
                    ...prev,
                    [name]: file
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    // Handle file upload to Cloudinary
    const handleFileUpload = async (file) => {
        if (!file) return null;
        
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );
            
            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const navigate = useNavigate();
    const { signup, isLoading } = useAuthStore();
    
    // Debug: Log form data when it changes
    useEffect(() => {
        console.log('Form data updated:', formData);
    }, [formData]);
    
    const validateForm = () => {
        console.log('Form data being validated:', formData);
        
        // Check full name
        const fullName = formData.fullName?.trim() || '';
        if (!fullName) {
            toast.error("Full name is required");
            return false;
        }
        
        // Check username
        const username = formData.username?.trim() || '';
        if (!username) {
            toast.error("Username is required");
            return false;
        }
        if (username.length < 3) {
            toast.error("Username must be at least 3 characters long");
            return false;
        }
        
        // Check email
        const email = formData.email?.trim() || '';
        if (!email) {
            toast.error("Email is required");
            return false;
        }
        
        // Check password
        const password = formData.password || '';
        const confirmPassword = formData.confirmPassword || '';
        
        if (!password) {
            toast.error("Password is required");
            return false;
        }
        
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return false;
        }
        
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return false;
        }
        
        // If we get here, all required fields are filled
        // Now validate email format
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(email) || email.split('@').length !== 2) {
            toast.error("Please enter a valid email address (e.g., example@gmail.com)");
            return false;
        }
        
        // Check for valid domain
        const domain = email.split('@')[1];
        if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
            toast.error("Please include a valid domain in the email address");
            return false;
        }
        
        // Validate password requirements
        if (password.length < 12) {
            toast.error("Password must be at least 12 characters long");
            return false;
        }
        
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password);
        
        if (!hasUpperCase) {
            toast.error("Password must contain at least one uppercase letter");
            return false;
        }
        if (!hasLowerCase) {
            toast.error("Password must contain at least one lowercase letter");
            return false;
        }
        if (!hasNumbers) {
            toast.error("Password must contain at least one number");
            return false;
        }
        if (!hasSpecialChar) {
            toast.error("Password must contain at least one special character");
            return false;
        }
        
        return true;
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // Validate form
            const isValid = validateForm();
            if (!isValid) return;
            
            setIsUploading(true);
            
            // Upload profile picture if exists
            let profilePicUrl = '';
            if (formData.profilePic) {
                profilePicUrl = await handleFileUpload(formData.profilePic);
            }
            
            // Prepare user data
            const userData = {
                fullName: formData.fullName.trim(),
                username: formData.username.trim().toLowerCase(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                ...(profilePicUrl && { profilePic: profilePicUrl })
            };
            
            // Submit to backend
            const result = await signup(userData);
            
            if (result?.success) {
                toast.success('Account created successfully!');
                navigate('/login');
            } else {
                toast.error(result?.message || 'Failed to create account');
            }
        } catch (error) {
            console.error('Signup error:', error);
            toast.error(error.message || 'Failed to create account');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left Side */}
            <div className="flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24">

                        <div className="pt-2">
                            <button 
                                type="submit" 
                                className="btn btn-primary w-full bg-gradient-to-r from-indigo-500 to-purple-500 border-0 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                                disabled={isUploading || isLoading}
                            >
                                {isUploading || isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : 'Sign Up'}
                            </button>
                        </div>
                        
                        <div className="text-center mt-4">
                            <p className="text-sm text-gray-400">
                                Already have an account?{' '}
                                <Link to="/login" className="text-indigo-400 hover:underline">
                                    Login here
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
            
            {/* Right Side - Image */}
            <div className="hidden lg:block relative">
                <AuthImagePattern />
            </div>
        </div>
    );
};

export default SignUpPage;