import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Device, InspectionReport, DeviceLocation } from '../types';
import { roomTypes, roomNumbers } from '../data/mockData';

interface Props {
  device: Device;
  propertyId: string;
  onNext: (report: InspectionReport) => void;
  onBack: () => void;
}

export default function DeviceInspectionScreen({ device, propertyId, onNext, onBack }: Props) {
  const [location, setLocation] = useState<DeviceLocation>(device.location);
  const [showRoomTypePicker, setShowRoomTypePicker] = useState(false);
  const [showRoomNumPicker, setShowRoomNumPicker] = useState(false);

  const statusColor =
    device.sensorStatus === 'OK' ? Colors.success :
    device.sensorStatus === 'LOW_BATTERY' ? Colors.warning :
    Colors.danger;

  const batteryColor =
    (device.batteryVoltage ?? device.battery ?? 0) >= 3.0 ? Colors.success :
    (device.batteryVoltage ?? device.battery ?? 0) >= 2.7 ? Colors.warning :
    Colors.danger;

  const handleProceed = () => {
    const report: InspectionReport = {
      id: `RPT-${Date.now()}`,
      propertyId,
      deviceId: device.id,
      technicianName: 'Technician',
      date: new Date().toISOString(),
      step: 'action',
      completed: false,
      actions: [],
      images: [],
      notes: '',
      location,
    };
    onNext(report);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Report</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.stepIndicator}>
        {['Report', 'Action', 'Image'].map((step, i) => (
          <View key={step} style={styles.stepItem}>
            <View style={[styles.stepCircle, i === 0 && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, i === 0 && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>{step}</Text>
            {i < 2 && <View style={styles.stepLine} />}
          </View>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>DEVICE INFORMATION</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MODEL:</Text>
                <Text style={styles.infoValue}>{device.model}</Text>
                <Text style={styles.infoLabel}>SN:</Text>
                <Text style={styles.infoValue}>{device.serialNumber}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Replacement Date:</Text>
                <Text style={styles.infoValue}>{device.replacementDate}</Text>
                <Text style={styles.infoLabel}>Date Code:</Text>
                <Text style={styles.infoValue}>{device.dateCode}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Days Remaining:</Text>
                <Text style={styles.infoValue}>{device.daysRemaining}</Text>
                <Text style={styles.infoLabel}>DATE:</Text>
                <Text style={styles.infoValue}>{device.lastInspectionDate}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rowCards}>
            <View style={[styles.card, styles.halfCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>SENSOR STATUS</Text>
              </View>
              <View style={styles.statusContent}>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusLabel, { color: statusColor }]}>
                  {device.sensorStatus === 'OK' ? 'OK' : device.sensorStatus}
                </Text>
              </View>
            </View>

            <View style={[styles.card, styles.halfCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>BATTERY</Text>
              </View>
              <View style={styles.batteryContent}>
                <Text style={styles.batteryIcon}>🔋</Text>
                <Text style={[styles.batteryVoltage, { color: batteryColor }]}>
                  {(device.batteryVoltage ?? device.battery ?? 0).toFixed(3)} V
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>ALARM OFF</Text>
            </View>
            <View style={styles.eventRow}>
              <View style={[styles.eventDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.eventValue}>TIMES {(device.alarmOffCount ?? 0)}</Text>
              <Text style={styles.eventLast}>LAST EVENT {device.alarmOffLastEvent}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>MANUAL TEST</Text>
            </View>
            <View style={styles.eventRow}>
              <View style={[styles.eventDot, { backgroundColor: Colors.info }]} />
              <Text style={styles.eventValue}>TIMES {device.manualTestCount}</Text>
              <Text style={styles.eventLast}>LAST EVENT {device.manualTestLastEvent}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>ALARM TRIGGERS</Text>
                <Text style={styles.cardTitleSub}>    ALARMS    LAST EVE...</Text>
              </Text>
            </View>
            {(device.alarmTriggers ?? []).map((trigger, index) => (
              <View key={index}>
                <View style={styles.triggerRow}>
                  <View style={[styles.triggerDot, {
                    backgroundColor: trigger.count > 0 ? Colors.danger : Colors.textTertiary
                  }]} />
                  <Text style={styles.triggerType}>{trigger.type}</Text>
                  <Text style={styles.triggerCount}>{trigger.count}</Text>
                  <Text style={styles.triggerLast}>{trigger.lastEvent}</Text>
                </View>
                {index < (device.alarmTriggers ?? []).length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.locationRequired}>*Alarm Location (room)</Text>
            <View style={styles.locationPickers}>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowRoomTypePicker(true)}
              >
                <Text style={styles.pickerValue}>{location.roomType}</Text>
                <Text style={styles.pickerArrow}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowRoomNumPicker(true)}
              >
                <Text style={styles.pickerValue}>{location.roomNumber}</Text>
                <Text style={styles.pickerArrow}>▾</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleProceed} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>Next: Action →</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <Modal visible={showRoomTypePicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowRoomTypePicker(false)}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Room Type</Text>
            {roomTypes.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.pickerOption, location.roomType === type && styles.pickerOptionSelected]}
                onPress={() => {
                  setLocation({ ...location, roomType: type });
                  setShowRoomTypePicker(false);
                }}
              >
                <Text style={[styles.pickerOptionText, location.roomType === type && styles.pickerOptionTextSelected]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showRoomNumPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowRoomNumPicker(false)}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Room Number</Text>
            {roomNumbers.map(num => (
              <TouchableOpacity
                key={num}
                style={[styles.pickerOption, location.roomNumber === num && styles.pickerOptionSelected]}
                onPress={() => {
                  setLocation({ ...location, roomNumber: num });
                  setShowRoomNumPicker(false);
                }}
              >
                <Text style={[styles.pickerOptionText, location.roomNumber === num && styles.pickerOptionTextSelected]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  stepNumActive: {
    color: Colors.white,
  },
  stepLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  stepLine: {
    width: 32,
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardTitleRow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  cardTitleSub: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '400',
  },
  infoGrid: { paddingHorizontal: 16, paddingBottom: 8 },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 8,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    width: '30%',
  },
  infoValue: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '600',
    width: '20%',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  rowCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  halfCard: {
    flex: 1,
    marginBottom: 12,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  batteryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 6,
  },
  batteryIcon: { fontSize: 18 },
  batteryVoltage: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  eventLast: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  triggerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  triggerType: {
    flex: 1,
    fontSize: 11,
    color: Colors.text,
    fontWeight: '500',
  },
  triggerCount: {
    width: 36,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  triggerLast: {
    width: 90,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  locationRequired: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 8,
  },
  locationPickers: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  pickerArrow: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  pickerOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primary + '11',
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  pickerOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
