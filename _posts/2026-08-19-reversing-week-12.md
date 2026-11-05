---
layout: post
title: "리버싱 12주차 — 안티디버깅과 PEB·TEB·예외 처리"
description: "안티디버깅과 PEB·TEB·예외 처리 학습과 실습 기록"
date: 2026-08-19 00:00:00 +0900
categories: [blog-docs]
topic: reversing
---

{% raw %}
**안티디버깅과 Windows의 PEB·TEB**를 공부했다. 디버거 탐지 API의 반환값을 구분하고, 프로세스·스레드의 실행 환경과 예외 처리 개념까지 이어서 정리했다.

## 1. 안티디버깅의 개념

### 안티디버깅(Anti-Debugging)이란?

<strong>안티디버깅은 프로그램이 자신이 디버거에 의해 분석되고 있는지 탐지하거나, 디버깅 자체를 어렵게 만드는 기술이다.</strong>

디버거는 프로그램을 한 단계씩 실행하거나 레지스터·메모리·함수 호출 등을 확인할 수 있기 때문에 프로그램의 내부 동작을 분석하는 데 사용된다. 안티디버깅은 이러한 분석을 방해하기 위해 사용된다.

### 목적

- 프로그램의 내부 로직이 쉽게 분석되는 것을 방지한다.
- 프로그램의 인증·라이선스 로직 등이 쉽게 우회되는 것을 방지한다.
- 악성코드에서는 분석가의 동적 분석을 방해하기 위해 사용되기도 한다.
- 게임이나 보안 프로그램에서는 비정상적인 분석·조작 환경을 탐지하는 용도로 사용될 수 있다.

### 기본적인 동작 방식

```txt
프로그램 실행
    ↓
디버거가 현재 프로그램을 분석 중인지 확인
    ↓
디버거 없음 → 정상 실행
디버거 있음 → 프로그램 종료 / 다른 동작 수행 / 분석 방해
```

중요한 점은 <strong>x64dbg.exe 같은 디버거 프로그램이 단순히 실행 중인지 확인하는 것과, 현재 자신의 프로세스가 실제로 디버깅되고 있는지 확인하는 것은 다른 개념</strong>이라는 것이다.

### 대표적인 안티디버깅 기법

1. <strong><code>IsDebuggerPresent()</code></strong>
   - Windows에서 제공하는 가장 기본적인 디버거 탐지 API 중 하나이다.
   - 현재 호출한 프로세스가 사용자 모드 디버거에 의해 디버깅되고 있으면 0이 아닌 값(<code>TRUE</code>), 아니면 0(<code>FALSE</code>)을 반환한다.

```c
if (IsDebuggerPresent())
{
    printf("Debugger detected!\n");
    return 0;
}
```

1. <strong><code>CheckRemoteDebuggerPresent()</code></strong>
   - 지정한 프로세스가 디버깅되고 있는지 검사하는 Windows API이다.
   - 두 번째 인자로 넘긴 변수에 실제 디버거 탐지 결과가 저장된다.
   - 함수 자체의 반환값은 함수 호출의 성공 여부를 의미한다.

```c
BOOL debugger = FALSE;

if (CheckRemoteDebuggerPresent(GetCurrentProcess(), &debugger))
{
    if (debugger)
        printf("Debugger detected!\n");
}
```

---

## 2. 프로세스·스레드와 TEB·PEB

TEB와 PEB를 이해하기 위해서는 먼저 <strong>프로세스와 스레드의 관계</strong>를 이해해야 한다.

### 프로세스(Process)

프로세스는 <strong>실행 중인 프로그램</strong>이다.

예를 들어 <code>notepad.exe</code> 파일을 실행하면 Windows는 해당 프로그램을 메모리에 올리고 실행에 필요한 자원을 준비한다. 이렇게 실행 상태가 된 프로그램을 프로세스라고 한다.

```txt
notepad.exe 파일
     실행
notepad.exe 프로세스
```

프로세스에는 프로그램 코드, 메모리, 로드된 DLL, 열린 핸들 등의 자원과 하나 이상의 스레드가 존재한다.

