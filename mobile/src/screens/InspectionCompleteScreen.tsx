import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Colors } from '../theme/colors';
import { InspectionReport, Device } from '../types';

interface Props {
  report: InspectionReport;
  device: Device;
  onDone: () => void;
  onNewInspection: () => void;
}

export default function InspectionCompleteScreen({ report, device, onDone, onNewInspection }: Props) {
  const completionDate = new Date().toLocaleString('en-AU');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.success} />

      <View style={styles.header}>
        <View />
        <Text style={styles.headerTitle}>Complete</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.successBanner}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Inspection Complete</Text>
            <Text style={styles.successSubtitle}>Report #{report.id}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>DEVICE DETAILS</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Model</Text>
              <Text style={styles.detailValue}>{device.model}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Serial Number</Text>
              <Text style={styles.detailValue}>{device.serialNumber}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{report.location.roomType} {report.location.roomNumber}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed</Text>
              <Text style={styles.detailValue}>{completionDate}</Text>
            </View>
          </View>

          {report.actions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ACTIONS TAKEN ({report.actions.length})</Text>
              {report.actions.map((action, i) => (
                <View key={i}>
                  <View style={styles.actionRow}>
                    <View style={styles.actionDot} />
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                  {i < report.actions.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          )}

          {report.notes ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>NOTES</Text>
              <Text style={styles.notesText}>{report.notes}</Text>
            </View>
          ) : null}

          {report.images.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>PHOTOS ({report.images.length})</Text>
              <Text style={styles.photosText}>{report.images.length} photo{report.images.length !== 1 ? 's' : ''} attached to this report.</Text>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.newButton} onPress={onNewInspection} activeOpacity={0.8}>
              <Text style={styles.newButtonText}>Inspect Another Device</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={onDone} activeOpacity={0.8}>
              <Text style={styles.doneButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  successBanner: {
    backgroundColor: Colors.success,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    fontSize: 30,
    lineHeight: 60,
    textAlign: 'center',
    color: Colors.success,
    fontWeight: '900',
    marginBottom: 12,
    overflow: 'hidden',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
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
    padding: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginTop: 5,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  photosText: {
    fontSize: 14,
    color: Colors.text,
  },
  buttons: {
    gap: 10,
    marginTop: 8,
  },
  newButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  doneButton: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doneButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
