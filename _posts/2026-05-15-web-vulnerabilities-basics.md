---
layout: post
title: "XSS·SQL Injection과 JSON 기초"
description: "XSS·SQL Injection과 JSON 기초 학습 정리"
date: 2026-05-15 00:00:00 +0900
categories: [blog-docs]
topic: web
---

{% raw %}
> <strong>학습 주제:</strong> XSS(Stored/Reflected/DOM-based) 원리와 방어 · SQL Injection 발동 원리와 종류(In-band/Blind/Out-of-band) · Prepared Statement · JSON 타입 6가지 · 취약점 발생 원리

---

## XSS란 무엇인가?

### 1. XSS란 무엇인가?

<strong>개념</strong><br />웹 애플리케이션의 취약점을 이용해, 공격자가 <strong>웹사이트에 악성 스크립트를 심어두고 그 페이지를 보는 다른 사용자의 브라우저에서 실행되게</strong> 만드는 공격. 게시판·웹메일 등에 자바스크립트 같은 코드를 삽입해 개발자가 의도하지 않은 기능이 작동하게 한다.

<strong>핵심 원리</strong>

- 공격자가 피해자를 직접 공격하는 게 아니라 <strong>웹사이트를 매개</strong>로 한다.
- 대부분의 웹 해킹이 서버를 노리는 것과 달리, XSS는 <strong>클라이언트(사용자)를 대상으로</strong> 한 공격이다.

### 2. 공격 동작 흐름

1. 공격자가 게시판 등에 악성 스크립트가 담긴 게시물(또는 악성 URL)을 올린다.
2. 사용자가 그 페이지에 접속하거나 링크를 클릭한다.
3. 사용자의 브라우저에서 의도하지 않은 스크립트가 실행된다. 접근 가능한 정보가 유출되거나 사용자 권한으로 요청이 전송될 수 있다.

### 3. XSS의 종류

<strong>Stored XSS (저장형)</strong>

- 악성 스크립트가 <strong>서버 DB·파일 등에 저장</strong>됨
- 게시판 댓글, 사용자 프로필, 후기, 공지사항 입력란 등이 표적
- 피해자가 그 페이지를 <strong>열기만 해도</strong> 당함 (별도 유도 불필요)
- 한 번 심으면 모든 방문자가 피해자가 되고, 삭제 전까지 계속 실행되므로 <strong>위험도가 가장 높음</strong>

<strong>Reflected XSS (반사형)</strong>

- 악성 스크립트가 <strong>URL 파라미터·검색어·에러 메시지</strong> 등에 들어있음
- 서버가 그 입력을 응답 페이지에 그대로 "반사"해서 돌려줌 (서버에 저장 X)
- 피해자가 그 <strong>링크를 클릭해야</strong> 당함 → 피싱 메일·메신저·SNS 등으로 유도
- 단독으로는 눈치채기 쉬워 Click Jacking, Open Redirect 같은 다른 취약점과 연계되기도 함

<strong>DOM-based XSS</strong>

- 서버 응답에는 문제가 없음. <strong>브라우저(JavaScript)가 DOM을 처리하는 과정</strong>에서 발생
- <code>location</code>, <code>document.URL</code> 등의 값을 <code>innerHTML</code>, <code>document.write</code>, <code>eval</code> 같은 DOM API로 화면에 직접 반영할 때 터짐
- 서버 응답에는 페이로드가 안 보일 수도 있음

> <strong>서버측 vs 클라이언트측 구분</strong>
>
> - <strong>Stored / Reflected</strong>: 서버가 사용자 입력을 검증 없이 응답 HTML에 포함시키며 발생 → 악성 스크립트가 <strong>서버가 만든 HTML</strong>에 담겨 브라우저로 전달됨
> - <strong>DOM-based</strong>: 서버 응답은 멀쩡하고, <strong>클라이언트가 입력을 DOM에 반영</strong>하는 과정에서 발생

### 4. 공격 성공 시 가능한 일 (위험성)

