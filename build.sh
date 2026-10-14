#!/bin/sh

set -eu
cd "$(dirname "$0")"

if [ ! -f debug.keystore ]; then
  keytool -genkeypair -v \
    -keystore debug.keystore \
    -storepass android \
    -alias androiddebugkey \
    -keypass android \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US"
fi

./gradlew :app:assembleRelease
cp app/build/outputs/apk/release/dirtyfrag.apk ./dirtyfrag.apk
ls -l ./dirtyfrag.apk
echo "OK: ./dirtyfrag.apk"
