
import { StyleSheet } from 'react-native';

// CrewClock color palette - Orange for Crew, Deep Blue for Clock
export const colors = {
  // Crew Lead colors - Orange theme (energy, teamwork)
  crewLeadPrimary: '#ff6b35',
  crewLeadSecondary: '#ff8c42',
  crewLeadAccent: '#ffa552',
  crewLeadLight: '#ffe5d9',
  
  // Admin colors - Deep Blue theme (time, precision, depth)
  adminPrimary: '#003d5b',
  adminSecondary: '#005f8a',
  adminAccent: '#0077b6',
  adminLight: '#cce7f5',
  
  // Clock/Time colors - Deep Blue background
  clockBackground: '#001f3f',
  clockPrimary: '#003d5b',
  clockSecondary: '#005f8a',
  
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
