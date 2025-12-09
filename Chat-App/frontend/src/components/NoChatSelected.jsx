import {MessageSquare} from "lucide-react";

const NoChatSelected = () => {
    return (
        <div className="w-full h-full flex items-center justify-center bg-primary">
            <div className="text-center px-4">
                {/* Icon with animation */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center animate-bounce" style={{ backgroundColor: 'var(--secondary)' }}>
                        <MessageSquare className="w-10 h-10 accent" />
                    </div>
                </div>
                
                {/* Welcome Text */}
                <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
                    Welcome to SecureNest Community
                </h2>
                <p className="text-primary text-lg opacity-80">
                    Select a user from the sidebar to start messaging
                </p>
            </div>
        </div>
    );
};

export default NoChatSelected;  