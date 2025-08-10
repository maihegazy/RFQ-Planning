const authService = require('./auth.service');
const logger = require('../../config/logger');

const authController = {
  async createInvite(req, res, next) {
    try {
      const result = await authService.createInvite(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async acceptInvite(req, res, next) {
    try {
      const result = await authService.acceptInvite(req.body);
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      });
      res.json({ user: result.user });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      });
      res.json({ user: result.user });
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res) {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  },

  async getCurrentUser(req, res, next) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const user = await authService.verifyToken(token);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = authController;