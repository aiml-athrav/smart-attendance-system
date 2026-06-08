const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  schedule: {
    day: { type: String, required: true },
    startTime: { type: String, required: true }, // Format: "HH:MM"
    endTime: { type: String, required: true }     // Format: "HH:MM"
  },
  room: { type: String, required: true },
  capacity: { type: Number, default: 60 },
  semester: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Class', ClassSchema);
