module.exports = {
  dependencies: {
    'react-native-audio-record': {
      platforms: {
        ios: null,
        android: {
          sourceDir: '../node_modules/react-native-audio-record/android',
          packageImportPath: 'import com.goodatlas.audiorecord.RNAudioRecordPackage;',
          packageInstance: 'new RNAudioRecordPackage()',
        },
      },
    },
  },
};
