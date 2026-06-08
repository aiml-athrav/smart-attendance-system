const cron = require('node-cron');
const User = require('../models/User');
const Notice = require('../models/Notice');
const { calculateRiskScore } = require('./riskCalculation');

async function runWeeklyCheck() {
  console.log('[Scheduler] Starting weekly attendance and risk check...');
  // Find default admin to act as poster
  const admin = await User.findOne({ role: 'admin' });
  const adminId = admin ? admin._id : null;
  if (!adminId) {
    throw new Error('No administrator found to post automated notices.');
  }

  const students = await User.find({ role: 'student' });
  let count = 0;
  for (const student of students) {
    try {
      const scoreDoc = await calculateRiskScore(student._id);
      const attendance = Math.round(scoreDoc.attendanceRate || 0);
      const riskLevel = scoreDoc.riskLevel; // RED, YELLOW, GREEN
      
      let levelWord = 'LOW';
      if (riskLevel === 'RED') levelWord = 'HIGH';
      else if (riskLevel === 'YELLOW') levelWord = 'MEDIUM';

      // Notify student if attendance < 75% or risk is High/Medium
      if (attendance < 75 || riskLevel === 'RED' || riskLevel === 'YELLOW') {
        const title = `⚠️ OFFICIAL NOTICE: Critical Attendance Shortage`;
        const content = `Dear ${student.name},\n\nThis is an official notice issued directly from the Office of the Academic Administrator.\n\nA regular review of your academic records indicates that your current attendance is at **${attendance}%**, which is below the university's mandatory threshold. Consequently, your academic status has been flagged as **${levelWord} RISK** for dropout/course failure.\n\nPlease be advised that regular attendance is compulsory. You are hereby instructed to attend all remaining lectures regularly and meet with your assigned mentor immediately to discuss an academic recovery plan. Failure to improve your attendance status may result in official disciplinary actions, including debarment from examinations.\n\nSincerely,\n**Office of the Academic Administrator**\nEduSync Attendance System`;

        // Clear previous weekly alerts for this student
        await Notice.deleteMany({
          targetStudent: student._id,
          title: { $regex: 'Critical Attendance Shortage|Weekly Attendance Alert' }
        });

        // Create new private notice
        const notice = new Notice({
          title,
          content,
          category: 'General',
          department: student.department || 'All',
          targetStudent: student._id,
          postedBy: adminId
        });
        await notice.save();
        count++;
        console.log(`[Scheduler] Posted alert for student ${student.name} (${attendance}%, Risk: ${levelWord})`);
      }
    } catch (studentErr) {
      console.error(`[Scheduler] Failed checking student ${student._id}:`, studentErr.message);
    }
  }
  return count;
}

function initNotificationScheduler() {
  console.log('Initializing Automated Attendance Notification Scheduler...');

  // Cron schedule: Run every Sunday at 9:00 AM (0 9 * * 0)
  cron.schedule('0 9 * * 0', async () => {
    try {
      await runWeeklyCheck();
      console.log('[Scheduler] Finished weekly check.');
    } catch (err) {
      console.error('[Scheduler] Error during weekly check:', err.message);
    }
  });
}

module.exports = { initNotificationScheduler, runWeeklyCheck };
