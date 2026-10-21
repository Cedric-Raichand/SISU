const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: true,
      index: true,
    },

    vaccineName: { type: String, required: true, trim: true, maxlength: 200 },

    // YYYY-MM-DD, matching the mobile app.
    dateGiven: { type: String, required: true },
    nextDueDate: { type: String, default: '' },

    veterinarian: { type: String, default: '', trim: true, maxlength: 200 },
    notes: { type: String, default: '', trim: true, maxlength: 4000 },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recordedByRole: {
      type: String,
      enum: ['owner', 'vet'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vaccination', vaccinationSchema);