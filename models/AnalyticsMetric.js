const mongoose = require('mongoose');

const AnalyticsMetricSchema = new mongoose.Schema({
  // ObjectId reference to CollegeConfig (institution settings)
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollegeConfig',
    required: [true, 'Institution config reference is required'],
    index: true
  },
  // Academic year of tracking
  year: {
    type: Number,
    required: [true, 'Academic year is required'],
    index: true
  },
  // Month index (1-12)
  month: {
    type: Number,
    required: [true, 'Month (1-12) is required'],
    min: 1,
    max: 12,
    index: true
  },
  // Total students enrolled in the institution
  totalStudents: {
    type: Number,
    required: true,
    min: 0
  },
  // Count of students falling into RED risk level (at risk)
  studentsAtRisk: {
    type: Number,
    default: 0,
    min: 0
  },
  // Count of students falling into YELLOW risk level (warning list)
  studentsAtWarning: {
    type: Number,
    default: 0,
    min: 0
  },
  // Total interventions started during this month
  interventionsStarted: {
    type: Number,
    default: 0,
    min: 0
  },
  // Total interventions completed during this month
  interventionsCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  // Percentage rate of successful interventions completed (0-100)
  interventionSuccessRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Predicted dropouts estimated based on active RED risk levels
  estimatedDropouts: {
    type: Number,
    default: 0,
    min: 0
  },
  // Actual dropouts prevented through interventions
  preventedDropouts: {
    type: Number,
    default: 0,
    min: 0
  },
  // Estimated revenue saved from preventing dropouts (preventedDropouts * 400000)
  estimatedRevenueSaved: {
    type: Number,
    default: 0,
    min: 0
  },
  // Institution-wide average attendance rate
  avgAttendance: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Flag showing if average attendance meets targets
  complianceToTarget: {
    type: Boolean,
    default: false
  },
  // Reference to previous month's analytics metric document for trending analysis
  previousMonth: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AnalyticsMetric'
  }
}, {
  timestamps: true // Auto-adds createdAt and updatedAt fields
});

// Compound index to search quickly by institution, year and month combination
AnalyticsMetricSchema.index({ institutionId: 1, year: -1, month: -1 });

// Pre-save hook to calculate revenue saved: preventedDropouts * 400000
AnalyticsMetricSchema.pre('save', function (next) {
  this.estimatedRevenueSaved = this.preventedDropouts * 400000;
  next();
});

module.exports = mongoose.model('AnalyticsMetric', AnalyticsMetricSchema);
