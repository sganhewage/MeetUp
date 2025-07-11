import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Auth } from "convex/server";
import { getGoogleOAuthConfig } from "./env";

export const getUserId = async (ctx: { auth: Auth }) => {
  return (await ctx.auth.getUserIdentity())?.subject;
};

// Generate Google OAuth URL
export const generateGoogleOAuthUrl = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const { clientId, redirectUri } = getGoogleOAuthConfig();

    const scope = encodeURIComponent([
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ].join(" "));

    const state = encodeURIComponent(JSON.stringify({ userId, timestamp: Date.now() }));
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scope}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${state}`;

    return authUrl;
  },
});

// Handle Google OAuth callback
export const handleGoogleOAuthCallback = action({
  args: {
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

    // Parse state to get userId
    let stateData;
    try {
      stateData = JSON.parse(decodeURIComponent(args.state));
    } catch (error) {
      throw new Error("Invalid state parameter");
    }

    const { userId } = stateData;
    if (!userId) {
      throw new Error("User ID not found in state");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user info
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
    );

    if (!userInfoResponse.ok) {
      throw new Error("Failed to get user info");
    }

    const userInfo = await userInfoResponse.json();
    const { id: googleAccountId, email, name } = userInfo;

    // Create or update calendar account
    await ctx.runMutation(api.googleCalendar.createOrUpdateCalendarAccount, {
      userId,
      provider: "google",
      accountId: googleAccountId,
      email,
      name,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
    });

    return { success: true, email };
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
  handler: async (ctx, args) => {
    // Check if account already exists
    const existingAccount = await ctx.db
      .query("calendarAccounts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("provider"), args.provider))
      .filter((q) => q.eq(q.field("accountId"), args.accountId))
      .first();

    if (existingAccount) {
      // Update existing account
      await ctx.db.patch(existingAccount._id, {
        email: args.email,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        isActive: true,
        lastSync: Date.now(),
      });
      return existingAccount._id;
    } else {
      // Create new account
      const accountId = await ctx.db.insert("calendarAccounts", {
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

// Refresh Google access token
export const refreshGoogleToken = action({
  args: {
    accountId: v.id("calendarAccounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.runQuery(api.googleCalendar.getCalendarAccount, {
      accountId: args.accountId,
    });

    if (!account) {
      throw new Error("Calendar account not found");
    }

    const { clientId, clientSecret } = getGoogleOAuthConfig();

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in } = tokenData;

    // Update the account with new access token
    await ctx.runMutation(api.googleCalendar.updateAccessToken, {
      accountId: args.accountId,
      accessToken: access_token,
      expiresIn: expires_in,
    });

    return access_token;
  },
});

// Get calendar account
export const getCalendarAccount = query({
  args: {
    accountId: v.id("calendarAccounts"),
  },
  handler: async (ctx, args) => {
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
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, {
      accessToken: args.accessToken,
      lastSync: Date.now(),
    });
  },
});

// Sync Google Calendar events
export const syncGoogleCalendar = action({
  args: {
    accountId: v.id("calendarAccounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.runQuery(api.googleCalendar.getCalendarAccount, {
      accountId: args.accountId,
    });

    if (!account) {
      throw new Error("Calendar account not found");
    }

    // Check if token needs refresh (simplified - you might want to store expiry time)
    let accessToken = account.accessToken;
    
    try {
      // Try to fetch calendar list first to test token
      const calendarListResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/users/me/calendarList?access_token=${accessToken}`
      );

      if (calendarListResponse.status === 401) {
        // Token expired, refresh it
        accessToken = await ctx.runAction(api.googleCalendar.refreshGoogleToken, {
          accountId: args.accountId,
        });
      }
    } catch (error) {
      console.error("Error checking token validity:", error);
    }

    // Get primary calendar events
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${oneMonthAgo.toISOString()}&` +
      `timeMax=${oneMonthFromNow.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime&` +
      `access_token=${accessToken}`
    );

    if (!eventsResponse.ok) {
      throw new Error(`Failed to fetch calendar events: ${eventsResponse.statusText}`);
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.items || [];

    // Transform Google Calendar events to our format
    const transformedEvents = events.map((event: any) => ({
      externalEventId: event.id,
      title: event.summary || "Untitled Event",
      description: event.description || "",
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      location: event.location || "",
      isAllDay: !event.start.dateTime, // If no dateTime, it's an all-day event
    }));

    // Sync events to database
    await ctx.runMutation(api.googleCalendar.syncEventsToDatabase, {
      accountId: args.accountId,
      events: transformedEvents,
    });

    return { success: true, eventCount: transformedEvents.length };
  },
});

// Sync events to database
export const syncEventsToDatabase = mutation({
  args: {
    accountId: v.id("calendarAccounts"),
    events: v.array(
      v.object({
        externalEventId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        startTime: v.string(),
        endTime: v.string(),
        location: v.optional(v.string()),
        isAllDay: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");

    // Get existing events for this account
    const existingEvents = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("calendarAccountId"), args.accountId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const existingEventIds = new Set(
      existingEvents.map((event) => event.externalEventId)
    );

    // Process new/updated events
    for (const eventData of args.events) {
      const existingEvent = existingEvents.find(
        (event) => event.externalEventId === eventData.externalEventId
      );

      if (existingEvent) {
        // Update existing event
        await ctx.db.patch(existingEvent._id, {
          title: eventData.title,
          description: eventData.description,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          isAllDay: eventData.isAllDay,
          lastModified: Date.now(),
        });
      } else {
        // Create new event
        await ctx.db.insert("events", {
          userId: account.userId,
          calendarAccountId: args.accountId,
          externalEventId: eventData.externalEventId,
          title: eventData.title,
          description: eventData.description,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          isAllDay: eventData.isAllDay,
          lastModified: Date.now(),
          isDeleted: false,
        });
      }
    }

    // Mark events that no longer exist as deleted
    const newEventIds = new Set(args.events.map((event) => event.externalEventId));
    for (const existingEvent of existingEvents) {
      if (!newEventIds.has(existingEvent.externalEventId)) {
        await ctx.db.patch(existingEvent._id, { isDeleted: true });
      }
    }

    // Update last sync timestamp
    await ctx.db.patch(args.accountId, {
      lastSync: Date.now(),
    });
  },
});

// Get sync status
export const getSyncStatus = query({
  args: {
    accountId: v.id("calendarAccounts"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== userId) {
      return null;
    }

    return {
      lastSync: account.lastSync,
      isActive: account.isActive,
      provider: account.provider,
      email: account.email,
    };
  },
}); 