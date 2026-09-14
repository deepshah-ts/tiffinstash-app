const {releaseErrors} = require('./lib/core.cjs');
module.exports = () => {
  const production = process.env.APP_VARIANT === 'production';
  if (production) {
    const errors = releaseErrors(process.env);
    if (errors.length) throw new Error('\nRELEASE BLOCKED:\n- ' + errors.join('\n- '));
  }
  return {
    name: production ? 'TiffinStash' : 'TiffinStash Preview',
    slug: 'tiffinstash-mobile',
    version: process.env.APP_VERSION || '5.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    scheme: production ? 'tiffinstash' : 'tiffinstash-preview',
    newArchEnabled: true,
    ios: {
      // Verified against the live App Store record (App Store ID 6505018028).
      bundleIdentifier: production ? 'org.tiffinstash.app' : 'com.tiffinstash.preview',
      buildNumber: production ? process.env.IOS_BUILD_NUMBER : '1',
      supportsTablet: false,
      infoPlist: {ITSAppUsesNonExemptEncryption: false}
    },
    android: {
      package: production ? 'com.tiffinstash' : 'com.tiffinstash.preview',
      versionCode: production ? Number(process.env.ANDROID_VERSION_CODE) : 1,
      blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.CAMERA', 'android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE']
    },
    plugins: [
      ['expo-notifications', {color: '#DE5200'}],
      ['expo-splash-screen', {backgroundColor: '#FFFFFF', image: './assets/logo.png', imageWidth: 230, resizeMode: 'contain'}]
    ],
    web: {bundler: 'metro', name: 'TiffinStash Preview', favicon: './assets/icon.png'},
    experiments: {
      baseUrl: process.env.BASE_URL || ''
    },
    extra: {
      appVariant: production ? 'production' : 'preview',
      existingAppStoreId: '6505018028',
      productionIosBundleIdentifier: 'org.tiffinstash.app',
      productionAndroidPackage: 'com.tiffinstash',
      contentEndpointConfigured: Boolean(process.env.EXPO_PUBLIC_CONFIG_URL),
      ...(process.env.EAS_PROJECT_ID ? {eas: {projectId: process.env.EAS_PROJECT_ID}} : {})
    }
  };
};
