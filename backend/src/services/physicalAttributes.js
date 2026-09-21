/**
 * Livestock Physical Attributes Schema
 * Provides all valid options for registration forms
 */

const ATTRIBUTES = {
  muscleCondition: {
    label: 'Muscle Condition',
    options: ['Poor', 'Fair', 'Good', 'Excellent'],
  },
  fatCover: {
    label: 'Fat Cover',
    options: ['Visible bones', 'Normal', 'Fat'],
  },
  coatCondition: {
    label: 'Coat Condition',
    options: ['Shiny / healthy', 'Dull', 'Rough', 'Patchy'],
  },
  skinCondition: {
    label: 'Skin Condition',
    options: ['Smooth', 'Lumpy', 'Lesions', 'Parasites visible'],
  },
  skinProblems: {
    label: 'Skin Problems',
    multiple: true,
    options: ['None', 'Ticks', 'Mange', 'Ringworm', 'Wounds', 'Lice', 'Flies'],
  },
  coatColorPattern: {
    label: 'Coat Color Pattern',
    options: ['Solid', 'Spotted', 'Striped', 'Mixed'],
  },
  udderSize: {
    label: 'Udder Size',
    options: ['Small', 'Medium', 'Large'],
  },
  udderShape: {
    label: 'Udder Shape',
    options: ['Well-attached', 'Pendulous', 'Uneven'],
  },
  teatCondition: {
    label: 'Teat Condition',
    options: ['Normal', 'Cracked', 'Blind', 'Extra teat'],
  },
  milkVeins: {
    label: 'Milk Veins',
    options: ['Visible', 'Not visible'],
  },
  lactationStatus: {
    label: 'Lactation Status',
    options: ['Dry', 'Milking', 'Fresh calved (0-30 days)'],
  },
  pregnancyStatus: {
    label: 'Pregnancy Status',
    options: ['Not pregnant', 'Pregnant', 'Unknown'],
  },
  horns: {
    label: 'Horns',
    options: ['Horned', 'Polled (no horns)', 'Dehorned'],
  },
  eyes: {
    label: 'Eyes',
    options: ['Clear', 'Discharge', 'Cloudy', 'Red'],
  },
  teethAge: {
    label: 'Teeth / Age Indicator',
    options: ['Milk teeth (under 1yr)', '2-tooth (1-2yr)', '4-tooth (2-3yr)', '6-tooth (3-4yr)', 'Full mouth (4+yr)', 'Worn (>8yr)'],
  },
  ears: {
    label: 'Ears',
    options: ['Normal', 'Torn', 'Notched'],
  },
  muzzle: {
    label: 'Muzzle',
    options: ['Normal', 'Discharge', 'Dry'],
  },
  hooves: {
    label: 'Hooves',
    options: ['Normal', 'Overgrown', 'Cracked', 'Lame'],
  },
  legs: {
    label: 'Legs',
    options: ['Straight', 'Bowed', 'Knock-kneed'],
  },
  walking: {
    label: 'Walking',
    options: ['Normal', 'Limping', 'Stiff', 'Reluctant'],
  },
  jointSwelling: {
    label: 'Joint Swelling',
    options: ['None', 'Mild', 'Severe'],
  },
  purpose: {
    label: 'Purpose',
    options: ['Dairy', 'Beef', 'Dual-purpose', 'Breeding', 'Draught'],
  },
  breedPurity: {
    label: 'Breed Purity',
    options: ['Purebred', 'Crossbreed', 'Local / Indigenous'],
  },
  sireInfo: {
    label: 'Sire Information',
    options: ['AI registered', 'Local bull', 'Unknown'],
  },
  feedRegime: {
    label: 'Feed Regime',
    options: ['Free grazing', 'Zero-grazing', 'Mixed', 'Feedlot', 'Pasture rotation'],
  },
  vaccinationCard: {
    label: 'Vaccination Card',
    options: ['Complete', 'Partial', 'None'],
  },
  vetCertificate: {
    label: 'Vet Certificate',
    options: ['Valid', 'Expired', 'None'],
  },
  movementPermit: {
    label: 'Movement Permit',
    options: ['Available', 'Not available'],
  },
};

