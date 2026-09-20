/**
 * Simple JSON file persistence
 * Auto-saves on write, loads on startup
 */

const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '../../data/storage');

// Ensure directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// In-memory cache with debounced saves
const cache = {};
const saveTimers = {};

/**
 * Load a collection from disk (returns object or array)
 */
function load(name, defaultValue = {}) {
  if (cache[name] !== undefined) return cache[name];

  const file = path.join(STORAGE_DIR, `${name}.json`);
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      console.log(`💾 Loaded ${name}: ${Array.isArray(data) ? data.length + ' items' : Object.keys(data).length + ' keys'}`);
      cache[name] = data;
      return data;
    }
  } catch (err) {
    console.error(`❌ Failed to load ${name}:`, err.message);
  }
  
  cache[name] = defaultValue;
  return defaultValue;
}

/**
 * Save a collection to disk (debounced by 500ms)
 */
function save(name, data) {
  cache[name] = data;
  
  if (saveTimers[name]) clearTimeout(saveTimers[name]);
  
  saveTimers[name] = setTimeout(() => {
    const file = path.join(STORAGE_DIR, `${name}.json`);
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`❌ Failed to save ${name}:`, err.message);
    }
  }, 500);
}

/**
 * Force immediate save (for shutdown)
 */
function saveNow(name, data) {
  cache[name] = data;
  const file = path.join(STORAGE_DIR, `${name}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`❌ Failed to save ${name}:`, err.message);
  }
}

/**
 * Convert Map to object for JSON
 */
function mapToObject(map) {
  return Object.fromEntries(map);
}

/**
 * Convert object to Map
 */
function objectToMap(obj) {
  return new Map(Object.entries(obj || {}));
}

/**
 * Stats about storage
 */
function getStats() {
  const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const filePath = path.join(STORAGE_DIR, f);
    const stats = fs.statSync(filePath);
    return {
      name: f.replace('.json', ''),
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  });
}

module.exports = {
  load,
  save,
  saveNow,
  mapToObject,
  objectToMap,
  getStats,
  STORAGE_DIR,
};
