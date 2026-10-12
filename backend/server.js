
const express = require('express');

const app = express();

app.use(express.json());

const PORT = 5000;

app.get('/', (req, res) => {
  res.send('Welcome to the Sisu API!');
});

app.post('/api/pets', (req, res) => {
  const pet = req.body;

  res.status(201).json({
    message: 'Pet data received successfully!',
    pet: pet,
  });
});


app.listen(PORT, () => {
  console.log(`Sisu server is running on port ${PORT}`);
});
