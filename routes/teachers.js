const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/role');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const attendanceController = require('../controllers/attendanceController');

router.get('/dashboard', verifyToken, checkRole('teacher'), async (req, res) => {
  try {
    const classes = await Class.find({ teacherId: req.user._id });
    const classIds = classes.map(c => c._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await Attendance.find({
      classId: { $in: classIds },
      markedTime: { $gte: today }
    }).populate('studentId', 'name rollNo');

    // Fetch pending complaints count received by this teacher
    const Complaint = require('../models/Complaint');
    const pendingComplaintsCount = await Complaint.countDocuments({
      receiverRole: 'teacher',
      receiver: req.user._id,
      status: 'Pending'
    });

    res.json({
      activeClasses: classes.map(cls => ({
        id: cls._id,
        name: cls.name,
        subject: cls.subject,
        time: `${cls.schedule.startTime} - ${cls.schedule.endTime}`,
        department: cls.department,
        room: cls.room,
        day: cls.schedule.day,
        totalStudents: 45
      })),
      todayAttendance: todayAttendance.map(a => ({
        rollNo: a.studentId.rollNo,
        name: a.studentId.name,
        time: a.markedTime,
        status: a.status
      })),
      statistics: {
        avgAttendance: 93
      },
      pendingComplaintsCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-classes', verifyToken, checkRole('teacher'), async (req, res) => {
  try {
    const classes = await Class.find({ teacherId: req.user._id });
    res.json({ classes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/class-attendance/:classId', verifyToken, checkRole('teacher'), async (req, res) => {
  try {
    const { classId } = req.params;
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const attendance = await Attendance.find({ classId }).populate('studentId', 'name rollNo');
    const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;

    res.json({
      classInfo,
      attendance: attendance.map(a => ({
        studentId: a.studentId._id,
        name: a.studentId.name,
        rollNo: a.studentId.rollNo,
        timeMarked: a.markedTime,
        status: a.status
      })),
      summary: {
        presentCount,
        absentCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get class attendance for a specific date (includes all students in the department)
router.get('/class-attendance/:classId/date/:dateStr', verifyToken, checkRole('teacher'), async (req, res) => {
  try {
    const { classId, dateStr } = req.params;
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Parse target date range
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    // Get all students in this department
    const students = await User.find({ role: 'student', department: classInfo.department }).sort({ rollNo: 1 });
    
    // Get attendance records on this date
    const attendanceRecords = await Attendance.find({
      classId,
      markedTime: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const list = students.map(student => {
      const record = attendanceRecords.find(a => a.studentId.toString() === student._id.toString());
      return {
        studentId: student._id,
        name: student.name,
        rollNo: student.rollNo,
        status: record ? record.status : 'absent',
        timeMarked: record ? record.markedTime : null
      };
    });
    
    res.json({
      classInfo,
      date: dateStr,
      attendance: list,
      summary: {
        presentCount: list.filter(s => s.status === 'present' || s.status === 'late').length,
        absentCount: list.filter(s => s.status === 'absent').length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all attendance history for the teacher's classes
router.get('/attendance-history', verifyToken, checkRole('teacher'), async (req, res) => {
  try {
    const classes = await Class.find({ teacherId: req.user._id });
    const classIds = classes.map(c => c._id);
    const records = await Attendance.find({ classId: { $in: classIds } })
      .populate('studentId', 'name rollNo')
      .populate('classId', 'name subject schedule')
      .sort({ date: 1 });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate QR Endpoint for Teacher
router.post('/generate-qr', verifyToken, checkRole('teacher'), attendanceController.generateQR);

// Manually mark/correct attendance for a student
router.post('/mark-attendance-manual', verifyToken, checkRole('teacher'), async (req, res) => {
  try {
    const { studentId, classId, dateStr, status } = req.body;
    if (!studentId || !classId || !dateStr || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['present', 'absent', 'late'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Parse target date range
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Try to find existing attendance record on this day
    let attendance = await Attendance.findOne({
      studentId,
      classId,
      markedTime: { $gte: startOfDay, $lte: endOfDay }
    });

    if (attendance) {
      // Update existing record
      attendance.status = status;
      attendance.markedBy = 'manual';
      // Do not overwrite markedTime with current time to prevent shifting the record's date
      await attendance.save();
    } else {
      // Create new record
      attendance = new Attendance({
        studentId,
        classId,
        date: startOfDay,
        markedTime: startOfDay, // Match the target day's query range
        status,
        markedBy: 'manual'
      });
      await attendance.save();
    }

    res.json({ message: 'Attendance updated successfully', attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/students', verifyToken, checkRole('teacher'), async (req, res) => {
  try {
    const dept = req.query.department || req.user.department;
    const students = await User.find({ role: 'student', department: dept }).sort({ name: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
