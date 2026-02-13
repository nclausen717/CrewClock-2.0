
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
import { Modal } from '@/components/ui/Modal';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';

interface Employee {
  id: string;
  name: string;
  email: string | null;
  isCrewLeader: boolean;
  createdAt: string;
}

export default function EmployeesScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [isCrewLeader, setIsCrewLeader] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'warning',
  });

  useEffect(() => {
    console.log('EmployeesScreen mounted, fetching employees');
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    console.log('[API] Fetching employees list');
    setLoading(true);
    
    try {
      const response = await authenticatedGet<Employee[]>('/api/employees');
      setEmployees(response);
      console.log('[API] Employees loaded:', response.length);
    } catch (error: any) {
      console.error('[API] Error fetching employees:', error);
      showModal('Error', error.message || 'Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const handleAddEmployee = async () => {
    const trimmedName = newEmployeeName.trim();
    const trimmedEmail = newEmployeeEmail.trim();
    
    if (!trimmedName) {
      showModal('Validation Error', 'Please enter employee name', 'warning');
      return;
    }

    if (isCrewLeader && !trimmedEmail) {
      showModal('Validation Error', 'Email is required for crew leaders', 'warning');
      return;
    }

    console.log('[API] Adding new employee:', { name: trimmedName, email: trimmedEmail, isCrewLeader });
    setSaving(true);

    try {
      const payload: any = {
        name: trimmedName,
        isCrewLeader,
      };
      
      if (isCrewLeader && trimmedEmail) {
        payload.email = trimmedEmail;
      }

      const response = await authenticatedPost<{
        id: string;
        name: string;
        email: string | null;
        isCrewLeader: boolean;
        generatedPassword?: string | null;
      }>('/api/employees', payload);

      const newEmployee: Employee = {
        id: response.id,
        name: response.name,
        email: response.email,
        isCrewLeader: response.isCrewLeader,
        createdAt: new Date().toISOString(),
      };

      setEmployees([...employees, newEmployee]);
      
      if (isCrewLeader && response.generatedPassword) {
        showModal(
          'Crew Leader Created',
          `Employee added successfully!\n\nLogin Credentials:\nEmail: ${trimmedEmail}\nPassword: ${response.generatedPassword}\n\nPlease save these credentials securely.`,
          'success'
        );
      } else {
        showModal('Success', 'Employee added successfully', 'success');
      }

      setNewEmployeeName('');
      setNewEmployeeEmail('');
      setIsCrewLeader(false);
      setShowAddModal(false);
    } catch (error: any) {
      console.error('[API] Error adding employee:', error);
      showModal('Error', error.message || 'Failed to add employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    console.log('[API] Deleting employee:', employeeId);

    try {
      await authenticatedDelete<{ success: boolean }>(`/api/employees/${employeeId}`);
      setEmployees(employees.filter(emp => emp.id !== employeeId));
      showModal('Success', `${employeeName} has been removed`, 'success');
    } catch (error: any) {
      console.error('[API] Error deleting employee:', error);
      showModal('Error', error.message || 'Failed to delete employee', 'error');
    }
  };

  const crewLeaderCount = employees.filter(e => e.isCrewLeader).length;
  const regularEmployeeCount = employees.filter(e => !e.isCrewLeader).length;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Manage Employees',
          headerStyle: { backgroundColor: colors.clockBackground },
          headerTintColor: '#ffffff',
          headerBackTitle: 'Back',
        }}
      />

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total Employees</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{crewLeaderCount}</Text>
          <Text style={styles.statLabel}>Crew Leaders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{regularEmployeeCount}</Text>
          <Text style={styles.statLabel}>Workers</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.crewLeadPrimary} />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {employees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="person.2.slash"
                android_material_icon_name="group"
                size={64}
                color="#b0c4de"
              />
              <Text style={styles.emptyText}>No employees yet</Text>
              <Text style={styles.emptySubtext}>Add your first employee to get started</Text>
            </View>
          ) : (
            employees.map((employee) => {
              const badgeColor = employee.isCrewLeader ? colors.crewLeadPrimary : colors.adminPrimary;
              const badgeText = employee.isCrewLeader ? 'Crew Leader' : 'Worker';
              
              return (
                <View key={employee.id} style={styles.employeeCard}>
                  <View style={styles.employeeHeader}>
                    <View style={[styles.employeeAvatar, { backgroundColor: `${badgeColor}20` }]}>
                      <IconSymbol
                        ios_icon_name={employee.isCrewLeader ? 'star.fill' : 'person.fill'}
                        android_material_icon_name={employee.isCrewLeader ? 'star' : 'person'}
                        size={24}
                        color={badgeColor}
                      />
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={styles.employeeName}>{employee.name}</Text>
                      {employee.email && (
                        <Text style={styles.employeeEmail}>{employee.email}</Text>
                      )}
                      <View style={[styles.badge, { backgroundColor: `${badgeColor}20` }]}>
                        <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteEmployee(employee.id, employee.name)}
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
              );
            })
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
        <Text style={styles.addButtonText}>Add Employee</Text>
      </TouchableOpacity>

      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Employee</Text>

            <Text style={styles.inputLabel}>Employee Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              placeholderTextColor="#b0c4de"
              value={newEmployeeName}
              onChangeText={setNewEmployeeName}
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsCrewLeader(!isCrewLeader)}
            >
              <View style={[styles.checkbox, isCrewLeader && styles.checkboxChecked]}>
                {isCrewLeader && (
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={16}
                    color="#ffffff"
                  />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Designate as Crew Leader</Text>
            </TouchableOpacity>

            {isCrewLeader && (
              <>
                <Text style={styles.inputLabel}>Email (for login)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  placeholderTextColor="#b0c4de"
                  value={newEmployeeEmail}
                  onChangeText={setNewEmployeeEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.helperText}>
                  A password will be automatically generated
                </Text>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewEmployeeName('');
                  setNewEmployeeEmail('');
                  setIsCrewLeader(false);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddEmployee}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Employee</Text>
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
    color: colors.crewLeadPrimary,
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
  employeeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: '#b0c4de',
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.crewLeadPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.crewLeadPrimary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  helperText: {
    fontSize: 12,
    color: '#b0c4de',
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
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
    backgroundColor: colors.crewLeadPrimary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
