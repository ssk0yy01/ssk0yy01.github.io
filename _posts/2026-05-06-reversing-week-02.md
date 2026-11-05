---
layout: post
title: "리버싱 2주차 — 레지스터·조건문·함수 호출 규약"
description: "레지스터·조건문·함수 호출 규약 학습과 실습 기록"
date: 2026-05-06 00:00:00 +0900
categories: [blog-docs]
topic: reversing
---

{% raw %}
이번에는 **레지스터와 조건문, 함수 호출 규약**을 공부했다. SASM으로 조건문과 반복문을 작성하고, C 코드의 함수 호출이 어셈블리에서 어떤 순서로 처리되는지 정리했다.

## 1. 레지스터

<strong>레지스터</strong>는 중앙 처리 장치(CPU) 내에서 데이터를 일시적으로 저장하는 데 사용되는 <strong>순차 회로</strong>이다. 또한, 여러개의 플립플롭으로 묶어서 만든, 다중 비트 데이터를 저장하는 고속 기억 장치

- 플립플롭
  - 1비트(0 또는 1)을 저장할 수 있는 가장 기본적인 기억 소자
  - 두 가지 상태를 가지며(0과 1), 입력 신호에 따라서 유지하거나 바꿀 수 있다.(비트 바꾸기 역할)

| <strong>64비트</strong> | <strong>32비트</strong> | <strong>16비트</strong> | <strong>8비트</strong> |
| --- | --- | --- | --- |
| RAX | EAX | AX | AL |
| RBX | EBX | BX | BL |
| RCX | ECX | CX | CL |
| RDX | EDX | DX | DL |

- 레지스터는 산술에 필요한 데이터 저장, 주소 저장 및 참고하는 용도로 사용

종류

1. 범용 레지스터
   - 주로 데이터 연산을 위해 사용되는 레지스터 x86-64에서 범용 레지스터는 8바이트까지 저장 가능하다.

   <br />

| 레지스터 이름 | 의미 | 주 사용도 |
| --- | --- | --- |
| rax | Accumulator Register | 함수의 반환 값 |
| rbx | Base Register | x64에서는 주된 용도 x |
| rcx | Counter Register | 반복문의 반복 횟수, 각종 연산의 시행 횟수 |
| rdx | Data Register | x64에서는 주된 용도 X |
| rsi | Soruce Index | 데이터를 옮길 때 원본을 가리키는 포인터 |
| rdi | Destination Index | 데이터를 옮길 때 목적지를 가리키는 포인터 |
| rsp | Stack Pointer | 사용중인 스택의 위치를 가리키는 포인터 |
| rbp | Stack Base Pointer | 스택의 바닥을 가리키는 포인터 |

2. 세그먼트 레지스터
   - x86 아키텍처에서 메모리를 세그먼트 단위로 접근하는데 사용되는 특수한 레지스터<br />(메모리를 효율적으로 관리하기 위해 등장)

| 이름 | 주용도 |
| --- | --- |
| CS(Code Segment) | 실행할 코드의 시작 주소 |
| DS(Data Segment) | 프로그램에 지정된 데이터 영역의 시작 주소 |
| SS(Stack Segment) | 스택 영역의 시작 주소 |
| ES, FS, GS | 범용적인 용도로 사용 |

3. 플래그 레지스터
   - CPU가 연산을 수행한 후 결과를 상태를 저장하는 특수한 레지스터<br />(특정 연산 후 조건 판단 사용)

| 플래그 | 의미 |
| --- | --- |
| CF(Carry Flag) | 부호 없는 수의 연산 결과가 비트의 범위를 넘은 경우 설정 |
| ZF(Zero Flag) | 연산의 결과가 0일 경우 설정 |
| SF(Sign Flag) | 연산의 결과가 음수일 경우 설정 |
| OF(Overflow Flag) | 부호 있는 수의 연산 결과가 비트 범위를 넘을 경우 설정 |

## 2. 어셈블리어의 조건문

조건문이 어떻게 동작하는지 예시를 만들기 위해 Sasm을 다운로드 하여 진행 하였다.

<strong>Sasm이란?</strong>

- 어셈블리 공부하는 사람들을 위한 IDE이다.

```javascript
if (a > b) {
    printf("a가 큼");
} else {
    printf("b가 큼");
}
```

먼저 이건 기본적인 C언어의 조건문 형식이다. if로 조건문임을 암시하고 ()안에 조건을 넣어 참 거짓을 판별하고 참이면 a가 큼이 실행되고 아니면 else로 이동하여 b가 크다고 설명하는 간단한 예시 문장이다.

