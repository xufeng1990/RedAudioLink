import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Device, InspectionReport } from '../types';

const COMMON_ACTIONS = [
  'Tested alarm - functioning correctly',
  'Replaced battery',
  'Cleaned smoke sensor',
  'Replaced unit',
  'Unit needs replacement - ordered',
  'Checked interconnect - functioning',
  'Reset alarm after test',
  'Adjusted alarm location',
  'Sensor fault - requires replacement',
  'Advised occupant of alarm test',
];

interface Props {
  report: InspectionReport;
  device: Device;
  onNext: (updatedReport: InspectionReport) => void;
  onBack: () => void;
}

export default function InspectionActionScreen({ report, device, onNext, onBack }: Props) {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState('');

  const toggleAction = (action: string) => {
    setSelectedActions(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  const handleNext = () => {
    if (selectedActions.length === 0 && !customNote.trim()) {
      Alert.alert(
        'No Actions',
        'Please select at least one action or add a note.',
        [{ text: 'OK' }]
      );
      return;
    }
    const updatedReport: InspectionReport = {
      ...report,
      actions: selectedActions,
      notes: customNote.trim(),
      step: 'image',
    };
    onNext(updatedReport);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Action</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.stepIndicator}>
        {['Report', 'Action', 'Image'].map((step, i) => (
          <View key={step} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              i === 0 && styles.stepCircleDone,
              i === 1 && styles.stepCircleActive
            ]}>
              <Text style={[
                styles.stepNum,
                i === 0 && styles.stepNumDone,
                i === 1 && styles.stepNumActive
              ]}>{i === 0 ? '✓' : i + 1}</Text>
            </View>
            <Text style={[
              styles.stepLabel,
              i === 0 && styles.stepLabelDone,
              i === 1 && styles.stepLabelActive
            ]}>{step}</Text>
            {i < 2 && <View style={[styles.stepLine, i === 0 && styles.stepLineDone]} />}
          </View>
        ))}
      </View>

      <View style={styles.deviceInfo}>
        <Text style={styles.deviceModel}>{device.model}</Text>
        <Text style={styles.deviceSN}>SN: {device.serialNumber} · {report.location.roomType} {report.location.roomNumber}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Select Actions Taken</Text>

          {COMMON_ACTIONS.map((action, index) => {
            const isSelected = selectedActions.includes(action);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.actionItem, isSelected && styles.actionItemSelected]}
                onPress={() => toggleAction(action)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.actionText, isSelected && styles.actionTextSelected]}>
                  {action}
                </Text>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Additional Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={customNote}
            onChangeText={setCustomNote}
            placeholder="Enter any additional notes or observations..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {selectedActions.length > 0 && (
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>{selectedActions.length} action{selectedActions.length !== 1 ? 's' : ''} selected</Text>
            </View>
          )}

          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>Next: Add Photos →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { width: 60 },
  backText: { color: Colors.white, fontSize: 17, fontWeight: '500' },
  headerTitle: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  stepIndicator: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepCircleDone: { backgroundColor: Colors.success },
  stepNum: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  stepNumActive: { color: Colors.white },
  stepNumDone: { color: Colors.white, fontSize: 12 },
  stepLabel: { fontSize: 11, color: Colors.textSecondary, marginLeft: 4, fontWeight: '500' },
  stepLabelActive: { color: Colors.primary, fontWeight: '700' },
  stepLabelDone: { color: Colors.success, fontWeight: '600' },
  stepLine: { width: 32, height: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  stepLineDone: { backgroundColor: Colors.success },
  deviceInfo: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  deviceModel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  deviceSN: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  actionItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    minHeight: 100,
    lineHeight: 20,
  },
  summary: {
    backgroundColor: Colors.primary + '11',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
