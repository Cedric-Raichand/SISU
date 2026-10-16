require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Compares the ADMIN_PASSWORD line in .env with what dotenv actually loaded.
// Prints lengths only, never the password itself.
function checkEnvPassword() {
  const loadedLength = (process.env.ADMIN_PASSWORD || '').length;

  console.log('ADMIN_PASSWORD length as loaded by dotenv:', loadedLength);

  try {
    const raw = fs.readFileSync(
      path.resolve(process.cwd(), '.env'),
      'utf8'
    );

    const line = raw
      .split(/\r?\n/)
      .find((item) => /^\s*ADMIN_PASSWORD\s*=/.test(item));

    if (!line) {
      console.log('No ADMIN_PASSWORD line was found in .env.');
      return;
    }

    let value = line.slice(line.indexOf('=') + 1).trim();
    const quoted = /^(['"`]).*\1$/.test(value);

    if (quoted) {
      value = value.slice(1, -1);
    }

    console.log('ADMIN_PASSWORD length written in the .env file:', value.length);

    if (!quoted && value.includes('#')) {
      console.log(
        'WARNING: the value contains "#" and is not in quotes. dotenv treats ' +
          'everything after "#" as a comment, so the loaded password is ' +
          'shorter than the one you typed. If "#" is part of the password, ' +
          'wrap it in quotes, for example ADMIN_PASSWORD="abc#123".'
      );
    } else if (value.length !== loadedLength) {
      console.log(
        'WARNING: the length in the file differs from the loaded length. ' +
          'Check the line for quotes, spaces, or special characters.'
      );
    } else {
      console.log('The .env password line looks fine.');
    }
  } catch (error) {
    console.log('Could not read the .env file to compare:', error.message);
  }
}

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
    console.log('Email used for lookup:', JSON.stringify(email));
    console.log('Email stored in database:', JSON.stringify(user.email));
    console.log('Role:', user.role);
    console.log('Approval status:', user.vetApprovalStatus);

    checkEnvPassword();

    const matches = await bcrypt.compare(
      process.env.ADMIN_PASSWORD,
      user.password
    );

    console.log(
      'Password in .env matches stored hash:',
      matches
    );

    console.log(
      'Reminder: login only works with the email shown above and the ' +
        'password the admin was created with.'
    );
  } catch (error) {
    console.error('Diagnostic failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdmin();