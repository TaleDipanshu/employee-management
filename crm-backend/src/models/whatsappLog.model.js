const mongoose = require('mongoose');

const whatsappLogSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  message: String,
  direction: { type: String, enum: ['incoming', 'outgoing'] },
}, { timestamps: true });

module.exports = mongoose.model('WhatsappLog', whatsappLogSchema);