하지만 cpu는 if가 무엇인지 모른다. 여기서 우리는 cmp라는 명령어를 알아야 한다.

cmp?

- cmp는 비교 연산을 수행하는 명령어이다. CPU가 2개의 레지스터나 메모리 위치에 저장된 값을 비교한 후, 두 값이 같은지 다른지를 판단하는 역할을 한다.

이 설명만 들어보면 if와 cmp는 굉장히 비슷한 개념을 가지고 있다.<br />하지만 cmp는 딱 조건만 살피는 역할을 담당하지 참이면 무엇을 하고 거짓이면 무엇을 하라 라는 역할은 하지 않는다.

그리고 또, cmp 명령어는 비교 결과를 직접 보여주지 않고 CPU 안의 FLAGS 레지스터라는 작은 저장소에 힌트를 남기게 되고 그걸 통하여 조건 분기 명령어를 사용해서 조건문과 같은 역할을 수행해야 한다.

그리하여 이동을 하기 위해 우리는 조건 분기 명령어를 또 사용해야 하는데 이 내용은 리버싱 1주차 내용에 서술 되어 있으니 세세한 내용은 설명하지 않고 개념적인 부분만 잡고 넘어 갈 것이다.

| 명령어 | 의미 | C 언어식 정리 |
| --- | --- | --- |
| <code>je</code> | <strong>e</strong>qual, 같으면 점프 | <code>if (a == b)</code> |
| <code>jne</code> | <strong>n</strong>ot <strong>e</strong>qual, 다르면 점프 | <code>if (a != b)</code> |
| <code>jg</code> | <strong>g</strong>reater, 크면 점프 | <code>if (a &gt; b)</code> |
| <code>jl</code> | <strong>l</strong>ess, 작으면 점프 | <code>if (a &lt; b)</code> |
| <code>jge</code> | <strong>g</strong>reater or <strong>e</strong>qual, 크거나 같으면 점프 | <code>if (a &gt;= b)</code> |
| <code>jle</code> | <strong>l</strong>ess or <strong>e</strong>qual, 작거나 같으면 점프 | <code>if (a &lt;= b)</code> |
| <code>jz</code> | <strong>z</strong>ero, 결과가 0이면 점프 | <code>if (x == 0)</code> |
| <code>jnz</code> | <strong>n</strong>ot <strong>z</strong>ero, 결과가 0이 아니면 점프 | <code>if (x != 0)</code> |

위 표에 나오는 jxx명령어들을 통하여 조건을 구성하고 같으면 점프하는 등의 방식으로 조건문을 수행할 수 있다.

```javascript
section .text
global main
main:
    ;write your code here
    xor rax, rax
    ret
```

section .text : 여기부터 코드가 실행된다고 시스템에게 알려주는 것

- C언어는 자동으로 명시 해주지만 어셈블리어는 시스템에 .text, .data등 으로 명시를 해줘야 한다.

global main : main 이라는 이름을 프로그램 외부에서도 볼 수 있게 공개하는 역할

<code>main:</code>은 이 예제에서 C 런타임이 호출할 함수의 시작 레이블이다. 실행 파일의 엔트리 포인트와 항상 같은 위치인 것은 아니다.

;write your code here : 여기에서 코드를 작성하라는 뜻이다. 어셈에서의 주석은 세미콜론(;)을 사용한다.

xor rax, rax : xor 연산으로 rax를 0으로 만드는 문장이다.(c언어의 return 0과 같은 역할)

- 왜 rax레지스터를 사용하냐?
  - rax는 return 을 해주는 역할이 존재하지 않는다. 하지만 사람들끼리 return 레지스터를 rax로 사용하자고 호출 규약과 같이 약속하게 되었고, 지금까지 그렇게 사용하고 있다.

### 리눅스/맥 (System V AMD64) - SASM

| 용도 | 사용 레지스터 |
| --- | --- |
| <strong>리턴값</strong> | <strong>rax</strong> (필요시 rdx도) |
| 1번째 인자 | rdi |
| 2번째 인자 | rsi |
| 3번째 인자 | rdx |
| 4번째 인자 | rcx |
| 5번째 인자 | r8 |
| 6번째 인자 | r9 |

### Windows x64

| 용도 | 사용 레지스터 |
| --- | --- |
| <strong>리턴값</strong> | <strong>rax</strong> |
| 1번째 인자 | rcx |
| 2번째 인자 | rdx |
| 3번째 인자 | r8 |
| 4번째 인자 | r9 |

