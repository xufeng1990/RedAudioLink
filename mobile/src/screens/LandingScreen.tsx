import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  onGoLogin: () => void;
  onGoRegister: () => void;
}

export default function LandingScreen({ onGoLogin, onGoRegister }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.titleArea}>
        <Text style={styles.title}>(RED) Inspection Checklist</Text>
      </View>

      <View style={styles.buttonArea}>
        <TouchableOpacity
          style={styles.button}
          onPress={onGoLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={onGoRegister}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 30,
    fontWeight: '700',
    fontStyle: 'italic',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  buttonArea: {
    paddingHorizontal: 28,
    paddingBottom: 50,
    gap: 14,
  },
  button: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '600',
  },
});
