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
} from 'react-native';
import { Colors } from '../theme/colors';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import { loginApi } from '../api/auth';

interface Props {
  onLogin: () => void;
  onBack: () => void;
}

export default function LoginScreen({ onLogin, onBack }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleLogin = async () => {
    if (!email.trim() && !password.trim()) {
      showToast('error', 'Please enter your email and password');
      return;
    }
    if (!email.trim()) {
      showToast('error', 'Please enter your email address');
      return;
    }
    if (!isValidEmail(email.trim())) {
      showToast('error', 'Please enter a valid email address');
      return;
    }
    if (!password.trim()) {
      showToast('error', 'Please enter your password');
      return;
    }
    if (password.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await loginApi({ email: email.trim(), password });
      setLoading(false);
      // Auth state is established by the token returned from the server,
      // not by the email. loginApi has already persisted the token.
      if (result?.token) {
        onLogin();
      } else {
        showToast('error', 'Login failed. Please try again');
      }
    } catch (err: any) {
      setLoading(false);
      showToast('error', err?.message || 'Login failed. Please try again');
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPasswordScreen
        onBack={() => setShowForgotPassword(false)}
        onResetSuccess={() => setShowForgotPassword(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log In</Text>
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
        <View style={styles.fieldGroup}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.fieldInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Please Enter"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
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
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.loginButtonText}>Log in</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotButton} onPress={() => setShowForgotPassword(true)}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
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
    marginHorizontal: 0,
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
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 30,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '400',
  },
});
