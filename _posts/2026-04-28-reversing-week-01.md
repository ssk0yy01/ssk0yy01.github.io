---
layout: post
title: "리버싱 1주차 — 어셈블리어와 기본 명령어"
description: "어셈블리어와 기본 명령어 학습과 실습 기록"
date: 2026-04-28 00:00:00 +0900
categories: [blog-docs]
topic: reversing
---

{% raw %}
리버싱 공부를 시작하며 **어셈블리어, 레지스터, 기본 명령어와 조건부 점프**를 정리했다. 명령어가 어떤 값을 바꾸는지, 그 결과를 플래그와 분기에서 어떻게 사용하는지 중심으로 살펴본다.

## 1. 어셈블리어란?

- CPU가 직접 이해하는 <strong>기계어(machine code)</strong> 를 사람이 읽을 수 있게 기호로 표현한 <strong>저수준 프로그래밍 언어</strong>다.
- 가장 중요한 특징은 <strong>기계어와 거의 1:1로 대응</strong>된다는 점이다. 어셈블리어 한 줄(<code>mov eax, 10</code>)은 거의 항상 기계어 명령 하나에 대응한다.
- 고수준 언어는 한 줄이 수십 개의 기계어로 번역될 수 있지만, 어셈블리어는 사람이 쓴 명령이 그대로 CPU 명령이 된다. 그래서 프로그램이 실제로 무슨 일을 하는지 가장 정확하게 볼 수 있고, 이것이 리버싱의 기반이 된다.
- <strong>CPU 아키텍처마다 문법이 다르다.</strong> x86, ARM, MIPS는 각각 다른 어셈블리어를 쓴다.
- 같은 x86이라도 표기법이 두 가지다: <strong>Intel 문법</strong>(<code>mov 목적지, 출발지</code>)과 <strong>AT&T 문법</strong>(<code>mov 출발지, 목적지</code>). x64dbg·Ghidra 등 대부분의 윈도우 분석 도구는 Intel 문법을 쓴다.

---

## 2. 고급 언어 vs 저급 언어

### 저급 언어 (기계어, 어셈블리어)

CPU와 하드웨어에 가까운 언어. 메모리 주소·레지스터를 직접 다루며, 명령어 하나가 CPU 동작 하나에 대응한다.

| <strong>장점</strong> | <strong>단점</strong> |
| --- | --- |
| 명령어를 직접 선택해 성능을 조정할 수 있음 | 작성이 어렵고 시간이 오래 걸림 |
| 메모리 사용을 세밀하게 제어할 수 있음 | 가독성이 낮아 유지보수가 까다로움 |
| 하드웨어를 정밀하게 제어 가능 (OS 핵심부) | 이식성이 낮음 (CPU가 바뀌면 다시 작성) |
| 내부 동작을 정확히 관찰 가능 (보안 분석) | 메모리를 직접 다뤄 작은 실수가 큰 버그로 이어짐 |

<strong>왜 유지보수가 어려운가 </strong>

① 가독성이 낮고 <br />② 코드 양이 많아지며 <br />③ 추상화가 없어 한 곳을 고치면 다른 곳이 깨지기 쉽고(의존성)<br />④ CPU가 바뀌면 다시 써야 하고 <br />⑤ 디버깅이 어렵다.

### 고급 언어 (C, C++, Java, Python 등)

사람이 이해하기 쉬운 문법으로 작성하고, 컴파일러나 인터프리터가 기계어로 번역해 준다. 하드웨어는 추상화되어 직접 다루지 않는다.

| <strong>장점</strong> | <strong>단점</strong> |
| --- | --- |
| 작성이 쉽고 빠름 | 실행 성능은 구현·컴파일러·런타임에 따라 달라짐 |
| 가독성이 좋아 협업·유지보수가 편함 | 메모리 사용량이 많을 수 있음 (추상화 비용) |
| 이식성이 높음 (여러 OS·CPU에서 실행) | 하드웨어 세밀 제어가 어려움 |
| 라이브러리가 풍부함 | 내부 동작이 가려져 보안 취약점을 놓치기 쉬움 |

