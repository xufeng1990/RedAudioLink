import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Property, Device } from '../types';

interface Props {
  property: Property;
  onSelectDevice: (device: Device) => void;
  onBack: () => void;
}

export default function PropertyDetailScreen({ property, onSelectDevice, onBack }: Props) {
  const renderDevice = ({ item }: { item: Device }) => {
    const statusColor =
      item.sensorStatus === 'OK' ? Colors.success :
      item.sensorStatus === 'LOW_BATTERY' ? Colors.warning :
      Colors.danger;

    const statusLabel =
      item.sensorStatus === 'OK' ? 'OK' :
      item.sensorStatus === 'LOW_BATTERY' ? 'LOW BATTERY' :
      'FAULT';

    return (
      <TouchableOpacity
        style={styles.deviceCard}
        onPress={() => onSelectDevice(item)}
        activeOpacity={0.7}
      >
        <View style={styles.deviceHeader}>
          <View>
            <Text style={styles.deviceModel}>{item.model}</Text>
            <Text style={styles.deviceSN}>SN: {item.serialNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.deviceInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{item.location.roomType} {item.location.roomNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Battery</Text>
            <Text style={styles.infoValue}>{(item.batteryVoltage ?? item.battery ?? 0).toFixed(3)} V</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Replacement Date</Text>
            <Text style={styles.infoValue}>{item.replacementDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Days Remaining</Text>
            <Text style={styles.infoValue}>{item.daysRemaining}</Text>
          </View>
        </View>

        <View style={styles.deviceFooter}>
          <Text style={styles.inspectText}>Tap to inspect →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.propertyInfo}>
        <Text style={styles.propertyAddress}>{property.address}</Text>
        <View style={styles.propertyMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>CLIENT</Text>
            <Text style={styles.metaValue}>{property.client}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>CONTACT</Text>
            <Text style={styles.metaValue}>{property.contactNumber}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>DATE</Text>
            <Text style={styles.metaValue}>{property.inspectionDate}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={property.devices}
        keyExtractor={item => item.id}
        renderItem={renderDevice}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>{property.devices.length} Device{property.devices.length !== 1 ? 's' : ''}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '500',
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  propertyInfo: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  propertyAddress: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 22,
  },
  propertyMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  deviceCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    marginBottom: 14,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  deviceModel: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  deviceSN: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deviceInfo: {
    padding: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  deviceFooter: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  inspectText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
});
