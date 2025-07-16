import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new group and add the creator as admin
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // user id
  },
  returns: v.id("groups"),
  handler: async (ctx, args) => {
    const now = Date.now();
    // Create the group
    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      createdBy: args.createdBy,
      createdAt: now,
    });
    // Add the creator as admin
    await ctx.db.insert("group_memberships", {
      groupId,
      userId: args.createdBy,
      role: "admin",
      joinedAt: now,
    });
    return groupId;
  },
});

// Add a user to a group
export const addGroupMember = mutation({
  args: {
    groupId: v.id("groups"),
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if already a member
    const existing = await ctx.db
      .query("group_memberships")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();
    if (existing) return null;
    await ctx.db.insert("group_memberships", {
      groupId: args.groupId,
      userId: args.userId,
      role: args.role,
      joinedAt: Date.now(),
    });
    return null;
  },
});

// Remove a user from a group
export const removeGroupMember = mutation({
  args: {
    groupId: v.id("groups"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the membership
    const membership = await ctx.db
      .query("group_memberships")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();
    if (membership) {
      await ctx.db.delete(membership._id);
    }
    return null;
  },
});

// List all groups a user belongs to
export const listUserGroups = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("groups"),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    _creationTime: v.number(),
    role: v.union(v.literal("admin"), v.literal("member")), // Add this
  })),
  handler: async (ctx, args) => {
    // Find all memberships for the user
    const memberships = await ctx.db
      .query("group_memberships")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    if (memberships.length === 0) return [];
    // Fetch all groups and merge with role
    const groups = await Promise.all(
      memberships.map(async (m) => {
        const group = await ctx.db.get(m.groupId);
        if (!group) return null;
        return { ...group, role: m.role };
      })
    );
    return groups.filter((g): g is NonNullable<typeof g> => Boolean(g));
  },
});

// List all members in a group
export const listGroupMembers = query({
  args: {
    groupId: v.id("groups"),
  },
  returns: v.array(v.object({
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("group_memberships")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();
    return members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  },
});

// Delete a group and its memberships (and group events)
export const deleteGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete all memberships
    const memberships = await ctx.db
      .query("group_memberships")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();
    for (const m of memberships) {
      await ctx.db.delete(m._id);
    }
    // Delete all group events
    const events = await ctx.db
      .query("group_events")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();
    for (const e of events) {
      await ctx.db.delete(e._id);
    }
    // Delete the group
    await ctx.db.delete(args.groupId);
    return null;
  },
});

// Update group name/description
export const updateGroup = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, any> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.groupId, patch);
    }
    return null;
  },
});

// Invite a user to a group by email
export const inviteToGroup = mutation({
  args: {
    groupId: v.id("groups"),
    email: v.string(),
    invitedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    // Check if invite already exists and is pending
    const existing = await ctx.db
      .query("group_invites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    if (existing.some(invite => invite.groupId === args.groupId && invite.status === "pending")) {
      return null;
    }
    await ctx.db.insert("group_invites", {
      groupId: args.groupId,
      email: args.email,
      invitedBy: args.invitedBy,
      status: "pending",
      createdAt: now,
    });
    return null;
  },
});

// List all pending invites for a user by email
export const listUserInvites = query({
  args: {
    email: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("group_invites"),
    groupId: v.id("groups"),
    email: v.string(),
    invitedBy: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("group_invites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    return invites.filter(invite => invite.status === "pending");
  },
});

// Accept a group invite
export const acceptInvite = mutation({
  args: {
    inviteId: v.id("group_invites"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.status !== "pending") return null;
    // Add user to group as member
    await ctx.db.insert("group_memberships", {
      groupId: invite.groupId,
      userId: args.userId,
      role: "member",
      joinedAt: Date.now(),
    });
    // Mark invite as accepted
    await ctx.db.patch(args.inviteId, { status: "accepted" });
    return null;
  },
});

// Decline a group invite
export const declineInvite = mutation({
  args: {
    inviteId: v.id("group_invites"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.inviteId, { status: "declined" });
    return null;
  },
});

export const getGroupById = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.groupId);
  },
}); 