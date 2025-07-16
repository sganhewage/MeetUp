"use client";
import { SignUp } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

export default function SignUpPage() {
  const { user, isSignedIn } = useUser();
  const createUser = useMutation(api.users.createUser);
  // Query for existing user in Convex by email
  const existingUser = useQuery(api.users.getUserByEmail, { email: user?.primaryEmailAddress?.emailAddress || "" });

  useEffect(() => {
    if (!isSignedIn || !user) return;
    if (existingUser === undefined) return; // still loading
    if (existingUser) return; // already exists
    // Create user in Convex
    const clerkUserId = user.id;
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
    const signupDate = Date.now();
    createUser({ clerkUserId, firstName, lastName, email, signupDate });
  }, [isSignedIn, user, existingUser, createUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EDEDED]">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </div>
  );
} 