
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Image, ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';

// Helper to resolve image sources (handles both local and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('[Welcome] Screen mounted/updated:', { isLoading, isAuthenticated, hasUser: !!user });
    
    // Force screen to be visible after a short delay to prevent black screen
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user]);

  const crewText = 'Crew';
  const clockText = 'Clock';

  console.log('[Welcome] Rendering - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'isVisible:', isVisible);

  // Always render the container with background to prevent black screen
  // Show loading spinner during initial load or when authenticated (redirecting)
  const showLoading = isLoading || (isAuthenticated && user);
  
  if (showLoading) {
    const loadingText = isLoading ? 'Loading...' : 'Redirecting...';
    console.log('[Welcome] Showing loading state:', loadingText);
    
    return (
      <View style={[styles.container, { opacity: isVisible ? 1 : 0 }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.content, { justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={colors.crewLeadPrimary} />
            <Text style={[styles.subtitle, { marginTop: 16 }]}>{loadingText}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Show login options when not loading and not authenticated
  console.log('[Welcome] Showing login options');
  
  return (
    <View style={[styles.container, { opacity: isVisible ? 1 : 0 }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={resolveImageSource(require('@/assets/images/626f7963-3d10-4d90-9b55-8ec79075913c.png'))}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.logoContainer}>
              <Text style={styles.crewText}>{crewText}</Text>
              <Text style={styles.clockText}>{clockText}</Text>
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.clockBackground,
  },
  safeArea: {
    flex: 1,
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
  logoImage: {
    width: 180,
    height: 180,
    marginBottom: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  crewText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.crewLeadPrimary,
  },
  clockText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 8,
    opacity: 0.9,
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
    color: '#ffffff',
    marginTop: 32,
    opacity: 0.8,
  },
});
