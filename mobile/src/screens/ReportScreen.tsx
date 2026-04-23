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
import { Device, DeviceLocation, ProtocolEvent } from '../types';
import {
  sensorStatusText,
  sensorStatusColor,
  dustLevelText,
  dustLevelColor,
  replacementText,
  replacementColor,
  batteryRatio,
  batteryColor,
  formatEvent,
  formatLowBattery,
  eventColor,
  GREEN,
} from '../utils/protocolDisplay';

const roomTypes = ['Bedroom', 'Living Room', 'Hallway'];
const roomNumbers = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

interface Props {
  device: Device;
  onBack: () => void;
  onNext: (locations: DeviceLocation[]) => void;
}

const STEPS = ['Report', 'Action', 'Image'];

const StepIndicator = ({ active }: { active: number }) => (
  <View style={styles.stepRow}>
    {STEPS.map((label, i) => {
      const isActive = i === active;
      return (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, isActive && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
          </View>
          {i < STEPS.length - 1 && <View style={styles.stepDash} />}
        </React.Fragment>
      );
    })}
  </View>
);

const BatteryIcon = ({ level, voltage }: { level?: number; voltage?: number }) => {
  const color = batteryColor(level, voltage);
  const innerWidth = 16;
  const ratio = batteryRatio(level);
  return (
    <View style={styles.batteryIcon}>
      <View style={[styles.batteryBody, { borderColor: color }]}>
        <View style={{ width: Math.max(2, innerWidth * ratio), height: '100%', backgroundColor: color, borderRadius: 1 }} />
      </View>
      <View style={[styles.batteryTip, { backgroundColor: color }]} />
    </View>
  );
};

const Dot = ({ color }: { color: string }) => <View style={[styles.dot, { backgroundColor: color }]} />;
const Chevron = () => <Text style={styles.chevron}>▾</Text>;

interface EventRowProps {
  label: string;
  event?: ProtocolEvent;
}
const EventRow = ({ label, event }: EventRowProps) => (
  <View style={styles.eventRow}>
    <View style={styles.eventLeft}>
      <Dot color={eventColor(event?.times)} />
      <Text style={styles.eventLabel}>{label}</Text>
    </View>
    <Text style={styles.eventValue}>{formatEvent(event)}</Text>
  </View>
);

interface LocationPickerProps {
  value: DeviceLocation;
  onRequestRoomType: () => void;
  onRequestRoomNum: () => void;
}
const LocationPicker = ({ value, onRequestRoomType, onRequestRoomNum }: LocationPickerProps) => (
  <View style={styles.locationPickers}>
    <TouchableOpacity style={styles.pickerBtn} onPress={onRequestRoomType} activeOpacity={0.8}>
      <Text style={styles.pickerValue}>{value.roomType}</Text>
      <Chevron />
    </TouchableOpacity>
    <TouchableOpacity style={styles.pickerBtn} onPress={onRequestRoomNum} activeOpacity={0.8}>
      <Text style={styles.pickerValue}>{value.roomNumber}</Text>
      <Chevron />
    </TouchableOpacity>
  </View>
);

