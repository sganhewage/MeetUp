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

  const formatDate = (dateStr: string, isAllDay: boolean = false) => {
    if (!dateStr) return '';
    if (isAllDay && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  };

  // For all-day events, get the display end date (endTime - 1 day)
  const getAllDayEndDate = (start: string, end: string) => {
    if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return '';
    const [ey, em, ed] = end.split('-');
    const endDate = new Date(Number(ey), Number(em) - 1, Number(ed));
    endDate.setDate(endDate.getDate() - 1);
    return endDate;
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

          {/* Event Date/Time */}
          <div className="flex items-center space-x-2 mt-4">
            <span className="font-medium text-gray-700">When:</span>
            {event.isAllDay ? (
              (() => {
                const start = event.startTime;
                const end = event.endTime;
                const displayEnd = getAllDayEndDate(start, end);
                if (displayEnd && start !== end) {
                  return (
                    <span className="text-gray-900">
                      All day: {formatDate(start, true)} - {formatDate(displayEnd.toISOString().slice(0, 10), true)}
                    </span>
                  );
                } else {
                  return (
                    <span className="text-gray-900">All day on {formatDate(start, true)}</span>
                  );
                }
              })()
            ) : (
              <span className="text-gray-900">
                {formatDate(event.startTime)}
                {" "}
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </span>
            )}
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