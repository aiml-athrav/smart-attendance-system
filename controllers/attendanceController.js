const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const QRCodeModel = require('../models/QRCode');
const CollegeConfig = require('../models/CollegeConfig');
const crypto = require('crypto');

exports.generateQR = async (req, res) => {
  try {
    const { classId } = req.body;
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Verify teacher owns the class
    if (classInfo.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized to generate QR for this class' });
    }

    const config = await CollegeConfig.findOne();
    const expirySeconds = req.body.durationSeconds ? parseInt(req.body.durationSeconds) : (config ? config.qrExpirySeconds : 15);

    // Generate unique code
    const code = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    // Save QR to DB
    const qrRecord = new QRCodeModel({
      classId,
      code,
      expiresAt
    });
    await qrRecord.save();

    // Generate QR Image using public free API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${code}`;

    const minutes = Math.floor(expirySeconds / 60);
    const seconds = expirySeconds % 60;
    const expiresIn = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    res.json({
      qrCode: qrCodeUrl,
      expiresAt: expiresAt.getTime(),
      expiresIn: expiresIn
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR: ' + error.message });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { qrCode, pin, latitude, longitude, wifiSSID } = req.body;
    const studentId = req.user._id;

    let classId;

    if (qrCode) {
      // Validate QR code
      const qrRecord = await QRCodeModel.findOne({ code: qrCode });
      if (!qrRecord) {
        return res.status(400).json({ error: 'Invalid QR Code' });
      }

      if (new Date() > qrRecord.expiresAt) {
        qrRecord.status = 'expired';
        await qrRecord.save();
        return res.status(400).json({ error: 'QR Code has expired' });
      }

      classId = qrRecord.classId;
      qrRecord.usedCount += 1;
      qrRecord.status = 'used';
      await qrRecord.save();
    } else if (pin) {
      // PIN validation (fallback or manual simulation)
      // Find the first active class in the student's department today
      const classes = await Class.find({ department: req.user.department });
      if (classes.length === 0) {
        return res.status(400).json({ error: 'No active classes found for your department' });
      }
      classId = classes[0]._id; // fallback to first class
    } else {
      return res.status(400).json({ error: 'Either QR Code or PIN is required' });
    }

    // Check if already marked today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const alreadyMarked = await Attendance.findOne({
      studentId,
      classId,
      markedTime: { $gte: startOfDay }
    });

    if (alreadyMarked) {
      return res.status(400).json({ error: 'Attendance already marked for this class today' });
    }

    // Save attendance record
    const attendanceRecord = new Attendance({
      studentId,
      classId,
      date: new Date(),
      status: 'present',
      markedBy: qrCode ? 'qr' : 'pin',
      ipAddress: req.ip || '127.0.0.1',
      location: {
        latitude,
        longitude,
        accuracy: 10
      },
      wifiSSID: wifiSSID || 'Unknown_WiFi',
      deviceInfo: req.headers['user-agent'] || 'Unknown Device'
    });

    await attendanceRecord.save();

    res.json({ success: true, message: 'Attendance marked successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark attendance: ' + error.message });
  }
};
