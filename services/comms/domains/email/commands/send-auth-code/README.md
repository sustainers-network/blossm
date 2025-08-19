# Email Send Command

This command sends emails using nodemailer with Mailgun for reliable transactional email delivery.

## Configuration

### For Production (Mailgun)

Mailgun is a powerful email service with excellent deliverability and simple setup.

#### Setup Steps:

1. **Create a Mailgun Account**:
   - Go to https://mailgun.com
   - Sign up for a free account
   - Add your domain (dianet.work)

2. **Get Your API Key**:
   - In Mailgun dashboard, go to "Settings" → "API Keys"
   - Copy your "Private API Key"

3. **Set up the secret in your GCP Secret Manager**:
   - `mailgun-api-key`: Your Mailgun Private API Key

4. **Verify Your Domain**:
   - Add the required DNS records for dianet.work
   - Wait for verification (usually takes a few minutes)

### For Local Development

When `NODE_ENV=local`, the system automatically uses Ethereal Email (a test email service) which doesn't require any configuration.

## Why Mailgun?

- **Reliable delivery**: Excellent deliverability rates
- **Simple setup**: No complex OAuth2 or service account configuration
- **Great for transactional emails**: Designed for confirmation codes, notifications, etc.
- **Powerful API**: REST API and SMTP support
- **Good free tier**: 5,000 emails/month free for 3 months
- **Webhooks**: Real-time delivery tracking
- **Analytics**: Detailed email analytics and reporting

## Troubleshooting

### Connection Timeout Errors

If you're getting `ETIMEDOUT` errors:

1. **Check your internet connection**
2. **Verify the Mailgun API key is correct**
3. **Ensure your domain is verified** in Mailgun
4. **Check that the API key has proper permissions**

### Authentication Errors

If you're getting authentication errors:

1. **Verify the API key is the correct Private API Key**
2. **Ensure the domain is verified** in Mailgun
3. **Check that the API key hasn't been revoked**
4. **Verify you're using the correct Mailgun domain**

### Common Issues:

- **"Invalid credentials"**: Check API key format
- **"Domain not verified"**: Complete domain verification in Mailgun
- **"Rate limit exceeded"**: Check your Mailgun usage limits
- **"Sender not authorized"**: Make sure the from address matches your verified domain

## Testing

The command includes comprehensive tests that validate:
- Payload validation
- Email sending functionality
- Error handling

Run tests with:
```bash
npm test
```

## Security Notes

- **Never commit API keys to version control**
- **Use GCP Secret Manager** to store the API key
- **Rotate API keys regularly** for security
- **Use a dedicated domain** for your application emails 