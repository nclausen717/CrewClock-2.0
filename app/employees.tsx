
import React, { useState, useEffect, useCallback } from 'react';
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
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { Modal } from '@/components/ui/Modal';

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
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isCrewLeader, setIsCrewLeader] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'warning',
    onConfirm: undefined as (() => void) | undefined,
    confirmText: 'OK',
  });

  // New state variables
  const [phone, setPhone] = useState('');
  const [crewId, setCrewId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [crews, setCrews] = useState<Array<{id: string; name: string}>>([]);

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

  const fetchEmployees = useCallback(async () => {
    console.log('[API] Fetching employees list');
    setLoading(true);
    
    try {
      const response = await authenticatedGet<Employee[]>('/api/employees');
      console.log('[API] Employees fetched:', response.length);
      setEmployees(response);
    } catch (error: any) {
      console.error('[API] Failed to fetch employees:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to load employees. Please try again.';
      showModal('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // New useEffect to fetch crews
  useEffect(() => {
    const fetchCrews = async () => {
      try {
        const response = await authenticatedGet('/api/crews');
        setCrews(response);
      } catch (error) {
        console.error('Failed to fetch crews:', error);
      }
    };
    fetchCrews();
  }, []);

  const handleAddEmployee = async () => {
    console.log('[API] User tapped Add Employee button', { name, email, isCrewLeader });
    
    if (!name.trim()) {
      showModal('Missing Information', 'Please enter employee name', 'warning');
      return;
    }

    // Email validation if provided
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showModal('Invalid Email', 'Please enter a valid email address', 'warning');
        return;
      }
    }

    setAddingEmployee(true);
    
    try {
      // Ensure email is null if empty, not an empty string
      const emailToSend = email.trim() === '' ? null : email.trim();
      
      const response = await authenticatedPost<{ 
        employee: Employee; 
        generatedPassword?: string;
      }>('/api/employees', {
        name: name.trim(),
        email: emailToSend,
        isCrewLeader,
      });

      console.log('[API] Employee added successfully:', response.employee);
      
      // Show success message with generated password if crew leader
      if (response.generatedPassword) {
        showModal(
          'Crew Leader Created',
          `Employee "${response.employee.name}" has been created as a crew leader.\n\nGenerated Password: ${response.generatedPassword}\n\nPlease save this password and share it with the crew leader.`,
          'success'
        );
      } else {
        showModal('Success', `Employee "${response.employee.name}" has been added successfully.`, 'success');
      }

      // Reset form
      setName('');
      setEmail('');
      setIsCrewLeader(false);
      
      // Refresh list
      fetchEmployees();
    } catch (error: any) {
      console.error('[API] Failed to add employee:', error);
      
      // Parse error message for better user feedback
      let errorMessage = 'Failed to add employee. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = 'An employee with this email already exists.';
        } else if (error.message.includes('email')) {
          errorMessage = 'Invalid email address.';
        } else {
          errorMessage = error.message;
        }
      } else if (error?.toString) {
        errorMessage = error.toString();
      }
      
      showModal('Error', errorMessage, 'error');
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleDeleteEmployee = (employeeId: string, employeeName: string) => {
    console.log('[API] User tapped delete for employee:', employeeName);
    
    showModal(
      'Confirm Delete',
      `Are you sure you want to delete "${employeeName}"? This action cannot be undone.`,
      'warning',
      async () => {
        console.log('[API] User confirmed delete for employee:', employeeName);
        setModalVisible(false);
        
        try {
          await authenticatedDelete(`/api/employees/${employeeId}`);
          console.log('[API] Employee deleted successfully');
          showModal('Success', `Employee "${employeeName}" has been deleted.`, 'success');
          fetchEmployees();
        } catch (error: any) {
          console.error('[API] Failed to delete employee:', error);
          const errorMessage = error?.message || error?.toString() || 'Failed to delete employee. Please try again.';
          showModal('Error', errorMessage, 'error');
        }
      },
      'Delete'
    );
  };

  const crewLeaderText = 'Crew Leader';
  const regularEmployeeText = 'Regular Employee';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Manage Employees',
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Add New Employee</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter employee name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsCrewLeader(!isCrewLeader)}
          >
            <View style={[styles.checkbox, isCrewLeader && styles.checkboxChecked]}>
              {isCrewLeader && (
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={18}
                  color="#ffffff"
                />
              )}
            </View>
            <Text style={styles.checkboxLabel}>{crewLeaderText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddEmployee}
            disabled={addingEmployee}
          >
            {addingEmployee ? (
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
                <Text style={styles.addButtonText}>Add Employee</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Employees</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.crewLeadPrimary} />
            </View>
          ) : employees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="person.slash"
                android_material_icon_name="person-off"
                size={48}
                color="#b0c4de"
              />
              <Text style={styles.emptyText}>No employees yet</Text>
            </View>
          ) : (
            employees.map((employee) => {
              const roleText = employee.isCrewLeader ? crewLeaderText : regularEmployeeText;
              const emailText = employee.email || 'No email';
              
              return (
                <View key={employee.id} style={styles.employeeCard}>
                  <View style={styles.employeeInfo}>
                    <View style={[
                      styles.employeeAvatar,
                      { backgroundColor: employee.isCrewLeader ? colors.crewLeadPrimary : colors.adminPrimary }
                    ]}>
                      <IconSymbol
                        ios_icon_name={employee.isCrewLeader ? 'person.fill' : 'person'}
                        android_material_icon_name="person"
                        size={24}
                        color="#ffffff"
                      />
                    </View>
                    <View style={styles.employeeDetails}>
                      <Text style={styles.employeeName}>{employee.name}</Text>
                      <Text style={styles.employeeEmail}>{emailText}</Text>
                      <View style={[
                        styles.roleBadge,
                        { backgroundColor: employee.isCrewLeader ? `${colors.crewLeadPrimary}20` : `${colors.adminPrimary}20` }
                      ]}>
                        <Text style={[
                          styles.roleText,
                          { color: employee.isCrewLeader ? colors.crewLeadPrimary : colors.adminPrimary }
                        ]}>
                          {roleText}
                        </Text>
                      </View>
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.crewLeadPrimary,
    borderColor: colors.crewLeadPrimary,
  },
  checkboxLabel: {
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
  employeeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeDetails: {
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
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
});
