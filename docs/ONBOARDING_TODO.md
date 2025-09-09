# Onboarding TODOs

## Overview

This document tracks TODO items for the onboarding flow implementation. References in code point here instead of inline TODOs.

## Username Reservations

- [ ] Finalize reserved username list source (static JSON vs DB table)
- [ ] Add admin bypass flag for reserved usernames
- [ ] Consider case variations and unicode homoglyphs
- **Reference:** See `app/(auth)/onboarding/actions.ts#check-username-availability`

## Phone Verification

- [ ] Gate E.164-validated phone numbers with OTP verification
- [ ] Implement retry/backoff on provider errors
- [ ] Add support for international formats with country code selector
- **Reference:** See `app/(auth)/onboarding/components/OnboardingForm.tsx#phone-input`

## Onboarding Wizard Enhancement

- [ ] Prefetch member data when OnboardingWizard is implemented
- [ ] Add progress indicator for multi-step onboarding
- [ ] Implement data persistence between steps
- **Reference:** See `app/(auth)/onboarding/page.tsx#L17-22`

## Profile Completion

- [ ] Add optional profile fields (bio, preferences, avatar)
- [ ] Implement profile photo upload with size/format validation
- [ ] Add social links validation and sanitization
- **Reference:** See database migration `20250903_add_profile_fields.sql`

## Error Handling

- [ ] Implement retry mechanism for RPC failures
- [ ] Add user-friendly error messages for common failures
- [ ] Log structured errors for monitoring
- **Reference:** See `app/(auth)/onboarding/actions.ts#complete-onboarding`

## Testing

- [ ] Add E2E tests for complete onboarding flow
- [ ] Test username availability edge cases
- [ ] Test form validation and error states
- [ ] Test redirect flows after completion

## Security

- [ ] Add rate limiting to username checking endpoint
- [ ] Implement CAPTCHA for bot prevention
- [ ] Audit PII handling in logs
- **Reference:** See `lib/logger.ts` for PII masking implementation

## Performance

- [ ] Implement debounce for username availability checking
- [ ] Cache username check results temporarily
- [ ] Optimize RPC calls with proper indexes

## Accessibility

- [ ] Test screen reader flow
- [ ] Verify keyboard navigation
- [ ] Add skip links for multi-step forms
- [ ] Ensure proper focus management

---

_Last Updated: 2025-09-09_
_Feature Flag: `SENECA_ONBOARDING_V1`_
