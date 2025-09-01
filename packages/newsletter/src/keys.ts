import { z } from 'zod'

// Export just the schema for the env vars, not a createEnv instance
// This will be used by the web app's env.ts
export const newsletterEnvSchema = {
  // MailerLite Configuration
  MAILERLITE_API_KEY: z.string().optional(),
  MAILERLITE_GROUP_IDS: z.string().optional(),

  // ConvertKit Configuration  
  CONVERTKIT_API_KEY: z.string().optional(),
  CONVERTKIT_FORM_ID: z.string().optional(),
  CONVERTKIT_TAG_IDS: z.string().optional(),

  // Substack Configuration
  SUBSTACK_PUBLICATION_URL: z.string().url().optional(),
  SUBSTACK_EMBED_URL: z.string().url().optional(),
}