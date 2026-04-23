import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Task } from '../types';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface Props {
  onBack: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'status' | 'creationTime'>) => Promise<void> | void;
  mode?: 'create' | 'edit';
  initial?: Partial<Omit<Task, 'id' | 'status' | 'creationTime'>>;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID?: string;
  keyboardType?: 'default' | 'numeric';
}

const Field = ({ label, value, onChange, testID, keyboardType }: FieldProps) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.label}>
      <Text style={styles.required}>*</Text>
      {label}
    </Text>
    <TextInput
      style={styles.input}
      placeholder="Please Enter"
      placeholderTextColor="#BFBFBF"
      value={value}
      onChangeText={onChange}
      testID={testID}
      keyboardType={keyboardType || 'default'}
    />
  </View>
);

type ToastType = 'success' | 'error';

interface ToastProps {
  visible: boolean;
  type: ToastType;
  message: string;
}

const Toast = ({ visible, type, message }: ToastProps) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible && (opacity as any)._value === 0) return null;

  const isSuccess = type === 'success';
  const bg = isSuccess ? '#D4EFDF' : '#F8D7DA';
  const border = isSuccess ? '#7DCEA0' : '#E89BA1';
  const color = isSuccess ? '#1E8449' : '#C0392B';
  const icon = isSuccess ? '✓' : '✕';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { backgroundColor: bg, borderColor: border, opacity },
      ]}
    >
      <View style={[styles.toastIconCircle, { borderColor: color }]}>
        <Text style={[styles.toastIcon, { color }]}>{icon}</Text>
      </View>
      <Text style={[styles.toastText, { color }]}>{message}</Text>
    </Animated.View>
  );
};

export default function CreateTaskScreen({ onBack, onSubmit, mode = 'create', initial }: Props) {
  const [taskName, setTaskName] = useState(initial?.title || '');
  const [taskId, setTaskId] = useState(initial?.taskId || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [stateProvince, setStateProvince] = useState(initial?.stateProvince || '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode || '');
  const [submitting, setSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; message: string }>({
    visible: false,
    type: 'success',
    message: '',
  });

  const showToast = (type: ToastType, message: string, duration: number, onDone?: () => void) => {
    setToast({ visible: true, type, message });
    setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
      if (onDone) onDone();
    }, duration);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const missing: string[] = [];
    if (!taskName.trim()) missing.push('Task Name');
    if (!taskId.trim()) missing.push('Task ID');
    if (!address.trim()) missing.push('Address');
    if (!stateProvince.trim()) missing.push('State/Province');
    if (!postalCode.trim()) missing.push('Postal Code');

    if (missing.length > 0) {
      const msg =
        missing.length === 1
          ? `${missing[0]} is required.`
          : `Missing: ${missing.join(', ')}`;
      showToast('error', msg, 2200);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: taskName.trim(),
        taskId: taskId.trim(),
        address: address.trim(),
        stateProvince: stateProvince.trim(),
        postalCode: postalCode.trim(),
      });
      showToast('success', isEdit ? 'Task updated successfully!' : 'Task created successfully!', 1200);
    } catch (e: any) {
      showToast('error', e?.message || (isEdit ? 'Failed to update task' : 'Failed to create task'), 2400);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="button-back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Task' : 'Create Task'}</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Field label="Task Name" value={taskName} onChange={setTaskName} testID="input-task-name" />
          <Field label="Task ID" value={taskId} onChange={setTaskId} testID="input-task-id" />

          <View style={[styles.fieldWrap, { zIndex: 30 }]}>
            <Text style={styles.label}>
              <Text style={styles.required}>*</Text>
              Address
            </Text>
            <AddressAutocomplete
              value={address}
              onChangeText={setAddress}
              onSelect={(s) => {
                if (s.state) setStateProvince(s.state);
                if (s.postcode) setPostalCode(s.postcode);
              }}
              testID="input-address"
            />
          </View>

          <Field label="State/Province" value={stateProvince} onChange={setStateProvince} testID="input-state-province" />
          <Field label="Postal Code" value={postalCode} onChange={setPostalCode} testID="input-postal-code" keyboardType="numeric" />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={submitting}
            testID="button-submit-task"
          >
            <Text style={styles.submitText}>
              {submitting
                ? (isEdit ? 'Saving…' : 'Submitting…')
                : (isEdit ? 'Save Changes' : 'Submit Task')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.toastWrap} pointerEvents="none">
        <Toast visible={toast.visible} type={toast.type} message={toast.message} />
      </View>
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
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  headerRight: {
    width: 32,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  fieldWrap: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
    marginBottom: 6,
  },
  required: {
    color: Colors.primary,
  },
  input: {
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 32,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  toastWrap: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '85%',
    gap: 8,
  },
  toastIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