ret : 함수에서 빠져나간다 / 호출한 쪽으로 돌아간다는 뜻

```asm
%include "io64.inc"

section .data
    rax_big db "rax is bigger", 10, 0           ; rax_big변수 db안에 rax is bigger라는 문장을 지정해주고 10, 0을 하여 쓰레기 값이 출력되지 않게 한다.
    rbx_big db "rbx is bigger or equal", 10, 0  ; rbx_big변 db안에 rbx is bigger or equal이라는 문장을 사용하고 10, 0으로 쓰레기 값이 출력되지 않게 한다.

section .text
global CMAIN
CMAIN:
    mov rbp, rsp; for correct debugging

    mov rax, 10              ; rax에 10을 넣었다
    mov rbx, 5               ; rbx에 5를 넣었다

    cmp rax, rbx             ; cmp문을 사용하여 rax와 rbx를 비교한다.
    jg  big                  ; jg라는 조건 점프문을 사용하여 rax가 크면 big이라는 변로 점프하여 이동한다.

    PRINT_STRING rbx_big     ; 만약 조건이 해당되지 않는다면 그냥 rbx_big이라는 변수가 실행된다.
    jmp end_if               ; rbx_big 변수가 실행된 후 jmp명령어로 무조건 점프하여 프로그램을 종료한다.

big:
    PRINT_STRING rax_big     ; rax가 커서 big으로 이동할 경우 rax_big이라는 변수를 실행한다.

end_if:                      ;그냥 종료를 시켜주는 문장이다.
    xor rax, rax
    ret
```

## 3. 배열과 반복문으로 1~10의 합 구하기

```asm
%include "io64.inc"
section .data
    arr dq 1,2,3,4,5,6,7,8,9,10        ; arr이라는 배열에 1부터 10까지의 값을 dq(8바이트)로 저장한다.
section .text

global CMAIN
CMAIN:
    mov rbp, rsp; for correct debugging

    mov rax, 0                         ; rax에 0을 넣어 합계를 저장할 레지스터를 초기화한다.
    mov rcx, 0                         ; rcx에 0을 넣어 배열 인덱스로 사용할 레지스터를 초기화한다.
    loop_s:
        add rax, [arr + rcx*8]         ; arr 배열의 rcx번째 요소(8바이트씩 이동)를 rax에 더한다.
        inc rcx                        ; inc 명령어로 rcx 값을 1 증가시켜 다음 인덱스로 이동한다.
        cmp rcx, 10                    ; cmp문으로 rcx와 10을 비교한다.
        jle loop_s                     ; jle 조건 점프문을 사용하여 rcx가 10보다 작거나 같으면 loop_s로 점프하여 반복한다.
    PRINT_DEC 8, rax                   ; PRINT_DEC 명령어로 rax에 저장된 합계를 10진수로 출력한다.

    xor rax, rax                       ; xor 연산으로 rax를 0으로 초기화하여 프로그램 종료 값을 설정한다.
    ret                                ; ret 명령어로 함수를 종료한다.
```

## 4. 함수 호출 규약

함수 호출 규약을 보기전에 우리는 메모리 구조를 정확하게 알아야 한다.

메모리 구조는 크게 네개의 영역이 존재한다.

1. 코드 영역 : 실행할 명령어가 저장되는 곳
   - 읽기 전용 : 실행 중 코드가 변조되는 것을 막기 위해
   - 크기가 컴파일 시점에 결정되어 고정된다
   - 같은 프로그램을 여러번 실행해도 영역은 공유됨(메모리 절약)
2. 데이터 영역 : 전역 변수, 정적 변수가 저장되는 영역
   - 데이터 영역은 data, bss 영역으로 나뉜다.
   - 프로그램 시작 시 할당되고 종료 시 해제된다.
   - 읽기 쓰기 모두 가능하다
   - Bss는 실행 파일에 실제 데이터를 저장하지 않고 크기 정보만 있어 파일 크기를 줄여준다.
3. 힙 영역 : 프로그래머가 런타임에 동적으로 할당한 메모리 저장
   - 낮은 주소 → 높은 주소 방향으로 자람
   - 크기가 가변적이며 필요에 따라 늘어남
   - 수동 관리 : 할당 메모리를 해제하지 않으면 메모리 누수 발생
   - 스택보다 접근 속도는 느리지만 큰 데이터를 다루기 적합
