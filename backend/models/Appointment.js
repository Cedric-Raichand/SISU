const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: true,
      index: true,
    },

    // Copied from the pet when the appointment is created, so an owner's
    // whole appointment list can be fetched with one query.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Optional link to a Sisu veterinarian who has approved access to the pet.
    veterinarian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Clinic name as chosen in the app (it may come from a nearby search).
    clinicName: { type: String, required: true, trim: true, maxlength: 200 },

    // YYYY-MM-DD and 24-hour HH:MM, matching the mobile app.
    date: { type: String, required: true },
    time24: { type: String, required: true },

    reason: { type: String, required: true, trim: true, maxlength: 300 },

    status: {
      type: String,
      enum: ['scheduled', 'cancelled'],
      default: 'scheduled',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);