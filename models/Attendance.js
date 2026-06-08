const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: Date, required: true }, // Simple Date string/format e.g., YYYY-MM-DD
  markedTime: { type: Date, default: Date.now },
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
  markedBy: { type: String, enum: ['qr', 'pin', 'manual'], default: 'qr' },
  ipAddress: { type: String, default: '' },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number }
  },
  wifiSSID: { type: String, default: '' },
  deviceInfo: { type: String, default: '' }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
