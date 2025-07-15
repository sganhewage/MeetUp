"use client";

import { useState } from "react";
import { api } from "@packages/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const GroupDashboard = ({ userId }: { userId: string }) => {
  // Fetch groups for the user
  const groups = useQuery(api.groups.listUserGroups, { userId });
  const createGroup = useMutation(api.groups.createGroup);

  // Modal/form state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [creating, setCreating] = useState(false);

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
        <div className="w-full max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">Your Groups</h2>
          {groups === undefined ? (
            <div>Loading...</div>
          ) : groups.length === 0 ? (
            <div className="text-gray-500">You are not a member of any groups yet.</div>
          ) : (
            <ul className="space-y-4">
              {groups.map(group => (
                <li key={group._id} className="bg-white border rounded-lg shadow p-4 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{group.name}</span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      group.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {group.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                  {group.description && <span className="text-gray-600">{group.description}</span>}
                  <span className="text-xs text-gray-400 mt-1">Created by: {group.createdBy}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDashboard; 