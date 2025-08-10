const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const attachmentsController = require('./attachments.controller');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');

const router = express.Router();

router.use(authenticate);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain',
      'text/csv',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const uploadMetadataSchema = z.object({
  body: z.object({
    parentType: z.enum(['RFQ', 'FEATURE', 'SCENARIO', 'DECISION_PACKAGE']),
    parentId: z.string(),
  }),
});

router.get('/:parentType/:parentId', rbac.requireRfqAccess, attachmentsController.listByParent);
router.get('/download/:id', rbac.requireRfqAccess, attachmentsController.download);
router.post(
  '/upload',
  rbac.requireRfqAccess,
  upload.single('file'),
  validateRequest(uploadMetadataSchema),
  attachmentsController.upload
);
router.delete('/:id', rbac.requireRfqAccess, attachmentsController.delete);

module.exports = router;