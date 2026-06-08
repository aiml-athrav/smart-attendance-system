const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/role');
const attendanceController = require('../controllers/attendanceController');

router.post('/generate-qr', verifyToken, checkRole('teacher'), attendanceController.generateQR);
router.post('/mark-attendance', verifyToken, checkRole('student'), attendanceController.markAttendance);

module.exports = router;
