const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../utils/validation');
const { registerSchema, loginSchema, updateUserSchema } = require('../utils/validation');

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, validate(updateUserSchema), authController.updateProfile);
router.delete('/account', authenticateToken, authController.deleteAccount);

module.exports = router;