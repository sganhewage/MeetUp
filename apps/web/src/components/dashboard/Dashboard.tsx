"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "@packages/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import AddAccountModal from "./AddAccountModal";
import CreateEventModal from "./CreateEventModal";
import Calendar from "./Calendar";

interface SyncedAccount {
  id: string;
  name: string;
  type: "google" | "outlook" | "apple" | "other";
  isConnected: boolean;
  email?: string;
}

const Dashboard = () => {
  // Fetch real data from backend
  const calendarAccounts = useQuery(api.events.getCalendarAccounts);
  const userEvents = useQuery(api.events.getUserEvents, {});
  
  const updateAccount = useMutation(api.events.updateCalendarAccount);
  const deleteAccount = useMutation(api.events.deleteCalendarAccount);

  // Convert backend data to frontend format
  const syncedAccounts: SyncedAccount[] = calendarAccounts?.map(account => ({
    id: account._id,
    name: `${account.provider.charAt(0).toUpperCase() + account.provider.slice(1)} Calendar`,
    type: account.provider as "google" | "outlook" | "apple" | "other",
    isConnected: account.isActive,
    email: account.email
  })) || [];

  // Loading states
  const isLoading = calendarAccounts === undefined || userEvents === undefined;
  
  // Modal state
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);

  const toggleAccount = async (accountId: string) => {
    const account = syncedAccounts.find(acc => acc.id === accountId);
    if (account) {
      try {
        await updateAccount({
          accountId: accountId as any, // Type assertion needed for Convex ID
          isActive: !account.isConnected
        });
      } catch (error) {
        console.error("Failed to update account:", error);
      }
    }
  };

  const handleAddAccount = (provider: string) => {
    // For now, just log the provider. Later this will trigger OAuth flow
    console.log("Adding account for provider:", provider);
    // TODO: Implement OAuth flow for the selected provider
    alert(`OAuth flow for ${provider} will be implemented next!`);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "google":
        return "/images/google.png";
      case "outlook":
        return "/images/monitor.png"; // Using monitor as placeholder for Outlook
      case "apple":
        return "/images/profile.png"; // Using profile as placeholder for Apple
      default:
        return "/images/profile.png";
    }
  };

  const getAccountColor = (type: string) => {
    switch (type) {
      case "google":
        return "bg-red-100 border-red-300";
      case "outlook":
        return "bg-blue-100 border-blue-300";
      case "apple":
        return "bg-gray-100 border-gray-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  return (
    <div className="container pb-10">
      <h1 className="text-[#2D2D2D] text-center text-[20px] sm:text-[43px] not-italic font-normal sm:font-medium leading-[114.3%] tracking-[-1.075px] sm:mt-8 my-4 sm:mb-10">
        Calendar Dashboard
      </h1>
      
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-5 sm:px-0">
            {/* Calendar Section */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-[#2D2D2D] text-xl sm:text-2xl font-semibold mb-4">
                Calendar
              </h2>
              <div className="h-96">
                {userEvents && userEvents.length > 0 ? (
                  <Calendar 
                    events={userEvents} 
                    onEventClick={(event) => {
                      console.log("Event clicked:", event);
                      // TODO: Open event details modal
                    }}
                  />
                ) : (
                  <div className="text-center text-gray-500 h-full flex items-center justify-center">
                    <div>
                      <div className="text-4xl mb-2">📅</div>
                      <p className="text-sm">No events found</p>
                      <p className="text-xs mt-1">Connect a calendar or create events to see them here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Synced Accounts Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#2D2D2D] text-xl sm:text-2xl font-semibold">
                  Synced Accounts
                </h2>
                <button 
                  onClick={() => setIsAddAccountModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  + Add Account
                </button>
              </div>
              
              <div className="space-y-3">
                {syncedAccounts.length > 0 ? (
                  syncedAccounts.map((account) => (
                    <div 
                      key={account.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${getAccountColor(account.type)}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Image
                          src={getAccountIcon(account.type)}
                          width={24}
                          height={24}
                          alt={account.name}
                          className="w-6 h-6"
                        />
                        <div>
                          <p className="font-medium text-sm">{account.name}</p>
                          {account.email && (
                            <p className="text-xs text-gray-600">{account.email}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          account.isConnected 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {account.isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                        
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={account.isConnected}
                            onChange={() => toggleAccount(account.id)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-2xl mb-2">🔗</div>
                    <p className="text-sm">No calendar accounts connected</p>
                    <p className="text-xs mt-1">Click "Add Account" to get started</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Connect multiple calendars to get better availability suggestions for your meetings.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="mt-8 px-5 sm:px-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-[#2D2D2D] text-xl sm:text-2xl font-semibold mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => setIsCreateEventModalOpen(true)}
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <span>📅</span>
                  <span>Create Event</span>
                </button>
                <button className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                  <span>👥</span>
                  <span>Invite Group</span>
                </button>
                <button className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors">
                  <span>🤖</span>
                  <span>AI Suggestions</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      <AddAccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onAddAccount={handleAddAccount}
      />
      
      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard; 