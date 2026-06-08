const mongoose = require('mongoose');

const QRCodeSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  code: { type: String, required: true, unique: true },
  generatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  usedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'expired', 'used'], default: 'active' }
});

module.exports = mongoose.model('QRCode', QRCodeSchema);
