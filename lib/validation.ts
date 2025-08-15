import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Memory validation schema
export const memorySchema = z.object({
  content: z.string()
    .min(1, 'Memory content is required')
    .max(10000, 'Memory content must be less than 10,000 characters')
    .transform(sanitizeInput), // Sanitize content automatically
  childId: z.string().uuid('Invalid child ID').optional(),
  familyId: z.string().uuid('Invalid family ID'),
  location: z.string().max(255, 'Location must be less than 255 characters').transform(val => val ? sanitizeInput(val) : val).optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').transform(val => val ? sanitizeInput(val) : val).optional(),
})

// Family validation schema
export const familySchema = z.object({
  name: z.string()
    .min(1, 'Family name is required')
    .max(100, 'Family name must be less than 100 characters')
    .transform(sanitizeInput),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .transform(val => val ? sanitizeInput(val) : val)
    .optional(),
})

// Child validation schema
export const childSchema = z.object({
  name: z.string()
    .min(1, 'Child name is required')
    .max(100, 'Name must be less than 100 characters')
    .transform(sanitizeInput),
  familyId: z.string().uuid('Invalid family ID'),
  birthDate: z.string().date('Invalid birth date').optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  notes: z.string()
    .max(1000, 'Notes must be less than 1,000 characters')
    .transform(val => val ? sanitizeInput(val) : val)
    .optional(),
})

// User input sanitization using DOMPurify
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // First sanitize with DOMPurify to remove XSS vectors
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Remove all HTML tags
    ALLOWED_ATTR: [], // Remove all attributes
    KEEP_CONTENT: true, // Keep text content
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    SANITIZE_NAMED_PROPS: true,
  })

  // Additional validation - remove dangerous protocols and patterns
  const cleanInput = sanitized
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol  
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim()
    .substring(0, 10000) // Limit length

  return cleanInput
}

// Email validation
export const emailSchema = z.string().email('Invalid email address')

// Password validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Auth validation schemas
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// API request validation helper
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
      return { success: false, errors }
    }
    return { success: false, errors: ['Invalid request data'] }
  }
}

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  type: z.string().refine(
    (type) => ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'].includes(type),
    'Invalid file type. Only JPEG, PNG, WebP images and MP4, MOV videos are allowed'
  ),
})

export type MemoryInput = z.infer<typeof memorySchema>
export type FamilyInput = z.infer<typeof familySchema>
export type ChildInput = z.infer<typeof childSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>