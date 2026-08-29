require("dotenv").config();

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  agooSmsApiKey: process.env.AGOOSMS_API_KEY,
  agooSmsSenderId: process.env.AGOOSMS_SENDER_ID,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  otpExpiryMin: Number(process.env.OTP_EXPIRY_MIN) || 10,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleSecretId: process.env.GOOGLE_SECRET_ID,
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
