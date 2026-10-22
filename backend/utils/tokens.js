const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');

// Access tokens are short-lived. The app keeps users signed in by trading a
// refresh token for a new access token when one expires.
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 30;

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Creates and stores a new refresh token. Returns the raw token (shown to the
// client once); only its hash is saved.
async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('base64url');

  await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    revokedAt: null,
  });

  return token;
}

module.exports = { createAccessToken, hashToken, issueRefreshToken };