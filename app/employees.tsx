
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
    if (!name.trim()) {
      showModal('Error', 'Enter name', 'warning');
      return;
    }
    if (isCrewLeader && !email.trim()) {
      showModal('Error', 'Email required for crew leaders', 'warning');
      return;
    }
    if (isCrewLeader) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showModal('Error', 'Valid email required', 'warning');
        return;
      }
    }

    setAddingEmployee(true);
    try {
      const body: any = {
        name: name.trim(),
        isCrewLeader
      };
      
      if (isCrewLeader) {
        body.email = email.trim();
      }
      
      const response = await authenticatedPost<{employee: Employee; generatedPassword?: string}>('/api/employees', body);
      
      if (response.generatedPassword) {
        showModal('Success', `Crew leader "${name}" created!\n\nGenerated Password: ${response.generatedPassword}\n\nShare this password with the crew leader.`, 'success');
      } else {
        showModal('Success', `"${name}" added successfully`, 'success');
      }
      
      setName('');
      setEmail('');
      setUsername('');
      setPassword('');
      setPhone('');
      setCrewId(null);
      setIsCrewLeader(false);
      fetchEmployees();
    } catch (error: any) {
      showModal('Error', error?.message || 'Failed to add employee', 'error');
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
          
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={name}
            onChangeText={setName}
          />

          {isCrewLeader ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Phone"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <ScrollView horizontal style={styles.crewTagsContainer}>
                {crews.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.tag, crewId === c.id && styles.tagOn]}
                    onPress={() => setCrewId(crewId === c.id ? null : c.id)}
                  >
                    <Text style={{color: '#fff'}}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity
            style={styles.toggle}
            onPress={() => setIsCrewLeader(!isCrewLeader)}
          >
            <Text style={{color: '#fff'}}>Crew Leader</Text>
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
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: -8,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  crewTagsContainer: {
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  tagOn: {
    backgroundColor: colors.crewLeadPrimary,
  },
  toggle: {
    backgroundColor: colors.crewLeadPrimary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
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
