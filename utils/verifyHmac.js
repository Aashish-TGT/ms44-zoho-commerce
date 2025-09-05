const express = require('express');
const ipRangeCheck = require('ip-range-check');
const crypto = require('crypto');

const app = express();

// Capture raw body for HMAC
function captureRawBody(req, res, buf) {
  if (buf && buf.length) req.rawBody = buf;
}
app.use(express.json({ verify: captureRawBody }));

// IP whitelist middleware
const allowedIps = ["204.141.42.0/24", "136.143.188.0/24"];
function verifyIp(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  if (!ipRangeCheck(ip, allowedIps)) {
    console.warn(`🚫 Blocked request from IP: ${ip}`);
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// HMAC validation middleware
function verifyHmac(req, res, next) {
  const signature = req.headers['x-zoho-signature'];
  if (!req.rawBody || !signature) {
    console.error('Missing rawBody or signature');
    return res.sendStatus(401);
  }

  const computed = crypto.createHmac('sha256', process.env.ZC_WEBHOOK_SECRET)
                         .update(req.rawBody)
                         .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))) {
    console.error('HMAC signature mismatch');
    return res.sendStatus(401);
  }

  next();
}

// Route
app.post('/webhook', verifyIp, verifyHmac, (req, res) => {
  // Safe to process req.body now
  res.sendStatus(200);
});

module.exports = app;
