const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  // ObjectId reference to the User (student)
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required'],
    index: true
  },
  // ObjectId reference to the Class
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class reference is required'],
    index: true
  },
  // Assignment title
  title: {
    type: String,
    required: [true, 'Assignment title is required']
  },
  // Marks obtained by the student
  marks: {
    type: Number,
    required: [true, 'Marks are required'],
    min: 0
  },
  // Maximum possible marks
  maxMarks: {
    type: Number,
    default: 100,
    min: 1
  }
}, {
  timestamps: true // Auto-adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Assignment', AssignmentSchema);
