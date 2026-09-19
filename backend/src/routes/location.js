const express = require('express');
const router = express.Router();
const location = require('../services/location');

// Health + stats
router.get('/health', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Location service running',
      stats: location.getStats(),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    res.json({ success: true, stats: location.getStats() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Counties
router.get('/counties', (req, res) => {
  res.json({ success: true, counties: location.getCounties() });
});

// Sub-counties
router.get('/subcounties', (req, res) => {
  const { county } = req.query;
  if (!county) return res.status(400).json({ success: false, message: 'county required' });
  res.json({ success: true, subCounties: location.getSubCounties(county) });
});

// Constituencies
router.get('/constituencies', (req, res) => {
  const { county } = req.query;
  if (!county) return res.status(400).json({ success: false, message: 'county required' });
  res.json({ success: true, constituencies: location.getConstituencies(county) });
});

// Wards (by county OR county + constituency)
router.get('/wards', (req, res) => {
  const { county, constituency } = req.query;
  if (!county && !constituency) return res.status(400).json({ success: false, message: 'county or constituency required' });
  res.json({ success: true, wards: location.getWards(county, constituency) });
});

// Localities
router.get('/localities', (req, res) => {
  const { county } = req.query;
  if (!county) return res.status(400).json({ success: false, message: 'county required' });
  res.json({ success: true, localities: location.getLocalities(county) });
});

// Areas (villages, markets, estates)
router.get('/areas', (req, res) => {
  const { county, locality } = req.query;
  if (!county) return res.status(400).json({ success: false, message: 'county required' });
  res.json({ success: true, areas: location.getAreas(county, locality) });
});

// Search across all levels
router.get('/search', (req, res) => {
  const { q, limit } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'q required' });
  res.json({ success: true, results: location.search(q, parseInt(limit) || 40) });
});

// Resolve a full address
router.post('/resolve', (req, res) => {
  res.json({ success: true, location: location.resolve(req.body) });
});

module.exports = router;
