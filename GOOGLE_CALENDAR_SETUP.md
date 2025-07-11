# Google Calendar OAuth Setup Guide

This guide will help you set up Google Calendar OAuth integration for your calendar sync application.

## Prerequisites

- A Google Cloud Console account
- Your Convex deployment URL
- Access to your Convex dashboard

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required information (app name, user support email, developer contact)
   - Add scopes: `https://www.googleapis.com/auth/calendar.readonly`
   - Add test users if needed

4. Create the OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Name: "Calendar Sync App"
   - Authorized redirect URIs: Add your OAuth callback URL:
     - For development: `http://localhost:3000/sync/oauth/callback`
     - For production: `https://yourdomain.com/sync/oauth/callback`

5. Note down your **Client ID** and **Client Secret**

## Step 3: Configure Environment Variables in Convex

1. Go to your [Convex Dashboard](https://dashboard.convex.dev/)
2. Navigate to your deployment settings
3. Go to "Environment Variables"
4. Add the following variables:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://yourdomain.com/sync/oauth/callback
```

**Important Notes:**
- Replace `yourdomain.com` with your actual domain
- For development, you can use `http://localhost:3000/sync/oauth/callback`
- Make sure the redirect URI matches exactly what you configured in Google Cloud Console

## Step 4: Deploy Your Changes

1. Deploy your Convex functions:
```bash
cd packages/backend
npx convex deploy
```

2. Deploy your web app (if using Vercel or similar):
```bash
cd apps/web
npm run build
npm run deploy
```

## Step 5: Test the Integration

1. Go to your sync page (`/sync`)
2. Click "Add Account" > "Google Calendar"
3. You should be redirected to Google's OAuth consent screen
4. After authorization, you should be redirected back to your app
5. Your Google Calendar should now appear in the connected accounts list

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Make sure the redirect URI in Convex matches exactly what's configured in Google Cloud Console
   - Check for trailing slashes or protocol mismatches

2. **"Google OAuth configuration missing" error**
   - Verify all environment variables are set in your Convex dashboard
   - Make sure you've deployed the latest changes

3. **"Failed to exchange code for tokens" error**
   - Check that your Client ID and Client Secret are correct
   - Verify the Google Calendar API is enabled in your Google Cloud project

4. **"Calendar account not found" error**
   - This usually means the OAuth flow didn't complete properly
   - Try disconnecting and reconnecting the account

### Debugging

1. Check the browser console for any JavaScript errors
2. Check your Convex function logs in the dashboard
3. Verify the OAuth callback URL is accessible

## Security Considerations

1. **Never commit your Client Secret to version control**
2. **Use environment variables for all sensitive configuration**
3. **Regularly rotate your OAuth credentials**
4. **Monitor your Google Cloud Console for any suspicious activity**

## API Scopes Used

The application requests the following Google Calendar scopes:
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
- `https://www.googleapis.com/auth/calendar.events.readonly` - Read calendar events
- `https://www.googleapis.com/auth/userinfo.email` - Get user email
- `https://www.googleapis.com/auth/userinfo.profile` - Get user profile info

## Next Steps

Once Google Calendar is working, you can:
1. Implement automatic sync scheduling
2. Add support for other calendar providers (Outlook, Apple)
3. Implement two-way sync (create/edit events)
4. Add calendar sharing and collaboration features

## Support

If you encounter issues:
1. Check the [Google Calendar API documentation](https://developers.google.com/calendar/api)
2. Review the [Convex documentation](https://docs.convex.dev/)
3. Check the application logs for detailed error messages 