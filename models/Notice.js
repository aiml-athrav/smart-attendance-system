const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Event', 'Class Reschedule', 'Holiday', 'General', 'Exam'], 
    default: 'General' 
  },
  department: { type: String, default: 'All' }, // 'All' or specific department like 'Computer Science'
  targetStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  targetRole: { type: String, enum: ['All', 'student', 'teacher'], default: 'All' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notice', NoticeSchema);
