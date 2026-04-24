const {
  withAndroidManifest,
  withSettingsGradle,
  withAppBuildGradle,
  withMainApplication,
} = require('@expo/config-plugins');

/**
 * Full manual linking for react-native-audio-record v0.2.2.
 *
 * This package predates React Native autolinking (no "react-native" field in
 * its package.json, no codegenConfig). Expo SDK 54's autolinking system will
 * silently skip it, so every step must be done explicitly:
 *
 *  Step 1 — AndroidManifest.xml  : RECORD_AUDIO + MODIFY_AUDIO_SETTINGS
 *  Step 2 — android/settings.gradle  : include ':react-native-audio-record'
 *  Step 3 — android/app/build.gradle : implementation project(...)
 *  Step 4 — MainApplication.kt       : add(RNAudioRecordPackage())
 */
module.exports = function withRNAudioRecord(config) {
  // ── Step 1: Permissions ─────────────────────────────────────────────────
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const required = [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ];
    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [];
    }
    const existing = manifest['uses-permission'].map(
      (p) => p?.$?.['android:name'] ?? ''
    );
    for (const perm of required) {
      if (!existing.includes(perm)) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }
    return config;
  });

  // ── Step 2: settings.gradle ─────────────────────────────────────────────
  config = withSettingsGradle(config, (config) => {
    const include = "include ':react-native-audio-record'";
    if (!config.modResults.contents.includes(include)) {
      config.modResults.contents +=
        '\n// react-native-audio-record (manual link)\n' +
        include + '\n' +
        "project(':react-native-audio-record').projectDir = " +
        "new File(rootProject.projectDir, '../node_modules/react-native-audio-record/android')\n";
    }
    return config;
  });

  // ── Step 3: app/build.gradle ────────────────────────────────────────────
  config = withAppBuildGradle(config, (config) => {
    const dep = "implementation project(':react-native-audio-record')";
    if (!config.modResults.contents.includes(dep)) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    ${dep}`
      );
    }
    return config;
  });

  // ── Step 4: MainApplication.kt — register the native package ────────────
  // Expo SDK 50+ generates Kotlin. The getPackages() method uses an `apply`
  // block on PackageList(this).packages; we inject our package there.
  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    const importLine = 'import com.goodatlas.audiorecord.RNAudioRecordPackage';
    const addLine    = 'add(RNAudioRecordPackage())';

    // Add import after the package declaration line (safe for both Java & Kotlin)
    if (!contents.includes('RNAudioRecordPackage')) {
      // Insert import right after the `package …` statement
      contents = contents.replace(
        /^(package\s+[\w.]+\s*\n)/m,
        `$1${importLine}\n`
      );

      // Kotlin style: PackageList(this).packages.apply { … }
      if (contents.includes('PackageList(this).packages.apply')) {
        contents = contents.replace(
          'PackageList(this).packages.apply {',
          `PackageList(this).packages.apply {\n          ${addLine}`
        );
      }
      // Java style: new PackageList(this).getPackages()
      else if (contents.includes('new PackageList(this).getPackages()')) {
        contents = contents.replace(
          'new PackageList(this).getPackages()',
          `new PackageList(this).getPackages()`
        );
        // Java fallback: add before `return packages;`
        contents = contents.replace(
          'return packages;',
          `packages.add(new RNAudioRecordPackage());\n      return packages;`
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};
