const axios = require('axios');
const axiosRetry = require('axios-retry');
const { Audit } = require('../models/audit');
const { Queue } = require('bullmq');

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    (error.response && [500, 503].includes(error.response.status)),
  onRetry: (retryCount, error, config) => {
    console.log(`Retry #${retryCount} — ${config.method.toUpperCase()} ${config.url}: ${error.message}`);
  }
});

const orderQueue = new Queue('orders', {
  connection: { host: '127.0.0.1', port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

async function processOrder(payload) {
  const { order_id, customer, plan_code, business_name, gstin } = mapZohoPayload(payload);

  const existing = await Audit.findOne({ orderId: order_id });
  if (existing) {
    console.log(`⚠️ Order ${order_id} already processed, skipping`);
    return;
  }

  try {
    const reg = await axios.post(`${process.env.MS19_URL}/register`, {
      businessName: business_name, gstin, email: customer.email
    }, authHeader());
    const clientId = reg.data.clientId;

    const keyRes = await axios.post(`${process.env.MS32_URL}/generate-key`, { clientId, planCode: plan_code }, authHeader());
    const apiKey = keyRes.data.key;

    await axios.post(`${process.env.MS10_URL}/subscriptions`, {
      clientId, planCode: plan_code, pricing: { perScanINR: 5 }, status: 'active'
    }, authHeader());

    await axios.post(`${process.env.MS9_URL}/email`, {
      to: customer.email,
      template: 'welcome-key',
      data: {
        key: apiKey,
        docsLink: 'https://docs.yourapi.com/start',
        dashboard: 'https://dashboard.yourapi.com'
      }
    }, authHeader());

    await Audit.findOneAndUpdate(
      { orderId: order_id },
      { orderId: order_id, clientId, status: 'ok', updatedAt: new Date() },
      { upsert: true }
    );
  } catch (err) {
    console.error(`ProcessOrder failed: ${err.message}. Enqueueing for retry.`);
    await orderQueue.add('process-order', payload);
    // throw err; // optional, based on worker strategy
  }
}

module.exports = { processOrder };
