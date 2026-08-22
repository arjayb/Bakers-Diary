// Canonical unit keys used across RecipeIngredient.unit and the conversion
// service (§12). Kept as a flat list rather than scattered string literals.
const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'];
const VOLUME_UNITS = ['ml', 'l', 'tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart'];
const TEMPERATURE_UNITS = ['c', 'f'];
const LENGTH_UNITS = ['mm', 'cm', 'in'];
const COUNT_UNITS = ['piece', 'pinch'];

const ALL_UNITS = [...WEIGHT_UNITS, ...VOLUME_UNITS, ...TEMPERATURE_UNITS, ...LENGTH_UNITS, ...COUNT_UNITS];

const RECIPE_CATEGORIES = ['Cake', 'Bread', 'Pastry', 'Cookie', 'Pie', 'Dessert', 'Other'];

const SESSION_STATUSES = ['in_progress', 'completed', 'abandoned'];

module.exports = {
  WEIGHT_UNITS,
  VOLUME_UNITS,
  TEMPERATURE_UNITS,
  LENGTH_UNITS,
  COUNT_UNITS,
  ALL_UNITS,
  RECIPE_CATEGORIES,
  SESSION_STATUSES,
};
