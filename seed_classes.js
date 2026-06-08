const mongoose = require('mongoose');
const User = require('./models/User');
const Class = require('./models/Class');
const Attendance = require('./models/Attendance');
require('dotenv').config();

async function seedClasses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system');
    console.log('Connected to DB');

    const teacher = await User.findOne({ email: 'teacher@edusync.edu' });
    if (!teacher) {
      console.log('Teacher not found. Run seed.js first.');
      process.exit(1);
    }

    // Clear existing classes
    await Class.deleteMany({});

    const class1 = new Class({
      name: 'B.Tech CS 3rd Year',
      subject: 'Data Structures',
      department: 'Computer Science',
      semester: 5,
      teacherId: teacher._id,
      room: 'Lab 1',
      schedule: {
        day: 'Monday',
        startTime: '10:00',
        endTime: '11:00'
      },
      location: {
        latitude: 18.5204,
        longitude: 73.8567,
        radius: 100
      }
    });

    const class2 = new Class({
      name: 'B.Tech CS 3rd Year',
      subject: 'Algorithms',
      department: 'Computer Science',
      semester: 5,
      teacherId: teacher._id,
      room: 'Lecture Hall 2',
      schedule: {
        day: 'Tuesday',
        startTime: '14:00',
        endTime: '15:00'
      },
      location: {
        latitude: 18.5204,
        longitude: 73.8567,
        radius: 100
      }
    });

    const class3 = new Class({
      name: 'B.Tech IT 3rd Year',
      subject: 'Software Engineering',
      department: 'Information Technology',
      semester: 5,
      teacherId: teacher._id,
      room: 'Room 302',
      schedule: {
        day: 'Monday',
        startTime: '11:30',
        endTime: '12:30'
      },
      location: {
        latitude: 18.5204,
        longitude: 73.8567,
        radius: 100
      }
    });

    const class4 = new Class({
      name: 'B.Tech CS 2nd Year',
      subject: 'Database Systems',
      department: 'Computer Science',
      semester: 3,
      teacherId: teacher._id,
      room: 'Lab 3',
      schedule: {
        day: 'Monday',
        startTime: '14:00',
        endTime: '15:00'
      },
      location: {
        latitude: 18.5204,
        longitude: 73.8567,
        radius: 100
      }
    });

    const class5 = new Class({
      name: 'B.Tech ECE 2nd Year',
      subject: 'Digital Electronics',
      department: 'Electronics',
      semester: 3,
      teacherId: teacher._id,
      room: 'ECE Seminar Hall',
      schedule: {
        day: 'Tuesday',
        startTime: '09:00',
        endTime: '10:00'
      },
      location: {
        latitude: 18.5204,
        longitude: 73.8567,
        radius: 100
      }
    });

    const class6 = new Class({
      name: 'B.Tech CS 4th Year',
      subject: 'Web Development',
      department: 'Computer Science',
      semester: 7,
      teacherId: teacher._id,
      room: 'Lab 4',
      schedule: {
        day: 'Tuesday',
        startTime: '15:30',
        endTime: '16:30'
      },
      location: {
        latitude: 18.5204,
        longitude: 73.8567,
        radius: 100
      }
    });

    const class7 = new Class({
      name: 'B.Tech CS 3rd Year',
      subject: 'Compiler Design',
      department: 'Computer Science',
      semester: 5,
      teacherId: teacher._id,
      room: 'Room 201',
      schedule: {
        day: 'Wednesday',
        startTime: '10:00',
        endTime: '11:00'
      },
      location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
    });

    const class8 = new Class({
      name: 'B.Tech IT 3rd Year',
      subject: 'Computer Networks',
      department: 'Information Technology',
      semester: 5,
      teacherId: teacher._id,
      room: 'Lab 2',
      schedule: {
        day: 'Wednesday',
        startTime: '11:30',
        endTime: '12:30'
      },
      location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
    });

    const class9 = new Class({
      name: 'B.Tech ECE 2nd Year',
      subject: 'Microprocessors',
      department: 'Electronics',
      semester: 3,
      teacherId: teacher._id,
      room: 'Room 105',
      schedule: {
        day: 'Thursday',
        startTime: '09:00',
        endTime: '10:00'
      },
      location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
    });

    const class10 = new Class({
      name: 'B.Tech CS 3rd Year',
      subject: 'Theory of Computation',
      department: 'Computer Science',
      semester: 5,
      teacherId: teacher._id,
      room: 'Lecture Hall 1',
      schedule: {
        day: 'Thursday',
        startTime: '14:00',
        endTime: '15:00'
      },
      location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
    });

    const class11 = new Class({
      name: 'B.Tech CS 3rd Year',
      subject: 'Artificial Intelligence',
      department: 'Computer Science',
      semester: 5,
      teacherId: teacher._id,
      room: 'Seminar Room A',
      schedule: {
        day: 'Friday',
        startTime: '10:00',
        endTime: '11:00'
      },
      location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
    });

    const class12 = new Class({
      name: 'B.Tech IT 3rd Year',
      subject: 'Information Security',
      department: 'Information Technology',
      semester: 5,
      teacherId: teacher._id,
      room: 'Lab 5',
      schedule: {
        day: 'Friday',
        startTime: '11:30',
        endTime: '12:30'
      },
      location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
    });

    const class13 = new Class({
      name: 'B.Tech CS 4th Year',
      subject: 'Machine Learning',
      department: 'Computer Science',
      semester: 7,
      teacherId: teacher._id,
      room: 'Lab 6',
      schedule: {
        day: 'Saturday',
        startTime: '10:00',
        endTime: '11:00'
      },
      location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
    });

    const class14 = new Class({
      name: 'B.Tech CS 4th Year',
      subject: 'Project Seminar',
      department: 'Computer Science',
      semester: 7,
      teacherId: teacher._id,
      room: 'Auditorium 2',
      schedule: {
        day: 'Saturday',
        startTime: '11:30',
        endTime: '13:00'
      },
      location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
    });

    const class15 = new Class({
      name: 'B.Tech CS 3rd Year',
      subject: 'Special Guest Lecture',
      department: 'Computer Science',
      semester: 5,
      teacherId: teacher._id,
      room: 'Main Seminar Hall',
      schedule: {
        day: 'Sunday',
        startTime: '11:00',
        endTime: '12:30'
      },
      location: { latitude: 18.5204, longitude: 73.8567, radius: 100 }
    });

    await class1.save();
    await class2.save();
    await class3.save();
    await class4.save();
    await class5.save();
    await class6.save();
    await class7.save();
    await class8.save();
    await class9.save();
    await class10.save();
    await class11.save();
    await class12.save();
    await class13.save();
    await class14.save();
    await class15.save();

    console.log('Classes seeded successfully!');

    const student = await User.findOne({ email: 'student@edusync.edu' });
    if (student) {
      // Clear existing attendance
      await Attendance.deleteMany({ studentId: student._id });

      // Create some attendance records
      const date1 = new Date();
      date1.setDate(date1.getDate() - 1); // Yesterday
      
      const date2 = new Date();
      date2.setDate(date2.getDate() - 2); // 2 days ago

      const date3 = new Date();
      date3.setDate(date3.getDate() - 3); // 3 days ago

      const date4 = new Date();
      date4.setDate(date4.getDate() - 4); // 4 days ago

      const attendanceRecords = [
        {
          studentId: student._id,
          classId: class1._id,
          date: date1,
          markedTime: date1,
          status: 'present',
          markedBy: 'qr'
        },
        {
          studentId: student._id,
          classId: class2._id,
          date: date2,
          markedTime: date2,
          status: 'absent',
          markedBy: 'manual'
        },
        {
          studentId: student._id,
          classId: class1._id,
          date: date3,
          markedTime: date3,
          status: 'present',
          markedBy: 'qr'
        },
        {
          studentId: student._id,
          classId: class2._id,
          date: date4,
          markedTime: date4,
          status: 'present',
          markedBy: 'pin'
        }
      ];

      await Attendance.insertMany(attendanceRecords);
      console.log('Attendance history seeded successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedClasses();
