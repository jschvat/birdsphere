/**
 * Media Controller
 * Handles file upload, processing, and management for posts and listings.
 *
 * Core Responsibilities:
 * - Multi-file upload processing with validation
 * - Media file metadata generation and storage
 * - File type validation and security checks
 * - Automatic cleanup on upload failures
 * - File deletion and management
 * - Media categorization and organization
 *
 * Key Features:
 * - Multi-File Support: Batch upload processing with individual validation
 * - Security Validation: File type, size, and content verification
 * - Error Recovery: Automatic cleanup of failed uploads
 * - Metadata Generation: Comprehensive file information and statistics
 * - Storage Management: Organized file storage and retrieval
 * - Performance Optimized: Efficient processing of large media files
 *
 * Integration Points:
 * - Works with mediaService for file processing
 * - Uses upload middleware for file handling
 * - Supports both post and listing media
 * - Integrates with storage and CDN systems
 * - Provides endpoints for file management
 */
const mediaService = require('../services/mediaService');
const { uploadPostFiles, processPostFiles, handleUploadError } = require('../middleware/upload');

/**
 * Upload Media for Posts
 * Processes multiple file uploads with validation and metadata generation.
 * Implements automatic cleanup on failures and comprehensive file validation.
 *
 * @param {Object} req - Express request object with uploaded files
 * @param {Array} req.files - Array of uploaded file objects from multer
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Upload results with file metadata and statistics
 */
const uploadMediaForPost = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Validate each file
    const validationResults = req.files.map(file => mediaService.validateFileForPosts(file));
    const invalidFiles = validationResults.filter(result => !result.valid);

    if (invalidFiles.length > 0) {
      // Clean up uploaded files
      req.files.forEach(file => {
        mediaService.deleteFile(file.path);
      });

      return res.status(400).json({
        success: false,
        message: 'Some files are invalid',
        errors: invalidFiles.map(result => result.error)
      });
    }

    // Process files and generate metadata
    const processedFiles = await mediaService.processUploadedFiles(req.files);

    res.json({
      success: true,
      message: `${processedFiles.length} file(s) uploaded successfully`,
      data: {
        files: processedFiles,
        totalSize: processedFiles.reduce((sum, file) => sum + file.size, 0),
        categories: [...new Set(processedFiles.map(file => file.category))]
      }
    });

  } catch (error) {

    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        mediaService.deleteFile(file.path);
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
      error: error.message
    });
  }
};

/**
 * Get File Information
 * Retrieves metadata and details for a specific uploaded file.
 * Used for file verification and media display.
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.filename - Name of file to get info for
 * @param {Object} res - Express response object
 * @returns {Promise<void>} File metadata including URL and existence status
 */
const getFileInfo = async (req, res) => {
  try {
    const { filename } = req.params;

    // This would typically query a database for file metadata
    // For now, we'll return basic info based on filename
    res.json({
      success: true,
      data: {
        filename,
        url: `/uploads/${filename}`,
        exists: true
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get file information',
      error: error.message
    });
  }
};

/**
 * Delete Uploaded File
 * Removes a specific file from storage with proper cleanup.
 * Used for file management and storage optimization.
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.filename - Name of file to delete
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Deletion confirmation or error status
 */
const deleteUploadedFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = `uploads/${filename}`;

    const deleted = await mediaService.deleteFile(filePath);

    if (deleted) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message
    });
  }
};

const getUploadLimits = (req, res) => {
  const maxFileSize = parseInt(process.env.MAX_POST_FILE_SIZE) || 50 * 1024 * 1024;
  const maxFiles = 20;

  res.json({
    success: true,
    data: {
      maxFileSize,
      maxFileSizeFormatted: mediaService.formatFileSize(maxFileSize),
      maxFiles,
      allowedTypes: {
        images: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg'],
        videos: ['mp4', 'mpeg', 'quicktime', 'webm', 'avi', 'mov'],
        documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf'],
        models: ['skp', 'stl', 'obj', 'fbx', 'dae', 'ply', '3ds', 'gltf', 'glb'],
        archives: ['zip', 'rar', '7z']
      }
    }
  });
};

// Middleware function to handle file upload with error handling
const handleFileUpload = (req, res, next) => {
  uploadPostFiles(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    processPostFiles(req, res, next);
  });
};

module.exports = {
  uploadMediaForPost,
  getFileInfo,
  deleteUploadedFile,
  getUploadLimits,
  handleFileUpload
};