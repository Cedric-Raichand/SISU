
const express = require('express');

const app = express();

app.use(express.json());

const PORT = 5000;

app.get('/', (req, res) => {
  res.send('Welcome to the Sisu API!');
});


app.post('/api/pets', (req, res) => {
  const { name, species, age } = req.body;

  // Check required fields
  if (!name || !species) {
    return res.status(400).json({
      message: 'Pet name and species are required.',
    });
  }

  // Validate age if provided
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



app.listen(PORT, () => {
  console.log(`Sisu server is running on port ${PORT}`);
});
