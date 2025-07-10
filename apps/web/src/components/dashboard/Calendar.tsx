"use client";

import { useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format }from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../app/calendar.css';

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

interface CalendarProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Calendar({ events, onEventClick }: CalendarProps) {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [date, setDate] = useState(new Date());

  // Convert events to react-big-calendar format
  const calendarEvents = events.map(event => ({
    id: event._id,
    title: event.title,
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    allDay: event.isAllDay,
    resource: event, // Store the original event data
  }));

  console.log('Calendar events:', calendarEvents);
  console.log('Calendar component rendered');
  console.log('Current view:', view);
  console.log('Current date:', date);

  const eventStyleGetter = (event: any) => {
    const originalEvent = event.resource as Event;
    let backgroundColor = '#3B82F6'; // Default blue
    
    if (originalEvent.calendarAccount?.provider === 'google') {
      backgroundColor = '#EF4444'; // Red for Google
    } else if (originalEvent.calendarAccount?.provider === 'outlook') {
      backgroundColor = '#3B82F6'; // Blue for Outlook
    } else if (originalEvent.calendarAccount?.provider === 'apple') {
      backgroundColor = '#6B7280'; // Gray for Apple
    } else {
      backgroundColor = '#10B981'; // Green for manual events
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
      }
    };
  };

  const handleEventClick = (event: any) => {
    if (onEventClick && event.resource) {
      onEventClick(event.resource);
    }
  };

  return (
    <div className="h-full" style={{ position: 'relative' }}>
      <BigCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%', minHeight: '400px' }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleEventClick}
        views={['month', 'week', 'day']}
        view={view}
        date={date}
        onNavigate={(newDate) => {
          console.log('Calendar navigation:', { newDate });
          setDate(newDate);
        }}
        onView={(newView) => {
          console.log('Calendar view changed:', newView);
          if (newView === 'month' || newView === 'week' || newView === 'day') {
            setView(newView);
          }
        }}
        popup
        selectable
        step={60}
        timeslots={1}
        className="text-sm"
        messages={{
          next: "Next",
          previous: "Previous",
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
          noEventsInRange: "No events in this range.",
        }}
        components={{
          toolbar: (props) => {
            console.log('Toolbar props:', props);
            return (
              <div className="rbc-toolbar">
                <span className="rbc-btn-group">
                  <button type="button" onClick={() => props.onNavigate('PREV')}>
                    Previous
                  </button>
                  <button type="button" onClick={() => props.onNavigate('TODAY')}>
                    Today
                  </button>
                  <button type="button" onClick={() => props.onNavigate('NEXT')}>
                    Next
                  </button>
                </span>
                <span className="rbc-toolbar-label">{props.label}</span>
                <span className="rbc-btn-group">
                  <button type="button" onClick={() => props.onView('month')}>
                    Month
                  </button>
                  <button type="button" onClick={() => props.onView('week')}>
                    Week
                  </button>
                  <button type="button" onClick={() => props.onView('day')}>
                    Day
                  </button>
                </span>
              </div>
            );
          }
        }}
      />
    </div>
  );
} 