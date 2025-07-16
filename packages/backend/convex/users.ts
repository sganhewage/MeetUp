import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    if (!args.email) return null;
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

export const getUserEmailsByClerkIds = query({
  args: { clerkUserIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    if (!args.clerkUserIds.length) return {};
    const users = await Promise.all(
      args.clerkUserIds.map(id =>
        ctx.db.query("users").filter(q => q.eq(q.field("clerkUserId"), id)).first()
      )
    );
    return Object.fromEntries(
      users.map((u, i) => [
        args.clerkUserIds[i],
        u ? { name: `${u.firstName} ${u.lastName}`.trim(), email: u.email } : undefined
      ]).filter(([_, val]) => !!val)
    );
  },
});

export const createUser = mutation({
  args: {
    clerkUserId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    signupDate: v.number(), // timestamp
  },
  handler: async (ctx, args) => {
    // Optionally, check if user already exists by clerkUserId
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("users", args);
  },
}); 