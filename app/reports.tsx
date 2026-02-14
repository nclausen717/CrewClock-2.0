
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Modal } from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { authenticatedGet, getToken, BACKEND_URL } from '@/utils/api';
import { Picker } from '@react-native-picker/picker';

interface ReportEmployee {
  employeeId: string;
  employeeName: string;
  hoursWorked?: number;
  regularHours?: number;
  overtimeHours?: number;
  totalHours?: number;
  hasOvertime?: boolean;
  jobSites?: { jobSiteId: string; jobSiteName: string; hours: number }[];
}

interface ReportJobSite {
  jobSiteId: string;
  jobSiteName: string;
  totalHours: number;
  employees?: { employeeId: string; employeeName: string; hours: number }[];
}

interface DailyReport {
  date: string;
  totalHours: number;
  employees: ReportEmployee[];
  jobSites: ReportJobSite[];
}

interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  employees: ReportEmployee[];
  jobSites: ReportJobSite[];
}

interface PayPeriod {
  periodStart: string;
  periodEnd: string;
  employees: ReportEmployee[];
}

interface MonthlyReport {
  month: string;
  year: number;
  totalHours: number;
  payPeriods: PayPeriod[];
  employees: ReportEmployee[];
  jobSites: ReportJobSite[];
}

type ReportType = 'daily' | 'weekly' | 'monthly';

interface Employee {
  id: string;
  name: string;
  email: string | null;
  isCrewLeader: boolean;
}

