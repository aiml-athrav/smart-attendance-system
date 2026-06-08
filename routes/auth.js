const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/auth');

const checkRole = require('../middleware/role');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.get('/verify-token', verifyToken, authController.verifyToken);

router.put('/update-profile-pic', verifyToken, async (req, res) => {
  try {
    const { profilePic } = req.body;
    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(req.user.id, { profilePic }, { new: true });
    res.json({ message: 'Profile picture updated successfully', profilePic: user.profilePic });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/update-profile', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true });
    res.json({ 
      message: 'Profile updated successfully', 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        rollNo: user.rollNo, 
        profilePic: user.profilePic 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get notices (Students, Teachers, and Admins see filtered/private notices)
router.get('/notices', verifyToken, async (req, res) => {
  try {
    const Notice = require('../models/Notice');
    let query = {};
    
    if (req.user.role === 'student') {
      const userDept = req.user.department || '';
      query = {
        $or: [
          { department: 'All', targetStudent: null, targetRole: { $in: ['All', 'student'] } },
          { department: userDept, targetStudent: null, targetRole: { $in: ['All', 'student'] } },
          { targetStudent: req.user._id }
        ]
      };
    } else if (req.user.role === 'teacher') {
      const userDept = req.user.department || '';
      query = {
        $or: [
          { department: 'All', targetStudent: null, targetRole: { $in: ['All', 'teacher'] } },
          { department: userDept, targetStudent: null, targetRole: { $in: ['All', 'teacher'] } },
          { targetStudent: req.user._id }
        ]
      };
    } else {
      // Admins see all notices they posted, public notices, and private notices sent directly to them
      query = {
        $or: [
          { targetStudent: null },
          { targetStudent: req.user._id }
        ]
      };
    }
    
    const notices = await Notice.find(query).populate('postedBy', 'name').sort({ createdAt: -1 });
    res.json(notices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notice (Teachers and Admins)
router.post('/notices', verifyToken, checkRole('admin', 'teacher'), async (req, res) => {
  try {
    const Notice = require('../models/Notice');
    const { title, content, category, department, targetStudent, targetRole } = req.body;
    
    let finalDept = department;
    if (req.user.role === 'teacher') {
      const Class = require('../models/Class');
      const teacherClasses = await Class.find({ teacherId: req.user._id });
      const teacherDepts = [...new Set(teacherClasses.map(c => c.department).filter(Boolean))];
      if (department && teacherDepts.includes(department)) {
        finalDept = department;
      } else {
        finalDept = req.user.department || 'All';
      }
    }

    const notice = new Notice({
      title,
      content,
      category,
      department: finalDept,
      targetStudent: targetStudent || null,
      targetRole: targetRole || 'All',
      postedBy: req.user._id
    });
    await notice.save();
    res.json({ message: 'Notice posted successfully', notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete notice (Admins delete any; Teachers delete only their own)
router.delete('/notices/:id', verifyToken, checkRole('admin', 'teacher'), async (req, res) => {
  try {
    const Notice = require('../models/Notice');
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ error: 'Notice not found' });
    
    if (req.user.role !== 'admin' && notice.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: You can only delete your own notices' });
    }
    
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
