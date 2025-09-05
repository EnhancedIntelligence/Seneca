import { z } from "zod";

export const MIN_AGE = 13;

// Regex patterns for reuse across client and server
export const USERNAME_REGEX = /^[a-z0-9_][a-z0-9_-]{2,29}$/;
export const USERNAME_PATTERN_HTML = "^[a-z0-9_][a-z0-9_-]{2,29}$";
export const FULLNAME_REGEX = /^[a-zA-Z\s'-]+$/;
export const E164_REGEX = /^\+[1-9]\d{1,14}$/;
export const E164_PATTERN_HTML = "^\\+[1-9]\\d{1,14}$";

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be less than 100 characters")
  .regex(FULLNAME_REGEX, "Invalid characters in name");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(USERNAME_REGEX, "Username can only contain lowercase letters, numbers, underscore, and hyphen (cannot start with hyphen)");

export const dateOfBirthSchema = z
  .string()
  .trim()
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s), "Invalid date format")
  .transform((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d); // local midnight to avoid timezone drift
  })
  .refine((d) => !Number.isNaN(d.valueOf()), "Invalid date")
  .refine((d) => d >= new Date(1900, 0, 1), "Date of birth seems invalid")
  .refine((d) => d <= new Date(), "Date of birth cannot be in the future")
  .refine((d) => {
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const hadBirthday = now >= new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (!hadBirthday) age -= 1;
    return age >= MIN_AGE;
  }, `You must be at least ${MIN_AGE} years old`);

export const phoneSchema = z
  .string()
  .transform((s) => s.trim())
  .optional()
  .transform((v) => (v && v.length === 0 ? undefined : v)) // "" → undefined
  .refine((v) => !v || E164_REGEX.test(v), "Phone number must be in E.164 format (e.g., +1234567890)");

export const onboardingFormSchema = z.object({
  fullName: fullNameSchema,
  username: usernameSchema,
  dateOfBirth: dateOfBirthSchema,
  phone: phoneSchema,
});

export type OnboardingFormData = z.infer<typeof onboardingFormSchema>;