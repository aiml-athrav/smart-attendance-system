const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/role');
const checkGeolocation = require('../middleware/geolocation');
const validateIP = require('../middleware/ipValidation');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const attendanceController = require('../controllers/attendanceController');

router.get('/dashboard', verifyToken, checkRole('student'), async (req, res) => {
  try {
    const studentId = req.user._id;

    // Find all classes registered or available in the department
    const classes = await Class.find({ department: req.user.department }).populate('teacherId', 'name');
    
    // Find attendance records for this student
    const records = await Attendance.find({ studentId });

    const total = records.length;
    const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    // Get attendance breakdown by subject
    const attendanceBySubject = classes.map(cls => {
      const clsRecords = records.filter(r => r.classId.toString() === cls._id.toString());
      const clsPresent = clsRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const clsTotal = clsRecords.length || 1;
      return {
        subject: cls.subject,
        percentage: Math.round((clsPresent / clsTotal) * 100),
        attended: clsPresent,
        total: clsRecords.length,
        teacher: cls.teacherId ? cls.teacherId.name : 'Unknown Faculty'
      };
    });

    // Fetch complaints info
    const Complaint = require('../models/Complaint');
    const resolvedComplaints = await Complaint.find({ sender: studentId, status: 'Resolved' }).populate('receiver', 'name');
    const pendingComplaintsCount = await Complaint.countDocuments({ sender: studentId, status: 'Pending' });

    res.json({
      attendanceStats: { total, present, absent, percentage },
      upcomingClasses: classes.map(cls => ({
        subject: cls.subject,
        time: `${cls.schedule.day} ${cls.schedule.startTime} - ${cls.schedule.endTime}`,
        dayOfWeek: cls.schedule.day,
        timeOnly: `${cls.schedule.startTime} - ${cls.schedule.endTime}`,
        teacher: cls.teacherId ? cls.teacherId.name : 'Dr. Faculty Member',
        room: cls.room,
        status: 'Upcoming'
      })),
      attendanceBySubject,
      classes, // raw classes for timetable mapping
      pendingComplaintsCount,
      resolvedComplaints: resolvedComplaints.map(c => ({
        _id: c._id,
        subject: c.subject,
        receiverName: c.receiverRole === 'admin' ? 'Admin' : (c.receiver ? c.receiver.name : 'Teacher')
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance history for calendar
router.get('/attendance-history', verifyToken, checkRole('student'), async (req, res) => {
  try {
    const studentId = req.user._id;
    const records = await Attendance.find({ studentId })
      .populate({
        path: 'classId',
        populate: { path: 'teacherId', select: 'name' }
      })
      .sort({ date: 1 });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark attendance endpoint with validations
router.post('/mark-attendance', verifyToken, checkRole('student'), checkGeolocation, validateIP, attendanceController.markAttendance);

// Get active QRs for student's department
router.get('/active-qrs', verifyToken, checkRole('student'), async (req, res) => {
  try {
    const QRCode = require('../models/QRCode');
    const Class = require('../models/Class');

    // Get all classes in the student's department
    const studentClasses = await Class.find({ department: req.user.department });
    const classIds = studentClasses.map(c => c._id);

    // Find active QRs for these classes
    const activeQRs = await QRCode.find({
      classId: { $in: classIds },
      expiresAt: { $gt: new Date() }
    }).populate('classId', 'name subject room');

    res.json({ activeQRs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get classmates (students in the same department)
router.get('/classmates', verifyToken, checkRole('student'), async (req, res) => {
  try {
    const User = require('../models/User');
    const classmates = await User.find({
      role: 'student',
      department: req.user.department
    }).select('name email rollNo profilePic phone').sort({ rollNo: 1 });
    res.json({ classmates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
