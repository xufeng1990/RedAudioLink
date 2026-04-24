const {
  withSettingsGradle,
  withAppBuildGradle,
  withAndroidManifest,
} = require('@expo/config-plugins');

/**
 * Config plugin for react-native-audio-record.
 * 1. Force-links the native module into the Android Gradle build.
 * 2. Explicitly writes RECORD_AUDIO and related permissions into AndroidManifest.xml
 *    so they are guaranteed to appear in the built APK regardless of what
 *    other plugins or the permissions array does.
 */
function withRNAudioRecord(config) {
  // ── Step 1: Ensure permissions are in AndroidManifest ──────────────────────
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    const requiredPermissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
    ];

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const existing = manifest['uses-permission'].map(
      (p) => p.$?.['android:name'] || ''
    );

    for (const perm of requiredPermissions) {
      if (!existing.includes(perm)) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    return config;
  });

  // ── Step 2: Add module to android/settings.gradle ──────────────────────────
  config = withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;
    const include = `include ':react-native-audio-record'`;
    if (!contents.includes(include)) {
      config.modResults.contents =
        contents +
        `\n// react-native-audio-record\n` +
        include +
        `\nproject(':react-native-audio-record').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-audio-record/android')\n`;
    }
    return config;
  });

  // ── Step 3: Add implementation to android/app/build.gradle ─────────────────
  config = withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const dep = `implementation project(':react-native-audio-record')`;
    if (!contents.includes(dep)) {
      config.modResults.contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    ${dep}`
      );
    }
    return config;
  });

  return config;
}

module.exports = withRNAudioRecord;
