/**
 * Media Service
 * Comprehensive file management and processing service for multi-media content handling.
 *
 * Core Responsibilities:
 * - Multi-format file categorization and validation
 * - Organized directory structure management
 * - File metadata extraction and generation
 * - Preview capability detection
 * - File size formatting and optimization
 * - Secure file processing and validation
 *
 * Key Features:
 * - Multi-Category Support: Images, videos, documents, 3D models, archives
 * - Smart Categorization: Automatic file type detection and classification
 * - Preview Detection: Determines which files can be previewed in-browser
 * - Metadata Generation: Comprehensive file information extraction
 * - Directory Management: Automatic creation of organized upload directories
 * - Security Validation: File type validation and security checks
 *
 * Supported File Types:
 * - Images: JPEG, PNG, WebP, GIF, SVG
 * - Videos: MP4, WebM, QuickTime, AVI, MOV
 * - Documents: PDF, Office formats, plain text, CSV, RTF
 * - 3D Models: SketchUp, STL, OBJ, FBX, GLTF, Blender
 * - Archives: ZIP, RAR, 7Z compression formats
 *
 * Integration Points:
 * - Works with upload middleware for file processing
 * - Supports post and listing media management
 * - Integrates with storage systems and CDNs
 * - Powers media galleries and previews
 * - Handles file cleanup and organization
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MediaService {
  constructor() {
    this.uploadPaths = {
      posts: 'uploads/posts',
      avatars: 'uploads/avatars',
      documents: 'uploads/documents',
      models: 'uploads/models',
      videos: 'uploads/videos',
      images: 'uploads/images'
    };

    this.initializeDirectories();
  }

  initializeDirectories() {
    Object.values(this.uploadPaths).forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  generateFileInfo(file, category = null) {
    const fileCategory = category || this.categorizeFile(file);
    const fileSize = this.formatFileSize(file.size);
    const isPreviewable = this.isFilePreviewable(file.mimetype, fileCategory);

    return {
      id: crypto.randomUUID(),
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      formattedSize: fileSize,
      category: fileCategory,
      url: `/uploads/${file.filename}`,
      path: file.path,
      isPreviewable,
      metadata: this.extractFileMetadata(file, fileCategory)
    };
  }

  categorizeFile(file) {
    const mimetype = file.mimetype;
    const extension = file.originalname.toLowerCase().split('.').pop();

    if (mimetype.startsWith('image/')) {
      return 'image';
    } else if (mimetype.startsWith('video/')) {
      return 'video';
    } else if (mimetype === 'application/pdf') {
      return 'document';
    } else if (this.isOfficeDocument(mimetype)) {
      return 'document';
    } else if (this.is3DModel(mimetype, extension)) {
      return '3d_model';
    } else if (this.isArchive(mimetype)) {
      return 'archive';
    }
    return 'other';
  }

  isOfficeDocument(mimetype) {
    const officeTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf'
    ];
    return officeTypes.includes(mimetype);
  }

  is3DModel(mimetype, extension) {
    const modelExtensions = ['skp', 'stl', 'obj', 'fbx', 'dae', 'ply', '3ds', 'blend', 'max'];
    return mimetype.startsWith('model/') ||
           (mimetype === 'application/octet-stream' && modelExtensions.includes(extension));
  }

  isArchive(mimetype) {
    return mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z');
  }

  isFilePreviewable(mimetype, category) {
    switch (category) {
      case 'image':
        return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(mimetype);
      case 'video':
        return ['video/mp4', 'video/webm', 'video/quicktime'].includes(mimetype);
      case 'document':
        return mimetype === 'application/pdf' || mimetype === 'text/plain';
      default:
        return false;
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  extractFileMetadata(file, category) {
    const metadata = {
      uploadedAt: new Date(),
      category
    };

    switch (category) {
      case 'image':
        metadata.type = 'image';
        metadata.canCompress = true;
        break;
      case 'video':
        metadata.type = 'video';
        metadata.needsProcessing = true;
        break;
      case 'document':
        metadata.type = 'document';
        metadata.searchable = file.mimetype === 'text/plain' || file.mimetype === 'application/pdf';
        break;
      case '3d_model':
        metadata.type = '3d_model';
        metadata.needsViewer = true;
        metadata.format = file.originalname.split('.').pop().toLowerCase();
        break;
      default:
        metadata.type = 'other';
    }

    return metadata;
  }

  async processUploadedFiles(files) {
    if (!files || files.length === 0) {
      return [];
    }

    return files.map(file => this.generateFileInfo(file));
  }

  async deleteFile(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async moveFileToCategory(file, category) {
    const categoryPath = this.uploadPaths[category] || this.uploadPaths.posts;
    const sourcePath = file.path;
    const destPath = path.join(categoryPath, file.filename);

    try {
      if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, destPath);
        return {
          ...file,
          path: destPath,
          url: `/${categoryPath}/${file.filename}`
        };
      }
      return file;
    } catch (error) {
      return file;
    }
  }

  validateFileForPosts(file) {
    const maxSize = parseInt(process.env.MAX_POST_FILE_SIZE) || 50 * 1024 * 1024; // 50MB
    const allowedCategories = ['image', 'video', 'document', '3d_model', 'archive'];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.formatFileSize(maxSize)}`
      };
    }

    const category = this.categorizeFile(file);
    if (!allowedCategories.includes(category)) {
      return {
        valid: false,
        error: `File type not supported for posts: ${file.mimetype}`
      };
    }

    return { valid: true, category };
  }

  getFileIcon(category, mimetype) {
    switch (category) {
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'document':
        if (mimetype === 'application/pdf') return 'pdf';
        if (mimetype.includes('word')) return 'word';
        if (mimetype.includes('excel')) return 'excel';
        if (mimetype.includes('powerpoint')) return 'powerpoint';
        return 'document';
      case '3d_model':
        return 'cube';
      case 'archive':
        return 'archive';
      default:
        return 'file';
    }
  }
}

module.exports = new MediaService();