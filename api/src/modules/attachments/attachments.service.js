const prisma = require('../../db/prisma');
const logger = require('../../config/logger');
const nextCloudService = require('../../utils/nextcloud');

const attachmentsService = {
  async listByParent(parentType, parentId) {
    const attachments = await prisma.attachment.findMany({
      where: {
        parentType,
        parentId,
      },
      orderBy: [
        { version: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return attachments;
  },

  async upload(file, metadata, user) {
    const { parentType, parentId } = metadata;

    // Get RFQ ID for NextCloud path
    let rfqId = null;
    if (parentType === 'RFQ') {
      rfqId = parentId;
    } else if (parentType === 'FEATURE') {
      const feature = await prisma.feature.findUnique({
        where: { id: parentId },
      });
      rfqId = feature.rfqId;
    } else if (parentType === 'SCENARIO') {
      const scenario = await prisma.scenario.findUnique({
        where: { id: parentId },
      });
      rfqId = scenario.rfqId;
    } else if (parentType === 'DECISION_PACKAGE') {
      const pkg = await prisma.decisionPackage.findUnique({
        where: { id: parentId },
      });
      rfqId = pkg.rfqId;
    }

    // Check for existing versions
    const existingVersions = await prisma.attachment.findMany({
      where: {
        parentType,
        parentId,
        filename: file.originalname,
      },
      orderBy: { version: 'desc' },
    });

    const version = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;

    // Upload to NextCloud
    const uploadResult = await nextCloudService.uploadFile(
      rfqId,
      file,
      { type: parentType.toLowerCase() }
    );

    // Save attachment record
    const attachment = await prisma.attachment.create({
      data: {
        parentType,
        parentId,
        filename: file.originalname,
        version,
        fileSize: file.size,
        mimeType: file.mimetype,
        storagePath: uploadResult.storagePath,
        uploadedBy: user.id,
      },
    });

    logger.info(`Attachment uploaded: ${attachment.id} by user ${user.id}`);
    return attachment;
  },

  async download(id, user) {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Download from NextCloud
    const content = await nextCloudService.downloadFile(attachment.storagePath);

    logger.info(`Attachment downloaded: ${id} by user ${user.id}`);
    return { attachment, content };
  },

  async delete(id, user) {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Only allow deletion by uploader or admin
    if (attachment.uploadedBy !== user.id && user.role !== 'ADMIN') {
      throw new Error('You can only delete your own attachments');
    }

    // Delete from NextCloud
    await nextCloudService.deleteFile(attachment.storagePath);

    // Delete record
    await prisma.attachment.delete({
      where: { id },
    });

    logger.info(`Attachment deleted: ${id} by user ${user.id}`);
  },
};

module.exports = attachmentsService;