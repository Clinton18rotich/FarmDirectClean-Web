/**
 * Livestock Measurement Guide
 * Step-by-step instructions for farmers to measure weight without a scale
 * Languages: English + Kiswahili
 */

const GUIDE = {
  en: {
    title: 'How to Measure Your Animal for Weight',
    subtitle: 'No scale? No problem. Use a simple tape measure.',
    intro: 'Most farmers don\'t have a livestock scale (KES 50,000+). But with a KES 500 tape measure, you can estimate weight within 5-10% accuracy.',
    
    heartGirth: {
      title: 'Step 1: Heart Girth',
      what: 'The distance around the chest, just behind the front legs',
      icon: '🫁',
      steps: [
        'Stand beside the animal, facing its side',
        'Wrap the measuring tape around the widest part of the chest',
        'The tape should pass just behind the front legs and over the withers (shoulder top)',
        'Pull snug — the tape should touch the hair, not dig into the skin',
        'Read the number in centimeters (cm)',
      ],
      tips: [
        'Measure when the animal is standing still, on level ground',
        'Take the measurement after the animal exhales (chest is smallest)',
        'If you don\'t have a tape, use a rope — mark it, then measure the rope',
        'Do NOT measure over the hump — that overestimates weight',
      ],
      mistakes: [
        '❌ Measuring in front of the front legs (too small)',
        '❌ Measuring behind the ribs (too large)',
        '❌ Tape too tight (underestimates)',
        '❌ Using inches but entering as cm',
      ],
    },
    
    bodyLength: {
      title: 'Step 2: Body Length',
      what: 'From the point of shoulder to the pin bone',
      icon: '📏',
      steps: [
        'Find the point of the shoulder (front, where the neck meets the body)',
        'Find the pin bone (rear, the bony protrusion at the top of the hind leg)',
        'Measure along the top line of the back',
        'Keep the tape straight — do NOT follow the curve of the back',
        'Read in centimeters (cm)',
      ],
      tips: [
        'Stand on a level surface with the animal standing naturally',
        'Do not stretch — measure the actual distance',
        'Have someone hold the animal if it moves',
        'Take 2-3 measurements and use the average',
      ],
      mistakes: [
        '❌ Measuring from head to tail (wrong)',
        '❌ Following the curve of the back (overestimates)',
        '❌ Measuring to the tail base instead of the pin bone',
      ],
    },
    
    formula: {
      title: 'The Formula (Automatic)',
      intro: 'You don\'t need to do the math. Just enter the two measurements above, and FarmDirect calculates the weight for you.',
      explainer: [
        'For cattle: Weight (kg) = (Girth × Girth × Length) ÷ 30,000',
        'For goats/sheep: Weight (kg) = (Girth × Girth × Length) ÷ 40,000',
      ],
      examples: [
        { animal: 'Cow (Friesian)', girth: 180, length: 140, weight: 151 },
        { animal: 'Goat (Galla)', girth: 65, length: 60, weight: 6 },
        { animal: 'Sheep (Dorper)', girth: 75, length: 65, weight: 9 },
      ],
    },
    
    faq: [
      {
        q: 'What if my animal is not standing still?',
        a: 'Wait until it is calm. If needed, have someone hold it. Accuracy matters more than speed.',
      },
      {
        q: 'What if I don\'t have a measuring tape?',
        a: 'Use a rope or string. Wrap it around, mark the length, then measure the mark with a ruler or tape.',
      },
      {
        q: 'How accurate is this?',
        a: 'Within 5-10% of the real weight. Good enough for buying and selling, but not for veterinary dosing.',
      },
      {
        q: 'Why can\'t I just estimate by looking?',
        a: 'Eye estimates are off by 20-30%. Buyers know this and will pay less. Real measurements get you fair prices.',
      },
      {
        q: 'What if my animal is pregnant?',
        a: 'Measure the same way. Pregnancy adds about 10% to the weight, so subtract 10% from the result.',
      },
    ],
  },
  
  sw: {
    title: 'Jinsi ya Kupima Mnyama Wako kwa Uzito',
    subtitle: 'Hakuna mizani? Hakuna shida. Tumia kipimo rahisi cha mkanda.',
    intro: 'Wakulima wengi hawana mizani ya mifugo (KES 50,000+). Lakini kwa mkanda wa kupimia wa KES 500, unaweza kukadiria uzito kwa usahihi wa 5-10%.',
    
    heartGirth: {
      title: 'Hatua 1: Mzunguko wa Kifua',
      what: 'Umbali unaozunguka kifua, nyuma kidogo ya miguu ya mbele',
      icon: '🫁',
      steps: [
        'Simama kando ya mnyama, ukielekea ubavu wake',
        'Zungusha mkanda wa kupimia kwenye sehemu pana zaidi ya kifua',
        'Mkanda unapaswa kupita nyuma kidogo ya miguu ya mbele na juu ya mabega',
        'Vuta kwa wastani — mkanda uguse manyoya, si kuingia kwenye ngozi',
        'Soma namba kwa sentimita (cm)',
      ],
      tips: [
        'Pima wakati mnyama amesimama, kwenye ardhi tambarare',
        'Pima baada ya mnyama kutoa pumzi (kifua ni kidogo zaidi)',
        'Kama huna mkanda, tumia kamba — weka alama, kisha pima kamba',
        'USIPIME juu ya nundu — hiyo inaongeza uzito',
      ],
      mistakes: [
        '❌ Kupima mbele ya miguu ya mbele (ndogo sana)',
        '❌ Kupima nyuma ya mbavu (kubwa sana)',
        '❌ Mkanda ukazwa sana (inapunguza uzito)',
        '❌ Kutumia inchi lakini kuingiza kama cm',
      ],
    },
    
    bodyLength: {
      title: 'Hatua 2: Urefu wa Mwili',
      what: 'Kutoka sehemu ya bega hadi mfupa wa nyuma',
      icon: '📏',
      steps: [
        'Tafuta sehemu ya bega (mbele, pale shingo inapokutana na mwili)',
        'Tafuta mfupa wa nyuma (bony protrusion juu ya mguu wa nyuma)',
        'Pima kando ya mstari wa juu wa mgongo',
        'Weka mkanda sawa — USIFUATE mkunjo wa mgongo',
        'Soma kwa sentimita (cm)',
      ],
      tips: [
        'Simama kwenye uso tambarare na mnyama amesimama kawaida',
        'Usivute — pima umbali halisi',
        'Omba mtu amshikilie mnyama akiwa anasonga',
        'Pima mara 2-3 na tumia wastani',
      ],
      mistakes: [
        '❌ Kupima kutoka kichwa hadi mkia (si sahihi)',
        '❌ Kufuata mkunjo wa mgongo (inaongeza)',
        '❌ Kupima hadi msingi wa mkia badala ya mfupa',
      ],
    },
    
    formula: {
      title: 'Formula (Moja kwa Moja)',
      intro: 'Huhitaji kufanya hesabu. Ingiza vipimo viwili tu, na FarmDirect itakuhesabia uzito.',
      explainer: [
        'Kwa ng\'ombe: Uzito (kg) = (Mzunguko × Mzunguko × Urefu) ÷ 30,000',
        'Kwa mbuzi/kondoo: Uzito (kg) = (Mzunguko × Mzunguko × Urefu) ÷ 40,000',
      ],
      examples: [
        { animal: 'Ng\'ombe (Friesian)', girth: 180, length: 140, weight: 151 },
        { animal: 'Mbuzi (Galla)', girth: 65, length: 60, weight: 6 },
        { animal: 'Kondoo (Dorper)', girth: 75, length: 65, weight: 9 },
      ],
    },
    
    faq: [
      {
        q: 'Nini kama mnyama wangu hasimami?',
        a: 'Subiri hadi atulie. Kama inahitajika, omba mtu amshikilie. Usahihi ni muhimu kuliko haraka.',
      },
      {
        q: 'Nini kama sina mkanda wa kupimia?',
        a: 'Tumia kamba. Zungusha, weka alama, kisha pima alama kwa rula.',
      },
      {
        q: 'Ni sahihi kiasi gani?',
        a: 'Ndani ya 5-10% ya uzito halisi. Nzuri kwa kununua na kuuza, lakini si kwa dawa za mifugo.',
      },
      {
        q: 'Kwa nini nisi kadirie kwa kuangalia?',
        a: 'Ukadiriaji wa jicho unakosea kwa 20-30%. Wanunuzi wanajua hii na watalipa kidogo. Vipimo halisi vinakupa bei nzuri.',
      },
      {
        q: 'Nini kama mnyama wangu ni mjamzito?',
        a: 'Pima vivyo hivyo. Ujauzito unaongeza 10% kwa uzito, kwa hivyo toa 10% kutoka kwa matokeo.',
      },
    ],
  },
};

