// Mirrors backend/src/utils/constants.js so the editor's dropdowns match
// what the conversion/nutrition services actually understand.
export const RECIPE_CATEGORIES = ['Cake', 'Bread', 'Pastry', 'Cookie', 'Pie', 'Dessert', 'Other'];

export const UNIT_OPTIONS = [
  'g', 'kg', 'oz', 'lb',
  'ml', 'l', 'tsp', 'tbsp', 'cup', 'fl_oz', 'pint', 'quart',
  'c', 'f',
  'mm', 'cm', 'in',
  'piece', 'pinch',
];

export const UNIT_LABELS = {
  g: 'Grams', kg: 'Kilograms', oz: 'Ounces', lb: 'Pounds',
  ml: 'Milliliters', l: 'Liters', tsp: 'Teaspoons', tbsp: 'Tablespoons',
  cup: 'Cups', fl_oz: 'Fluid ounces', pint: 'Pints', quart: 'Quarts',
  c: 'Celsius', f: 'Fahrenheit',
  mm: 'Millimeters', cm: 'Centimeters', in: 'Inches',
  piece: 'Pieces', pinch: 'Pinch',
};
