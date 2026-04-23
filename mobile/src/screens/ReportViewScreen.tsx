import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { Colors } from '../theme/colors';
import { CompletedReport } from '../utils/generateReportPdf';
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
} from '../utils/protocolDisplay';
import type { ProtocolEvent } from '../types';

interface Props {
  report: CompletedReport;
  onBack: () => void;
  onEdit: () => void;
}

// ── Sub-components (mirrors ReportScreen style) ──────────────────

const STEPS = ['Report', 'Action', 'Image'];

const StepIndicator = () => (
  <View style={styles.stepRow}>
    {STEPS.map((label, i) => (
      <React.Fragment key={label}>
        <View style={styles.stepItem}>
          <View style={styles.stepCircleDone}>
            <Text style={styles.stepNumDone}>✓</Text>
          </View>
          <Text style={styles.stepLabelDone}>{label}</Text>
        </View>
        {i < STEPS.length - 1 && <View style={styles.stepDashDone} />}
      </React.Fragment>
    ))}
  </View>
);

const BatteryIcon = ({ level, voltage }: { level?: number; voltage?: number }) => {
  const color = batteryColor(level, voltage);
  const ratio = batteryRatio(level);
  return (
    <View style={styles.batteryIcon}>
      <View style={[styles.batteryBody, { borderColor: color }]}>
        <View style={{ width: Math.max(2, 16 * ratio), height: '100%', backgroundColor: color, borderRadius: 1 }} />
      </View>
      <View style={[styles.batteryTip, { backgroundColor: color }]} />
    </View>
  );
};

const Dot = ({ color }: { color: string }) => (
  <View style={[styles.dot, { backgroundColor: color }]} />
);

const EventRow = ({ label, event }: { label: string; event?: ProtocolEvent }) => (
  <View style={styles.eventRow}>
    <View style={styles.eventLeft}>
      <Dot color={eventColor(event?.times)} />
      <Text style={styles.eventLabel}>{label}</Text>
    </View>
    <Text style={styles.eventValue}>{formatEvent(event)}</Text>
  </View>
);

// ── Main Screen ──────────────────────────────────────────────────

