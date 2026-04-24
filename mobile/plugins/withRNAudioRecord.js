const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin for react-native-audio-record.
 *
 * Gradle linking (settings.gradle, build.gradle, PackageList.java) is handled
 * automatically by React Native's autolinking system, which reads
 * react-native.config.js.  This plugin ONLY writes Android permissions into
 * AndroidManifest.xml, which autolinking does not do.
 *
 * Keeping these two concerns separate prevents duplicate Gradle entries that
 * would cause build failures.
 */
module.exports = function withRNAudioRecord(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    const requiredPermissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ];

    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [];
    }

    const existing = manifest['uses-permission'].map(
      (item) => item?.$ && item.$['android:name']
    );

    for (const perm of requiredPermissions) {
      if (!existing.includes(perm)) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    return config;
  });
};
