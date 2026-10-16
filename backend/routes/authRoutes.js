const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.post('/register', async (req, res) => {
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
router.post('/login', async (req, res) => {
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

    // TEMP DEBUG - remove after fixing login (never logs the password)
    console.log('LOGIN DEBUG', {
      found: Boolean(user),
      emailTried: email.trim().toLowerCase(),
      passwordLength: password.length,
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    // TEMP DEBUG - remove after fixing login
    console.log('LOGIN DEBUG passwordMatches:', passwordMatches);

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

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
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


router.post('/apply-as-vet', async (req, res) => {
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