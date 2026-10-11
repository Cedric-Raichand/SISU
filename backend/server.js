
const express = require('express');

const app = express();

const PORT = 5000;

app.get('/', (req, res) => {
  res.send('Welcome to the Sisu API!');
});

app.listen(PORT, () => {
  console.log(`Sisu server is running on port ${PORT}`);
});
