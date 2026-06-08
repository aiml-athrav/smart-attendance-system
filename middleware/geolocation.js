const CollegeConfig = require('../models/CollegeConfig');

// Calculate distance between two coordinates in meters (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const checkGeolocation = async (req, res, next) => {
  try {
    const config = await CollegeConfig.findOne();
    if (!config || !config.geoLocationRequired) {
      return next();
    }

    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Geolocation coordinates are required' });
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      config.location.latitude,
      config.location.longitude
    );

    if (distance > config.location.radius) {
      return res.status(403).json({
        error: `Out of college range. Distance: ${Math.round(distance)}m. Allowed radius: ${config.location.radius}m.`
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Geolocation check failed: ' + error.message });
  }
};

module.exports = checkGeolocation;
