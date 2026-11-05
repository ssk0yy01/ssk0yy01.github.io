---
layout: post
title: "ELF 기초 — 파일 유형과 식별 정보"
description: "ET_REL·ET_EXEC·ET_DYN·ET_CORE와 ELF 매직, e_ident 정리"
date: 2026-09-03 00:00:00 +0900
categories: [blog-docs]
topic: system
---

{% raw %}
PE 파일 구조를 공부한 뒤 Linux 실행 파일은 어떻게 구성되는지 궁금해졌다. 먼저 **ELF의 역할과 파일 유형, 식별 정보**를 정리했다.

---

## 1\. ELF란 무엇인가

### ELF(Executable and Linkable Format)

- <strong>Linux/Unix 계열에서 프로그램의 코드와 데이터를 저장하기 위해 사용하는 대표적인 바이너리 파일 구조이다.</strong>

#### 파일 유형

- 실행 파일 : 독립적으로 실행 가능한 바이너리 파일
- 오브젝트 파일 : 다른 오브젝트 파일과 링크되어야 실행 가능
- 공유 라이브러리 : 동적 라이브러리 의미
- 코어 덤프 : 프로세스의 메모리 상태를 저장하는 파일

#### ELF 파일 역할

- 실행 파일 제공 : 컴퓨터가 직접 읽고 실행할 수 있는 기계어 코드를 담고 있다.
- 링킹 지원 : 여러개의 소스 코드를 컴파일한 목적 파일(.o)들을 하나로  묶어서 하나의 라이브러리로 간편하게 만들어줌
- 공유 라이브러리 역할 : 여러 프로그램이 공통으로 사용하는 함수 모음(.so)를 제공해서 메모리를 효율적으로 쓸 수 있게 도와준다.
- 코어 덤프 저장 : 프로그램이 비정상적으로 종료되었을 때 당시 메모리 상태를 기록해서 디버깅 할 수 있게 해줌

#### ELF 파일의 종류

<code>ELF Header</code> 영역 안에 <code>e_type</code>이라는 필드가 존재한다.

이 <code>e_type</code> 안에 있는 값으로 해당 파일이 어떤 종류의 파일인지 알 수 있다.

대표적으로 아래 4개가 존재함

### ET\_REL

<code>REL</code>은 <strong>Relocatable</strong>을 의미한다.

보통<code>.o</code> 형식의 파일이 여기에 해당한다.

```bash
ex)

gcc -c test.c
이렇게 명령어로 파일을 만들어주면

test.o 라는 파일이 만들어지는 방식이다.

하지만 이렇게 만들어진 파일은 일반적으로 바로 실행할 수 없다.
다른 코드, 라이브러리 등과 링크를 해야하기 때문이다.
```

### ET\_EXEC

Executable를 뜻하며 실행 파일을 의미한다

```bash
ex)

gcc test.c -no-pie -o test
이렇게 만든 전통적인 파일은 보통 ET_EXEC 형태가 된다.

test 라는 확장자가 없는 파일이라도 내부적으로 ELF 파일로 구성되어 있다.

PE파일이랑 비교를 해보면 .exe 파일과 가까운 개념이다.
```

### ET\_DYN

<code>ET_DYN</code>은 원래 <code>Dynamic / Shared Object </code>같은 용도로 사용된다.

대표적으로 아래 3개의 공유 라이브러리가 해당된다.

```bash
libc.so
libpthread.so
libtest.so

.so = .dll 이라고 생각하면 됨
```

그렇지만 요즘 Linux에서는 일반 실행파일도 ET\_DYN 형식인 경우가 늘어나고 있다.

이유가 바로<strong> <code>PIE(Position Independent Executable)</code> </strong>때문이다.

<strong><code>PIE</code></strong>는 프로그램이 특정 주소에 고정되지 않고 다양한 주소에 로딩될 수 있도록 만든 실행파일이다.

그래서 <strong><code>ASLR</code></strong>과 같이 사용하기 위해 현대 Linux 배포판에서 흔하게 사용한다.

PIE는 로딩 위치가 바뀔 수 있게 하는 실행 파일의 특성과 관련되고, ASLR은 주소 배치를 무작위화하는 보호 기법이다.

### ET\_CORE

<code>CORE</code>는 <strong>Core Dump</strong>를 의미한다.

프로그램이 비정상적으로 종료 되었을 때

메모리, 레지스터, 스택, 프로그램 상태 등을 저장 해놓은 파일이다.

```bash
ex)

프로그램이 Segmentation Fault로 종료되었을 때
설정에 따라서
core
core.1234
이러한 형태의 파일이 만들어질 수 있다.

그리고 이 파일을 분석해서
1. 프로그램이 어디에서 죽었는지
2. 어떤 값 때문에 죽었는지
3. 당시의 스택 상태는 어땠는지를 확인할 수 있다
```

#### ELF Signature

PE 구조에는 시그니처 문자인  <code>MZ(4D 5A)</code>문구가 있다.

ELF도 똑같이 <code>7F ELF(7F 45 4C 46)</code> 형태로 존재한다.

#### ELF의 첫 16바이트

ELF 파일을 Hex 값으로 열어보면 처음에 있는 영역이 중요하다.

<code>e_ident</code> 라고도 불리는데 총 16바이트로 구성되어 있는 영역이다.

이 곳에는 ELF를 식별하는 정보가 들어있다.

| 위치 | 의미 |
| --- | --- |
| 0\~3 | ELF Magic Number |
| 4 | 32bit / 64bit |
| 5 | Endianness |
| 6 | ELF Version |
| 7 | OS/ABI |
| 이후 | 추가 정보 / Padding<br /> |

이 <code>e_ident</code>가 ELF Header의 시작 부분이다.

#### 1번 최종 정리

ELF는 Linux 및 Unix 계열 환경에서 실행파일, Object File, 공유 라이브러리, Core Dump 등을 표현하기 위해 사용되는 표준 바이너리 파일 형식이다. ELF 내부에는 CPU 아키텍처, Entry Point, Section, Segment, Symbol, 동적 링킹 정보 등 프로그램의 실행과 분석에 필요한 정보가 저장된다.
{% endraw %}
