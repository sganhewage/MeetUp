import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Platform, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { WebView } from 'react-native-webview';

// Optionally configure locale
LocaleConfig.locales['en'] = LocaleConfig.locales[''];
LocaleConfig.defaultLocale = 'en';

const CalendarDashboardScreen = ({ navigation }) => {
  // Fetch events from backend
  const userEvents = useQuery(api.events.getUserEvents, {});
  const createEvent = useMutation(api.events.createEvent);

  // Synced accounts state
  const [refreshAccountsFlag, setRefreshAccountsFlag] = useState(0);
  const calendarAccounts = useQuery(api.events.getCalendarAccounts, {});
  const updateAccount = useMutation(api.events.updateCalendarAccount);
  const deleteAccount = useMutation(api.events.deleteCalendarAccount);
  const syncGoogleCalendar = useAction(api.googleCalendar.syncGoogleCalendar);
  const generateGoogleOAuthUrl = useAction(api.googleCalendar.generateGoogleOAuthUrl);

  // State for selected date and modal
  const [selectedDate, setSelectedDate] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Add account state
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const [isOauthWebviewOpen, setIsOauthWebviewOpen] = useState(false);
  const [loadingAccountId, setLoadingAccountId] = useState(null);

  // Event details modal state
  const [isEventListModalOpen, setIsEventListModalOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  // Convert events to marked dates
  const markedDates = {};
  if (userEvents) {
    userEvents.forEach(event => {
      const date = event.startTime.split('T')[0];
      markedDates[date] = {
        marked: true,
        dotColor: '#0D87E1',
      };
    });
  }
  if (selectedDate) {
    markedDates[selectedDate] = { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: '#0D87E1' };
  }

  // Handle event creation
  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return;
    await createEvent({
      title: newEvent.title,
      description: newEvent.description,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      isAllDay: newEvent.isAllDay,
    });
    setIsCreateModalOpen(false);
    setNewEvent({ title: '', description: '', startTime: '', endTime: '', isAllDay: false });
  };

  // Add account handler (Google only for now)
  const handleAddAccount = async (provider) => {
    if (provider === 'google') {
      setIsAddAccountModalOpen(false);
      setLoadingAccountId('oauth');
      try {
        const url = await generateGoogleOAuthUrl();
        setOauthUrl(url);
        setIsOauthWebviewOpen(true);
      } finally {
        setLoadingAccountId(null);
      }
    }
  };

  // Toggle account
  const handleToggleAccount = async (account) => {
    setLoadingAccountId(account._id);
    try {
      await updateAccount({ accountId: account._id, isActive: !account.isActive });
    } finally {
      setLoadingAccountId(null);
    }
  };

  // Sync account (Google only for now)
  const handleSyncAccount = async (account) => {
    setLoadingAccountId(account._id);
    try {
      await syncGoogleCalendar({ accountId: account._id });
    } finally {
      setLoadingAccountId(null);
    }
  };

  // Delete account
  const handleDeleteAccount = async (account) => {
    setLoadingAccountId(account._id);
    try {
      await deleteAccount({ accountId: account._id });
    } finally {
      setLoadingAccountId(null);
    }
  };

  // Handle OAuth WebView navigation
  const handleWebViewNavigation = (navState) => {
    // Detect OAuth callback (success or error)
    if (navState.url.includes('success') || navState.url.includes('error')) {
      setIsOauthWebviewOpen(false);
      setRefreshAccountsFlag(f => f + 1); // Force accounts refresh
      if (navState.url.includes('success')) {
        Alert.alert('Account Connected', 'Your Google account was connected successfully.');
      } else {
        Alert.alert('Connection Failed', 'There was an error connecting your account.');
      }
    }
  };

  // Helper to format last sync time
  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // When a day is pressed, show events for that day
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    if (userEvents) {
      const eventsForDay = userEvents.filter(ev => ev.startTime.startsWith(day.dateString));
      setSelectedDayEvents(eventsForDay);
      setIsEventListModalOpen(true);
    }
  };

  // Handle event delete
  const handleDeleteEvent = async (event) => {
    await deleteEvent({ eventId: event._id });
    setIsEventListModalOpen(false);
    setSelectedEvent(null);
    Alert.alert('Event Deleted', 'The event was deleted.');
  };

  // Handle event edit
  const handleEditEvent = async (updated) => {
    await updateEvent({
      eventId: updated._id,
      title: updated.title,
      description: updated.description,
      startTime: updated.startTime,
      endTime: updated.endTime,
      location: updated.location,
      isAllDay: updated.isAllDay,
    });
    setIsEditEventModalOpen(false);
    setSelectedEvent(null);
    setIsEventListModalOpen(false);
    Alert.alert('Event Updated', 'The event was updated.');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar Dashboard</Text>
      </View>
      <ScrollView key={refreshAccountsFlag} contentContainerStyle={styles.scrollContent}>
        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            style={styles.calendar}
          />
          <TouchableOpacity style={styles.createEventButton} onPress={() => setIsCreateModalOpen(true)}>
            <Text style={styles.createEventButtonText}>+ Create Event</Text>
          </TouchableOpacity>
        </View>
        {/* Synced Accounts Section */}
        <View style={styles.accountsSection}>
          <View style={styles.accountsHeader}>
            <Text style={styles.sectionTitle}>Synced Accounts</Text>
            <TouchableOpacity style={styles.addAccountButton} onPress={() => setIsAddAccountModalOpen(true)}>
              <Text style={styles.addAccountButtonText}>+ Add Account</Text>
            </TouchableOpacity>
          </View>
          {calendarAccounts === undefined ? (
            <ActivityIndicator size="small" color="#0D87E1" />
          ) : calendarAccounts && calendarAccounts.length > 0 ? (
            calendarAccounts.map(account => (
              <View key={account._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '500', color: '#2D2D2D' }}>{account.provider.charAt(0).toUpperCase() + account.provider.slice(1)} Calendar</Text>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>{account.email}</Text>
                  <Text style={{ color: account.isActive ? '#22c55e' : '#64748b', fontWeight: 'bold', fontSize: 12 }}>{account.isActive ? 'Connected' : 'Disconnected'}</Text>
                  <Text style={{ color: '#64748b', fontSize: 11 }}>Last sync: {formatLastSync(account.lastSync)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {account.provider === 'google' && account.isActive && (
                    <TouchableOpacity onPress={() => handleSyncAccount(account)} disabled={loadingAccountId === account._id} style={{ marginRight: 8 }}>
                      <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>{loadingAccountId === account._id ? 'Syncing...' : 'Sync'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleToggleAccount(account)} disabled={loadingAccountId === account._id} style={{ marginRight: 8 }}>
                    <Text style={{ color: '#0D87E1', fontWeight: 'bold' }}>{account.isActive ? 'Disable' : 'Enable'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteAccount(account)} disabled={loadingAccountId === account._id}>
                    <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No calendar accounts connected</Text>
          )}
        </View>
        {/* Quick Actions Section (placeholder) */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#22c55e' }]}> 
              <Text style={styles.actionButtonText}>📅 Create Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#2563eb' }]}> 
              <Text style={styles.actionButtonText}>👥 Invite Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#a21caf' }]}> 
              <Text style={styles.actionButtonText}>🤖 AI Suggestions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {/* Add Account Modal */}
      <Modal visible={isAddAccountModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Calendar Account</Text>
            <TouchableOpacity style={[styles.addAccountButton, { marginBottom: 12 }]} onPress={() => handleAddAccount('google')}>
              <Text style={styles.addAccountButtonText}>Connect Google Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]} onPress={() => setIsAddAccountModalOpen(false)}>
              <Text style={[styles.modalButtonText, { color: '#2D2D2D' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* OAuth WebView Modal */}
      <Modal visible={isOauthWebviewOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 0, height: 500 }]}> 
            <WebView
              source={{ uri: oauthUrl }}
              onNavigationStateChange={handleWebViewNavigation}
              startInLoadingState
              style={{ flex: 1, borderRadius: 12 }}
            />
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#e5e7eb', borderRadius: 0 }]} onPress={() => setIsOauthWebviewOpen(false)}>
              <Text style={[styles.modalButtonText, { color: '#2D2D2D' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Create Event Modal */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Event</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={newEvent.title}
              onChangeText={text => setNewEvent({ ...newEvent, title: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={newEvent.description}
              onChangeText={text => setNewEvent({ ...newEvent, description: text })}
            />
            <TouchableOpacity onPress={() => setShowStartPicker(true)}>
              <Text style={styles.inputLabel}>Start Time: {newEvent.startTime ? new Date(newEvent.startTime).toLocaleString() : 'Select'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEndPicker(true)}>
              <Text style={styles.inputLabel}>End Time: {newEvent.endTime ? new Date(newEvent.endTime).toLocaleString() : 'Select'}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={newEvent.startTime ? new Date(newEvent.startTime) : new Date()}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, date) => {
                  setShowStartPicker(false);
                  if (date) setNewEvent({ ...newEvent, startTime: date.toISOString() });
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={newEvent.endTime ? new Date(newEvent.endTime) : new Date()}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, date) => {
                  setShowEndPicker(false);
                  if (date) setNewEvent({ ...newEvent, endTime: date.toISOString() });
                }}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCreateEvent}>
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]} onPress={() => setIsCreateModalOpen(false)}>
                <Text style={[styles.modalButtonText, { color: '#2D2D2D' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Event List Modal for selected day */}
      <Modal visible={isEventListModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Events for {selectedDate}</Text>
            {selectedDayEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events for this day.</Text>
            ) : (
              <FlatList
                data={selectedDayEvents}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => { setSelectedEvent(item); setIsEditEventModalOpen(true); }} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.title}</Text>
                    <Text style={{ color: '#64748b', fontSize: 13 }}>{item.description}</Text>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>{new Date(item.startTime).toLocaleTimeString()} - {new Date(item.endTime).toLocaleTimeString()}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#e5e7eb', marginTop: 12 }]} onPress={() => setIsEventListModalOpen(false)}>
              <Text style={[styles.modalButtonText, { color: '#2D2D2D' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Edit Event Modal */}
      <Modal visible={isEditEventModalOpen && !!selectedEvent} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Event</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={selectedEvent?.title || ''}
              onChangeText={text => setSelectedEvent({ ...selectedEvent, title: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={selectedEvent?.description || ''}
              onChangeText={text => setSelectedEvent({ ...selectedEvent, description: text })}
            />
            <TouchableOpacity onPress={() => setShowStartPicker(true)}>
              <Text style={styles.inputLabel}>Start Time: {selectedEvent?.startTime ? new Date(selectedEvent.startTime).toLocaleString() : 'Select'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEndPicker(true)}>
              <Text style={styles.inputLabel}>End Time: {selectedEvent?.endTime ? new Date(selectedEvent.endTime).toLocaleString() : 'Select'}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={selectedEvent?.startTime ? new Date(selectedEvent.startTime) : new Date()}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, date) => {
                  setShowStartPicker(false);
                  if (date) setSelectedEvent({ ...selectedEvent, startTime: date.toISOString() });
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={selectedEvent?.endTime ? new Date(selectedEvent.endTime) : new Date()}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, date) => {
                  setShowEndPicker(false);
                  if (date) setSelectedEvent({ ...selectedEvent, endTime: date.toISOString() });
                }}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => handleEditEvent(selectedEvent)}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ef4444' }]} onPress={() => handleDeleteEvent(selectedEvent)}>
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]} onPress={() => setIsEditEventModalOpen(false)}>
                <Text style={[styles.modalButtonText, { color: '#2D2D2D' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#0D87E1',
    paddingVertical: 24,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  calendarSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calendar: {
    borderRadius: 8,
    marginBottom: 8,
  },
  createEventButton: {
    backgroundColor: '#0D87E1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  createEventButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  accountsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accountsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addAccountButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addAccountButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 12,
  },
  quickActionsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionsRow: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2D2D2D',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 15,
    color: '#2D2D2D',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    backgroundColor: '#0D87E1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CalendarDashboardScreen; 