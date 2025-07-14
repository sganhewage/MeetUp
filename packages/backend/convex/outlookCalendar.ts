import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getOutlookOAuthConfig } from "./env";

// Utility to get userId from context
export const getUserId = async (ctx: { auth: any }): Promise<string | undefined> => {
  return (await ctx.auth.getUserIdentity())?.subject;
};

// Generate Outlook OAuth URL
export const generateOutlookOAuthUrl = action({
  args: {},
  handler: async (ctx: any): Promise<string> => {
    try {
      const userId = await getUserId(ctx);
      if (!userId) throw new Error("User not authenticated");
      const { clientId, redirectUri } = getOutlookOAuthConfig();
      const scope = encodeURIComponent([
        "Calendars.Read",
        "Calendars.Read.Shared",
        "User.Read",
        "offline_access",
      ].join(" "));
      const state = encodeURIComponent(JSON.stringify({ userId, provider: "outlook", timestamp: Date.now() }));
      const authUrl =
        `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_mode=query&` +
        `scope=${scope}&` +
        `state=${state}`;
      return authUrl;
    } catch (error: any) {
      console.error("generateOutlookOAuthUrl error:", error);
      throw new Error(error?.message || "Failed to generate Outlook OAuth URL");
    }
  },
});

// Handle Outlook OAuth callback
export const handleOutlookOAuthCallback = action({
  args: {
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx: any, args: { code: string; state: string }): Promise<any> => {
    try {
      const { clientId, clientSecret, redirectUri } = getOutlookOAuthConfig();
      let stateData: any;
      try {
        stateData = JSON.parse(decodeURIComponent(args.state));
      } catch (error) {
        throw new Error("Invalid state parameter");
      }
      const { userId } = stateData;
      if (!userId) throw new Error("User ID not found in state");

      // Exchange code for tokens
      const tokenResponse: any = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: args.code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Failed to exchange code for tokens: ${errorText}`);
      }
      const tokenData: any = await tokenResponse.json();
      const { access_token, refresh_token, expires_in } = tokenData;

      // Get user info
      const userInfoResponse: any = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!userInfoResponse.ok) {
        throw new Error("Failed to get user info");
      }
      const userInfo: any = await userInfoResponse.json();
      const { id: outlookAccountId, mail, userPrincipalName, displayName } = userInfo;
      const email = mail || userPrincipalName;
      const name = displayName;

      // Create or update calendar account
      await ctx.runMutation(api.outlookCalendar.createOrUpdateCalendarAccount, {
        userId,
        provider: "outlook",
        accountId: outlookAccountId,
        email,
        name,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
      });
      return { success: true, email };
    } catch (error: any) {
      console.error("handleOutlookOAuthCallback error:", error);
      throw new Error(error?.message || "Failed to handle Outlook OAuth callback");
    }
  },
});

// Create or update calendar account
export const createOrUpdateCalendarAccount = mutation({
  args: {
    userId: v.string(),
    provider: v.string(),
    accountId: v.string(),
    email: v.string(),
    name: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    // Check if account already exists
    const existingAccount: any = await ctx.db
      .query("calendarAccounts")
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .filter((q: any) => q.eq(q.field("provider"), args.provider))
      .filter((q: any) => q.eq(q.field("accountId"), args.accountId))
      .first();
    if (existingAccount) {
      await ctx.db.patch(existingAccount._id, {
        email: args.email,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        isActive: true,
        lastSync: Date.now(),
      });
      return existingAccount._id;
    } else {
      const accountId: any = await ctx.db.insert("calendarAccounts", {
        userId: args.userId,
        provider: args.provider,
        accountId: args.accountId,
        email: args.email,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        isActive: true,
        lastSync: Date.now(),
      });
      return accountId;
    }
  },
});

// Refresh Outlook access token
export const refreshOutlookToken = action({
  args: {
    accountId: v.id("calendarAccounts"),
  },
  handler: async (ctx: any, args: any): Promise<string> => {
    try {
      const account: any = await ctx.runQuery(api.outlookCalendar.getCalendarAccount, {
        accountId: args.accountId,
      });
      if (!account) throw new Error("Calendar account not found");
      const { clientId, clientSecret } = getOutlookOAuthConfig();
      const tokenResponse: any = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: account.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (!tokenResponse.ok) {
        throw new Error("Failed to refresh token");
      }
      const tokenData: any = await tokenResponse.json();
      const { access_token, expires_in } = tokenData;
      await ctx.runMutation(api.outlookCalendar.updateAccessToken, {
        accountId: args.accountId,
        accessToken: access_token,
        expiresIn: expires_in,
      });
      return access_token;
    } catch (error: any) {
      console.error("refreshOutlookToken error:", error);
      throw new Error(error?.message || "Failed to refresh Outlook token");
    }
  },
});

// Get calendar account
export const getCalendarAccount = query({
  args: {
    accountId: v.id("calendarAccounts"),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    return await ctx.db.get(args.accountId);
  },
});

// Update access token
export const updateAccessToken = mutation({
  args: {
    accountId: v.id("calendarAccounts"),
    accessToken: v.string(),
    expiresIn: v.number(),
  },
  handler: async (ctx: any, args: any): Promise<void> => {
    await ctx.db.patch(args.accountId, {
      accessToken: args.accessToken,
      lastSync: Date.now(),
    });
  },
});

// Sync Outlook Calendar events
export const syncOutlookCalendar = action({
  args: {
    accountId: v.id("calendarAccounts"),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    try {
      const account: any = await ctx.runQuery(api.outlookCalendar.getCalendarAccount, {
        accountId: args.accountId,
      });
      if (!account) {
        throw new Error("Calendar account not found");
      }
      let accessToken: string = account.accessToken;
      // Fetch events from Microsoft Graph API
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const eventsUrl = `https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '${oneMonthAgo.toISOString()}' and end/dateTime le '${oneMonthFromNow.toISOString()}'`;
      const eventsResponse: any = await fetch(eventsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!eventsResponse.ok) {
        throw new Error(`Failed to fetch Outlook events: ${eventsResponse.statusText}`);
      }
      const eventsData: any = await eventsResponse.json();
      const events: any[] = eventsData.value || [];
      // Transform Outlook events to app format
      const transformedEvents = events.map((event: any) => ({
        externalEventId: event.id,
        title: event.subject || "Untitled Event",
        description: event.bodyPreview || "",
        startTime: event.start?.dateTime || event.start?.date || "",
        endTime: event.end?.dateTime || event.end?.date || "",
        location: event.location?.displayName || "",
        isAllDay: event.isAllDay || false,
      }));
      // Sync events to database (reuse events.syncEvents mutation)
      await ctx.runMutation(api.events.syncEvents, {
        calendarAccountId: args.accountId,
        events: transformedEvents,
      });
      return { success: true, eventCount: transformedEvents.length };
    } catch (error: any) {
      console.error("syncOutlookCalendar error:", error);
      throw new Error(error?.message || "Failed to sync Outlook calendar");
    }
  },
}); 