// SMS-optimized short guide
const SMS_GUIDE = {
  en: `FARMDIRECT — Measure Weight Guide
1) HEART GIRTH: wrap tape around chest, behind front legs. Read cm.
2) BODY LENGTH: from shoulder point to pin bone (top of back). Read cm.
Reply: WEIGH [girth] [length] [animal]
Example: WEIGH 180 140 Cow`,
  sw: `FARMDIRECT — Mwongozo wa Kupima Uzito
1) MZUNGUKO WA KIFUA: zungusha kipimo kifuani, nyuma ya miguu ya mbele. Soma cm.
2) UREFU WA MWILI: kutoka bega hadi mfupa wa nyuma. Soma cm.
Jibu: WEIGH [mzunguko] [urefu] [mnyama]
Mfano: WEIGH 180 140 Ng'ombe`,
};

function getGuide(language = 'en') {
  return GUIDE[language] || GUIDE.en;
}

function getSMSGuide(language = 'en') {
  return SMS_GUIDE[language] || SMS_GUIDE.en;
}

function getAllGuides() {
  return GUIDE;
}

/**
 * Process SMS weigh command
 * Format: WEIGH [girth] [length] [animalType]
 */
function processSMSWeigh(text) {
  const parts = String(text).trim().split(/\s+/);
  if (parts.length < 4) {
    return { success: false, error: 'Format: WEIGH [girth] [length] [animalType]' };
  }

  const [, girthStr, lengthStr, animalType] = parts;
  const girth = parseFloat(girthStr);
  const length = parseFloat(lengthStr);

  if (!girth || !length || girth < 30 || length < 30) {
    return { success: false, error: 'Invalid measurements. Must be in cm and > 30.' };
  }

  // Normalize animal type
  const typeMap = {
    'cow': 'Cow', 'ngombe': 'Cow', 'ng\'ombe': 'Cow', 'bull': 'Bull',
    'goat': 'Goat', 'mbuzi': 'Goat',
    'sheep': 'Sheep', 'kondoo': 'Sheep',
    'pig': 'Pig', 'nguruwe': 'Pig',
    'camel': 'Camel', 'ngamia': 'Camel',
  };
  const normalizedType = typeMap[animalType.toLowerCase()] || 'Cow';

  let divisor = 30000;
  if (['Goat', 'Sheep', 'Pig'].includes(normalizedType)) divisor = 40000;
  else if (!['Cow', 'Bull', 'Heifer', 'Camel', 'Donkey'].includes(normalizedType)) divisor = 35000;

  const weight = Math.round((girth * girth * length) / divisor);

  return {
    success: true,
    animalType: normalizedType,
    girth,
    length,
    weight,
    formula: `(${girth} × ${girth} × ${length}) ÷ ${divisor.toLocaleString()}`,
  };
}

module.exports = {
  GUIDE,
  SMS_GUIDE,
  getGuide,
  getSMSGuide,
  getAllGuides,
  processSMSWeigh,
};
