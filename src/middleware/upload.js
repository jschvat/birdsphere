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

// File filter function for posts (supports multiple file types)
const postFileFilter = (req, file, cb) => {
  const allowedTypes = {
    // Images
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/webp': true,
    'image/gif': true,
    'image/svg+xml': true,

    // Videos
    'video/mp4': true,
    'video/mpeg': true,
    'video/quicktime': true,
    'video/webm': true,
    'video/avi': true,
    'video/mov': true,

    // Documents
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
    'text/plain': true,
    'text/csv': true,
    'application/rtf': true,

    // 3D Models and CAD
    'application/octet-stream': true, // SketchUp .skp files
    'model/obj': true,
    'model/gltf+json': true,
    'model/gltf-binary': true,
    'application/sla': true, // STL files
    'model/x3d+xml': true,
    'model/vrml': true,

    // Archives
    'application/zip': true,
    'application/x-rar-compressed': true,
    'application/x-7z-compressed': true
  };

  // Special handling for SketchUp files which come as octet-stream
  if (file.mimetype === 'application/octet-stream') {
    const ext = file.originalname.toLowerCase().split('.').pop();
    const allowedExtensions = ['skp', 'stl', 'obj', 'fbx', 'dae', 'ply', '3ds'];
    if (allowedExtensions.includes(ext)) {
      return cb(null, true);
    }
  }

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported for posts`), false);
  }
};

// Original file filter for basic uploads (backwards compatibility)
const basicFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
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

// Configure multer for basic uploads
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: basicFileFilter
});

// Configure multer for post uploads (supports all file types)
const postUpload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_POST_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default for posts
    files: 20 // Maximum 20 files per post
  },
  fileFilter: postFileFilter
});

// Middleware for single file upload
const uploadSingle = upload.single('file');

// Middleware for multiple file upload
const uploadMultiple = upload.array('files', 10);

// Middleware for profile image upload
const uploadProfileImage = upload.single('profileImage');

// Middleware for post file uploads (supports all file types)
const uploadPostFiles = postUpload.array('files', 20);

// Middleware for single post file upload
const uploadPostSingle = postUpload.single('file');

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

// Utility function to categorize uploaded files
const categorizeFile = (file) => {
  const mimetype = file.mimetype;
  const extension = file.originalname.toLowerCase().split('.').pop();

  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype === 'application/pdf') {
    return 'document';
  } else if (mimetype.includes('word') || mimetype.includes('excel') ||
             mimetype.includes('powerpoint') || mimetype === 'text/plain' ||
             mimetype === 'text/csv' || mimetype === 'application/rtf') {
    return 'document';
  } else if (mimetype === 'application/octet-stream' &&
             ['skp', 'stl', 'obj', 'fbx', 'dae', 'ply', '3ds'].includes(extension)) {
    return '3d_model';
  } else if (mimetype.startsWith('model/')) {
    return '3d_model';
  } else if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) {
    return 'archive';
  }
  return 'other';
};

// Enhanced middleware to process uploaded files with metadata
const processPostFiles = (req, res, next) => {
  if (req.file) {
    req.uploadedFile = {
      path: req.file.path,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalName: req.file.originalname,
      category: categorizeFile(req.file),
      url: `/uploads/${req.file.filename}`
    };
  }

  if (req.files && req.files.length > 0) {
    req.uploadedFiles = req.files.map(file => ({
      path: file.path,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      originalName: file.originalname,
      category: categorizeFile(file),
      url: `/uploads/${file.filename}`
    }));
  }

  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadProfileImage,
  uploadPostFiles,
  uploadPostSingle,
  handleUploadError,
  validateUpload,
  processUploadedFiles,
  processPostFiles,
  categorizeFile
};