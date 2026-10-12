
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const Pet = require('./models/Pet');

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.get('/', (req, res) => {
  res.send('Welcome to the Sisu API!');
});


app.post('/api/pets', async (req, res) => {
  try {
    const { name, species, age } = req.body;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof species !== 'string' ||
      !species.trim()
    ) {
      return res.status(400).json({
        message: 'Pet name and species are required.',
      });
    }

    if (
      age !== undefined &&
      (typeof age !== 'number' ||
        !Number.isFinite(age) ||
        age < 0)
    ) {
      return res.status(400).json({
        message: 'Age must be a non-negative number.',
      });
    }

    const pet = await Pet.create({
      name: name.trim(),
      species: species.trim(),
      ...(age !== undefined ? { age } : {}),
    });

    res.status(201).json({
      message: 'Pet created successfully!',
      pet,
    });
  } catch (error) {
    console.error('Error creating pet:', error.message);

    res.status(500).json({
      message: 'Failed to create pet.',
    });
  }
});

app.get('/api/pets', async (req, res) => {
  try {
    const pets = await Pet.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Pets retrieved successfully!',
      count: pets.length,
      pets,
    });
  } catch (error) {
    console.error('Error retrieving pets:', error.message);

    res.status(500).json({
      message: 'Failed to retrieve pets.',
    });
  }
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
