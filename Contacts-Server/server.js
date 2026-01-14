const express = require('express');
const app = express();

// Povezovanje usmerjevalnika
const indexApi = require('./app-api/routes/index');

app.get('/', (req, res) => {
  res.send('Hello world!');
});

// ✅ CORS (Angular http://localhost:4200 -> backend http://localhost:3000)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Middleware za razumevanje JSON v telesu zahtev
app.use(express.json());

// Uporaba usmerjevalnika za API klice
app.use('/api', indexApi);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
