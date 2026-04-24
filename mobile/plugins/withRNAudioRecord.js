const { withSettingsGradle, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to force-link react-native-audio-record in Expo managed workflow.
 * This package has no react-native.config.js and no "react-native" source field
 * in package.json, so Expo's autolinking may miss it without this plugin.
 */
function withRNAudioRecord(config) {
  // Step 1: Add to android/settings.gradle so Gradle knows about the module
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

  // Step 2: Add implementation dependency in android/app/build.gradle
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