export default function ReportScreen({ device, onBack, onNext }: Props) {
  const [locations, setLocations] = useState<DeviceLocation[]>([{ roomType: 'Bedroom', roomNumber: '01' }]);
  const [picker, setPicker] = useState<{ index: number; field: 'type' | 'num' } | null>(null);

  const updateLocation = (index: number, patch: Partial<DeviceLocation>) => {
    setLocations((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };
  const closePicker = () => setPicker(null);
  const pickerOptions = picker?.field === 'type' ? roomTypes : roomNumbers;

  const sensorColor = sensorStatusColor(device.sensor_status);
  const dColor = dustLevelColor(device.dust_level);
  const repText = replacementText(device.duration);
  const repColor = replacementColor(device.duration);
  const lowBatTimes = device.low_battery_events?.warning_beeps || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="button-back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Device meta */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>MODEL:</Text>
              <Text style={styles.metaValue}>{device.model_no}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>SN:</Text>
              <Text style={styles.metaValue}>{device.sn}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Date Code:</Text>
              <Text style={styles.metaValue}>{device.date}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Replacement:</Text>
              <Text style={[styles.metaValue, { color: repColor }]}>{repText}</Text>
            </View>
          </View>
        </View>

        <StepIndicator active={0} />

        {/* Sensor / Battery */}
        <View style={styles.twoCard}>
          <View style={[styles.cell, styles.cellRight]}>
            <Text style={styles.cellLabel}>SENSOR STATUS</Text>
            <View style={styles.cellRow}>
              <Dot color={sensorColor} />
              <Text style={[styles.cellValue, { color: sensorColor }]}>{sensorStatusText(device.sensor_status)}</Text>
            </View>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>BATTERY</Text>
            <View style={styles.cellRow}>
              <Text style={[styles.cellValue, { color: batteryColor(device.battery_level, device.battery) }]}>
                {device.battery.toFixed(2)} V
              </Text>
              <View style={{ marginLeft: 8 }}>
                <BatteryIcon level={device.battery_level} voltage={device.battery} />
              </View>
            </View>
          </View>
        </View>

        {/* Alarm On / Dust */}
        <View style={styles.twoCard}>
          <View style={[styles.cell, styles.cellRight]}>
            <Text style={styles.cellLabel}>ALARM ON</Text>
            <Text style={styles.cellValue}>{device.duration} days</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>DUST CONTAMINATION</Text>
            <View style={styles.cellRow}>
              <Dot color={dColor} />
              <Text style={[styles.cellValue, { color: dColor }]}>{dustLevelText(device.dust_level)}</Text>
            </View>
          </View>
        </View>

        {/* Alarm Events list */}
        <View style={styles.eventsCard}>
          <Text style={styles.singleLabel}>ALARM EVENT HISTORY</Text>
          <EventRow label="OPTICAL SENSOR" event={device.smoke_alarm} />
          <EventRow label="MANUAL TEST" event={device.test_button_pressed} />
          <EventRow label="ALARM OFF" event={device.times_alarm_deactivated} />
          <View style={styles.eventRow}>
            <View style={styles.eventLeft}>
              <Dot color={eventColor(lowBatTimes)} />
              <Text style={styles.eventLabel}>LOW BATTERY</Text>
            </View>
            <Text style={styles.eventValue}>{formatLowBattery(device.low_battery_events)}</Text>
          </View>
          <EventRow label="MAIN POWER OFF" event={device.main_power_events} />
          <EventRow label="WRONG WIRING" event={device.wrong_wiring_events} />
          <EventRow label="WIRE INTERCONNECTION" event={device.wire_interconnect_events} />
          <EventRow label="INTERCONNECTION (RF)" event={device.interconnect_events} />
        </View>

        {/* Locations */}
        {locations.map((loc, i) => (
          <View key={i} style={styles.locationCard}>
            <Text style={styles.locationLabel}>
              <Text style={styles.required}>*</Text>Alarm Location(room)
            </Text>
            <LocationPicker
              value={loc}
              onRequestRoomType={() => setPicker({ index: i, field: 'type' })}
              onRequestRoomNum={() => setPicker({ index: i, field: 'num' })}
            />
          </View>
        ))}

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => onNext(locations)}
          activeOpacity={0.85}
          testID="button-next-step"
        >
          <Text style={styles.nextBtnText}>Next step</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={closePicker}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closePicker}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>
              {picker?.field === 'type' ? 'Select Room Type' : 'Select Room Number'}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {pickerOptions.map((opt) => {
                const current = picker !== null ? (picker.field === 'type' ? locations[picker.index].roomType : locations[picker.index].roomNumber) : '';
                const isSelected = current === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                    onPress={() => {
                      if (picker !== null) {
                        const patch = picker.field === 'type' ? { roomType: opt } : { roomNumber: opt };
                        updateLocation(picker.index, patch);
                      }
                      closePicker();
                    }}
                  >
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
  headerTitle: { fontSize: 17, color: '#222', fontWeight: '600' },
  headerRight: { width: 36 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  metaCard: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14 },
  metaRow: { flexDirection: 'row', marginBottom: 8 },
  metaCol: { flex: 1, paddingRight: 8 },
  metaLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  metaValue: { fontSize: 13, color: '#222', fontWeight: '600' },

  stepRow: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  stepItem: { alignItems: 'center', flexDirection: 'row' },
  stepCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepNum: { fontSize: 11, color: '#999', fontWeight: '700' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 12, color: '#999', marginLeft: 6, fontWeight: '500' },
  stepLabelActive: { color: Colors.primary, fontWeight: '700' },
  stepDash: { width: 50, height: 1, borderTopWidth: 1, borderTopColor: '#DDD', borderStyle: 'dashed', marginHorizontal: 6 },

  twoCard: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 10 },
  cell: { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },
  cellRight: { borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  cellLabel: { fontSize: 11, color: '#999', marginBottom: 8, fontWeight: '500' },
  cellRow: { flexDirection: 'row', alignItems: 'center' },
  cellValue: { fontSize: 14, color: '#222', fontWeight: '600' },

  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },

  batteryIcon: { flexDirection: 'row', alignItems: 'center' },
  batteryBody: {
    width: 20,
    height: 11,
    borderRadius: 2,
    borderWidth: 1.5,
    padding: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryTip: { width: 2, height: 5, marginLeft: 1, borderTopRightRadius: 1, borderBottomRightRadius: 1 },

  eventsCard: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
  singleLabel: { fontSize: 11, color: '#999', marginBottom: 10, fontWeight: '500' },
  eventRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F4F4F4' },
  eventLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  eventLabel: { fontSize: 12, color: '#222', fontWeight: '600' },
  eventValue: { fontSize: 12, color: '#666', textAlign: 'right' },

  locationCard: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
  locationLabel: { fontSize: 13, color: '#222', marginBottom: 10, fontWeight: '500' },
  required: { color: Colors.primary },
  locationPickers: { flexDirection: 'row', gap: 10 },
  pickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 6 },
  pickerValue: { fontSize: 13, color: '#222' },
  chevron: { fontSize: 12, color: '#999' },

  nextBtn: { marginHorizontal: 14, marginTop: 6, height: 48, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: '#fff', borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingVertical: 16 },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: '#222', textAlign: 'center', marginBottom: 12 },
  pickerOption: { paddingVertical: 14, paddingHorizontal: 20 },
  pickerOptionSelected: { backgroundColor: '#FDE7E9' },
  pickerOptionText: { fontSize: 14, color: '#222' },
  pickerOptionTextSelected: { color: Colors.primary, fontWeight: '700' },
});
