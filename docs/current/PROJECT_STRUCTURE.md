# 프로젝트 구조

```text
/
├─ START_HERE.md                 # 가장 먼저 읽기
├─ README.md                     # 배포본 개요
├─ HANDOFF_VERSION.txt           # 현재 패키지 버전
├─ index.html / app.js / styles.css
├─ config.js / multi-common.js / solo-save-ui.js
├─ manifest.webmanifest / sw.js
├─ icons/                        # PWA/브라우저 아이콘 + 원본
├─ online-*.html                 # 다인플 게임
├─ solo-*.html                   # 1인플 게임
├─ powergrid/                    # 파워그리드 전용 런타임
├─ social/                       # 소셜 디덕션 공용 런타임
├─ database/
│  ├─ SUPABASE_CURRENT_UPDATE.sql
│  └─ history/                   # 과거 SQL 원문
└─ docs/
   ├─ current/                   # 현재 기준 통합 문서
   └─ history/
      ├─ updates/                # 과거 변경/인수인계 원문
      ├─ verification/           # 과거 검증
      ├─ deployment/             # 과거 배포 메모
      └─ ROLLBACK_GUIDE.md
```

원칙: 현재 이해를 위한 문서는 `docs/current/`에 통합하고, 실제 롤백 근거가 되는 과거 원문은 `docs/history/`에서 삭제하지 않습니다.
