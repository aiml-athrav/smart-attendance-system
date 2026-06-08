const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Complaint = require('../models/Complaint');
const Assignment = require('../models/Assignment');
const RiskScore = require('../models/RiskScore');

/**
 * Calculates the dropout risk score for a student and saves it.
 * @param {string|ObjectId} studentId - The ID of the student.
 * @returns {Promise<Document>} The saved RiskScore Mongoose document.
 */
async function calculateRiskScore(studentId) {
  try {
    // 1. Fetch student data
    const student = await User.findById(studentId);
    if (!student) {
      throw new Error(`Student with ID ${studentId} not found.`);
    }

    // 2. Fetch all attendance records for this student
    const attendanceRecords = await Attendance.find({ studentId });

    // Handle case where student has no attendance records yet
    if (attendanceRecords.length === 0) {
      console.log(`Student ${studentId} has no attendance records. Returning default risk score of 50.`);
      
      const defaultScore = 50;
      const defaultLevel = 'YELLOW';

      let riskDoc = await RiskScore.findOne({ studentId });
      if (!riskDoc) {
        riskDoc = new RiskScore({
          studentId,
          attendanceRate: 100,
          complaintCount: 0,
          engagementScore: 100,
          assignmentMarks: 0,
          peerPerformanceGap: 0,
          riskScore: defaultScore,
          riskLevel: defaultLevel,
          history: []
        });
      } else {
        riskDoc.riskScore = defaultScore;
        riskDoc.riskLevel = defaultLevel;
      }

      riskDoc.history.push({
        date: new Date(),
        score: defaultScore,
        level: defaultLevel
      });

      await riskDoc.save();
      return riskDoc;
    }

    // 3. Fetch all complaints filed by this student
    const complaintCount = await Complaint.countDocuments({ sender: studentId });

    // 4. Fetch all assignment marks for this student
    const studentAssignments = await Assignment.find({ studentId });

    // 5. Calculate class average marks from Assignment collection
    // Fetch all assignments in the system to compute overall class average
    const allAssignments = await Assignment.find({});
    
    let classAverageMarks = 75; // Default fallback if no assignments exist in DB
    if (allAssignments.length > 0) {
      const totalClassMarks = allAssignments.reduce((sum, a) => sum + a.marks, 0);
      classAverageMarks = totalClassMarks / allAssignments.length;
    }

    // --- Calculate Risk Components ---

    // a) Attendance Rate: (present_count / total_records) * 100
    // We count both 'present' and 'late' as physically present for attendance rate,
    // but follow standard present vs late definition strictly.
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
    
    // We strictly use status === 'present' for presentCount in the formulas
    const attendanceRate = (presentCount / totalRecords) * 100;

    // b) Engagement Score: ((present_count * 2 + late_count) / (total_records * 2)) * 100
    const engagementScore = ((presentCount * 2 + lateCount) / (totalRecords * 2)) * 100;

    // c) Assignment Marks: sum of all marks / number of assignments
    let studentAverageMarks = 75; // Default fallback if student has no assignments
    if (studentAssignments.length > 0) {
      const totalStudentMarks = studentAssignments.reduce((sum, a) => sum + a.marks, 0);
      studentAverageMarks = totalStudentMarks / studentAssignments.length;
    }

    // d) Peer Performance Gap: classAverageMarks - studentAverageMarks
    const peerPerformanceGap = classAverageMarks - studentAverageMarks;

    // --- Apply Risk Calculation Formula ---
    
    // 1. absenceRate = (100 - attendanceRate) / 100
    const absenceRate = (100 - attendanceRate) / 100;

    // 2. complaintScore = min(complaintCount / 5, 1)
    const complaintScore = Math.min(complaintCount / 5, 1);

    // 3. marksDropScore = max((classAvgMarks - assignmentMarks) / classAvgMarks, 0)
    const marksDropScore = Math.max((classAverageMarks - studentAverageMarks) / classAverageMarks, 0);

    // 4. engagementScore normalized = (100 - engagementScore) / 100
    const engagementScoreNormalized = (100 - engagementScore) / 100;

    // 5. peerGapScore = min(peerPerformanceGap / classAvgMarks, 1)
    // Note: if peerPerformanceGap is negative (student beats class average), gap score is capped or clamped to 0.
    const peerGapScore = Math.max(Math.min(peerPerformanceGap / classAverageMarks, 1), 0);

    // Compute final weighted risk score (0-100)
    // RISK_SCORE = ((absenceRate * 0.35) + (complaintScore * 0.15) + (marksDropScore * 0.20) + (engagementScoreNormalized * 0.15) + (peerGapScore * 0.15)) * 100
    const calculatedRiskScore = (
      (absenceRate * 0.35) +
      (complaintScore * 0.15) +
      (marksDropScore * 0.20) +
      (engagementScoreNormalized * 0.15) +
      (peerGapScore * 0.15)
    ) * 100;

    // Round to 2 decimal places
    const riskScore = Math.round(calculatedRiskScore * 100) / 100;

    // Determine risk level:
    // - GREEN if riskScore < 31
    // - YELLOW if riskScore between 31-60
    // - RED if riskScore > 60
    let riskLevel = 'GREEN';
    if (riskScore >= 31 && riskScore <= 60) {
      riskLevel = 'YELLOW';
    } else if (riskScore > 60) {
      riskLevel = 'RED';
    }

    // Find or create RiskScore document for the student
    let riskDoc = await RiskScore.findOne({ studentId });
    if (!riskDoc) {
      riskDoc = new RiskScore({
        studentId,
        history: []
      });
    }

    // Update with calculated values
    riskDoc.attendanceRate = Math.round(attendanceRate * 100) / 100;
    riskDoc.complaintCount = complaintCount;
    riskDoc.engagementScore = Math.round(engagementScore * 100) / 100;
    riskDoc.assignmentMarks = Math.round(studentAverageMarks * 100) / 100;
    riskDoc.peerPerformanceGap = Math.round(peerPerformanceGap * 100) / 100;
    riskDoc.riskScore = riskScore;
    riskDoc.riskLevel = riskLevel;
    
    // Add entry to history array
    riskDoc.history.push({
      date: new Date(),
      score: riskScore,
      level: riskLevel
    });

    // Save and return
    await riskDoc.save();
    return riskDoc;

  } catch (error) {
    console.error(`Error calculating risk score for student ${studentId}:`, error);
    throw new Error(`Risk calculation failed: ${error.message}`);
  }
}

module.exports = { calculateRiskScore };
