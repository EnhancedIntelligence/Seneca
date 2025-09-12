# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Onboarding System Enhancements**
  - Real-time username availability checking with debounced API calls
  - Username suggestions API route (`GET /api/onboarding/username-suggestions`)
  - E.164 phone number validation with international format support
  - Rate limiting policies for security:
    - Username checks: 10 per minute per user, 20 per minute per IP
    - Onboarding completion: 5 per hour per user, 10 per hour per IP
  - UTC date handling for date of birth to prevent timezone issues
  - Friendly error mapping for username uniqueness violations
  - Client-side username regex validation to reduce unnecessary API calls

### Fixed
- Username lowercasing consistency in both availability checks and submission
- Date of birth timezone drift by using UTC serialization
- Phone number validation with proper E.164 format checking
- 429 rate limit responses now show user-friendly messages

### Security
- Added rate limiting to prevent abuse of username checks and onboarding attempts
- PII-safe logging that masks sensitive user information
- Reserved username filtering at database level
- Row-level security (RLS) enforcement for user data

### Technical
- Comprehensive test coverage for:
  - Username suggestion generation with normalization and deduplication
  - Rate limit policies with IP extraction and fallback handling
  - Phone number E.164 validation and formatting
- Server-only guards to prevent client-side imports of server utilities
- Deterministic username suggestion generation for testing
- Mock infrastructure for server-only modules in test environment

## [0.4.0] - 2025-09-04

### Added
- Authentication system with Supabase OTP (magic links)
- Onboarding gates implementation
- Dashboard structure with family/child models

## [0.3.0] - 2025-08-27

### Added
- Memory capture UI with voice, text, and manual entry
- AI processing pipeline for memory enrichment
- Component library using Shadcn UI

## [0.2.0] - 2025-08-19

### Added
- Row-level security policies for all database tables
- User-scoped data access controls
- Family membership system

## [0.1.0] - 2025-08-06

### Added
- Initial project setup with Next.js 15, React 19, TypeScript
- Supabase integration for authentication and database
- Basic project structure with App Router