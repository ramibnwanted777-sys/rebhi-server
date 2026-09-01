const { data } = require('../db');

function filterContent(text) {
  if (!text) return { safe: true, matches: [] };
  const str = String(text).toLowerCase();
  const matches = data.contentfilter_rules.filter(r => str.includes(r.pattern.toLowerCase()));
  return { safe: matches.length === 0, matches };
}

function contentFilter(req, res, next) {
  const fieldsToCheck = req.body ? [req.body.name, req.body.text, req.body.account, req.body.detail] : [];
  for (const f of fieldsToCheck) {
    const result = filterContent(f);
    if (!result.safe) {
      return res.status(400).json({
        error: 'المحتوى المقدّم مخالف لسياسة الاستخدام (محتوى +18 أو قمار غير مسموح)',
        blocked: result.matches.map(m => m.category)
      });
    }
  }
  next();
}

module.exports = contentFilter;
