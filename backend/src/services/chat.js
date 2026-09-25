// FILE: backend/src/services/chat.js
// Transaction-scoped chat between buyers, sellers, and riders.
// Session 6.11 — chat-first for livestock negotiation.
//
// Threads are tied to a listing OR a trade. Participants are only the
// parties involved. Phone numbers are never auto-shared — the chat is
// the interaction; a party can opt-in to reveal phone via the trade flow.
//
// Persistence: chat_threads.json, chat_messages.json

const storage = require('./storage');

const threads = storage.objectToMap(storage.load('chat_threads', {}));
const messages = storage.objectToMap(storage.load('chat_messages', {}));


// ─── Phone normalization ───────────────────────────────────────────────
// Africa-aware, Kenya-default phone normalizer.
// Canonical form: <country-code><national-number>  e.g. 254704519744
//
// Handles:
//   +254704519744   → 254704519744
//    254704519744   → 254704519744
//     0704519744    → 254704519744  (Kenya local, adds 254)
//      704519744    → 254704519744  (Kenya default)
//   +254 704 519744 → 254704519744
//   +256772123456   → 256772123456 (Uganda — kept as-is)
//
// Recognized African country codes (longest-match first):
const AFRICA_COUNTRY_CODES = [
  '254','256','255','257','250','211',        // East Africa
  '251','252','253','291','249',              // Horn / NE
  '234','233','225','221','223','226',        // West
  '27','263','260','265','258','244',         // Southern
  '20','218','216','212','213',               // North
  '237','243','242','241','240','235','236',  // Central
  '228','229','227','222','224',              // West (rest)
  '267','264','266','268','269',              // Southern (rest)
];
const DEFAULT_COUNTRY = '254';  // Kenya

function normId(id) {
  if (!id) return '';
  // 1. Strip everything except digits
  let digits = String(id).replace(/\D/g, '');
  if (!digits) return '';

  // 2. Check for a recognized African country code prefix (longest first)
  const sorted = [...AFRICA_COUNTRY_CODES].sort((a, b) => b.length - a.length);
  for (const cc of sorted) {
    if (digits.startsWith(cc)) {
      // If it's Kenya and the next digit is 0, strip the 0 (e.g. 2540704...)
      if (cc === DEFAULT_COUNTRY && digits.startsWith('2540')) {
        return '254' + digits.slice(4);
      }
      return digits;
    }
  }

  // 3. No country code recognized — assume default (Kenya)
  //    Strip leading 0 if present (local format)
  if (digits.startsWith('0')) digits = digits.slice(1);
  return DEFAULT_COUNTRY + digits;
}
function sameUser(a, b) {
  return normId(a) && normId(a) === normId(b);
}
function findParticipant(participants, target) {
  return participants.find(p => sameUser(p, target));
}

function persistThreads() {
  storage.save('chat_threads', storage.mapToObject(threads));
}
function persistMessages() {
  storage.save('chat_messages', storage.mapToObject(messages));
}

