const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../db/prisma');
const { env } = require('../../config/env');
const emailService = require('../../utils/email');
const logger = require('../../config/logger');

const authService = {
  async createInvite({ email, name, role }) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user with invite
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        inviteToken,
        inviteExpiry,
        active: false,
      },
    });

    // Send invite email
    await emailService.sendInvite({
      to: email,
      name,
      inviteToken,
    });

    logger.info(`Invite sent to ${email}`);

    return {
      message: 'Invite sent successfully',
      userId: user.id,
    };
  },

  async acceptInvite({ token, password }) {
    // Find user by invite token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      throw new Error('Invalid invite token');
    }

    if (user.inviteExpiry < new Date()) {
      throw new Error('Invite token has expired');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        inviteToken: null,
        inviteExpiry: null,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Generate JWT
    const jwtToken = jwt.sign(
      {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      token: jwtToken,
      user: updatedUser,
    };
  },

  async login({ email, password }) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    if (!user.active) {
      throw new Error('Account is not active');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  },

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  },
};

module.exports = authService;