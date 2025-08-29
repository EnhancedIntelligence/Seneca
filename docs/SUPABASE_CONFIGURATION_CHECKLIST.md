# Supabase Configuration Checklist

## Required Configuration in Supabase Dashboard

### 1. Authentication → URL Configuration

```
Site URL: http://localhost:3000
Additional Redirect URLs:
  - http://localhost:3000/auth/callback
  - http://localhost:3000/login
  - http://localhost:3000/dashboard
```

For production, add:

```
Site URL: https://yourdomain.com
Additional Redirect URLs:
  - https://yourdomain.com/auth/callback
  - https://yourdomain.com/login
  - https://yourdomain.com/dashboard
```

### 2. Authentication → Providers

- ✅ Enable **Email** provider
- ✅ Enable **Email OTP** (for magic links)
- ✅ Enable **Email + Password** (for password login)
- Optional: Enable **Google OAuth** or **GitHub OAuth**

### 3. Authentication → SMTP Settings

For magic links to work, configure one of these:

**Option A: Resend (Easiest)**

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: [Your Resend API key starting with re_]
Sender email: noreply@yourdomain.com
Sender name: Seneca Protocol
```

**Option B: AWS SES**

```
Host: email-smtp.[region].amazonaws.com
Port: 587
Username: [Your AWS SMTP username]
Password: [Your AWS SMTP password]
Sender email: noreply@yourdomain.com
```

### 4. Required Environment Variables

In your `.env.local` file:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...

# Optional but recommended
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
```

### 5. Database → RLS Policies

Run these migrations in SQL Editor:

1. `/supabase/migrations/20250819_user_scoped_rls_policies.sql`
2. `/supabase/migrations/20250819_enable_rls_all_tables.sql`
3. `/supabase/migrations/20250819_family_memberships_index.sql`

Or manually ensure RLS is enabled:

```sql
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_entries ENABLE ROW LEVEL SECURITY;
```

## Testing Checklist

### 1. Password Authentication (Works without SMTP)

- [ ] Go to `/login`
- [ ] Click "Password" tab
- [ ] Create account with email + password
- [ ] Login works and redirects to dashboard

### 2. Magic Link (Requires SMTP)

- [ ] Go to `/login`
- [ ] Enter email in "Magic Link" tab
- [ ] Email arrives within 1 minute
- [ ] Clicking link logs you in
- [ ] Redirects to correct page

### 3. Session Persistence

- [ ] Login once
- [ ] Refresh page - still logged in
- [ ] Open new tab - still logged in
- [ ] Close browser, reopen - still logged in

### 4. Protected Routes

- [ ] Logged out → visit `/dashboard` → redirects to `/login`
- [ ] Login → automatically redirects to dashboard
- [ ] Visit `/dashboard/settings` while logged out → redirects to `/login?next=%2Fdashboard%2Fsettings`
- [ ] Login → redirects back to `/dashboard/settings`

### 5. API Authentication

- [ ] Open Network tab in browser
- [ ] Navigate dashboard pages
- [ ] API calls include `Authorization: Bearer ...` header
- [ ] API calls return data (not 401/403)

## Common Issues & Solutions

### "Fetch failed" on login

- **Cause**: Supabase URL or keys incorrect
- **Fix**: Verify `.env.local` values match Supabase dashboard

### Magic link not arriving

- **Cause**: SMTP not configured
- **Fix**: Configure SMTP in Supabase or use password auth

### "Invalid authentication code" on callback

- **Cause**: Redirect URL not whitelisted
- **Fix**: Add URL to Supabase → Auth → URL Configuration

### Session expires immediately

- **Cause**: Cookie settings or domain mismatch
- **Fix**: Ensure Site URL matches your actual domain

### 401 errors on API calls

- **Cause**: RLS policies not configured
- **Fix**: Run the migration files or enable RLS manually

## Next Steps After Configuration

1. **Test all auth flows** using the checklist above
2. **Customize email templates** in Supabase → Auth → Email Templates
3. **Set up OAuth providers** if desired (Google, GitHub, etc.)
4. **Configure rate limiting** for production
5. **Set up monitoring** (Sentry, LogRocket, etc.)

## Support

If issues persist:

1. Check Supabase Logs → Auth for errors
2. Verify all environment variables are set
3. Test in incognito/private browser (no extensions)
4. Check browser console for detailed errors
