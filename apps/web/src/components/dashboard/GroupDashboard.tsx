"use client";

import { api } from "@packages/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from "react";
import { useUser, useAuth, useClerk } from "@clerk/clerk-react";
import { useMemo, useState } from "react";

const MOCK_EMAIL = "user@example.com"; // TODO: Replace with real user email from auth

const GroupDashboard = ({ userId }: { userId: string }) => {
  // Fetch groups for the user
  const groups = useQuery(api.groups.listUserGroups, { userId });
  const createGroup = useMutation(api.groups.createGroup);

  // Invites
  const invites = useQuery(api.groups.listUserInvites, { email: MOCK_EMAIL });
  const acceptInvite = useMutation(api.groups.acceptInvite);
  const declineInvite = useMutation(api.groups.declineInvite);

  // State for mapping userId to email
  const clerk = useClerk();
  const [creatorEmails, setCreatorEmails] = useState<Record<string, string>>({});
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Fetch emails for all unique createdBy userIds
  useEffect(() => {
    if (!groups) return;
    const uniqueUserIds = Array.from(new Set(groups.map(g => g.createdBy)));
    if (uniqueUserIds.length === 0) return;
    setLoadingEmails(true);
    Promise.all(
      uniqueUserIds.map(async (userId) => {
        try {
          const user = await clerk.users.getUser(userId);
          return [userId, user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || userId];
        } catch {
          return [userId, userId];
        }
      })
    ).then(results => {
      setCreatorEmails(Object.fromEntries(results));
      setLoadingEmails(false);
    });
  }, [groups, clerk]);

  // Modal/form state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    setCreating(true);
    try {
      await createGroup({
        name: groupName,
        description: groupDescription || undefined,
        createdBy: userId,
      });
      toast.success("Group created!");
      setGroupName("");
      setGroupDescription("");
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    setRespondingInviteId(inviteId);
    try {
      await acceptInvite({ inviteId: inviteId as any, userId });
      toast.success("Joined group!");
    } catch {
      toast.error("Failed to accept invite");
    } finally {
      setRespondingInviteId(null);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    setRespondingInviteId(inviteId);
    try {
      await declineInvite({ inviteId: inviteId as any });
      toast.info("Invite declined");
    } catch {
      toast.error("Failed to decline invite");
    } finally {
      setRespondingInviteId(null);
    }
  };

  return (
    <div className="container dashboard-content flex flex-col pb-10">
      <ToastContainer />
      <h1 className="text-[#2D2D2D] text-center text-[20px] sm:text-[43px] not-italic font-normal sm:font-medium leading-[114.3%] tracking-[-1.075px] sm:mt-8 my-4 sm:mb-10">
        Group Dashboard
      </h1>
      <div className="flex flex-col items-center">
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg mb-6 hover:bg-blue-700 transition"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Create New Group
        </button>
        {isCreateModalOpen && (
          <form
            className="bg-white border rounded-lg shadow-lg p-6 mb-6 w-full max-w-md flex flex-col gap-4"
            onSubmit={handleCreateGroup}
          >
            <h2 className="text-xl font-semibold mb-2">Create Group</h2>
            <input
              type="text"
              className="border rounded px-3 py-2"
              placeholder="Group Name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              required
            />
            <textarea
              className="border rounded px-3 py-2"
              placeholder="Description (optional)"
              value={groupDescription}
              onChange={e => setGroupDescription(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded border"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                disabled={creating}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        )}
        <div className="flex flex-col sm:flex-row items-start w-full max-w-4xl gap-8">
          {/* Groups Section */}
          <div className="w-full sm:w-2/3">
            <h2 className="text-2xl font-semibold mb-4">Your Groups</h2>
            {groups === undefined ? (
              <div>Loading...</div>
            ) : groups.length === 0 ? (
              <div className="text-gray-500">You are not a member of any groups yet.</div>
            ) : (
              <ul className="space-y-4">
                {groups.map(group => (
                  <li key={group._id} className="bg-white border rounded-lg shadow p-4 flex flex-row items-center">
                    <div className="flex flex-col flex-1 gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{group.name}</span>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          group.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {group.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      {group.description && <span className="text-gray-600">{group.description}</span>}
                      <span className="text-xs text-gray-400">
                        Created by: {loadingEmails ? "Loading..." : (creatorEmails[group.createdBy] || group.createdBy)}
                      </span>
                    </div>
                    <a
                      href={`/groups/${group._id}`}
                      className="ml-4 h-full flex items-center font-bold bg-blue-500 hover:bg-blue-600 text-white text-md px-5 py-3 rounded transition self-stretch"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Invites Section */}
          <div className="w-full sm:w-1/3">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Pending Invites</h2>
              {invites === undefined ? (
                <div>Loading...</div>
              ) : invites.length === 0 ? (
                <div className="text-gray-500">No pending invites.</div>
              ) : (
                <ul className="space-y-3">
                  {invites.map(invite => (
                    <li key={invite._id} className="bg-yellow-50 border border-yellow-200 rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="font-bold">Group ID:</span> {invite.groupId}
                        <span className="ml-4 text-xs text-gray-500">Invited by: {invite.invitedBy}</span>
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <button
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded text-xs"
                          onClick={() => handleAcceptInvite(invite._id)}
                          disabled={respondingInviteId === invite._id}
                        >
                          {respondingInviteId === invite._id ? "Joining..." : "Accept"}
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-xs"
                          onClick={() => handleDeclineInvite(invite._id)}
                          disabled={respondingInviteId === invite._id}
                        >
                          {respondingInviteId === invite._id ? "Declining..." : "Decline"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDashboard; 