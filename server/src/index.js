const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const { data, nextId, persist } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const withdrawRoutes = require('./routes/withdraw');
const adminRoutes = require('./routes/admin');

function ensureAdmin() {
  const ADMIN_EMAIL = 'admin@rebhi.dz';
  if (!data.users.some(u => u.email === ADMIN_EMAIL)) {
    data.users.push({
      id: nextId('users'),
      name: 'مدير ربحي',
      email: ADMIN_EMAIL,
      passwordHash: bcrypt.hashSync('Admin@2026', 10),
      points: 0,
      watchedToday: 0,
      lastWatchDate: new Date().toDateString(),
      wheelSpun: false,
      wheelDate: new Date().toDateString(),
      lastGameAt: 0,
      blocked: false,
      suspicion: 0,
      joinedAt: Date.now()
    });
    persist(true);
    console.log('Admin account created: admin@rebhi.dz / Admin@2026');
  }
}
ensureAdmin();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rebhi server listening on http://0.0.0.0:${PORT}`);
});
