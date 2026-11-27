import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import configPlugins from 'expo/config-plugins.js';

const { AndroidConfig, withAppBuildGradle, withDangerousMod, withGradleProperties } = configPlugins;

const releaseProguardFiles = /^[\t ]*proguardFiles getDefaultProguardFile\("proguard-android(?:-optimize)?\.txt"\), "proguard-rules\.pro"[\t ]*\r?$/m;
const keepRecordField = '-keep @interface expo.modules.kotlin.records.Field { *; }';

export default function withAndroidReleaseOptimization(config) {
  config = withGradleProperties(config, (mod) => {
    const { updateAndroidBuildProperty } = AndroidConfig.BuildProperties;
    updateAndroidBuildProperty(mod.modResults, 'android.enableMinifyInReleaseBuilds', 'true');
    updateAndroidBuildProperty(mod.modResults, 'android.enableShrinkResourcesInReleaseBuilds', 'true');
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    const { contents } = mod.modResults;
    if (!releaseProguardFiles.test(contents)) {
      throw new Error('Expo Android 릴리스에서 ProGuard 기본 설정을 찾을 수 없습니다.');
    }
    mod.modResults.contents = contents.replace(releaseProguardFiles, (line) =>
      line.replace('proguard-android.txt', 'proguard-android-optimize.txt'),
    );
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    const rulesPath = join(mod.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
    const rules = await readFile(rulesPath, 'utf8');
    if (!rules.split(/\r?\n/).includes(keepRecordField)) {
      // Expo record conversion reads this annotation at runtime (expo/expo#51206).
      await appendFile(rulesPath, `\n${keepRecordField}\n`, 'utf8');
    }
    return mod;
  }]);
}
