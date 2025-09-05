const queue = [];
const MAX_RETRIES = 3;

function addToQueue(task) {
  queue.push({ ...task, attempts: 0 });
}

async function processQueue(handler, alertFn) {
  for (let i = 0; i < queue.length; i++) {
    const job = queue[i];
    try {
      job.attempts++;
      await handler(job.payload);
      queue.splice(i, 1); // success → remove from queue
      i--;
    } catch (err) {
      console.error(`Retry ${job.attempts} failed for orderId=${job.payload.orderId}`, err.message);
      if (job.attempts >= MAX_RETRIES) {
        console.error(`Job permanently failed after ${MAX_RETRIES} retries:`, job.payload.orderId);
        if (alertFn) {
          await alertFn(job.payload, err.message);
        }
        queue.splice(i, 1); // remove permanently
        i--;
      }
    }
  }
}

module.exports = { addToQueue, processQueue };
