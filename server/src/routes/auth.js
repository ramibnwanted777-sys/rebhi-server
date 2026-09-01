const express = require('express');
const bcrypt = require('bcryptjs');
const { data, nextId, persist } = require('../db');
const { signToken } = require('../middleware/auth');
const contentFilter = require('../middleware/contentFilter');

const router = express.Router();

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, points: u.points,
    watchedToday: u.watchedToday, lastWatchDate: u.lastWatchDate,
    wheelSpun: !!u.wheelSpun, blocked: !!u.blocked, joinedAt: u.joinedAt
  };
}

function getUserById(id) { return data.users.find(u => u.id === Number(id)); }
function getUserByEmail(email) { return data.users.find(u => u.email === String(email).toLowerCase()); }

router.post('/signup', contentFilter, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'أكمل جميع الحقول' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'بريد إلكتروني غير صحيح' });
  if (password.length < 6) return res.status(400).json({ error: 'كلمة السر 6 محارف على الأقل' });
  if (name.length < 2) return res.status(400).json({ error: 'أدخل اسمك الكامل' });

  if (getUserByEmail(email)) return res.status(400).json({ error: 'هذا البريد مسجل بالفعل' });

  const user = {
    id: nextId('users'),
    name,
    email: String(email).toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10),
    points: 0,
    watchedToday: 0,
    lastWatchDate: new Date().toDateString(),
    wheelSpun: false,
    wheelDate: new Date().toDateString(),
    lastGameAt: 0,
    blocked: false,
    suspicion: 0,
    joinedAt: Date.now()
  };
  data.users.push(user);
  persist();
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'أدخل البريد وكلمة السر' });
  const user = getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'بيانات دخول غير صحيحة' });
  }
  if (user.blocked) return res.status(403).json({ error: 'الحساب موقوف' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', (req, res) => {
  const user = getUserById(req.headers['x-user-id'] || '');
  if (!user) return res.status(401).json({ error: 'غير مصرح' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
module.exports.publicUser = publicUser;
module.exports.getUserById = getUserById;
