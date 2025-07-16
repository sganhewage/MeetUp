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
    calendarAccountId: v.optional(v.id("calendarAccounts")), // Optional for manual events
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

  // Groups for collaborative scheduling
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // user id
    createdAt: v.number(), // timestamp
  }),

  // Memberships linking users to groups
  group_memberships: defineTable({
    groupId: v.id("groups"),
    userId: v.string(), // user id
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_userId", ["userId"]) // for listUserGroups
    .index("by_groupId", ["groupId"]), // for listGroupMembers and deleteGroup

  // Optional: Shared group events
  group_events: defineTable({
    groupId: v.id("groups"),
    eventId: v.id("events"),
    createdAt: v.number(),
  })
    .index("by_groupId", ["groupId"]),

  // Group invites for inviting users by email
  group_invites: defineTable({
    groupId: v.id("groups"),
    email: v.string(),
    invitedBy: v.string(), // user id
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    createdAt: v.number(),
  })
    .index("by_email", ["email"]) // for listing invites by email
    .index("by_groupId", ["groupId"]), // for listing invites by group

  users: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    signupDate: v.number(), // timestamp
  }),
});
