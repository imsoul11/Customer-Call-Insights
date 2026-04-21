const express = require('express');
const { analyzeCall, quotaStatus, resetQuota } = require('../Controller/aiController');
const { createIpThrottle } = require('../middleware/ipThrottle');

const router = express.Router();

function parsePositiveInteger(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.floor(parsedValue) : fallback;
}

const analyzeCallThrottle = createIpThrottle({
  windowMs: parsePositiveInteger(process.env.AI_IP_WINDOW_MS, 10 * 60 * 1000),
  maxRequests: parsePositiveInteger(process.env.AI_IP_MAX_REQUESTS, 5),
});

router.post('/analyze-call', analyzeCallThrottle, analyzeCall);
router.get('/quota-status', quotaStatus);
router.post('/quota-reset', resetQuota);

module.exports = router;
