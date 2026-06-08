const CollegeConfig = require('../models/CollegeConfig');

// Helper to check if IP is in subnet
const ipInSubnet = (ip, subnet) => {
  // Simple check for dev/localhost bypass
  if (ip === '127.0.0.1' || ip === '::1' || ip.includes('::ffff:127.0.0.1')) {
    return true;
  }
  
  try {
    const [subnetAddr, mask] = subnet.split('/');
    if (!mask) return ip === subnetAddr;

    const ipParts = ip.split('.').map(Number);
    const subnetParts = subnetAddr.split('.').map(Number);
    
    if (ipParts.length !== 4 || subnetParts.length !== 4) return false;

    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const subnetNum = (subnetParts[0] << 24) + (subnetParts[1] << 16) + (subnetParts[2] << 8) + subnetParts[3];
    
    const maskNum = -1 << (32 - parseInt(mask, 10));
    return (ipNum & maskNum) === (subnetNum & maskNum);
  } catch (e) {
    return false;
  }
};

const validateIP = async (req, res, next) => {
  try {
    const config = await CollegeConfig.findOne();
    if (!config || !config.allowedIPRange) {
      return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress;

    // Check if college allowed ranges contain it or bypass if local
    if (!ipInSubnet(clientIP, config.allowedIPRange)) {
      return res.status(403).json({
        error: `IP address ${clientIP} not authorized. Use college network (${config.allowedIPRange}) only.`
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'IP Validation failed: ' + error.message });
  }
};

module.exports = validateIP;
