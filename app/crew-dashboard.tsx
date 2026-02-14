
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { Modal } from '@/components/ui/Modal';

interface CrewMember {
  employeeId: string;
  employeeName: string;
  isActive: boolean;
  hoursToday: number;
}

interface CrewDashboardData {
  crewId: string;
  crewName: string;
  crewLeaderId: string | null;
  crewLeaderName: string | null;
  members: CrewMember[];
  totalHoursToday: number;
}

export default function CrewDashboardScreen() {
  const [dashboardData, setDashboardData] = useState<CrewDashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'warning',
  });

  const showModal = (
    title: string,
    message: string,
    type: 'info' | 'error' | 'success' | 'warning' = 'info'
  ) => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const fetchDashboardData = async (isRefresh = false) => {
    console.log('[API] Fetching crew dashboard data');
    if (!isRefresh) {
      setLoading(true);
    }
    
    try {
      const response = await authenticatedGet<CrewDashboardData[]>('/api/crews/dashboard');
      console.log('[API] Dashboard data fetched:', response.length, 'crews');
      setDashboardData(response);
    } catch (error: any) {
      console.error('[API] Failed to fetch dashboard data:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to load dashboard data. Please try again.';
      showModal('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (wholeHours === 0) {
      const minuteText = `${minutes}m`;
      return minuteText;
    }
    
    if (minutes === 0) {
      const hourText = `${wholeHours}h`;
      return hourText;
    }
    
    const formattedText = `${wholeHours}h ${minutes}m`;
    return formattedText;
  };

  const totalHoursAllCrews = dashboardData.reduce((sum, crew) => sum + crew.totalHoursToday, 0);
  const totalActiveEmployees = dashboardData.reduce(
    (sum, crew) => sum + crew.members.filter(m => m.isActive).length,
    0
  );
  const totalEmployees = dashboardData.reduce((sum, crew) => sum + crew.members.length, 0);

  const totalHoursText = formatHours(totalHoursAllCrews);
  const activeEmployeesText = `${totalActiveEmployees} active`;
  const totalEmployeesText = `${totalEmployees} total`;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Live Crew Dashboard',
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.crewLeadPrimary}
          />
        }
      >
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <IconSymbol
              ios_icon_name="clock.fill"
              android_material_icon_name="access-time"
              size={32}
              color={colors.crewLeadPrimary}
            />
            <Text style={styles.summaryValue}>{totalHoursText}</Text>
            <Text style={styles.summaryLabel}>Total Hours Today</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <IconSymbol
              ios_icon_name="person.3.fill"
              android_material_icon_name="groups"
              size={32}
              color={colors.adminPrimary}
            />
            <Text style={styles.summaryValue}>{activeEmployeesText}</Text>
            <Text style={styles.summaryLabel}>{totalEmployeesText}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.crewLeadPrimary} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : dashboardData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="person.3.slash"
              android_material_icon_name="groups"
              size={64}
              color="#b0c4de"
            />
            <Text style={styles.emptyTitle}>No Crews Yet</Text>
            <Text style={styles.emptyText}>Create crews to see them here</Text>
          </View>
        ) : (
          dashboardData.map((crew) => {
            const leaderText = crew.crewLeaderName || 'No leader assigned';
            const crewHoursText = formatHours(crew.totalHoursToday);
            const activeCount = crew.members.filter(m => m.isActive).length;
            const activeCountText = `${activeCount} active`;
            
            return (
              <View key={crew.crewId} style={styles.crewSection}>
                <View style={styles.crewHeader}>
                  <View style={styles.crewHeaderLeft}>
                    <View style={[styles.crewAvatar, { backgroundColor: colors.crewLeadPrimary }]}>
                      <IconSymbol
                        ios_icon_name="person.3.fill"
                        android_material_icon_name="groups"
                        size={28}
                        color="#ffffff"
                      />
                    </View>
                    <View style={styles.crewHeaderInfo}>
                      <Text style={styles.crewName}>{crew.crewName}</Text>
                      <Text style={styles.crewLeader}>{leaderText}</Text>
                    </View>
                  </View>
                  <View style={styles.crewHeaderRight}>
                    <Text style={styles.crewHours}>{crewHoursText}</Text>
                    <Text style={styles.crewActiveCount}>{activeCountText}</Text>
                  </View>
                </View>

                <View style={styles.membersContainer}>
                  {crew.members.length === 0 ? (
                    <Text style={styles.noMembersText}>No members assigned</Text>
                  ) : (
                    crew.members.map((member) => {
                      const memberHoursText = formatHours(member.hoursToday);
                      const statusText = member.isActive ? 'Clocked In' : 'Clocked Out';
                      const statusColor = member.isActive ? colors.crewLeadPrimary : '#b0c4de';
                      
                      return (
                        <View key={member.employeeId} style={styles.memberCard}>
                          <View style={styles.memberLeft}>
                            <View style={[
                              styles.statusIndicator,
                              { backgroundColor: member.isActive ? colors.crewLeadPrimary : 'rgba(255, 255, 255, 0.2)' }
                            ]} />
                            <View style={styles.memberInfo}>
                              <Text style={styles.memberName}>{member.employeeName}</Text>
                              <Text style={[styles.memberStatus, { color: statusColor }]}>
                                {statusText}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.memberRight}>
                            <Text style={styles.memberHours}>{memberHoursText}</Text>
                            <Text style={styles.memberHoursLabel}>today</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.refreshNote}>
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={16}
            color="#b0c4de"
          />
          <Text style={styles.refreshNoteText}>Auto-refreshes every 30 seconds</Text>
        </View>
      </ScrollView>

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
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summarySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#b0c4de',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#b0c4de',
    marginTop: 16,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#b0c4de',
    textAlign: 'center',
  },
  crewSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  crewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  crewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  crewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  crewHeaderInfo: {
    flex: 1,
  },
  crewName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  crewLeader: {
    fontSize: 14,
    color: '#b0c4de',
  },
  crewHeaderRight: {
    alignItems: 'flex-end',
  },
  crewHours: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.crewLeadPrimary,
    marginBottom: 2,
  },
  crewActiveCount: {
    fontSize: 12,
    color: '#b0c4de',
  },
  membersContainer: {
    gap: 12,
  },
  noMembersText: {
    fontSize: 14,
    color: '#b0c4de',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  memberCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  memberStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  memberRight: {
    alignItems: 'flex-end',
  },
  memberHours: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  memberHoursLabel: {
    fontSize: 11,
    color: '#b0c4de',
  },
  refreshNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  refreshNoteText: {
    fontSize: 13,
    color: '#b0c4de',
  },
});
