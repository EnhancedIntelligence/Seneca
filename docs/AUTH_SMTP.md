# SMTP Configuration for Supabase Auth

This guide covers configuring SMTP for Supabase Auth to send magic link emails in production.

## Prerequisites

- Supabase project with Auth enabled
- SMTP service credentials (Resend, SendGrid, AWS SES, etc.)
- Domain with DNS access for SPF/DKIM configuration

## Step 1: Choose SMTP Provider

### Option A: Resend (Recommended for simplicity)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Get API key and SMTP credentials

**SMTP Settings:**

- Host: `smtp.resend.com`
- Port: `465` (SSL) or `587` (TLS)
- Username: `resend`
- Password: Your API key

### Option B: AWS SES (Recommended for scale)

1. Set up SES in AWS Console
2. Verify domain ownership
3. Create SMTP credentials

**SMTP Settings:**

- Host: `email-smtp.[region].amazonaws.com`
- Port: `465` (SSL) or `587` (TLS)
- Username: Your SMTP username
- Password: Your SMTP password

### Option C: SendGrid

1. Create SendGrid account
2. Verify sender domain
3. Generate API key

**SMTP Settings:**

- Host: `smtp.sendgrid.net`
- Port: `465` (SSL) or `587` (TLS)
- Username: `apikey`
- Password: Your API key

## Step 2: Configure Supabase Auth SMTP

1. Go to Supabase Dashboard → Authentication → Settings → Email Settings

2. Enable "Custom SMTP" and enter your credentials:

```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Pass: re_xxxxxxxxxxxx
SMTP Sender Email: noreply@yourdomain.com
SMTP Sender Name: Seneca Protocol
```

3. Configure email templates (optional):

### Magic Link Template

```html
<h2>Sign in to Seneca Protocol</h2>
<p>Hi there,</p>
<p>Click the link below to sign in to your Seneca account:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In to Seneca</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
```

## Step 3: DNS Configuration

### SPF Record

Add TXT record to your domain:

```
v=spf1 include:_spf.resend.com ~all
```

### DKIM Records

Add the DKIM records provided by your SMTP service:

```
resend._domainkey.yourdomain.com CNAME sendgrid1._domainkey.resend.com
resend2._domainkey.yourdomain.com CNAME sendgrid2._domainkey.resend.com
```

### DMARC (Optional but recommended)

```
_dmarc.yourdomain.com TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

## Step 4: Test Configuration

1. In Supabase Dashboard, click "Send Test Email"
2. Check the recipient inbox and spam folder
3. Verify the email arrives with proper formatting

## Step 5: Environment Variables

Update your `.env.local` for local development:

```env
# Required for magic links to work locally
NEXT_PUBLIC_APP_ORIGIN=https://yourdomain.com

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

## Step 6: Verify in Supabase Logs

1. Go to Supabase Dashboard → Logs → Auth
2. Trigger a magic link sign-in
3. Look for log entries:
   - `Email sent successfully` ✅
   - `Failed to send email` ❌ (troubleshoot if seen)

## Troubleshooting

### Emails Going to Spam

- Verify SPF and DKIM records are properly configured
- Use a dedicated subdomain for transactional emails (e.g., mail.yourdomain.com)
- Ensure sender email matches verified domain
- Add DMARC policy

### Emails Not Sending

1. Check SMTP credentials are correct
2. Verify port isn't blocked (try both 465 and 587)
3. Check Supabase Auth logs for specific error messages
4. Test SMTP connection using telnet or openssl:

```bash
openssl s_client -connect smtp.resend.com:587 -starttls smtp
```

### Rate Limiting

- Resend: 100 emails/day (free), 10,000/month (paid)
- SendGrid: 100 emails/day (free)
- AWS SES: Starts at 200 emails/day, increases with reputation

## Security Best Practices

1. **Never commit SMTP credentials** to version control
2. **Use environment variables** for all sensitive configuration
3. **Enable 2FA** on your SMTP provider account
4. **Monitor bounce rates** to maintain sender reputation
5. **Set up alerts** for unusual sending patterns
6. **Rotate API keys** periodically

## Production Checklist

- [ ] SMTP credentials configured in Supabase
- [ ] SPF record added to DNS
- [ ] DKIM records configured
- [ ] Test email sent and received
- [ ] Email templates customized
- [ ] Sender domain verified
- [ ] Rate limits understood
- [ ] Monitoring/alerts configured
- [ ] Backup SMTP provider configured (optional)

## Support Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend Documentation](https://resend.com/docs)
- [SendGrid Setup Guide](https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs)
- [AWS SES Configuration](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)
