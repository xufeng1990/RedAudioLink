module.exports = {
  dependencies: {
    'react-native-audio-record': {
      platforms: {
        ios: null,
        android: {
          // Path is relative to mobile/ (project root where this file lives).
          // The package is installed under mobile/node_modules/, so use ./
          sourceDir: './node_modules/react-native-audio-record/android',
          packageImportPath: 'import com.goodatlas.audiorecord.RNAudioRecordPackage;',
          packageInstance: 'new RNAudioRecordPackage()',
        },
      },
    },
  },
};
