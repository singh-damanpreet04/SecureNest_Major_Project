import { motion } from 'framer-motion';

const AuthImagePattern = ({ title, subtitle }) => {
    return (
        <div className="hidden lg:flex items-center justify-center w-1/2 bg-[#1F2937] p-12 relative overflow-hidden h-full">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-20">
                <div className="grid grid-cols-12 gap-1 h-full w-full">
                    {[...Array(144)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="bg-white/5 rounded-sm"
                            initial={{ opacity: 0.2 }}
                            animate={{
                                opacity: [0.2, 0.4, 0.2],
                                transition: {
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 2
                                }
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-md w-full flex items-center justify-center">
                <div className="text-center space-y-8">
                    {/* Logo/Icon */}
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold text-white">{title}</h2>
                        <p className="text-indigo-200 text-lg">{subtitle}</p>
                    </div>

                    {/* Decorative Elements */}
                    <div className="flex justify-center space-x-4">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                className="w-3 h-3 bg-indigo-500 rounded-full"
                                animate={{
                                    y: [0, -10, 0],
                                    opacity: [0.6, 1, 0.6],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: i * 0.3,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthImagePattern;