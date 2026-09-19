const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

// Load all data once at startup
let data = null;

function load() {
  if (data) return data;

  const read = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));

  data = {
    counties: read('counties.json'),
    subCounties: read('sub-counties.json'),
    constituencies: read('constituencies.json'),
    wards: read('wards.json'),
    localities: read('locality.json'),
    areas: read('area.json'),
  };

  console.log(`📍 Location data loaded:`);
  console.log(`   ${data.counties.length} counties`);
  console.log(`   ${data.subCounties.length} sub-counties`);
  console.log(`   ${data.constituencies.length} constituencies`);
  console.log(`   ${data.wards.length} wards`);
  console.log(`   ${data.localities.length} localities`);
  console.log(`   ${data.areas.length} areas`);

  return data;
}

// ============ QUERIES ============

function getCounties() {
  return load().counties;
}

function getCounty(name) {
  return load().counties.find(c => c.name.toLowerCase() === name.toLowerCase());
}

function getSubCounties(countyName) {
  if (!countyName) return [];
  return load().subCounties.filter(s => s.county === countyName);
}

function getConstituencies(countyName) {
  if (!countyName) return [];
  return load().constituencies.filter(c => c.county === countyName);
}

function getWards(countyName, constituencyName) {
  const all = load();
  // Wards link via constituency
  let constituencyNames = [];

  if (constituencyName) {
    constituencyNames = [constituencyName];
  } else if (countyName) {
    constituencyNames = all.constituencies
      .filter(c => c.county === countyName)
      .map(c => c.name);
  } else {
    return [];
  }

  return all.wards.filter(w => constituencyNames.includes(w.constituency));
}

function getLocalities(countyName) {
  if (!countyName) return [];
  return load().localities.filter(l => l.county === countyName);
}

function getAreas(countyName, localityName) {
  if (!countyName) return [];
  return load().areas.filter(a =>
    a.county === countyName &&
    (!localityName || a.locality === localityName)
  );
}

// ============ SEARCH (all levels) ============

function search(query, limit = 40) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const d = load();
  const results = [];

  for (const c of d.counties) {
    if (c.name.toLowerCase().includes(q)) {
      results.push({
        type: 'county',
        name: c.name,
        county: c.name,
        meta: { capital: c.capital, code: c.code },
      });
    }
  }

  for (const s of d.subCounties) {
    if (s.name.toLowerCase().includes(q)) {
      results.push({ type: 'subCounty', name: s.name, county: s.county, meta: { code: s.code } });
    }
  }

  for (const c of d.constituencies) {
    if (c.name.toLowerCase().includes(q)) {
      results.push({ type: 'constituency', name: c.name, county: c.county, meta: { code: c.code } });
    }
  }

  for (const w of d.wards) {
    if (w.name.toLowerCase().includes(q)) {
      // Find the county via constituency
      const con = d.constituencies.find(c => c.name === w.constituency);
      results.push({
        type: 'ward',
        name: w.name,
        county: con?.county || null,
        constituency: w.constituency,
        meta: { code: w.code },
      });
    }
  }

  for (const l of d.localities) {
    if (l.name.toLowerCase().includes(q)) {
      results.push({ type: 'locality', name: l.name, county: l.county });
    }
  }

  for (const a of d.areas) {
    if (a.name.toLowerCase().includes(q)) {
      results.push({
        type: 'area',
        name: a.name,
        locality: a.locality,
        county: a.county,
      });
    }
  }

  // Sort: exact matches first, then startsWith, then includes
  results.sort((a, b) => {
    const aExact = a.name.toLowerCase() === q ? 0 : a.name.toLowerCase().startsWith(q) ? 1 : 2;
    const bExact = b.name.toLowerCase() === q ? 0 : b.name.toLowerCase().startsWith(q) ? 1 : 2;
    return aExact - bExact;
  });

  return results.slice(0, limit);
}

// ============ RESOLVE (build full address) ============

function resolve({ county, subCounty, constituency, ward, locality, area, manual }) {
  if (manual) {
    return {
      county: county || null,
      subCounty: subCounty || null,
      constituency: constituency || null,
      ward: ward || null,
      locality: locality || null,
      area: area || null,
      manual,
      fullAddress: manual,
      shortAddress: manual,
    };
  }

  const parts = [area, locality, ward, constituency, subCounty, county].filter(Boolean);
  const fullAddress = parts.join(', ');

  const shortParts = [ward, constituency, county].filter(Boolean);
  const shortAddress = shortParts.join(', ');

  return {
    county: county || null,
    subCounty: subCounty || null,
    constituency: constituency || null,
    ward: ward || null,
    locality: locality || null,
    area: area || null,
    manual: null,
    fullAddress,
    shortAddress,
  };
}

// ============ STATS (for dashboard) ============

function getStats() {
  const d = load();
  return {
    counties: d.counties.length,
    subCounties: d.subCounties.length,
    constituencies: d.constituencies.length,
    wards: d.wards.length,
    localities: d.localities.length,
    areas: d.areas.length,
    totalLocations:
      d.counties.length + d.subCounties.length + d.constituencies.length +
      d.wards.length + d.localities.length + d.areas.length,
  };
}

module.exports = {
  getCounties,
  getCounty,
  getSubCounties,
  getConstituencies,
  getWards,
  getLocalities,
  getAreas,
  search,
  resolve,
  getStats,
  _load: load,
};