- <strong>쿠키/세션 ID 탈취</strong> → 정상 사용자인 척 로그인 가로채기 (세션 ID가 쿠키에 있으면 특히 위험)
- <strong>피해자 명의로</strong> 글 작성·수정·삭제 등 임의 기능 수행
- <strong>가짜 로그인 창</strong>을 띄워 비밀번호 빼내기 / 거짓 페이지 노출(<code>&lt;img&gt;</code> 등으로 페이지 변조) → 개인정보 유출
- <strong>악성 사이트로 리다이렉트</strong> → 악성코드(트로이 목마 등) 다운로드 유도
- <strong>시스템 통제권 획득</strong>: 미패치 취약점 공격 코드와 결합 시 사용자 PC 장악 → 조직 내부망으로 악성코드 확산, 주요 정보 탈취 가능

### 5. 방어법

| 단계 | 방법 | 설명 |
| --- | --- | --- |
| 입력 | 필터링 | <code>&lt;</code>, <code>&gt;</code>, <code>"</code>, <code>'</code> 같은 특수문자 차단 (보조 수단) |
| <strong>출력</strong> | <strong>이스케이프 처리</strong> | <strong>화면 표시 시 <code>&lt;</code> → <code>&lt;</code>, <code>&gt;</code> → <code>&gt;</code> 등으로 변환</strong> |
| 추가 | CSP 설정 | 신뢰하는 도메인의 스크립트만 실행 허용 |
| 추가 | HttpOnly 쿠키 | JavaScript의 직접적인 쿠키 읽기를 제한하지만 XSS 자체를 막지는 않음 |
| 추가 | <code>innerHTML</code> 대신 <code>textContent</code> | 입력값을 코드가 아닌 텍스트로만 취급 |

> ⚠️ XSS는 <strong>IPS·IDS·방화벽으로는 막기 어렵다.</strong> 입력/출력 단계의 처리가 핵심이다.<br />💡 <strong>가장 중요한 포인트</strong>: 입력 검증만으론 부족하고, <strong>출력할 때 이스케이프</strong>가 제일 중요하다.

## SQLI이란 무엇인가?

### 개념

공격자가 입력값에 <strong>SQL 문법을 끼워넣어서</strong>, 웹사이트가 데이터베이스에 보내는 쿼리를 조작하는 공격.

### 핵심 원리

1. 서버에는 SQL 쿼리 "<strong>틀</strong>"이 있다
2. 사용자가 입력하면 그 틀에 입력값이 끼워져 완성된 쿼리가 만들어진다
3. 공격자가 입력에 SQL 문법을 섞으면 → <strong>쿼리의 구조 자체가 바뀜</strong> → 의도하지 않은 명령이 실행됨

정상 동작

<code>SELECT * FROM users WHERE username = 'kim' AND password = '1234'</code>

SQLI 공격 (admin)

<code>SELECT * FROM users WHERE username = 'admin'--' AND password = '1234'</code>

<br />→ <code>--</code> 뒤는 SQL에서 주석이라 무시됨 → <strong>비밀번호 검증이 통째로 사라짐</strong> → admin 계정 로그인 성공

### 공격 성공 시 영향

- 비밀번호, 신용카드 정보, 개인정보 등 민감 데이터 유출
- 데이터 변조·삭제로 인한 서비스 무결성 훼손
- 시스템에 <strong>지속적인 백도어</strong>가 설치되어 장기간 침해가 발각되지 않을 위험
- 데이터 유출 사고로 인한 평판 손상과 규제 벌금

### 발동 원리

서버(개발자 코드)에 기본 SQL 쿼리 "틀"이 있다.

사용자 입력을 받으면 서버가 그 틀에 입력값을 끼워 넣어 완성된 쿼리를 만들고, 그걸 DB에 보내서 실행시킨다.

이때 공격자가 입력값에 SQL 문법을 끼워 넣으면, 완성된 쿼리의 구조 자체가 바뀌어버려서 의도하지 않은 명령이 실행된다.

### 종류

- <strong>In-band SQLi</strong>: 공격 결과가 화면에 바로 보임 (가장 기본)
  - Error-based: 에러 메시지에서 정보 빼냄
  - Union-based: <code>UNION</code>으로 다른 테이블 데이터를 합쳐옴