export default function ReportsScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ReportType>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<DailyReport | WeeklyReport | MonthlyReport | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', message: '', type: 'info' as 'info' | 'error' | 'success' | 'warning' });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const fetchEmployees = useCallback(async () => {
    console.log('Fetching employees for report filtering');
    setLoadingEmployees(true);
    try {
      const response = await authenticatedGet<Employee[]>('/api/employees');
      setEmployees(response);
      console.log('[API] Employees fetched:', response.length);
    } catch (error: any) {
      console.error('[API] Error fetching employees:', error);
      showModal('Error', 'Failed to load employees. Please try again.', 'error');
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const handleGenerateReport = async () => {
    console.log('User tapped Generate Report button', { type: selectedType, date: selectedDate, employeeId: selectedEmployeeId });
    setLoading(true);
    setReportData(null);

    try {
      let endpoint = '';
      const employeeParam = selectedEmployeeId !== 'all' ? `&employeeId=${selectedEmployeeId}` : '';
      
      if (selectedType === 'daily') {
        const dateStr = formatDateForAPI(selectedDate);
        endpoint = `/api/reports/daily?date=${dateStr}${employeeParam}`;
      } else if (selectedType === 'weekly') {
        const monday = getMonday(selectedDate);
        const dateStr = formatDateForAPI(monday);
        endpoint = `/api/reports/weekly?startDate=${dateStr}${employeeParam}`;
      } else if (selectedType === 'monthly') {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        endpoint = `/api/reports/monthly?year=${year}&month=${month}${employeeParam}`;
      }

      console.log('[API] Fetching report from:', endpoint);
      
      const response = await authenticatedGet<DailyReport | WeeklyReport | MonthlyReport>(endpoint);
      setReportData(response);
      
      showModal('Report Generated', 'Report has been generated successfully.', 'success');
    } catch (error: any) {
      console.error('[API] Error generating report:', error);
      showModal('Error', error.message || 'Failed to generate report. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    console.log('User tapped Export CSV button', { employeeId: selectedEmployeeId });
    
    if (!reportData) {
      showModal('No Report', 'Please generate a report first.', 'warning');
      return;
    }

    setLoading(true);

    try {
      let endpoint = '';
      let filename = '';
      const employeeParam = selectedEmployeeId !== 'all' ? `&employeeId=${selectedEmployeeId}` : '';
      
      if (selectedType === 'daily') {
        const dateStr = formatDateForAPI(selectedDate);
        endpoint = `/api/reports/daily/csv?date=${dateStr}${employeeParam}`;
        filename = `daily-report-${dateStr}.csv`;
      } else if (selectedType === 'weekly') {
        const monday = getMonday(selectedDate);
        const dateStr = formatDateForAPI(monday);
        endpoint = `/api/reports/weekly/csv?startDate=${dateStr}${employeeParam}`;
        filename = `weekly-report-${dateStr}.csv`;
      } else if (selectedType === 'monthly') {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        endpoint = `/api/reports/monthly/csv?year=${year}&month=${month}${employeeParam}`;
        filename = `monthly-report-${year}-${String(month).padStart(2, '0')}.csv`;
      }

      console.log('[API] Downloading CSV from:', endpoint);
      
      // Fetch CSV content from backend
      const token = await getToken();
      const url = `${BACKEND_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download CSV: ${response.status}`);
      }

      const csvContent = await response.text();
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        showModal('Export Successful', `Report exported as ${filename}`, 'success');
      } else {
        showModal('Export Complete', `Report saved to ${fileUri}`, 'success');
      }
    } catch (error: any) {
      console.error('[API] Error exporting CSV:', error);
      showModal('Export Failed', error.message || 'Failed to export CSV. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    console.log('Date picker changed:', { eventType: event?.type, date });
    
    // On Android, the picker closes automatically after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      
      // Update the date if one was selected (user didn't cancel)
      if (date && event.type !== 'dismissed') {
        setSelectedDate(date);
        console.log('Date updated to:', date);
      }
    } else {
      // On iOS, always update the date as the user scrolls through the picker
      if (date) {
        setSelectedDate(date);
        console.log('Date updated to:', date);
      }
    }
  };

  const closeDatePicker = () => {
    console.log('Closing date picker');
    setShowDatePicker(false);
  };

  const reportTypeDisplay = selectedType === 'daily' ? 'Daily' : selectedType === 'weekly' ? 'Weekly' : 'Monthly';
  const dateDisplay = formatDateDisplay(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Reports',
          headerStyle: { backgroundColor: colors.clockBackground },
          headerTintColor: '#ffffff',
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Type</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'daily' && styles.typeButtonActive]}
              onPress={() => setSelectedType('daily')}
            >
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={20}
                color={selectedType === 'daily' ? '#ffffff' : '#b0c4de'}
              />
              <Text style={[styles.typeButtonText, selectedType === 'daily' && styles.typeButtonTextActive]}>
                Daily
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'weekly' && styles.typeButtonActive]}
              onPress={() => setSelectedType('weekly')}
            >
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="date-range"
                size={20}
                color={selectedType === 'weekly' ? '#ffffff' : '#b0c4de'}
              />
              <Text style={[styles.typeButtonText, selectedType === 'weekly' && styles.typeButtonTextActive]}>
                Weekly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'monthly' && styles.typeButtonActive]}
              onPress={() => setSelectedType('monthly')}
            >
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="event"
                size={20}
                color={selectedType === 'monthly' ? '#ffffff' : '#b0c4de'}
              />
              <Text style={[styles.typeButtonText, selectedType === 'monthly' && styles.typeButtonTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filter by Employee</Text>
          {loadingEmployees ? (
            <View style={styles.pickerContainer}>
              <ActivityIndicator color={colors.crewLeadPrimary} />
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedEmployeeId}
                onValueChange={(itemValue) => setSelectedEmployeeId(itemValue)}
                style={styles.picker}
                dropdownIconColor="#b0c4de"
              >
                <Picker.Item label="All Employees" value="all" />
                {employees.map((employee) => (
                  <Picker.Item key={employee.id} label={employee.name} value={employee.id} />
                ))}
              </Picker>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              console.log('User tapped Select Date button');
              setShowDatePicker(true);
            }}
          >
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={24}
              color={colors.crewLeadPrimary}
            />
            <Text style={styles.dateButtonText}>{dateDisplay}</Text>
            <IconSymbol
              ios_icon_name="chevron.down"
              android_material_icon_name="arrow-drop-down"
              size={24}
              color="#b0c4de"
            />
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.datePickerDoneButton}
                  onPress={closeDatePicker}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="doc.text.fill"
                android_material_icon_name="description"
                size={24}
                color="#ffffff"
              />
              <Text style={styles.generateButtonText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>

        {reportData && (
          <View style={styles.reportContainer}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>{reportTypeDisplay} Report</Text>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleExportCSV}
                disabled={loading}
              >
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="file-download"
                  size={20}
                  color={colors.adminPrimary}
                />
                <Text style={styles.exportButtonText}>Export CSV</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>{reportData.totalHours.toFixed(1)}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Employees</Text>
              {reportData.employees.map((employee, index) => (
                <View key={index} style={styles.employeeCard}>
                  <View style={styles.employeeHeader}>
                    <Text style={styles.employeeName}>{employee.employeeName}</Text>
                    {employee.hasOvertime && (
                      <View style={styles.overtimeBadge}>
                        <Text style={styles.overtimeText}>OT</Text>
                      </View>
                    )}
                  </View>
                  
                  {selectedType === 'daily' && (
                    <Text style={styles.employeeHours}>Hours: {employee.hoursWorked?.toFixed(1)}</Text>
                  )}
                  
                  {(selectedType === 'weekly' || selectedType === 'monthly') && (
                    <>
                      <View style={styles.hoursRow}>
                        <Text style={styles.hoursLabel}>Regular:</Text>
                        <Text style={styles.hoursValue}>{employee.regularHours?.toFixed(1)} hrs</Text>
                      </View>
                      <View style={styles.hoursRow}>
                        <Text style={styles.hoursLabel}>Overtime:</Text>
                        <Text style={[styles.hoursValue, employee.hasOvertime && styles.overtimeValue]}>
                          {employee.overtimeHours?.toFixed(1)} hrs
                        </Text>
                      </View>
                      <View style={styles.hoursRow}>
                        <Text style={styles.hoursLabelBold}>Total:</Text>
                        <Text style={styles.hoursValueBold}>{employee.totalHours?.toFixed(1)} hrs</Text>
                      </View>
                    </>
                  )}
                  
                  {employee.jobSites && employee.jobSites.length > 0 && (
                    <View style={styles.jobSitesContainer}>
                      <Text style={styles.jobSitesLabel}>Job Sites:</Text>
                      {employee.jobSites.map((site, siteIndex) => (
                        <Text key={siteIndex} style={styles.jobSiteText}>
                          • {site.jobSiteName} ({site.hours.toFixed(1)} hrs)
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Sites</Text>
              {reportData.jobSites.map((site, index) => (
                <View key={index} style={styles.jobSiteCard}>
                  <Text style={styles.jobSiteName}>{site.jobSiteName}</Text>
                  <Text style={styles.jobSiteHours}>{site.totalHours.toFixed(1)} hours</Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  typeButtonActive: {
    backgroundColor: colors.adminPrimary,
    borderColor: colors.adminPrimary,
  },
  typeButtonText: {
    fontSize: 14,
    color: '#b0c4de',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  datePickerContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  datePickerDoneButton: {
    marginTop: 12,
    backgroundColor: colors.crewLeadPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  datePickerDoneText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 50,
    justifyContent: 'center',
  },
  picker: {
    color: '#ffffff',
    backgroundColor: 'transparent',
  },
  generateButton: {
    backgroundColor: colors.crewLeadPrimary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  reportContainer: {
    marginTop: 8,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  exportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: colors.adminPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.adminPrimary,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 1,
    borderColor: colors.crewLeadPrimary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#b0c4de',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.crewLeadPrimary,
  },
  employeeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  overtimeBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overtimeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  employeeHours: {
    fontSize: 14,
    color: '#b0c4de',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hoursLabel: {
    fontSize: 14,
    color: '#b0c4de',
  },
  hoursLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  hoursValue: {
    fontSize: 14,
    color: '#b0c4de',
  },
  hoursValueBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  overtimeValue: {
    color: colors.warning,
    fontWeight: '600',
  },
  jobSitesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  jobSitesLabel: {
    fontSize: 13,
    color: '#b0c4de',
    marginBottom: 6,
  },
  jobSiteText: {
    fontSize: 13,
    color: '#b0c4de',
    marginLeft: 8,
    marginBottom: 2,
  },
  jobSiteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobSiteName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  jobSiteHours: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.crewLeadPrimary,
  },
});
