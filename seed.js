const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system');
    console.log('Connected to DB');

    // Clear existing users
    await User.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    const admin = new User({
      name: 'System Admin',
      email: 'admin@edusync.edu',
      password: password,
      role: 'admin',
      department: 'IT'
    });

    const teacher = new User({
      name: 'Dr. John Smith',
      email: 'teacher@edusync.edu',
      password: password,
      role: 'teacher',
      department: 'Computer Science'
    });

    const student = new User({
      name: 'Alice Johnson',
      email: 'student@edusync.edu',
      rollNo: '2021-CS-101',
      password: password,
      role: 'student',
      department: 'Computer Science'
    });

    await admin.save();
    await teacher.save();
    await student.save();

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