### 스레드(Thread)

스레드는 <strong>프로세스 내부에서 실제로 명령어를 실행하는 하나의 실행 흐름</strong>이다.

```txt
프로세스

Thread 1 → 코드 실행
Thread 2 → 코드 실행
Thread 3 → 코드 실행
```

하나의 프로세스는 여러 개의 스레드를 가질 수 있으며, 같은 프로세스에 속한 스레드들은 프로세스의 코드와 대부분의 메모리를 공유한다.

하지만 모든 정보를 공유하는 것은 아니다. 각 스레드는 자신의 실행 흐름을 유지해야 하기 때문에 <strong>자기 스택, 스레드별 상태 정보, TLS 데이터</strong> 등을 따로 가진다.

### Stack

스택은 함수 호출 과정에서 반환 주소, 지역 변수, 일부 함수 인자 등의 정보를 저장하는 메모리 영역이다.

여러 스레드가 서로 다른 함수를 동시에 실행할 수 있기 때문에 <strong>각 스레드는 자신의 스택을 따로 가진다.</strong>

```txt
Thread 1 → Stack 1
Thread 2 → Stack 2
Thread 3 → Stack 3
```

### TLS(Thread Local Storage)

TLS는 <strong>Thread Local Storage</strong>의 약자로, 각 스레드가 자신만의 데이터를 따로 저장할 수 있도록 하는 공간이다.

일반 전역 변수는 같은 프로세스의 여러 스레드가 공유하지만 TLS 데이터는 스레드마다 별도로 존재할 수 있다.

```txt
Thread 1
TLS value = 100

Thread 2
TLS value = 500
```

따라서 Thread 1의 TLS 값을 변경해도 Thread 2의 TLS 값에는 영향을 주지 않는다.

---

### TEB(Thread Environment Block)

<strong>TEB는 Windows가 각 스레드의 상태와 실행에 필요한 정보를 관리하기 위해 사용하는 구조체이다.</strong>

스레드마다 하나의 TEB가 존재한다.

```txt
Process

Thread 1 → TEB 1
Thread 2 → TEB 2
Thread 3 → TEB 3
```

#### TEB의 핵심 정보

1. <strong><code>NT_TIB</code> / 스택 관련 정보</strong>
   - TEB의 앞부분에는 <code>NT_TIB</code>라는 스레드 관련 기본 정보가 포함된다.
   - 대표적으로 현재 스레드의 스택 범위를 나타내는 <code>StackBase</code>, <code>StackLimit</code> 등의 정보가 있다.
2. <strong><code>ClientId</code></strong>
   - 현재 스레드와 프로세스를 식별하기 위한 ID 관련 정보이다.
   - 개념적으로 PID와 TID를 연결하여 현재 실행 주체를 식별하는 데 사용된다.
3. <strong><code>ProcessEnvironmentBlock</code></strong>
   - 현재 스레드가 속한 프로세스의 <strong>PEB 주소를 가리키는 포인터</strong>이다.
   - TEB와 PEB를 연결하는 핵심 요소이다.
4. <strong><code>LastErrorValue</code></strong>
   - 해당 스레드에서 사용하는 마지막 오류 코드와 관련된 값이다.
   - <code>GetLastError()</code>로 확인하는 오류 정보는 스레드별로 관리된다.
5. <strong><code>TlsSlots</code> / <code>TlsExpansionSlots</code></strong>
   - TLS(Thread Local Storage) 데이터를 관리하기 위한 공간이다.
   - 각 스레드가 자신의 TLS 데이터를 독립적으로 사용할 수 있도록 한다.

#### TEB의 핵심 역할

> <strong>TEB = Windows가 스레드 한 개의 실행 상태와 스레드 전용 정보를 관리하는 구조체</strong>

---

### PEB(Process Environment Block)

<strong>PEB는 Windows가 프로세스 전체와 관련된 정보를 관리하기 위해 사용하는 구조체이다.</strong>

하나의 프로세스에는 하나의 PEB가 있고, 그 프로세스에 속한 여러 스레드의 TEB가 동일한 PEB를 가리킬 수 있다.

