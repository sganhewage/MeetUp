import { missingEnvVariableUrl } from "./utils";

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId) {
    throw new Error(
      missingEnvVariableUrl(
        "GOOGLE_CLIENT_ID",
        "https://console.cloud.google.com/apis/credentials"
      )
    );
  }

  if (!clientSecret) {
    throw new Error(
      missingEnvVariableUrl(
        "GOOGLE_CLIENT_SECRET",
        "https://console.cloud.google.com/apis/credentials"
      )
    );
  }

  if (!redirectUri) {
    throw new Error(
      missingEnvVariableUrl(
        "GOOGLE_REDIRECT_URI",
        "Set this to your OAuth callback URL (e.g., https://yourdomain.com/sync/oauth/callback)"
      )
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function getClerkConfig() {
  const issuerUrl = process.env.CLERK_ISSUER_URL;
  
  if (!issuerUrl) {
    throw new Error(
      missingEnvVariableUrl(
        "CLERK_ISSUER_URL",
        "https://dashboard.clerk.com/last-active?path=jwt-templates"
      )
    );
  }

  return { issuerUrl };
} 

export function getOutlookOAuthConfig() {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI;

  if (!clientId) {
    throw new Error(
      missingEnvVariableUrl(
        "OUTLOOK_CLIENT_ID",
        "https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
      )
    );
  }

  if (!clientSecret) {
    throw new Error(
      missingEnvVariableUrl(
        "OUTLOOK_CLIENT_SECRET",
        "https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
      )
    );
  }

  if (!redirectUri) {
    throw new Error(
      missingEnvVariableUrl(
        "OUTLOOK_REDIRECT_URI",
        "Set this to your OAuth callback URL (e.g., https://yourdomain.com/sync/oauth/callback)"
      )
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
} 