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

interface Props {
  onBack: () => void;
  onResetSuccess: () => void;
}

type Step = 'email' | 'code' | 'newPassword';

export default function ForgotPasswordScreen({ onBack, onResetSuccess }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [countdown, setCountdown] = useState(0);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const REGISTERED_EMAILS = [
    'zhangsan@echotag.com',
    'admin@echotag.com',
    'demo@echotag.com',
    'test@echotag.com',
  ];

  const handleSendCode = () => {
    if (!email.trim()) {
      showToast('error', 'Please enter your email address');
      return;
    }
    if (!isValidEmail(email.trim())) {
      showToast('error', 'Please enter a valid email address');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const emailExists = REGISTERED_EMAILS.some(
        e => e.toLowerCase() === email.trim().toLowerCase()
      );
      if (!emailExists) {
        showToast('error', 'This email address is not registered');
        return;
      }
      showToast('success', 'Verification code sent to your email');
      startCountdown();
      setStep('code');
    }, 800);
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('success', 'Verification code resent to your email');
      startCountdown();
    }, 800);
  };

  const handleVerifyCode = () => {
    if (!code.trim()) {
      showToast('error', 'Please enter the verification code');
      return;
    }
    if (code.trim().length < 4) {
      showToast('error', 'Please enter a valid verification code');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (code.trim() === '1234' || code.trim().length >= 4) {
        setStep('newPassword');
      } else {
        showToast('error', 'Invalid verification code');
      }
    }, 600);
  };

  const handleResetPassword = () => {
    if (!newPassword.trim()) {
      showToast('error', 'Please enter your new password');
      return;
    }
    if (newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }
    if (!confirmPassword.trim()) {
      showToast('error', 'Please confirm your new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('success', 'Password reset successful !');
      setTimeout(() => {
        onResetSuccess();
      }, 1000);
    }, 800);
  };

  const getTitle = () => {
    switch (step) {
      case 'email': return 'Forgot Password';
      case 'code': return 'Enter Code';
      case 'newPassword': return 'Reset Password';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={step === 'email' ? onBack : () => setStep(step === 'newPassword' ? 'code' : 'email')} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
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
        {step === 'email' && (
          <>
            <Text style={styles.description}>
              Enter your registered email address. We will send you a verification code to reset your password.
            </Text>
            <View style={styles.fieldGroup}>
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
            </View>
            <TouchableOpacity
              style={[styles.actionButton, loading && styles.actionButtonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.actionButtonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'code' && (
          <>
            <Text style={styles.description}>
              A verification code has been sent to {email}. Please enter the code below.
            </Text>
            <View style={styles.fieldGroup}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Verification Code</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={code}
                  onChangeText={setCode}
                  placeholder="Enter code"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, loading && styles.actionButtonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.actionButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendCode}
              disabled={countdown > 0}
            >
              <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'newPassword' && (
          <>
            <Text style={styles.description}>
              Please enter your new password.
            </Text>
            <View style={styles.fieldGroup}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.fieldDivider} />
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, loading && styles.actionButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.actionButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
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
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 30,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 14,
  },
  resendTextDisabled: {
    color: '#999',
  },
});
