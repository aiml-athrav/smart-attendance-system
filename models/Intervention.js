const mongoose = require('mongoose');

const ProgressNoteSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  note: {
    type: String,
    required: [true, 'Progress note text is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: false });

const InterventionSchema = new mongoose.Schema({
  // ObjectId reference to User (student)
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required'],
    index: true // Indexed for frequent student lookup
  },
  // ObjectId reference to RiskScore
  riskScoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RiskScore',
    index: true
  },
  // Type of intervention action taken
  type: {
    type: String,
    enum: ['MENTOR_ASSIGN', 'PARENT_NOTIFY', 'COUNSELOR_REFER', 'ACADEMIC_SUPPORT', 'CUSTOM'],
    required: [true, 'Intervention type is required']
  },
  // Status of the intervention
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
    index: true // Indexed for listing active actions
  },
  // ObjectId reference to User (teacher/mentor assigned to guide the student)
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  // ObjectId reference to User (the administrator/creator of the intervention)
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned by administrator reference is required']
  },
  // Description/Scope of the intervention
  description: {
    type: String,
    trim: true
  },
  // Date when intervention commenced
  startDate: {
    type: Date
  },
  // Expected completion date
  targetDate: {
    type: Date
  },
  // Actual completion date
  completionDate: {
    type: Date
  },
  // Outcome metrics captured after completing the intervention
  outcome: {
    attendanceImprovement: {
      type: Number,
      default: 0
    },
    marksImprovement: {
      type: Number,
      default: 0
    },
    engagementImprovement: {
      type: Number,
      default: 0
    },
    success: {
      type: Boolean,
      default: false
    }
  },
  // Log of progress notes
  notes: [ProgressNoteSchema]
}, {
  timestamps: true // Auto-adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Intervention', InterventionSchema);
