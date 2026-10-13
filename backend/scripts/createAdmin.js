
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from .env');
    }

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error(
        'Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file first.'
      );
    }

    if (process.env.ADMIN_PASSWORD.length < 12) {
      throw new Error('Admin password must be at least 12 characters.');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        'An account with this email already exists. No changes made.'
      );
    }

    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      12
    );

    await User.create({
      name: process.env.ADMIN_NAME || 'Sisu Administrator',
      email,
      password: hashedPassword,
      role: 'admin',
      vetApprovalStatus: 'not_applicable',
    });

    console.log('Administrator account created successfully.');
  } catch (error) {
    console.error('Admin setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

createAdmin();
