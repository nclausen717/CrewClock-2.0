
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';

export default function CompanyLoginScreen() {
  const router = useRouter();
  const { companyLogin, companyRegister } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success',
  });

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (__DEV__) console.log('User tapped submit button', { isLogin, email });
    
    if (!email || !password || (!isLogin && !name)) {
      showModal('Missing Information', 'Please fill in all required fields', 'error');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showModal('Invalid Email', 'Please enter a valid email address', 'error');
      return;
    }

    setLoading(true);
    
    try {
      if (isLogin) {
        // Login
        await companyLogin(email, password);
        if (__DEV__) console.log('Company authentication successful, navigating to role selection');
        router.replace('/');
      } else {
        // Register
        await companyRegister(email, password, name, city, phone);
        if (__DEV__) console.log('Company registration successful, navigating to role selection');
        router.replace('/');
      }
    } catch (error: any) {
      if (__DEV__) console.error('Company authentication error:', error);
      const errorMessage = error.message || 'Authentication failed. Please try again.';
      showModal('Authentication Failed', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    if (__DEV__) console.log('User toggled between login and register');
    setIsLogin(!isLogin);
  };

  const modeText = isLogin ? 'Company Login' : 'Company Registration';
  const switchText = isLogin ? "Don't have an account? Register" : 'Already have an account? Login';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: modeText,
          headerStyle: {
            backgroundColor: colors.clockBackground,
          },
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Image
                source={resolveImageSource(require('@/assets/images/626f7963-3d10-4d90-9b55-8ec79075913c.png'))}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View style={styles.logoContainer}>
                <Text style={styles.crewText}>Crew</Text>
                <Text style={styles.clockText}>Clock</Text>
              </View>
              <Text style={styles.subtitle}>Company {isLogin ? 'Login' : 'Registration'}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="company@example.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {!isLogin && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Company Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Acme Construction"
                      placeholderTextColor="#999"
                      value={name}
                      onChangeText={setName}
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>City (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="New York"
                      placeholderTextColor="#999"
                      value={city}
                      onChangeText={setCity}
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="555-0100"
                      placeholderTextColor="#999"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      editable={!loading}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#FF6B35', '#F7931E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>{modeText}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleMode} disabled={loading} style={styles.switchButton}>
                <Text style={styles.switchText}>{switchText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  crewText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.crewLeadPrimary,
  },
  clockText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
    opacity: 0.9,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
});
