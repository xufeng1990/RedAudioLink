import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import { Device, InspectionReport } from '../types';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3;

interface Props {
  report: InspectionReport;
  device: Device;
  onComplete: (updatedReport: InspectionReport) => void;
  onBack: () => void;
}

export default function InspectionImageScreen({ report, device, onComplete, onBack }: Props) {
  const [images, setImages] = useState<string[]>([]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setImages(prev => prev.filter((_, i) => i !== index)),
      },
    ]);
  };

  const handleComplete = () => {
    const updatedReport: InspectionReport = {
      ...report,
      images,
      completed: true,
      step: 'image',
    };
    onComplete(updatedReport);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Photos</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.stepIndicator}>
        {['Report', 'Action', 'Image'].map((step, i) => (
          <View key={step} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              i < 2 && styles.stepCircleDone,
              i === 2 && styles.stepCircleActive
            ]}>
              <Text style={[
                styles.stepNum,
                i < 2 && styles.stepNumDone,
                i === 2 && styles.stepNumActive
              ]}>{i < 2 ? '✓' : i + 1}</Text>
            </View>
            <Text style={[
              styles.stepLabel,
              i < 2 && styles.stepLabelDone,
              i === 2 && styles.stepLabelActive
            ]}>{step}</Text>
            {i < 2 && <View style={[styles.stepLine, i < 2 && styles.stepLineDone]} />}
          </View>
        ))}
      </View>

      <View style={styles.deviceInfo}>
        <Text style={styles.deviceModel}>{device.model}</Text>
        <Text style={styles.deviceSN}>SN: {device.serialNumber} · {report.location.roomType} {report.location.roomNumber}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.7}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.7}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>

          {images.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>{images.length} Photo{images.length !== 1 ? 's' : ''} Added</Text>
              <View style={styles.photoGrid}>
                {images.map((uri, index) => (
                  <TouchableOpacity
                    key={index}
                    onLongPress={() => removeImage(index)}
                    activeOpacity={0.8}
                    style={styles.photoWrapper}
                  >
                    <Image source={{ uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeImage(index)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hintText}>Long press or tap ✕ to remove a photo</Text>
            </View>
          ) : (
            <View style={styles.emptyPhotos}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Photos Yet</Text>
              <Text style={styles.emptyText}>Add photos of the device and any issues found during inspection.</Text>
            </View>
          )}

          {report.actions.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Actions Summary</Text>
              {report.actions.map((action, i) => (
                <View key={i} style={styles.summaryItem}>
                  <Text style={styles.summaryDot}>•</Text>
                  <Text style={styles.summaryText}>{action}</Text>
                </View>
              ))}
              {report.notes ? (
                <View style={styles.summaryNotes}>
                  <Text style={styles.summaryNotesLabel}>Notes:</Text>
                  <Text style={styles.summaryNotesText}>{report.notes}</Text>
                </View>
              ) : null}
            </View>
          )}

          <TouchableOpacity style={styles.completeButton} onPress={handleComplete} activeOpacity={0.8}>
            <Text style={styles.completeButtonText}>✓ Complete Inspection</Text>
          </TouchableOpacity>

          {images.length === 0 && (
            <TouchableOpacity style={styles.skipButton} onPress={handleComplete} activeOpacity={0.8}>
              <Text style={styles.skipButtonText}>Skip Photos & Complete</Text>
            </TouchableOpacity>
          )}
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
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  photoBtnIcon: { fontSize: 28 },
  photoBtnText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    position: 'relative',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  emptyPhotos: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.card,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  summaryDot: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  summaryNotes: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryNotesText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  completeButton: {
    backgroundColor: Colors.success,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
