
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

interface Employee {
  id: string;
  name: string;
}

interface JobSite {
  id: string;
  name: string;
  location: string;
}

export default function ClockInScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedJobSite, setSelectedJobSite] = useState<string | null>(null);
  const [workDescription, setWorkDescription] = useState<string>('');
  const [showJobSiteModal, setShowJobSiteModal] = useState(false);
  const [isSelfClockIn, setIsSelfClockIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selfClockingIn, setSelfClockingIn] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'warning',
  });

  const fetchData = React.useCallback(async () => {
    console.log('[API] Fetching employees and job sites');
    setLoading(true);
    
    try {
      const [employeesResponse, jobSitesResponse] = await Promise.all([
        authenticatedGet<Employee[]>('/api/employees/for-clock-in'),
        authenticatedGet<JobSite[]>('/api/job-sites'),
      ]);
      
      setEmployees(employeesResponse);
      setJobSites(jobSitesResponse);
      console.log('[API] Data loaded - Employees:', employeesResponse.length, 'Job Sites:', jobSitesResponse.length);
    } catch (error: any) {
      console.error('[API] Error fetching data:', error);
      showModal('Error', error.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('ClockInScreen mounted, fetching data');
    fetchData();
  }, [fetchData]);

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

  const handleSelfClockIn = () => {
    console.log('User tapped Self Clock In button');
    
    if (jobSites.length === 0) {
      showModal('No Job Sites', 'Please create a job site first', 'warning');
      return;
    }

    setIsSelfClockIn(true);
    setShowJobSiteModal(true);
  };

  const confirmSelfClockIn = async () => {
    if (!selectedJobSite) {
      showModal('No Job Site Selected', 'Please select a job site', 'warning');
      return;
    }

    const selectedSite = jobSites.find(site => site.id === selectedJobSite);
    
    console.log('[API] Self clocking in at job site:', selectedJobSite);
    setSelfClockingIn(true);

    try {
      const requestBody: {
        jobSiteId: string;
        workDescription?: string;
      } = {
        jobSiteId: selectedJobSite,
      };

      if (workDescription.trim()) {
        requestBody.workDescription = workDescription.trim();
      }

      await authenticatedPost<{
        success: boolean;
        timeEntry: {
          id: string;
          userId: string;
          jobSiteId: string;
          clockInTime: string;
        };
      }>('/api/time-entries/clock-in-self', requestBody);
      
      showModal(
        'Clock In Successful',
        `You have been clocked in at ${selectedSite?.name}`,
        'success'
      );

      setSelectedJobSite(null);
      setWorkDescription('');
      setShowJobSiteModal(false);
      setIsSelfClockIn(false);
      
      await fetchData();
    } catch (error: any) {
      console.error('[API] Error self clocking in:', error);
      showModal('Error', error.message || 'Failed to clock in', 'error');
    } finally {
      setSelfClockingIn(false);
    }
  };

  const handleClockIn = () => {
    console.log('User tapped Clock In button');
    
    if (selectedEmployees.size === 0) {
      showModal('No Employees Selected', 'Please select at least one employee to clock in', 'warning');
      return;
    }

    if (!selectedJobSite) {
      showModal('No Job Site Selected', 'Please select a job site first', 'warning');
      return;
    }

    confirmClockIn();
  };

  const confirmClockIn = async () => {
    if (!selectedJobSite) {
      showModal('No Job Site Selected', 'Please select a job site', 'warning');
      return;
    }

    const employeeIds = Array.from(selectedEmployees);
    const selectedSite = jobSites.find(site => site.id === selectedJobSite);
    
    console.log('[API] Clocking in employees:', employeeIds, 'at job site:', selectedJobSite);
    setSubmitting(true);

    try {
      const requestBody: {
        employeeIds: string[];
        jobSiteId: string;
        workDescription?: string;
      } = {
        employeeIds,
        jobSiteId: selectedJobSite,
      };

      if (workDescription.trim()) {
        requestBody.workDescription = workDescription.trim();
      }

      await authenticatedPost<{
        success: boolean;
        entries: {
          id: string;
          employeeId: string;
          jobSiteId: string;
          clockInTime: string;
        }[];
      }>('/api/time-entries/clock-in', requestBody);
      
      const selectedEmployeeNames = employees
        .filter(emp => selectedEmployees.has(emp.id))
        .map(emp => emp.name)
        .join(', ');

      showModal(
        'Clock In Successful',
        `Successfully clocked in:\n${selectedEmployeeNames}\n\nat ${selectedSite?.name}`,
        'success'
      );

      setSelectedEmployees(new Set());
      setSelectedJobSite(null);
      setWorkDescription('');
      setShowJobSiteModal(false);
    } catch (error: any) {
      console.error('[API] Error clocking in:', error);
      showModal('Error', error.message || 'Failed to clock in employees', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJobSiteSelect = () => {
    console.log('User tapped Select Job Site button');
    
    if (jobSites.length === 0) {
      showModal('No Job Sites', 'Please create a job site first', 'warning');
      return;
    }

    setIsSelfClockIn(false);
    setShowJobSiteModal(true);
  };

  const selectedCount = selectedEmployees.size;
  const selectedSite = jobSites.find(site => site.id === selectedJobSite);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Clock In Team',
          headerStyle: { backgroundColor: colors.clockBackground },
          headerTintColor: '#ffffff',
          headerBackTitle: 'Back',
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.crewLeadPrimary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
          <View style={styles.selfClockInContainer}>
            <TouchableOpacity
              style={styles.selfClockInButton}
              onPress={handleSelfClockIn}
              disabled={selfClockingIn}
            >
              <View style={styles.selfClockInIcon}>
                <IconSymbol
                  ios_icon_name="person.crop.circle.fill"
                  android_material_icon_name="account-circle"
                  size={32}
                  color="#ffffff"
                />
              </View>
              <View style={styles.selfClockInContent}>
                <Text style={styles.selfClockInTitle}>Clock Yourself In</Text>
                <Text style={styles.selfClockInSubtitle}>Quick self check-in</Text>
              </View>
              <IconSymbol
                ios_icon_name="clock.fill"
                android_material_icon_name="access-time"
                size={24}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CLOCK IN YOUR TEAM</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.jobSiteSelector}
            onPress={handleJobSiteSelect}
          >
            <View style={styles.jobSiteSelectorIcon}>
              <IconSymbol
                ios_icon_name="location.fill"
                android_material_icon_name="place"
                size={24}
                color={selectedSite ? colors.crewLeadPrimary : '#b0c4de'}
              />
            </View>
            <View style={styles.jobSiteSelectorContent}>
              <Text style={styles.jobSiteSelectorLabel}>Select Job Site</Text>
              {selectedSite ? (
                <React.Fragment>
                  <Text style={styles.jobSiteSelectorValue}>{selectedSite.name}</Text>
                  <Text style={styles.jobSiteSelectorLocation}>{selectedSite.location}</Text>
                </React.Fragment>
              ) : (
                <Text style={styles.jobSiteSelectorPlaceholder}>Tap to select a job site</Text>
              )}
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color="#b0c4de"
            />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Employees</Text>
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>{selectedCount} selected</Text>
            </View>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {employees.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol
                  ios_icon_name="person.2.slash"
                  android_material_icon_name="group"
                  size={64}
                  color="#b0c4de"
                />
                <Text style={styles.emptyText}>No employees available</Text>
              </View>
            ) : (
              employees.map((employee) => {
                const isSelected = selectedEmployees.has(employee.id);
                const isCurrentUser = user?.id === employee.id;
                
                return (
                  <TouchableOpacity
                    key={employee.id}
                    style={[
                      styles.employeeCard, 
                      isSelected && styles.employeeCardSelected,
                      isCurrentUser && styles.employeeCardCurrentUser
                    ]}
                    onPress={() => toggleEmployee(employee.id)}
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
                    <View style={[styles.employeeAvatar, { backgroundColor: `${colors.crewLeadPrimary}20` }]}>
                      <IconSymbol
                        ios_icon_name={isCurrentUser ? "person.crop.circle.fill" : "person.fill"}
                        android_material_icon_name="person"
                        size={24}
                        color={colors.crewLeadPrimary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.employeeName}>{employee.name}</Text>
                      {isCurrentUser && (
                        <Text style={styles.currentUserBadge}>You</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.clockInButton, 
                (selectedCount === 0 || !selectedJobSite) && styles.clockInButtonDisabled
              ]}
              onPress={handleClockIn}
              disabled={selectedCount === 0 || !selectedJobSite}
            >
              <IconSymbol
                ios_icon_name="clock.fill"
                android_material_icon_name="access-time"
                size={24}
                color="#ffffff"
              />
              <Text style={styles.clockInButtonText}>Clock In Team ({selectedCount})</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {showJobSiteModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Job Site</Text>
            <Text style={styles.modalSubtitle}>Choose where you will be working</Text>

            <ScrollView style={styles.jobSiteList}>
              {jobSites.map((site) => {
                const isSelected = selectedJobSite === site.id;
                
                return (
                  <TouchableOpacity
                    key={site.id}
                    style={[styles.jobSiteCard, isSelected && styles.jobSiteCardSelected]}
                    onPress={() => setSelectedJobSite(site.id)}
                  >
                    <View style={styles.jobSiteInfo}>
                      <Text style={styles.jobSiteName}>{site.name}</Text>
                      <View style={styles.locationRow}>
                        <IconSymbol
                          ios_icon_name="location.fill"
                          android_material_icon_name="place"
                          size={14}
                          color="#b0c4de"
                        />
                        <Text style={styles.jobSiteLocation}>{site.location}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={24}
                        color={colors.crewLeadPrimary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {isSelfClockIn && (
              <View style={styles.workDescriptionContainer}>
                <Text style={styles.workDescriptionLabel}>Work Description (Optional)</Text>
                <TextInput
                  style={styles.workDescriptionInput}
                  placeholder="Describe the work being done today..."
                  placeholderTextColor="#b0c4de"
                  value={workDescription}
                  onChangeText={setWorkDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowJobSiteModal(false);
                  setIsSelfClockIn(false);
                }}
                disabled={submitting || selfClockingIn}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, !selectedJobSite && styles.confirmButtonDisabled]}
                onPress={() => {
                  if (isSelfClockIn) {
                    confirmSelfClockIn();
                  } else {
                    setShowJobSiteModal(false);
                  }
                }}
                disabled={!selectedJobSite || submitting || selfClockingIn}
              >
                {(submitting || selfClockingIn) ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {isSelfClockIn ? 'Confirm Clock In' : 'Select'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  selfClockInContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  selfClockInButton: {
    backgroundColor: colors.success,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  selfClockInIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  selfClockInContent: {
    flex: 1,
  },
  selfClockInTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  selfClockInSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b0c4de',
    marginHorizontal: 12,
  },
  jobSiteSelector: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  jobSiteSelectorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  jobSiteSelectorContent: {
    flex: 1,
  },
  jobSiteSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b0c4de',
    marginBottom: 4,
  },
  jobSiteSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  jobSiteSelectorLocation: {
    fontSize: 13,
    color: '#b0c4de',
  },
  jobSiteSelectorPlaceholder: {
    fontSize: 14,
    color: '#b0c4de',
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectedBadge: {
    backgroundColor: colors.crewLeadPrimary,
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
  },
  employeeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  employeeCardSelected: {
    borderColor: colors.crewLeadPrimary,
    backgroundColor: `${colors.crewLeadPrimary}15`,
  },
  employeeCardCurrentUser: {
    borderColor: colors.success,
    borderWidth: 2,
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
    backgroundColor: colors.crewLeadPrimary,
    borderColor: colors.crewLeadPrimary,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  currentUserBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    marginTop: 2,
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
  clockInButton: {
    backgroundColor: colors.crewLeadPrimary,
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
  clockInButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.5,
  },
  clockInButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.clockBackground,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#b0c4de',
    marginBottom: 20,
  },
  jobSiteList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  workDescriptionContainer: {
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
  jobSiteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  jobSiteCardSelected: {
    borderColor: colors.crewLeadPrimary,
    backgroundColor: `${colors.crewLeadPrimary}15`,
  },
  jobSiteInfo: {
    flex: 1,
  },
  jobSiteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobSiteLocation: {
    fontSize: 14,
    color: '#b0c4de',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  confirmButton: {
    backgroundColor: colors.crewLeadPrimary,
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
