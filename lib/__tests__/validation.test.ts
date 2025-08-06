import { describe, it, expect } from 'vitest'
import { 
  memorySchema, 
  familySchema, 
  childSchema, 
  emailSchema, 
  passwordSchema, 
  signUpSchema,
  signInSchema,
  validateRequestBody,
  sanitizeInput,
  fileUploadSchema
} from '../validation'

describe('Validation Schemas', () => {
  describe('memorySchema', () => {
    it('validates valid memory data', () => {
      const validMemory = {
        content: 'My child took their first steps today!',
        familyId: '123e4567-e89b-12d3-a456-426614174000',
        childId: '987fcdeb-51a2-43b1-9876-123456789abc',
        location: 'Living room',
        category: 'milestone',
      }

      const result = memorySchema.safeParse(validMemory)
      expect(result.success).toBe(true)
    })

    it('rejects empty content', () => {
      const invalidMemory = {
        content: '',
        familyId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = memorySchema.safeParse(invalidMemory)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Memory content is required')
      }
    })

    it('rejects content that is too long', () => {
      const invalidMemory = {
        content: 'a'.repeat(10001),
        familyId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = memorySchema.safeParse(invalidMemory)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Memory content must be less than 10,000 characters')
      }
    })

    it('sanitizes HTML content automatically', () => {
      const memoryWithHTML = {
        content: 'This is dangerous <script>alert("xss")</script>',
        familyId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = memorySchema.safeParse(memoryWithHTML)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('This is dangerous')
      }
    })

    it('rejects invalid UUID format', () => {
      const invalidMemory = {
        content: 'Valid content',
        familyId: 'not-a-uuid',
      }

      const result = memorySchema.safeParse(invalidMemory)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid family ID')
      }
    })
  })

  describe('familySchema', () => {
    it('validates valid family data', () => {
      const validFamily = {
        name: 'The Smith Family',
        description: 'Our wonderful family memories',
      }

      const result = familySchema.safeParse(validFamily)
      expect(result.success).toBe(true)
    })

    it('trims whitespace from name', () => {
      const family = {
        name: '  The Smith Family  ',
      }

      const result = familySchema.safeParse(family)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('The Smith Family')
      }
    })

    it('rejects empty name', () => {
      const invalidFamily = {
        name: '',
      }

      const result = familySchema.safeParse(invalidFamily)
      expect(result.success).toBe(false)
    })
  })

  describe('emailSchema', () => {
    it('validates correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ]

      validEmails.forEach(email => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(true)
      })
    })

    it('rejects invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'test@',
        'test.example.com',
      ]

      invalidEmails.forEach(email => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('passwordSchema', () => {
    it('validates strong passwords', () => {
      const validPasswords = [
        'StrongPass123',
        'MySecure$Password1',
        'ComplexP@ss9',
      ]

      validPasswords.forEach(password => {
        const result = passwordSchema.safeParse(password)
        expect(result.success).toBe(true)
      })
    })

    it('rejects weak passwords', () => {
      const weakPasswords = [
        'short',           // Too short
        'alllowercase123', // No uppercase
        'ALLUPPERCASE123', // No lowercase
        'NoNumbers',       // No numbers
        'a'.repeat(129),   // Too long
      ]

      weakPasswords.forEach(password => {
        const result = passwordSchema.safeParse(password)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('signUpSchema', () => {
    it('validates matching passwords', () => {
      const validSignUp = {
        email: 'test@example.com',
        password: 'StrongPass123',
        confirmPassword: 'StrongPass123',
      }

      const result = signUpSchema.safeParse(validSignUp)
      expect(result.success).toBe(true)
    })

    it('rejects mismatched passwords', () => {
      const invalidSignUp = {
        email: 'test@example.com',
        password: 'StrongPass123',
        confirmPassword: 'DifferentPass123',
      }

      const result = signUpSchema.safeParse(invalidSignUp)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Passwords don't match")
      }
    })
  })

  describe('fileUploadSchema', () => {
    it('validates allowed file types', () => {
      const validFiles = [
        { name: 'photo.jpg', size: 1000000, type: 'image/jpeg' },
        { name: 'video.mp4', size: 5000000, type: 'video/mp4' },
        { name: 'image.png', size: 2000000, type: 'image/png' },
      ]

      validFiles.forEach(file => {
        const result = fileUploadSchema.safeParse(file)
        expect(result.success).toBe(true)
      })
    })

    it('rejects files that are too large', () => {
      const largeFile = {
        name: 'large.jpg',
        size: 11 * 1024 * 1024, // 11MB
        type: 'image/jpeg',
      }

      const result = fileUploadSchema.safeParse(largeFile)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('File size must be less than 10MB')
      }
    })

    it('rejects unsupported file types', () => {
      const unsupportedFile = {
        name: 'document.pdf',
        size: 1000000,
        type: 'application/pdf',
      }

      const result = fileUploadSchema.safeParse(unsupportedFile)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid file type')
      }
    })
  })
})

describe('Validation Utilities', () => {
  describe('validateRequestBody', () => {
    it('returns success for valid data', () => {
      const validData = 'test@example.com'
      const result = validateRequestBody(emailSchema, validData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('test@example.com')
      }
    })

    it('returns errors for invalid data', () => {
      const invalidData = 'not-an-email'
      const result = validateRequestBody(emailSchema, invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0]).toContain('Invalid email address')
      }
    })

    it('handles non-ZodError exceptions', () => {
      const schema = {
        parse: () => {
          throw new Error('Custom error')
        }
      } as any

      const result = validateRequestBody(schema, {})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toContain('Invalid request data')
      }
    })
  })

  describe('sanitizeInput', () => {
    it('trims whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world')
    })

    it('removes dangerous characters', () => {
      expect(sanitizeInput('Hello <script>"dangerous"</script>')).toBe('Hello')
    })

    it('limits input length', () => {
      const longInput = 'a'.repeat(15000)
      const result = sanitizeInput(longInput)
      expect(result.length).toBe(10000)
    })

    it('handles empty input', () => {
      expect(sanitizeInput('')).toBe('')
    })
  })
})