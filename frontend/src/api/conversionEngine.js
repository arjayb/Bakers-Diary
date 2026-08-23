const WEIGHT_TO_GRAMS = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const VOLUME_TO_ML = { ml: 1, l: 1000, tsp: 4.92892, tbsp: 14.7868, cup: 236.588, fl_oz: 29.5735, pint: 473.176, quart: 946.353 };
const LENGTH_TO_MM = { mm: 1, cm: 10, in: 25.4 };
const DENSITY = {
  'all-purpose flour': 0.53, 'bread flour': 0.54, 'whole wheat flour': 0.55,
  'cake flour': 0.45, 'granulated sugar': 0.85, sugar: 0.85, 'brown sugar': 0.93,
  'powdered sugar': 0.56, butter: 0.96, 'whole milk': 1.03, milk: 1.03,
  water: 1, honey: 1.42, 'vegetable oil': 0.92, 'cocoa powder': 0.41, 'rolled oats': 0.34,
};

const isWeight = (u) => u in WEIGHT_TO_GRAMS;
const isVolume = (u) => u in VOLUME_TO_ML;
const isLength = (u) => u in LENGTH_TO_MM;
const isTemp = (u) => u === 'c' || u === 'f';

export function convertMeasurement({ value, fromUnit, toUnit, ingredientName }) {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error('Enter a valid quantity to convert.');
  if (fromUnit === toUnit) return { value };
  if (isTemp(fromUnit) && isTemp(toUnit)) return { value: fromUnit === 'c' ? value * 9 / 5 + 32 : (value - 32) * 5 / 9 };
  if (isWeight(fromUnit) && isWeight(toUnit)) return { value: value * WEIGHT_TO_GRAMS[fromUnit] / WEIGHT_TO_GRAMS[toUnit] };
  if (isVolume(fromUnit) && isVolume(toUnit)) return { value: value * VOLUME_TO_ML[fromUnit] / VOLUME_TO_ML[toUnit] };
  if (isLength(fromUnit) && isLength(toUnit)) return { value: value * LENGTH_TO_MM[fromUnit] / LENGTH_TO_MM[toUnit] };
  if ((isVolume(fromUnit) && isWeight(toUnit)) || (isWeight(fromUnit) && isVolume(toUnit))) {
    if (!ingredientName) throw new Error('Converting between volume and weight needs an ingredient — density varies by food.');
    const density = DENSITY[String(ingredientName).trim().toLowerCase()];
    if (!density) throw new Error(`"${ingredientName}" isn't in the density table yet, so this conversion can't be done accurately.`);
    const grams = isVolume(fromUnit) ? value * VOLUME_TO_ML[fromUnit] * density : value * WEIGHT_TO_GRAMS[fromUnit];
    const converted = isWeight(toUnit) ? grams / WEIGHT_TO_GRAMS[toUnit] : (grams / density) / VOLUME_TO_ML[toUnit];
    return { value: converted, warning: `Using ${ingredientName}'s density (${density} g/ml) — not a universal volume/weight ratio.` };
  }
  throw new Error(`Can't convert ${fromUnit} to ${toUnit}.`);
}

export function equivalents({ value, fromUnit, ingredientName }) {
  const units = isWeight(fromUnit) ? Object.keys(WEIGHT_TO_GRAMS) : isVolume(fromUnit) ? Object.keys(VOLUME_TO_ML) : isLength(fromUnit) ? Object.keys(LENGTH_TO_MM) : [];
  return units.filter((u) => u !== fromUnit).map((unit) => {
    try { return { unit, ...convertMeasurement({ value, fromUnit, toUnit: unit, ingredientName }) }; } catch { return null; }
  }).filter(Boolean);
}
