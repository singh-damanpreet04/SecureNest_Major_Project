import { useChatStore } from "../store/useChatStore.js";
import { useEffect, useState } from "react";
import SidebarSkeleton from "./skeletons/SidebarSkeleton.jsx";
import {Users, Lock, Pin} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";

const Sidebar = () => {
    const {getUsers, users, selectedUser, setSelectedUser, isUsersLoading, listLockedChats, unreadCounts, pinnedChats, pinChat, unpinChat, getPinnedChats} = useChatStore();
    const { onlineUsers } = useAuthStore();
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [lockedSet, setLockedSet] = useState(new Set());

    console.log('Rendering Sidebar with users:', users);
    console.log('isUsersLoading:', isUsersLoading);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                await getUsers();
                setError(null);
            } catch (err) {
                console.error('Error in fetchUsers:', err);
                setError('Failed to load contacts. Please refresh the page.');
            }
        };
        
        fetchUsers();
        // Also fetch locked chats to show lock badges
        (async () => {
            try {
                const locked = await listLockedChats();
                setLockedSet(new Set(locked.map(l => l.peerId?.toString())));
            } catch (err) {
                console.debug('Could not fetch locked chats', err);
            }
        })();
        // Fetch pinned chats only on initial load
        (async () => {
            try {
                await getPinnedChats();
            } catch (err) {
                console.debug('Could not fetch pinned chats', err);
            }
        })();
    }, []); // Remove dependencies to only run once on mount

    if (isUsersLoading) {
        return <SidebarSkeleton />;
    }
    
    if (error) {
        return (
            <div className="h-full w-20 lg:w-80 bg-gray-900 p-4 text-red-400">
                {error}
            </div>
        );
    }
    return (
        <div className="h-full w-20 lg:w-80 relative overflow-visible sidebar-glass-box" style={{boxSizing:'border-box', maxWidth:'100%'}}>
            {/* Strong, visible animated glowing gradient border */}
            <div className="sidebar-glow-visual absolute -inset-2 rounded-[1.5rem] z-0 pointer-events-none" />
            <aside className="h-full flex flex-col relative z-10">
                {/* Functional Search Bar ONLY at the Top */}
                <div className="px-4 pt-6 pb-2 bg-transparent">
                    <div className="relative group">
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-primary placeholder-gray-400 focus:outline-none border border-secondary shadow-md transition-all backdrop-blur-md sidebar-search-visual"
                            placeholder="Search or start new chat"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            aria-label="Search contacts"
                        />
                        <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                <style jsx>{`
                  .sidebar-search-visual {
                    box-shadow:
                      0 2px 16px 0 #818cf8cc,
                      0 4px 24px 2px #60a5fa88,
                      0 1.5px 8px 0 #a78bfa55,
                      0 2px 0 0 #1e293b inset,
                      0 2px 8px 0 #fff2 inset;
                    border: 1.5px solid #312e81cc;
                    transition: box-shadow 0.18s, border 0.18s;
                  }
                  .sidebar-search-visual:focus {
                    box-shadow:
                      0 4px 32px 4px #818cf8ee,
                      0 8px 40px 8px #60a5fa99,
                      0 2px 16px 2px #a78bfa88,
                      0 2px 0 0 #1e293b inset,
                      0 2px 12px 0 #fff4 inset;
                    border: 2px solid #818cf8ee;
                  }
                `}</style>
                {/* Contacts Heading immediately below */}
                <div className="p-4 border-b border-gray-800 bg-transparent">
                    <div className="flex items-center gap-2 animate-fade-in">
                        <Users className="w-5 h-5 sidebar-glow-icon" />
                        <span className="font-semibold gradient-text text-lg hidden lg:block tracking-wide drop-shadow-md">Contacts</span>
                    </div>
                </div>

                <div className="overflow-y-auto w-full max-w-full py-3" style={{boxSizing:'border-box'}}>
                    {users && users.length > 0 ?
                        (() => {
                            console.log('Sorting users. Pinned chats:', pinnedChats);
                            // Filter users based on search
                            const filteredUsers = users.filter(u => {
                                const q = search.toLowerCase();
                                return (
                                    u.fullName?.toLowerCase().includes(q) ||
                                    u.username?.toLowerCase().includes(q)
                                );
                            });
                            
                            // Sort users: pinned chats first (in pin order), then unpinned
                            const sortedUsers = [...filteredUsers].sort((a, b) => {
                                const aPinnedIndex = pinnedChats.indexOf(a._id);
                                const bPinnedIndex = pinnedChats.indexOf(b._id);
                                
                                console.log(`Comparing ${a._id} (pinned: ${aPinnedIndex}) with ${b._id} (pinned: ${bPinnedIndex})`);
                                
                                // Both pinned: sort by pin order (earlier pinned = higher priority)
                                if (aPinnedIndex !== -1 && bPinnedIndex !== -1) {
                                    return aPinnedIndex - bPinnedIndex;
                                }
                                
                                // A pinned, B not: A comes first
                                if (aPinnedIndex !== -1 && bPinnedIndex === -1) {
                                    return -1;
                                }
                                
                                // B pinned, A not: B comes first
                                if (aPinnedIndex === -1 && bPinnedIndex !== -1) {
                                    return 1;
                                }
                                
                                // Both not pinned: maintain original order from server
                                return 0;
                            });
                            
                            console.log('Final sorted users:', sortedUsers.map(u => ({ id: u._id, name: u.fullName })));
                            return sortedUsers;
                        })().map((user) => (
                        <button
                         key={user._id}
                         onClick={() => setSelectedUser(user)}
                         className={`w-full max-w-full flex items-center gap-3 p-3 transition-all duration-200 rounded-xl backdrop-blur-[2px] border border-secondary shadow-md box-border overflow-hidden
                            ${selectedUser?._id === user._id 
                                ? "bg-secondary border-l-4 shadow-md animate-float" 
                                : "hover:bg-secondary hover:opacity-80"
                         }`}
                         style={{
                            backgroundColor: selectedUser?._id === user._id ? 'var(--accent)' : undefined,
                            borderLeftColor: selectedUser?._id === user._id ? 'var(--accent)' : undefined
                         }}
                        >
                            <div className="relative mx-auto lg:mx-0">
                            {user.profilePic || user.avatar ? (
                                <img 
                                    src={user.profilePic || user.avatar}
                                    alt={user.username}
                                    className="w-12 h-12 rounded-full object-cover"
                                    onError={(e) => {
                                        // If image fails to load, show initials
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div className={`${user.profilePic || user.avatar ? 'hidden' : 'flex'} w-12 h-12 rounded-full bg-indigo-600 items-center justify-center text-white font-medium`}>
                                {user.fullName 
                                    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                                    : (user.username || 'U').charAt(0).toUpperCase()
                                }
                            </div>
                            {onlineUsers.includes(user._id) && (
                                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full ring-2 ring-zinc-900"></span>
                            )}
                            {lockedSet.has(user._id?.toString()) && (
                                <span title="Locked chat" className="absolute -top-1 -right-1 bg-amber-500 text-zinc-900 rounded-full p-1 shadow">
                                    <Lock className="w-3 h-3" />
                                </span>
                            )}
                        </div>
                            {/*User Info Only visible on larger screens*/}
                            <div className="hidden lg:block text-left min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <div className="font-medium truncate">{user.fullName}</div>
                                    {pinnedChats.includes(user._id) && (
                                        <Pin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                    )}
                                </div>
                                <div className="text-xs text-zinc-500 truncate">{user.username}</div>
                                <div className="text-sm text-zinc-400">
                                    {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                                </div>

                            </div>

                            {/* Unread badge (WhatsApp-style) */}
                            {Number(unreadCounts?.[user._id]) > 0 && selectedUser?._id !== user._id && (
                              <div className="ml-auto">
                                <span
                                  className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-green-600 text-white text-xs font-bold shadow-md border border-white/10"
                                  title={`${unreadCounts[user._id]} unread`}
                                >
                                  {unreadCounts[user._id] > 99 ? '99+' : unreadCounts[user._id]}
                                </span>
                              </div>
                            )}

                        </button>
                        
                    )) : (
                        <div className="text-center text-gray-400 p-4">
                            No contacts found
                        </div>
                    )}
                </div>

            </aside>
        </div>
    );
};

// --- Custom styles for glassmorphism, gradients, and animations ---
<style jsx>{`
.sidebar-glass-box, .sidebar-glass-box * {
  box-sizing: border-box;
  max-width: 100%;
}

.sidebar-glass-box {
  background: rgba(15, 23, 42, 0.92);
  border-radius: 1.25rem;
  box-shadow:
    0 2px 24px 2px #60a5fa44,
    0 0 32px 8px #818cf888,
    0 8px 32px 0 rgba(31, 38, 135, 0.20),
    0 1.5px 8px 0 rgba(59,130,246,0.13);
  backdrop-filter: blur(22px) saturate(1.35);
  border: 2.5px solid transparent;
  position: relative;
  overflow: visible;
}

/* Strong, visible animated glowing gradient border using a real div */
.sidebar-glow-visual {
  background: conic-gradient(
    from 180deg,
    #60a5fa 0deg,
    #818cf8 90deg,
    #a78bfa 180deg,
    #818cf8 270deg,
    #60a5fa 360deg
  );
  filter: blur(10px) brightness(1.3) drop-shadow(0 0 24px #60a5fa88);
  opacity: 0.7;
  border-radius: 1.5rem;
  box-shadow:
    0 0 0 6px #60a5fa44,
    0 0 32px 8px #818cf888,
    0 6px 32px 0 #60a5fa33;
  animation: sidebarGlowSpin 7s linear infinite;
}
@keyframes sidebarGlowSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.sidebar-glow-border {
  border-radius: 1rem;
  background: linear-gradient(120deg, #60a5fa 0%, #818cf8 50%, #a78bfa 100%);
  filter: blur(18px) brightness(1.3);
  opacity: 0.18;
  animation: sidebarGlow 5s linear infinite alternate;
}
@keyframes sidebarGlow {
  0% { opacity: 0.12; filter: blur(16px) brightness(1.1); }
  100% { opacity: 0.23; filter: blur(22px) brightness(1.4); }
}
.sidebar-glow-icon {
  color: #60a5fa;
  filter: drop-shadow(0 0 6px #60a5fa88);
  animation: iconGlow 2.5s ease-in-out infinite alternate;
}
@keyframes iconGlow {
  0% { filter: drop-shadow(0 0 4px #60a5fa88); }
  100% { filter: drop-shadow(0 0 12px #818cf888); }
}
.animate-fade-in {
  animation: fadeInUp 1.1s cubic-bezier(.39,.575,.565,1.000) both;
}
@keyframes fadeInUp {
  0% { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
}
.gradient-text {
  background: linear-gradient(90deg, #60a5fa, #818cf8, #a78bfa, #818cf8, #60a5fa);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradientMove 8s ease infinite;
}
@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`}</style>

export default Sidebar;