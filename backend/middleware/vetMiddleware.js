
const requireApprovedVet = (req, res, next) => {
  if (!req.user || req.user.role !== 'vet') {
    return res.status(403).json({
      message: 'Access denied. Veterinarian access is required.',
    });
  }

  if (req.user.vetApprovalStatus !== 'approved') {
    return res.status(403).json({
      message: 'Your veterinarian account is awaiting approval.',
    });
  }

  next();
};

module.exports = { requireApprovedVet };