#### PEB의 핵심 정보

1. <strong><code>BeingDebugged</code></strong>
   - 현재 프로세스가 디버깅되고 있는지를 나타내는 값이다.
   - 안티디버깅에서 가장 중요한 PEB 멤버 중 하나이다.

```txt
BeingDebugged = 0 → 일반적으로 디버깅되지 않는 상태
BeingDebugged = 1 → 일반적으로 디버깅 중인 상태
```

#### PEB의 핵심 역할

> <strong>PEB = Windows가 프로세스 전체의 실행 환경과 상태 정보를 관리하는 구조체</strong>

---

### PEB와 연결되는 핵심 구조체

#### <code>PEB_LDR_DATA</code>

PEB의 <code>Ldr</code> 멤버가 가리키는 구조체이다.

현재 프로세스에 어떤 EXE/DLL 모듈이 로드되어 있는지 관리하는 데 사용된다.

```txt
PEB
└─ Ldr
    ↓
PEB_LDR_DATA
    ↓
로드된 EXE / DLL 정보
```

리버싱이나 악성코드 분석에서는 이 구조를 따라가면서 현재 프로세스에 로드된 DLL 목록을 확인하는 경우가 있다.

#### <code>LDR_DATA_TABLE_ENTRY</code>

로드된 각 모듈의 정보를 표현하는 구조체이다.

개념적으로 모듈의 기준 주소, 모듈 이름, 로딩 관련 연결 정보 등을 가진다.

```txt
PEB_LDR_DATA
├─ kernel32.dll 정보 → LDR_DATA_TABLE_ENTRY
├─ user32.dll 정보   → LDR_DATA_TABLE_ENTRY
└─ 기타 DLL 정보     → LDR_DATA_TABLE_ENTRY
```

#### <code>RTL_USER_PROCESS_PARAMETERS</code>

PEB의 <code>ProcessParameters</code>가 가리키는 구조체이다.

대표적으로 다음과 같은 프로세스 실행 환경 정보를 확인할 수 있다.

- 실행 이미지 경로
- Command Line
- 현재 디렉터리
- 환경 관련 정보

```txt
PEB
└─ ProcessParameters
       ↓
RTL_USER_PROCESS_PARAMETERS
├─ ImagePathName
├─ CommandLine
└─ CurrentDirectory 등
```

---

## 3. 안티디버깅 기법 실습

---

### 실습 1. <code>IsDebuggerPresent()</code>를 이용한 디버거 탐지

#### 코드

```c
#include <Windows.h>
#include <stdio.h>

int main()
{
    if (IsDebuggerPresent())
    {
        printf("Debugger detected!\n");
    }
    else
    {
        printf("No debugger.\n");
    }

    getchar();
    return 0;
}
```

#### 실행 방법

1. Visual Studio에서 프로그램을 빌드한다.
2. 생성된 EXE를 직접 실행한다.
3. 이번에는 EXE를 x64dbg에서 열어 실행한다.
4. 두 결과를 비교한다.

#### 예상 결과

```txt
일반 실행
→ No debugger.

x64dbg에서 실행
→ Debugger detected!
```

#### 원리

<code>IsDebuggerPresent()</code>가 현재 프로세스가 사용자 모드 디버거의 컨텍스트에서 실행 중인지 확인하고 결과를 반환한다.

---

### 실습 2. <code>CheckRemoteDebuggerPresent()</code>를 이용한 디버거 탐지

#### 코드

```c
#include <Windows.h>
#include <stdio.h>

int main()
{
    BOOL debugger = FALSE;

    if (!CheckRemoteDebuggerPresent(GetCurrentProcess(), &debugger))
    {
        printf("API call failed. Error = %lu\n", GetLastError());
        return 1;
    }

    if (debugger)
        printf("Debugger detected!\n");
    else
        printf("No debugger.\n");

    getchar();
    return 0;
}
```

#### 코드 핵심

```c
GetCurrentProcess()
```

현재 프로세스를 나타내는 핸들을 얻는다.

