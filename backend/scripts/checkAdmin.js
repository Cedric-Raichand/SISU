
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('Admin account was not found.');
      return;
    }

    console.log('Account found:', true);
    console.log('Role:', user.role);
    console.log('Approval status:', user.vetApprovalStatus);

    const matches = await bcrypt.compare(
      process.env.ADMIN_PASSWORD,
      user.password
    );

    console.log(
      'Password in .env matches stored hash:',
      matches
    );
  } catch (error) {
    console.error('Diagnostic failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdmin();
