"use client";

import Header from "@/components/Header";
import GroupDashboard from "@/components/dashboard/GroupDashboard";
import { useUser } from "@clerk/clerk-react";

export default function GroupsPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!user) return null; // Middleware will redirect

  return (
    <main className="bg-[#EDEDED] min-h-screen">
      <Header />
      <GroupDashboard userId={user.id} />
    </main>
  );
} 