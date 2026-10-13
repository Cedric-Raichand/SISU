
const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

// View veterinarian applications awaiting approval.
router.get('/veterinarians/pending', protect, requireAdmin, async (req, res) => {
  try {
    const veterinarians = await User.find({
      role: 'vet',
      vetApprovalStatus: 'pending',
    }).select('name email createdAt');

    return res.status(200).json({ veterinarians });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to retrieve pending veterinarian applications.',
    });
  }
});

// Approve or reject a veterinarian application.
router.patch('/veterinarians/:id/approval', protect, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be either approved or rejected.',
      });
    }

    const veterinarian = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: 'vet',
        vetApprovalStatus: 'pending',
      },
      { vetApprovalStatus: status },
      { new: true, runValidators: true }
    ).select('name email role vetApprovalStatus');

    if (!veterinarian) {
      return res.status(404).json({
        message: 'Pending veterinarian application not found.',
      });
    }

    return res.status(200).json({
      message: `Veterinarian application ${status}.`,
      veterinarian,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid veterinarian ID.',
      });
    }

    return res.status(500).json({
      message: 'Unable to update veterinarian approval status.',
    });
  }
});

module.exports = router;
