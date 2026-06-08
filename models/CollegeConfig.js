const mongoose = require('mongoose');

const CollegeConfigSchema = new mongoose.Schema({
  collegeName: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius: { type: Number, default: 100 } // in meters
  },
  wifiSSID: { type: String, default: 'Campus_Secure_5G' },
  allowedIPRange: { type: String, default: '192.168.1.0/24' },
  qrExpirySeconds: { type: Number, default: 15 },
  attendanceThreshold: { type: Number, default: 75 },
  vpnDetection: { type: Boolean, default: true },
  geoLocationRequired: { type: Boolean, default: true }
});

module.exports = mongoose.model('CollegeConfig', CollegeConfigSchema);
