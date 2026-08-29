import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  GOOGLE_HEALTH_CLIENT_ID: z.string().min(1),
  GOOGLE_HEALTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_HEALTH_REDIRECT_URI: z.string().url(),
  APP_BASE_URL: z.string().url(),
  CRON_SECRET: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1),
});

/** Server-only secrets. Never import this from a Client Component. */
export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  GOOGLE_HEALTH_CLIENT_ID: process.env.GOOGLE_HEALTH_CLIENT_ID,
  GOOGLE_HEALTH_CLIENT_SECRET: process.env.GOOGLE_HEALTH_CLIENT_SECRET,
  GOOGLE_HEALTH_REDIRECT_URI: process.env.GOOGLE_HEALTH_REDIRECT_URI,
  APP_BASE_URL: process.env.APP_BASE_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
});