4. 스택 영역 : 지역변수, 매개변수, 복귀 주소, 이전 스택 프레임 포인터

- 높은 주소 → 낮은 주소 방향으로 자람(힙과 반대)

- 함수가 호출되면 스택 프레임이 쌓이고, 함수가 종료되면 자동으로 사라짐

- 컴파일러가 알아서 처리하므로 누수 걱정 없음

- 크기에 제한이 있어 너무 깊은 재귀나 큰 지역 배열을 쓰면 스택 오버플로우 발생

- 접근 속도가 매우 빠름

| 구분 | 힙 (Heap) | 스택 (Stack) |
| --- | --- | --- |
| 할당 시점 | 런타임 (동적) | 컴파일 타임 / 함수 호출 시 |
| 관리 주체 | 프로그래머 | 컴파일러 (자동) |
| 성장 방향 | 낮은 주소 → 높은 주소 | 높은 주소 → 낮은 주소 |
| 속도 | 상대적으로 느림 | 빠름 |
| 크기 | 큼 (제한 적음) | 작음 (제한 있음) |
| 문제 발생 시 | 메모리 누수 | 스택 오버플로우 |

### 함수 호출 규약이란?

함수를 호출할 때 지켜야 할 약속(규칙)을 의미한다.

인자의 전달 방식 : Stack / Register

### cdecl (x86 32bit)

C언어와 인텔 32비트 환경에서 주로 사용하는 레거시 호출규약

cdecl은 레지스터를 쓰지 않고, 인자를 스택으로 전달하는 방식

특징

1. 모든 인자 스택으로만 전달한다.
2. 가변 인자를 쉽게 처리할 수 있다.
3. 호출자가 매개변수 스택을 정리할 수 있다. (가변 인자와 연결)
4. 반환값은 EAX 레지스터를 사용한다

### stdcall (x86 32bit, Windows)

32비트 Windows API에서 사용되는 호출 규약이다. 피호출자가 스택의 인자를 정리한다. x64에서는 별도의 x64 호출 규약을 사용한다. [Microsoft 문서](https://learn.microsoft.com/en-us/cpp/cpp/stdcall?view=msvc-170)

특징

1. 모든 인자를 스택으로 전달
2. 반환 값은 EAX레지스터를 통해 전달한다.
3. 스택 정리를 피 호출자가 책임진다.
4. 위의 변수 이유로 가변 인자 지원이 불가능했다.

### <strong>fastcall (x86 32bit) </strong>

cdecl의 느린 성능을 극복하기 위해 나온 호출규약

특징

1. 2개의 인자까지는 레지스터를 통해 넘긴다. ECX, EDX사용
2. 인자가 2개를 초과할 경우, 그것부터 스택을 통해 전달
3. 스택 정리는 피호출자가 한다
4. 가변인자 구현 불가

정리

| 규약 | 인자 전달 | 스택 정리 | 사용 |
| --- | --- | --- | --- |
| <strong>cdecl</strong> | 스택 (오른쪽→왼쪽) | 호출자 | C 표준, 가변 인자 |
| <strong>stdcall</strong> | 스택 (오른쪽→왼쪽) | 피호출자 | Windows API |
| <strong>fastcall</strong> | 레지스터 + 스택 | 피호출자 | 속도 최적화 |

C 언어와 어셈블리 코드 간의 함수 호출 방식 차이

C언어는 함수 호출을 한 줄로 간단하게 끝내지만, 어셈블리어는 C가 보내는 함수호출을 여러 단계로 직접 풀어서 써야 한다.

C에서의 함수 호출

1. 함수 이름과 인자를 적어 넣는다.
2. 반환값을 변수에 받는다.

어셈블리어에서 함수 호출

1. 인자 전달 준비를 하며 인자를 오른쪽에서 왼쪽 순서로 넣는다.

2. 함수로 점프(call 명령어)를 사용하여 실제 함수가 있는 곳으로 실행 흐름을 옮긴다.

3. 스택 프레임을 생성하여 함수가 작업할 수 있는 공간을 만들어준다.

4. 함수 본체의 명령어를 실행한다.

5. 반환값을 준비하며 레지스터가 값을 넣는다.

6. 스택 프레임을 정리하며 복원하고 되돌린다.

7. 호출자에게 복귀하기 위해 ret명령어를 사용하여 원래 자리로 돌아온다

8. 호출자의 마무리 작업으로는 반환값을 회수하고 값을 변수에 옮기면 함수 호출이 완전히 종료된다.
{% endraw %}
