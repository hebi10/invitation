#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

if [[ "${GITHUB_REF:-}" != refs/heads/main ]] || [[ "${GITHUB_EVENT_NAME:-}" != push && "${GITHUB_EVENT_NAME:-}" != workflow_dispatch ]]; then
  echo '::error::서명은 main push 또는 main 수동 실행만 허용합니다.' >&2
  exit 1
fi

configured=0
for name in INVITATION_KEYSTORE_BASE64 INVITATION_KEYSTORE_PASSWORD INVITATION_KEY_ALIAS INVITATION_KEY_PASSWORD; do
  if [[ -n "${!name:-}" ]]; then configured=$((configured + 1)); fi
done
if [[ "$configured" -eq 0 ]]; then
  if [[ "${DEPLOY_REQUESTED:-false}" == true ]]; then
    echo '::error::Play 배포에 필요한 청첩장 서명 Secrets 4개가 없습니다.' >&2
    exit 1
  fi
  echo '서명 인증 정보 없음: 미서명 APK/AAB만 보관합니다.' >> "$GITHUB_STEP_SUMMARY"
  echo 'signed=false' >> "$GITHUB_OUTPUT"
  exit 0
fi
if [[ "$configured" -ne 4 ]]; then
  echo '::error::청첩장 서명 Secrets 4개를 모두 등록하거나 모두 비워 두세요.' >&2
  exit 1
fi
if [[ "${1:-}" == --check ]]; then exit 0; fi

expected_certificate=0C539396DA7BAE224EDC46C6250C54F65D7CEF3B310D845D672B5848B98EF20F
tools="${ANDROID_HOME:?}/build-tools/36.0.0"
base_name="${BASE_NAME:?}"
if [[ ! "$base_name" =~ ^invitation-[A-Za-z0-9.+-]+-code[0-9]+-[a-f0-9]{12}$ ]]; then
  echo '::error::서명 산출물 이름이 올바르지 않습니다.' >&2
  exit 1
fi
umask 077
signing_store="$RUNNER_TEMP/invitation-upload-keystore"
certificate="$RUNNER_TEMP/invitation-upload-certificate.der"
aligned_apk="$RUNNER_TEMP/invitation-aligned.apk"
apk_report="$RUNNER_TEMP/invitation-apk-signature.txt"
aab_report="$RUNNER_TEMP/invitation-aab-signature.txt"
trap 'rm -f "$signing_store" "$certificate" "$aligned_apk" "$apk_report" "$aab_report"' EXIT
printf '%s' "$INVITATION_KEYSTORE_BASE64" | base64 --decode > "$signing_store"
keytool -exportcert -keystore "$signing_store" -storepass:env INVITATION_KEYSTORE_PASSWORD \
  -alias "$INVITATION_KEY_ALIAS" -file "$certificate" > /dev/null
actual_certificate=$(sha256sum "$certificate" | cut -d ' ' -f 1 | tr '[:lower:]' '[:upper:]')
if [[ "$actual_certificate" != "$expected_certificate" ]]; then
  echo '::error::서명 키 인증서가 기존 청첩장 업로드 인증서와 다릅니다.' >&2
  exit 1
fi

mkdir -p "$RUNNER_TEMP/signed-mobile"
signed_apk="$RUNNER_TEMP/signed-mobile/$base_name.apk"
signed_aab="$RUNNER_TEMP/signed-mobile/$base_name.aab"
"$tools/zipalign" -P 16 -f 4 android/app/build/outputs/apk/release/app-release-unsigned.apk "$aligned_apk"
"$tools/apksigner" sign --ks "$signing_store" --ks-key-alias "$INVITATION_KEY_ALIAS" \
  --ks-pass env:INVITATION_KEYSTORE_PASSWORD --key-pass env:INVITATION_KEY_PASSWORD \
  --v2-signing-enabled true --v3-signing-enabled true --out "$signed_apk" "$aligned_apk"
"$tools/zipalign" -c -P 16 4 "$signed_apk"
"$tools/apksigner" verify --verbose --print-certs "$signed_apk" > "$apk_report"
grep -Fq 'Verified using v2 scheme (APK Signature Scheme v2): true' "$apk_report"
actual_certificate=$(sed -n 's/^Signer #[0-9][0-9]* certificate SHA-256 digest: //p' "$apk_report" | tr '[:lower:]' '[:upper:]' | tr -d ':\r')
if [[ "$actual_certificate" != "$expected_certificate" ]]; then
  echo '::error::최종 APK의 서명 인증서가 기존 청첩장 인증서와 다릅니다.' >&2
  exit 1
fi

jarsigner -keystore "$signing_store" -storepass:env INVITATION_KEYSTORE_PASSWORD -keypass:env INVITATION_KEY_PASSWORD \
  -signedjar "$signed_aab" android/app/build/outputs/bundle/release/app-release.aab "$INVITATION_KEY_ALIAS" > /dev/null
jarsigner -verify "$signed_aab" > /dev/null
keytool -printcert -jarfile "$signed_aab" > "$aab_report"
actual_certificate=$(sed -n 's/^[[:space:]]*SHA256: //p' "$aab_report" | tr -d ':[:space:]' | tr '[:lower:]' '[:upper:]')
if [[ "$actual_certificate" != "$expected_certificate" ]]; then
  echo '::error::최종 AAB의 서명 인증서가 기존 청첩장 인증서와 다릅니다.' >&2
  exit 1
fi
(
  cd "$RUNNER_TEMP/signed-mobile"
  sha256sum "$base_name.apk" "$base_name.aab" > SHA256SUMS
  sha256sum --check SHA256SUMS
)
echo 'signed=true' >> "$GITHUB_OUTPUT"
echo '기존 청첩장 업로드 인증서와 APK v2 서명을 검증했습니다. APK/AAB와 체크섬을 보관합니다.' >> "$GITHUB_STEP_SUMMARY"
