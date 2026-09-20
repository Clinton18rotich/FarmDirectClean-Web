const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'FarmDirect API', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/escrow', require('./routes/escrow'));
app.use('/api/pochi', require('./routes/pochi'));
app.use('/api/business', require('./routes/business'));
app.use('/api/location', require('./routes/location'));
app.use('/api/farmer', require('./routes/farmer'));
app.use('/api/rider', require('./routes/rider'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/shamba', require('./routes/shamba'));
app.use('/api/slaughterhouse', require('./routes/slaughterhouse'));

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('❌', err);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FarmDirect API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  // Preload location data
  require('./services/location')._load();
});
