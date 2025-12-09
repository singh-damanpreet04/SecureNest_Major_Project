import { useState, useEffect } from 'react';
import PinRecovery from '../components/PinRecovery';
import ThemeSelector from '../components/ThemeSelector';
import { axiosInstance } from '../lib/axios';
import { toast } from 'react-toastify';

const SettingsPage = () => {
  // (Backup codes removed)
  
  // PIN Management State
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState('');
  const [settingPin, setSettingPin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);
  
  // PIN Recovery State
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  // Secure Chat management
  const [secureUsername, setSecureUsername] = useState('');
  const [securePin, setSecurePin] = useState('');
  const [secureLoading, setSecureLoading] = useState(false);
  const [lockedChats, setLockedChats] = useState([]); // [{ peerId, username }]
  const [allUsers, setAllUsers] = useState([]);

  // (Backup codes removed)

  const fetchUsersAndLocked = async () => {
    try {
      const [usersRes, lockedRes] = await Promise.all([
        axiosInstance.get('/messages/users'),
        axiosInstance.get('/chatlock/list')
      ]);
      const users = usersRes.data || [];
      const idToUser = Object.fromEntries(users.map(u => [u._id, u]));
      const locked = (lockedRes.data?.locked || []).map(item => {
        const u = idToUser[item.peerId];
        return {
          peerId: item.peerId,
          username: item.username || u?.username || u?.fullName || item.fullName || item.peerId,
          profilePic: item.profilePic || u?.profilePic
        };
      });
      setAllUsers(users);
      setLockedChats(locked);
    } catch (e) {
      // Non-fatal; just show empty
      setAllUsers([]);
      setLockedChats([]);
    }
  };

  // (Backup codes removed)

  useEffect(() => { 
    const checkPinStatus = async () => {
      try {
        console.log('Checking PIN status...');
        const res = await axiosInstance.get('/auth/recovery/pin/status');
        console.log('PIN status response:', res.data);
        const pinExists = !!res.data?.hasPin;
        console.log('Setting hasPin to:', pinExists);
        setHasPin(pinExists);
      } catch (error) {
        console.error('Error checking PIN status:', error);
        // Default to true to be safe (show change/forgot options)
        setHasPin(false);
      }
    };
    
    // Only check PIN status now (backup codes removed)
    Promise.all([
      checkPinStatus(),
    ]).catch(console.error);
  }, []);

  const setUserPin = async () => {
    if (!/^\d{4,8}$/.test(pin.trim())) return;
    setSettingPin(true);
    try {
      await axiosInstance.post('/auth/recovery/pin/set', { pin: pin.trim() });
      setHasPin(true);
      setPin('');
      toast.success('PIN set successfully');
    } catch (e) {
        console.error('Error setting PIN:', e);
        toast.error(e.response?.data?.message || 'Failed to set PIN');
    } finally { setSettingPin(false); }
  };

  const handleChangePin = async () => {
    if (!oldPin || !newPin) {
      toast.error('Please enter both old and new PINs');
      return;
    }
    if (!/^\d{4,8}$/.test(newPin.trim())) {
      toast.error('New PIN must be 4-8 digits');
      return;
    }
    setChangingPin(true);
    try {
      const res = await axiosInstance.post('/auth/recovery/pin/change', { oldPin: oldPin.trim(), newPin: newPin.trim() });
      toast.success(res.data.message);
      setOldPin('');
      setNewPin('');
    } catch (e) {
      console.error('Error changing PIN:', e);
      toast.error(e.response?.data?.message || 'Failed to change PIN');
    } finally {
      setChangingPin(false);
    }
  };

  
  // Handle successful PIN recovery
  const handlePinRecoverySuccess = async () => {
    try {
      // Verify the PIN status after recovery
      const res = await axiosInstance.get('/auth/recovery/pin/status');
      setHasPin(!!res.data?.hasPin);
      setShowRecoveryModal(false);
      toast.success('PIN has been successfully updated');
    } catch (error) {
      console.error('Error verifying PIN status after recovery:', error);
      // Fallback to setting hasPin to true if there's an error checking status
      setHasPin(true);
      setShowRecoveryModal(false);
      toast.success('PIN recovery completed successfully');
    }
  };

  // Removed WebAuthn register function and helpers
  // const registerPasskey = async () => { ... };
  // const b64urlToUint8 = (b64url) => { ... };
  // const toBufferSource = (val) => { ... };
  // const bytesToB64url = (buf) => { ... };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-6 md:mb-8">
        <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Security</h1>
            <p className="text-gray-400 mt-1">Customize theme, manage PIN, and secure chats.</p>
          </div>
        </div>
      </div>

      {/* Theme Customization Section */}
      <div className="mb-8">
        <ThemeSelector />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Secure Chat Management */}
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101826] to-[#0b1220] p-6 md:p-8 shadow-xl mt-8">
          <h2 className="text-xl md:text-2xl font-bold text-white">Secure Chat</h2>
          <p className="text-gray-400 mt-1">Lock or unlock chats by username. Actions require your PIN. If you haven't created a PIN, set it above first.</p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block text-sm text-gray-300">Username</label>
              <input value={secureUsername} onChange={e=>setSecureUsername(e.target.value)} placeholder="@username" className="w-full rounded-lg bg-[#0b1220] border border-white/10 px-4 py-2 text-white" />
              <label className="block text-sm text-gray-300">PIN</label>
              <input type="password" value={securePin} onChange={e=>setSecurePin(e.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" maxLength={8} placeholder="4–8 digit PIN" className="w-full rounded-lg bg-[#0b1220] border border-white/10 px-4 py-2 text-white" />
              <div className="flex gap-3">
                <button onClick={async()=>{
                  if (!secureUsername || !/^\d{4,8}$/.test(securePin)) { return; }
                  setSecureLoading(true);
                  try {
                    // Find user by username
                    let peer = allUsers.find(u => (u.username||'').toLowerCase() === secureUsername.replace(/^@/, '').toLowerCase());
                    if (!peer) {
                      // Refresh users once
                      const res = await axiosInstance.get('/messages/users');
                      setAllUsers(res.data || []);
                      peer = (res.data||[]).find(u => (u.username||'').toLowerCase() === secureUsername.replace(/^@/, '').toLowerCase());
                    }
                    if (!peer) { toast.error('User not found'); return; }
                    await axiosInstance.post('/chatlock/lock', { peerId: peer._id, pin: securePin });
                    toast.success('Chat locked');
                    setSecurePin('');
                    await fetchUsersAndLocked();
                  } catch (e) {
                    const code = e?.response?.data?.code;
                    const status = e?.response?.status;
                    if (code === 'NO_PIN') toast.error('Please create a PIN first in PIN Management');
                    else if (status === 400) toast.error('Invalid PIN');
                    else toast.error(e?.response?.data?.message || 'Failed to lock chat');
                  } finally { setSecureLoading(false); }
                }} disabled={secureLoading || !secureUsername || !/^\d{4,8}$/.test(securePin)} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">{secureLoading ? 'Locking…' : 'Lock chat'}</button>

                <button onClick={async()=>{
                  if (!secureUsername || !/^\d{4,8}$/.test(securePin)) { return; }
                  setSecureLoading(true);
                  try {
                    let peer = allUsers.find(u => (u.username||'').toLowerCase() === secureUsername.replace(/^@/, '').toLowerCase());
                    if (!peer) {
                      const res = await axiosInstance.get('/messages/users');
                      setAllUsers(res.data || []);
                      peer = (res.data||[]).find(u => (u.username||'').toLowerCase() === secureUsername.replace(/^@/, '').toLowerCase());
                    }
                    if (!peer) { toast.error('User not found'); return; }
                    await axiosInstance.post('/chatlock/unlock', { peerId: peer._id, pin: securePin });
                    toast.success('Chat unlocked');
                    setSecurePin('');
                    await fetchUsersAndLocked();
                  } catch (e) {
                    const code = e?.response?.data?.code;
                    const status = e?.response?.status;
                    if (code === 'NO_PIN') toast.error('Please create a PIN first in PIN Management');
                    else if (status === 400) toast.error('Invalid PIN');
                    else toast.error(e?.response?.data?.message || 'Failed to unlock chat');
                  } finally { setSecureLoading(false); }
                }} disabled={secureLoading || !secureUsername || !/^\d{4,8}$/.test(securePin)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50">{secureLoading ? 'Unlocking…' : 'Unlock chat'}</button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Locked Chats</h3>
                <button 
                  onClick={fetchUsersAndLocked}
                  className="text-sm text-gray-400 hover:text-white p-1 -mr-2"
                  title="Refresh list"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                    <path d="M16 16h5v5"/>
                  </svg>
                </button>
              </div>
              
              {lockedChats.length === 0 ? (
                <p className="text-gray-400 text-sm py-2">No locked chats yet. Lock a chat using the form on the left.</p>
              ) : (
                <ul className="space-y-2">
                  {lockedChats.map(item => (
                    <li key={item.peerId} className="flex items-center justify-between p-3 bg-[#0b1220]/50 rounded-lg border border-white/5 hover:bg-[#0b1220]/80 transition-colors">
                      <div className="flex items-center space-x-3">
                        {item.profilePic ? (
                          <img 
                            src={item.profilePic} 
                            alt={item.username}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                            {(item.username || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-white">{item.username}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-1 bg-red-900/30 text-red-300 rounded-full">
                          Locked
                        </span>
                        <button 
                          onClick={async() => {
                            if (!securePin) {
                              toast.error('Enter your PIN to unlock');
                              return;
                            }
                            if (!window.confirm(`Unlock chat with ${item.username}?`)) return;
                            setSecureLoading(true);
                            try {
                              await axiosInstance.post('/chatlock/unlock', { 
                                peerId: item.peerId, 
                                pin: securePin 
                              });
                              toast.success(`Unlocked chat with ${item.username}`);
                              fetchUsersAndLocked();
                              setSecurePin('');
                            } catch (e) {
                              const status = e?.response?.status;
                              if (status === 400) {
                                toast.error('Invalid PIN');
                              } else {
                                toast.error(e?.response?.data?.message || 'Failed to unlock chat');
                              }
                            } finally { 
                              setSecureLoading(false); 
                            }
                          }}
                          disabled={!securePin || secureLoading}
                          className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {secureLoading ? 'Unlocking...' : 'Unlock'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101826] to-[#0b1220] p-6 md:p-8 shadow-xl">
          <h2 className="text-xl md:text-2xl font-bold text-white">Tips</h2>
          <ul className="mt-4 list-disc list-inside space-y-2 text-gray-300">
            <li>Print or securely store your backup codes offline.</li>
            <li>Never share your codes. Treat them like passwords.</li>
            <li>Use strong unique passwords and enable 2FA where possible.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101826] to-[#0b1220] p-6 md:p-8 shadow-xl">
          <h2 className="text-xl md:text-2xl font-bold text-white">Secure Chat PIN</h2>
          
          {!hasPin ? (
            <div className="mt-4 space-y-4">
              <p className="text-gray-400">Set up a 4-8 digit PIN to secure your chat access.</p>
              <div className="flex flex-col gap-3">
                <input 
                  type="password"
                  value={pin} 
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))} 
                  maxLength={8} 
                  inputMode="numeric" 
                  placeholder="Enter 4-8 digit PIN" 
                  className="rounded-lg bg-[#0b1220] border border-white/10 px-4 py-2 text-white" 
                />
                <button 
                  onClick={setUserPin} 
                  disabled={settingPin || !/^\d{4,8}$/.test(pin.trim())} 
                  className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {settingPin ? 'Saving...' : 'Generate PIN'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-green-400 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-green-200 font-medium">PIN is set up</p>
                    <p className="text-green-400 text-sm mt-1">Your chat access is secured with a PIN</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Change PIN</h3>
                  <div className="space-y-3">
                    <input 
                      type="password"
                      value={oldPin} 
                      onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))} 
                      maxLength={8} 
                      inputMode="numeric" 
                      placeholder="Current PIN" 
                      className="w-full rounded-lg bg-[#0b1220] border border-white/10 px-4 py-2 text-white" 
                    />
                    <input 
                      type="password"
                      value={newPin} 
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} 
                      maxLength={8} 
                      inputMode="numeric" 
                      placeholder="New PIN" 
                      className="w-full rounded-lg bg-[#0b1220] border border-white/10 px-4 py-2 text-white" 
                    />
                    <button 
                      onClick={handleChangePin} 
                      disabled={changingPin || !oldPin || !newPin || !/^\d{4,8}$/.test(newPin.trim())} 
                      className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {changingPin ? 'Updating...' : 'Update PIN'}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">Forgot your PIN?</h3>
                  <p className="text-gray-400 text-sm mb-3">You can recover your PIN by verifying your account password.</p>
                  <button 
                    onClick={() => setShowRecoveryModal(true)}
                    className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    Recover PIN
                  </button>
                </div>
              </div>
              
              {showRecoveryModal && (
                <PinRecovery 
                  onClose={() => setShowRecoveryModal(false)}
                  onSuccess={handlePinRecoverySuccess}
                />
              )}
            </div>
          )}
        </section>

      </div>

      {/* (Backup codes modal removed) */}
    </div>
  );
};

export default SettingsPage;