```c
&debugger
```

디버거 탐지 결과를 저장할 <code>debugger</code> 변수의 주소를 전달한다.

함수 호출에 성공한 뒤:

```txt
debugger = TRUE  → 디버거가 붙어 있다고 판단
debugger = FALSE → 디버거가 없다고 판단
```

#### 예상 결과

```txt
일반 실행
→ No debugger.

x64dbg에서 실행
→ Debugger detected!
```

---

### 실습 3. 실행 시간을 이용한 안티디버깅

Breakpoint로 프로그램이 오래 정지하면 코드 실행 시간이 비정상적으로 길어지는 점을 이용한다.

#### 코드

```c
#include <Windows.h>
#include <stdio.h>

int main()
{
    ULONGLONG start = GetTickCount64();

    printf("Timing check start\n");

    volatile int value = 0;

    for (int i = 0; i < 100000; i++)
    {
        value += i;
    }

    ULONGLONG end = GetTickCount64();
    ULONGLONG elapsed = end - start;

    printf("Elapsed time = %llu ms\n", elapsed);

    getchar();
    return 0;
}
```

#### 실습 방법

1. 먼저 EXE를 일반 실행하여 <code>Elapsed time</code>을 확인한다.
2. x64dbg에서 프로그램을 연다.
3. 반복문 내부에 Breakpoint를 설정한다.
4. Breakpoint에서 약 4\~5초 정도 정지한 뒤 실행을 계속한다.

---

## 4. 추가로 정리한 내용

#### PEB/TEB와 PCB/TCB의 차이

<code>PEB(Process Environment Block)</code>

- Windows 프로세스의 실행 환경 정보를 뜻함

<code>TEB(Thread Environment Block)</code>

- Windows 스레드의 실행 환경 정보를 뜻함

<code>PCB(Process Control Block)</code>

- 프로세스를 OS가 관리하기 위한 정보

<code>TCB(Thread Control Block)</code>

- 스레드를 OS가 관리하기 위한 정보

이렇게 4개의 개념들을 보면 결국엔 가장 큰 차이는 <code>Environment / Control</code> 이다.

<code>PCB</code>는 운영체제가 프로세스를 관리하기 위한 관리 정보 공간으로 대표적으로 운영체제가 어떤 프로세스를 실행시키고 관리하기 위한 정보들을 뜻한다.

ex) 프로세스의 PID, 실행 중? 대기 중? 등등

<strong>하지만 PEB는 프로세스의 사용자 모드 실행 환경 정보를 가지고 있는 구조체이다.</strong>

ex) 디버깅 당하는 중인지, 로드된 DLL들의 정보, 실행 경로 등등

<strong>결과로 보면 PEB는 프로세스를 스케줄링 하기 위한 구조가 아닌, 프로세스의 실행 환경과 사용자 모드 정보를 담는 핵심 구조체이다.</strong>

| 구분 | PCB | PEB |
| --- | --- | --- |
| 대상 | Process | Process |
| 의미 | Control | Environment |
| 주 목적 | OS가 프로세스 관리 | 프로세스 실행 환경 제공 |
| 위치 관점 | 주로 커널 영역 개념 | 사용자 모드 |
| 정보 예 | 상태, 스케줄링, 자원 | DLL, 명령줄, 디버깅 상태 |
| Windows에서 대응 | <code>EPROCESS/KPROCESS</code> 등 | <code>PEB</code> |

TEB도 마찬가지로 Windows가 해당 스레드의 사용자 모드 환경과 관련된 정보를 가지고 있다.

|  | TCB | TEB |
| --- | --- | --- |
| 대상 | Thread | Thread |
| 의미 | Control | Environment |
| 주 목적 | OS가 스레드 관리 | 스레드 실행 환경 제공 |
| 위치 관점 | 주로 커널 영역 개념 | 사용자 모드 |
| 정보 예 | 상태, 스케줄링 | TLS, 오류값, PEB 포인터 |
| Windows에서 대응 | <code>ETHREAD/KTHREAD</code> 등 | <code>TEB</code> |

---

