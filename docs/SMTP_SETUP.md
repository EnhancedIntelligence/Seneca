# SMTP Configuration for Supabase Auth

## Current Status
The login code is implemented and working, but SMTP needs to be configured in your Supabase project for email authentication to work.

## Steps to Configure SMTP

### 1. Choose an SMTP Provider
Popular options:
- **Resend** (recommended for simplicity)
- **AWS SES** (good for scale)
- **SendGrid**
- **Mailgun**
- **Postmark**

### 2. Get SMTP Credentials
Once you've chosen a provider, you'll need:
- SMTP Host (e.g., `smtp.resend.com`)
- SMTP Port (usually 587 for TLS or 465 for SSL)
- Username/API Key
- Password/Secret
- From Email Address (must be verified with provider)

### 3. Configure in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates** or **Settings**
3. Find the **SMTP Settings** section
4. Enter your credentials:
   ```
   Host: [your-smtp-host]
   Port: 587
   User: [your-username/api-key]
   Pass: [your-password]
   Sender Email: noreply@yourdomain.com
   Sender Name: Seneca Protocol
   ```
5. Enable SSL/TLS based on your provider's requirements
6. Test the configuration by sending a test email

### 4. Resend Quick Setup (Recommended)

If using Resend:
1. Sign up at https://resend.com
2. Verify your domain or use their test domain
3. Get your API key from the dashboard
4. In Supabase SMTP settings:
   ```
   Host: smtp.resend.com
   Port: 587
   User: resend
   Pass: [your-resend-api-key]
   Sender Email: [your-verified-email]
   ```

### 5. Test Authentication Flow

Once configured:
1. Go to `/login` in your app
2. Enter an email address
3. Check for the magic link email
4. Click the link to authenticate

## Troubleshooting

### Email not sending?
- Check SMTP credentials are correct
- Verify sender email is authorized with provider
- Check Supabase logs for errors
- Ensure your Supabase project is not in free tier limitations

### Alternative: Password Authentication

If SMTP setup is blocking development, you can temporarily use password auth:

1. Enable password auth in Supabase Dashboard → Authentication → Providers
2. Update the login page to support password input
3. Use `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`

## Next Steps

After SMTP is working:
1. Customize email templates in Supabase
2. Add email verification requirements
3. Configure password reset flow
4. Set up OAuth providers (Google, GitHub, etc.)