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

interface Props {
  onBack: () => void;
  onSave: (current: string, next: string) => void;
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

export default function ChangePasswordScreen({ onBack, onSave }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; message: string }>({
    visible: false,
    type: 'success',
    message: '',
  });

  const showToast = (type: ToastType, message: string, after?: () => void) => {
    setToast({ visible: true, type, message });
    setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
      after?.();
    }, 1300);
  };

  const handleSave = () => {
    if (!current.trim() || !next.trim() || !confirm.trim()) {
      showToast('error', 'Modification failed!');
      return;
    }
    if (next !== confirm) {
      showToast('error', 'Modification failed!');
      return;
    }
    if (next.length < 6) {
      showToast('error', 'Modification failed!');
      return;
    }
    showToast('success', 'Modification successful!', () => {
      onSave(current, next);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="button-back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <TextInput
              style={styles.fieldInput}
              value={current}
              onChangeText={setCurrent}
              secureTextEntry
              placeholder="Please Enter"
              placeholderTextColor="#BBB"
              testID="input-current-password"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <TextInput
              style={styles.fieldInput}
              value={next}
              onChangeText={setNext}
              secureTextEntry
              placeholder="Please Enter"
              placeholderTextColor="#BBB"
              testID="input-new-password"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.fieldInput}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Please Enter"
              placeholderTextColor="#BBB"
              testID="input-confirm-password"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} testID="button-save">
          <Text style={styles.saveText}>Save Changes</Text>
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
  field: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
  fieldLabel: { fontSize: 13, color: '#222', fontWeight: '500', marginBottom: 4 },
  fieldInput: { fontSize: 15, color: '#222', paddingVertical: 4 },
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
