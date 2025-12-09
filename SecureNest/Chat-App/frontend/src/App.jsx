import Navbar from "./components/Navbar.jsx";
import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import AIChatPage from "./pages/AIChatPage.jsx";
import FakeCheckPage from "./pages/FakeCheckPage.jsx";
import AegisButton from "./components/AegisAssistant/AegisButton";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { useAuthStore } from "./store/useAuthStore.js";
import { useThemeStore } from "./store/useThemeStore.js";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import EnvTest from "./components/EnvTest";
import { NotificationProvider } from "./contexts/NotificationContext";
import NotificationContainer from "./components/NotificationContainer";
import TestNotification from "./components/TestNotification";
import ErrorBoundary from "./components/ErrorBoundary";
import { useNotificationHandler } from "./hooks/useNotificationHandler";
import SplashScreen from "./components/SplashScreen";

// Component to handle notifications (must be inside NotificationProvider)
const AppContent = () => {
    const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
    const { fetchThemePreferences, checkTimeBasedTheme } = useThemeStore();
    
    // Initialize notification handler
    useNotificationHandler();

    console.log('Online users:', onlineUsers);

    useEffect(() => {
        console.log('App mounted, checking auth...');
        checkAuth().then(() => {
            console.log('Auth check completed');
        }).catch(error => {
            console.error('Error in checkAuth:', error);
        });
    }, [checkAuth]);

    // Fetch theme preferences when user logs in
    useEffect(() => {
        if (authUser) {
            fetchThemePreferences();
        }
    }, [authUser, fetchThemePreferences]);

    // Check for time-based theme changes every minute
    useEffect(() => {
        const interval = setInterval(() => {
            checkTimeBasedTheme();
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [checkTimeBasedTheme]);

    console.log('Rendering App:', { 
        authUser, 
        isCheckingAuth,
        hasAuthChecked: !isCheckingAuth,
        shouldShowLogin: !isCheckingAuth && !authUser
    });

    const location = useLocation();

    if (isCheckingAuth) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader className="size-10 animate-spin"/>
            </div>
        );
    }

    const noNavPaths = ['/login', '/signup'];
    const showNav = !noNavPaths.includes(location.pathname);

    return (
        <div className="min-h-screen w-full bg-primary">
            {/* Environment Variables Debug */}
            {import.meta.env.MODE === 'development' && <EnvTest />}
            
            <ToastContainer 
                position="top-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            {showNav && <Navbar/>}
            <main className={showNav ? "container mx-auto p-4 pt-20 bg-primary" : "relative overflow-hidden h-screen bg-primary"}>
                <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={authUser ? <HomePage/> : <Navigate to="/login"/>}/>
                    <Route path="/signup" element={!authUser ? <SignUpPage/> : <Navigate to="/"/>}/>
                    <Route path="/login" element={!authUser ? <LoginPage/> : <Navigate to="/"/>}/>
                    <Route path="/profile/:username" element={authUser ? <ProfilePage/> : <Navigate to="/login"/>}/>
                    <Route path="/profile" element={authUser ? <Navigate to={`/profile/${authUser.username || 'user'}`} replace/> : <Navigate to="/login"/>}/>
                    <Route path="/ai-chat" element={authUser ? <AIChatPage/> : <Navigate to="/login"/>}/>
                    <Route path="/fakecheck" element={authUser ? <FakeCheckPage/> : <Navigate to="/login"/>}/>
                    <Route path="/settings" element={authUser ? <SettingsPage/> : <Navigate to="/login"/>}/>
                    <Route path="*" element={<Navigate to='/' />} />
                                </Routes>
                </AnimatePresence>
            </main>
            
            {/* Notification Container */}
            <NotificationContainer />
            
            {/* Test Notification Button (temporary for debugging) */}
            {/* {authUser && <TestNotification />} */}
            
            {/* AegisButton is temporarily hidden but kept for future use */}
            {/* authUser && showNav && <AegisButton /> */}
        </div>
    );
};

// Main App component with NotificationProvider
const App = () => {
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setShowSplash(false), 7000);
        return () => clearTimeout(t);
    }, []);

    if (showSplash) {
        return <SplashScreen />;
    }

    return (
        <ErrorBoundary>
            <NotificationProvider>
                <AppContent />
            </NotificationProvider>
        </ErrorBoundary>
    );
};

export default App;