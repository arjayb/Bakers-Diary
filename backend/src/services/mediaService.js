const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryStorage {
  _handleFile(req, file, cb) {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'bakers-diary',
        resource_type: 'image',
        transformation: [
          {
            width: 1600,
            height: 1600,
            crop: 'limit',
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
      },
      (error, result) => {
        if (error) return cb(error);

        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
          width: result.width,
          height: result.height,
          size: result.bytes,
        });
      }
    );

    file.stream.pipe(stream);
  }

  _removeFile(req, file, cb) {
    if (!file || !file.filename) return cb(null);

    cloudinary.uploader.destroy(file.filename, (error) => {
      cb(error || null);
    });
  }
}

const storage = new CloudinaryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }

    cb(null, true);
  },
});

async function deleteAsset(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { upload, deleteAsset };