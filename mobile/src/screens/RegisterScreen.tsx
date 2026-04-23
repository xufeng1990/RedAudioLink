import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import TermsOfUseScreen from './TermsOfUseScreen';
import { registerApi } from '../api/auth';

interface Props {
  onRegister: () => void;
  onBack: () => void;
}

type SubScreen = 'form' | 'privacy' | 'terms';

export default function RegisterScreen({ onRegister, onBack }: Props) {
  const [businessId, setBusinessId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [subScreen, setSubScreen] = useState<SubScreen>('form');
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2000);
  };

  const handleCheckboxPress = () => {
    if (!hasReadPrivacy || !hasReadTerms) {
      showToast('error', 'Please read Privacy Policy and Terms of Use first');
      return;
    }
    setAgreed(!agreed);
  };

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleRegister = async () => {
    if (!businessId.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      showToast('error', 'Please fill out all required fields');
      return;
    }
    if (!isValidEmail(email.trim())) {
      showToast('error', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      showToast('error', 'Passwords do not match. Please confirm your password');
      return;
    }
    if (!agreed) {
      showToast('error', 'Please agree to the Privacy Policy and Terms of Use');
      return;
    }
    setLoading(true);
    try {
      const result = await registerApi({
        email: email.trim(),
        password,
        businessId: businessId.trim(),
      });
      setLoading(false);
      // Registration is treated as logged-in only if a token came back.
      if (result?.token) {
        showToast('success', 'Registration successful !');
        setTimeout(() => {
          onRegister();
        }, 800);
      } else {
        showToast('error', 'Registration failed. Please try again');
      }
    } catch (err: any) {
      setLoading(false);
      showToast('error', err?.message || 'Registration failed. Please try again');
    }
  };

  if (subScreen === 'privacy') {
    return (
      <PrivacyPolicyScreen
        onBack={() => {
          setHasReadPrivacy(true);
          setSubScreen('form');
        }}
      />
    );
  }

  if (subScreen === 'terms') {
    return (
      <TermsOfUseScreen
        onBack={() => {
          setHasReadTerms(true);
          setSubScreen('form');
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register</Text>
        <View style={styles.backBtn} />
      </View>

      {toast && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Text style={styles.toastIcon}>{toast.type === 'success' ? '✅' : '⊘'}</Text>
          <Text style={[styles.toastText, toast.type === 'success' ? styles.toastTextSuccess : styles.toastTextError]}>
            {toast.message}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Business ID</Text>
              <TextInput
                style={styles.fieldInput}
                value={businessId}
                onChangeText={setBusinessId}
                placeholder="Please Enter"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Please Enter"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Login password</Text>
              <TextInput
                style={styles.fieldInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Please Enter"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Confirm Login Password</Text>
              <TextInput
                style={styles.fieldInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Please Enter"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.agreeRow}>
            <TouchableOpacity
              onPress={handleCheckboxPress}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
            <Text style={styles.agreeText}>
              Read and agree{' '}
              <Text style={styles.agreeLink} onPress={() => setSubScreen('privacy')}>Privacy Policy</Text>
              {' '}and{' '}
              <Text style={styles.agreeLink} onPress={() => setSubScreen('terms')}>Terms of Use</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  backBtn: {
    width: 40,
    paddingVertical: 4,
  },
  backIcon: {
    fontSize: 22,
    color: '#999',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
    position: 'absolute',
    top: 100,
    zIndex: 100,
  },
  toastSuccess: {
    backgroundColor: '#E8F5E9',
  },
  toastError: {
    backgroundColor: '#FDECEA',
  },
  toastIcon: {
    fontSize: 16,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toastTextSuccess: {
    color: '#2E7D32',
  },
  toastTextError: {
    color: '#C62828',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  fieldGroup: {
    backgroundColor: Colors.white,
  },
  field: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 2,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 20,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 18,
  },
  agreeLink: {
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 40,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