- <strong>Blind SQLi</strong>: 결과가 안 보이지만 참/거짓이나 응답 시간 차이로 추측
- <strong>Out-of-band SQLi</strong>: DNS 같은 외부 채널로 데이터 빼냄
- <strong>NoSQL Injection</strong>: MongoDB 같은 NoSQL 데이터베이스 대상 공격

### 방어법

<strong>1. Prepared Statement (매개변수화 쿼리) — 가장 중요</strong>

- 쿼리 틀과 입력값을 <strong>분리해서</strong> DB에 보냄
- 입력값이 아무리 이상해도 명령이 아닌 <strong>데이터</strong>로만 취급됨

```asm
# 위험
query = "SELECT * FROM users WHERE id = '" + user_input + "'"

# 안전
cursor.execute("SELECT * FROM users WHERE id = ?", (user_input,))
```

<strong>2. ORM 사용</strong> — 매개변수 바인딩을 활용한다. ORM을 사용해도 원시 SQL에 입력을 직접 이어 붙이면 취약해질 수 있다.

<strong>3. 입력 검증</strong> — 화이트리스트 기반으로 허용된 값만 통과

<strong>4. 최소 권한 원칙</strong> — DB 계정에 꼭 필요한 권한만 부여 (전체 삭제 권한 X)

<strong>5. 에러 메시지 숨기기</strong> — 공격자에게 DB 구조 힌트 안 주기

## JSON 타입이 무엇인가?

### 개념

데이터를 <strong>텍스트 형태로 주고받기 위한 표준 포맷</strong>. 거의 모든 웹 API에서 사용한다.

JavaScript Object Notation의 약자로 자바 스크립트 객체 표기법이다.<br />(데이터를 쉽게 교환하고 저장하기 위한 텍스트 기반의 데이터 교환 표준)

### 왜 쓰는가?

- 사람이 <strong>읽고 쓰기 쉬움</strong>
- 컴퓨터가 <strong>파싱(해석)하기 쉬움</strong>
- XML보다 <strong>간결하고 가벼움</strong>
- <strong>언어 독립적</strong> — Python, Java, JavaScript 등 어디서든 사용 가능

### 기본 구조

- <code>key: value</code> 쌍으로 구성
- 데이터는 <strong>쉼표(,)</strong> 로 구분
- 객체는 <strong>중괄호 <code>{}</code></strong>, 배열은 <strong>대괄호 <code>[]</code></strong> 로 감쌈
- key는 <strong>반드시 큰따옴표(<code>"</code>)</strong> 로 감싸야 함

### 데이터 타입 (6가지)

| 타입 | 예시 | 설명 |
| --- | --- | --- |
| 문자열 (String) | <code>"hello"</code> | 반드시 큰따옴표 |
| 숫자 (Number) | <code>123</code>, <code>3.14</code> | 정수, 소수 모두 가능 |
| 불리언 (Boolean) | <code>true</code>, <code>false</code> | 참/거짓 |
| 객체 (Object) | <code>{ "key": "value" }</code> | 중괄호로 감싼 key-value 묶음 |
| 배열 (Array) | <code>[1, 2, 3]</code> | 대괄호로 감싼 값들의 나열 |
| null | <code>null</code> | 값이 없음을 명시 |

## SQLi 이해를 위한 DBMS 기초

### DBMS

데이터베이스에서 새로운 정보를 기록하거나, 기록된 내용을 수정, 삭제하는 역할을 해주는 애플리케이션

종류

Relational(관계형) / Non-Relational(비관계형) 으로 나뉨

### Relational DBMS(관계형)

RDBMS는 행과 열의 집합으로 구성된 테이블의 묶음 형식으로 데이터를 관리, 데이터 조작의 관계 연산자 제공

SQL 이라는 쿼리 언어를 사용한다.

SQL : RDBMS의 데이터를 정의하고 질의, 수정 등을 위해 만들어진 언어

- DDL(Data Definition Language)
- DML(Data Manipulation Language)
- DCL(Data Control Language)

출력 위치가 HTML 본문인지, 속성인지, JavaScript인지에 따라 적절한 인코딩이 다르다. 허용된 HTML을 받아야 하는 경우에는 검증된 정화 도구가 필요하다. [OWASP XSS 방어 지침](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
{% endraw %}
