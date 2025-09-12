const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads with completely random UUID filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate completely random UUID filename
    const randomUUID = crypto.randomUUID();
    const extension = path.extname(file.originalname);
    cb(null, `${randomUUID}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get current avatar route
router.get('/avatar', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      avatarUrl: user.profile_image || null
    });
  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({ error: 'Failed to get avatar' });
  }
});

// Upload avatar route with random UUID persistence
router.post('/avatar', authenticateToken, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Get current user to check for existing avatar
      const currentUser = await User.findById(req.user.id);
      
      // Delete old avatar file if it exists
      if (currentUser && currentUser.profile_image) {
        const oldAvatarPath = path.join(__dirname, '../../', currentUser.profile_image);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Update user's profile_image in database with new random UUID filename
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const updatedUser = await User.updateProfileImage(req.user.id, avatarUrl);
      

      res.json({
        message: 'Avatar uploaded successfully',
        avatarUrl,
        user: {
          id: updatedUser.id,
          profileImage: updatedUser.profile_image
        }
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      
      // Clean up uploaded file on error
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Failed to update profile image' });
    }
  });
});

module.exports = router;