import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import NoChatSelected from "../components/NoChatSelected.jsx";
import ChatContainer from "../components/ChatContainer.jsx";
import Navbar from "../components/Navbar.jsx";
import { motion } from "framer-motion";
import { Shield, Lock, Wifi, Sparkles } from "lucide-react";

const HomePage = () => {
    const { selectedUser } = useChatStore();
    
    return (
        <div className="fixed inset-0 min-h-screen min-w-screen w-screen h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 overflow-hidden p-0 m-0">
            {/* Enhanced animated gradient background */}
            <div className="absolute inset-0 opacity-40">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-blue-600/20 to-indigo-600/20 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-cyan-500/10 to-blue-500/10" style={{ animation: 'gradientShift 8s ease-in-out infinite' }} />
            </div>
            
            {/* Animated hexagon grid pattern */}
            <div className="absolute inset-0 opacity-15">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <defs>
                        <pattern id="hexGridHome" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                            <polygon points="30,5 50,17.5 50,42.5 30,55 10,42.5 10,17.5" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />
                            <circle cx="30" cy="30" r="2" fill="#0ea5e9" opacity="0.4" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hexGridHome)" />
                </svg>
            </div>
            
            {/* Moving security icons */}
            <motion.div
                className="absolute top-20 left-10 opacity-20"
                animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
                transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Shield className="w-12 h-12 text-cyan-400" />
            </motion.div>
            
            <motion.div
                className="absolute top-40 right-20 opacity-20"
                animate={{ x: [0, -15, 0], y: [0, 10, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Lock className="w-10 h-10 text-blue-400" />
            </motion.div>
            
            <motion.div
                className="absolute bottom-32 left-32 opacity-20"
                animate={{ x: [0, 10, 0], y: [0, -15, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Wifi className="w-8 h-8 text-cyan-300" />
            </motion.div>
            
            {/* Floating particles */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={`particle-${i}`}
                    className="absolute w-1 h-1 rounded-full bg-cyan-400/60"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                        y: [0, -50, 0],
                        opacity: [0, 0.8, 0],
                        scale: [0, 1, 0],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 3,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: 'easeInOut',
                    }}
                />
            ))}
            
            {/* Enhanced glowing orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-1/3 -left-1/4 w-[800px] h-[800px] rounded-full filter blur-[100px]"
                    style={{ backgroundColor: '#06b6d4' }}
                    animate={{ opacity: [0.2, 0.3, 0.2], scale: [1, 1.1, 1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute -bottom-1/4 -right-1/4 w-[1000px] h-[1000px] rounded-full filter blur-[120px]"
                    style={{ backgroundColor: '#0ea5e9' }}
                    animate={{ opacity: [0.15, 0.25, 0.15], scale: [1, 1.05, 1] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                />
            </div>
            
            {/* Rotating security rings */}
            <motion.div
                className="absolute top-1/4 right-1/4 w-32 h-32 border-2 border-cyan-400/30 rounded-full"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
                className="absolute top-1/4 right-1/4 w-40 h-40 border border-blue-400/20 rounded-full"
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
                className="absolute top-1/4 right-1/4 w-48 h-48 border border-cyan-300/15 rounded-full"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Data flow lines */}
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={`flow-${i}`}
                    className="absolute h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
                    style={{
                        width: `${100 + i * 50}px`,
                        left: `${15 + i * 20}%`,
                        top: `${30 + i * 15}%`,
                    }}
                    animate={{
                        opacity: [0, 0.8, 0],
                        scaleX: [0, 1, 0],
                    }}
                    transition={{
                        duration: 3 + i,
                        repeat: Infinity,
                        delay: i * 1.5,
                        ease: 'easeInOut',
                    }}
                />
            ))}
            
            {/* Floating security badges */}
            <motion.div
                className="absolute right-1/3 top-1/5 bg-gradient-to-br from-cyan-500/30 to-blue-500/15 border border-cyan-400/50 rounded-xl p-3 backdrop-blur-sm shadow-lg"
                animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Shield className="w-6 h-6 text-cyan-300" />
            </motion.div>
            
            <motion.div
                className="absolute left-1/3 bottom-1/5 bg-gradient-to-br from-blue-500/30 to-cyan-500/15 border border-blue-400/50 rounded-xl p-3 backdrop-blur-sm shadow-lg"
                animate={{ y: [0, 10, 0], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Lock className="w-6 h-6 text-blue-300" />
            </motion.div>
            
            {/* Glowing orbs with trails */}
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={`orb-${i}`}
                    className="absolute"
                    style={{
                        left: `${60 + i * 12}%`,
                        top: `${20 + i * 25}%`,
                    }}
                    animate={{
                        x: [0, 20, -20, 0],
                        y: [0, -15, 15, 0],
                    }}
                    transition={{
                        duration: 8 + i * 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    <motion.div
                        className="w-2 h-2 rounded-full bg-cyan-400"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.4, 0.8, 0.4],
                            filter: ['blur(2px)', 'blur(0px)', 'blur(2px)'],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <motion.div
                        className="absolute top-0 left-0 w-2 h-2 rounded-full bg-cyan-400/50"
                        animate={{
                            scale: [1, 3, 1],
                            opacity: [0.6, 0, 0.6],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </motion.div>
            ))}
            
            {/* Enhanced Navbar with animated effects */}
            <div className="h-16 w-full flex-shrink-0 bg-gradient-to-b from-slate-900/90 to-slate-800/80 backdrop-blur-xl border-b border-cyan-400/20 z-10 relative shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 animate-pulse" />
                {/* Navbar glow effect */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
                    animate={{ x: [-100, 100, -100] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative z-10">
                    <Navbar />
                </div>
            </div>
            
            {/* Main content area */}
            <div className="flex flex-1 min-h-0 relative">
                {/* Enhanced Sidebar with SecureNest theme */}
                <div className="w-20 lg:w-80 bg-gradient-to-br from-slate-900/90 via-blue-900/20 to-slate-900/90 backdrop-blur-xl rounded-2xl border border-cyan-400/30 shadow-2xl flex-shrink-0 overflow-hidden flex flex-col transform transition-all duration-500 relative group h-full">
                    {/* Animated border glow */}
                    <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-cyan-400/40 via-blue-400/30 to-cyan-400/40 opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div className="w-full h-full rounded-2xl bg-slate-950/80" />
                    </div>
                    
                    {/* Inner glow effect */}
                    <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_40px_rgba(6,182,245,0.15)] pointer-events-none" />
                    
                    {/* Floating security indicators */}
                    <motion.div
                        className="absolute top-4 right-4 opacity-30"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                    </motion.div>
                    
                    <motion.div
                        className="absolute bottom-4 left-4 opacity-20"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Shield className="w-3 h-3 text-blue-400" />
                    </motion.div>
                    
                    {/* Sidebar pulse effect */}
                    <motion.div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        animate={{
                            boxShadow: ['0 0 0 0 rgba(6, 182, 245, 0.4)', '0 0 0 10px rgba(6, 182, 245, 0)', '0 0 0 0 rgba(6, 182, 245, 0.4)'],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    
                    <div className="relative z-10 flex flex-col h-full">
                        {/* Sidebar content with enhanced styling */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 relative">
                            {/* Enhanced background pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,#06b6d4/10_1px,transparent_1px),linear-gradient(-45deg,#0ea5e9/10_1px,transparent_1px)] bg-[size:20px_20px]" />
                            </div>
                            <div className="relative z-10">
                                <Sidebar />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Vertical glowing border between sidebar and chat */}
                <div className="hidden lg:block w-[3px] h-full blur-[2px] shadow-lg mx-0" style={{ background: `linear-gradient(to bottom, var(--accent), transparent)` }} />
                {/* Chat area with glass effect */}
                <div className="flex-1 flex flex-col min-w-0 bg-primary backdrop-blur-md rounded-2xl border border-secondary shadow-xl overflow-hidden h-full">
                    {!selectedUser ? (
                        <NoChatSelected />
                    ) : (
                        <ChatContainer />
                    )}
                </div>
            </div>
            
            {/* Custom scrollbar */}
            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                
                .float-animation {
                    animation: float 6s ease-in-out infinite;
                }
                
                .gradient-text {
                    background: linear-gradient(90deg, #60a5fa, #818cf8, #a78bfa, #818cf8, #60a5fa);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: gradient 8s ease infinite;
                }
                
                /* Custom scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s ease;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
                
                /* Smooth transitions */
                * {
                    transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
                }
                
                /* Glossy button effect */
                .glossy-btn {
                    position: relative;
                    overflow: hidden;
                }
                .glossy-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 50%;
                    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent);
                    border-radius: inherit;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
};

export default HomePage;    