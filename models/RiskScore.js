const mongoose = require('mongoose');

const RiskHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  level: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED'],
    required: true
  }
}, { _id: false });

const RiskScoreSchema = new mongoose.Schema({
  // ObjectId reference to User (student)
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID reference is required'],
    index: true // Indexed for frequent queries by student
  },
  // ObjectId reference to Class
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    index: true // Indexed for class-level analytics
  },
  // Percentage of classes attended (0-100)
  attendanceRate: {
    type: Number,
    min: [0, 'Attendance rate cannot be less than 0%'],
    max: [100, 'Attendance rate cannot exceed 100%'],
    default: 100
  },
  // Total complaints filed by the student
  complaintCount: {
    type: Number,
    min: 0,
    default: 0
  },
  // Student engagement based on punctuality and class participation (0-100)
  engagementScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  // Average marks obtained by student in class assignments
  assignmentMarks: {
    type: Number,
    min: 0,
    default: 0
  },
  // Difference between class average marks and student's average marks
  peerPerformanceGap: {
    type: Number,
    default: 0
  },
  // Final calculated risk score (0-100)
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
    default: 0
  },
  // Categorization of risk level depending on final riskScore value
  riskLevel: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED'],
    default: 'GREEN',
    required: true,
    index: true // Indexed for listing student alerts dynamically (e.g. Red list)
  },
  // Historical tracking of risk score changes over time
  history: [RiskHistorySchema],
  // Flag indicating if an active intervention is assigned to this student
  interventionActive: {
    type: Boolean,
    default: false
  },
  // Reference to the active Intervention document
  interventionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intervention'
  },
  // Date when metrics were last updated
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Auto-adds createdAt and updatedAt fields
});

// Middleware to set riskLevel based on riskScore value
RiskScoreSchema.pre('save', function (next) {
  if (this.riskScore <= 30) {
    this.riskLevel = 'GREEN';
  } else if (this.riskScore <= 60) {
    this.riskLevel = 'YELLOW';
  } else {
    this.riskLevel = 'RED';
  }
  this.lastUpdated = new Date();
  next();
});

// Export model
module.exports = mongoose.model('RiskScore', RiskScoreSchema);
