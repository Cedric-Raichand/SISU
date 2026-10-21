const mongoose = require('mongoose');

const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    species: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    breed: { type: String, default: '', trim: true, maxlength: 100 },

    // YYYY-MM-DD, or empty when unknown (matches the mobile app).
    dateOfBirth: { type: String, default: '' },

    sex: { type: String, default: 'Unknown', trim: true, maxlength: 30 },

    // Free text such as "12 kg", as typed in the app.
    weight: { type: String, default: '', trim: true, maxlength: 50 },
    color: { type: String, default: '', trim: true, maxlength: 50 },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Pet', petSchema);