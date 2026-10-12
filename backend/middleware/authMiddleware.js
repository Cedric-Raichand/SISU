
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let decoded;

  // Step 1: Check the authorization header and verify the token.
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required. Please log in.',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Authentication is not configured.',
      });
    }

    const token = authHeader.split(' ')[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token. Please log in again.',
    });
  }

  // Step 2: Get the user's current role and vet approval status.
  let user;

  try {
    user = await User.findById(decoded.userId).select(
      'role vetApprovalStatus'
    );
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to verify your account right now.',
    });
  }

  if (!user) {
    return res.status(401).json({
      message: 'Account not found. Please log in again.',
    });
  }

  // Step 3: Attach the current database details to the request.
  req.user = {
    userId: user._id.toString(),
    role: user.role,
    vetApprovalStatus: user.vetApprovalStatus || 'not_applicable',
  };

  // Step 4: Continue to the route.
  return next();
};

module.exports = { protect };
