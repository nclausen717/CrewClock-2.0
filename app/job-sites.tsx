
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Modal } from '@/components/ui/Modal';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';

interface JobSite {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

export default function JobSitesScreen() {
  const router = useRouter();
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteLocation, setNewSiteLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'warning',
  });

  useEffect(() => {
    console.log('JobSitesScreen mounted, fetching job sites');
    fetchJobSites();
  }, []);

  const fetchJobSites = async () => {
    console.log('[API] Fetching job sites list');
    setLoading(true);
    
    try {
      const response = await authenticatedGet<JobSite[]>('/api/job-sites');
      setJobSites(response);
      console.log('[API] Job sites loaded:', response.length);
    } catch (error: any) {
      console.error('[API] Error fetching job sites:', error);
      showModal('Error', error.message || 'Failed to load job sites', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const handleAddJobSite = async () => {
    const trimmedName = newSiteName.trim();
    const trimmedLocation = newSiteLocation.trim();
    
    if (!trimmedName) {
      showModal('Validation Error', 'Please enter job site name', 'warning');
      return;
    }

    if (!trimmedLocation) {
      showModal('Validation Error', 'Please enter job site location', 'warning');
      return;
    }

    console.log('[API] Adding new job site:', { name: trimmedName, location: trimmedLocation });
    setSaving(true);

    try {
      const response = await authenticatedPost<JobSite>('/api/job-sites', {
        name: trimmedName,
        location: trimmedLocation,
      });

      setJobSites([...jobSites, response]);
      showModal('Success', 'Job site added successfully', 'success');

      setNewSiteName('');
      setNewSiteLocation('');
      setShowAddModal(false);
    } catch (error: any) {
      console.error('[API] Error adding job site:', error);
      showModal('Error', error.message || 'Failed to add job site', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJobSite = async (siteId: string, siteName: string) => {
    console.log('[API] Deleting job site:', siteId);

    try {
      await authenticatedDelete<{ success: boolean }>(`/api/job-sites/${siteId}`);
      setJobSites(jobSites.filter(site => site.id !== siteId));
      showModal('Success', `${siteName} has been removed`, 'success');
    } catch (error: any) {
      console.error('[API] Error deleting job site:', error);
      showModal('Error', error.message || 'Failed to delete job site', 'error');
    }
  };

  const activeCount = jobSites.filter(s => s.isActive).length;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Job Sites',
          headerStyle: { backgroundColor: colors.clockBackground },
          headerTintColor: '#ffffff',
          headerBackTitle: 'Back',
        }}
      />

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{jobSites.length}</Text>
          <Text style={styles.statLabel}>Total Sites</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Sites</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.adminPrimary} />
          <Text style={styles.loadingText}>Loading job sites...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {jobSites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="map"
                android_material_icon_name="location-on"
                size={64}
                color="#b0c4de"
              />
              <Text style={styles.emptyText}>No job sites yet</Text>
              <Text style={styles.emptySubtext}>Add your first job site to get started</Text>
            </View>
          ) : (
            jobSites.map((site) => (
              <View key={site.id} style={styles.siteCard}>
                <View style={styles.siteHeader}>
                  <View style={[styles.siteIcon, { backgroundColor: `${colors.adminPrimary}20` }]}>
                    <IconSymbol
                      ios_icon_name="map.fill"
                      android_material_icon_name="location-on"
                      size={24}
                      color={colors.adminPrimary}
                    />
                  </View>
                  <View style={styles.siteInfo}>
                    <Text style={styles.siteName}>{site.name}</Text>
                    <View style={styles.locationRow}>
                      <IconSymbol
                        ios_icon_name="location.fill"
                        android_material_icon_name="place"
                        size={14}
                        color="#b0c4de"
                      />
                      <Text style={styles.siteLocation}>{site.location}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteJobSite(site.id, site.name)}
                  >
                    <IconSymbol
                      ios_icon_name="trash.fill"
                      android_material_icon_name="delete"
                      size={20}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <IconSymbol
          ios_icon_name="plus.circle.fill"
          android_material_icon_name="add-circle"
          size={24}
          color="#ffffff"
        />
        <Text style={styles.addButtonText}>Add Job Site</Text>
      </TouchableOpacity>

      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Job Site</Text>

            <Text style={styles.inputLabel}>Site Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Downtown Office Building"
              placeholderTextColor="#b0c4de"
              value={newSiteName}
              onChangeText={setNewSiteName}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 123 Main St, Downtown"
              placeholderTextColor="#b0c4de"
              value={newSiteLocation}
              onChangeText={setNewSiteLocation}
              autoCapitalize="words"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewSiteName('');
                  setNewSiteLocation('');
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddJobSite}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Site</Text>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.adminPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#b0c4de',
    textAlign: 'center',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#b0c4de',
    marginTop: 8,
  },
  siteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  siteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
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
  siteLocation: {
    fontSize: 14,
    color: '#b0c4de',
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.adminPrimary,
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
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b0c4de',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  saveButton: {
    backgroundColor: colors.adminPrimary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
