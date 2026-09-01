const express = require('express');
const { data, nextId, persist } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const ADMIN_EMAIL = 'admin@rebhi.dz';

function isAdmin(req) { return req.user.email === ADMIN_EMAIL; }

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'غير مصرح' });
  next();
}

router.get('/stats', requireAdmin, (req, res) => {
  const pending = data.withdrawals.filter(w => w.status === 'pending');
  const totalPendingDzd = pending.reduce((s, r) => s + r.dzd, 0);
  res.json({ pendingCount: pending.length, totalPendingDzd, totalUsers: data.users.length });
});

router.get('/withdrawals', requireAdmin, (req, res) => {
  res.json([...data.withdrawals].sort((a, b) => b.date - a.date));
});

router.post('/withdrawals/:id/approve', requireAdmin, (req, res) => {
  const w = data.withdrawals.find(x => x.id === Number(req.params.id));
  if (!w) return res.status(404).json({ error: 'غير موجود' });
  if (w.status !== 'pending') return res.status(400).json({ error: 'تمت معالجته مسبقًا' });
  w.status = 'approved';
  data.audit_log.unshift({ id: nextId('audit_log'), action: 'withdraw_approve', detail: `${w.name} ${w.points}pts`, date: Date.now() });
  persist();
  res.json({ ok: true });
});

router.post('/withdrawals/:id/reject', requireAdmin, (req, res) => {
  const w = data.withdrawals.find(x => x.id === Number(req.params.id));
  if (!w) return res.status(404).json({ error: 'غير موجود' });
  if (w.status !== 'pending') return res.status(400).json({ error: 'تمت معالجته مسبقًا' });
  w.status = 'rejected';
  const u = data.users.find(x => x.id === w.userId);
  if (u) u.points += w.points;
  data.audit_log.unshift({ id: nextId('audit_log'), action: 'withdraw_reject', detail: `${w.name} ${w.points}pts`, date: Date.now() });
  persist();
  res.json({ ok: true });
});

router.get('/users', requireAdmin, (req, res) => {
  res.json(data.users.map(u => ({ id: u.id, name: u.name, email: u.email, points: u.points, blocked: u.blocked, joinedAt: u.joinedAt })).sort((a, b) => b.points - a.points));
});

router.post('/users/:id/block', requireAdmin, (req, res) => {
  const u = data.users.find(x => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  u.blocked = true;
  data.audit_log.unshift({ id: nextId('audit_log'), action: 'user_blocked', detail: `id=${u.id} ${u.email}`, date: Date.now() });
  persist();
  res.json({ ok: true });
});

router.post('/users/:id/unblock', requireAdmin, (req, res) => {
  const u = data.users.find(x => x.id === Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  u.blocked = false;
  persist();
  res.json({ ok: true });
});

router.get('/filterRules', requireAdmin, (req, res) => {
  res.json(data.contentfilter_rules);
});

router.post('/filterRules', requireAdmin, (req, res) => {
  const { pattern, category } = req.body;
  if (!pattern || !category) return res.status(400).json({ error: 'أكمل النمط والفئة' });
  if (!data.contentfilter_rules.some(r => r.pattern === pattern)) {
    data.contentfilter_rules.push({ id: nextId('contentfilter_rules'), pattern, category, date: Date.now() });
    persist();
  }
  res.json(data.contentfilter_rules);
});

router.delete('/filterRules/:id', requireAdmin, (req, res) => {
  data.contentfilter_rules = data.contentfilter_rules.filter(r => r.id !== Number(req.params.id));
  persist();
  res.json(data.contentfilter_rules);
});

router.get('/auditLog', requireAdmin, (req, res) => {
  res.json([...data.audit_log].sort((a, b) => b.date - a.date).slice(0, 100));
});

module.exports = router;
