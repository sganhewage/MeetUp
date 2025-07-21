"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useState } from "react";
import Header from "@/components/Header";
import { useUser } from "@clerk/clerk-react";
import { Id } from "@packages/backend/convex/_generated/dataModel";
import Calendar from "@/components/dashboard/Calendar";

export default function GroupManagementPage() {
  const params = useParams();
  const groupId = params?.groupId as Id<"groups">;
  const { user, isLoaded } = useUser();

  // Fetch group directly from DB
  const group = useQuery(api.groups.getGroupById, { groupId });
  const members = useQuery(api.groups.listGroupMembers, { groupId });
  // Fetch member names from users table using Clerk user IDs
  const memberUserIds = members ? members.map(m => m.userId) : [];
  const memberInfo = useQuery(api.users.getUserEmailsByClerkIds, { clerkUserIds: memberUserIds });
  const groupEvents = useQuery(api.events.getEventsForUsers, { userIds: memberUserIds });

  // Assign a color to each user
  const colorPalette = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E42', // orange
    '#A78BFA', // purple
    '#FBBF24', // yellow
    '#6366F1', // indigo
    '#EC4899', // pink
    '#6B7280', // gray
    '#22D3EE', // cyan
  ];
  const userIdToColor = Object.fromEntries(
    memberUserIds.map((id, idx) => [id, colorPalette[idx % colorPalette.length]])
  );
  const deleteGroup = useMutation(api.groups.deleteGroup);
  const inviteToGroup = useMutation(api.groups.inviteToGroup);
  const [inviting, setInviting] = useState(false);
  // Placeholder for leave/invite/remove actions
  const [inviteEmail, setInviteEmail] = useState("");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const isAdmin = group && user && group.createdBy === user.id;

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This cannot be undone.")) return;
    await deleteGroup({ groupId: groupId as any });
    window.location.href = "/groups";
  };

  const handleLeaveGroup = () => {
    // TODO: Implement leave group logic
    alert("Leave group functionality not implemented yet.");
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await inviteToGroup({ groupId, email: inviteEmail, invitedBy: user?.id || '' });
      alert(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch {
      alert("Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (userId: string) => {
    // TODO: Implement remove member logic
    setRemovingUserId(userId);
    alert(`Remove member ${userId} (not implemented)`);
    setRemovingUserId(null);
  };

  if (!isLoaded) return <div className="container mx-auto py-10">Loading user...</div>;
  if (!group) {
    return <div className="container mx-auto py-10">Loading group...</div>;
  }

  return (
    <main className="bg-[#EDEDED] min-h-screen">
      <Header />
      <div className="w-full px-2 sm:px-6 lg:px-10 xl:px-20 max-w-none py-10 mx-auto">
        <div className="flex flex-row gap-8">
          {/* Left: Calendar Preview */}
          <div className="flex-1 bg-white rounded-lg shadow-lg p-6 min-w-0">
            {/* Group Info Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-0 truncate">{group.name}</h1>
              {group.description && (
                <span className="text-gray-600 text-base sm:text-lg truncate">{group.description}</span>
              )}
              <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">Created by: {group.createdBy}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 mt-4">Group Availability Preview</h2>
            <div className="min-h-[400px]">
              {groupEvents === undefined ? (
                <div>Loading calendar...</div>
              ) : (
                <Calendar
                  events={groupEvents.map(e => ({
                    ...e,
                    title: "Busy",
                    description: undefined,
                    location: undefined,
                    userColor: userIdToColor[e.userId] || '#3B82F6',
                  }))}
                  onEventClick={undefined}
                  onEventDelete={undefined}
                />
              )}
            </div>
          </div>
          {/* Right: Members and Invites */}
          <div className="w-full max-w-xs flex-shrink-0 bg-white rounded-lg shadow-lg p-6">
            <div className="flex gap-2 mb-4">
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                isAdmin ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isAdmin ? 'Admin' : 'Member'}
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
            <h2 className="text-xl font-semibold mb-2">Members</h2>
            {members === undefined ? (
              <div>Loading members...</div>
            ) : (
              <ul className="space-y-2 mb-4">
                {members.map(member => (
                  <li key={member.userId} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
                    {/* Color swatch for calendar color */}
                    <span
                      className="inline-block w-3 h-3 rounded-full mr-2 border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: userIdToColor[member.userId] || '#3B82F6' }}
                      title="Calendar color"
                    />
                    <span className="flex-1 truncate">{memberInfo?.[member.userId]?.name || memberInfo?.[member.userId]?.email || member.userId}</span>
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
            {isAdmin && (
              <form onSubmit={handleInvite} className="flex gap-2 items-center mb-2">
                <input
                  type="email"
                  className="border rounded px-3 py-1 text-sm flex-1"
                  placeholder="Invite by email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  disabled={inviting}
                />
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded"
                  disabled={inviting}
                >
                  {inviting ? "Inviting..." : "Invite"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 