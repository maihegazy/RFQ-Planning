const dotenv = require('dotenv');
const { z } = require('zod');

// Load environment variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_SECURE: z.string().transform(val => val === 'true'),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  // Make NextCloud optional
  NEXTCLOUD_URL: z.string().optional().default('https://your-nextcloud-instance.com'),
  NEXTCLOUD_USERNAME: z.string().optional().default('dummy'),
  NEXTCLOUD_PASSWORD: z.string().optional().default('dummy'),
  NEXTCLOUD_BASE_PATH: z.string().default('/RFQ-System'),
  LOG_LEVEL: z.string().default('info'),
  LOG_DIR: z.string().default('./logs'),
  FRONTEND_URL: z.string(),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('Environment validation failed:', parseResult.error.format());
  process.exit(1);
}

module.exports = {
  env: parseResult.data,
};