const express = require('express');
const { data, nextId, persist } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const DAILY_LIMIT = 20;
const POINTS_PER_AD = 10;

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, points: u.points,
    watchedToday: u.watchedToday, lastWatchDate: u.lastWatchDate,
    wheelSpun: !!u.wheelSpun, blocked: !!u.blocked, joinedAt: u.joinedAt
  };
}

function isToday(str) { return str === new Date().toDateString(); }

function addTransaction(user, type, amount, meta) {
  data.transactions.unshift({ id: nextId('transactions'), userId: user.id, type, amount, meta, date: Date.now() });
  return data.transactions[0];
}

router.get('/me', (req, res) => {
  const u = req.user;
  if (!isToday(u.lastWatchDate)) { u.watchedToday = 0; u.lastWatchDate = new Date().toDateString(); }
  if (!isToday(u.wheelDate)) { u.wheelSpun = false; u.wheelDate = new Date().toDateString(); }
  persist();
  const tx = data.transactions.filter(t => t.userId === u.id).sort((a, b) => b.date - a.date);
  res.json({ user: publicUser(u), transactions: tx });
});

router.post('/ad/complete', (req, res) => {
  const u = req.user;
  if (!isToday(u.lastWatchDate)) { u.watchedToday = 0; u.lastWatchDate = new Date().toDateString(); }
  if (u.watchedToday >= DAILY_LIMIT) return res.status(400).json({ error: 'استنفدت حصتك اليومية' });

  const lastAd = req.body && req.body.startedAt ? Number(req.body.startedAt) : null;
  if (lastAd && (Date.now() - lastAd) < 3000) {
    u.suspicion = (u.suspicion || 0) + 1;
    if (u.suspicion >= 2) {
      u.blocked = true;
      data.audit_log.unshift({ id: nextId('audit_log'), action: 'user_blocked', detail: `Auto-click: ${u.email}`, date: Date.now() });
      persist();
      return res.status(403).json({ error: 'تم اكتشاف نشاط آلي، تم إيقاف الحساب' });
    }
    persist();
    return res.status(400).json({ error: 'مدة العرض غير كافية' });
  }

  u.points += POINTS_PER_AD;
  u.watchedToday += 1;
  addTransaction(u, 'earn', POINTS_PER_AD);
  persist();
  res.json({ user: publicUser(u), points: POINTS_PER_AD });
});

router.post('/wheel', (req, res) => {
  const u = req.user;
  if (!isToday(u.wheelDate)) { u.wheelSpun = false; u.wheelDate = new Date().toDateString(); }
  if (u.wheelSpun) return res.status(400).json({ error: 'العجلة مغنولة اليوم بالفعل' });

  const prizes = [5, 0, 20, 10, 5, 50, 0, 15];
  const amount = prizes[Math.floor(Math.random() * prizes.length)];
  u.wheelSpun = true;
  if (amount > 0) {
    u.points += amount;
    addTransaction(u, 'earn', amount, 'عجلة الحظ');
  }
  persist();
  res.json({ user: publicUser(u), amount });
});

const GAME_COOLDOWN_MS = 30000;
const GAME_REWARD = 5;

router.post('/game/reward', (req, res) => {
  const u = req.user;
  if (Date.now() - (u.lastGameAt || 0) < GAME_COOLDOWN_MS) {
    return res.status(400).json({ error: 'انتظر قليلاً بين الألعاب' });
  }
  u.points += GAME_REWARD;
  u.lastGameAt = Date.now();
  addTransaction(u, 'earn', GAME_REWARD, 'لعبة');
  persist();
  res.json({ user: publicUser(u), points: GAME_REWARD });
});

module.exports = router;
module.exports.publicUser = publicUser;
