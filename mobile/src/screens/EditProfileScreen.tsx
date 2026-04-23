import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Colors } from '../theme/colors';
import { UserProfile } from './ProfileScreen';

interface Props {
  profile: UserProfile;
  onBack: () => void;
  onSave: (profile: UserProfile) => Promise<void> | void;
}

type ToastType = 'success' | 'error';

const Toast = ({
  visible,
  type,
  message,
}: {
  visible: boolean;
  type: ToastType;
  message: string;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible && (opacity as any)._value === 0) return null;
  const bg = type === 'success' ? '#E6F7EE' : '#FDE7E9';
  const fg = type === 'success' ? '#1F9D55' : Colors.primary;
  const icon = type === 'success' ? '✓' : '✕';

  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { backgroundColor: bg, opacity }]}>
      <View style={[styles.toastIcon, { borderColor: fg }]}>
        <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{icon}</Text>
      </View>
      <Text style={[styles.toastText, { color: fg }]}>{message}</Text>
    </Animated.View>
  );
};

const Field = ({
  label,
  value,
  onChange,
  highlight,
  testID,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  highlight?: boolean;
  testID?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}) => (
  <View style={[styles.field, highlight && styles.fieldHighlight]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={onChange}
      placeholderTextColor="#BBB"
      testID={testID}
      keyboardType={keyboardType}
    />
  </View>
);

export default function EditProfileScreen({ profile, onBack, onSave }: Props) {
  const [employeeName, setEmployeeName] = useState(profile.employeeName);
  const [businessId, setBusinessId] = useState(profile.businessId);
  const [telephoneNumber, setTelephoneNumber] = useState(profile.telephoneNumber);
  const [emailAddress, setEmailAddress] = useState(profile.emailAddress);
  const [phoneFocused, setPhoneFocused] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; message: string }>({
    visible: false,
    type: 'success',
    message: '',
  });
  const [saving, setSaving] = useState(false);

  const showToast = (type: ToastType, message: string, after?: () => void) => {
    setToast({ visible: true, type, message });
    setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
      after?.();
    }, 1300);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!employeeName.trim() || !businessId.trim() || !telephoneNumber.trim() || !emailAddress.trim()) {
      showToast('error', 'Modification failed!');
      return;
    }
    const next: UserProfile = {
      employeeName: employeeName.trim(),
      employeeId: profile.employeeId,
      businessId: businessId.trim(),
      telephoneNumber: telephoneNumber.trim(),
      emailAddress: emailAddress.trim(),
    };
    setSaving(true);
    try {
      await Promise.resolve(onSave(next));
      showToast('success', 'Modification successful!');
    } catch (e: any) {
      showToast('error', e?.message || 'Modification failed!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="button-back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Field label="Employee Name" value={employeeName} onChange={setEmployeeName} testID="input-employee-name" />
          <View style={styles.divider} />
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Employee ID</Text>
            <Text style={styles.readOnlyValue} testID="text-employee-id">
              {profile.employeeId || '-'}
            </Text>
          </View>
          <View style={styles.divider} />
          <Field label="Business ID" value={businessId} onChange={setBusinessId} testID="input-business-id" />
          <View style={styles.divider} />
          <View
            style={[styles.field, phoneFocused && styles.fieldHighlight]}
            onTouchStart={() => setPhoneFocused(true)}
          >
            <Text style={styles.fieldLabel}>Telephone Number</Text>
            <TextInput
              style={styles.fieldInput}
              value={telephoneNumber}
              onChangeText={setTelephoneNumber}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              keyboardType="phone-pad"
              placeholderTextColor="#BBB"
              testID="input-telephone"
            />
          </View>
          <View style={styles.divider} />
          <Field
            label="Email Address"
            value={emailAddress}
            onChange={setEmailAddress}
            keyboardType="email-address"
            testID="input-email"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
          testID="button-save"
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.toastWrap} pointerEvents="none">
        <Toast visible={toast.visible} type={toast.type} message={toast.message} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 50 },
  header: {
    height: 52,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#222', marginTop: -2 },
  headerTitle: { fontSize: 17, color: '#222', fontWeight: '500' },
  headerRight: { width: 36 },
  scroll: { paddingTop: 14, paddingBottom: 40 },
  card: { marginHorizontal: 14, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  field: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: '#fff' },
  fieldHighlight: { backgroundColor: '#FDE7E9' },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  fieldInput: { fontSize: 15, color: '#222', paddingVertical: 4, paddingHorizontal: 0 },
  readOnlyValue: { fontSize: 15, color: '#888', paddingVertical: 8, paddingHorizontal: 0 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 14 },
  saveBtn: {
    marginHorizontal: 14,
    marginTop: 22,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toastWrap: {
    position: 'absolute',
    top: 114,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  toastIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  toastText: { fontSize: 14, fontWeight: '500' },
});
