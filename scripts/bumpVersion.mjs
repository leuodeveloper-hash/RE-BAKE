#!/usr/bin/env node
/**
 * 버전 올리기 — package.json + app.json + iOS(pbxproj) + Android(build.gradle)를
 * 한 번에 맞춘다.
 *
 * 버전이 네 곳에 흩어져 있어(app.json / MARKETING_VERSION / CURRENT_PROJECT_VERSION /
 * versionName / versionCode) 손으로 올리면 반드시 어긋난다. 특히 iOS는 Xcode 수동
 * 빌드라 pbxproj 값이 실제로 나가는 버전이고, app.json만 올리면 앱은 옛 버전으로 뜬다.
 *
 * 사용:
 *   node scripts/bumpVersion.mjs patch   1.0.0 → 1.0.1  (기본)
 *   node scripts/bumpVersion.mjs minor   1.0.0 → 1.1.0
 *   node scripts/bumpVersion.mjs major   1.0.0 → 2.0.0
 *   node scripts/bumpVersion.mjs 1.4.2   특정 버전으로
 *   node scripts/bumpVersion.mjs build   버전은 그대로, 빌드번호만 +1
 *
 * 빌드번호(CURRENT_PROJECT_VERSION / versionCode)는 항상 +1 된다 — 같은 버전으로
 * 재제출할 때 스토어가 빌드번호 중복을 거부하기 때문.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const P = {
  appJson: resolve(root, 'app.json'),
  pkgJson: resolve(root, 'package.json'),
  pbxproj: resolve(root, 'ios/Bakle.xcodeproj/project.pbxproj'),
  iosPlist: resolve(root, 'ios/Bakle/Info.plist'),
  gradle: resolve(root, 'android/app/build.gradle'),
};

const arg = process.argv[2] ?? 'patch';

function nextVersion(cur, kind) {
  if (kind === 'build') return cur;
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [maj, min, pat] = cur.split('.').map(Number);
  if (kind === 'major') return `${maj + 1}.0.0`;
  if (kind === 'minor') return `${maj}.${min + 1}.0`;
  if (kind === 'patch') return `${maj}.${min}.${pat + 1}`;
  throw new Error(`알 수 없는 인자: ${kind} (patch|minor|major|build|1.2.3)`);
}

// ---- app.json (진실의 원본) -------------------------------------------------
const appJson = JSON.parse(readFileSync(P.appJson, 'utf8'));
const curVersion = appJson.expo.version;
const version = nextVersion(curVersion, arg);
appJson.expo.version = version;
writeFileSync(P.appJson, JSON.stringify(appJson, null, 2) + '\n');

// ---- package.json ----------------------------------------------------------
// 앱이 읽는 값은 아니지만 어긋나 있으면 어느 쪽이 맞는지 헷갈린다.
try {
  const pkgRaw = readFileSync(P.pkgJson, 'utf8');
  writeFileSync(P.pkgJson, pkgRaw.replace(/("version":\s*)"[^"]+"/, `$1"${version}"`));
} catch (e) {
  console.warn(`⚠️  package.json 건너뜀: ${e.message}`);
}

// ---- iOS: pbxproj ----------------------------------------------------------
// MARKETING_VERSION(표시 버전) / CURRENT_PROJECT_VERSION(빌드번호)이 Debug·Release
// 두 구성에 각각 있어 전부 바꾼다.
let build = 1;
try {
  let pbx = readFileSync(P.pbxproj, 'utf8');
  const curBuild = Number(pbx.match(/CURRENT_PROJECT_VERSION = (\d+);/)?.[1] ?? 0);
  build = curBuild + 1;
  pbx = pbx
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${build};`);
  writeFileSync(P.pbxproj, pbx);
} catch (e) {
  console.warn(`⚠️  iOS 건너뜀: ${e.message}`);
}

// ---- iOS: Info.plist -------------------------------------------------------
// plist에 숫자가 박혀 있으면 pbxproj를 올려도 앱은 옛 버전으로 뜬다(실제로 그랬다).
// 빌드 설정을 따라가도록 $(MARKETING_VERSION)/$(CURRENT_PROJECT_VERSION)로 되돌린다
// — expo prebuild가 숫자를 다시 박아넣을 수 있어 bump마다 확인한다.
try {
  let plist = readFileSync(P.iosPlist, 'utf8');
  const before = plist;
  plist = plist
    .replace(/(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
             '$1$(MARKETING_VERSION)$2')
    .replace(/(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
             '$1$(CURRENT_PROJECT_VERSION)$2');
  if (plist !== before) {
    writeFileSync(P.iosPlist, plist);
    console.log('   ℹ️  Info.plist의 하드코딩된 버전을 빌드 설정 참조로 되돌렸습니다.');
  }
} catch (e) {
  console.warn(`⚠️  Info.plist 건너뜀: ${e.message}`);
}

// ---- Android: build.gradle -------------------------------------------------
try {
  let gradle = readFileSync(P.gradle, 'utf8');
  gradle = gradle
    .replace(/versionName "[^"]+"/, `versionName "${version}"`)
    .replace(/versionCode \d+/, `versionCode ${build}`);
  writeFileSync(P.gradle, gradle);
} catch (e) {
  console.warn(`⚠️  Android 건너뜀: ${e.message}`);
}

console.log(`✅ ${curVersion} → ${version} (build ${build})`);
console.log('   app.json / ios pbxproj / android build.gradle 반영됨');
console.log('   iOS는 Xcode에서 다시 빌드해야 적용됩니다.');
