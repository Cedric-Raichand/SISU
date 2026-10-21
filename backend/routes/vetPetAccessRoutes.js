const express = require('express');
const mongoose = require('mongoose');

const Pet = require('../models/Pet');
const User = require('../models/User');
const VetPetAccess = require('../models/VetPetAccess');

const { protect } = require('../middleware/authMiddleware');
const { requireApprovedVet } = require('../middleware/vetMiddleware');

const router = express.Router();

// An approved veterinarian requests access to a pet.
router.post('/pets/:petId/request', protect, requireApprovedVet, async (req, res) => {
  try {
    const { petId } = req.params;

    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({
        message: 'Invalid pet ID.',
      });
    }

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({
        message: 'Pet not found.',
      });
    }

    // The veterinarian cannot request access to their own pet account.
    if (pet.owner.toString() === req.user.userId) {
      return res.status(400).json({
        message: 'You cannot request veterinarian access to your own pet.',
      });
    }

    // Ensure the pet's owner account still exists.
    const owner = await User.findById(pet.owner).select('_id role');

    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({
        message: 'Pet owner not found.',
      });
    }

    const existingAccess = await VetPetAccess.findOne({
      owner: pet.owner,
      veterinarian: req.user.userId,
      pet: pet._id,
    });

    if (existingAccess) {
      if (existingAccess.status === 'pending') {
        return res.status(409).json({
          message: 'An access request is already pending.',
        });
      }

      if (existingAccess.status === 'approved') {
        return res.status(409).json({
          message: 'You already have access to this pet.',
        });
      }

      // A rejected or revoked request may be submitted again.
      // The owner must still approve it before any access is granted.
      existingAccess.status = 'pending';
      existingAccess.requestedAt = new Date();
      existingAccess.approvedAt = null;
      existingAccess.revokedAt = null;

      await existingAccess.save();

      return res.status(201).json({
        message: 'Pet access request submitted successfully.',
        accessRequest: existingAccess,
      });
    }

    const accessRequest = await VetPetAccess.create({
      owner: pet.owner,
      veterinarian: req.user.userId,
      pet: pet._id,
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Pet access request submitted successfully.',
      accessRequest,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An access request already exists for this pet.',
      });
    }

    console.error('Pet access request error:', error.message);

    return res.status(500).json({
      message: 'Unable to submit pet access request.',
    });
  }
});

module.exports = router;