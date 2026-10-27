# sky070901의 기록

GitHub Pages에서 동작하는 개인 학습 블로그입니다. 외부 테마와 빌드 도구 없이 GitHub Pages의 기본 Jekyll 지원을 사용합니다.

## 게시 방법

1. GitHub에서 공개 저장소 `sky070901.github.io`를 만듭니다.
2. 이 폴더의 파일을 저장소 기본 브랜치의 최상위에 올립니다.
3. 저장소 **Settings → Pages → Build and deployment**에서 **Deploy from a branch**, 기본 브랜치, **/(root)**를 선택합니다.
4. 배포가 끝나면 `https://sky070901.github.io`에 접속합니다.

## 글 쓰기

`_posts` 폴더에 `YYYY-MM-DD-title.md` 형식으로 파일을 만듭니다. 예시:

```markdown
---
layout: post
title: "글 제목"
description: "글 목록에 표시할 한 줄 설명"
date: 2026-10-27 12:00:00 +0900
categories: [development]
---

여기에 본문을 씁니다.
```

사용 가능한 카테고리 키는 `development`, `ctf-wargame`, `bug-bounty`, `blog-docs`, `papers-conferences`, `competitions-certificates`입니다. 메뉴에 보이는 한글 이름과 설명은 `_data/categories.yml`에서 수정합니다.

자기소개는 `about/index.html`, 블로그 제목과 주소는 `_config.yml`, 색상과 레이아웃은 `assets/style.css`에서 수정합니다. GitHub 계정이 `sky070901`이 아니라면 `_config.yml`의 `url`과 레이아웃의 GitHub 링크도 함께 바꾸세요.

## 블로그/기술문서 분야 필터

`categories: [blog-docs]`인 글의 머리말에 `topic: web`처럼 분야를 추가합니다. 가능한 값은 `web`(웹), `system`(시스템), `network`(네트워크), `reversing`(리버싱), `crypto`(암호학), `development`(개발), `blog`(블로그), `other`(기타)입니다. 생략하면 기타에 표시됩니다. 분야 이름과 목록은 `_data/topics.yml`에서 관리합니다.
