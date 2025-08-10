const prisma = require('../../db/prisma');
const logger = require('../../config/logger');
const emailService = require('../../utils/email');

const commentsService = {
  async listByParent(parentType, parentId) {
    const comments = await prisma.comment.findMany({
      where: {
        parentType,
        parentId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments;
  },

  async create(data, user) {
    const { mentions = [], ...commentData } = data;

    // Get parent info for notifications
    let parentInfo = null;
    if (data.parentType === 'RFQ') {
      parentInfo = await prisma.rfq.findUnique({
        where: { id: data.parentId },
      });
    } else if (data.parentType === 'FEATURE') {
      parentInfo = await prisma.feature.findUnique({
        where: { id: data.parentId },
        include: { rfq: true },
      });
    } else if (data.parentType === 'SCENARIO') {
      parentInfo = await prisma.scenario.findUnique({
        where: { id: data.parentId },
        include: { rfq: true },
      });
    } else if (data.parentType === 'DECISION_PACKAGE') {
      parentInfo = await prisma.decisionPackage.findUnique({
        where: { id: data.parentId },
        include: { rfq: true },
      });
    }

    const comment = await prisma.comment.create({
      data: {
        ...commentData,
        userId: user.id,
        mentions,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send notifications to mentioned users
    if (mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: {
          id: { in: mentions },
        },
      });

      for (const mentionedUser of mentionedUsers) {
        await emailService.sendMention({
          to: mentionedUser.email,
          fromUser: user.name,
          rfqName: parentInfo?.rfq?.name || parentInfo?.name || 'Unknown',
          comment: comment.body,
          context: data.parentType,
        });
      }
    }

    logger.info(`Comment created on ${data.parentType} ${data.parentId} by user ${user.id}`);
    return comment;
  },

  async update(id, data, user) {
    // Check if user owns the comment
    const existing = await prisma.comment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Comment not found');
    }

    if (existing.userId !== user.id && user.role !== 'ADMIN') {
      throw new Error('You can only edit your own comments');
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: {
        body: data.body,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    logger.info(`Comment ${id} updated by user ${user.id}`);
    return comment;
  },

  async delete(id, user) {
    // Check if user owns the comment
    const existing = await prisma.comment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Comment not found');
    }

    if (existing.userId !== user.id && user.role !== 'ADMIN') {
      throw new Error('You can only delete your own comments');
    }

    await prisma.comment.delete({
      where: { id },
    });

    logger.info(`Comment ${id} deleted by user ${user.id}`);
  },
};

module.exports = commentsService;