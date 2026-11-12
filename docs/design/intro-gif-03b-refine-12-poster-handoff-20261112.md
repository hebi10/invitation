# INTRO-GIF-03-B-REFINE — 12종 정지 포스터 시각 품질 보정 인수

기준일: 2026-11-12 · 범위: 디자인 참고용 정지 이미지 12종 / GIF·카탈로그·운영 데이터 변경 없음
선행 문서: 03-A PR #105, 03-B PR #106. 기존 #100의 intro-01 원본 WebP SHA-256 보존.

## 파일 보관 위치
- Google Drive 보정본 폴더: https://drive.google.com/drive/folders/1ORt8SO6tPh5VqqvGYzuZk_ykllGrI5TH
- 전체 보정 비교 PNG: https://drive.google.com/file/d/1YzMtQK3P7vBv0P8h7sV5qGg_UIn924Uy/view
- 보정본 전체 ZIP: https://drive.google.com/file/d/1WWHWYoGGiR3qtX8C6Bo5B3DOVUBrjXsL/view
- SHA-256 / 파일 규격 manifest: https://drive.google.com/file/d/1pDlcmqkWLeNc7XfxSKDtUjOCzBzsn2SY/view
- 휴대폰 320px 목업: https://drive.google.com/file/d/1m24JVJEexXRbnGeIzGWgJshBfnV08tnD/view
- 휴대폰 390px 목업: https://drive.google.com/file/d/1sf-7zxBp5nWN-OPtibl0HWN5sXsqvWGw/view
- PC 1440px 목업: https://drive.google.com/file/d/1mfAvXChzqT0MM6rapFTgXC60qgwjxlp6/view

## 12종 시각 보정
| ID | 그룹 | 이름 | 적용 대상 | 보정 및 보존 사항 |
|---|---|---|---|---|
| 01 | 심플 | 미니멀 라인 | 전 행사 | 기존 poster.webp의 원본 SHA-256(497ed73a...) 그대로 보존; 신규 파일 덮어쓰기 없음 |
| 02 | 심플 | 페이드 타이포 | 전 행사 | Wedding Invitation 영문 제거, 중성 INVITATION 활자 삽입, 잎 색채 절제 |
| 03 | 심플 | 카드 프레임 | 전 행사 | WEDDING 문구·상단 장식 및 잔여 인페인팅 아티팩트 제거, 가는 프레임 유지 |
| 04 | 감성 | 봉투 열림 | 전 행사 | 웨딩 전용 영문 제거, 평면적인 초대 카드 구도/봉투 유지, 채도 감소 |
| 05 | 감성 | 종이 펼침 | 전 행사 | 웨딩 전용 영문·의미 없는 장식 글자 제거, 카드 접힘과 문구 보존 |
| 06 | 감성 | 페이지 넘김 | 전 행사 | 웨딩 전용 영문 제거, 페이지 모서리와 중성 안내 활자 보존 |
| 07 | 화려 | 플로럴 블룸 | 웨딩 전용 | 꽃·타이틀 대비 유지, 채도 완화 |
| 08 | 화려 | 골드 샤인 | 웨딩 전용 | 금색 글로우·광택 강도 완화, 따뜻한 포인트 유지 |
| 09 | 화려 | 커튼 오픈 | 웨딩 전용 | 커튼·꽃잎 연출 유지, 색채와 대비 완화 |
| 10 | 캐릭터 | 신랑신부 손잡기 | 웨딩 전용 | 동일한 2D 커플 계열 톤으로 정리, 영문 보조 활자 통일 |
| 11 | 캐릭터 | 웨딩 행진 | 웨딩 전용 | 보조 활자·색감 통일, 걷는 동작을 나타내는 정지 포즈 유지 |
| 12 | 캐릭터 | 커플 인사 | 웨딩 전용 | 보조 활자·색감 통일, 인사하는 정지 포즈 유지 |

## QA 및 파일 인수
- 원본 12장 각각 480×600px PNG + WebP = 개별 24개. 모든 파일 SHA-256 계산과 manifest 대조 24/24 통과.
- WebP 12개 모두 개별 50KB 미만, 최대 33,758 bytes. 대상 01 WebP는 원본 SHA-256 497ed73a363ca4ce0e04f7ab6a19908badbe1b95213672fb29e27fd86eecf0be 와 일치합니다.
- 그룹 비교판 4장, 전체 비교판 1장, 320/390/1440px 목록 목업 3장, manifest JSON 1개와 ZIP 1개. Drive 폴더 내 34개 항목 및 PNG/WebP 12쌍 존재를 확인했습니다.
- 신규 GIF 출력과 8프레임 모션·2000ms·비반복 판정은 **아직 시행하지 않았습니다**. 정적 이미지의 480×600 규격은 GIF 프레임 타이밍 검증과 다릅니다.
- 원본 이미지 생성형의 드레스·종이 질감은 완전한 벡터/2D 평면이 아닙니다. 특히 04의 봉투 봉인과 06의 종이 말림, 07~09의 입체 질감은 정지 시안의 표현으로 남아 있습니다.
- 커플 10~12는 컬러·복식·그림체를 시리즈 기준으로 맞췄으나 얼굴/인물의 픽셀 단위 동일성은 증명하지 못했습니다. 03-C에서 같은 캐릭터 레퍼런스로 실제 애니메이션을 만드는 때 프레임별 정합성 검수가 필수입니다.
- 생성형 결과의 시각적 선호는 객관적인 자동검사로 확정할 수 없으므로, 이 파일들을 **03-C 제작 참고 기준본(v1)**으로 확정하고 고객 실제 제공용 최종 승인은 GIF 실연출 확인 뒤 진행합니다.

## 운영/안전 경계
- 기존 `introStyle`·`introPresetId`, PC/Android 편집기, 공개 페이지 컴포넌트, 고객 콘텐츠, Firebase, Google Play, 운영 카탈로그는 변경하지 않았습니다.
- 이전 잘못된 9종 초안 브랜치의 02~10 GIF/ID와 합치지 않습니다. 03-B-REFINE은 기존 PR #106 다음의 문서 전용 stacked Draft PR입니다.
- 03-C에서 실제 2초·8프레임 단회 재생 GIF 11종, 최종 frame→WebP 포스터 및 SHA 검증. 03-D에서 12종 그룹별 카탈로그와 행사 타입 검증을 구현한 뒤 통합 QA와 순차 병합을 진행합니다.
