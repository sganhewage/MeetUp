import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Auth } from "convex/server";

export const getUserId = async (ctx: { auth: Auth }) => {
  return (await ctx.auth.getUserIdentity())?.subject;
};

// Get all events for a user
export const getUserEvents = query({
  args: {
    startDate: v.optional(v.string()), // ISO string
    endDate: v.optional(v.string()), // ISO string
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    let eventsQuery = ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("isDeleted"), false));

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      const startDate = args.startDate;
      const endDate = args.endDate;
      eventsQuery = eventsQuery.filter((q) =>
        q.or(
          // Event starts within range
          q.and(
            q.gte(q.field("startTime"), startDate),
            q.lte(q.field("startTime"), endDate)
          ),
          // Event ends within range
          q.and(
            q.gte(q.field("endTime"), startDate),
            q.lte(q.field("endTime"), endDate)
          ),
          // Event spans across range
          q.and(
            q.lte(q.field("startTime"), startDate),
            q.gte(q.field("endTime"), endDate)
          )
        )
      );
    }

    const events = await eventsQuery.collect();

    // Get calendar account details for each event
    const eventsWithAccounts = await Promise.all(
      events.map(async (event) => {
        let calendarAccount = null;
        if (event.calendarAccountId) {
          const account = await ctx.db.get(event.calendarAccountId as any);
          if (account && 'provider' in account) {
            calendarAccount = {
              _id: account._id,
              provider: (account as any).provider,
              email: (account as any).email,
              isActive: (account as any).isActive
            };
          }
        }
        return {
          ...event,
          calendarAccount,
        };
      })
    );

    return eventsWithAccounts;
  },
});

// Get a specific event
export const getEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const account = event.calendarAccountId ? await ctx.db.get(event.calendarAccountId as any) : null;
    return {
      ...event,
      calendarAccount: account,
    };
  },
});

// Create a new calendar account connection
export const createCalendarAccount = mutation({
  args: {
    provider: v.string(),
    accountId: v.string(),
    email: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const accountId = await ctx.db.insert("calendarAccounts", {
      userId,
      provider: args.provider,
      accountId: args.accountId,
      email: args.email,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      isActive: true,
      lastSync: Date.now(),
    });

    return accountId;
  },
});

// Update calendar account
export const updateCalendarAccount = mutation({
  args: {
    accountId: v.id("calendarAccounts"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    await ctx.db.patch(args.accountId, {
      isActive: args.isActive,
      lastSync: Date.now(),
    });
  },
});

// Delete calendar account and all associated events
export const deleteCalendarAccount = mutation({
  args: {
    accountId: v.id("calendarAccounts"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    // Soft delete all events from this account
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("calendarAccountId"), args.accountId))
      .collect();

    for (const event of events) {
      await ctx.db.patch(event._id, { isDeleted: true });
    }

    // Delete the account
    await ctx.db.delete(args.accountId);
  },
});

// Sync events from external calendar
export const syncEvents = mutation({
  args: {
    calendarAccountId: v.id("calendarAccounts"),
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
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const account = await ctx.db.get(args.calendarAccountId);
    if (!account || account.userId !== userId) {
      throw new Error("Account not found or access denied");
    }

    // Get existing events for this account
    const existingEvents = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("calendarAccountId"), args.calendarAccountId))
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
          userId,
          calendarAccountId: args.calendarAccountId,
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
    await ctx.db.patch(args.calendarAccountId, {
      lastSync: Date.now(),
    });
  },
});

// Get user's calendar accounts
export const getCalendarAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const accounts = await ctx.db
      .query("calendarAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    return accounts;
  },
});

// Create a new event
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    location: v.optional(v.string()),
    isAllDay: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    // For now, create events without a calendar account (manual events)
    // Later, we can add logic to assign to a specific calendar
    const eventId = await ctx.db.insert("events", {
      userId,
      calendarAccountId: undefined, // Manual event
      externalEventId: `manual_${Date.now()}`, // Generate unique ID
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      isAllDay: args.isAllDay,
      lastModified: Date.now(),
      isDeleted: false,
    });

    return eventId;
  },
});

// Delete an event
export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== userId) {
      throw new Error("Event not found or access denied");
    }

    // Soft delete the event
    await ctx.db.patch(args.eventId, { isDeleted: true });
  },
});

// Update an event
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    location: v.optional(v.string()),
    isAllDay: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== userId) {
      throw new Error("Event not found or access denied");
    }

    await ctx.db.patch(args.eventId, {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      isAllDay: args.isAllDay,
      lastModified: Date.now(),
    });
  },
});

// Get all events for a set of users (for group preview calendar)
export const getEventsForUsers = query({
  args: {
    userIds: v.array(v.string()),
    startDate: v.optional(v.string()), // ISO string
    endDate: v.optional(v.string()), // ISO string
  },
  handler: async (ctx, args) => {
    if (!args.userIds || args.userIds.length === 0) return [];
    // Convex does not support q.in; filter in-memory for small groups
    let events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();
    events = events.filter(event => args.userIds.includes(event.userId));

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      const startDate = args.startDate;
      const endDate = args.endDate;
      events = events.filter(event => {
        // Event starts within range
        const startsInRange = event.startTime >= startDate && event.startTime <= endDate;
        // Event ends within range
        const endsInRange = event.endTime >= startDate && event.endTime <= endDate;
        // Event spans across range
        const spansRange = event.startTime <= startDate && event.endTime >= endDate;
        return startsInRange || endsInRange || spansRange;
      });
    }

    // Get calendar account details for each event
    const eventsWithAccounts = await Promise.all(
      events.map(async (event) => {
        let calendarAccount = null;
        if (event.calendarAccountId) {
          const account = await ctx.db.get(event.calendarAccountId as any);
          if (account && 'provider' in account) {
            calendarAccount = {
              _id: account._id,
              provider: (account as any).provider,
              email: (account as any).email,
              isActive: (account as any).isActive
            };
          }
        }
        return {
          ...event,
          calendarAccount,
        };
      })
    );

    return eventsWithAccounts;
  },
}); 