const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomUUID();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    // Check specific allowed formats
    const allowedImageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
    ];
    const allowedVideoTypes = [
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/avi'
    ];
    
    const isAllowedImage = allowedImageTypes.includes(file.mimetype);
    const isAllowedVideo = allowedVideoTypes.includes(file.mimetype);
    
    if (isAllowedImage || isAllowedVideo) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`), false);
    }
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: fileFilter
});

// Middleware for single file upload
const uploadSingle = upload.single('file');

// Middleware for multiple file upload
const uploadMultiple = upload.array('files', 10);

// Middleware for profile image upload
const uploadProfileImage = upload.single('profileImage');

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1048576}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 10 files allowed per upload'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file field',
        message: 'Please check the file field name'
      });
    }
  }
  
  if (err.message) {
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }
  
  next(err);
};

// Middleware to validate file uploads
const validateUpload = (req, res, next) => {
  if (!req.file && (!req.files || req.files.length === 0)) {
    return res.status(400).json({
      error: 'No files uploaded',
      message: 'At least one file is required'
    });
  }
  next();
};

// Middleware to add file info to request
const processUploadedFiles = (req, res, next) => {
  if (req.file) {
    req.uploadedFile = {
      path: req.file.path,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalName: req.file.originalname
    };
  }
  
  if (req.files && req.files.length > 0) {
    req.uploadedFiles = req.files.map(file => ({
      path: file.path,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      originalName: file.originalname
    }));
  }
  
  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadProfileImage,
  handleUploadError,
  validateUpload,
  processUploadedFiles
};