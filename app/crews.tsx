
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/utils/api';
import { Modal } from '@/components/ui/Modal';

interface Crew {
  id: string;
  name: string;
  crewLeaderId: string | null;
  crewLeaderName: string | null;
  memberCount: number;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  isCrewLeader: boolean;
}

interface CrewMember {
  id: string;
  name: string;
  isCrewLeader: boolean;
}

export default function CrewsScreen() {
  const router = useRouter();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCrew, setAddingCrew] = useState(false);
  const [crewName, setCrewName] = useState('');
  const [selectedCrewLeaderId, setSelectedCrewLeaderId] = useState<string | null>(null);
  const [showCrewLeaderPicker, setShowCrewLeaderPicker] = useState(false);
  const [expandedCrewId, setExpandedCrewId] = useState<string | null>(null);
  const [crewMembers, setCrewMembers] = useState<{ [crewId: string]: CrewMember[] }>({});
  const [loadingMembers, setLoadingMembers] = useState<{ [crewId: string]: boolean }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'warning',
    onConfirm: undefined as (() => void) | undefined,
    confirmText: 'OK',
  });

  const showModal = (
    title: string,
    message: string,
    type: 'info' | 'error' | 'success' | 'warning' = 'info',
    onConfirm?: () => void,
    confirmText: string = 'OK'
  ) => {
    setModalConfig({ title, message, type, onConfirm, confirmText });
    setModalVisible(true);
  };

  const fetchCrews = async () => {
    console.log('[API] Fetching crews list');
    setLoading(true);
    
    try {
      const response = await authenticatedGet<Crew[]>('/api/crews');
      console.log('[API] Crews fetched:', response.length);
      setCrews(response);
    } catch (error: any) {
      console.error('[API] Failed to fetch crews:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to load crews. Please try again.';
      showModal('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    console.log('[API] Fetching employees for crew leader selection');
    
    try {
      const response = await authenticatedGet<Employee[]>('/api/employees');
      console.log('[API] Employees fetched:', response.length);
      setEmployees(response);
    } catch (error: any) {
      console.error('[API] Failed to fetch employees:', error);
    }
  };

  const fetchCrewMembers = async (crewId: string) => {
    console.log('[API] Fetching members for crew:', crewId);
    setLoadingMembers(prev => ({ ...prev, [crewId]: true }));
    
    try {
      const response = await authenticatedGet<CrewMember[]>(`/api/crews/${crewId}/members`);
      console.log('[API] Crew members fetched:', response.length);
      setCrewMembers(prev => ({ ...prev, [crewId]: response }));
    } catch (error: any) {
      console.error('[API] Failed to fetch crew members:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to load crew members.';
      showModal('Error', errorMessage, 'error');
    } finally {
      setLoadingMembers(prev => ({ ...prev, [crewId]: false }));
    }
  };

  useEffect(() => {
    fetchCrews();
    fetchEmployees();
  }, []);

  const handleAddCrew = async () => {
    console.log('[API] User tapped Add Crew button', { crewName, selectedCrewLeaderId });
    
    if (!crewName.trim()) {
      showModal('Missing Information', 'Please enter crew name', 'warning');
      return;
    }

    setAddingCrew(true);
    
    try {
      const response = await authenticatedPost<Crew>('/api/crews', {
        name: crewName.trim(),
        crewLeaderId: selectedCrewLeaderId,
      });

      console.log('[API] Crew added successfully:', response);
      showModal('Success', `Crew "${response.name}" has been created successfully.`, 'success');

      // Reset form
      setCrewName('');
      setSelectedCrewLeaderId(null);
      
      // Refresh list
      fetchCrews();
    } catch (error: any) {
      console.error('[API] Failed to add crew:', error);
      
      let errorMessage = 'Failed to add crew. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = 'A crew with this name already exists.';
        } else {
          errorMessage = error.message;
        }
      } else if (error?.toString) {
        errorMessage = error.toString();
      }
      
      showModal('Error', errorMessage, 'error');
    } finally {
      setAddingCrew(false);
    }
  };

  const handleDeleteCrew = (crewId: string, crewName: string) => {
    console.log('[API] User tapped delete for crew:', crewName);
    
    showModal(
      'Confirm Delete',
      `Are you sure you want to delete crew "${crewName}"? Members will be unassigned from this crew.`,
      'warning',
      async () => {
        console.log('[API] User confirmed delete for crew:', crewName);
        setModalVisible(false);
        
        try {
          await authenticatedDelete(`/api/crews/${crewId}`);
          console.log('[API] Crew deleted successfully');
          showModal('Success', `Crew "${crewName}" has been deleted.`, 'success');
          fetchCrews();
        } catch (error: any) {
          console.error('[API] Failed to delete crew:', error);
          const errorMessage = error?.message || error?.toString() || 'Failed to delete crew. Please try again.';
          showModal('Error', errorMessage, 'error');
        }
      },
      'Delete'
    );
  };

  const handleChangeCrewLeader = (crewId: string, crewName: string, currentLeaderId: string | null) => {
    console.log('[API] User tapped change crew leader for:', crewName);
    
    // Show crew leader picker modal
    showModal(
      'Change Crew Leader',
      `Select a new crew leader for "${crewName}"`,
      'info',
      undefined,
      'Cancel'
    );
    
    // TODO: Implement crew leader picker UI
  };

  const toggleCrewExpansion = (crewId: string) => {
    if (expandedCrewId === crewId) {
      setExpandedCrewId(null);
    } else {
      setExpandedCrewId(crewId);
      if (!crewMembers[crewId]) {
        fetchCrewMembers(crewId);
      }
    }
  };

  const crewLeaders = employees.filter(emp => emp.isCrewLeader);
  const selectedLeaderName = selectedCrewLeaderId 
    ? crewLeaders.find(cl => cl.id === selectedCrewLeaderId)?.name || 'Select Crew Leader'
    : 'Select Crew Leader (Optional)';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Manage Crews',
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Create New Crew</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Crew Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter crew name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={crewName}
              onChangeText={setCrewName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Crew Leader (Optional)</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCrewLeaderPicker(!showCrewLeaderPicker)}
            >
              <Text style={styles.pickerButtonText}>{selectedLeaderName}</Text>
              <IconSymbol
                ios_icon_name={showCrewLeaderPicker ? 'chevron.up' : 'chevron.down'}
                android_material_icon_name={showCrewLeaderPicker ? 'expand-less' : 'expand-more'}
                size={20}
                color="#ffffff"
              />
            </TouchableOpacity>
            
            {showCrewLeaderPicker && (
              <View style={styles.pickerDropdown}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => {
                    setSelectedCrewLeaderId(null);
                    setShowCrewLeaderPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>No Crew Leader</Text>
                </TouchableOpacity>
                {crewLeaders.map((leader) => (
                  <TouchableOpacity
                    key={leader.id}
                    style={[
                      styles.pickerOption,
                      selectedCrewLeaderId === leader.id && styles.pickerOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedCrewLeaderId(leader.id);
                      setShowCrewLeaderPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{leader.name}</Text>
                    {selectedCrewLeaderId === leader.id && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={20}
                        color={colors.crewLeadPrimary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddCrew}
            disabled={addingCrew}
          >
            {addingCrew ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add-circle"
                  size={24}
                  color="#ffffff"
                  style={styles.addButtonIcon}
                />
                <Text style={styles.addButtonText}>Create Crew</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Crews</Text>
            <TouchableOpacity
              style={styles.dashboardButton}
              onPress={() => router.push('/crew-dashboard')}
            >
              <IconSymbol
                ios_icon_name="chart.bar.fill"
                android_material_icon_name="dashboard"
                size={20}
                color={colors.crewLeadPrimary}
              />
              <Text style={styles.dashboardButtonText}>Live Dashboard</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.crewLeadPrimary} />
            </View>
          ) : crews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="person.3.slash"
                android_material_icon_name="groups"
                size={48}
                color="#b0c4de"
              />
              <Text style={styles.emptyText}>No crews yet</Text>
            </View>
          ) : (
            crews.map((crew) => {
              const leaderText = crew.crewLeaderName || 'No leader assigned';
              const memberCountText = `${crew.memberCount} ${crew.memberCount === 1 ? 'member' : 'members'}`;
              const isExpanded = expandedCrewId === crew.id;
              const members = crewMembers[crew.id] || [];
              const isLoadingMembers = loadingMembers[crew.id];
              
              return (
                <View key={crew.id} style={styles.crewCard}>
                  <TouchableOpacity
                    style={styles.crewHeader}
                    onPress={() => toggleCrewExpansion(crew.id)}
                  >
                    <View style={styles.crewInfo}>
                      <View style={[styles.crewAvatar, { backgroundColor: colors.crewLeadPrimary }]}>
                        <IconSymbol
                          ios_icon_name="person.3.fill"
                          android_material_icon_name="groups"
                          size={24}
                          color="#ffffff"
                        />
                      </View>
                      <View style={styles.crewDetails}>
                        <Text style={styles.crewName}>{crew.name}</Text>
                        <Text style={styles.crewLeader}>{leaderText}</Text>
                        <Text style={styles.crewMemberCount}>{memberCountText}</Text>
                      </View>
                    </View>
                    <View style={styles.crewActions}>
                      <IconSymbol
                        ios_icon_name={isExpanded ? 'chevron.up' : 'chevron.down'}
                        android_material_icon_name={isExpanded ? 'expand-less' : 'expand-more'}
                        size={24}
                        color="#b0c4de"
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.crewExpandedContent}>
                      <View style={styles.crewActionButtons}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleChangeCrewLeader(crew.id, crew.name, crew.crewLeaderId)}
                        >
                          <IconSymbol
                            ios_icon_name="person.badge.key.fill"
                            android_material_icon_name="person"
                            size={18}
                            color={colors.crewLeadPrimary}
                          />
                          <Text style={styles.actionButtonText}>Change Leader</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteActionButton]}
                          onPress={() => handleDeleteCrew(crew.id, crew.name)}
                        >
                          <IconSymbol
                            ios_icon_name="trash.fill"
                            android_material_icon_name="delete"
                            size={18}
                            color={colors.error}
                          />
                          <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete Crew</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.membersSection}>
                        <Text style={styles.membersSectionTitle}>Members</Text>
                        {isLoadingMembers ? (
                          <ActivityIndicator size="small" color={colors.crewLeadPrimary} />
                        ) : members.length === 0 ? (
                          <Text style={styles.noMembersText}>No members assigned yet</Text>
                        ) : (
                          members.map((member) => {
                            const roleText = member.isCrewLeader ? 'Crew Leader' : 'Member';
                            
                            return (
                              <View key={member.id} style={styles.memberItem}>
                                <View style={styles.memberInfo}>
                                  <IconSymbol
                                    ios_icon_name="person.fill"
                                    android_material_icon_name="person"
                                    size={16}
                                    color="#b0c4de"
                                  />
                                  <Text style={styles.memberName}>{member.name}</Text>
                                  <Text style={styles.memberRole}>{roleText}</Text>
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalVisible(false)}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.clockBackground,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  addSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.crewLeadPrimary}20`,
    borderWidth: 1,
    borderColor: colors.crewLeadPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  dashboardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.crewLeadPrimary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  pickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  pickerDropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: colors.crewLeadPrimary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  listSection: {
    marginTop: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#b0c4de',
    marginTop: 12,
  },
  crewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  crewHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  crewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  crewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  crewDetails: {
    flex: 1,
  },
  crewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  crewLeader: {
    fontSize: 14,
    color: '#b0c4de',
    marginBottom: 2,
  },
  crewMemberCount: {
    fontSize: 12,
    color: '#b0c4de',
  },
  crewActions: {
    padding: 8,
  },
  crewExpandedContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  crewActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: colors.crewLeadPrimary,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  deleteActionButton: {
    borderColor: colors.error,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.crewLeadPrimary,
  },
  membersSection: {
    marginTop: 8,
  },
  membersSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  noMembersText: {
    fontSize: 14,
    color: '#b0c4de',
    fontStyle: 'italic',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 14,
    color: '#ffffff',
  },
  memberRole: {
    fontSize: 12,
    color: '#b0c4de',
    marginLeft: 4,
  },
});
