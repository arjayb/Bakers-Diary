const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

// @route POST /api/media   (multipart, field name "photo")
// §24: a single upload endpoint used for every kind of photo (recipe cover,
// step reference, session photo, final bake photo) — the caller decides
// what to attach the resulting MediaAsset.id to afterward, so this
// controller doesn't need to know which context it was called from.
const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image was uploaded.' });
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      url: req.file.path,
      publicId: req.file.filename,
      width: req.file.width || null,
      height: req.file.height || null,
      bytes: req.file.size || null,
    },
  });

  res.status(201).json({ success: true, asset });
});

module.exports = { uploadMedia };