export default function ReportViewScreen({ report, onBack, onEdit }: Props) {
  const d = report.device;
  const room = report.location.roomType || '';
  const roomNum = report.location.roomNumber || '';

  const sensorColor = sensorStatusColor(d.sensor_status);
  const dColor = dustLevelColor(d.dust_level);
  const repText = replacementText(d.duration);
  const repColor = replacementColor(d.duration);
  const lowBatTimes = d.low_battery_events?.warning_beeps || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="button-back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Device meta card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>MODEL:</Text>
              <Text style={styles.metaValue}>{d.model_no}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>SN:</Text>
              <Text style={styles.metaValue}>{d.sn}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Replacement Date:</Text>
              <Text style={[styles.metaValue, { color: repColor }]}>{repText}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Date Code:</Text>
              <Text style={styles.metaValue}>{d.date}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Days Remaining:</Text>
              <Text style={styles.metaValue}>{d.duration} days</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DATE:</Text>
              <Text style={styles.metaValue}>{report.inspectedAt}</Text>
            </View>
          </View>
        </View>

        {/* Step indicator — all done */}
        <StepIndicator />

        {/* Sensor Status | Battery */}
        <View style={styles.twoCard}>
          <View style={[styles.cell, styles.cellRight]}>
            <Text style={styles.cellLabel}>SENSOR STATUS</Text>
            <View style={styles.cellRow}>
              <Dot color={sensorColor} />
              <Text style={[styles.cellValue, { color: sensorColor }]}>
                {sensorStatusText(d.sensor_status)}
              </Text>
            </View>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>BATTERY</Text>
            <View style={styles.cellRow}>
              <Text style={[styles.cellValue, { color: batteryColor(d.battery_level, d.battery) }]}>
                {d.battery.toFixed(3)} V
              </Text>
              <View style={{ marginLeft: 8 }}>
                <BatteryIcon level={d.battery_level} voltage={d.battery} />
              </View>
            </View>
          </View>
        </View>

        {/* Alarm On | Dust Contamination */}
        <View style={styles.twoCard}>
          <View style={[styles.cell, styles.cellRight]}>
            <Text style={styles.cellLabel}>ALARM ON</Text>
            <Text style={styles.cellValue}>{d.duration} days</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>DUST CONTAMINATION</Text>
            <View style={styles.cellRow}>
              <Dot color={dColor} />
              <Text style={[styles.cellValue, { color: dColor }]}>{dustLevelText(d.dust_level)}</Text>
            </View>
          </View>
        </View>

        {/* Alarm Event History */}
        <View style={styles.eventsCard}>
          <Text style={styles.singleLabel}>ALARM EVENT HISTORY</Text>
          <EventRow label="OPTICAL SENSOR" event={d.smoke_alarm} />
          <EventRow label="MANUAL TEST" event={d.test_button_pressed} />
          <EventRow label="ALARM OFF" event={d.times_alarm_deactivated} />
          <View style={styles.eventRow}>
            <View style={styles.eventLeft}>
              <Dot color={eventColor(lowBatTimes)} />
              <Text style={styles.eventLabel}>LOW BATTERY</Text>
            </View>
            <Text style={styles.eventValue}>{formatLowBattery(d.low_battery_events)}</Text>
          </View>
          <EventRow label="MAIN POWER OFF" event={d.main_power_events} />
          <EventRow label="WRONG WIRING" event={d.wrong_wiring_events} />
          <EventRow label="WIRE INTERCONNECTION" event={d.wire_interconnect_events} />
          <EventRow label="INTERCONNECTION (RF)" event={d.interconnect_events} />
        </View>

        {/* Location */}
        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>Alarm Location (room)</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationTag}>
              <Text style={styles.locationTagText}>{room || '—'}</Text>
            </View>
            <View style={styles.locationTag}>
              <Text style={styles.locationTagText}>{roomNum || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {report.actions.length > 0 && (
          <View style={styles.eventsCard}>
            <Text style={styles.singleLabel}>INSPECTION ACTIONS</Text>
            {report.actions.map((a, i) => (
              <View key={i} style={styles.actionRow}>
                <Dot color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>{a.issueTitle}</Text>
                  <Text style={styles.actionSub}>{a.actionLabel}: {a.result}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Photos */}
        <View style={styles.eventsCard}>
          <Text style={styles.singleLabel}>INSPECTION PHOTOS</Text>
          <View style={styles.photoRow}>
            <View style={styles.photoBox}>
              <Text style={styles.photoLabel}>Device Code</Text>
              <View style={styles.photoFrame}>
                {report.photos.deviceCode ? (
                  <Image source={{ uri: report.photos.deviceCode }} style={styles.photoImg} />
                ) : (
                  <Text style={styles.photoPlaceholder}>No image</Text>
                )}
              </View>
            </View>
            <View style={styles.photoBox}>
              <Text style={styles.photoLabel}>Equipment Location</Text>
              <View style={styles.photoFrame}>
                {report.photos.equipmentLocation ? (
                  <Image source={{ uri: report.photos.equipmentLocation }} style={styles.photoImg} />
                ) : (
                  <Text style={styles.photoPlaceholder}>No image</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Edit button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onEdit}
          activeOpacity={0.85}
          testID="button-edit-report"
        >
          <Text style={styles.editBtnText}>Edit Report</Text>
        </TouchableOpacity>

      </ScrollView>
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

  // Meta card
  metaCard: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14 },
  metaRow: { flexDirection: 'row', marginBottom: 8 },
  metaCol: { flex: 1, paddingRight: 8 },
  metaLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  metaValue: { fontSize: 13, color: '#222', fontWeight: '600' },

  // Step indicator — all done
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
  stepCircleDone: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumDone: { fontSize: 10, color: '#fff', fontWeight: '700' },
  stepLabelDone: { fontSize: 12, color: Colors.primary, marginLeft: 6, fontWeight: '700' },
  stepDashDone: {
    width: 50,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
    marginHorizontal: 6,
  },

  // Two-column card
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

  // Events / single-col card
  eventsCard: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
  singleLabel: { fontSize: 11, color: '#999', marginBottom: 10, fontWeight: '500' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F4',
  },
  eventLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  eventLabel: { fontSize: 12, color: '#222', fontWeight: '600' },
  eventValue: { fontSize: 12, color: '#666', textAlign: 'right' },

  // Location
  locationCard: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
  locationLabel: { fontSize: 12, color: '#999', marginBottom: 10, fontWeight: '500' },
  locationRow: { flexDirection: 'row', gap: 10 },
  locationTag: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  locationTagText: { fontSize: 13, color: '#222', fontWeight: '500' },

  // Actions
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F4F4F4' },
  actionTitle: { fontSize: 13, fontWeight: '600', color: '#222' },
  actionSub: { fontSize: 12, color: '#666', marginTop: 2 },

  // Photos
  photoRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  photoBox: { flex: 1 },
  photoLabel: { fontSize: 11, color: '#999', marginBottom: 6 },
  photoFrame: {
    backgroundColor: '#F2F2F2',
    borderRadius: 6,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { fontSize: 11, color: '#bbb' },

  // Edit button
  editBtn: {
    marginHorizontal: 14,
    marginTop: 6,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
