const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const {
  createAccessToken,
  hashToken,
  issueRefreshToken,
} = require('../utils/tokens');
const {
  loginLimiter,
  signupLimiter,
  refreshLimiter,
} = require('../middleware/rateLimiters');

const router = express.Router();

// A real bcrypt hash of a throwaway value. Comparing against it when the email
// is unknown makes "no such account" take as long as "wrong password", so
// response times do not reveal which emails are registered.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('sisu-timing-placeholder', 12);

router.post('/register', signupLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          'Name and email are required. Password must be at least 8 characters.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'owner',
    });

    res.status(201).json({
      message: 'Account registered successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    console.error('Registration error:', error.message);

    res.status(500).json({
      message: 'Registration failed.',
    });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    // Always run a password comparison, even for unknown emails.
    const passwordMatches = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_PASSWORD_HASH
    );

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing from .env');

      return res.status(500).json({
        message: 'Authentication is not configured.',
      });
    }

    const token = createAccessToken(user);
    const refreshToken = await issueRefreshToken(user._id);

    res.status(200).json({
      message: 'Login successful!',
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);

    res.status(500).json({
      message: 'Login failed.',
    });
  }
});


// Trade a refresh token for a new access token. Each refresh token works once:
// it is replaced by a new one (rotation). If an already-used token shows up
// again, someone may have copied it, so every session for that account is
// ended.
router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (typeof refreshToken !== 'string' || !refreshToken) {
      return res.status(400).json({
        message: 'Refresh token is required.',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Authentication is not configured.',
      });
    }

    const tokenHash = hashToken(refreshToken);

    // Claim the token atomically so two requests cannot both use it.
    const claimed = await RefreshToken.findOneAndUpdate(
      {
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { revokedAt: new Date() } }
    );

    if (!claimed) {
      const known = await RefreshToken.findOne({ tokenHash });

      if (known && known.revokedAt) {
        await RefreshToken.updateMany(
          { user: known.user, revokedAt: null },
          { $set: { revokedAt: new Date() } }
        );
      }

      return res.status(401).json({
        message: 'Session expired. Please sign in again.',
      });
    }

    const user = await User.findById(claimed.user);

    if (!user) {
      return res.status(401).json({
        message: 'Account not found. Please sign in again.',
      });
    }

    const token = createAccessToken(user);
    const newRefreshToken = await issueRefreshToken(user._id);

    return res.status(200).json({
      token,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh error:', error.message);

    return res.status(500).json({
      message: 'Could not refresh the session.',
    });
  }
});

// Ends a session by revoking its refresh token. Always answers 200, so it
// cannot be used to check whether a token exists.
router.post('/logout', refreshLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (typeof refreshToken === 'string' && refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { tokenHash: hashToken(refreshToken), revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
  } catch (error) {
    console.error('Logout error:', error.message);
  }

  return res.status(200).json({ message: 'Signed out.' });
});

router.post('/apply-as-vet', signupLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          'Name and email are required. Password must be at least 8 characters.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const vet = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'vet',
      vetApprovalStatus: 'pending',
    });

    res.status(201).json({
      message:
        'Veterinarian application submitted. Your account is pending approval.',
      user: {
        id: vet._id,
        name: vet.name,
        email: vet.email,
        role: vet.role,
        vetApprovalStatus: vet.vetApprovalStatus,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    console.error('Veterinarian application error:', error.message);

    res.status(500).json({
      message: 'Veterinarian application failed.',
    });
  }
});


module.exports = router;