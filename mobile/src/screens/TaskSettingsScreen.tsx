import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Colors } from '../theme/colors';

export type CleanupCycle = 'daily' | 'weekly' | 'monthly';

interface Props {
  initial: CleanupCycle;
  onBack: () => void;
  onSave: (cycle: CleanupCycle) => void;
}

const OPTIONS: { id: CleanupCycle; title: string; subtitle: string }[] = [
  { id: 'daily', title: 'Daily Cleanup', subtitle: 'Automatically clear completed tasks daily.' },
  { id: 'weekly', title: 'Weekly Cleanup', subtitle: 'Automatically clear completed tasks every Monday.' },
  {
    id: 'monthly',
    title: 'Monthly Cleanup',
    subtitle: 'Automatically clear completed tasks on the 1st of every month.',
  },
];

export default function TaskSettingsScreen({ initial, onBack, onSave }: Props) {
  const [selected, setSelected] = useState<CleanupCycle>(initial);

  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: toast.visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [toast.visible, opacity]);

  const handleSave = () => {
    setToast({ visible: true, message: 'Modification successful!' });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
      onSave(selected);
    }, 1300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="button-back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Automatic Cleanup Cycle Settings for Completed Tasks{'\n'}
          Once a cleanup cycle is selected, completed tasks exceeding the specified time limit will be
          automatically cleared.
        </Text>

        {OPTIONS.map((opt) => {
          const active = selected === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.option, active && styles.optionActive]}
              activeOpacity={0.85}
              onPress={() => setSelected(opt.id)}
              testID={`option-${opt.id}`}
            >
              <View style={[styles.checkbox, active && styles.checkboxActive]}>
                {active && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} testID="button-save">
          <Text style={styles.saveText}>Save settings</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.toastWrap} pointerEvents="none">
        <Animated.View style={[styles.toast, { opacity }]}>
          <View style={styles.toastIcon}>
            <Text style={{ color: '#1F9D55', fontSize: 11, fontWeight: '700' }}>✓</Text>
          </View>
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
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
  scroll: { paddingTop: 14, paddingBottom: 40, paddingHorizontal: 14 },
  intro: { fontSize: 12, color: '#999', lineHeight: 18, marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionActive: { backgroundColor: '#FDE7E9', borderColor: Colors.primary },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    backgroundColor: '#fff',
  },
  checkboxActive: { borderColor: Colors.primary, backgroundColor: '#fff' },
  checkboxTick: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  optionTitle: { fontSize: 14, color: '#222', fontWeight: '600', marginBottom: 4 },
  optionSubtitle: { fontSize: 12, color: '#999', lineHeight: 17 },
  saveBtn: {
    marginTop: 12,
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
    backgroundColor: '#E6F7EE',
  },
  toastIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#1F9D55',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  toastText: { fontSize: 14, fontWeight: '500', color: '#1F9D55' },
});
