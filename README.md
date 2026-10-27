# ssk0yy01의 기록

GitHub Pages에서 동작하는 개인 학습 블로그입니다. 외부 테마와 빌드 도구 없이 GitHub Pages의 기본 Jekyll 지원을 사용합니다.

## 게시 방법

1. GitHub에서 공개 저장소 `ssk0yy01.github.io`를 만듭니다.
2. 이 폴더의 파일을 저장소 기본 브랜치의 최상위에 올립니다.
3. 저장소 **Settings → Pages → Build and deployment**에서 **Deploy from a branch**, 기본 브랜치, **/(root)**를 선택합니다.
4. 배포가 끝나면 `https://ssk0yy01.github.io`에 접속합니다.

계정 이름을 변경한 뒤에는 저장소 이름도 `ssk0yy01.github.io`로 맞추고, 로컬 연결 주소를 `git remote set-url origin https://github.com/ssk0yy01/ssk0yy01.github.io.git`로 갱신합니다. 사이트의 표시 이름과 주소 설정은 새 이름으로 준비되어 있습니다.

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

자기소개는 `about/index.html`, 블로그 제목과 주소는 `_config.yml`, 색상과 레이아웃은 `assets/style.css`에서 수정합니다. GitHub 계정이 `ssk0yy01`이 아니라면 `_config.yml`의 `url`과 레이아웃의 GitHub 링크도 함께 바꾸세요.

## 블로그/기술문서 분야 필터

`categories: [blog-docs]`인 글의 머리말에 `topic: web`처럼 분야를 추가합니다. 가능한 값은 `web`(웹), `system`(시스템), `network`(네트워크), `reversing`(리버싱), `crypto`(암호학), `development`(개발), `ai`(AI), `blog`(블로그), `other`(기타)입니다. 생략하면 기타에 표시됩니다. 분야 이름과 목록은 `_data/topics.yml`에서 관리합니다.

## 학력·교육·수상·자격증과 인증 사진

소개 페이지의 항목을 누르면 `_credentials`의 해당 글이 열립니다. 글 본문을 수정하면 상세 내용이 바뀌고, 머리말의 `summary`는 소개 목록의 짧은 설명입니다.

| 항목 | 수정할 파일 |
| --- | --- |
| 순천향대학교 | `_credentials/sch-university.md` |
| 현대오토에버 교육 수료 | `_credentials/autoever-training.md` |
| 데이터센터 보안 과정 | `_credentials/datacenter-training.md` |
| 현대오토에버 특별상 | `_credentials/autoever-award.md` |
| 정보처리기능사 | `_credentials/information-processing.md` |

인증 사진을 추가하는 방법:

1. GitHub 저장소에서 `assets/evidence`를 열고 **Add file → Upload files**로 JPG·PNG·WebP 사진을 올립니다. 파일 이름은 `autoever-award.jpg`처럼 정합니다.
2. 해당 글을 편집하고 머리말의 `evidence: []`를 아래처럼 바꿉니다. 사진이 여러 장이면 `- image`와 `caption`을 반복합니다.
3. 변경을 커밋하면 GitHub Pages 배포 후 상세 글 아래에 인증 자료가 나타납니다. 사진을 누르면 원본이 새 창으로 열립니다.

```yaml
evidence:
  - image: /assets/evidence/autoever-award.jpg
    caption: 현대오토에버 화이트해커 양성교육 특별상 상장
```

사진이 없는 항목은 인증 자료 영역을 표시하지 않습니다. 공개할 사진에서는 학번·주민등록번호 등 공개하지 않을 정보를 먼저 가려 주세요. 방문자용 업로드 버튼은 없으며, 사진은 GitHub 저장소에서 관리합니다.