#### 2. 안티 디버깅과 안티 리버싱 차이

안티 리버싱 : <strong>리버스 엔지니어링 자체를 어렵게 만드는 모든 기술</strong>

ex) 코드 난독화, 함수 이름 꼬기, 패킹, 가상 환경 탐지 등

안티 디버깅 : <strong>동적 분석에 사용되는 디버거를 탐지하거나 디버깅을 방해하는 기술</strong>

ex) IsDebuggerPresent(), CheckRemoteDebuggerPresent(), PEB.BeingDebugged등

<strong>핵심적인 차이는 안티 리버싱은 안티 디버깅을 포함해서 난독화, 패킹 등 넓을 의미로 쓰이는 말이지만,<br />안티 디버깅은 디버거 탐지 방해 하나만으로 좁혀져 있는 차이가 존재한다.</strong>

---

#### 3. SEH, VEH

Exception(예외) : <strong>프로그램이 정상적인 실행 흐름을 계속할 수 없는 특별한 상황이 발생하는 것</strong>

ex) 0으로 나누기, 잘못된 메모리 주소 접근, Breakpoint 발생, 잘못된 명령어 실행 등이 존재한다.

SEH(Structured Exception Handling) : <strong>구조적 예외 처리라고도 말하며, 하드웨어·소프트웨어 예외를 처리하는 Windows의 예외 처리 메커니즘 중 하나이다.</strong>

```c++
__try
{
    // 문제가 발생할 수 있는 코드
}
__except(...)
{
    // 예외 발생 시 처리
}
```

SEH는 <strong>종료 처리기, 예외 처리기</strong> 이렇게 총 2개의 기능으로 이루어져 있다.

#### 1. 종료 처리기(Termination Handler)

종료 처리기는 <code>__try</code> 블록을 빠져나올 때 <code>__finally</code> 블록에서 정리 작업을 수행한다. 예외를 처리하는 <code>__except</code>와는 역할이 다르다.

```c++
__try
{
    // 문제가 발생할 수 있는 코드
}
__finally
{
    // 종료 처리기
    // ........
}
```

정상 종료나 예외로 블록을 빠져나올 때 정리 코드를 실행한다. 다만 블록 안에서 <code>ExitThread</code>·<code>ExitProcess</code>로 종료하는 경우 등에는 실행되지 않을 수 있다. [Microsoft 종료 처리 문서](https://learn.microsoft.com/en-us/windows/win32/debug/termination-handling)

#### 2. VEH(Vectored Exception Handling)

VEH도 예외를 처리 하지만 SEH와 구조가 조금 다름

VEH : SEH의 확장이며, <strong>특정 호출 스택 프레임에 묶이지 않는 예외 처리기</strong>를 등록하는 역할을 가진다.

<strong>어플리케이션 단에서 동작</strong>하고 <strong>SEH보다 먼저 동작</strong> 된다는 특징을 가지고 있다.

<code>AddVectoredExceptionHandler()</code> 함수를 사용하여 예외 처리 함수를 등록한다.

```c++
// 핸들러 등록
PVOID AddVectoredExceptionHandler(
    ULONG First,                           // 0이 아니면 리스트의 맨 앞(가장 먼저 실행), 0이면 맨 뒤에 등록
    PVECTORED_EXCEPTION_HANDLER Handler    // 콜백 함수 주소
);

// 핸들러 제거
ULONG RemoveVectoredExceptionHandler(
    PVOID Handle                           // 등록 시 반환받은 핸들
);

```

#### SEH와 VEH의 차이

|  | SEH | VEH |
| --- | --- | --- |
| 기본 개념 | 구조화된 예외 처리 | 등록된 예외 처리기를 통해 처리 |
| 대표 사용 함수 | <code>__try</code>, <code>__except</code> | <code>AddVectoredExceptionHandler()</code> |
| 범위 | 코드/호출 프레임과 연결 | 특정 프레임에 묶이지 않음 |
| 처리 방식 | 해당 예외 Handler 탐색 | 등록된 VEH Handler들을 순서대로 호출 |
{% endraw %}
