import { useAuthStore } from "../store/useAuthStore";
import { Camera, LogOut, Mail, User as UserIcon, UserCircle, Trash2, X, Lock, Key, Mail as MailIcon, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useState } from "react";

const ProfilePage = () => {
    const { authUser, isUpdatingProfile, updateProfile, logout, requestAccountDeletion, confirmAccountDeletion } = useAuthStore();
    const navigate = useNavigate();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1); // 1: password/delete, 2: otp
    const [password, setPassword] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showDeletePassword, setShowDeletePassword] = useState(false);
    
    // Debug: Log authUser to check its structure
    console.log('authUser:', authUser);
    
    const handleRemoveProfilePic = async () => {
        if (!authUser?.profilePic) return;
        
        if (window.confirm('Are you sure you want to remove your profile picture?')) {
            try {
                // Send a special value that the backend will recognize as a removal request
                await updateProfile({ removeProfilePic: true });
                toast.success("Profile picture removed successfully!");
                // Refresh the page to show the default avatar
                window.location.reload();
            } catch (error) {
                console.error("Error removing profile picture:", error);
                toast.error(error.response?.data?.message || "Failed to remove profile picture");
            }
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
        }
        
        // Check file type
        if (!file.type.match('image.*')) {
            toast.error("Please select a valid image file");
            return;
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onloadend = async () => {
            const base64Image = reader.result;
            try {
                await updateProfile({ profilePic: base64Image });
                toast.success("Profile picture updated successfully!");
                // Refresh the page to show the updated profile
                window.location.reload();
            } catch (error) {
                console.error("Error updating profile:", error);
                toast.error(error.response?.data?.error || "Failed to update profile picture");
            }
        };
        
        reader.onerror = () => {
            console.error("Error reading file");
            toast.error("Error reading image file");
        };
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Failed to logout");
        }
    };

    const handleRequestDeletion = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        const result = await requestAccountDeletion(password);
        
        if (result.success) {
            setDeleteStep(2);
            setPassword('');
            setDeleteConfirmation('');
        }
        
        setIsLoading(false);
    };

    const handleConfirmDeletion = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        const result = await confirmAccountDeletion(otp);
        
        if (result.success) {
            setShowDeleteModal(false);
            setDeleteStep(1);
            setOtp('');
        }
        
        setIsLoading(false);
    };

    const handleCloseDeleteModal = () => {
        if (!isLoading) {
            setShowDeleteModal(false);
            setDeleteStep(1);
            setPassword('');
            setDeleteConfirmation('');
            setOtp('');
        }
    };

    return (
        <div className="fixed inset-0 bg-[#1E1E2D] flex flex-col overflow-hidden">
  {/* Decorative blur circles like LoginPage */}
  <div className='absolute top-1/4 right-1/4 w-32 h-32 rounded-full bg-purple-500/10 blur-3xl z-0'></div>
  <div className='absolute bottom-1/4 left-1/4 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl z-0'></div>
  <div className="relative flex-1 pt-24 pb-10 px-4 z-10 overflow-y-auto">

            <div className="max-w-md mx-auto bg-[#181d23]/90 rounded-2xl shadow-2xl overflow-hidden profile-glass-glow-login">
                {/* Header with profile picture */}
                <div className="relative bg-[#232c43]/80 px-6 pt-8 pb-8 text-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#232c43]/70 to-[#10131a]/80"></div>
                    
                    <div className="relative z-10 mb-8">
                        <h1 className="text-3xl font-bold text-white">Profile</h1>
                        <p className="text-blue-300 text-sm mt-2">Your account information</p>
                    </div>
                    
                    {/* Profile Picture */}
                    <div className="relative z-20 -mb-16">
                        {authUser?.profilePic ? (
                            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-blue-400 shadow-blue-500/40 shadow-xl mx-auto profile-pic-glow">
                                <img 
                                    src={authUser.profilePic} 
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // If image fails to load, show initials
                                        e.target.style.display = 'none';
                                        e.target.parentNode.innerHTML = `
                                            <div class="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-5xl font-bold">
                                                ${authUser?.fullName 
                                                    ? authUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                                                    : (authUser?.username || 'U').charAt(0).toUpperCase()
                                                }
                                            </div>
                                        `;
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="w-36 h-36 rounded-full bg-blue-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl mx-auto">
                                {authUser?.fullName 
                                    ? authUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                                    : (authUser?.username || 'U').charAt(0).toUpperCase()
                                }
                            </div>
                        )}
                        <div className="absolute bottom-[-60px] right-1/2 translate-x-1/2 flex flex-col items-center gap-2">
                            <label
                                htmlFor="avatar-upload"
                                className={`bg-white hover:bg-gray-100 text-blue-600 p-2.5 rounded-full cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 border-2 border-blue-600 ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
                                title="Change profile picture"
                            >
                                <Camera className="size-5" />
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={isUpdatingProfile}
                                />
                            </label>
                            {authUser?.profilePic && (
                                <button
                                    onClick={handleRemoveProfilePic}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 border-2 border-red-600 flex items-center justify-center text-sm font-medium"
                                    title="Remove profile picture"
                                    disabled={isUpdatingProfile}
                                >
                                    <Trash2 className="size-4 mr-1" />
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Main Content */}
                <div className="p-6 pt-28">
                    {/* Username Section */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white">
                            {authUser?.username || 'User'}
                        </h2>
                        <p className="text-sm text-blue-300 mt-2">
                            {isUpdatingProfile ? "Updating..." : "Click camera icon to change photo"}
                        </p>
                    </div>
                    
                    {/* User Info Cards */}
                    <div className="space-y-5">
                        <div className="bg-gray-700 p-5 rounded-xl border border-gray-600 hover:border-purple-500 transition-all duration-300 hover:shadow-lg">
                            <div className="flex items-start">
                                <div className="p-2.5 bg-purple-500/20 rounded-xl mr-4 text-purple-400">
                                    <UserIcon className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-blue-300 mb-1">Full Name</p>
                                    <p className="text-white">{authUser?.fullName || 'Not set'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-700 p-5 rounded-xl border border-gray-600 hover:border-purple-500 transition-all duration-300 hover:shadow-lg">
                            <div className="flex items-start">
                                <div className="p-2.5 bg-purple-500/20 rounded-xl mr-4 text-purple-400">
                                    <Mail className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-blue-300 mb-1">Email Address</p>
                                    <p className="text-white break-all">{authUser?.email || 'Not set'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-700 p-5 rounded-xl border border-gray-600 hover:border-purple-500 transition-all duration-300 hover:shadow-lg">
                            <div className="flex items-start">
                                <div className="p-2.5 bg-purple-500/20 rounded-xl mr-4 text-purple-400">
                                    <UserCircle className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-blue-300 mb-1">Username</p>
                                    <p className="text-white profile-username-glow">@{authUser?.username || 'user'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 bg-[#1E1E2D] rounded-xl p-6 border border-[#2D2D3A]">
                        <h2 className="text-lg font-medium mb-4">Account Information</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between py-2 border-b border-[#2D2D3A] text-white">
                                <span className="text-gray-400">Member Since</span>
                                <span>{authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-gray-400">Account Status</span>
                                <span className="text-green-400">Active</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Delete Account Button */}
                    <div className="mt-8">
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                        >
                            <Trash2 className="size-5" />
                            Delete Account
                        </button>
                    </div>
                    
                    {/* Logout Button */}
                    <div className="mt-4">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors font-medium border border-red-400/20 hover:border-red-400/40"
                        >
                            <LogOut className="size-5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Delete Account Modal */}
        {showDeleteModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-800 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-800">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Delete Account
                        </h2>
                        <button
                            onClick={handleCloseDeleteModal}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {deleteStep === 1 && (
                            <form onSubmit={handleRequestDeletion} className="space-y-4">
                                <div className="text-center mb-6">
                                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                    <p className="text-gray-300 mb-2">
                                        This action cannot be undone. All your data will be permanently deleted.
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Please enter your password and type "DELETE" to continue.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        <Lock className="w-4 h-4 inline mr-1" />
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showDeletePassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            placeholder="Enter your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowDeletePassword(!showDeletePassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                                        >
                                            {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        <Trash2 className="w-4 h-4 inline mr-1" />
                                        Type "DELETE"
                                    </label>
                                    <input
                                        type="text"
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent uppercase"
                                        placeholder="Type DELETE"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || deleteConfirmation.toUpperCase() !== 'DELETE' || !password}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Sending OTP...' : 'Send Deletion Code'}
                                </button>
                            </form>
                        )}

                        {deleteStep === 2 && (
                            <form onSubmit={handleConfirmDeletion} className="space-y-4">
                                <div className="text-center mb-6">
                                    <MailIcon className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                                    <p className="text-gray-300 mb-2">
                                        We have sent a 6-digit code to your email.
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Enter the code to confirm account deletion.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        <MailIcon className="w-4 h-4 inline mr-1" />
                                        Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        required
                                        maxLength={6}
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                                        placeholder="000000"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Deleting Account...' : 'Delete My Account'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDeleteStep(1)}
                                    disabled={isLoading}
                                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Back
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};

export default ProfilePage;