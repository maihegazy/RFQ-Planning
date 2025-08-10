const { createClient } = require('webdav');
const { env } = require('../config/env');
const logger = require('../config/logger');
const prisma = require('../db/prisma');

class NextCloudService {
  constructor() {
    this.client = null;
    this.config = null;
    this.enabled = false; // Add flag to disable NextCloud
    
    // Comment out initialization for now
    // this.initializeClient();
    logger.info('NextCloud integration is disabled');
  }

  async initializeClient() {
    // Commented out for now - uncomment when NextCloud is ready
    /*
    try {
      // Get config from database (if exists)
      this.config = {
        url: env.NEXTCLOUD_URL,
        username: env.NEXTCLOUD_USERNAME,
        password: env.NEXTCLOUD_PASSWORD,
        basePath: env.NEXTCLOUD_BASE_PATH,
      };

      this.client = createClient(this.config.url, {
        username: this.config.username,
        password: this.config.password,
      });

      // Test connection
      await this.client.exists('/');
      logger.info('NextCloud connected successfully');
      this.enabled = true;
    } catch (error) {
      logger.error('Failed to connect to NextCloud:', error);
      this.enabled = false;
    }
    */
  }

  async updateConfig(config) {
    // Disabled for now
    logger.warn('NextCloud is currently disabled');
    return false;
  }

  async uploadFile(rfqId, file, metadata) {
    // Return mock response when disabled
    logger.warn('NextCloud upload skipped - feature disabled');
    return {
      storagePath: `local/${rfqId}/${metadata.type}/${Date.now()}-${file.originalname}`,
      filename: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  async downloadFile(storagePath) {
    // Return empty buffer when disabled
    logger.warn('NextCloud download skipped - feature disabled');
    return Buffer.from('');
  }

  async deleteFile(storagePath) {
    // Do nothing when disabled
    logger.warn('NextCloud delete skipped - feature disabled');
  }

  async ensureDirectory(path) {
    // Do nothing when disabled
    logger.warn('NextCloud directory creation skipped - feature disabled');
  }

  async listFiles(path) {
    // Return empty array when disabled
    logger.warn('NextCloud list files skipped - feature disabled');
    return [];
  }
}

module.exports = new NextCloudService();