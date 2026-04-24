const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Standalone plugin that writes RECORD_AUDIO directly into AndroidManifest.xml.
 * This runs independently of expo-audio, expo-image-picker, and the Gradle
 * linking plugin so nothing can override or remove this permission.
 */
module.exports = function withAndroidMicPermission(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    const permissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ];

    if (!Array.isArray(androidManifest['uses-permission'])) {
      androidManifest['uses-permission'] = [];
    }

    const existing = androidManifest['uses-permission'].map(
      (item) => item?.$ && item.$['android:name']
    );

    for (const perm of permissions) {
      if (!existing.includes(perm)) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    return config;
  });
};
