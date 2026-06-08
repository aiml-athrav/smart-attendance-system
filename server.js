const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('public'));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/student', require('./routes/students'));
app.use('/api/teacher', require('./routes/teachers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/complaints', require('./routes/complaints'));

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server error occurred' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`EduSync Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Start automated weekly notification scheduler
  try {
    const { initNotificationScheduler } = require('./services/notificationScheduler');
    initNotificationScheduler();
  } catch (err) {
    console.error('Failed to initialize scheduler:', err.message);
  }
});
