
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Access denied. Administrator access is required.',
    });
  }

  return next();
};

module.exports = { requireAdmin };
