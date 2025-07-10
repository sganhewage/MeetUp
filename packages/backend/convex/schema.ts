import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User's connected calendar accounts
  calendarAccounts: defineTable({
    userId: v.string(),
    provider: v.string(), // "google", "outlook", "apple"
    accountId: v.string(), // unique ID from the provider
    email: v.string(),
    accessToken: v.string(), // encrypted
    refreshToken: v.string(), // encrypted
    isActive: v.boolean(),
    lastSync: v.optional(v.number()), // timestamp
  }),

  // Events from connected calendars
  events: defineTable({
    userId: v.string(),
    calendarAccountId: v.id("calendarAccounts"),
    externalEventId: v.string(), // ID from the original calendar
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(), // ISO string
    endTime: v.string(), // ISO string
    location: v.optional(v.string()),
    isAllDay: v.boolean(),
    lastModified: v.number(), // timestamp
    isDeleted: v.boolean(), // soft delete for sync management
  }),
});
