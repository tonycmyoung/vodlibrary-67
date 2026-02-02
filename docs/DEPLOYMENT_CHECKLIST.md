# Deployment Checklist

## Pre-Deployment

### Environment Variables
- [ ] `SUPABASE_URL` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- [ ] `RESEND_API_KEY` configured
- [ ] `FROM_EMAIL` configured (use verified domain)
- [ ] `BLOB_READ_WRITE_TOKEN` configured
- [ ] `NEXT_PUBLIC_FULL_SITE_URL` configured
- [ ] `NEXT_PUBLIC_SITE_URL` configured

### Supabase Configuration
- [ ] Site URL set to production domain
- [ ] Auth redirect URLs configured
- [ ] Email templates customized (optional)

### GitHub (for CI/CD)
- [ ] `SONAR_TOKEN` added to repository secrets

## Post-Deployment Verification

### Authentication
- [ ] User registration works
- [ ] Email confirmation works
- [ ] Password reset works
- [ ] Login/logout works

### Core Functionality
- [ ] Video library displays correctly
- [ ] Video playback works
- [ ] Search and filtering work
- [ ] Favorites system works

### Admin Functions
- [ ] Admin dashboard accessible
- [ ] User management works
- [ ] Video management works
- [ ] Notifications work

### Email
- [ ] Registration emails sent
- [ ] Password reset emails sent
- [ ] Notification emails sent

## Domain Setup (if using custom domain)

1. Add domain in Vercel project settings
2. Configure DNS records as instructed by Vercel
3. Update Supabase Site URL to new domain
4. Update Supabase redirect URLs
5. Verify Resend domain is configured
