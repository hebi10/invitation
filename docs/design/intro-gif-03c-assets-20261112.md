# INTRO-GIF-03-C — 11종 GIF 제작·QA 및 저장소 인수

선행 작업: INTRO-GIF-03-B-REFINE / Draft PR #107 · 2026-11-12
운영 범위: 정적 자산만, 코드의 `INVITATION_INTRO_PRESETS` 활성화/배포 없음

## 실제 출력
- 신규 `intro-02.gif` ~ `intro-12.gif`: 총 11개. 기존 `intro-01` GIF·WebP와 manifest는 변경하지 않음.
- 각 GIF 480×600px, 8프레임 × 250ms = 2000ms, `loop` 메타데이터 없음(반복 재생 미설정).
- 정지 포스터 `intro-02.webp` ~ `intro-12.webp`: 보정 기준본 03-B-REFINE과 동일한 SHA-256 파일을 GitHub에 포함.
- 별도 `manifest-03c.json`은 파일별 bytes/SHA-256, 프레임, 포스터 RGB 오차, 그룹·허용 이벤트·용량 예산을 기록.
- 이미지 품질: 최종 GIF 프레임과 원본 03-B-REFINE PNG의 RGB 채널 평균 절대 오차 3.85 이하(색상 팔레트 양자화로 바이트 단위 동일하지는 않음).

## 용량 예산
| ID | 스타일 | GIF bytes | 목표 bytes |
|---|---|---:|---:|
| 02 | 페이드 타이포 | 95,538 | 100,000 |
| 03 | 카드 프레임 | 64,380 | 100,000 |
| 04 | 봉투 열림 | 178,247 | 180,000 |
| 05 | 종이 펼침 | 125,484 | 180,000 |
| 06 | 페이지 넘김 | 110,207 | 180,000 |
| 07 | 플로럴 블룸 | 149,831 | 350,000 |
| 08 | 골드 샤인 | 214,914 | 350,000 |
| 09 | 커튼 오픈 | 118,496 | 350,000 |
| 10 | 신랑신부 손잡기 | 304,293 | 450,000 |
| 11 | 웨딩 행진 | 344,213 | 450,000 |
| 12 | 커플 인사 | 296,969 | 450,000 |

## 검증 및 디자인 한계
- Pillow로 파일을 다시 열어 실제 8개 프레임과 프레임당 250ms, 총 2000ms, 비반복, 크기 480×600px, 7개 연속 프레임 간 변화를 확인.
- SHA-256과 크기는 `manifest-03c.json` 및 최종 바이너리를 직접 대조. 11/11 통과(파일 생성 환경).
- 모든 GIF는 승인된 03-B-REFINE 정지 포스터의 결과 이미지를 기반으로 한 짧은 진입 효과입니다. 특히 봉투·커플군은 단일 래스터 이미지를 재구성한 모션이라, 객체별 독립 리깅/완전한 종이 물리 시뮬레이션 또는 커플 손·얼굴의 독립적인 관절 애니메이션으로 검증된 것은 아닙니다.
- 모션의 완성도와 실제 Android/PC 고객 선택 UI의 미리보기는 후속 03-D/05 단계에서 실제 브라우저·기기로 확인해야 합니다. CI 실행 성공 여부는 검증 링크 확인 전 미판정.
- 07~12는 웨딩 전용, 02~06 및 기존 01은 전 행사 공통. **현행 카탈로그/서버에는 이벤트별 필터를 구현하지 않은 상태**이므로 신규 11종을 `active:true`로 등록하지 않음.

## 연결 및 Drive 산출물
- [Google Drive 11종 GIF+WebP 폴더](https://drive.google.com/drive/folders/1CGNJ9FTBB06jSorY8iNcUbG2gDYbp7e3)
- [최종 ZIP(11 GIF·11 PNG·11 WebP·SHA)](https://drive.google.com/file/d/1c8HYOyE2zkd6xWX18-elgYYC2O47TiXp/view)
- [SHA-256 manifest](https://drive.google.com/file/d/1F00XA3cKmu04dNPNV6mpjDpXUkfrVoaE/view)
- [프레임 최종 장면 비교판](https://drive.google.com/file/d/1FFJ9gc5oEh2DZPpgFQRhkNn93BAFTWiI/view)

## 다음 작업
- 03-D: 12종 그룹 탭, 이벤트 타입별 01~06 공통·07~12 웨딩 필터, 승인·저장·미리보기·공개 페이지 렌더러 연동.
- 05: 12종/5개 활성 행사 타입×PC·Android 다양한 화면·실기기, 포스터 폴백·모션 감소·세션·딥링크 QA.
- 06: #100~#107 및 이 PR의 CI·충돌·변경 파일을 SHA로 검증한 뒤 순차 병합 및 Firebase/Play 배포. 이 단계에서 운영 환경 변경 없음.
