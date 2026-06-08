const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/role');
const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const CollegeConfig = require('../models/CollegeConfig');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const csv = require('csv-parser');
const stream = require('stream');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/dashboard', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const classesToday = await Class.countDocuments();
    
    // Average attendance statistic
    const attendanceCount = await Attendance.countDocuments();
    const presentCount = await Attendance.countDocuments({ status: { $in: ['present', 'late'] } });
    const avgAttendance = attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100) : 94;

    // Fetch pending complaints count addressed to admin
    const Complaint = require('../models/Complaint');
    const pendingComplaintsCount = await Complaint.countDocuments({ receiverRole: 'admin', status: 'Pending' });

    res.json({
      totalStudents,
      totalTeachers,
      classesToday,
      avgAttendance,
      pendingComplaintsCount,
      lowAttendanceAlerts: [
        { name: 'James Bennett', rollNo: 'PHY-003', attendance: '64%' },
        { name: 'Sarah Chen', rollNo: 'CS-022', attendance: '72%' }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/risk-scores', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const { calculateRiskScore } = require('../services/riskCalculation');
    
    const students = await User.find({ role: 'student' });
    const riskScores = [];
    
    for (const student of students) {
      try {
        const scoreDoc = await calculateRiskScore(student._id);
        riskScores.push({
          studentId: student._id,
          name: student.name,
          email: student.email,
          department: student.department,
          rollNo: student.rollNo,
          riskScore: scoreDoc.riskScore,
          riskLevel: scoreDoc.riskLevel === 'RED' ? 'HIGH' : (scoreDoc.riskLevel === 'YELLOW' ? 'MEDIUM' : 'LOW'),
          attendanceRate: scoreDoc.attendanceRate,
          complaintCount: scoreDoc.complaintCount,
          engagementScore: scoreDoc.engagementScore,
          assignmentMarks: scoreDoc.assignmentMarks,
          peerPerformanceGap: scoreDoc.peerPerformanceGap,
          interventionActive: scoreDoc.interventionActive
        });
      } catch (err) {
        console.error(`Skipping risk calculation for student ${student._id}:`, err.message);
      }
    }
    
    riskScores.sort((a, b) => b.riskScore - a.riskScore);
    res.json(riskScores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/interventions', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const Intervention = require('../models/Intervention');
    const RiskScore = require('../models/RiskScore');
    const { studentId, type, mentorId, description, targetDate } = req.body;
    
    if (!studentId || !type) {
      return res.status(400).json({ error: 'Student ID and Intervention type are required' });
    }
    
    const intervention = new Intervention({
      studentId,
      type,
      status: 'ACTIVE',
      mentorId,
      assignedBy: req.user.id,
      description,
      startDate: new Date(),
      targetDate: targetDate ? new Date(targetDate) : undefined
    });
    
    await intervention.save();
    
    await RiskScore.findOneAndUpdate(
      { studentId },
      { interventionActive: true, interventionId: intervention._id }
    );
    
    res.status(201).json({ message: 'Intervention assigned successfully', intervention });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/trigger-weekly-check', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { runWeeklyCheck } = require('../services/notificationScheduler');
    const alertCount = await runWeeklyCheck();
    res.json({ message: `Successfully ran weekly check. Sent ${alertCount} alerts to at-risk students.`, alertCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ role: 1, name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/settings', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    let config = await CollegeConfig.findOne();
    if (!config) {
      config = new CollegeConfig({
        collegeName: 'EduSync College',
        location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
      });
      await config.save();
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/add-user', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { name, email, rollNo, password, role, department, expYears, expMonths, expDays, phone } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let experienceStartDate = null;
    if (role === 'teacher') {
      const years = parseInt(expYears) || 0;
      const months = parseInt(expMonths) || 0;
      const days = parseInt(expDays) || 0;
      
      const date = new Date();
      date.setFullYear(date.getFullYear() - years);
      date.setMonth(date.getMonth() - months);
      date.setDate(date.getDate() - days);
      experienceStartDate = date;
    }

    const newUser = new User({
      name,
      email,
      rollNo: role === 'student' ? rollNo : null,
      password: hashedPassword,
      role,
      department,
      experienceStartDate,
      phone: phone || ''
    });

    await newUser.save();
    res.status(201).json({ user: newUser, message: 'User created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { qrExpirySeconds, attendanceThreshold, wifiSSID, geoRequired, allowedIPRange } = req.body;
    let config = await CollegeConfig.findOne();
    if (!config) {
      config = new CollegeConfig({
        collegeName: 'EduSync College',
        location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
      });
    }

    if (qrExpirySeconds !== undefined) config.qrExpirySeconds = qrExpirySeconds;
    if (attendanceThreshold !== undefined) config.attendanceThreshold = attendanceThreshold;
    if (wifiSSID !== undefined) config.wifiSSID = wifiSSID;
    if (geoRequired !== undefined) config.geoLocationRequired = geoRequired;
    if (allowedIPRange !== undefined) config.allowedIPRange = allowedIPRange;

    await config.save();
    res.json({ updatedConfig: config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk-upload', verifyToken, checkRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);

  bufferStream
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let importedCount = 0;
      let skippedCount = 0;
      
      try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        for (const row of results) {
          const { name, email, role, department, rollNo, expYears, expMonths, expDays, phone } = row;
          if (!name || !email || !role || !department) {
            skippedCount++;
            continue;
          }

          const userExists = await User.findOne({ email });
          if (userExists) {
            skippedCount++;
            continue;
          }

          let experienceStartDate = null;
          const userRole = role.trim().toLowerCase();
          if (userRole === 'teacher') {
            const years = parseInt(expYears) || 0;
            const months = parseInt(expMonths) || 0;
            const days = parseInt(expDays) || 0;
            
            const date = new Date();
            date.setFullYear(date.getFullYear() - years);
            date.setMonth(date.getMonth() - months);
            date.setDate(date.getDate() - days);
            experienceStartDate = date;
          }

          const newUser = new User({
            name: name.trim(),
            email: email.trim(),
            rollNo: userRole === 'student' ? (rollNo ? rollNo.trim() : null) : null,
            password: hashedPassword,
            role: userRole,
            department: department.trim(),
            experienceStartDate,
            phone: phone ? phone.trim() : ''
          });

          await newUser.save();
          importedCount++;
        }

        res.json({ message: `Successfully imported ${importedCount} users. Skipped ${skippedCount} users.` });
      } catch (err) {
        res.status(500).json({ error: 'Database error during import: ' + err.message });
      }
    })
    .on('error', (error) => {
      res.status(500).json({ error: 'Error parsing CSV file' });
    });
});

// Get all classes
router.get('/classes', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const classes = await Class.find().populate('teacherId', 'name email').sort({ name: 1, subject: 1 });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all teachers
router.get('/teachers', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('name email').sort({ name: 1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new class (timetable entry)
router.post('/add-class', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { name, subject, teacherId, department, semester, room, capacity, day, startTime, endTime } = req.body;
    
    if (!name || !subject || !teacherId || !department || !day || !startTime || !endTime) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const newClass = new Class({
      name,
      subject,
      teacherId,
      department,
      semester: semester || 1,
      room: room || 'N/A',
      capacity: capacity || 60,
      schedule: { day, startTime, endTime }
    });

    await newClass.save();
    res.status(201).json({ class: newClass, message: 'Class scheduled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit a class (timetable entry)
router.put('/edit-class/:classId', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, subject, teacherId, department, semester, room, capacity, day, startTime, endTime } = req.body;
    
    if (!name || !subject || !teacherId || !department || !day || !startTime || !endTime) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      {
        name,
        subject,
        teacherId,
        department,
        semester: semester || 1,
        room: room || 'N/A',
        capacity: capacity || 60,
        schedule: { day, startTime, endTime }
      },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ class: updatedClass, message: 'Class updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a class (timetable entry)
router.delete('/delete-class/:classId', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { classId } = req.params;
    await Class.findByIdAndDelete(classId);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload timetable CSV
router.post('/upload-timetable', verifyToken, checkRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);

  bufferStream
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let importedCount = 0;
      let skippedCount = 0;
      
      try {
        for (const row of results) {
          const { name, subject, teacherEmail, department, day, startTime, endTime, room, capacity, semester } = row;
          if (!name || !subject || !teacherEmail || !department || !day || !startTime || !endTime) {
            skippedCount++;
            continue;
          }

          const teacher = await User.findOne({ email: teacherEmail.trim(), role: 'teacher' });
          if (!teacher) {
            skippedCount++;
            continue;
          }

          const newClass = new Class({
            name: name.trim(),
            subject: subject.trim(),
            teacherId: teacher._id,
            department: department.trim(),
            semester: parseInt(semester) || 1,
            room: room ? room.trim() : 'N/A',
            capacity: parseInt(capacity) || 60,
            schedule: {
              day: day.trim(),
              startTime: startTime.trim(),
              endTime: endTime.trim()
            }
          });

          await newClass.save();
          importedCount++;
        }

        res.json({ message: `Successfully imported ${importedCount} classes. Skipped ${skippedCount} classes.` });
      } catch (err) {
        res.status(500).json({ error: 'Database error during import: ' + err.message });
      }
    })
    .on('error', (error) => {
      res.status(500).json({ error: 'Error parsing CSV file' });
    });
});

// Get all notices (admin view)
router.get('/notices', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const Notice = require('../models/Notice');
    const notices = await Notice.find().populate('postedBy', 'name').sort({ createdAt: -1 });
    res.json(notices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notice
router.post('/notices', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const Notice = require('../models/Notice');
    const { title, content, category, department } = req.body;
    const notice = new Notice({
      title,
      content,
      category,
      department,
      postedBy: req.user._id
    });
    await notice.save();
    res.json({ message: 'Notice posted successfully', notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete notice
router.delete('/notices/:id', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const Notice = require('../models/Notice');
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit user details (inline editing)
router.put('/edit-user/:userId', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, rollNo, department, phone } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow editing other admin accounts
    if (user.role === 'admin' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to modify another administrator' });
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim();
    if (rollNo !== undefined) user.rollNo = rollNo.trim();
    if (department !== undefined) user.department = department.trim();
    if (phone !== undefined) user.phone = phone.trim();

    await user.save();
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (Student or Teacher)
router.delete('/delete-user/:userId', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own administrator account' });
    }

    if (user.role === 'student') {
      // Clean up student's attendance records
      await Attendance.deleteMany({ studentId: userId });
    } else if (user.role === 'teacher') {
      // Clean up classes taught by the teacher
      const classes = await Class.find({ teacherId: userId });
      const classIds = classes.map(c => c._id);
      
      // Delete attendance records for those classes
      await Attendance.deleteMany({ classId: { $in: classIds } });
      
      // Delete classes
      await Class.deleteMany({ teacherId: userId });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
