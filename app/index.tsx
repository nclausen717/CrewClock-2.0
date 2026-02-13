
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  // Auth Bootstrap: Check session and redirect if authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('[Welcome] User is authenticated, redirecting to home');
      router.replace('/(tabs)/(home)/');
    }
  }, [isLoading, isAuthenticated]);

  // Show loading while checking session
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={colors.crewLeadPrimary} />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="clock.fill"
            android_material_icon_name="schedule"
            size={80}
            color={colors.crewLeadPrimary}
          />
          <Text style={styles.title}>CrewClock</Text>
          <Text style={styles.subtitle}>Time Tracking Made Simple</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.crewLeadButton}
            onPress={() => {
              console.log('User tapped Crew Lead Login button');
              router.push('/login/crew-lead');
            }}
          >
            <LinearGradient
              colors={[colors.crewLeadPrimary, colors.crewLeadSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={24}
                color="#ffffff"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Crew Lead Login</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => {
              console.log('User tapped Admin Login button');
              router.push('/login/admin');
            }}
          >
            <LinearGradient
              colors={[colors.adminPrimary, colors.adminSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <IconSymbol
                ios_icon_name="shield.fill"
                android_material_icon_name="admin-panel-settings"
                size={24}
                color="#ffffff"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Admin Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Select your role to continue</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  crewLeadButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.crewLeadPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  adminButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.adminPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 32,
  },
});
