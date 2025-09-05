const axios = require("axios");

async function sendFailureAlert(job, errorMessage) {
  try {
    await axios.post(`${process.env.MS9_URL}/email`, {
      to: "internal-alerts@yourcompany.com",
      template: "failure-alert",
      data: { orderId: job.orderId, error: errorMessage }
    }, {
      headers: { Authorization: `Bearer ${process.env.INTERNAL_TOKEN}` }
    });
    console.log("Internal failure alert sent");
  } catch (err) {
    console.error("Failed to send internal alert", err.message);
  }
}

module.exports = { sendFailureAlert };
