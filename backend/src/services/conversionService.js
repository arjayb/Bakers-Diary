// Conversion service (§12) — the single implementation shared by both the
// standalone Unit Converter and the contextual converter inside Recipe
// Editor. Nothing else in the app should reimplement conversion math.

// --- Same-dimension conversions (exact, no ingredient needed) -------------

const WEIGHT_TO_GRAMS = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const VOLUME_TO_ML = {
  ml: 1, l: 1000, tsp: 4.92892, tbsp: 14.7868,
  cup: 236.588, fl_oz: 29.5735, pint: 473.176, quart: 946.353,
};
const LENGTH_TO_MM = { mm: 1, cm: 10, in: 25.4 };

function isWeightUnit(u) { return u in WEIGHT_TO_GRAMS; }
function isVolumeUnit(u) { return u in VOLUME_TO_ML; }
function isLengthUnit(u) { return u in LENGTH_TO_MM; }
function isTemperatureUnit(u) { return u === 'c' || u === 'f'; }

function convertWeight(value, from, to) {
  const grams = value * WEIGHT_TO_GRAMS[from];
  return grams / WEIGHT_TO_GRAMS[to];
}

function convertVolume(value, from, to) {
  const ml = value * VOLUME_TO_ML[from];
  return ml / VOLUME_TO_ML[to];
}

function convertLength(value, from, to) {
  const mm = value * LENGTH_TO_MM[from];
  return mm / LENGTH_TO_MM[to];
}

function convertTemperature(value, from, to) {
  if (from === to) return value;
  if (from === 'c' && to === 'f') return value * 9 / 5 + 32;
  if (from === 'f' && to === 'c') return (value - 32) * 5 / 9;
  throw Object.assign(new Error(`Unsupported temperature conversion ${from} -> ${to}`), { status: 400 });
}

// --- Ingredient density table (§12 critical requirement) ------------------
//
// g/ml for common baking ingredients — this is what makes "2.5 cups flour"
// convert differently from "2.5 cups butter". Deliberately small and
// editable rather than pulled from an external API — baking density is
// fairly stable and doesn't need a live data source the way nutrition does.
const INGREDIENT_DENSITY_G_PER_ML = {
  'all-purpose flour': 0.53,
  'bread flour': 0.54,
  'whole wheat flour': 0.55,
  'cake flour': 0.45,
  'granulated sugar': 0.85,
  'sugar': 0.85,
  'brown sugar': 0.93,
  'powdered sugar': 0.56,
  'butter': 0.96,
  'whole milk': 1.03,
  'milk': 1.03,
  'water': 1.0,
  'honey': 1.42,
  'vegetable oil': 0.92,
  'cocoa powder': 0.41,
  'rolled oats': 0.34,
};

function normalizeIngredientName(name) {
  return String(name || '').trim().toLowerCase();
}

function findDensity(ingredientName) {
  const key = normalizeIngredientName(ingredientName);
  return INGREDIENT_DENSITY_G_PER_ML[key] ?? null;
}

// --- Public entry point -----------------------------------------------

/**
 * convert({ value, fromUnit, toUnit, ingredientName? })
 *
 * Returns { value, warning? }. Throws a { status: 400 } error for
 * unsupported/ambiguous conversions rather than guessing.
 */
function convert({ value, fromUnit, toUnit, ingredientName }) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw Object.assign(new Error('Enter a valid quantity to convert.'), { status: 400 });
  }
  if (fromUnit === toUnit) return { value };

  if (isTemperatureUnit(fromUnit) && isTemperatureUnit(toUnit)) {
    return { value: convertTemperature(value, fromUnit, toUnit) };
  }
  if (isWeightUnit(fromUnit) && isWeightUnit(toUnit)) {
    return { value: convertWeight(value, fromUnit, toUnit) };
  }
  if (isVolumeUnit(fromUnit) && isVolumeUnit(toUnit)) {
    return { value: convertVolume(value, fromUnit, toUnit) };
  }
  if (isLengthUnit(fromUnit) && isLengthUnit(toUnit)) {
    return { value: convertLength(value, fromUnit, toUnit) };
  }

  // Cross-dimension (volume <-> weight) requires ingredient density —
  // this is the case §12 calls out explicitly.
  const crossing =
    (isVolumeUnit(fromUnit) && isWeightUnit(toUnit)) ||
    (isWeightUnit(fromUnit) && isVolumeUnit(toUnit));

  if (crossing) {
    if (!ingredientName) {
      throw Object.assign(
        new Error('Converting between volume and weight needs an ingredient — density varies by food.'),
        { status: 400 }
      );
    }
    const density = findDensity(ingredientName);
    if (density === null) {
      throw Object.assign(
        new Error(`"${ingredientName}" isn't in the density table yet, so this conversion can't be done accurately.`),
        { status: 422 }
      );
    }

    let grams;
    if (isVolumeUnit(fromUnit)) {
      const ml = value * VOLUME_TO_ML[fromUnit];
      grams = ml * density;
    } else {
      grams = value * WEIGHT_TO_GRAMS[fromUnit];
    }

    if (isWeightUnit(toUnit)) {
      return { value: grams / WEIGHT_TO_GRAMS[toUnit], warning: `Using ${ingredientName}'s density (${density} g/ml) — not a universal volume/weight ratio.` };
    }
    const ml = grams / density;
    return { value: ml / VOLUME_TO_ML[toUnit], warning: `Using ${ingredientName}'s density (${density} g/ml) — not a universal volume/weight ratio.` };
  }

  throw Object.assign(new Error(`Can't convert ${fromUnit} to ${toUnit}.`), { status: 400 });
}

/** Equivalent measurements list, for the "Also equals" panel (§12 mockup). */
function equivalents({ value, fromUnit, ingredientName }) {
  const candidateUnits = isWeightUnit(fromUnit)
    ? Object.keys(WEIGHT_TO_GRAMS)
    : isVolumeUnit(fromUnit)
      ? Object.keys(VOLUME_TO_ML)
      : isLengthUnit(fromUnit)
        ? Object.keys(LENGTH_TO_MM)
        : [];

  return candidateUnits
    .filter((u) => u !== fromUnit)
    .map((u) => {
      try {
        return { unit: u, ...convert({ value, fromUnit, toUnit: u, ingredientName }) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = { convert, equivalents, findDensity, isWeightUnit, isVolumeUnit, isTemperatureUnit, isLengthUnit };
