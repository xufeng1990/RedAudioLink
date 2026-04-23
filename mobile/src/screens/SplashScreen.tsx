import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Asset } from 'expo-asset';
import { Colors } from '../theme/colors';
import { isAuthenticated } from '../api/auth';

const GIF_ASSET = require('../../assets/audio_record.gif');

interface Props {
  onFinish: (authenticated: boolean) => void;
}

export default function SplashScreen({ onFinish }: Props) {
  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    (async () => {
      let authed = false;
      try {
        // 预加载录音 GIF + 验证 token 并行执行，充分利用启动等待时间
        [authed] = await Promise.all([
          isAuthenticated().catch(() => false),
          Asset.loadAsync([GIF_ASSET]).catch(() => {}),
        ]);
      } catch {
        authed = false;
      }
      const elapsed = Date.now() - start;
      const wait = Math.max(0, 1500 - elapsed);
      setTimeout(() => {
        if (!cancelled) onFinish(authed);
      }, wait);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.titleArea}>
        <Text style={styles.title}>(Red) Inspection{'\n'}Checklist</Text>
        <Text style={styles.subtitle}>Australia</Text>
      </View>

      <Text style={styles.version}>v2.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  titleArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 42,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    textAlign: 'center',
  },
  version: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    paddingBottom: 40,
  },
});
