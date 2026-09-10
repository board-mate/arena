# 🗂️ Project Structure — v11.4.57

```text
/
├─ README.md                         # GitHub/배포본 메인 안내
├─ START_HERE.md                     # 인수인계 첫 진입점
├─ HANDOFF_VERSION.txt               # 현재 기준 버전
├─ index.html / app.js / styles.css  # 메인 앱
├─ alarm.js                          # 브라우저/PWA 알림
├─ multi-common.js                   # 다인플 공용 로직
├─ solo-save-ui.js                   # 1인플 저장 공용 UI
├─ config.js                         # Supabase 공개 클라이언트 설정
├─ manifest.webmanifest / sw.js      # PWA
├─ icons/                            # 앱 아이콘 + 원본 로고
├─ online-*.html                     # 다인플 게임 18개
├─ solo-*.html                       # 1인플 게임 7개
├─ powergrid/                        # 파워그리드 전용 런타임
├─ social/                           # 소셜 디덕션 공용 런타임
├─ database/
│  ├─ SUPABASE_CURRENT_UPDATE.sql    # 현재 DB repair/update 체인
│  └─ history/                       # 과거 SQL 원문 — 보존
└─ docs/
   ├─ current/
   │  ├─ HANDOFF_CURRENT.md          # 현재 인수인계
   │  ├─ NEXT_CHAT_PROMPT.md         # 다음 세션 시작용
   │  ├─ TEST_STATUS_CURRENT.md      # 현재 테스트 상태
   │  ├─ RELEASE_CHECKLIST.md        # 배포/회귀 체크리스트
   │  ├─ DEPLOYMENT_CURRENT.md       # 배포 방법
   │  ├─ PROJECT_STRUCTURE.md        # 이 문서
   │  ├─ CHANGELOG_MASTER.md         # 통합 변경 색인
   │  └─ DATABASE_CURRENT.md         # 현재 DB 상태
   └─ history/
      ├─ updates/                    # 과거 기능/인수인계 원문
      ├─ verification/               # 과거 검증 원문
      ├─ deployment/                 # 과거 배포 원문
      └─ ROLLBACK_GUIDE.md           # 롤백 원칙
```

## 관리 원칙

- 현재 이해용 요약은 `docs/current/`에 최신화합니다.
- 과거 원문은 `docs/history/`와 `database/history/`에서 지우지 않습니다.
- 임시 테스트 산출물은 최종 FULL에 꼭 필요한 경우만 포함합니다.
- 공용 파일 변경은 여러 게임에 영향을 줄 수 있으므로 회귀 검사를 우선합니다.
