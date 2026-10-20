
const express = require('express');
const mongoose = require('mongoose');

const VetPetAccess = require('../models/VetPetAccess');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// View access requests for pets owned by the logged-in owner.
router.get('/requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        message: 'Only pet owners can view these requests.',
      });
    }

    const requests = await VetPetAccess.find({
      owner: req.user.userId,
      status: 'pending',
    })
      .populate('pet', 'name species')
      .populate('veterinarian', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('Access request retrieval error:', error.message);

    return res.status(500).json({
      message: 'Unable to retrieve access requests.',
    });
  }
});

// Approve or reject a veterinarian's request.
router.patch('/requests/:requestId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        message: 'Only pet owners can manage access requests.',
      });
    }

    const { requestId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({
        message: 'Invalid access request ID.',
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be approved or rejected.',
      });
    }

    const request = await VetPetAccess.findOne({
      _id: requestId,
      owner: req.user.userId,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({
        message: 'Pending access request not found.',
      });
    }

    request.status = status;
    request.approvedAt = status === 'approved' ? new Date() : null;
    request.revokedAt = null;

    await request.save();

    return res.status(200).json({
      message: `Veterinarian access request ${status}.`,
      request,
    });
  } catch (error) {
    console.error('Access request update error:', error.message);

    return res.status(500).json({
      message: 'Unable to update access request.',
    });
  }
});

 // Revoke a veterinarian's approved access to a pet.
router.patch('/pets/:petId/veterinarians/:vetId/revoke', protect, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        message: 'Only pet owners can revoke access.',
      });
    }

    const { petId, vetId } = req.params;

    if (
      !mongoose.isValidObjectId(petId) ||
      !mongoose.isValidObjectId(vetId)
    ) {
      return res.status(400).json({
        message: 'Invalid pet or veterinarian ID.',
      });
    }

    const access = await VetPetAccess.findOne({
      owner: req.user.userId,
      pet: petId,
      veterinarian: vetId,
      status: 'approved',
    });

    if (!access) {
      return res.status(404).json({
        message: 'Approved veterinarian access not found.',
      });
    }

    access.status = 'revoked';
    access.revokedAt = new Date();

    await access.save();

    return res.status(200).json({
      message: 'Veterinarian access revoked successfully.',
    });
  } catch (error) {
    console.error('Access revocation error:', error.message);

    return res.status(500).json({
      message: 'Unable to revoke veterinarian access.',
    });
  }
});


module.exports = router;
