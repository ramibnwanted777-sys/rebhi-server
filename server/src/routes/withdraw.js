const express = require('express');
const { data, nextId, persist } = require('../db');
const { authRequired } = require('../middleware/auth');
const contentFilter = require('../middleware/contentFilter');

const router = express.Router();
router.use(authRequired);

const POINT_VALUE_DZD = 0.01;
const MIN_WITHDRAW = 5000;

router.post('/', contentFilter, (req, res) => {
  const { points, method, account } = req.body;
  const u = req.user;
  const amount = Number(points);
  if (!amount || amount < MIN_WITHDRAW) return res.status(400).json({ error: `الحد الأدنى للسحب هو ${MIN_WITHDRAW} نقطة` });
  if (amount > u.points) return res.status(400).json({ error: 'رصيدك لا يكفي' });
  if (!method || !account) return res.status(400).json({ error: 'أكمل بيانات الاستلام' });

  u.points -= amount;
  data.transactions.unshift({ id: nextId('transactions'), userId: u.id, type: 'withdraw', amount, meta: method, date: Date.now() });

  const wd = {
    id: nextId('withdrawals'),
    userId: u.id,
    email: u.email,
    name: u.name,
    points: amount,
    dzd: +(amount * POINT_VALUE_DZD).toFixed(2),
    method,
    account,
    status: 'pending',
    date: Date.now()
  };
  data.withdrawals.push(wd);
  persist();
  res.status(201).json(wd);
});

module.exports = router;
