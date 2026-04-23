import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import { Device } from '../types';
import WebCropModal from '../components/WebCropModal';

interface Props {
  device: Device;
  onBack: () => void;
  onFinish: (images: {
    deviceCode: string | null;
    equipmentLocation: string | null;
  }) => void | Promise<void>;
}

const STEPS = ['Report', 'Action', 'Image'];

const StepIndicator = ({ active }: { active: number }) => (
  <View style={styles.stepRow}>
    {STEPS.map((label, i) => {
      const isActive = i === active;
      const isDone = i < active;
      const filled = isActive || isDone;
      return (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, filled && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, filled && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, filled && styles.stepLabelActive]}>{label}</Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[styles.stepDash, isDone && { borderTopColor: Colors.primary }]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);


interface UploadCardProps {
  title: string;
  image: string | null;
  onPick: () => void;
  onClear: () => void;
  testIDPrefix: string;
}

const UploadCard = ({ title, image, onPick, onClear, testIDPrefix }: UploadCardProps) => (
  <View style={styles.uploadSection}>
    <View style={styles.uploadHeader}>
      <Text style={styles.uploadTitle}>{title}</Text>
      {image && (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={onClear}
          activeOpacity={0.7}
          testID={`${testIDPrefix}-clear`}
        >
          <View style={styles.clearCircle}>
            <Text style={styles.clearX}>×</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPick}
      style={styles.dashedBox}
      testID={`${testIDPrefix}-upload`}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
      ) : (
        <View style={styles.dashedInner}>
          <Text style={styles.dashedHint}>Tap to take photo or upload</Text>
        </View>
      )}
    </TouchableOpacity>
  </View>
);

export default function ImageStepScreen({ device, onBack, onFinish }: Props) {
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [equipmentLocation, setEquipmentLocation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingCrop, setPendingCrop] = useState<{ target: 'device' | 'equipment'; src: string } | null>(null);
  const webInputRef = useRef<HTMLInputElement | null>(null);
  const pendingTargetRef = useRef<'device' | 'equipment' | null>(null);

  const setForTarget = (target: 'device' | 'equipment', uri: string | null) => {
    if (target === 'device') setDeviceCode(uri);
    else setEquipmentLocation(uri);
  };

  // ── 网页端：将图片压缩到 max 900px，quality 0.6 ──────────────
  const compressImageWeb = (src: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 900;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = src;
    });

  // ── 网页端：文件选择器 ───────────────────────────────────────
  const pickImageWeb = (target: 'device' | 'equipment') => {
    pendingTargetRef.current = target;
    if (!webInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        const t = pendingTargetRef.current;
        if (file && t) {
          const reader = new FileReader();
          reader.onload = async () => {
            const compressed = await compressImageWeb(reader.result as string);
            setPendingCrop({ target: t, src: compressed });
          };
          reader.readAsDataURL(file);
        }
        pendingTargetRef.current = null;
        webInputRef.current = null;
      };
      webInputRef.current = input;
    }
    webInputRef.current.click();
  };

  // ── 原生端：将 asset 转成 data URL（避免 file:// 读取失败）───
  const assetToDataUrl = (asset: ImagePicker.ImagePickerAsset): string => {
    if (asset.base64) return `data:image/jpeg;base64,${asset.base64}`;
    return asset.uri; // fallback，App.tsx 会再次尝试 FileSystem 读取
  };

  // ── 原生端：从相册选图 ────────────────────────────────────────
  const pickImageNative = async (target: 'device' | 'equipment') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setForTarget(target, assetToDataUrl(result.assets[0]));
    }
  };

  // ── 原生端：调用摄像头拍照 ───────────────────────────────────
  const takePhotoNative = async (target: 'device' | 'equipment') => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setForTarget(target, assetToDataUrl(result.assets[0]));
    }
  };

  const showSourcePicker = (target: 'device' | 'equipment') => {
    if (Platform.OS === 'web') {
      pickImageWeb(target);
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhotoNative(target);
          else if (buttonIndex === 2) pickImageNative(target);
        },
      );
    } else {
      Alert.alert('Select Image Source', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => takePhotoNative(target) },
        { text: 'Choose from Library', onPress: () => pickImageNative(target) },
      ]);
    }
  };

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
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>MODEL:</Text>
              <Text style={styles.metaValue}>{device.model}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>SN:</Text>
              <Text style={styles.metaValue}>{device.serialNumber}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Replacement Date:</Text>
              <Text style={styles.metaValue}>{device.replacementDate}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Date Code:</Text>
              <Text style={styles.metaValue}>{device.dateCode}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Days Remaining:</Text>
              <Text style={styles.metaValue}>{device.daysRemaining}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DATE:</Text>
              <Text style={styles.metaValue}>{device.lastInspectionDate}</Text>
            </View>
          </View>
        </View>

        <StepIndicator active={2} />

        <View style={styles.imageHeader}>
          <Text style={styles.imageHeaderText}>image</Text>
        </View>

        <View style={styles.uploadsWrap}>
          <UploadCard
            title="Device Code Photo"
            image={deviceCode}
            onPick={() => showSourcePicker('device')}
            onClear={() => setDeviceCode(null)}
            testIDPrefix="device-code"
          />

          <UploadCard
            title="Equipment Location Photos"
            image={equipmentLocation}
            onPick={() => showSourcePicker('equipment')}
            onClear={() => setEquipmentLocation(null)}
            testIDPrefix="equipment-location"
          />
        </View>

        <View style={styles.footerBtns}>
          <TouchableOpacity
            style={styles.prevBtn}
            onPress={onBack}
            activeOpacity={0.85}
            testID="button-previous-step"
          >
            <Text style={styles.prevBtnText}>Previous Step</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.finishBtn, submitting && styles.finishBtnDisabled]}
            onPress={async () => {
              if (submitting) return;
              setSubmitting(true);
              try {
                await onFinish({ deviceCode, equipmentLocation });
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            activeOpacity={0.85}
            testID="button-finish"
          >
            <Text style={styles.finishBtnText}>
              {submitting ? 'Saving...' : 'Finish'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {pendingCrop && (
        <WebCropModal
          src={pendingCrop.src}
          onCancel={() => setPendingCrop(null)}
          onConfirm={(cropped) => {
            setForTarget(pendingCrop.target, cropped);
            setPendingCrop(null);
          }}
        />
      )}
    </View>
  );
}

const PINK_BG = '#FDE7E9';

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
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepNum: { fontSize: 11, color: '#999', fontWeight: '700' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 12, color: '#999', marginLeft: 6, fontWeight: '500' },
  stepLabelActive: { color: Colors.primary, fontWeight: '700' },
  stepDash: { width: 50, height: 1, borderTopWidth: 1, borderTopColor: '#DDD', borderStyle: 'dashed', marginHorizontal: 6 },

  imageHeader: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', marginBottom: 1 },
  imageHeaderText: { fontSize: 13, color: '#222' },

  uploadsWrap: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16 },
  uploadSection: { marginTop: 14 },
  uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  uploadTitle: { fontSize: 13, color: '#222', fontWeight: '500' },
  clearBtn: { padding: 2 },
  clearCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearX: { color: Colors.primary, fontSize: 14, fontWeight: '700', marginTop: -2 },

  dashedBox: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderStyle: 'dashed',
    borderRadius: 6,
    aspectRatio: 1,
    overflow: 'hidden',
  },
  dashedInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  dashedHint: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 12 },

  footerBtns: { flexDirection: 'row', paddingHorizontal: 14, marginTop: 14, gap: 10 },
  prevBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: PINK_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  finishBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  finishBtnDisabled: { opacity: 0.6 },
});
