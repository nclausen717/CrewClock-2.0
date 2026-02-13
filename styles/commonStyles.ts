
import { StyleSheet } from 'react-native';

// CrewClock color palette - professional work/time tracking theme
export const colors = {
  // Crew Lead colors - Blue theme (trust, reliability)
  crewLeadPrimary: '#2563eb',
  crewLeadSecondary: '#3b82f6',
  crewLeadAccent: '#60a5fa',
  crewLeadLight: '#dbeafe',
  
  // Admin colors - Purple theme (authority, management)
  adminPrimary: '#7c3aed',
  adminSecondary: '#8b5cf6',
  adminAccent: '#a78bfa',
  adminLight: '#ede9fe',
  
  // Neutral colors
  background: '#ffffff',
  backgroundDark: '#f9fafb',
  card: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  
  // Dark mode
  backgroundDarkMode: '#111827',
  cardDarkMode: '#1f2937',
  textDarkMode: '#f9fafb',
  textSecondaryDarkMode: '#9ca3af',
  borderDarkMode: '#374151',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
