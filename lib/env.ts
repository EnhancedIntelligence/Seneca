/**
 * Environment Configuration
 * Validates and provides type-safe access to environment variables
 */

import { z } from 'zod'

// Environment schema validation
const envSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // AI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().default('gpt-4'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-ada-002'),
  
  // Background Processing
  INTERNAL_API_KEY: z.string().min(1, 'Internal API key is required'),
  
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').default('http://localhost:3000'),
  
  // Optional Configuration
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  DEBUG: z.string().transform(val => val === 'true').default('false'),
  SKIP_ENV_VALIDATION: z.string().transform(val => val === 'true').default('false'),
  TEST_DATABASE_URL: z.string().optional(),
})

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      console.error('\n📋 Check your .env.local file and compare with README environment section')
      process.exit(1)
    }
    throw error
  }
}

// Skip validation in some cases
const shouldSkipValidation = process.env.SKIP_ENV_VALIDATION === 'true' || 
                            process.env.NODE_ENV === 'test'

// Export validated environment variables
export const env = shouldSkipValidation ? (process.env as any) : validateEnv()

// Helper functions
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isStaging = env.NODE_ENV === 'staging'
export const isDebug = env.DEBUG === true

// Supabase configuration
export const supabaseConfig = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
} as const

// AI configuration
export const aiConfig = {
  openaiApiKey: env.OPENAI_API_KEY,
  model: env.OPENAI_MODEL,
  embeddingModel: env.OPENAI_EMBEDDING_MODEL,
} as const

// Security configuration
export const securityConfig = {
  internalApiKey: env.INTERNAL_API_KEY,
  jwtSecret: env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS?.split(',') || [],
} as const

// Application configuration
export const appConfig = {
  url: env.NEXT_PUBLIC_APP_URL,
  nodeEnv: env.NODE_ENV,
} as const

// Debug helper
export function logEnvStatus() {
  if (isDevelopment || isDebug) {
    console.log('🔧 Environment Configuration:')
    console.log(`  - NODE_ENV: ${env.NODE_ENV}`)
    console.log(`  - Supabase URL: ${env.NEXT_PUBLIC_SUPABASE_URL}`)
    console.log(`  - App URL: ${env.NEXT_PUBLIC_APP_URL}`)
    console.log(`  - OpenAI Model: ${env.OPENAI_MODEL}`)
    console.log(`  - Debug: ${env.DEBUG}`)
    console.log(`  - Has Sentry: ${env.SENTRY_DSN ? 'Yes' : 'No'}`)
    console.log(`  - Has GA: ${env.NEXT_PUBLIC_GA_ID ? 'Yes' : 'No'}`)
  }
}

// Runtime environment checks
export function requireEnvironment(envName: 'development' | 'staging' | 'production') {
  if (process.env.NODE_ENV !== envName) {
    throw new Error(`This operation requires NODE_ENV=${envName}, but got ${process.env.NODE_ENV}`)
  }
}

// Safe environment variable access
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key]
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(`Environment variable ${key} is not set`)
  }
  return value
}

// Type-safe environment access
export type EnvVars = z.infer<typeof envSchema>


