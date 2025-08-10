const express = require('express');
const { z } = require('zod');
const authController = require('./auth.controller');
const { validateRequest } = require('../../middleware/validation');

const router = express.Router();

// Validation schemas
const inviteSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.enum([
      'ADMIN',
      'DELIVERY_MANAGER',
      'GENERAL_MANAGER',
      'ENGINEERING_MANAGER',
      'PROJECT_LEADER',
      'TEAM_LEADER',
      'TECHNICAL_LEADER',
      'TECHNICAL_REVIEWER',
    ]),
  }),
});

const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string(),
    password: z.string().min(8),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

// Routes
router.post('/invite', validateRequest(inviteSchema), authController.createInvite);
router.post('/accept-invite', validateRequest(acceptInviteSchema), authController.acceptInvite);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);

module.exports = router;