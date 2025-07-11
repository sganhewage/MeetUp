"use client";

import { useState, MouseEvent } from "react";
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
  onEventDelete?: (event: Event) => void;
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

// Custom event wrapper for right-click context menu
const EventWrapper = ({ children, event, onContextMenu }: any) => {
  return (
    <div
      onContextMenu={e => {
        if (onContextMenu) onContextMenu(event, e);
      }}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </div>
  );
};

export default function Calendar({ events, onEventClick, onEventDelete }: CalendarProps) {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [date, setDate] = useState(new Date());
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    event: any | null;
  }>({ visible: false, x: 0, y: 0, event: null });

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

  const handleEventRightClick = (eventObj: any, e: MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      event: eventObj.resource,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, event: null });
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
        onDoubleClickEvent={handleEventClick}
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
          },
          eventWrapper: (props: any) => (
            <EventWrapper {...props} onContextMenu={handleEventRightClick} />
          ),
        }}
      />
      {contextMenu.visible && contextMenu.event && (
        <div
          className="fixed z-50 bg-white border rounded shadow-lg py-1 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x, minWidth: 120 }}
          onClick={handleCloseContextMenu}
          onContextMenu={e => e.preventDefault()}
        >
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={e => {
              e.stopPropagation();
              handleCloseContextMenu();
              if (onEventClick) onEventClick(contextMenu.event);
            }}
          >Edit</button>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
            onClick={e => {
              e.stopPropagation();
              handleCloseContextMenu();
              if (onEventDelete) onEventDelete(contextMenu.event);
            }}
          >Delete</button>
        </div>
      )}
      {/* Close context menu on click outside */}
      {contextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleCloseContextMenu}
          onContextMenu={handleCloseContextMenu}
        />
      )}
    </div>
  );
} 