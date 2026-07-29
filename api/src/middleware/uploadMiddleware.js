const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const bannerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/banners'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `banner_${uuidv4()}${ext}`);
  },
});

function bannerFileFilter(_req, file, cb) {
  const imageTypes = /jpeg|jpg|png|webp|gif/;
  const videoTypes = /mp4|mov|avi|mkv|webm/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype;

  if (
    (imageTypes.test(ext) && mime.startsWith('image/')) ||
    (videoTypes.test(ext) && mime.startsWith('video/'))
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image (jpeg/jpg/png/webp/gif) or video (mp4/mov/avi/mkv/webm) files are allowed'));
  }
}

// Handles both `images` (up to 10) and `video` (up to 1) fields
const uploadBannerFiles = multer({
  storage: bannerStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB (covers videos)
  fileFilter: bannerFileFilter,
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'video',  maxCount: 1 },
]);

module.exports = { uploadBannerFiles };

