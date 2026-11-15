#!/usr/bin/env bash
# Membangun APK tanpa Android Studio/Gradle: aapt + javac + dx + zipalign + apksigner.
# Ubuntu: apt-get install android-sdk-build-tools apksigner zipalign  (Java 17+)
set -euo pipefail
cd "$(dirname "$0")"
BT=/usr/lib/android-sdk/build-tools/29.0.3
JAR=${ANDROID_JAR:-.cache/android-30.jar}
if [ ! -f "$JAR" ]; then
  mkdir -p .cache
  curl -fsSL -o "$JAR" https://raw.githubusercontent.com/Sable/android-platforms/master/android-30/android.jar
fi
rm -rf out gen && mkdir -p out/classes gen
cp ../simpeg-jurnal-otomatis/kegiatan.js assets/kegiatan.js        # penyusun jurnal yang sama dengan plugin Chrome
"$BT/aapt" package -f -m -J gen -M AndroidManifest.xml -S res -A assets -I "$JAR" -F out/dasar.apk
javac -nowarn --release 8 -encoding UTF-8 -cp "$JAR" -d out/classes $(find src gen -name '*.java') 2>&1 | grep -v "^warning\|bootstrap\|^1 warning" || true
[ -f out/classes/id/bhpmedan/jurnalsimpeg/LayananIsi.class ] || { echo "javac gagal"; exit 1; }
"$BT/dx" --dex --min-sdk-version=24 --output=out/classes.dex out/classes
cp out/dasar.apk out/belum-ditandatangani.apk
(cd out && "$BT/aapt" add belum-ditandatangani.apk classes.dex >/dev/null)
zipalign -f 4 out/belum-ditandatangani.apk out/rata.apk
KS=kunci-tanda-tangan.jks
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass jurnalsimpeg -keypass jurnalsimpeg -alias jurnal \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Jurnal SIMPEG BHP Medan" >/dev/null 2>&1
apksigner sign --ks "$KS" --ks-pass pass:jurnalsimpeg --ks-key-alias jurnal --out JurnalSIMPEG.apk out/rata.apk
apksigner verify JurnalSIMPEG.apk && ls -la JurnalSIMPEG.apk
