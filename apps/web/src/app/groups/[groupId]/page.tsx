"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useState } from "react";
import Header from "@/components/Header";

export default function GroupManagementPage() {
  const params = useParams();
  const groupId = params?.groupId as string;
  // TODO: Replace with real user ID from auth context
  const userId = "mock-user-id";

  // Fetch group details and members
  const group = useQuery(api.groups.listUserGroups, { userId })?.find(g => g._id === groupId as any);
  const members = useQuery(api.groups.listGroupMembers, { groupId: groupId as any });
  const deleteGroup = useMutation(api.groups.deleteGroup);
  // Placeholder for leave/invite/remove actions
  const [inviteEmail, setInviteEmail] = useState("");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const isAdmin = group?.role === "admin";

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This cannot be undone.")) return;
    await deleteGroup({ groupId: groupId as any });
    window.location.href = "/groups";
  };

  const handleLeaveGroup = () => {
    // TODO: Implement leave group logic
    alert("Leave group functionality not implemented yet.");
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement invite logic
    alert(`Invite sent to ${inviteEmail} (not implemented)`);
    setInviteEmail("");
  };

  const handleRemoveMember = (userId: string) => {
    // TODO: Implement remove member logic
    setRemovingUserId(userId);
    alert(`Remove member ${userId} (not implemented)`);
    setRemovingUserId(null);
  };

  if (!group) {
    return <div className="container mx-auto py-10">Loading group...</div>;
  }

  return (
    <main className="bg-[#EDEDED] min-h-screen">
      <Header />
      <div className="container mx-auto max-w-3xl py-10">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-2">{group.name}</h1>
          {group.description && <p className="text-gray-600 mb-2 text-lg">{group.description}</p>}
          <div className="mb-4 text-xs text-gray-400">Created by: {group.createdBy}</div>
          <div className="flex gap-2 mb-6">
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
              group.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {group.role === 'admin' ? 'Admin' : 'Member'}
            </span>
            <button
              className="ml-auto bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs px-3 py-1 rounded transition"
              onClick={handleLeaveGroup}
            >
              Leave Group
            </button>
            {isAdmin && (
              <button
                className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded transition"
                onClick={handleDeleteGroup}
              >
                Delete Group
              </button>
            )}
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-2">Members</h2>
            {members === undefined ? (
              <div>Loading members...</div>
            ) : (
              <ul className="space-y-2">
                {members.map(member => (
                  <li key={member.userId} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
                    <span className="flex-1">{member.userId}</span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      member.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                    {isAdmin && member.role !== 'admin' && (
                      <button
                        className="ml-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs px-2 py-1 rounded"
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={removingUserId === member.userId}
                      >
                        {removingUserId === member.userId ? 'Removing...' : 'Remove'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isAdmin && (
            <form onSubmit={handleInvite} className="flex gap-2 items-center mb-4">
              <input
                type="email"
                className="border rounded px-3 py-1 text-sm"
                placeholder="Invite by email (not implemented)"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded"
              >
                Invite
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
} 