# Reserved Usernames

## Overview
The system maintains a list of reserved usernames that cannot be registered by users. These are stored in the database table `public.reserved_usernames`.

## Current Reserved List
The following usernames are reserved and cannot be used:

### System & Technical
- `admin`
- `root`
- `system`
- `api`
- `auth`
- `app`
- `www`
- `mail`
- `email`

### Application Routes
- `onboarding`
- `dashboard`
- `seneca`
- `protocol`
- `billing`
- `settings`
- `profile`
- `help`
- `about`

### Entity Names
- `user`, `users`
- `member`, `members`
- `family`, `families`
- `child`, `children`
- `memory`, `memories`

### Special Values
- `test`
- `demo`
- `null`
- `undefined`
- `private`
- `public`

## Managing Reserved Usernames

### Adding New Reserved Usernames
To add new reserved usernames, insert them into the database:

```sql
INSERT INTO public.reserved_usernames (username, reason) 
VALUES ('newusername', 'reserved for future feature')
ON CONFLICT DO NOTHING;
```

### Checking Reserved Status
Reserved usernames are checked at two levels:
1. **Database Function**: The `check_username_availability` RPC checks against the reserved list
2. **Database Trigger**: The `block_reserved_usernames` trigger prevents insertion of reserved usernames

### Implementation Details
- Usernames are stored and checked in lowercase (using CITEXT type)
- The check is case-insensitive
- Reserved usernames are filtered from suggestion generation
- The list is loaded once per request and cached in memory

## Migration
The initial reserved list is seeded in migration:
`supabase/migrations/20250903_add_profile_fields.sql`

To update the list in production:
1. Create a new migration adding/removing usernames
2. Test in staging environment
3. Deploy to production via Supabase migrations

## Local Testing
To quickly test reserved username behavior locally:

```sql
-- Add test reserved usernames
INSERT INTO public.reserved_usernames (username, reason) 
VALUES 
  ('testuser', 'testing'),
  ('myapp', 'branding'),
  ('coolname', 'testing')
ON CONFLICT DO NOTHING;

-- Verify they're blocked
SELECT public.check_username_availability('testuser'); -- Should return available: false, reason: RESERVED

-- Clean up test data
DELETE FROM public.reserved_usernames 
WHERE reason = 'testing';
```