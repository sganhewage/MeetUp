"use client";

import { useState, useEffect } from "react";
import { api } from "@packages/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

const EditEventModal = ({ isOpen, onClose, event }: EditEventModalProps) => {
  const updateEvent = useMutation(api.events.updateEvent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [location, setLocation] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);

  // Helper to parse YYYY-MM-DD as local date
  function parseLocalDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  // Initialize form when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      if (event.isAllDay) {
        setStartTime(parseLocalDate(event.startTime));
        // For the end date, subtract one day for the inclusive range
        const end = parseLocalDate(event.endTime);
        end.setDate(end.getDate() - 1);
        setEndTime(end);
      } else {
        setStartTime(new Date(event.startTime));
        setEndTime(new Date(event.endTime));
      }
      setLocation(event.location || "");
      setIsAllDay(event.isAllDay);
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event || !startTime || !endTime) return;

    // Adjust for all-day and multi-day events (same as CreateEventModal)
    let adjustedStart = new Date(startTime);
    let adjustedEnd = new Date(endTime);
    if (isAllDay) {
      adjustedStart.setHours(0, 0, 0, 0);
      adjustedEnd.setHours(0, 0, 0, 0);
      // Always add 1 day to the end date for all-day events (exclusive end)
      adjustedEnd.setDate(adjustedEnd.getDate() + 1);
    } else {
      if (
        adjustedEnd.getHours() === 0 &&
        adjustedEnd.getMinutes() === 0 &&
        adjustedEnd.getSeconds() === 0 &&
        adjustedEnd.getMilliseconds() === 0 &&
        (adjustedEnd.getTime() - adjustedStart.getTime()) > 24 * 60 * 60 * 1000
      ) {
        adjustedEnd.setHours(23, 59, 59, 999);
      }
    }

    setIsSubmitting(true);
    try {
      await updateEvent({
        eventId: event._id as any,
        title,
        description: description || undefined,
        startTime: adjustedStart.toISOString(),
        endTime: adjustedEnd.toISOString(),
        location: location || undefined,
        isAllDay,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('Failed to update event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked && startTime && endTime) {
      // For all-day events, set time to start of day for start, and end of day for end
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      setStartTime(startDate);
      setEndTime(endDate);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event title"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allDay"
              checked={isAllDay}
              onChange={(e) => handleAllDayChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allDay" className="ml-2 block text-sm text-gray-700">
              All day event
            </label>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                Start {isAllDay ? 'Date' : 'Date & Time'} *
              </label>
              <DatePicker
                id="startTime"
                selected={startTime}
                onChange={(date) => setStartTime(date)}
                showTimeSelect={!isAllDay}
                dateFormat={isAllDay ? "yyyy-MM-dd" : "Pp"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholderText={isAllDay ? "Select date" : "Select date and time"}
                required
                popperPlacement="bottom-start"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                End {isAllDay ? 'Date' : 'Date & Time'} *
              </label>
              <DatePicker
                id="endTime"
                selected={endTime}
                onChange={(date) => setEndTime(date)}
                showTimeSelect={!isAllDay}
                dateFormat={isAllDay ? "yyyy-MM-dd" : "Pp"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholderText={isAllDay ? "Select date" : "Select date and time"}
                required
                minDate={startTime || undefined}
                popperPlacement="bottom-start"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event location"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event description"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEventModal; 