> <strong>컴파일과 인터프리터:</strong> C/C++는 보통 실행 전에 기계어로 컴파일한다. Python의 대표 구현인 CPython은 소스를 바이트코드로 컴파일한 뒤 인터프리터에서 실행한다. 단순히 소스를 한 줄씩 읽는 방식으로만 이해하면 안 된다. 어셈블리어로 작성했다고 항상 고급 언어보다 빠른 것도 아니다. [Python 공식 용어집](https://docs.python.org/3/glossary.html#term-bytecode)

---

## 3. 레지스터

레지스터는 CPU 내부의 초고속 저장 공간이다. 연산은 대부분 레지스터를 통해 이뤄진다.

### 3-1. 크기별 구분 (같은 레지스터를 잘라 쓴다)

| <strong>64비트</strong> | <strong>32비트</strong> | <strong>16비트</strong> | <strong>8비트(하위)</strong> |
| --- | --- | --- | --- |
| RAX | EAX | AX | AL |
| RBX | EBX | BX | BL |
| RCX | ECX | CX | CL |
| RDX | EDX | DX | DL |

전부 <strong>같은 레지스터</strong>다. RAX의 하위 32비트가 EAX, 하위 16비트가 AX, 하위 8비트가 AL이다. (AX의 상위 8비트는 AH로 따로 접근 가능) x64에서는 R8\~R15가 추가됐고, 32/16/8비트는 각각 <code>R8D</code>, <code>R8W</code>, <code>R8B</code>로 접근한다.

### 3-2. 역할별 구분

| <strong>레지스터</strong> | <strong>주요 역할</strong> | <strong>예시</strong> |
| --- | --- | --- |
| EAX | 연산 결과 누적, 함수 반환값 | <code>MOV EAX, 10</code> → 함수가 값을 돌려줄 때 EAX에 담음 |
| EBX | 메모리 주소 기준점(base) | <code>MOV EAX, [EBX]</code> → EBX가 가리키는 주소의 값을 EAX로 |
| ECX | 반복 카운터(counter) | <code>MOV ECX, 5</code> → 루프 카운터 / REP 반복 횟수 |
| EDX | 곱셈·나눗셈 보조, 데이터 | <code>DIV EBX</code> → 몫은 EAX, <strong>나머지는 EDX</strong>에 저장 |
| ESI | 문자열·배열의 <strong>출발지(source)</strong> 주소 | <code>MOV AL, [ESI]</code> → ESI가 가리키는 곳에서 1바이트 읽기 |
| EDI | 문자열·배열의 <strong>목적지(destination)</strong> 주소 | <code>MOV [EDI], AL</code> → AL 값을 EDI가 가리키는 곳에 쓰기 |
| ESP | 스택의 현재 꼭대기(stack pointer) | <code>PUSH EAX</code> → ESP가 감소하며 EAX 값이 스택에 쌓임 |
| EBP | 현재 함수의 지역변수 기준점(base pointer) | <code>MOV EAX, [EBP-4]</code> → 첫 번째 지역변수 값 읽기 |
| EIP | 다음에 실행할 명령어 주소 | <code>JMP 0x401000</code> → EIP가 바뀌며 그 주소를 실행 |

> 64비트에서는 이름이 R로 시작한다: RSP, RBP, RSI, RDI, RIP …

### 3-3. ⚠️ x64 제로 익스텐션 (64비트 분석 필수)

x64에서 레지스터에 값을 쓸 때 상위 비트가 어떻게 되는지가 크기에 따라 다르다.

- <strong>32비트 레지스터에 쓰면 상위 32비트가 자동으로 0이 된다.</strong> <code>MOV EAX, 5</code> → RAX 상위 32비트까지 전부 0. 그래서 x64에서는 <code>MOV EAX, 0</code>이 <code>MOV RAX, 0</code>과 같은 효과다.
- <strong>8비트·16비트 레지스터에 쓰면 상위 비트는 그대로 유지된다.</strong> <code>MOV AL, 5</code> / <code>MOV AX, 5</code> → RAX의 나머지 부분은 건드리지 않음.

이걸 모르면 64비트 디스어셈블 코드에서 레지스터 값이 왜 이렇게 변하는지 헷갈린다.

---

## 4. 기본 명령어

### MOV — 데이터 복사

- <strong>형식:</strong> <code>MOV 목적지, 출발지</code>
- 옮기는 게 아니라 <strong>복사</strong>한다. 출발지 값은 그대로 유지된다.
- <strong>플래그를 변경하지 않는다.</strong>
- <strong>메모리끼리 직접 복사는 불가능</strong>하다. 레지스터를 거쳐야 한다.

```asm
MOV EAX, 10       ; EAX에 10 저장
MOV EBX, EAX      ; EAX 값을 EBX로 복사
MOV [0x1000], EAX ; EAX 값을 메모리 0x1000 주소에 저장
MOV EAX, [EBX]    ; EBX가 가리키는 주소의 값을 EAX로 저장
```

### LEA — 유효 주소 계산 (Load Effective Address)

- 대괄호 <code>[ ]</code> 안의 <strong>주소 계산식만 수행</strong>하고, 그 <strong>결과(주소)를 목적지에 넣는다. 메모리에 접근하지 않는다.</strong>
- <strong>플래그를 변경하지 않는다.</strong>
- 주소 계산뿐 아니라 <strong>빠른 산술 연산</strong>에도 자주 쓰인다.

```asm
LEA EAX, [EBX+ECX*4+8] ; 주소식 계산 결과를 EAX에 (메모리 읽기 X)
LEA EAX, [EBX+EBX*2]   ; EBX*3 을 플래그 변경 없이 한 줄로 계산
```

> <strong>MOV와의 결정적 차이:</strong> <code>MOV EAX, [EBX]</code>는 EBX가 가리키는 곳의 <strong>값</strong>을 가져오지만, <code>LEA EAX, [EBX]</code>는 EBX라는 <strong>주소 그 자체</strong>를 가져온다. 대괄호가 있다고 다 메모리 접근이 아니다.

### JMP — 무조건 점프

- 조건을 따지지 않고 지정된 주소로 실행 흐름을 옮긴다.
- 내부적으로는 EIP/RIP 값을 바꿔 다음에 실행할 명령어 위치를 변경하는 것이다.
- <strong>플래그를 변경하지 않는다.</strong> 반복문·함수 흐름 제어에 쓰인다.

### CALL — 함수 호출

- 단순 점프가 아니라, <strong>돌아올 주소(CALL 바로 다음 명령어의 주소)를 스택에 PUSH</strong>한 뒤 함수 시작 주소로 JMP한다.
- 스택 포인터가 변한다(PUSH). <strong>플래그는 변경하지 않는다.</strong>

### RET — 호출자에게 복귀 (Return)

- <strong>스택 맨 위(<code>[ESP]</code>/<code>[RSP]</code>)에 저장된 복귀 주소를 POP</strong>해서 그 주소로 점프한다. 즉 CALL이 쌓아 둔 주소를 다시 꺼내 EIP/RIP에 넣는다.
- POP하면서 스택 포인터가 자동으로 올라간다(32비트 +4, 64비트 +8).
- <code>RET n</code> 형태면 복귀 후 추가로 n바이트만큼 스택을 더 정리한다(stdcall 규약의 인자 정리용). 함수 끝에 <code>ret 8</code> 같은 게 보이면 인자 정리 중이라는 신호다.
- <strong>플래그를 변경하지 않는다.</strong>

> <strong>CALL ↔ RET은 한 쌍이다.</strong> CALL이 복귀 주소를 PUSH하고, RET이 그 주소를 POP한다.

### CMP — 두 값 비교 (Compare)

- 내부적으로 <strong><code>목적지 − 출발지</code> 뺄셈을 수행</strong>하지만 <strong>결과는 저장하지 않고 플래그만 바꾼다.</strong> (SUB와 플래그 영향이 동일)
- 이 명령 자체는 분기하지 않는다. <strong>바로 뒤에 오는 Jxx가 플래그를 보고 분기를 결정</strong>한다.

```asm
CMP EAX, EBX    ; EAX - EBX 를 계산해 플래그만 갱신
JE  같음_레이블  ; ZF=1 이면(=두 값이 같으면) 점프
```

- 예: <code>CMP A, B</code>에서 A와 B가 같으면 결과가 0 → <strong>ZF=1</strong>.
- ⚠️ <strong>"A가 B보다 작으면 SF=1"은 틀린 설명이다.</strong> 오버플로우 때문에 SF 하나로는 대소를 판단할 수 없다. (정확한 규칙은 8장 Jxx 표 참고)

### TEST — 비트 단위 AND

- 내부적으로 <strong><code>목적지 AND 출발지</code></strong> 를 수행하지만 <strong>결과는 저장하지 않고 플래그만 바꾼다.</strong>
- <strong><code>CF=0, OF=0</code>으로 항상 고정</strong>된다.
- 대표 관용구: <strong><code>TEST EAX, EAX</code></strong> → "EAX가 0인가?" 검사. (자기 자신과 AND하면 0일 때만 0이 되므로 ZF로 판정)

> <strong><code>TEST EAX, EAX</code> vs <code>CMP EAX, 0</code>:</strong> 둘 다 "0인지" 검사지만, TEST 쪽이 더 짧게 인코딩되고 즉시값(0)이 필요 없어 컴파일러가 거의 항상 이걸 쓴다. 디스어셈블 코드의 <code>test reg, reg</code>는 "이 값/포인터가 0(NULL)인지 확인"으로 바로 읽으면 된다.

### ADD / SUB — 덧셈 / 뺄셈

- <code>ADD</code>는 더하고 <code>SUB</code>는 뺀다. 결과를 <strong>목적지에 저장</strong>한다.
- 연산 결과에 따라 <strong>OF, SF, ZF, AF, CF, PF가 모두 자동 갱신</strong>되므로, 산술 연산 직후 바로 조건부 점프를 할 수 있다.

### INC / DEC — 1 증가 / 1 감소

- 각각 값을 1 증가/감소시킨다. <code>ADD reg, 1</code> / <code>SUB reg, 1</code>과 결과는 같지만 인코딩이 더 짧다.
- <strong>결정적 차이: CF(캐리 플래그)를 변경하지 않는다.</strong> 그래서 캐리를 다뤄야 하는 상황에서는 ADD/SUB를 쓴다.
- (참고: 현대 CPU에서는 INC/DEC가 플래그를 부분만 갱신하는 특성 때문에 오히려 느려지는 경우가 있어, 컴파일러가 <code>add reg, 1</code>을 택하기도 한다. "무조건 빠르다"는 아니다.)

### NOP — 아무 동작도 안 함 (No Operation)

- 1바이트를 차지하고 다음 명령어로 넘어간다. 0x90 한 바이트짜리 NOP은 사실 <code>XCHG EAX, EAX</code>의 인코딩이다.
- 코드 정렬, 디버깅 시 명령어 임시 무력화(NOP 패치), 셸코드의 NOP sled 등에 쓰인다.
- <strong>플래그를 변경하지 않는다.</strong> (정렬용 멀티바이트 NOP도 존재)

---

## 5. 명령어별 플래그 영향 한눈에 보기

| <strong>명령어</strong> | <strong>영향받는 플래그</strong> |
| --- | --- |
| MOV, LEA, JMP, CALL, RET, NOP, PUSH, POP | <strong>없음</strong> (플래그를 건드리지 않음) |
| ADD, SUB | OF, SF, ZF, AF, CF, PF (6개 전부) |
| CMP | ADD/SUB와 동일 (내부적으로 뺄셈) |
| INC, DEC | OF, SF, ZF, AF, PF — <strong>CF 제외</strong> |
| TEST, AND | SF, ZF, PF / <strong>CF=0·OF=0 고정</strong> / AF는 미정의 |

---

## 6. 플래그 레지스터 (EFLAGS)

CPU 안에는 <strong>EFLAGS</strong>(64비트에서는 RFLAGS)라는 특별한 레지스터가 있다. 각 비트가 독립된 플래그이며, 산술·논리 연산이 일어날 때마다 자동 갱신된다.

- <strong>ZF (Zero Flag):</strong> 연산 결과가 0이면 1. 두 값이 같은지 비교할 때 핵심.
- <strong>SF (Sign Flag):</strong> 결과의 최상위 비트가 1이면(부호 있는 수로 음수면) 1.
- <strong>CF (Carry Flag):</strong> <strong>부호 없는(unsigned)</strong> 연산에서 자리올림/빌림이 발생하면 1. 부호 없는 비교의 핵심.
- <strong>OF (Overflow Flag):</strong> <strong>부호 있는(signed)</strong> 연산에서 표현 범위를 벗어나면 1. 정수 오버플로우 취약점과 직접 연결.
- <strong>PF (Parity Flag):</strong> 결과 하위 8비트에서 1인 비트의 개수가 짝수면 1.
- <strong>AF (Auxiliary Carry Flag):</strong> 하위 4비트(비트 3 → 4)에서 자리올림 발생 시 1. BCD 연산용.

> <strong>핵심 한 줄:</strong> CF는 unsigned 세계의 대소를, OF는 signed 세계의 오버플로우를 책임진다. 이 둘을 구분하는 것이 Jxx 이해의 전부다.

---

## 7. CMP / TEST가 플래그를 설정하는 원리

|  | <strong>CMP</strong> | <strong>TEST</strong> |
| --- | --- | --- |
| 내부 연산 | 뺄셈 (<code>목적지 − 출발지</code>) | 비트 AND (<code>목적지 AND 출발지</code>) |
| 결과 저장 | ❌ (버림) | ❌ (버림) |
| 갱신 플래그 | OF, SF, ZF, AF, CF, PF | SF, ZF, PF (+ CF=0·OF=0 고정) |
| 대표 용도 | 두 값의 대소·동등 비교 | 0 검사, 특정 비트 검사 |

두 명령 모두 <strong>"연산은 하되 결과는 안 남기고 플래그만 세팅"</strong> 하며, 바로 뒤의 Jxx가 그 플래그를 읽어 분기한다.

---

## 8. Jxx 조건부 점프 (리버싱 핵심 표)

Jxx는 보통 <strong>CMP·TEST 직후</strong>에 따라온다. 앞 연산이 세팅한 플래그를 보고 점프 여부를 결정한다. 이 구조 덕분에 어셈블리에서 <code>if</code>, <code>while</code>, <code>for</code> 같은 흐름 제어가 가능해진다. 아래는 모두 <code>CMP A, B</code> 직후 기준.

### 부호 없는 비교 (unsigned — CF로 판단)

| <strong>명령어</strong> | <strong>의미</strong> | <strong>점프 조건</strong> |
| --- | --- | --- |
| JA / JNBE | A > B (above) | CF=0 AND ZF=0 |
| JAE / JNB / JNC | A ≥ B | CF=0 |
| JB / JNAE / JC | A \< B (below) | CF=1 |
| JBE / JNA | A ≤ B | CF=1 OR ZF=1 |

### 부호 있는 비교 (signed — SF와 OF로 판단)

| <strong>명령어</strong> | <strong>의미</strong> | <strong>점프 조건</strong> |
| --- | --- | --- |
| JG / JNLE | A > B (greater) | ZF=0 AND SF=OF |
| JGE / JNL | A ≥ B | SF=OF |
| JL / JNGE | A \< B (less) | SF≠OF |
| JLE / JNG | A ≤ B | ZF=1 OR SF≠OF |

### 부호 무관 (플래그 직접 검사)

| <strong>명령어</strong> | <strong>점프 조건</strong> | <strong>의미</strong> |
| --- | --- | --- |
| JE / JZ | ZF=1 | 같음 / 결과가 0 |
| JNE / JNZ | ZF=0 | 다름 / 결과가 0이 아님 |
| JS / JNS | SF=1 / SF=0 | 음수 / 음수 아님 |
| JC / JNC | CF=1 / CF=0 | 캐리 발생 / 미발생 |
| JO / JNO | OF=1 / OF=0 | 오버플로우 발생 / 미발생 |
| JP / JNP | PF=1 / PF=0 | 패리티 짝수 / 홀수 |

### 왜 unsigned / signed를 구분하나

같은 비트열이라도 부호 해석에 따라 대소 결과가 정반대가 될 수 있기 때문이다.

> 예: <code>0xFF</code>는 unsigned로 보면 <strong>255</strong>, signed로 보면 <strong>−1</strong>이다. unsigned에서 <code>255 &gt; 1</code>이지만 signed에서 <code>−1 &lt; 1</code>이다.

이 차이를 모르면 정수 오버플로우 같은 보안 취약점으로 이어진다.

---

## 9. 리버싱 실전 팁 정리

- <strong>JA/JB가 보이면 unsigned 비교, JG/JL이 보이면 signed 비교.</strong> 점프 명령어만 보고 원본 변수의 타입(부호 유무)을 역추적할 수 있다.
- <strong><code>test reg, reg</code> = "이 값이 0(또는 NULL)인가?"</strong> 거의 항상 이 의미다.
- <strong><code>lea</code>에 대괄호가 있어도 메모리 접근이 아니다.</strong> 산술 트릭(×3, ×5, +상수 등)일 수 있다.
- <strong>함수 끝의 <code>ret n</code>은 피호출자가 스택을 정리하는 단서</strong>다. stdcall 등에서 볼 수 있지만, 인자 크기가 다를 수 있어 n/4를 곧바로 인자 개수로 단정하지는 않는다.
- <strong>MOV·LEA·JMP·CALL·RET·NOP은 플래그를 안 건드린다.</strong> 분기 직전 플래그를 세팅한 건 그 위쪽의 CMP/TEST/ADD/SUB 중 하나다.
- <strong>x64에서 32비트 레지스터 쓰기는 상위 32비트를 0으로 만든다.</strong> 값 추적 시 꼭 기억.
- <strong>PUSH/POP 단위는 32비트 4바이트, 64비트 8바이트.</strong>

---

<i>1주차 정리 끝.</i>
{% endraw %}
