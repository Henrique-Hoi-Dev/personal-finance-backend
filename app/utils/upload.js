const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

function ensureDirectoryExists(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

function sanitizeExtension(originalName, mimeType) {
    const knownExt = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp'
    };
    const extFromMime = knownExt[mimeType];
    if (extFromMime) return extFromMime;
    const ext = path.extname(originalName || '').toLowerCase();
    if (ext && ext.length <= 10) return ext;
    return '';
}

function createAvatarUploadMiddleware() {
    const uploadDir = process.env.AVATAR_UPLOAD_DIR || path.resolve(process.cwd(), '..', 'uploads', 'avatars');
    ensureDirectoryExists(uploadDir);

    const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const maxSizeMb = Number(process.env.AVATAR_MAX_SIZE_MB || 5);
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const ext = sanitizeExtension(file.originalname, file.mimetype);
            const filename = `${randomUUID()}${ext}`;
            cb(null, filename);
        }
    });

    const fileFilter = function (req, file, cb) {
        if (!allowedMimes.has(file.mimetype)) {
            const err = new Error('AVATAR_UPLOAD_INVALID_TYPE');
            err.status = 415;
            err.key = 'AVATAR_UPLOAD_INVALID_TYPE';
            return cb(err);
        }
        cb(null, true);
    };

    return multer({ storage, limits: { fileSize: maxSizeBytes }, fileFilter });
}

const avatarUpload = createAvatarUploadMiddleware();

module.exports = {
    avatarUpload,
    createAvatarUploadMiddleware
};
