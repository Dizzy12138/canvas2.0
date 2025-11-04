const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Test backend running on port ${PORT}`);
});
