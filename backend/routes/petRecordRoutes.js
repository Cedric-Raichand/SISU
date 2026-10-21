const express = require('express');
const mongoose = require('mongoose');

const HealthRecord = require('../models/HealthRecord');
const Vaccination = require('../models/Vaccination');
const User = require('../models/User');

const { protect } = require('../middleware/authMiddleware');
const { loadPetWithAccess } = require('../middleware/petAccessMiddleware');
const { isValidDateString, cleanText } = require('../utils/validation');

// Mounted at /api/pets/:petId, so :petId is available via mergeParams.
const router = express.Router({ mergeParams: true });

// Only the record paths are guarded here, so the existing /api/pets/:id
// routes in server.js are not affected.
router.use(['/health-records', '/vaccinations'], protect, loadPetWithAccess);

// ---------------------------------------------------------------------------
// Field rules. Only fields listed here can ever be written (no mass assignment).
// ---------------------------------------------------------------------------

const TEXT_LIMITS = {
  reason: 300,
  diagnosis: 2000,
  treatment: 2000,
  medication: 2000,
  veterinarian: 200,
  notes: 4000,
  vaccineName: 200,
};

// Reads the allowed text fields present in body. Returns { values } or { error }.
function readText(body, fields, requiredFields) {
  const values = {};

  for (const field of fields) {
    if (body[field] === undefined) {
      continue;
    }

    const text = cleanText(body[field], TEXT_LIMITS[field]);

    if (text === null) {
      return {
        error: `${field} must be text of at most ${TEXT_LIMITS[field]} characters.`,
      };
    }

    if (requiredFields.includes(field) && !text) {
      return { error: `${field} is required.` };
    }

    values[field] = text;
  }

  return { values };
}

// existing is null when creating, or the saved record when updating.
function parseHealthRecord(body, existing) {
  const { values, error } = readText(
    body,
    ['reason', 'diagnosis', 'treatment', 'medication', 'veterinarian', 'notes'],
    ['reason']
  );

  if (error) {
    return { error };
  }

  if (body.date !== undefined) {
    if (!isValidDateString(body.date)) {
      return { error: 'date must use YYYY-MM-DD, for example 2026-10-21.' };
    }

    values.date = body.date;
  }

  if (!existing) {
    if (!values.date) {
      return { error: 'date is required.' };
    }

    if (!values.reason) {
      return { error: 'reason is required.' };
    }
  }

  return { values };
}

function parseVaccination(body, existing) {
  const { values, error } = readText(
    body,
    ['vaccineName', 'veterinarian', 'notes'],
    ['vaccineName']
  );

  if (error) {
    return { error };
  }

  if (body.dateGiven !== undefined) {
    if (!isValidDateString(body.dateGiven)) {
      return {
        error: 'dateGiven must use YYYY-MM-DD, for example 2026-10-21.',
      };
    }

    values.dateGiven = body.dateGiven;
  }

  if (body.nextDueDate !== undefined) {
    if (body.nextDueDate !== '' && !isValidDateString(body.nextDueDate)) {
      return { error: 'nextDueDate must use YYYY-MM-DD or be empty.' };
    }

    values.nextDueDate = body.nextDueDate;
  }

  if (!existing) {
    if (!values.vaccineName) {
      return { error: 'vaccineName is required.' };
    }

    if (!values.dateGiven) {
      return { error: 'dateGiven is required.' };
    }
  }

  // The next due date cannot be before the date given.
  const dateGiven = values.dateGiven || (existing && existing.dateGiven);
  const nextDueDate =
    values.nextDueDate !== undefined
      ? values.nextDueDate
      : existing && existing.nextDueDate;

  if (nextDueDate && dateGiven && nextDueDate < dateGiven) {
    return { error: 'nextDueDate cannot be before dateGiven.' };
  }

  return { values };
}

// ---------------------------------------------------------------------------
// Generic CRUD for a record type that belongs to a pet.
// Owner: full access to the pet's records.
// Approved vet: read all, create, and edit or delete only their own records.
// ---------------------------------------------------------------------------

