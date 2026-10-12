
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const Pet = require('./models/Pet');
const authRoutes = require('./routes/authRoutes');
const { protect } = require('./middleware/authMiddleware');

const app = express();

app.use(express.json());

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.get('/', (req, res) => {
  res.send('Welcome to the Sisu API!');
});



app.post('/api/pets', protect, async (req, res) => {
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
      owner: req.user.userId,
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

app.get('/api/pets/:id', async (req, res) => {
  try {
    const petId = req.params.id;

    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({
        message: 'Invalid pet ID.',
      });
    }

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({
        message: 'Pet not found.',
      });
    }

    res.status(200).json({
      message: 'Pet retrieved successfully!',
      pet,
    });
  } catch (error) {
    console.error('Error retrieving pet:', error.message);

    res.status(500).json({
      message: 'Failed to retrieve pet.',
    });
  }
});

app.patch('/api/pets/:id', async (req, res) => {
  try {
    const petId = req.params.id;
    const { name, species, age } = req.body;

    // Check the pet ID
    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({
        message: 'Invalid pet ID.',
      });
    }

    // Only allow these fields to be updated
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          message: 'Name must be a non-empty string.',
        });
      }

      updates.name = name.trim();
    }

    if (species !== undefined) {
      if (typeof species !== 'string' || !species.trim()) {
        return res.status(400).json({
          message: 'Species must be a non-empty string.',
        });
      }

      updates.species = species.trim();
    }

    if (age !== undefined) {
      if (
        typeof age !== 'number' ||
        !Number.isFinite(age) ||
        age < 0
      ) {
        return res.status(400).json({
          message: 'Age must be a non-negative number.',
        });
      }

      updates.age = age;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'Provide at least one valid field to update.',
      });
    }

    const pet = await Pet.findByIdAndUpdate(
      petId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!pet) {
      return res.status(404).json({
        message: 'Pet not found.',
      });
    }

    res.status(200).json({
      message: 'Pet updated successfully!',
      pet,
    });
  } catch (error) {
    console.error('Error updating pet:', error.message);

    res.status(500).json({
      message: 'Failed to update pet.',
    });
  }
});

app.delete('/api/pets/:id', async (req, res) => {
  try {
    const petId = req.params.id;

    // Check whether the ID is valid
    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({
        message: 'Invalid pet ID.',
      });
    }

    // Find and delete the pet
    const pet = await Pet.findByIdAndDelete(petId);

    // Check whether the pet exists
    if (!pet) {
      return res.status(404).json({
        message: 'Pet not found.',
      });
    }

    res.status(200).json({
      message: 'Pet deleted successfully!',
      pet,
    });
  } catch (error) {
    console.error('Error deleting pet:', error.message);

    res.status(500).json({
      message: 'Failed to delete pet.',
    });
  }
});

app.get('/api/auth/me', protect, (req, res) => {
  res.status(200).json({
    message: 'You are authenticated!',
    user: req.user,
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
