import configPlugins from 'expo/config-plugins.js';

const { AndroidConfig, withAppBuildGradle, withGradleProperties } = configPlugins;

const releaseProguardFiles = /^[\t ]*proguardFiles getDefaultProguardFile\("proguard-android(?:-optimize)?\.txt"\), "proguard-rules\.pro"[\t ]*\r?$/m;

export default function withAndroidReleaseOptimization(config) {
  config = withGradleProperties(config, (mod) => {
    const { updateAndroidBuildProperty } = AndroidConfig.BuildProperties;
    updateAndroidBuildProperty(mod.modResults, 'android.enableMinifyInReleaseBuilds', 'true');
    updateAndroidBuildProperty(mod.modResults, 'android.enableShrinkResourcesInReleaseBuilds', 'true');
    return mod;
  });

  return withAppBuildGradle(config, (mod) => {
    const { contents } = mod.modResults;
    if (!releaseProguardFiles.test(contents)) {
      throw new Error('Expo Android 릴리스에서 ProGuard 기본 설정을 찾을 수 없습니다.');
    }
    mod.modResults.contents = contents.replace(releaseProguardFiles, (line) =>
      line.replace('proguard-android.txt', 'proguard-android-optimize.txt'),
    );
    return mod;
  });
}
