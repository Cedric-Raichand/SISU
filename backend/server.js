require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Pet = require('./models/Pet');
const authRoutes = require('./routes/authRoutes');
const { protect } = require('./middleware/authMiddleware');
const { requireApprovedVet } = require('./middleware/vetMiddleware');
const adminRoutes = require('./routes/adminRoutes');
const vetPetAccessRoutes = require('./routes/vetPetAccessRoutes');
const ownerAccessRoutes = require('./routes/ownerAccessRoutes');
const VetPetAccess = require('./models/VetPetAccess');
const HealthRecord = require('./models/HealthRecord');
const Vaccination = require('./models/Vaccination');
const petRecordRoutes = require('./routes/petRecordRoutes');
const Appointment = require('./models/Appointment');
const { parsePet } = require('./utils/petValidation');
const {
  petAppointmentRouter,
  myAppointmentsRouter,
} = require('./routes/appointmentRoutes');

const app = express();

// The web version of the app runs on a different port than the API, so the
// browser needs CORS headers. Authentication uses a bearer token (no cookies),
// so allowing any origin is fine while developing. In production, set
// CORS_ORIGIN to a comma-separated list of allowed sites.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : true,
  })
);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vet-access', vetPetAccessRoutes);
app.use('/api/owner-access', ownerAccessRoutes);
app.use('/api/pets/:petId', petRecordRoutes);
app.use('/api/pets/:petId', petAppointmentRouter);
app.use('/api/appointments', myAppointmentsRouter);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.get('/', (req, res) => {
  res.send('Welcome to the Sisu API!');
});



app.post('/api/pets', protect, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        message: 'Only pet owners can create pets.',
      });
    }

    const { values, error } = parsePet(req.body || {}, { partial: false });

    if (error) {
      return res.status(400).json({ message: error });
    }

    const pet = await Pet.create({
      ...values,
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


app.get('/api/pets', protect, async (req, res) => {
  try {
    let pets;

    if (req.user.role === 'owner') {
      // Owners can see only their own pets.
      pets = await Pet.find({
        owner: req.user.userId,
      }).sort({ createdAt: -1 });
    } else if (req.user.role === 'vet') {
      // Vets can see only pets for which access was approved.
      const approvedAccess = await VetPetAccess.find({
        veterinarian: req.user.userId,
        status: 'approved',
      }).select('pet');

      const petIds = approvedAccess.map((access) => access.pet);

      pets = await Pet.find({
        _id: { $in: petIds },
      }).sort({ createdAt: -1 });
    } else {
      return res.status(403).json({
        message: 'You are not authorized to view pets.',
      });
    }

    return res.status(200).json({
      message: 'Pets retrieved successfully!',
      count: pets.length,
      pets,
    });
  } catch (error) {
    console.error('Error retrieving pets:', error.message);

    return res.status(500).json({
      message: 'Failed to retrieve pets.',
    });
  }
});




app.get('/api/pets/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid pet ID.',
      });
    }

    const pet = await Pet.findById(id);

    if (!pet) {
      return res.status(404).json({
        message: 'Pet not found.',
      });
    }

    // Owners can view their own pets.
    const isOwner =
      req.user.role === 'owner' &&
      pet.owner.toString() === req.user.userId;

    if (isOwner) {
      return res.status(200).json({
        message: 'Pet retrieved successfully!',
        pet,
      });
    }

    // Vets need an explicit, approved permission for this pet.
    if (req.user.role === 'vet') {
      const hasAccess = await VetPetAccess.exists({
        owner: pet.owner,
        veterinarian: req.user.userId,
        pet: pet._id,
        status: 'approved',
      });

      if (hasAccess) {
        return res.status(200).json({
          message: 'Pet retrieved successfully!',
          pet,
        });
      }
    }

    return res.status(403).json({
      message: 'You do not have permission to view this pet.',
    });
  } catch (error) {
    console.error('Error retrieving pet:', error.message);

    return res.status(500).json({
      message: 'Failed to retrieve pet.',
    });
  }
});



app.patch('/api/pets/:id', protect, async (req, res) => {
  try {
    const petId = req.params.id;

    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({
        message: 'Invalid pet ID.',
      });
    }

    const { values, error } = parsePet(req.body || {}, { partial: true });

    if (error) {
      return res.status(400).json({ message: error });
    }

    // Update only a pet owned by the logged-in user
    const pet = await Pet.findOneAndUpdate(
      {
        _id: petId,
        owner: req.user.userId,
      },
      { $set: values },
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



app.delete('/api/pets/:id', protect, async (req, res) => {
  try {
    const petId = req.params.id;

    // Validate the pet ID
    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({
        message: 'Invalid pet ID.',
      });
    }

    // Delete only a pet belonging to the logged-in owner
    const pet = await Pet.findOneAndDelete({
      _id: petId,
      owner: req.user.userId,
    });

    if (!pet) {
      return res.status(404).json({
        message: 'Pet not found.',
      });
    }

    // Remove access records and medical records for the deleted pet.
    await VetPetAccess.deleteMany({ pet: pet._id });
    await HealthRecord.deleteMany({ pet: pet._id });
    await Vaccination.deleteMany({ pet: pet._id });
    await Appointment.deleteMany({ pet: pet._id });

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
app.get(
  '/api/vet/test',
  protect,
  requireApprovedVet,
  (req, res) => {
    res.status(200).json({
      message: 'Approved veterinarian access granted.',
    });
  }
);


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