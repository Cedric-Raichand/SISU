const express = require('express');
const mongoose = require('mongoose');

const Appointment = require('../models/Appointment');
const VetPetAccess = require('../models/VetPetAccess');

const { protect } = require('../middleware/authMiddleware');
const { loadPetWithAccess } = require('../middleware/petAccessMiddleware');
const { isValidDateString, cleanText } = require('../utils/validation');

const SORT = { date: 1, time24: 1 };

function isValidTime24(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// Reads and validates appointment fields. existing is null when creating.
// Returns { values } or { error }. `veterinarian` is checked separately.
function parseAppointment(body, existing) {
  const values = {};

  for (const [field, max] of [
    ['clinicName', 200],
    ['reason', 300],
  ]) {
    if (body[field] === undefined) {
      continue;
    }

    const text = cleanText(body[field], max);

    if (text === null || !text) {
      return { error: `${field} is required and must be at most ${max} characters.` };
    }

    values[field] = text;
  }

  if (body.date !== undefined) {
    if (!isValidDateString(body.date)) {
      return { error: 'date must use YYYY-MM-DD, for example 2026-11-05.' };
    }

    values.date = body.date;
  }

  if (body.time24 !== undefined) {
    if (!isValidTime24(body.time24)) {
      return { error: 'time24 must use 24-hour HH:MM, for example 14:30.' };
    }

    values.time24 = body.time24;
  }

  if (body.status !== undefined) {
    if (!['scheduled', 'cancelled'].includes(body.status)) {
      return { error: 'status must be scheduled or cancelled.' };
    }

    if (!existing) {
      return { error: 'A new appointment cannot start as cancelled.' };
    }

    values.status = body.status;
  }

  if (!existing) {
    for (const field of ['clinicName', 'date', 'time24', 'reason']) {
      if (!values[field]) {
        return { error: `${field} is required.` };
      }
    }
  }

  return { values };
}

// Makes sure a linked veterinarian currently has approved access to the pet.
// Returns an error message, or null if the link is fine.
async function checkVeterinarianLink(pet, veterinarianId) {
  if (!mongoose.isValidObjectId(veterinarianId)) {
    return 'veterinarian must be a valid user ID or null.';
  }

  const hasAccess = await VetPetAccess.exists({
    owner: pet.owner,
    veterinarian: veterinarianId,
    pet: pet._id,
    status: 'approved',
  });

  return hasAccess
    ? null
    : 'That veterinarian does not have approved access to this pet.';
}

// ---------------------------------------------------------------------------
// /api/pets/:petId/appointments
// Owner: full access. Approved vet: read-only.
// ---------------------------------------------------------------------------

const petAppointmentRouter = express.Router({ mergeParams: true });

petAppointmentRouter.use('/appointments', protect, loadPetWithAccess);

petAppointmentRouter.get('/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find({ pet: req.pet._id }).sort(SORT);

    return res.status(200).json({
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error('List appointments error:', error.message);

    return res.status(500).json({ message: 'Unable to retrieve appointments.' });
  }
});

petAppointmentRouter.get('/appointments/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!mongoose.isValidObjectId(appointmentId)) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      pet: req.pet._id,
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    return res.status(200).json({ appointment });
  } catch (error) {
    console.error('Get appointment error:', error.message);

    return res.status(500).json({ message: 'Unable to retrieve appointment.' });
  }
});

// Everything below changes data, so only the pet's owner may do it.
function ownerOnly(req, res, next) {
  if (req.petAccess !== 'owner') {
    return res.status(403).json({
      message: 'Only the pet owner can change appointments.',
    });
  }

  return next();
}

petAppointmentRouter.post('/appointments', ownerOnly, async (req, res) => {
  try {
    const body = req.body || {};
    const { values, error } = parseAppointment(body, null);

    if (error) {
      return res.status(400).json({ message: error });
    }

    let veterinarian = null;

    if (body.veterinarian !== undefined && body.veterinarian !== null) {
      const linkError = await checkVeterinarianLink(req.pet, body.veterinarian);

      if (linkError) {
        return res.status(400).json({ message: linkError });
      }

      veterinarian = body.veterinarian;
    }

    const appointment = await Appointment.create({
      ...values,
      veterinarian,
      pet: req.pet._id,
      owner: req.pet.owner,
    });

    return res.status(201).json({
      message: 'Appointment booked successfully.',
      appointment,
    });
  } catch (error) {
    console.error('Create appointment error:', error.message);

    return res.status(500).json({ message: 'Unable to book appointment.' });
  }
});

petAppointmentRouter.patch(
  '/appointments/:appointmentId',
  ownerOnly,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const body = req.body || {};

      if (!mongoose.isValidObjectId(appointmentId)) {
        return res.status(400).json({ message: 'Invalid appointment ID.' });
      }

      const appointment = await Appointment.findOne({
        _id: appointmentId,
        pet: req.pet._id,
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found.' });
      }

      const { values, error } = parseAppointment(body, appointment);

      if (error) {
        return res.status(400).json({ message: error });
      }

      if (body.veterinarian !== undefined) {
        if (body.veterinarian === null) {
          values.veterinarian = null;
        } else {
          const linkError = await checkVeterinarianLink(
            req.pet,
            body.veterinarian
          );

          if (linkError) {
            return res.status(400).json({ message: linkError });
          }

          values.veterinarian = body.veterinarian;
        }
      }

      if (Object.keys(values).length === 0) {
        return res.status(400).json({
          message: 'Provide at least one valid field to update.',
        });
      }

      appointment.set(values);
      await appointment.save();

      return res.status(200).json({
        message: 'Appointment updated successfully.',
        appointment,
      });
    } catch (error) {
      console.error('Update appointment error:', error.message);

      return res.status(500).json({ message: 'Unable to update appointment.' });
    }
  }
);

petAppointmentRouter.delete(
  '/appointments/:appointmentId',
  ownerOnly,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;

      if (!mongoose.isValidObjectId(appointmentId)) {
        return res.status(400).json({ message: 'Invalid appointment ID.' });
      }

      const appointment = await Appointment.findOne({
        _id: appointmentId,
        pet: req.pet._id,
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found.' });
      }

      await appointment.deleteOne();

      return res.status(200).json({ message: 'Appointment deleted successfully.' });
    } catch (error) {
      console.error('Delete appointment error:', error.message);

      return res.status(500).json({ message: 'Unable to delete appointment.' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/appointments
// All of the logged-in owner's appointments, across every pet.
// ---------------------------------------------------------------------------

const myAppointmentsRouter = express.Router();

myAppointmentsRouter.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        message: 'Only pet owners can view their appointments here.',
      });
    }

    const appointments = await Appointment.find({
      owner: req.user.userId,
    })
      .populate('pet', 'name species')
      .sort(SORT);

    return res.status(200).json({
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error('List my appointments error:', error.message);

    return res.status(500).json({ message: 'Unable to retrieve appointments.' });
  }
});

module.exports = { petAppointmentRouter, myAppointmentsRouter };