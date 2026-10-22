const mongoose = require('mongoose');

// One record per refresh token that has been issued. Only a hash of the token
// is stored, so a database leak does not expose usable tokens.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    // Set when the token has been used (rotated) or the user signed out.
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// MongoDB removes expired records automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);