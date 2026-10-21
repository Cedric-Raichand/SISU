const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: true,
      index: true,
    },

    // YYYY-MM-DD, matching the mobile app.
    date: { type: String, required: true },

    reason: { type: String, required: true, trim: true, maxlength: 300 },
    diagnosis: { type: String, default: '', trim: true, maxlength: 2000 },
    treatment: { type: String, default: '', trim: true, maxlength: 2000 },
    medication: { type: String, default: '', trim: true, maxlength: 2000 },

    // Free-text vet name shown in the app.
    veterinarian: { type: String, default: '', trim: true, maxlength: 200 },
    notes: { type: String, default: '', trim: true, maxlength: 4000 },

    // Who created the record. Vets may edit only records they created.
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

module.exports = mongoose.model('HealthRecord', healthRecordSchema);