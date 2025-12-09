import User from "../models/user.models.js";
import bcrypt from "bcryptjs";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 15 * 1000; // 15 seconds
const UNLOCK_TTL_MS = 15 * 60 * 1000; // 15 minutes

function findLockEntry(user, peerId) {
  const idStr = peerId.toString();
  const entry = (user.lockedChats || []).find(e => e.peerId?.toString() === idStr);
  return entry;
}

// List all locked chats for current user
export const listLockedChats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('lockedChats');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const peerIds = (user.lockedChats || [])
      .filter(e => e.locked && e.peerId)
      .map(e => e.peerId);
    if (peerIds.length === 0) return res.status(200).json({ locked: [] });
    const peers = await User.find({ _id: { $in: peerIds } })
      .select('_id username fullName profilePic');
    const peerMap = new Map(peers.map(p => [p._id.toString(), p]));
    const locked = peerIds.map(id => {
      const key = id.toString();
      const p = peerMap.get(key);
      return {
        peerId: key,
        username: p?.username || undefined,
        fullName: p?.fullName || undefined,
        profilePic: p?.profilePic || undefined,
      };
    });
    return res.status(200).json({ locked });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to list locked chats' });
  }
};

function ensureLockEntry(user, peerId) {
  let entry = findLockEntry(user, peerId);
  if (!entry) {
    entry = { peerId, locked: false, failedAttempts: [] };
    user.lockedChats = [...(user.lockedChats || []), entry];
  }
  return entry;
}

export const getLockStatus = async (req, res) => {
  try {
    const { peerId } = req.params;
    const user = await User.findById(req.user._id).select('lockedChats');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const entry = findLockEntry(user, peerId) || { locked: false };
    const now = Date.now();
    const cooldownRemaining = entry.cooldownUntil ? Math.max(0, entry.cooldownUntil.getTime() - now) : 0;
    return res.status(200).json({ locked: !!entry.locked, cooldownRemaining });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to get lock status' });
  }
};

export const lockChat = async (req, res) => {
  try {
    const { peerId, pin } = req.body || {};
    if (!peerId) return res.status(400).json({ message: 'peerId is required' });
    const user = await User.findById(req.user._id).select('lockedChats pinHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.pinHash) return res.status(400).json({ code: 'NO_PIN', message: 'No PIN set. Please create a PIN first.' });
    if (!pin) return res.status(400).json({ message: 'PIN is required to lock a chat' });
    const ok = await bcrypt.compare(String(pin).trim(), user.pinHash);
    if (!ok) return res.status(400).json({ message: 'Invalid PIN' });
    const entry = ensureLockEntry(user, peerId);
    entry.locked = true;
    await user.save();
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to lock chat' });
  }
};

export const unlockChat = async (req, res) => {
  try {
    const { peerId, pin } = req.body || {};
    if (!peerId) return res.status(400).json({ message: 'peerId is required' });
    const user = await User.findById(req.user._id).select('lockedChats pinHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.pinHash) return res.status(400).json({ code: 'NO_PIN', message: 'No PIN set. Please create a PIN first.' });
    if (!pin) return res.status(400).json({ message: 'PIN is required to unlock a chat' });
    const ok = await bcrypt.compare(String(pin).trim(), user.pinHash);
    if (!ok) return res.status(401).json({ message: 'Invalid PIN' });
    const entry = ensureLockEntry(user, peerId);
    entry.locked = false;
    entry.failedAttempts = [];
    entry.cooldownUntil = undefined;
    await user.save();
    // Also clear unlock cookie
    res.clearCookie(`chat_unlock_${peerId}`, { httpOnly: true, sameSite: 'lax' });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to unlock chat' });
  }
};

export const verifyChatPin = async (req, res) => {
  try {
    const { peerId, pin } = req.body || {};
    if (!peerId || !pin) return res.status(400).json({ message: 'peerId and pin are required' });
    const user = await User.findById(req.user._id).select('pinHash lockedChats');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.pinHash) return res.status(400).json({ message: 'PIN not set' });

    const entry = ensureLockEntry(user, peerId);
    const now = new Date();

    // Cooldown check
    if (entry.cooldownUntil && entry.cooldownUntil > now) {
      return res.status(429).json({ message: 'Too many attempts. Please wait.', cooldownRemaining: entry.cooldownUntil - now });
    }

    // Prune attempts older than window
    entry.failedAttempts = (entry.failedAttempts || []).filter(t => now - new Date(t) < ATTEMPT_WINDOW_MS);
    if (entry.failedAttempts.length >= MAX_ATTEMPTS) {
      entry.cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);
      await user.save();
      return res.status(429).json({ message: 'Too many attempts. Please wait.', cooldownRemaining: COOLDOWN_MS });
    }

    const ok = await bcrypt.compare(String(pin).trim(), user.pinHash);
    if (!ok) {
      entry.failedAttempts.push(now);
      if (entry.failedAttempts.length >= MAX_ATTEMPTS) {
        entry.cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);
      }
      await user.save();
      return res.status(400).json({ message: 'Invalid PIN' });
    }

    // Success: issue short-lived unlock cookie
    entry.failedAttempts = [];
    entry.cooldownUntil = undefined;
    await user.save();
    res.cookie(`chat_unlock_${peerId}`, '1', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: UNLOCK_TTL_MS
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to verify PIN' });
  }
};

// Helper used by messages controller to check access
export async function requireUnlockedOrAllowed(req, userId, peerId) {
  const user = await User.findById(userId).select('lockedChats');
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const entry = (user.lockedChats || []).find(e => e.peerId?.toString() === peerId.toString());
  if (!entry || !entry.locked) return true; // not locked => allowed
  const cookieName = `chat_unlock_${peerId}`;
  const token = req.cookies?.[cookieName];
  if (token === '1') return true;
  const err = new Error('Chat locked. PIN required');
  err.status = 423; // Locked
  throw err;
}