function genId(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

/**
 * Find an existing thread for this listing between these two users, or
 * create a new one.
 * context = { listingId?, tradeId?, passportId?, listingTitle?, listingPhotoUrl? }
 */
function findOrCreateThread({ listingId, tradeId, participants, context = {} }) {
  if (!participants || participants.length < 2) {
    return { error: 'At least 2 participants required' };
  }
  const clean = participants.filter(Boolean).map(String);

  // Look for an existing thread with same context key
  const contextKey = tradeId ? `trade:${tradeId}` : (listingId ? `listing:${listingId}` : null);
  if (contextKey) {
    for (const t of threads.values()) {
      if (t.contextKey === contextKey) {
        // Confirm all participants are already on it (normalized compare)
        const hasAll = clean.every(c => t.participants.some(p => sameUser(p, c)));
        if (hasAll) return { thread: t, existing: true };
      }
    }
  }

  const id = genId('THREAD');
  const now = new Date().toISOString();
  const thread = {
    id,
    contextKey,
    listingId: listingId || null,
    tradeId: tradeId || null,
    passportId: context.passportId || null,
    listingTitle: context.listingTitle || null,
    listingPhotoUrl: context.listingPhotoUrl || null,
    participants: clean,
    lastMessageAt: now,
    lastMessagePreview: null,
    lastMessageFrom: null,
    unread: {},              // { userId: count }
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  for (const p of clean) thread.unread[p] = 0;

  threads.set(id, thread);
  persistThreads();
  console.log('💬 Thread created:', id, '| participants:', clean.join(', '));
  return { thread, existing: false };
}

/**
 * Send a message in a thread.
 * from = userId (phone). text = message body (max 2000 chars).
 */
function sendMessage(threadId, from, text) {
  const thread = threads.get(threadId);
  if (!thread) return { error: 'Thread not found' };
  if (!from) return { error: 'Sender required' };
  if (!findParticipant(thread.participants, from)) {
    return { error: 'Not a participant in this thread' };
  }
  const body = String(text || '').trim();
  if (!body) return { error: 'Message body required' };
  if (body.length > 2000) return { error: 'Message too long (max 2000 chars)' };

  const id = genId('MSG');
  const now = new Date().toISOString();
  const msg = {
    id,
    threadId,
    from: String(from),
    text: body,
    sentAt: now,
    readBy: [String(from)],
  };
  messages.set(id, msg);

  // Update thread preview + unread
  thread.lastMessageAt = now;
  thread.lastMessagePreview = body.slice(0, 80);
  thread.lastMessageFrom = String(from);
  thread.updatedAt = now;
  thread.unread = thread.unread || {};
  for (const p of thread.participants) {
    if (p === String(from)) continue;
    thread.unread[p] = (thread.unread[p] || 0) + 1;
  }
  threads.set(threadId, thread);
  persistThreads();
  persistMessages();
  return { message: msg, thread };
}

/**
 * Get thread with all its messages, sorted ascending.
 */
function getThread(threadId, { viewerId } = {}) {
  const thread = threads.get(threadId);
  if (!thread) return { error: 'Thread not found' };
  if (viewerId && !findParticipant(thread.participants, viewerId)) {
    return { error: 'Not a participant in this thread' };
  }
  const all = [];
  for (const m of messages.values()) {
    if (m.threadId === threadId) all.push(m);
  }
  all.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  return { thread, messages: all };
}

/**
 * List a user's threads for the inbox, sorted by lastMessageAt desc.
 * Includes peer display info, last message preview, unread count.
 */
function listThreadsForUser(userId, { peerLookup } = {}) {
  if (!userId) return { threads: [] };
  const uid = String(userId);
  const mine = [];
  for (const t of threads.values()) {
    const myEntry = findParticipant(t.participants, uid);
    if (!myEntry) continue;
    if (t.archived) continue;
    const peers = t.participants.filter(p => !sameUser(p, uid));
    mine.push({
      id: t.id,
      listingId: t.listingId,
      tradeId: t.tradeId,
      passportId: t.passportId,
      listingTitle: t.listingTitle,
      listingPhotoUrl: t.listingPhotoUrl,
      peers,
      peerDisplay: peerLookup && typeof peerLookup === 'function'
        ? (peerLookup(peers[0]) || { id: peers[0], name: null })
        : { id: peers[0], name: null },
      lastMessageAt: t.lastMessageAt,
      lastMessagePreview: t.lastMessagePreview,
      lastMessageFrom: t.lastMessageFrom,
      unread: (t.unread && (t.unread[uid] !== undefined
        ? t.unread[uid]
        : (Object.entries(t.unread).find(([k]) => sameUser(k, uid)) || [null, 0])[1])) || 0,
      updatedAt: t.updatedAt,
    });
  }
  mine.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  return { threads: mine, total: mine.length };
}

/**
 * Mark all messages in a thread as read by this user.
 */
function markRead(threadId, userId) {
  const thread = threads.get(threadId);
  if (!thread) return { error: 'Thread not found' };
  const entry = findParticipant(thread.participants, userId);
  if (!entry) {
    return { error: 'Not a participant' };
  }
  // Clear unread counter (match normalized)
  thread.unread = thread.unread || {};
  for (const k of Object.keys(thread.unread)) {
    if (sameUser(k, userId)) thread.unread[k] = 0;
  }
  threads.set(threadId, thread);

  // Add user to readBy on each message not yet read
  let changed = false;
  for (const m of messages.values()) {
    if (m.threadId !== threadId) continue;
    m.readBy = m.readBy || [];
    if (!m.readBy.includes(String(userId))) {
      m.readBy.push(String(userId));
      messages.set(m.id, m);
      changed = true;
    }
  }
  persistThreads();
  if (changed) persistMessages();
  return { success: true, thread };
}

function getUnreadCount(userId) {
  if (!userId) return { count: 0 };
  let total = 0;
  for (const t of threads.values()) {
    if (!findParticipant(t.participants, userId)) continue;
    if (t.archived) continue;
    const mine = t.unread && Object.entries(t.unread).find(([k]) => sameUser(k, userId));
    total += (mine ? mine[1] : 0) || 0;
  }
  return { count: total };
}

function archiveThread(threadId, userId) {
  const thread = threads.get(threadId);
  if (!thread) return { error: 'Thread not found' };
  if (!findParticipant(thread.participants, userId)) {
    return { error: 'Not a participant' };
  }
  thread.archived = true;
  thread.archivedAt = new Date().toISOString();
  threads.set(threadId, thread);
  persistThreads();
  return { success: true };
}

function getStats() {
  const all = Array.from(threads.values());
  const msgs = Array.from(messages.values());
  return {
    threads: all.length,
    messages: msgs.length,
    activeThreads: all.filter(t => !t.archived).length,
  };
}

module.exports = {
  findOrCreateThread,
  sendMessage,
  getThread,
  listThreadsForUser,
  markRead,
  getUnreadCount,
  archiveThread,
  getStats,
  _threads: threads,
  _messages: messages,
};
