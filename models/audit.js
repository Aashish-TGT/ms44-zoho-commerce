const { Schema, model } = require('mongoose');

const auditSchema = new Schema({
  orderId: { type: String, unique: true },
  clientId: String,
  status: String,
  error: String,
  updatedAt: Date
});

const Audit = model('Audit', auditSchema);
module.exports = { Audit };
