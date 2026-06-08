const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/role');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

// Create a new complaint/problem
router.post('/', verifyToken, async (req, res) => {
  try {
    const { receiverRole, receiverId, subject, message } = req.body;
    
    if (!receiverRole || !subject || !message) {
      return res.status(400).json({ error: 'Receiver role, subject, and message are required' });
    }

    if (receiverRole === 'teacher' && !receiverId) {
      return res.status(400).json({ error: 'Please select a teacher to send the complaint to' });
    }

    const complaintData = {
      sender: req.user.id,
      senderRole: req.user.role,
      receiverRole,
      subject,
      message,
      status: 'Pending'
    };

    if (receiverRole === 'teacher') {
      complaintData.receiver = receiverId;
    }

    const complaint = new Complaint(complaintData);
    await complaint.save();

    res.status(201).json({ message: 'Complaint raised successfully', complaint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve complaints based on role
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'student') {
      // Students see only their sent complaints
      query = { sender: req.user.id };
    } else if (req.user.role === 'teacher') {
      // Teachers see complaints sent to them OR complaints they raised to admin
      query = {
        $or: [
          { receiver: req.user.id },
          { sender: req.user.id }
        ]
      };
    } else if (req.user.role === 'admin') {
      // Admins see all complaints sent to admins
      query = { receiverRole: 'admin' };
    }

    const complaints = await Complaint.find(query)
      .populate('sender', 'name email department rollNo')
      .populate('receiver', 'name email department')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve a complaint
router.put('/:id/resolve', verifyToken, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Only the receiver or an admin can resolve the complaint
    const isReceiver = complaint.receiver && complaint.receiver.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isReceiverAdmin = complaint.receiverRole === 'admin' && isAdmin;

    if (!isReceiver && !isAdmin && !isReceiverAdmin) {
      return res.status(403).json({ error: 'Access denied: You cannot resolve this complaint' });
    }

    complaint.status = 'Resolved';
    await complaint.save();

    res.json({ message: 'Complaint resolved successfully', complaint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a list of all teachers for the student selector dropdown
router.get('/teachers', verifyToken, checkRole('student'), async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('name department email');
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
