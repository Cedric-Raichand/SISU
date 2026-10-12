
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.get('/', (req, res) => {
  res.send('Welcome to the Sisu API!');
});

app.post('/api/pets', (req, res) => {
  const { name, species, age } = req.body;

  if (!name || !species) {
    return res.status(400).json({
      message: 'Pet name and species are required.',
    });
  }

  if (age !== undefined && (!Number.isFinite(age) || age < 0)) {
    return res.status(400).json({
      message: 'Age must be a non-negative number.',
    });
  }

  const pet = { name, species, age };

  res.status(201).json({
    message: 'Pet created successfully!',
    pet,
  });
});

async function startServer() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is missing from the .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);

    console.log('Connected to MongoDB successfully!');

    app.listen(PORT, () => {
      console.log(`Sisu server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

startServer();
