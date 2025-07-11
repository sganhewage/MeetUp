"use client";

import { useState } from "react";
import { api } from "@packages/backend/convex/_generated/api";
import { useMutation } from "convex/react";

interface Event {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay: boolean;
  calendarAccount?: {
    _id: string;
    provider: string;
    email: string;
    isActive: boolean;
  } | null;
}

interface EventPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onEdit: (event: Event) => void;
}

const EventPreviewModal = ({ isOpen, onClose, event, onEdit }: EventPreviewModalProps) => {
  const deleteEvent = useMutation(api.events.deleteEvent);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !event) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // For all-day events, show the correct range (subtract one day from end)
  const getAllDayRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() - 1);
    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start);
    }
    return `${formatDate(start)} - ${formatDate(endDate.toISOString())}`;
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    setIsDeleting(true);
    try {
      await deleteEvent({ eventId: event._id as any });
      onClose();
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return "🔴";
      case "outlook":
        return "🔵";
      case "apple":
        return "⚫";
      default:
        return "📅";
    }
  };

  const getProviderName = (provider: string) => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Event Content */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">{event.title}</h3>
            {event.calendarAccount && (
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-1">{getProviderIcon(event.calendarAccount.provider)}</span>
                <span>{getProviderName(event.calendarAccount.provider)} Calendar</span>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <div className="text-gray-400 mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-sm text-gray-700">
                {event.isAllDay ? (
                  <div>
                    <div className="font-medium">All Day</div>
                    <div>{getAllDayRange(event.startTime, event.endTime)}</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">{formatDateTime(event.startTime)}</div>
                    <div className="text-gray-500">
                      {formatDateTime(event.startTime)}<br/>to<br/>{formatDateTime(event.endTime)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start space-x-3">
                <div className="text-gray-400 mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">Location</div>
                  <div>{event.location}</div>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="flex items-start space-x-3">
                <div className="text-gray-400 mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">Description</div>
                  <div className="whitespace-pre-wrap">{event.description}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
          <button
            onClick={() => onEdit(event)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventPreviewModal; 