function mountRecordRoutes(path, { Model, label, parse, sort }) {
  // List records for the pet.
  router.get(path, async (req, res) => {
    try {
      const records = await Model.find({ pet: req.pet._id }).sort(sort);

      return res.status(200).json({ count: records.length, records });
    } catch (error) {
      console.error(`List ${label} error:`, error.message);

      return res.status(500).json({ message: `Unable to retrieve ${label}s.` });
    }
  });

  // Create a record.
  router.post(path, async (req, res) => {
    try {
      const { values, error } = parse(req.body || {}, null);

      if (error) {
        return res.status(400).json({ message: error });
      }

      // Vets default to their own name when no veterinarian is given.
      if (req.petAccess === 'vet' && !values.veterinarian) {
        const vet = await User.findById(req.user.userId).select('name');

        values.veterinarian = vet ? vet.name : '';
      }

      const record = await Model.create({
        ...values,
        pet: req.pet._id,
        recordedBy: req.user.userId,
        recordedByRole: req.petAccess,
      });

      return res.status(201).json({
        message: `${label} added successfully.`,
        record,
      });
    } catch (error) {
      console.error(`Create ${label} error:`, error.message);

      return res.status(500).json({ message: `Unable to add ${label}.` });
    }
  });

  // Loads :recordId for this pet and checks that the user may change it.
  async function loadEditableRecord(req, res) {
    const { recordId } = req.params;

    if (!mongoose.isValidObjectId(recordId)) {
      res.status(400).json({ message: 'Invalid record ID.' });
      return null;
    }

    const record = await Model.findOne({ _id: recordId, pet: req.pet._id });

    if (!record) {
      res.status(404).json({ message: `${label} not found.` });
      return null;
    }

    const isOwner = req.petAccess === 'owner';
    const isAuthor = record.recordedBy.toString() === req.user.userId;

    if (!isOwner && !isAuthor) {
      res.status(403).json({
        message: `You can change only ${label}s that you added.`,
      });
      return null;
    }

    return record;
  }

  // Read one record.
  router.get(`${path}/:recordId`, async (req, res) => {
    try {
      const { recordId } = req.params;

      if (!mongoose.isValidObjectId(recordId)) {
        return res.status(400).json({ message: 'Invalid record ID.' });
      }

      const record = await Model.findOne({
        _id: recordId,
        pet: req.pet._id,
      });

      if (!record) {
        return res.status(404).json({ message: `${label} not found.` });
      }

      return res.status(200).json({ record });
    } catch (error) {
      console.error(`Get ${label} error:`, error.message);

      return res.status(500).json({ message: `Unable to retrieve ${label}.` });
    }
  });

  // Update a record.
  router.patch(`${path}/:recordId`, async (req, res) => {
    try {
      const record = await loadEditableRecord(req, res);

      if (!record) {
        return;
      }

      const { values, error } = parse(req.body || {}, record);

      if (error) {
        return res.status(400).json({ message: error });
      }

      if (Object.keys(values).length === 0) {
        return res.status(400).json({
          message: 'Provide at least one valid field to update.',
        });
      }

      record.set(values);
      await record.save();

      return res.status(200).json({
        message: `${label} updated successfully.`,
        record,
      });
    } catch (error) {
      console.error(`Update ${label} error:`, error.message);

      return res.status(500).json({ message: `Unable to update ${label}.` });
    }
  });

  // Delete a record.
  router.delete(`${path}/:recordId`, async (req, res) => {
    try {
      const record = await loadEditableRecord(req, res);

      if (!record) {
        return;
      }

      await record.deleteOne();

      return res.status(200).json({ message: `${label} deleted successfully.` });
    } catch (error) {
      console.error(`Delete ${label} error:`, error.message);

      return res.status(500).json({ message: `Unable to delete ${label}.` });
    }
  });
}

mountRecordRoutes('/health-records', {
  Model: HealthRecord,
  label: 'Health record',
  parse: parseHealthRecord,
  sort: { date: -1, createdAt: -1 },
});

mountRecordRoutes('/vaccinations', {
  Model: Vaccination,
  label: 'Vaccination',
  parse: parseVaccination,
  sort: { dateGiven: -1, createdAt: -1 },
});

module.exports = router;