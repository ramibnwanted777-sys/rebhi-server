const jwt = require('jsonwebtoken');
const { data } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'rebhi_super_secret_key_change_in_production_2026';
const JWT_EXPIRES = '7d';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = data.users.find(u => u.id === payload.id);
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    if (user.blocked) return res.status(403).json({ error: 'الحساب موقوف' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'جلسة منتهية، سجّل الدخول مجددًا' });
  }
}

module.exports = { signToken, authRequired, JWT_SECRET };
