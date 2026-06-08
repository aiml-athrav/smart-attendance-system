const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, required: true }, // 'student' or 'teacher'
  receiverRole: { type: String, enum: ['admin', 'teacher'], required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Null if receiverRole is admin
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
