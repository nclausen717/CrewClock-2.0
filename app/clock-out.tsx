
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Modal } from '@/components/ui/Modal';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveTimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  jobSiteId: string;
  jobSiteName: string;
  clockInTime: string;
}

export default function ClockOutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeEntries, setActiveEntries] = useState<ActiveTimeEntry[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [workDescription, setWorkDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'warning',
  });

  const fetchActiveEntries = React.useCallback(async () => {
    console.log('[API] Fetching active time entries');
    setLoading(true);
    
    try {
      const response = await authenticatedGet<ActiveTimeEntry[]>('/api/time-entries/active');
      setActiveEntries(response);
      console.log('[API] Active entries loaded:', response.length);
    } catch (error: any) {
      console.error('[API] Error fetching active entries:', error);
      showModal('Error', error.message || 'Failed to load active employees', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('ClockOutScreen mounted, fetching active entries');
    fetchActiveEntries();
  }, [fetchActiveEntries]);

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const toggleEmployee = (employeeId: string) => {
    console.log('Toggling employee selection:', employeeId);
    const newSelection = new Set(selectedEmployees);
    
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId);
    } else {
      newSelection.add(employeeId);
    }
    
    setSelectedEmployees(newSelection);
  };

  const handleClockOut = async () => {
    console.log('User tapped Clock Out button');
    
    if (selectedEmployees.size === 0) {
      showModal('No Employees Selected', 'Please select at least one employee to clock out', 'warning');
      return;
    }

    const employeeIds = Array.from(selectedEmployees);
    const selectedEmployeeNames = activeEntries
      .filter(entry => selectedEmployees.has(entry.employeeId))
      .map(entry => entry.employeeName)
      .join(', ');
    
    console.log('[API] Clocking out employees:', employeeIds);
    setSubmitting(true);

    try {
      const requestBody: {
        employeeIds: string[];
        workDescription?: string;
      } = {
        employeeIds,
      };

      // Add work description if provided
      if (workDescription.trim()) {
        requestBody.workDescription = workDescription.trim();
      }

      await authenticatedPost<{
        success: boolean;
        entries: {
          id: string;
          employeeId: string;
          clockOutTime: string;
        }[];
      }>('/api/time-entries/clock-out', requestBody);
      
      showModal(
        'Clock Out Successful',
        `Successfully clocked out:\n${selectedEmployeeNames}`,
        'success'
      );

      // Refresh the list
      await fetchActiveEntries();
      setSelectedEmployees(new Set());
      setWorkDescription('');
    } catch (error: any) {
      console.error('[API] Error clocking out:', error);
      showModal('Error', error.message || 'Failed to clock out employees', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOutSingle = async (employeeId: string, employeeName: string) => {
    console.log('[API] Clocking out single employee:', employeeId);
    setSubmitting(true);

    try {
      const requestBody: {
        employeeIds: string[];
        workDescription?: string;
      } = {
        employeeIds: [employeeId],
      };

      // Add work description if provided
      if (workDescription.trim()) {
        requestBody.workDescription = workDescription.trim();
      }

      await authenticatedPost<{
        success: boolean;
        entries: {
          id: string;
          employeeId: string;
          clockOutTime: string;
        }[];
      }>('/api/time-entries/clock-out', requestBody);
      
      showModal(
        'Clock Out Successful',
        `Successfully clocked out ${employeeName}`,
        'success'
      );

      // Refresh the list
      await fetchActiveEntries();
      setWorkDescription('');
    } catch (error: any) {
      console.error('[API] Error clocking out:', error);
      showModal('Error', error.message || 'Failed to clock out employee', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getHoursWorked = (clockInTime: string) => {
    const start = new Date(clockInTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const selectedCount = selectedEmployees.size;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Clock Out Team',
          headerStyle: { backgroundColor: colors.clockBackground },
          headerTintColor: '#ffffff',
          headerBackTitle: 'Back',
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.error} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Active Employees</Text>
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>{selectedCount} selected</Text>
            </View>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {activeEntries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol
                  ios_icon_name="clock.badge.checkmark"
                  android_material_icon_name="schedule"
                  size={64}
                  color="#b0c4de"
                />
                <Text style={styles.emptyText}>No active employees</Text>
                <Text style={styles.emptySubtext}>All employees are clocked out</Text>
              </View>
            ) : (
              <>
                {activeEntries.map((entry) => {
                  const isSelected = selectedEmployees.has(entry.employeeId);
                  const isCurrentUser = user?.name === entry.employeeName;
                  
                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.employeeCard, 
                        isSelected && styles.employeeCardSelected,
                        isCurrentUser && styles.employeeCardCurrentUser
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.employeeCardMain}
                        onPress={() => toggleEmployee(entry.employeeId)}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && (
                            <IconSymbol
                              ios_icon_name="checkmark"
                              android_material_icon_name="check"
                              size={20}
                              color="#ffffff"
                            />
                          )}
                        </View>
                        <View style={[styles.employeeAvatar, { backgroundColor: `${colors.error}20` }]}>
                          <IconSymbol
                            ios_icon_name={isCurrentUser ? "person.crop.circle.fill" : "person.fill"}
                            android_material_icon_name="person"
                            size={24}
                            color={colors.error}
                          />
                        </View>
                        <View style={styles.employeeInfo}>
                          <View style={styles.employeeNameRow}>
                            <Text style={styles.employeeName}>{entry.employeeName}</Text>
                            {isCurrentUser && (
                              <Text style={styles.currentUserBadge}>You</Text>
                            )}
                          </View>
                          <View style={styles.infoRow}>
                            <IconSymbol
                              ios_icon_name="location.fill"
                              android_material_icon_name="place"
                              size={12}
                              color="#b0c4de"
                            />
                            <Text style={styles.jobSiteText}>{entry.jobSiteName}</Text>
                          </View>
                          <View style={styles.timeRow}>
                            <Text style={styles.timeLabel}>In: </Text>
                            <Text style={styles.timeValue}>{formatTime(entry.clockInTime)}</Text>
                            <Text style={styles.timeSeparator}> • </Text>
                            <Text style={styles.hoursWorked}>{getHoursWorked(entry.clockInTime)}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.singleClockOutButton}
                        onPress={() => handleClockOutSingle(entry.employeeId, entry.employeeName)}
                        disabled={submitting}
                      >
                        <IconSymbol
                          ios_icon_name="clock.badge.xmark"
                          android_material_icon_name="schedule"
                          size={20}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                <View style={styles.workDescriptionContainer}>
                  <Text style={styles.workDescriptionLabel}>Work Description (Optional)</Text>
                  <TextInput
                    style={styles.workDescriptionInput}
                    placeholder="Describe the work completed today..."
                    placeholderTextColor="#b0c4de"
                    value={workDescription}
                    onChangeText={setWorkDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
          </ScrollView>

          {activeEntries.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.clockOutButton, selectedCount === 0 && styles.clockOutButtonDisabled]}
                onPress={handleClockOut}
                disabled={selectedCount === 0 || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="clock.badge.xmark"
                      android_material_icon_name="schedule"
                      size={24}
                      color="#ffffff"
                    />
                    <Text style={styles.clockOutButtonText}>Clock Out All ({selectedCount})</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <Modal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.clockBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#b0c4de',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectedBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  selectedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#b0c4de',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#b0c4de',
    marginTop: 8,
  },
  employeeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  employeeCardSelected: {
    borderColor: colors.error,
    backgroundColor: `${colors.error}15`,
  },
  employeeCardCurrentUser: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  employeeCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  currentUserBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  jobSiteText: {
    fontSize: 13,
    color: '#b0c4de',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#b0c4de',
  },
  timeValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 12,
    color: '#b0c4de',
  },
  hoursWorked: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  singleClockOutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.error}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  workDescriptionContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  workDescriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  workDescriptionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    minHeight: 80,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: colors.clockBackground,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  clockOutButton: {
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  clockOutButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.5,
  },
  clockOutButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
});
