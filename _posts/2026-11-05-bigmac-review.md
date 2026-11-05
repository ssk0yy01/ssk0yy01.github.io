---
layout: post
title: "BigMAC: Fine-Grained Policy Analysis of Android Firmware (2020)"
description: "Android 펌웨어의 DAC·MAC·Capability를 통합해 공격 경로를 분석하는 BigMAC 논문 리뷰"
date: 2026-11-05 00:00:00 +0900
categories: [papers-conferences]
---

<strong>본 논문 리뷰는 2026\_2학기 SSA 프로젝트에 관한 공부이다.</strong>

[논문 원문 보기](https://www.usenix.org/conference/usenixsecurity20/presentation/hernandez)

## 논문 개요

본 논문은 Android 펌웨어에 존재하는 여러 접근통제 정책을 통합하여 분석하는 <strong>BIGMAC</strong> 프레임워크를 제안한다.

### 문제 의식

Android는 DAC, MAC, Linux Capability 등 여러 접근통제 메커니즘을 함께 사용한다. 따라서 MAC 정책에서는 허용되는 경로라도 DAC의 UID/GID 및 파일 권한 때문에 실제로는 접근하지 못하는 경우가 존재하며, 하나의 정책만 분석하면 실제 공격 가능성을 정확하게 판단하기 어렵다.

```txt
DAC : 파일의 Owner, Group, Permission을 기반으로 접근 통제
MAC : SELinux 정책에 따라 시스템이 강제로 접근 통제
Capability : root 권한을 여러 세부 권한으로 분리한 것
```

### 연구 목표 및 성과

여러 접근통제 정책을 하나의 세밀한 그래프로 통합하여 Android의 보안 정책 간 상호작용과 공격 경로를 분석하는 것이 BIGMAC의 목표이다.

기존 연구 중 일부는 실제 Rooted Device가 필요했지만, BIGMAC은 <strong>정적 펌웨어와 Android 도메인 지식</strong>을 사용하여 실행 시스템의 보안 상태를 재구성한다.

평가 결과 파일시스템 DAC/MAC 메타데이터는 <strong>98% 이상</strong>, 프로세스 정보는 최대 <strong>74.7%</strong>까지 실제 시스템과 대응시킬 수 있었다.

---

## 3. BIGMAC 설계

BIGMAC의 전체적인 흐름은 다음과 같다.

```txt
Android Firmware
      ↓
보안 정보 추출
(DAC / MAC / Capability / SEPolicy)
      ↓
SEPolicy 분석
      ↓
Process / File / IPC 객체 구체화
      ↓
Dataflow Graph
      ↓
Process Tree
      ↓
Attack Graph
      ↓
Prolog Query Engine
```

### 3.1 Security Policy Extraction

BIGMAC은 펌웨어에서 DAC, SELinux MAC Label, Capability, SEPolicy, init 설정 등을 추출한다.

<code>/data</code>, <code>/dev</code>, <code>/sys</code>처럼 부팅 과정에서 생성되는 객체는 정적 펌웨어에 존재하지 않을 수 있기 때문에 init과 uevent 설정을 이용하여 파일 생성 및 권한 변경 등의 부팅 과정을 일부 시뮬레이션한다.

이후 SEPolicy의 Subject와 Object를 실제 파일과 연결하고 Domain 전환 관계를 복원한다.

<strong>(Android 실행 보안 상태를 복원하기 위한 기반을 만드는 단계)</strong>

### 3.2 Dataflow Graph

SELinux에는 <code>read</code>, <code>write</code>, <code>open</code> 등 많은 Access Vector가 존재한다.

BIGMAC은 공격 경로 분석을 위해 이를 크게 <strong>Read / Write 관계</strong>로 단순화하여 Dataflow Graph <code>Gd</code>를 생성한다.

File Object와 Binder·Socket 등의 IPC Object를 그래프에 포함하여 프로세스와 객체 사이의 데이터 흐름을 표현한다.

### 3.3 Process Inflation

추상적인 SELinux Subject를 실제 실행 프로세스와 유사한 형태로 구체화한다.

init의 Service Definition을 이용하여 프로세스의 UID, GID, Supplemental Group, SELinux Context, Capability 등의 <strong>Runtime Credential</strong>을 설정하고 Process Tree <code>Gp</code>를 생성한다.

Zygote에서 생성되는 App Process와 <code>system_server</code>도 Android 도메인 지식을 이용하여 복원한다.

### 3.4 Attack Graph Instantiation

SELinux File Type에 연결된 실제 파일들을 각각의 File Instance로 분리하여 파일마다 다른 DAC 정보를 적용한다.

이렇게 생성한 <code>Gf</code>와 Process Tree <code>Gp</code>를 결합하여 실제 프로세스와 파일·IPC 객체 간 공격 가능 경로를 나타내는 최종 Attack Graph <code>Ga</code>를 생성한다.

### 3.5 Logic-based Query Engine

Attack Graph를 Prolog Fact로 변환하여 공격 경로를 검색한다.

```txt
MAC 검사
 ↓
DAC 검사
 ↓
Capability 검사
 ↓
USB / Bluetooth 등 외부 공격 표면 검사
```

조건을 만족하지 못하는 경로는 결과에서 제거된다.

---

## 4. Implementation

BIGMAC은 <strong>Python 3.5, NetworkX, SETools, SWI-Prolog</strong>를 이용하여 구현되었다.

Android 전체를 에뮬레이션하지 않고 보안 분석에 필요한 init 명령, 파일시스템 상태, Process Credential 등을 선택적으로 재구성한다.

Attack Graph 검색에서는 경로가 지나치게 증가하는 <strong>Path Explosion</strong>을 방지하기 위해 <code>cut-off</code>를 사용하여 최대 경로 길이를 제한한다.

```txt
SEPolicy
→ Android SELinux 접근통제 정책

Service Definition
→ init이 어떤 프로세스를 어떤 User/Group/Capability로 실행할지 정의

Runtime Credential
→ 프로세스의 UID, GID, Group, SELinux Context, Capability 등의 정보

Query Engine
→ Attack Graph에서 조건에 맞는 공격 경로 검색

cut-off
→ 탐색 가능한 최대 경로 길이
```

---

## 5. Evaluation

BIGMAC의 평가는 <strong>Ground Truth Comparison</strong>과 <strong>Attack Graph Query Case Study</strong> 두 부분으로 나뉜다.

### 5.1 Ground Truth Comparison

Rooted Pixel 1과 Galaxy S7 Edge에서 실제 MAC, DAC, Process 정보를 수집하고 BIGMAC의 복원 결과와 비교하였다.

```txt
TP = 정확하게 복원
FP = 실제와 다르거나 불필요하게 추가
FN = 실제로 존재하지만 복원하지 못함
```

주요 시스템 파일의 DAC/MAC 정보는 <strong>98% 이상</strong> 정확하게 복원하였다.

Process Tree는 파일보다 복원이 어려웠으며 Pixel 1 Android 9.0에서 실제 프로세스의 <strong>74.7%가 BIGMAC 프로세스와 대응되는 Pair</strong>를 가졌다. Runtime에서 생성되는 앱이나 Native Daemon 등은 정적으로 완전히 복원하기 어려웠다.

```txt
/system
→ Android 핵심 시스템 영역

/vendor
→ 제조사 및 하드웨어 관련 영역

Credential
→ UID / GID / Group / SELinux Context / Capability 등
   프로세스의 신원과 권한 정보
```

### 5.2 Attack Graph Queries

### MAC + DAC 분석

<code>untrusted_app → vold</code> 공격 경로를 비교한 결과:

```txt
Samsung S8+
MAC       : 99,448
MAC + DAC : 14,417

LG G7
MAC       : 7,155
MAC + DAC : 1,065
```

MAC에서는 허용되어도 DAC의 Owner, Group, Permission 때문에 실제 사용할 수 없는 경로가 많이 존재한다.

따라서 여러 접근통제 계층을 함께 분석하면 <strong>False Positive(오탐)</strong>를 크게 줄일 수 있다.

### Privilege Escalation

BIGMAC은 <code>CVE-2018-9488</code>의

```txt
Zygote → crash_dump → vold
```

권한 상승 경로를 찾아냈다.

추가 Query를 통해 같은 방식의 권한 상승 가능성이 있는 <strong>24개의 다른 Daemon</strong>도 발견하였다. <code>CAP_SYS_ADMIN</code>과 같이 지나치게 강한 Capability가 여러 프로세스에 부여되는 문제도 확인하였다.

### 추가 보안 분석

Process Strength 분석에서는 <code>init</code>, <code>system_server</code>처럼 많은 객체에 영향을 줄 수 있는 강한 프로세스를 발견하였다.

특히 <code>system_server</code>는 많은 Binder IPC와 서비스를 가지고 있으며 <code>CAP_SYS_MODULE</code>도 가지고 있어 공격당할 경우 영향이 크다.

Process Attack Surface 분석에서는 LG에서 <code>untrusted_app</code>이 접근 가능한 OEM IPC 11개, Samsung S8+에서는 <strong>58개의 OEM 고유 IPC</strong>를 발견하였다.

Capability Search에서는 <code>CAP_SYS_MODULE</code>, <code>CAP_DAC_OVERRIDE</code> 등 강력한 Capability까지 이어지는 경로도 분석하였다.

External Attack Surface 분석에서는 Samsung S8+의 AT distributor에 대해:

```txt
USB        → 29 paths
Bluetooth  → 7 paths
Modem      → 31 paths
NFC        → 0 paths
```

를 확인하였다.

주요 용어는 다음과 같다.

```txt
CAP_SYS_ADMIN
→ 광범위한 시스템 관리 권한

CAP_SYS_MODULE
→ Kernel Module 로드

CAP_DAC_OVERRIDE
→ DAC 권한 검사 우회

CAP_SYS_PTRACE
→ 다른 프로세스 메모리 접근/제어

Monolithic
→ 많은 기능과 권한이 하나의 큰 프로세스에 집중된 구조

OEM
→ AOSP를 기기에 맞게 확장하는 제조사
```

---

## 6. Discussion

### 6.1 활용 가능성

BIGMAC은 OEM이나 정책 작성자가 제품 출시 전에 보안 정책의 오설정을 검사하는 데 활용할 수 있다.

예를 들어:

```txt
query(untrusted_app, _, uid=0, 2)
```

를 이용하여 신뢰할 수 없는 앱에서 Root 프로세스로 영향을 줄 수 있는 짧은 경로를 찾을 수 있다.

또한 보안 연구원과 감사자는 여러 보안 정책을 각각 수동으로 분석하지 않고 Attack Graph를 이용하여 특정 프로세스의 공격 표면을 빠르게 파악할 수 있다.

### 6.2 한계

가장 큰 한계는 <strong>정적 펌웨어 기반 분석</strong>이라는 점이다.

Runtime에서는 프로세스가 생성·삭제되거나 UID, Capability, DAC 상태 등이 변경될 수 있기 때문에 정적 정보만으로 실제 실행 환경을 완전히 복원하기 어렵다.

또한 Binder의 Middleware 수준에서 수행되는 추가적인 권한 검사를 완전히 모델링하지 못하기 때문에 BIGMAC에서 공격 가능하게 나타나는 경로가 실제 Runtime에서는 차단될 수도 있다.

Kernel 자체도 주요 공격 표면으로 모델링하지 않으며 <code>allowxperm</code>, IOCTL, SECCOMP 등의 정책 역시 완전히 분석하지 않는다.

```txt
allowxperm
→ SELinux의 세부 ioctl 권한 통제

IOCTL
→ 프로그램이 Device Driver에 특수 명령을 전달하는 System Call

SECCOMP
→ 프로세스가 사용할 수 있는 System Call을 제한
```

<strong>(BIGMAC은 MAC, DAC, Capability를 통합하여 기존 정책 분석보다 실제에 가까운 공격 경로를 분석할 수 있지만, 정적 분석이기 때문에 Runtime·Middleware·Kernel 수준의 동적 보안 상태까지 완전히 반영하지는 못한다.)</strong>

## 총평

본 논문의 가장 큰 의미는 Android의 보안을 <strong>DAC, MAC, Linux Capability 등 여러 접근통제 정책을 하나로 통합하여 분석했다는 점</strong>이라고 생각한다. 실제 Samsung S8+ 분석에서 공격 경로가 <code>99,448개 → 14,417개</code>로 감소한 결과를 통해, 하나의 정책만 분석하는 것보다 여러 정책을 함께 고려하는 것이 오탐을 줄이는 데 효과적이라는 점을 확인할 수 있었다.

또한 BIGMAC은 특정 공격 경로, Capability, Process Attack Surface, 외부 공격 표면 등을 Query로 검색할 수 있어 OEM이나 보안 연구자가 분석 대상을 빠르게 좁히는 데 도움이 될 수 있다.

반면 정적 펌웨어를 기반으로 하기 때문에 Runtime에서 변하는 UID, Capability, DAC 상태를 완전히 반영하기 어렵고, Binder Middleware나 Kernel 수준의 보안 정책도 완전히 모델링하지 못한다는 한계가 있다고 생각한다.
