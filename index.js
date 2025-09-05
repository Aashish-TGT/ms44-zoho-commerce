const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Audit } = require('./models/audit');
const verifyHmac = require('./utils/verifyHmac');
const { processQueue } = require("./utils/retryQueue");
const { sendFailureAlert } = require("./utils/alert");
const { processOrder } = require("./services/orderProcessor");
const verifyIp = require("./utils/verifyIp");

const app = express();
app.use(bodyParser.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

// ✅ Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date() });
});

// ✅ Webhook endpoint with IP + HMAC + Idempotency
app.post('/zoho/webhook/order-paid', verifyIp, verifyHmac, async (req, res) => {
  const orderId = req.body.order_id;
  const existing = await Audit.findOne({ orderId });
  if (existing && existing.status === 'ok') return res.sendStatus(200);

  try {
    await processOrder(req.body);
    await Audit.findOneAndUpdate(
      { orderId },
      { orderId, status: 'ok', updatedAt: new Date() },
      { upsert: true }
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Order processing failed', err);
    await Audit.findOneAndUpdate(
      { orderId },
      { orderId, status: 'failed', updatedAt: new Date(), error: err.message },
      { upsert: true }
    );
    res.sendStatus(500);
  }
});

// ✅ Retry queue processor
setInterval(() => {
  processQueue(processOrder, sendFailureAlert);
}, 30000);

// ✅ Start server
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => app.listen(PORT, () => console.log(`🚀 MS44 running on port ${PORT}`)))
  .catch(err => console.error('MongoDB connection error', err));
