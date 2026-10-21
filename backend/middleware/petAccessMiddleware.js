const mongoose = require('mongoose');
const Pet = require('../models/Pet');
const VetPetAccess = require('../models/VetPetAccess');

// Loads the pet in :petId and decides how the logged-in user may use it.
// Must run after `protect`.
//
//   req.pet        the pet document
//   req.petAccess  'owner' (the pet's owner) or 'vet' (approved vet)
//
// Everyone else, including admins, gets 403 (or 404 for a missing pet).
const loadPetWithAccess = async (req, res, next) => {
  try {
    const { petId } = req.params;

    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({ message: 'Invalid pet ID.' });
    }

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({ message: 'Pet not found.' });
    }

    if (
      req.user.role === 'owner' &&
      pet.owner.toString() === req.user.userId
    ) {
      req.pet = pet;
      req.petAccess = 'owner';
      return next();
    }

    if (
      req.user.role === 'vet' &&
      req.user.vetApprovalStatus === 'approved'
    ) {
      const hasAccess = await VetPetAccess.exists({
        owner: pet.owner,
        veterinarian: req.user.userId,
        pet: pet._id,
        status: 'approved',
      });

      if (hasAccess) {
        req.pet = pet;
        req.petAccess = 'vet';
        return next();
      }
    }

    return res.status(403).json({
      message: 'You do not have permission to access this pet.',
    });
  } catch (error) {
    console.error('Pet access check error:', error.message);

    return res.status(500).json({
      message: 'Unable to verify access to this pet.',
    });
  }
};

module.exports = { loadPetWithAccess };