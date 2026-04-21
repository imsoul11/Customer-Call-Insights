const requestBuckets = new Map();

function getClientIp(req) {
  const forwardedHeader = req.headers['x-forwarded-for'];

  if (typeof forwardedHeader === 'string' && forwardedHeader.trim()) {
    return forwardedHeader.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createIpThrottle({ windowMs = 10 * 60 * 1000, maxRequests = 5 } = {}) {
  return (req, res, next) => {
    const ipAddress = getClientIp(req);
    const currentTime = Date.now();
    const bucket = requestBuckets.get(ipAddress) || [];
    const recentRequests = bucket.filter((timestamp) => currentTime - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      const oldestRelevantRequest = recentRequests[0];
      const retryAfterMs = Math.max(0, windowMs - (currentTime - oldestRelevantRequest));

      return res.status(429).json({
        success: false,
        message: 'Too many AI analysis requests from this IP. Please try again shortly.',
        retry_after_seconds: Math.ceil(retryAfterMs / 1000),
      });
    }

    recentRequests.push(currentTime);
    requestBuckets.set(ipAddress, recentRequests);
    next();
  };
}

module.exports = {
  createIpThrottle,
  getClientIp,
};
