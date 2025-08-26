# Complete SMTP Configuration Guide for Seneca Protocol

## Current Authentication Status

✅ **Code Status**: The authentication code is fully implemented and working
❌ **SMTP Status**: Needs configuration in your Supabase dashboard

## How to Configure SMTP (Step-by-Step)

### Option 1: Resend (Recommended - Easiest)

1. **Sign up for Resend**
   - Go to https://resend.com
   - Create a free account (10,000 emails/month free)

2. **Add and Verify Your Domain**
   - Dashboard → Domains → Add Domain
   - Enter your domain (e.g., `yourdomain.com`)
   - Add the DNS records shown (CNAME, TXT)
   - Wait for verification (usually ~5 minutes)

3. **Get Your API Key**
   - Dashboard → API Keys
   - Create a new API key
   - Copy the key (starts with `re_`)

4. **Configure in Supabase**
   - Go to your Supabase project dashboard
   - Navigate to: **Settings** → **Auth** → **SMTP Settings**
   - Enable "Custom SMTP"
   - Enter these settings:
   ```
   Sender email: noreply@yourdomain.com
   Sender name: Seneca Protocol
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: [Your API key starting with re_]
   ```
   - Click "Save"

5. **Test It**
   - Go to your app's `/login` page
   - Enter your email
   - Check inbox for magic link

### Option 2: AWS SES (For Production Scale)

1. **Set up AWS SES**
   - AWS Console → Simple Email Service
   - Verify your domain
   - Move out of sandbox (request production access)
   - Create SMTP credentials

2. **Configure in Supabase**
   ```
   Host: email-smtp.[region].amazonaws.com
   Port: 587
   Username: [Your AWS SMTP username]
   Password: [Your AWS SMTP password]
   Sender email: noreply@yourdomain.com
   ```

### Option 3: SendGrid

1. **SendGrid Setup**
   - Sign up at https://sendgrid.com
   - Verify sender identity
   - Create API key

2. **Configure in Supabase**
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [Your SendGrid API key]
   Sender email: [Your verified sender]
   ```

## Troubleshooting SMTP Issues

### Common Problems and Solutions

1. **"SMTP not configured" error**
   - Check Supabase dashboard → Settings → Auth → SMTP Settings
   - Ensure "Custom SMTP" is enabled
   - Verify all fields are filled correctly

2. **Emails not arriving**
   - Check spam/junk folder
   - Verify sender domain is verified with provider
   - Check Supabase logs: Dashboard → Logs → Auth

3. **"Invalid credentials" error**
   - Double-check API key/password
   - Ensure you're using the right username (often "resend" or "apikey")
   - Verify port number matches security setting

4. **Rate limiting**
   - Free tiers have limits (Resend: 100/day on free)
   - Check provider dashboard for current usage

## Alternative: Password Authentication (Quick Development)

If SMTP is blocking you, enable password auth temporarily:

1. **Enable in Supabase**
   - Dashboard → Authentication → Providers
   - Enable "Email" provider
   - Enable "Password" option

2. **Test Password Login**
   - The login form already supports passwords
   - Use the "Password" tab on `/login`
   - Create account with email + password

## Testing Your Configuration

### Quick Test Script
```javascript
// Run this in browser console on /login page
async function testSMTP() {
  const email = 'test@example.com'; // Use your email
  const response = await fetch('/api/test-smtp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const result = await response.json();
  console.log('SMTP Test Result:', result);
}
testSMTP();
```

### Manual Test
1. Go to `/login`
2. Enter your email
3. Click "Send Magic Link"
4. Check email (including spam)
5. Click link to authenticate

## Required Environment Variables

Make sure these are set in your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Next Steps After SMTP Works

1. **Customize Email Templates**
   - Supabase → Authentication → Email Templates
   - Customize subject lines and content

2. **Add OAuth Providers**
   - Enable Google, GitHub, etc.
   - Configure OAuth apps and add credentials

3. **Set Email Confirmation**
   - Require email verification for new signups
   - Configure confirmation redirect URLs

## Need Help?

1. **Check Supabase Logs**
   - Dashboard → Logs → Auth
   - Look for SMTP errors

2. **Test with Different Provider**
   - If one provider fails, try another
   - Resend is usually most reliable for dev

3. **Use Password Auth**
   - Works immediately without SMTP
   - Good for local development

## Screenshots/Visuals Needed from Your Supabase

To help configure SMTP, take screenshots of:
1. Supabase Dashboard → Settings → Auth → SMTP Settings
2. Your SMTP provider's dashboard (hiding sensitive keys)
3. Any error messages in Supabase Logs → Auth

Share these with an AI assistant (Claude, GPT) to get specific configuration help.