// Body Condition Score descriptions
const BODY_CONDITION_SCORES = [
  { score: 1, label: 'Emaciated', description: 'Severely underweight, all bones visible', icon: '1️⃣' },
  { score: 2, label: 'Thin', description: 'Underweight, ribs visible, needs feeding', icon: '2️⃣' },
  { score: 3, label: 'Ideal', description: 'Perfect market condition, ribs not visible', icon: '3️⃣' },
  { score: 4, label: 'Fat', description: 'Slightly heavy, no ribs visible', icon: '4️⃣' },
  { score: 5, label: 'Obese', description: 'Overweight, health risk', icon: '5️⃣' },
];

// Breed averages (Kenya data — approximate)
const BREED_AVERAGES = {
  'Cow': {
    'Friesian': { weight: 450, dailyMilk: 25 },
    'Ayrshire': { weight: 400, dailyMilk: 20 },
    'Jersey': { weight: 350, dailyMilk: 18 },
    'Guernsey': { weight: 400, dailyMilk: 18 },
    'Holstein': { weight: 500, dailyMilk: 28 },
    'Boran': { weight: 450, dailyMilk: 0 },
    'Sahiwal': { weight: 400, dailyMilk: 8 },
  },
  'Goat': {
    'Toggenburg': { weight: 55, dailyMilk: 3 },
    'Saanen': { weight: 60, dailyMilk: 3.5 },
    'Alpine': { weight: 55, dailyMilk: 3 },
    'Galla': { weight: 45, dailyMilk: 0 },
    'Boer': { weight: 70, dailyMilk: 0 },
  },
  'Sheep': {
    'Dorper': { weight: 70, dailyMilk: 0 },
    'Merino': { weight: 60, dailyMilk: 0 },
    'Red Maasai': { weight: 45, dailyMilk: 0 },
  },
};

function getAllAttributes() {
  return ATTRIBUTES;
}

function getBodyConditionScores() {
  return BODY_CONDITION_SCORES;
}

function getBreedAverages() {
  return BREED_AVERAGES;
}

function getBreedAverage(type, breed) {
  return BREED_AVERAGES[type]?.[breed] || null;
}

/**
 * Compare animal against breed averages
 */
function compareToBreedAverage(animal) {
  const avg = getBreedAverage(animal.type, animal.breed);
  if (!avg) return null;

  const result = {
    breed: animal.breed,
    type: animal.type,
    average: avg,
    comparison: {},
  };

  if (animal.weight) {
    result.comparison.weight = {
      actual: animal.weight,
      average: avg.weight,
      difference: animal.weight - avg.weight,
      percentDiff: Math.round(((animal.weight - avg.weight) / avg.weight) * 100),
      status: animal.weight >= avg.weight * 1.1 ? 'above' 
            : animal.weight <= avg.weight * 0.9 ? 'below' 
            : 'average',
    };
  }

  if (animal.dailyMilkYield && avg.dailyMilk > 0) {
    result.comparison.milk = {
      actual: animal.dailyMilkYield,
      average: avg.dailyMilk,
      difference: animal.dailyMilkYield - avg.dailyMilk,
      percentDiff: Math.round(((animal.dailyMilkYield - avg.dailyMilk) / avg.dailyMilk) * 100),
      status: animal.dailyMilkYield >= avg.dailyMilk * 1.1 ? 'above' 
            : animal.dailyMilkYield <= avg.dailyMilk * 0.9 ? 'below' 
            : 'average',
    };
  }

  return result;
}

module.exports = {
  ATTRIBUTES,
  BODY_CONDITION_SCORES,
  BREED_AVERAGES,
  getAllAttributes,
  getBodyConditionScores,
  getBreedAverages,
  getBreedAverage,
  compareToBreedAverage,
};
