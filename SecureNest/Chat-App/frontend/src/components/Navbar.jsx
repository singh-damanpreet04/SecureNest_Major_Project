import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Settings, MessageSquare, LogOut, User, ChevronDown, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import SchedulerButton from "./Scheduler/SchedulerButton";
import Scheduler from "./Scheduler/Scheduler";
import { useScheduler } from "../hooks/useScheduler";
import AegisButton from "./AegisAssistant/AegisButton";

// Feature flag to control visibility of Secure AI link in the navbar
const SHOW_SECURE_AI_LINK = false;

const Navbar = () => {
    const { logout: logoutUser, authUser } = useAuthStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const { isSchedulerOpen, openScheduler, closeScheduler } = useScheduler();

    const handleLogout = async () => {
        try {
            await logoutUser();
            toast.success('Logged out successfully');
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error(error.message || 'Failed to log out');
            // Still navigate to login even if there was an error
            navigate('/login');
        } finally {
            setIsDropdownOpen(false);
        }
    };

    return (
        <>
            <header className="navbar-glass-glow fixed w-full top-0 z-40 border-b border-secondary bg-secondary animate-navbar-fade-in" style={{marginBottom: '10px'}}>
            <div className="w-full px-6 h-16 relative">
                <div className="absolute inset-0 navbar-glow-border pointer-events-none z-0" />
                <div className="flex items-center justify-between h-full relative z-10">
                    {/* Logo - Far Left */}
                    <div className="flex-shrink-0">
                        <Link to='/' className="flex items-center gap-2.5 hover:opacity-80 transition-all">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
                                <MessageSquare className="w-4 h-4 text-white"/>
                            </div>
                            <h1 className="text-lg font-bold accent">SecureNest</h1>
                        </Link>
                    </div>

                    {/* Right-aligned container for navigation and user menu */}
                    <div className="flex items-center space-x-4">
                        {/* Navigation Links */}
                        <nav className="hidden md:flex items-center space-x-1">
                            <SchedulerButton onClick={openScheduler} />
                            {SHOW_SECURE_AI_LINK && (
                                <Link 
                                    to="/ai-chat" 
                                    className="px-3 py-2 text-sm font-medium text-indigo-300 hover:text-white rounded-md hover:bg-indigo-800 transition-colors"
                                    style={{ fontWeight: 600 }}
                                >
                                    Secure AI
                                </Link>
                            )}
                            <Link 
                                to="/" 
                                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
                            >
                                Home
                            </Link>
                            {authUser && (
                                <Link 
                                    to="/fakecheck" 
                                    className="px-3 py-2 text-sm font-medium text-emerald-300 hover:text-white rounded-md hover:bg-emerald-800 transition-colors flex items-center gap-1.5"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    FakeCheck
                                </Link>
                            )}
                            {authUser ? (
                                <Link 
                                    to="/settings" 
                                    className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
                                >
                                    Settings
                                </Link>
                            ) : (
                                <Link 
                                    to="/login" 
                                    className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
                                >
                                    Settings
                                </Link>
                            )}
                        </nav>
                        {/* Voice Assistant Button (Aegis) */}
                        {authUser && <AegisButton inline />}

                        {/* User Menu */}
                        {authUser ? (
                            <div className="relative">
                                <button 
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                        <User className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <span className="hidden md:inline text-sm font-semibold text-[#fffbe6] drop-shadow-navbar-user">
                                        {authUser.username || 'User'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
                                </button>
                                
                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 origin-top-right bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-700 z-50">
                                        <div className="py-1">
                                            <Link
                                                to="/profile"
                                                className="flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                                                onClick={() => setIsDropdownOpen(false)}
                                            >
                                                <User className="mr-3 h-4 w-4 text-gray-400" />
                                                Your Profile
                                            </Link>
                                           
                                            <button
                                                onClick={handleLogout}
                                                className="flex w-full items-center px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
                                            >
                                                <LogOut className="mr-3 h-4 w-4 text-red-400" />
                                                Sign out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        <style>{`
  .navbar-glass-glow {
    background: rgba(0,0,0,0.92);
    backdrop-filter: blur(14px) saturate(145%);
    /* box-shadow removed */
    border-bottom: 2px solid #fffbe6cc;
    border-radius: 0 0 1.5rem 1.5rem;
    transition: box-shadow 0.3s, border 0.3s;
    overflow: visible;
    margin-bottom: 10px;
  }
  .navbar-glow-border {
    border-radius: 0 0 1.5rem 1.5rem;
    box-shadow:
      0 0 14px 3px #60a5fa99,
      0 2px 18px 6px #3b82f688,
      0 2px 8px 2px #1e40af44;
    background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 60%, #1e40af 100%);
    opacity: 0.22;
    filter: blur(5px);
    z-index: 0;
    pointer-events: none;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0; left: 0;
  }
  .navbar-gradient-text {
    background: linear-gradient(90deg, #fffbe6 0%, #ffe066 40%, #ffb347 75%, #fff9c4 100%);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-fill-color: transparent;
    animation: gradientTextMove 5s ease-in-out infinite;
    text-shadow: 0 2px 12px #ffe066cc, 0 1px 8px #ffb34799;
    letter-spacing: 1.5px;
    filter: brightness(1.12) drop-shadow(0 0 6px #ffe06699);
  }
  @keyframes gradientTextMove {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-navbar-fade-in {
    animation: navbarFadeIn 1.4s cubic-bezier(0.22,0.68,0.57,1) 0s 1 both;
  }
  .drop-shadow-navbar-user {
    text-shadow: 0 1px 4px #0e1a2b99, 0 0.5px 2px #fffbe655;
  }
  @keyframes navbarFadeIn {
    0% { opacity: 0; transform: translateY(-30px) scale(0.98); }
    65% { opacity: 1; transform: translateY(6px) scale(1.03); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  nav a {
    transition: color 0.18s, background 0.18s, box-shadow 0.22s, text-shadow 0.18s;
    color: #fffbe6;
    text-shadow: 0 1px 4px #0e1a2b99, 0 0.5px 2px #fffbe655;
    box-shadow: none;
  }
  nav a:hover, nav a:focus {
    color: #ffe066;
    background: linear-gradient(90deg, #232c43 0%, #232c43 100%);
    box-shadow: 0 2px 12px #ffe06655, 0 1.5px 8px #ffb34733;
    text-shadow: 0 2px 8px #ffe06699, 0 1px 4px #ffb34788;
  }
`}</style>
        </header>
        
        {/* Scheduler Modal */}
        {isSchedulerOpen && <Scheduler onClose={closeScheduler} />}
    </>
  );
};

export default Navbar;