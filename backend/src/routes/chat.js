// FILE: backend/src/routes/chat.js
// Session 6.11 — chat routes for listing/trade negotiation.
const express = require('express');
const router = express.Router();
const chat = require('../services/chat');
const shamba = require('../services/shamba');
const riders = require('../services/riders');

// Best-effort peer display lookup by user ID (phone). Currently resolves
// via livestock owners; expandable to riders/vets/etc. later.
function peerLookup(userId) {
  if (!userId) return null;
  try {
    const all = shamba._livestock ? Array.from(shamba._livestock.values()) : [];
    for (const a of all) {
      const phone = a.ownerPhone || (a.ownerId && String(a.ownerId).startsWith('+') ? a.ownerId : null);
      if (phone && String(phone).endsWith(String(userId).slice(-9))) {
        return { id: userId, name: a.ownerName || null, role: 'farmer' };
      }
    }
  } catch (e) { /* silent */ }
  try {
    const riderList = riders._riders ? Array.from(riders._riders.values()) : [];
    for (const r of riderList) {
      if (String(r.phone || '').endsWith(String(userId).slice(-9))) {
        return { id: userId, name: r.fullName || null, role: 'rider' };
      }
    }
  } catch (e) { /* silent */ }
  return { id: userId, name: null, role: 'unknown' };
}

/**
 * POST /api/chat/threads
 * Body: { listingId?, tradeId?, participants: [userId], context? }
 * Creates or returns existing thread.
 */
router.post('/threads', (req, res) => {
  try {
    const { listingId, tradeId, participants, context } = req.body || {};
    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ success: false, message: 'participants array required' });
    }
    const result = chat.findOrCreateThread({
      listingId, tradeId, participants, context: context || {},
    });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, thread: result.thread, existing: !!result.existing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/chat/threads?userId=...
 * Inbox: user's threads with peer display + last message + unread.
 */
router.get('/threads', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
    const result = chat.listThreadsForUser(userId, { peerLookup });
    res.json({ success: true, threads: result.threads, total: result.total });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/chat/threads/:id?viewerId=...
 * Full thread with messages.
 */
router.get('/threads/:id', (req, res) => {
  try {
    const viewerId = req.query.viewerId;
    const result = chat.getThread(req.params.id, { viewerId });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, thread: result.thread, messages: result.messages });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/chat/threads/:id/messages
 * Body: { from, text }
 */
router.post('/threads/:id/messages', (req, res) => {
  try {
    const { from, text } = req.body || {};
    if (!from) return res.status(400).json({ success: false, message: 'from required' });
    if (!text) return res.status(400).json({ success: false, message: 'text required' });
    const result = chat.sendMessage(req.params.id, from, text);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, message: result.message, thread: result.thread });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/chat/threads/:id/read
 * Body: { userId }
 */
router.post('/threads/:id/read', (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
    const result = chat.markRead(req.params.id, userId);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/chat/unread?userId=...
 */
router.get('/unread', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
    const result = chat.getUnreadCount(userId);
    res.json({ success: true, count: result.count });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/chat/threads/:id/archive
 * Body: { userId }
 */
router.post('/threads/:id/archive', (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
    const result = chat.archiveThread(req.params.id, userId);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/chat/stats
 */
router.get('/stats', (req, res) => {
  res.json({ success: true, stats: chat.getStats() });
});

module.exports = router;
