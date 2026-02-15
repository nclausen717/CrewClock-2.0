
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Modal } from '@/components/ui/Modal';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { authenticatedGet, getToken, BACKEND_URL } from '@/utils/api';

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
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);

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

  const getSaturday = (monday: Date): Date => {
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    return saturday;
  };

  const getDateRangeDisplay = (): string => {
    if (selectedType === 'daily') {
      return formatDateDisplay(selectedDate);
    } else if (selectedType === 'weekly') {
      const monday = getMonday(selectedDate);
      const saturday = getSaturday(monday);
      return `${formatDateDisplay(monday)} - ${formatDateDisplay(saturday)}`;
    } else {
      return selectedDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long'
      });
    }
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
    console.log('🔵 User clicked Export CSV button');
    console.log('🔵 Platform:', Platform.OS);
    console.log('🔵 Report data exists:', !!reportData);
    console.log('🔵 Selected employee ID:', selectedEmployeeId);
    
    if (!reportData) {
      console.log('⚠️ No report data available - showing warning modal');
      showModal('No Report', 'Please generate a report first.', 'warning');
      return;
    }

    setLoading(true);
    console.log('🔵 Starting CSV export process...');

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

      console.log('🔵 CSV endpoint:', endpoint);
      console.log('🔵 CSV filename:', filename);
      
      const token = await getToken();
      const url = `${BACKEND_URL}${endpoint}`;
      
      console.log('🔵 Fetching CSV from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('🔵 CSV response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to download CSV: ${response.status}`);
      }

      const csvContent = await response.text();
      console.log('🔵 CSV content length:', csvContent.length, 'characters');
      console.log('🔵 CSV preview (first 200 chars):', csvContent.substring(0, 200));

      if (Platform.OS === 'web') {
        console.log('🌐 Web platform detected - initiating browser download');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const blobUrl = URL.createObjectURL(blob);
        console.log('🌐 Blob URL created:', blobUrl);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        console.log('🌐 Download link added to DOM, triggering click...');
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        console.log('✅ Web download complete - file should be downloading to browser');
        showModal('Export Successful', `Report exported as ${filename}`, 'success');
      } else {
        console.log('📱 Native platform detected - saving to file system');
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        console.log('📱 File URI:', fileUri);
        
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        console.log('📱 File written successfully');
        
        const sharingAvailable = await Sharing.isAvailableAsync();
        console.log('📱 Sharing available:', sharingAvailable);
        
        if (sharingAvailable) {
          console.log('📱 Opening share dialog...');
          await Sharing.shareAsync(fileUri);
          console.log('✅ Share dialog opened successfully');
          showModal('Export Successful', `Report exported as ${filename}`, 'success');
        } else {
          console.log('⚠️ Sharing not available - file saved to:', fileUri);
          showModal('Export Complete', `Report saved to ${fileUri}`, 'success');
        }
      }
    } catch (error: any) {
      console.error('❌ Error exporting CSV:', error);
      console.error('❌ Error details:', error.message, error.stack);
      showModal('Export Failed', error.message || 'Failed to export CSV. Please try again.', 'error');
    } finally {
      setLoading(false);
      console.log('🔵 CSV export process complete');
    }
  };

  const onDateChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    console.log('Date picker changed:', { eventType: event?.type, date, platform: Platform.OS });
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      
      if (event.type === 'set' && date) {
        console.log('Android: Date selected and confirmed:', date);
        setSelectedDate(date);
        setReportData(null);
      } else if (event.type === 'dismissed') {
        console.log('Android: Date picker dismissed without selection');
      }
    } else {
      if (date) {
        console.log('iOS: Date updated to:', date);
        setSelectedDate(date);
        setReportData(null);
      }
    }
  }, []);

  const closeDatePicker = useCallback(() => {
    console.log('Closing date picker (iOS Done button)');
    setShowDatePicker(false);
  }, []);

  const handleWebDateChange = useCallback((event: any) => {
    const dateString = event.target.value;
    console.log('Web date input changed:', dateString);
    
    if (dateString) {
      const newDate = new Date(dateString + 'T00:00:00');
      console.log('Web: Date updated to:', newDate);
      setSelectedDate(newDate);
      setReportData(null);
    }
  }, []);

  const handleOpenDatePicker = useCallback(() => {
    console.log('User tapped Select Date button');
    setShowDatePicker(true);
  }, []);

  const handleTypeChange = useCallback((type: ReportType) => {
    console.log('User selected report type:', type);
    setSelectedType(type);
    setReportData(null);
  }, []);

  const handleEmployeeChange = useCallback((employeeId: string) => {
    console.log('User selected employee filter:', employeeId);
    setSelectedEmployeeId(employeeId);
    setReportData(null);
    setShowEmployeePicker(false);
  }, []);

  const getSelectedEmployeeName = (): string => {
    if (selectedEmployeeId === 'all') {
      return 'All Employees';
    }
    const employee = employees.find(emp => emp.id === selectedEmployeeId);
    return employee ? employee.name : 'All Employees';
  };

  const dateRangeDisplay = getDateRangeDisplay();
  const reportTypeDisplay = selectedType === 'daily' ? 'Daily' : selectedType === 'weekly' ? 'Weekly' : 'Monthly';
  const selectedEmployeeName = getSelectedEmployeeName();

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
              onPress={() => handleTypeChange('daily')}
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
              onPress={() => handleTypeChange('weekly')}
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
              onPress={() => handleTypeChange('monthly')}
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
            <View style={styles.employeeButton}>
              <ActivityIndicator color={colors.crewLeadPrimary} />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.employeeButton}
                onPress={() => setShowEmployeePicker(!showEmployeePicker)}
              >
                <IconSymbol
                  ios_icon_name="person.circle"
                  android_material_icon_name="person"
                  size={24}
                  color={colors.crewLeadPrimary}
                />
                <Text style={styles.employeeButtonText}>{selectedEmployeeName}</Text>
                <IconSymbol
                  ios_icon_name="chevron.down"
                  android_material_icon_name="arrow-drop-down"
                  size={24}
                  color="#b0c4de"
                />
              </TouchableOpacity>

              {showEmployeePicker && (
                <View style={styles.employeePickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.employeeOption,
                      selectedEmployeeId === 'all' && styles.employeeOptionSelected
                    ]}
                    onPress={() => handleEmployeeChange('all')}
                  >
                    <Text style={[
                      styles.employeeOptionText,
                      selectedEmployeeId === 'all' && styles.employeeOptionTextSelected
                    ]}>
                      All Employees
                    </Text>
                    {selectedEmployeeId === 'all' && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={20}
                        color={colors.crewLeadPrimary}
                      />
                    )}
                  </TouchableOpacity>

                  {employees.map((employee) => (
                    <TouchableOpacity
                      key={employee.id}
                      style={[
                        styles.employeeOption,
                        selectedEmployeeId === employee.id && styles.employeeOptionSelected
                      ]}
                      onPress={() => handleEmployeeChange(employee.id)}
                    >
                      <Text style={[
                        styles.employeeOptionText,
                        selectedEmployeeId === employee.id && styles.employeeOptionTextSelected
                      ]}>
                        {employee.name}
                      </Text>
                      {selectedEmployeeId === employee.id && (
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
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date Range</Text>
          <View style={styles.dateRangeInfo}>
            <Text style={styles.dateRangeLabel}>
              {selectedType === 'daily' && 'Selected Date:'}
              {selectedType === 'weekly' && 'Week (Mon-Sat):'}
              {selectedType === 'monthly' && 'Selected Month:'}
            </Text>
            <Text style={styles.dateRangeValue}>{dateRangeDisplay}</Text>
          </View>
          
          {Platform.OS === 'web' ? (
            <View style={styles.webDatePickerContainer}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={24}
                color={colors.crewLeadPrimary}
              />
              <TextInput
                style={styles.webDateInput}
                // @ts-expect-error - Web-specific props for date input
                type="date"
                value={formatDateForAPI(selectedDate)}
                onChange={handleWebDateChange}
                max={formatDateForAPI(new Date())}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={handleOpenDatePicker}
              >
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={24}
                  color={colors.crewLeadPrimary}
                />
                <Text style={styles.dateButtonText}>
                  {selectedType === 'daily' && 'Change Date'}
                  {selectedType === 'weekly' && 'Change Week'}
                  {selectedType === 'monthly' && 'Change Month'}
                </Text>
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
                    textColor="#ffffff"
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
            </>
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
                  color="#ffffff"
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
  employeeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  employeeButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  employeePickerContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  employeeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  employeeOptionSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  employeeOptionText: {
    fontSize: 16,
    color: '#b0c4de',
    fontWeight: '500',
  },
  employeeOptionTextSelected: {
    color: colors.crewLeadPrimary,
    fontWeight: '600',
  },
  dateRangeInfo: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dateRangeLabel: {
    fontSize: 13,
    color: '#b0c4de',
    marginBottom: 6,
  },
  dateRangeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.crewLeadPrimary,
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
  webDatePickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webDateInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  } as any,
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
    color: '#ffffff',
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
