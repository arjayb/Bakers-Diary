const asyncHandler = require('../utils/asyncHandler');
const { convert, equivalents } = require('../services/conversionService');

// @route POST /api/conversions   { value, fromUnit, toUnit, ingredientName? }
const convertUnit = asyncHandler(async (req, res) => {
  const { value, fromUnit, toUnit, ingredientName } = req.body;
  const result = convert({ value: Number(value), fromUnit, toUnit, ingredientName });
  const also = equivalents({ value: Number(value), fromUnit, ingredientName });
  res.json({ success: true, result, equivalents: also });
});

module.exports = { convertUnit };
