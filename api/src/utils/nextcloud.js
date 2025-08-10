const { createClient } = require('webdav');
const { env } = require('../config/env');
const logger = require('../config/logger');
const prisma = require('../db/prisma');

class NextCloudService {
  constructor() {
    this.client = null;
    this.config = null;
    this.initializeClient();
  }

  async initializeClient() {
    try {
      // Get config from database (if exists)
      // This would be stored in a settings table - for now use env vars
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
    } catch (error) {
      logger.error('Failed to connect to NextCloud:', error);
    }
  }

  async updateConfig(config) {
    this.config = config;
    this.client = createClient(config.url, {
      username: config.username,
      password: config.password,
    });
    
    // Test connection
    await this.client.exists('/');
    
    // Save to database for persistence
    // await prisma.settings.upsert({ ... });
    
    return true;
  }

  async uploadFile(rfqId, file, metadata) {
    try {
      const path = `${this.config.basePath}/${rfqId}/${metadata.type}`;
      const filename = `${Date.now()}-${file.originalname}`;
      const fullPath = `${path}/${filename}`;

      // Create directory if it doesn't exist
      await this.ensureDirectory(path);

      // Upload file
      await this.client.putFileContents(fullPath, file.buffer);

      logger.info('File uploaded to NextCloud:', { path: fullPath });

      return {
        storagePath: fullPath,
        filename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      logger.error('Failed to upload file to NextCloud:', error);
      throw error;
    }
  }

  async downloadFile(storagePath) {
    try {
      const content = await this.client.getFileContents(storagePath);
      return content;
    } catch (error) {
      logger.error('Failed to download file from NextCloud:', error);
      throw error;
    }
  }

  async deleteFile(storagePath) {
    try {
      await this.client.deleteFile(storagePath);
      logger.info('File deleted from NextCloud:', { path: storagePath });
    } catch (error) {
      logger.error('Failed to delete file from NextCloud:', error);
      throw error;
    }
  }

  async ensureDirectory(path) {
    const parts = path.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of parts) {
      currentPath += `/${part}`;
      const exists = await this.client.exists(currentPath);
      if (!exists) {
        await this.client.createDirectory(currentPath);
      }
    }
  }

  async listFiles(path) {
    try {
      const contents = await this.client.getDirectoryContents(path);
      return contents;
    } catch (error) {
      logger.error('Failed to list files from NextCloud:', error);
      throw error;
    }
  }
}

module.exports = new NextCloudService();