
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';

export default function HomeScreen() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const getRoleColor = () => {
    return user?.role === 'admin' ? colors.adminPrimary : colors.crewLeadPrimary;
  };

  const handleLogout = () => {
    console.log('User tapped logout button');
    setModalVisible(true);
  };

  const confirmLogout = async () => {
    console.log('User confirmed logout');
    setLoading(true);
    setModalVisible(false);
    
    try {
      await logout();
      console.log('Logout successful, navigating to welcome screen');
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to welcome screen
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  const userName = user?.name || 'User';
  const roleDisplay = user?.role === 'admin' ? 'Admin' : 'Crew Lead';
  const roleColor = getRoleColor();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <View style={[styles.avatarContainer, { backgroundColor: roleColor }]}>
              <IconSymbol
                ios_icon_name={user?.role === 'admin' ? 'shield.fill' : 'person.fill'}
                android_material_icon_name={user?.role === 'admin' ? 'admin-panel-settings' : 'person'}
                size={32}
                color="#ffffff"
              />
            </View>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}20` }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{roleDisplay}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {user?.role === 'crew_lead' && (
            <>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/clock-in')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${colors.crewLeadPrimary}20` }]}>
                  <IconSymbol
                    ios_icon_name="clock.fill"
                    android_material_icon_name="access-time"
                    size={28}
                    color={colors.crewLeadPrimary}
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Clock In Team</Text>
                  <Text style={styles.actionDescription}>Clock in employees at job site</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color="#b0c4de"
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/clock-out')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${colors.error}20` }]}>
                  <IconSymbol
                    ios_icon_name="clock.badge.xmark"
                    android_material_icon_name="schedule"
                    size={28}
                    color={colors.error}
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Clock Out Team</Text>
                  <Text style={styles.actionDescription}>Clock out active employees</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color="#b0c4de"
                />
              </TouchableOpacity>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/employees')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${colors.crewLeadPrimary}20` }]}>
                  <IconSymbol
                    ios_icon_name="person.2.fill"
                    android_material_icon_name="group"
                    size={28}
                    color={colors.crewLeadPrimary}
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Manage Employees</Text>
                  <Text style={styles.actionDescription}>Add and manage team members</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color="#b0c4de"
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/job-sites')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${colors.adminPrimary}20` }]}>
                  <IconSymbol
                    ios_icon_name="map.fill"
                    android_material_icon_name="location-on"
                    size={28}
                    color={colors.adminPrimary}
                  />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Job Sites</Text>
                  <Text style={styles.actionDescription}>Manage work locations</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={20}
                  color="#b0c4de"
                />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/reports')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: `${colors.adminPrimary}20` }]}>
              <IconSymbol
                ios_icon_name="doc.text.fill"
                android_material_icon_name="description"
                size={28}
                color={colors.adminPrimary}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Reports</Text>
              <Text style={styles.actionDescription}>View and generate reports</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color="#b0c4de"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="arrow.right.square.fill"
                android_material_icon_name="logout"
                size={24}
                color={colors.error}
                style={styles.logoutIcon}
              />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={modalVisible}
        title="Confirm Logout"
        message="Are you sure you want to logout?"
        type="warning"
        onClose={() => setModalVisible(false)}
        onConfirm={confirmLogout}
        confirmText="Logout"
        cancelText="Cancel"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.clockBackground,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#b0c4de',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#b0c4de',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutIcon: {
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
