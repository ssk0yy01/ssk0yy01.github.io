---
layout: post
title: "NPKI 인증정보 탈취 악성코드 분석"
description: "원본 EXE의 DLL 설치부터 64to32.dll의 서비스 실행, 추가 파일 다운로드와 NPKI 인증서·개인키 수집 및 전송 코드까지 분석한 기록"
date: 2026-10-28 10:00:00 +0900
categories: [blog-docs]
topic: reversing
---

이 글은 **2026년 10월 28일 SecurityFirst 동아리 활동에서 발표한 세미나 PPT**를 블로그 형식으로 정리한 글입니다.

블로그를 처음 만들고 어떤 내용을 첫 글로 남길지 고민하다가, 이번에 발표한 NPKI 인증정보 탈취 악성코드 분석 과정을 옮겨 보기로 했습니다. 실행 파일의 기본 정보부터 확인하고, 실행 중 발생한 변화와 내부 코드의 동작을 연결하는 순서로 분석했습니다.

분석 대상은 원본 EXE와 그 안에 포함된 **64to32.dll**입니다. 원본 EXE가 DLL을 설치하고 실행하는 과정, DLL이 추가 파일을 내려받는 과정, NPKI 폴더에서 인증서와 개인키를 수집해 전송하려는 과정을 차례로 살펴보겠습니다.

> 아래 사진은 발표 자료에 사용한 분석 화면입니다. 사진을 누르면 원본 크기로 볼 수 있습니다. 실제 실행에서 관찰한 결과와 정적 분석으로 확인한 코드는 구분해서 설명했습니다.

## 목차

- [1. 사용한 분석 도구](#tools)
- [2. 기초 정적 분석](#static)
- [3. 기초 동적 분석](#dynamic)
- [4. 고급 정적 분석 — EXE](#exe)
- [5. 고급 정적 분석 — 64to32.dll](#dll)
- [6. 분석 결과 정리](#conclusion)

<h2 id="tools">1. 사용한 분석 도구</h2>

| 도구 | 이번 분석에서 확인한 내용 |
| --- | --- |
| PEStudio | PE 파일의 기본 정보, 문자열, DLL과 API 목록, 리소스, 해시 |
| Resource Hacker | EXE의 리소스에 포함된 DLL 추출 |
| SysAnalyzer | 실행 전후의 파일·프로세스·서비스 변화와 API 호출 로그 |
| Process Explorer | svchost.exe 프로세스와 서비스 DLL의 연결 |
| 레지스트리 편집기 | 서비스의 실행 경로, 시작 유형, ServiceDll 설정 |
| Wireshark | HTTP 요청 경로와 반복 통신 |
| IDA | 언패킹한 EXE와 DLL의 함수 호출 및 분기 흐름 |

PEStudio는 의심스러운 항목을 빠르게 찾는 데 사용했습니다. 다만 표시된 API나 문자열만으로 실제 악성 행위를 확정할 수는 없기 때문에, 이후 동적 분석과 IDA 분석에서 해당 기능이 어떻게 연결되는지 확인했습니다.

<h2 id="static">2. 기초 정적 분석</h2>

### 2.1. 원본 EXE의 패킹 확인과 언패킹

먼저 원본 EXE를 PEStudio로 열어 기본 정보를 확인했습니다. 화면에서 UPX 관련 정보가 확인되었고, 패킹된 실행 파일이라는 점을 출발점으로 삼았습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-01.png" target="_blank" rel="noopener noreferrer" aria-label="원본 EXE의 기본 정보와 UPX 패킹 표시 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-01.png" alt="원본 EXE의 기본 정보와 UPX 패킹 표시" width="700" height="484" loading="lazy" decoding="async">
  </a>
  <figcaption>원본 EXE의 기본 정보와 UPX 패킹 표시 · 발표 자료 9쪽</figcaption>
</figure>


이후 UPX로 언패킹한 파일을 다시 확인했습니다. 언패킹 결과에는 `Unpacked 1 file`이 표시되어 있고, 언패킹한 파일은 `unpacked.exe`라는 이름으로 분석했습니다. 아래 두 화면은 언패킹 결과와 그 파일을 PEStudio에서 다시 연 모습입니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-02.png" target="_blank" rel="noopener noreferrer" aria-label="UPX 언패킹 결과 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-02.png" alt="UPX 언패킹 결과" width="800" height="230" loading="lazy" decoding="async">
  </a>
  <figcaption>UPX 언패킹 결과 · 발표 자료 10쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-03.png" target="_blank" rel="noopener noreferrer" aria-label="언패킹한 EXE의 PEStudio 기본 정보 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-03.png" alt="언패킹한 EXE의 PEStudio 기본 정보" width="680" height="452" loading="lazy" decoding="async">
  </a>
  <figcaption>언패킹한 EXE의 PEStudio 기본 정보 · 발표 자료 11쪽</figcaption>
</figure>


### 2.2. Indicators와 가져오는 DLL

Indicators에서는 레지스트리 변경, 서비스 관리, 내부 실행 파일 포함, IP 주소 문자열, 프로세스 관련 기능 등이 표시되었습니다. 의심 문자열도 235개가 표시되어 있어, 어떤 문자열과 API 때문에 이런 결과가 나왔는지 더 살펴봤습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-04.png" target="_blank" rel="noopener noreferrer" aria-label="언패킹한 EXE의 Indicators 목록 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-04.png" alt="언패킹한 EXE의 Indicators 목록" width="828" height="480" loading="lazy" decoding="async">
  </a>
  <figcaption>언패킹한 EXE의 Indicators 목록 · 발표 자료 12쪽</figcaption>
</figure>


가져오는 DLL 중에서는 `advapi32.dll`과 `shell32.dll`에 주목했습니다. `advapi32.dll`은 레지스트리·서비스 관련 API와 연결되고, `shell32.dll`은 프로그램 실행과 같은 동작을 살펴볼 단서가 됩니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-05.png" target="_blank" rel="noopener noreferrer" aria-label="EXE에서 사용하는 DLL 목록 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-05.png" alt="EXE에서 사용하는 DLL 목록" width="686" height="152" loading="lazy" decoding="async">
  </a>
  <figcaption>EXE에서 사용하는 DLL 목록 · 발표 자료 13쪽</figcaption>
</figure>


### 2.3. API로 예상한 동작

API 목록에는 리소스 접근, 파일 기록, 서비스 생성, 레지스트리 설정과 관련된 함수들이 함께 나타났습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-06.png" target="_blank" rel="noopener noreferrer" aria-label="EXE의 Import API 목록 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-06.png" alt="EXE의 Import API 목록" width="542" height="784" loading="lazy" decoding="async">
  </a>
  <figcaption>EXE의 Import API 목록 · 발표 자료 14쪽</figcaption>
</figure>


| API | 분석에서 주목한 역할 |
| --- | --- |
| `FindResourceA`, `LoadResource` | 실행 파일 내부 리소스 접근 |
| `WriteFile` | 데이터를 파일로 기록 |
| `CreateServiceA`, `StartServiceA` | 서비스 생성 및 시작 |
| `RegSetValueExA` | 레지스트리 값 설정 |
| `ShellExecuteA` | 다른 프로그램이나 명령 실행 |
| `LoadLibraryA`, `GetProcAddress` | DLL 로드와 함수 주소 획득 |

이 조합을 보고 **내부에 들어 있는 파일을 디스크에 저장한 뒤, 서비스로 등록해 실행하는 구조**일 가능성을 생각했습니다. 이 단계에서는 동작을 확인한 것이 아니라, 이후 분석할 방향을 잡은 것입니다.

### 2.4. 문자열에서 확인한 단서

문자열 목록에서는 서비스, 네트워크, 보안 프로그램, 인증서 파일과 관련된 이름을 확인했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-07.png" target="_blank" rel="noopener noreferrer" aria-label="EXE 내부 문자열 목록 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-07.png" alt="EXE 내부 문자열 목록" width="942" height="1038" loading="lazy" decoding="async">
  </a>
  <figcaption>EXE 내부 문자열 목록 · 발표 자료 17쪽</figcaption>
</figure>


| 문자열 | 확인할 내용 |
| --- | --- |
| `Svchost`, `Services` | 서비스 실행 및 등록과의 연결 |
| `208.67.220.220`, `HTTP/1.1`, `POST` | 네트워크 관련 코드의 존재 |
| `v3sp.EXE`, `V3LTray.exe` | 보안 제품 프로세스 조회 여부 |
| `signPri.key`, `signCert.der` | 인증서와 개인키 파일 접근 여부 |

특히 `signCert.der`와 `signPri.key`는 뒤에서 확인할 NPKI 파일 탐색 코드와 연결됩니다. IP 주소 문자열이 있다는 사실만으로 해당 주소를 정보 탈취 서버라고 판단하지는 않았습니다.

### 2.5. 내부 리소스에서 DLL 추출

Resources 탭에는 **타입 DLL, ID 101, 크기 69,632바이트**인 리소스가 있었습니다. 실행 파일 안에 별도 파일이 포함되어 있다는 단서입니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-08.png" target="_blank" rel="noopener noreferrer" aria-label="EXE에 포함된 DLL 리소스 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-08.png" alt="EXE에 포함된 DLL 리소스" width="1456" height="478" loading="lazy" decoding="async">
  </a>
  <figcaption>EXE에 포함된 DLL 리소스 · 발표 자료 19쪽</figcaption>
</figure>


Resource Hacker로 해당 리소스를 별도 파일로 추출했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-09.png" target="_blank" rel="noopener noreferrer" aria-label="Resource Hacker에서 DLL 리소스 추출 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-09.png" alt="Resource Hacker에서 DLL 리소스 추출" width="400" height="436" loading="lazy" decoding="async">
  </a>
  <figcaption>Resource Hacker에서 DLL 리소스 추출 · 발표 자료 20쪽</figcaption>
</figure>


추출한 파일을 PEStudio에서 확인하니 32비트 DLL이었습니다. Indicators에는 레지스트리, 서비스, 네트워크, 암호화, 프로세스 관련 항목이 표시되었습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-10.png" target="_blank" rel="noopener noreferrer" aria-label="추출한 DLL의 PEStudio 분석 화면 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-10.png" alt="추출한 DLL의 PEStudio 분석 화면" width="866" height="224" loading="lazy" decoding="async">
  </a>
  <figcaption>추출한 DLL의 PEStudio 분석 화면 · 발표 자료 21쪽</figcaption>
</figure>


### 2.6. 추출한 DLL의 통신 관련 기능

DLL 목록에는 `wininet.dll`, `ws2_32.dll`, `netapi32.dll`, `crypt32.dll`이 포함되어 있었습니다. 원본 EXE를 볼 때보다 네트워크와 관련된 기능이 눈에 띄었습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-11.png" target="_blank" rel="noopener noreferrer" aria-label="추출한 DLL의 라이브러리 목록 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-11.png" alt="추출한 DLL의 라이브러리 목록" width="736" height="238" loading="lazy" decoding="async">
  </a>
  <figcaption>추출한 DLL의 라이브러리 목록 · 발표 자료 22쪽</figcaption>
</figure>


| DLL | 관련 기능 |
| --- | --- |
| `wininet.dll` | HTTP 및 인터넷 통신 |
| `ws2_32.dll` | 소켓 통신 |
| `netapi32.dll` | 네트워크·시스템 정보 관련 기능 |
| `crypt32.dll` | 인증서·암호화 관련 기능 |

API 목록에서도 서비스·레지스트리 관리와 함께 HTTP 요청, 메모리 매핑, 스레드 관련 함수를 확인했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-12.png" target="_blank" rel="noopener noreferrer" aria-label="추출한 DLL의 서비스·네트워크 관련 Import — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-12.png" alt="추출한 DLL의 서비스·네트워크 관련 Import" width="638" height="600" loading="lazy" decoding="async">
  </a>
  <figcaption>추출한 DLL의 서비스·네트워크 관련 Import · 발표 자료 23, 26쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-13.png" target="_blank" rel="noopener noreferrer" aria-label="추출한 DLL의 추가 Import 목록 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-13.png" alt="추출한 DLL의 추가 Import 목록" width="836" height="1052" loading="lazy" decoding="async">
  </a>
  <figcaption>추출한 DLL의 추가 Import 목록 · 발표 자료 23쪽</figcaption>
</figure>


| API 묶음 | 관련 동작 |
| --- | --- |
| `CreateServiceA`, `StartServiceA`, `OpenSCManagerA`, `OpenServiceA` | 서비스 관리 |
| `RegCreateKeyExA`, `RegSetValueExA`, `RegDeleteKeyA`, `RegDeleteValueA` | 레지스트리 생성·변경·삭제 |
| `LoadLibraryA`, `LoadLibraryExA`, `GetProcAddress` | 동적 DLL 로드와 함수 주소 획득 |
| `InternetConnectA`, `HttpOpenRequest`, `HttpSendRequest` | HTTP 연결·요청·전송 |
| `CreateFileMapping`, `MapViewOfFile`, `UnmapViewOfFile` | 파일과 메모리 매핑 |
| `CreateThread`, `TerminateThread` | 스레드 생성·종료 |

오디널로 표시된 `ws2_32.dll`의 함수는 `socket`, `recvfrom`, `sendto`, `inet_addr`, `inet_ntoa`, `htons`, `WSAStartup`, `closesocket` 등으로 정리했습니다. 소켓을 생성하고 주소와 포트를 처리한 뒤 데이터를 송수신하는 기능을 살펴볼 수 있었습니다.

문자열에서는 `POST`, `multipart/form-data`, `CreateService`, `StartService`, `Process32First`, `Process32Next` 등을 확인했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-14.png" target="_blank" rel="noopener noreferrer" aria-label="DLL의 HTTP·서비스·프로세스 관련 문자열 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-14.png" alt="DLL의 HTTP·서비스·프로세스 관련 문자열" width="796" height="624" loading="lazy" decoding="async">
  </a>
  <figcaption>DLL의 HTTP·서비스·프로세스 관련 문자열 · 발표 자료 28쪽</figcaption>
</figure>


여기까지의 기초 정적 분석에서는 원본 EXE가 내부 DLL을 설치·실행하는 드로퍼이고, DLL이 통신과 추가 작업을 맡는 구조일 가능성이 높다고 판단했습니다. 다음으로 실제 실행 결과가 이 예상과 맞는지 확인했습니다.

<h2 id="dynamic">3. 기초 동적 분석</h2>

### 3.1. 뮤텍스와 DLL 파일 생성

SysAnalyzer의 API 호출 로그에서 `system32t`라는 이름의 뮤텍스 생성·열기 관련 동작을 확인했습니다. `C:\WINDOWS\system32\64to32.dll` 생성과 관련된 흔적도 확인했습니다.

`DeleteFileW` 호출은 파일 삭제를 시도하는 단서였지만, 이 호출만으로 원본 EXE가 실제로 삭제되었다고 단정하지는 않았습니다. 자기 삭제 기능은 뒤의 IDA 분석에서 다시 확인했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-15.png" target="_blank" rel="noopener noreferrer" aria-label="SysAnalyzer의 API 호출 로그 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-15.png" alt="SysAnalyzer의 API 호출 로그" width="1138" height="662" loading="lazy" decoding="async">
  </a>
  <figcaption>SysAnalyzer의 API 호출 로그 · 발표 자료 31쪽</figcaption>
</figure>


Directory Watch Data에서도 시스템 디렉터리에 새 DLL이 생성된 것을 확인했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-16.png" target="_blank" rel="noopener noreferrer" aria-label="Directory Watch Data의 파일 변경 기록 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-16.png" alt="Directory Watch Data의 파일 변경 기록" width="946" height="710" loading="lazy" decoding="async">
  </a>
  <figcaption>Directory Watch Data의 파일 변경 기록 · 발표 자료 32쪽</figcaption>
</figure>


### 3.2. 생성된 DLL과 리소스에서 추출한 DLL 비교

생성된 `64to32.dll`의 크기는 리소스에서 추출한 DLL과 같은 **69,632바이트**였습니다. 크기만 같다고 동일한 파일이라고 판단할 수는 없으므로 해시를 비교했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-17.png" target="_blank" rel="noopener noreferrer" aria-label="생성된 64to32.dll의 파일 속성 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-17.png" alt="생성된 64to32.dll의 파일 속성" width="478" height="576" loading="lazy" decoding="async">
  </a>
  <figcaption>생성된 64to32.dll의 파일 속성 · 발표 자료 34쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-18.png" target="_blank" rel="noopener noreferrer" aria-label="리소스에서 추출한 DLL의 해시 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-18.png" alt="리소스에서 추출한 DLL의 해시" width="550" height="250" loading="lazy" decoding="async">
  </a>
  <figcaption>리소스에서 추출한 DLL의 해시 · 발표 자료 35쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-19.png" target="_blank" rel="noopener noreferrer" aria-label="실행 후 생성된 64to32.dll의 해시 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-19.png" alt="실행 후 생성된 64to32.dll의 해시" width="444" height="238" loading="lazy" decoding="async">
  </a>
  <figcaption>실행 후 생성된 64to32.dll의 해시 · 발표 자료 35쪽</figcaption>
</figure>


비교 결과 **MD5와 SHA-1이 모두 일치**했습니다. 이를 통해 EXE 내부에 포함되어 있던 DLL이 실행 과정에서 `64to32.dll`로 저장되었다는 점을 확인했습니다.

### 3.3. 서비스 등록과 svchost.exe 실행

SysAnalyzer의 Services 탭에서는 `64to32` 서비스가 확인되었고, Running Processes에서는 해당 서비스와 연결된 `svchost.exe`를 확인했습니다. 당시 분석 환경에서의 PID는 `3540`이었습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-20.png" target="_blank" rel="noopener noreferrer" aria-label="SysAnalyzer에서 확인한 64to32 서비스 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-20.png" alt="SysAnalyzer에서 확인한 64to32 서비스" width="1206" height="68" loading="lazy" decoding="async">
  </a>
  <figcaption>SysAnalyzer에서 확인한 64to32 서비스 · 발표 자료 36쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-21.png" target="_blank" rel="noopener noreferrer" aria-label="서비스와 연결된 svchost.exe 프로세스 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-21.png" alt="서비스와 연결된 svchost.exe 프로세스" width="970" height="106" loading="lazy" decoding="async">
  </a>
  <figcaption>서비스와 연결된 svchost.exe 프로세스 · 발표 자료 37쪽</figcaption>
</figure>


Process Explorer에서도 같은 PID의 프로세스를 찾아 속성을 확인했습니다. 서비스 정보에 `64to32`와 DLL 경로가 나타났습니다. 이 PID는 해당 실행 당시의 값입니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-22.png" target="_blank" rel="noopener noreferrer" aria-label="Process Explorer의 svchost.exe 확인 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-22.png" alt="Process Explorer의 svchost.exe 확인" width="830" height="46" loading="lazy" decoding="async">
  </a>
  <figcaption>Process Explorer의 svchost.exe 확인 · 발표 자료 38쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-23.png" target="_blank" rel="noopener noreferrer" aria-label="svchost.exe 속성에서 확인한 64to32 서비스 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-23.png" alt="svchost.exe 속성에서 확인한 64to32 서비스" width="502" height="272" loading="lazy" decoding="async">
  </a>
  <figcaption>svchost.exe 속성에서 확인한 64to32 서비스 · 발표 자료 39쪽</figcaption>
</figure>


### 3.4. 서비스 레지스트리 설정

레지스트리 편집기에서는 서비스가 `svchost.exe`를 통해 실행되도록 설정되어 있고, 계정은 `LocalSystem`, `Start` 값은 `2`인 것을 확인했습니다. `Start = 2`는 Windows 시작 시 자동으로 실행되도록 설정된 상태를 뜻합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-24.png" target="_blank" rel="noopener noreferrer" aria-label="64to32 서비스의 계정·실행 경로·시작 유형 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-24.png" alt="64to32 서비스의 계정·실행 경로·시작 유형" width="910" height="218" loading="lazy" decoding="async">
  </a>
  <figcaption>64to32 서비스의 계정·실행 경로·시작 유형 · 발표 자료 40쪽</figcaption>
</figure>


`Parameters` 하위 키의 `ServiceDll` 값은 `C:\WINDOWS\system32\64to32.dll`을 가리켰습니다. 파일 생성, 서비스 등록, 프로세스 실행을 하나의 흐름으로 연결할 수 있었습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-25.png" target="_blank" rel="noopener noreferrer" aria-label="Parameters의 ServiceDll 경로 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-25.png" alt="Parameters의 ServiceDll 경로" width="696" height="64" loading="lazy" decoding="async">
  </a>
  <figcaption>Parameters의 ServiceDll 경로 · 발표 자료 40쪽</figcaption>
</figure>


### 3.5. 반복되는 HTTP GET 요청

`http.log`에서는 `/main/m0913.txt`를 요청하는 기록을 확인했습니다. 요청의 Host는 `csv[.]sr5yr[.]com`, User-Agent는 `Alerter COM+`로 표시되어 있었습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-26.png" target="_blank" rel="noopener noreferrer" aria-label="http.log에서 확인한 텍스트 파일 요청과 응답 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-26.png" alt="http.log에서 확인한 텍스트 파일 요청과 응답" width="360" height="294" loading="lazy" decoding="async">
  </a>
  <figcaption>http.log에서 확인한 텍스트 파일 요청과 응답 · 발표 자료 41쪽</figcaption>
</figure>


Wireshark에서는 `/main/m0913.txt`와 `/main/main0913.txt`를 HTTP GET으로 반복 요청하는 모습이 보였습니다. 이 단계에서는 설정이나 명령에 해당하는 텍스트를 가져오려는 동작으로 의심했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-27.png" target="_blank" rel="noopener noreferrer" aria-label="Wireshark에서 관찰한 반복 HTTP GET 요청 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-27.png" alt="Wireshark에서 관찰한 반복 HTTP GET 요청" width="1074" height="256" loading="lazy" decoding="async">
  </a>
  <figcaption>Wireshark에서 관찰한 반복 HTTP GET 요청 · 발표 자료 42쪽</figcaption>
</figure>


**응답 화면의 Server 헤더는 `INetSim HTTP Server`입니다.** 따라서 이 화면은 분석 환경에서 요청과 모의 응답이 관찰된 근거로 해석해야 합니다. 실제 외부 서버로부터 명령을 받았다거나 인증정보 전송까지 성공했다는 근거는 아닙니다.

동적 분석에서 확인한 핵심은 내부 DLL과 같은 해시의 파일이 생성되고, 서비스로 등록되어 `svchost.exe`에서 실행되며, 두 텍스트 파일 경로로 요청을 반복한다는 점입니다. 이어서 EXE와 DLL의 코드에서 각각의 역할을 확인했습니다.

<h2 id="exe">4. 고급 정적 분석 — EXE</h2>

### 4.1. start에서 WinMain으로 이동

언패킹한 EXE의 진입점인 `start`부터 확인했습니다. 실행 환경과 명령줄 정보를 준비한 뒤 `WinMain`을 호출하는 흐름이어서, 주요 동작은 `WinMain`을 중심으로 따라갔습니다.

`WinMain`은 먼저 `sub_401000`에 `system32t` 문자열을 전달합니다. 동적 분석에서 확인한 뮤텍스 이름과 같은 문자열입니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-28.png" target="_blank" rel="noopener noreferrer" aria-label="WinMain에서 system32t를 전달하는 부분 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-28.png" alt="WinMain에서 system32t를 전달하는 부분" width="400" height="366" loading="lazy" decoding="async">
  </a>
  <figcaption>WinMain에서 system32t를 전달하는 부분 · 발표 자료 48쪽</figcaption>
</figure>


### 4.2. 뮤텍스 관련 API를 동적으로 호출

`sub_401000`에서는 `LoadLibraryA`로 `kernel32.dll`을 불러오고, `GetProcAddress`로 `CreateMutexA`의 주소를 가져옵니다. 얻은 주소를 `[ebp+var_4]`에 저장한 뒤 간접 호출합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-29.png" target="_blank" rel="noopener noreferrer" aria-label="CreateMutexA 함수 주소 획득 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-29.png" alt="CreateMutexA 함수 주소 획득" width="520" height="180" loading="lazy" decoding="async">
  </a>
  <figcaption>CreateMutexA 함수 주소 획득 · 발표 자료 49쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-30.png" target="_blank" rel="noopener noreferrer" aria-label="저장한 함수 주소를 통한 뮤텍스 생성 호출 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-30.png" alt="저장한 함수 주소를 통한 뮤텍스 생성 호출" width="332" height="340" loading="lazy" decoding="async">
  </a>
  <figcaption>저장한 함수 주소를 통한 뮤텍스 생성 호출 · 발표 자료 50쪽</figcaption>
</figure>


이 코드는 `system32t` 뮤텍스와 관련된 동적 분석 결과를 설명해 줍니다. 같은 이름의 뮤텍스가 없다면 새로 생성하는 동작입니다.

### 4.3. 메시지 처리와 작업 함수 호출

다음으로 `user32.dll`에서 `PostThreadMessageA`, `GetInputState`, `GetMessageA`의 주소를 가져옵니다. `GetInputState`로 입력 상태를 확인하고, 현재 스레드의 메시지 큐에 `WM_NULL(0)`을 넣는 과정이 이어집니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-31.png" target="_blank" rel="noopener noreferrer" aria-label="PostThreadMessageA와 GetInputState 주소 획득 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-31.png" alt="PostThreadMessageA와 GetInputState 주소 획득" width="434" height="390" loading="lazy" decoding="async">
  </a>
  <figcaption>PostThreadMessageA와 GetInputState 주소 획득 · 발표 자료 51쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-32.png" target="_blank" rel="noopener noreferrer" aria-label="GetMessageA 주소 획득과 입력 상태 확인 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-32.png" alt="GetMessageA 주소 획득과 입력 상태 확인" width="370" height="290" loading="lazy" decoding="async">
  </a>
  <figcaption>GetMessageA 주소 획득과 입력 상태 확인 · 발표 자료 52쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-33.png" target="_blank" rel="noopener noreferrer" aria-label="현재 스레드에 WM_NULL 메시지 전달 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-33.png" alt="현재 스레드에 WM_NULL 메시지 전달" width="428" height="110" loading="lazy" decoding="async">
  </a>
  <figcaption>현재 스레드에 WM_NULL 메시지 전달 · 발표 자료 52쪽</figcaption>
</figure>


이후 `GetMessageA`로 메시지를 받아온 뒤 `sub_4037A0`, `sub_4013C0`, `sub_4032F0`을 순서대로 호출합니다. 마지막에는 `CreateThread`로 `StartAddress`에서 시작하는 스레드를 생성합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-34.png" target="_blank" rel="noopener noreferrer" aria-label="작업 함수 호출 순서와 CreateThread — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-34.png" alt="작업 함수 호출 순서와 CreateThread" width="450" height="354" loading="lazy" decoding="async">
  </a>
  <figcaption>작업 함수 호출 순서와 CreateThread · 발표 자료 53, 61쪽</figcaption>
</figure>


### 4.4. 보안 제품 관련 프로세스 조회

`sub_4037A0`은 `V3LTray.exe`, `AYAgent.aye`, `nsavsvc.npc`, `v3sp.EXE` 등의 이름을 `sub_401070`에 전달합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-35.png" target="_blank" rel="noopener noreferrer" aria-label="보안 제품 관련 프로세스 이름 전달 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-35.png" alt="보안 제품 관련 프로세스 이름 전달" width="396" height="386" loading="lazy" decoding="async">
  </a>
  <figcaption>보안 제품 관련 프로세스 이름 전달 · 발표 자료 54쪽</figcaption>
</figure>


`sub_401070`은 실행 중인 프로세스 이름을 전달받은 문자열과 비교해 해당 프로세스가 실행 중인지 확인합니다. 여기서 확인한 내용은 프로세스의 **조회와 비교**이며, 이 화면만으로 보안 프로그램을 종료하거나 무력화한다고 단정하지는 않았습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-36.png" target="_blank" rel="noopener noreferrer" aria-label="실행 중인 프로세스 이름 비교 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-36.png" alt="실행 중인 프로세스 이름 비교" width="382" height="422" loading="lazy" decoding="async">
  </a>
  <figcaption>실행 중인 프로세스 이름 비교 · 발표 자료 55쪽</figcaption>
</figure>


### 4.5. 레지스트리 API 준비

`sub_4013C0`에서는 `ADVAPI32.dll`에서 레지스트리 관련 API 주소를 가져옵니다. `RegCreateKeyA`로 `HKEY_LOCAL_MACHINE` 아래의 키를 생성하거나 열고, 처리 후 `RegCloseKey`로 핸들을 닫는 흐름을 확인했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-37.png" target="_blank" rel="noopener noreferrer" aria-label="레지스트리 API의 동적 로드 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-37.png" alt="레지스트리 API의 동적 로드" width="490" height="456" loading="lazy" decoding="async">
  </a>
  <figcaption>레지스트리 API의 동적 로드 · 발표 자료 56쪽</figcaption>
</figure>


### 4.6. 64to32 서비스와 DLL 경로 설정

`sub_4032F0`에서는 서비스 설치에 필요한 경로와 설정을 준비합니다. 먼저 `OpenSCManagerA`에 두 개의 `NULL`을 전달해 현재 컴퓨터의 기본 서비스 데이터베이스에 연결하고, 접근 권한으로 `0xF003F`를 요청합니다.

이어서 `GetSystemDirectoryA`로 시스템 디렉터리 경로를 가져오고, `wsprintfA`로 시스템 경로와 `64to32`를 결합합니다. 분석 환경에서는 `C:\WINDOWS\system32\64to32.dll` 경로가 만들어집니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-38.png" target="_blank" rel="noopener noreferrer" aria-label="서비스 제어 관리자 연결과 DLL 경로 구성 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-38.png" alt="서비스 제어 관리자 연결과 DLL 경로 구성" width="412" height="840" loading="lazy" decoding="async">
  </a>
  <figcaption>서비스 제어 관리자 연결과 DLL 경로 구성 · 발표 자료 57, 58쪽</figcaption>
</figure>


`CreateServiceA` 호출에서는 서비스 이름을 `64to32`로 지정하고, 실행 경로를 `%SystemRoot%\System32\svchost.exe`로 설정합니다. 시작 유형으로 `2`를 전달해 자동 시작하도록 구성합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-39.png" target="_blank" rel="noopener noreferrer" aria-label="CreateServiceA의 서비스 생성 설정 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-39.png" alt="CreateServiceA의 서비스 생성 설정" width="520" height="438" loading="lazy" decoding="async">
  </a>
  <figcaption>CreateServiceA의 서비스 생성 설정 · 발표 자료 59쪽</figcaption>
</figure>


그 다음 `Parameters` 하위 키의 `ServiceDll` 값에 앞서 만든 DLL 경로를 저장합니다. 동적 분석에서 확인한 서비스 설정과 같은 흐름입니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-40.png" target="_blank" rel="noopener noreferrer" aria-label="ServiceDll 값 설정 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-40.png" alt="ServiceDll 값 설정" width="526" height="314" loading="lazy" decoding="async">
  </a>
  <figcaption>ServiceDll 값 설정 · 발표 자료 60쪽</figcaption>
</figure>


### 4.7. 다른 고정 드라이브를 탐색하는 스레드

서비스 설정 이후에는 `CreateThread`의 시작 함수인 `StartAddress`를 확인했습니다. 드라이브 목록에서 드라이브 문자와 콜론을 복사하고, `GetDriveTypeA`의 결과를 `3`과 비교합니다. 고정 드라이브가 아니면 해당 대상을 건너뜁니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-41.png" target="_blank" rel="noopener noreferrer" aria-label="StartAddress에서 고정 드라이브 확인 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-41.png" alt="StartAddress에서 고정 드라이브 확인" width="440" height="318" loading="lazy" decoding="async">
  </a>
  <figcaption>StartAddress에서 고정 드라이브 확인 · 발표 자료 62쪽</figcaption>
</figure>


다음으로 `StrStrIA`를 통해 시스템 디렉터리 경로에 해당 드라이브 문자열이 포함되는지 검사합니다. 포함되어 있으면 시스템 드라이브로 판단해 건너뛰는 흐름입니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-42.png" target="_blank" rel="noopener noreferrer" aria-label="시스템 드라이브를 제외하는 조건 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-42.png" alt="시스템 드라이브를 제외하는 조건" width="316" height="338" loading="lazy" decoding="async">
  </a>
  <figcaption>시스템 드라이브를 제외하는 조건 · 발표 자료 63쪽</figcaption>
</figure>


발표에서 정리한 하위 탐색 흐름은 다음과 같습니다. 시스템 드라이브를 제외한 고정 드라이브에서 파일과 하위 폴더를 탐색하고, 파일 이름이 비교 조건에 맞으면 기존 파일의 이동·삭제를 시도합니다. 이어서 `64to32.dll`을 복사하고 숨김 속성을 설정하려는 코드가 있습니다.

이 부분은 **다른 고정 드라이브에 DLL을 복사하려는 기능**으로 해석했습니다. 실제 복사가 성공했는지는 발표 자료의 동적 분석 결과로 확인하지 못했습니다.

### 4.8. 스레드 대기와 핸들 정리

`WinMain`으로 돌아오면 `WaitForSingleObject`에 `INFINITE(0xFFFFFFFF)`를 전달해 생성한 스레드가 종료될 때까지 기다립니다. 이후 `CloseHandle`로 핸들을 닫고 `hObject`를 `0`으로 초기화합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-43.png" target="_blank" rel="noopener noreferrer" aria-label="스레드 종료 대기와 핸들 정리 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-43.png" alt="스레드 종료 대기와 핸들 정리" width="366" height="166" loading="lazy" decoding="async">
  </a>
  <figcaption>스레드 종료 대기와 핸들 정리 · 발표 자료 65쪽</figcaption>
</figure>


마지막으로 `sub_401170`을 호출한 뒤 `WinMain`을 종료합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-44.png" target="_blank" rel="noopener noreferrer" aria-label="WinMain 종료 직전의 sub_401170 호출 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-44.png" alt="WinMain 종료 직전의 sub_401170 호출" width="350" height="388" loading="lazy" decoding="async">
  </a>
  <figcaption>WinMain 종료 직전의 sub_401170 호출 · 발표 자료 66쪽</figcaption>
</figure>


### 4.9. 원본 EXE 자기 삭제 시도

`sub_401170`은 `GetModuleFileNameA`로 현재 EXE 경로를 얻고, `GetShortPathNameA`로 짧은 경로 형태로 변환합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-45.png" target="_blank" rel="noopener noreferrer" aria-label="현재 EXE의 경로 획득과 짧은 경로 변환 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-45.png" alt="현재 EXE의 경로 획득과 짧은 경로 변환" width="324" height="428" loading="lazy" decoding="async">
  </a>
  <figcaption>현재 EXE의 경로 획득과 짧은 경로 변환 · 발표 자료 67쪽</figcaption>
</figure>


이 경로에 `/c del`과 `> NUL`을 붙여 삭제 명령을 구성하고, `ComSpec` 환경 변수에서 명령 처리기 경로를 가져옵니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-46.png" target="_blank" rel="noopener noreferrer" aria-label="자기 삭제 명령과 명령 처리기 경로 준비 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-46.png" alt="자기 삭제 명령과 명령 처리기 경로 준비" width="298" height="438" loading="lazy" decoding="async">
  </a>
  <figcaption>자기 삭제 명령과 명령 처리기 경로 준비 · 발표 자료 68쪽</figcaption>
</figure>


이어서 `ShellExecuteA`로 창을 숨긴 상태에서 명령 처리기를 실행합니다. 반환값이 `32`보다 큰지 검사하지만, 이는 실행 요청의 성공 여부를 보는 것이므로 EXE 파일이 실제로 삭제되었다는 확인과는 구분해야 합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-47.png" target="_blank" rel="noopener noreferrer" aria-label="ShellExecuteA 호출과 반환값 검사 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-47.png" alt="ShellExecuteA 호출과 반환값 검사" width="484" height="410" loading="lazy" decoding="async">
  </a>
  <figcaption>ShellExecuteA 호출과 반환값 검사 · 발표 자료 69쪽</figcaption>
</figure>


EXE 분석을 정리하면, 뮤텍스 처리와 프로세스 조회를 거쳐 DLL의 서비스 실행을 준비하고, 별도 드라이브 탐색 작업 이후 자기 삭제를 시도하는 구조입니다. DLL 파일 생성과 서비스 실행은 앞서 동적 분석에서 확인한 결과와 연결됩니다.

<h2 id="dll">5. 고급 정적 분석 — 64to32.dll</h2>

### 5.1. ServiceMain과 서비스 상태 보고

`64to32.dll`은 원본 EXE에서 추출되어 서비스로 실행되는 DLL이므로 `ServiceMain`부터 살펴봤습니다. 먼저 `wcstombs`로 서비스 이름을 변환하고, `RegisterServiceCtrlHandlerA`로 서비스 제어 핸들러를 등록합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-48.png" target="_blank" rel="noopener noreferrer" aria-label="ServiceMain의 서비스 이름 처리와 핸들러 등록 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-48.png" alt="ServiceMain의 서비스 이름 처리와 핸들러 등록" width="356" height="366" loading="lazy" decoding="async">
  </a>
  <figcaption>ServiceMain의 서비스 이름 처리와 핸들러 등록 · 발표 자료 73쪽</figcaption>
</figure>


등록에 성공하면 `FreeConsole`로 현재 프로세스와 연결된 콘솔을 분리합니다. 이어서 `sub_10001790`을 두 번 호출하고, `sub_10001670`, `sub_100015E0` 등의 작업으로 넘어갑니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-49.png" target="_blank" rel="noopener noreferrer" aria-label="서비스 초기화 이후의 호출 흐름 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-49.png" alt="서비스 초기화 이후의 호출 흐름" width="280" height="428" loading="lazy" decoding="async">
  </a>
  <figcaption>서비스 초기화 이후의 호출 흐름 · 발표 자료 74쪽</figcaption>
</figure>


`sub_10001790`은 전달받은 상태를 `SetServiceStatus`로 서비스 제어 관리자에 보고하는 함수입니다. 두 번의 호출에서 시작 준비 중인 상태 `2`, 실행 중인 상태 `4`를 차례로 전달합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-50.png" target="_blank" rel="noopener noreferrer" aria-label="SetServiceStatus로 상태를 보고하는 함수 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-50.png" alt="SetServiceStatus로 상태를 보고하는 함수" width="430" height="318" loading="lazy" decoding="async">
  </a>
  <figcaption>SetServiceStatus로 상태를 보고하는 함수 · 발표 자료 75쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-51.png" target="_blank" rel="noopener noreferrer" aria-label="시작 준비와 실행 상태를 전달하는 호출부 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-51.png" alt="시작 준비와 실행 상태를 전달하는 호출부" width="282" height="144" loading="lazy" decoding="async">
  </a>
  <figcaption>시작 준비와 실행 상태를 전달하는 호출부 · 발표 자료 75쪽</figcaption>
</figure>


### 5.2. INI 경로와 작업 스레드

다음으로 `GetSystemDirectoryA`와 `wsprintfA`를 사용해 `Windowsxp.ini`, `Windowsxp32.ini`의 전체 경로를 만듭니다. 각 경로는 `var_518`과 `pszPath`에 저장됩니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-52.png" target="_blank" rel="noopener noreferrer" aria-label="두 INI 파일의 경로 구성 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-52.png" alt="두 INI 파일의 경로 구성" width="324" height="306" loading="lazy" decoding="async">
  </a>
  <figcaption>두 INI 파일의 경로 구성 · 발표 자료 76쪽</figcaption>
</figure>


`_beginthreadex`는 `sub_10003C10`에서 시작하는 작업 스레드를 만듭니다. 이어지는 코드에서는 `Windowsxp32.ini` 경로를 `sub_100036E0`에 전달합니다. 이 중 통신과 응답 처리를 맡는 `sub_100036E0`부터 따라갔습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-53.png" target="_blank" rel="noopener noreferrer" aria-label="작업 스레드 생성과 INI 경로 전달 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-53.png" alt="작업 스레드 생성과 INI 경로 전달" width="304" height="442" loading="lazy" decoding="async">
  </a>
  <figcaption>작업 스레드 생성과 INI 경로 전달 · 발표 자료 77, 78쪽</figcaption>
</figure>


### 5.3. WinINet 함수 주소 획득

`sub_100036E0`에서는 `wininet.dll`을 불러온 뒤 `GetProcAddress`로 통신에 사용할 함수 주소를 가져옵니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-54.png" target="_blank" rel="noopener noreferrer" aria-label="wininet.dll 로드 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-54.png" alt="wininet.dll 로드" width="400" height="274" loading="lazy" decoding="async">
  </a>
  <figcaption>wininet.dll 로드 · 발표 자료 79쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-55.png" target="_blank" rel="noopener noreferrer" aria-label="WinINet 통신 함수 주소 획득 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-55.png" alt="WinINet 통신 함수 주소 획득" width="358" height="260" loading="lazy" decoding="async">
  </a>
  <figcaption>WinINet 통신 함수 주소 획득 · 발표 자료 80쪽</figcaption>
</figure>


`InternetOpenA`는 통신 환경 초기화, `InternetOpenUrlA`는 URL 열기, `InternetCloseHandle`은 사용한 핸들 정리와 연결됩니다. 호출 이름만 보는 데서 그치지 않고, 이후 응답을 어디에 저장하고 어떻게 처리하는지 이어서 확인했습니다.

### 5.4. TIME 값을 검사한 뒤 URL 요청

INI 파일의 `[TIME]` 섹션에서 `TIME` 값을 읽어 `atoi`로 정수로 변환합니다. 기존 `ESI` 값에서 이를 뺀 결과를 `800(0x320)`과 비교해 실행 경로를 결정합니다. 이 비교값의 시간 단위는 제시된 코드 화면만으로 단정하지 않았습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-56.png" target="_blank" rel="noopener noreferrer" aria-label="INI의 TIME 값과 비교 조건 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-56.png" alt="INI의 TIME 값과 비교 조건" width="288" height="360" loading="lazy" decoding="async">
  </a>
  <figcaption>INI의 TIME 값과 비교 조건 · 발표 자료 81쪽</figcaption>
</figure>


검사를 거친 뒤 `[ebp+var_2C]`에 저장해 둔 `InternetOpenUrlA`를 호출합니다. URL 열기에 성공하면 버퍼를 초기화하고 최대 **520바이트**의 응답을 읽습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-57.png" target="_blank" rel="noopener noreferrer" aria-label="저장해 둔 InternetOpenUrlA 호출 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-57.png" alt="저장해 둔 InternetOpenUrlA 호출" width="416" height="472" loading="lazy" decoding="async">
  </a>
  <figcaption>저장해 둔 InternetOpenUrlA 호출 · 발표 자료 82쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-58.png" target="_blank" rel="noopener noreferrer" aria-label="응답 버퍼 초기화와 읽기 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-58.png" alt="응답 버퍼 초기화와 읽기" width="216" height="308" loading="lazy" decoding="async">
  </a>
  <figcaption>응답 버퍼 초기화와 읽기 · 발표 자료 83쪽</figcaption>
</figure>


### 5.5. BACKTIME과 응답 비교

읽은 응답에서 `strncpy`로 처음 8바이트를 복사하고, `PathFileExistsA`로 INI 파일의 존재 여부를 확인합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-59.png" target="_blank" rel="noopener noreferrer" aria-label="응답 앞부분 복사와 INI 파일 확인 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-59.png" alt="응답 앞부분 복사와 INI 파일 확인" width="316" height="236" loading="lazy" decoding="async">
  </a>
  <figcaption>응답 앞부분 복사와 INI 파일 확인 · 발표 자료 84쪽</figcaption>
</figure>


INI 파일이 있으면 `[TIME]` 섹션의 `BACKTIME` 값을 가져와 `_stricmp`로 응답 앞부분과 비교합니다. 같으면 처리를 생략하고, 다르면 다음 검사로 진행합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-60.png" target="_blank" rel="noopener noreferrer" aria-label="BACKTIME과 응답 앞부분 비교 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-60.png" alt="BACKTIME과 응답 앞부분 비교" width="300" height="400" loading="lazy" decoding="async">
  </a>
  <figcaption>BACKTIME과 응답 앞부분 비교 · 발표 자료 85쪽</figcaption>
</figure>


이후 문자열 길이가 `1`보다 큰지 확인하고, 조건에 맞으면 `WritePrivateProfileStringA`를 통해 `BACKTIME`을 갱신합니다. 같은 응답을 반복해서 처리하지 않도록 비교하는 흐름으로 볼 수 있습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-61.png" target="_blank" rel="noopener noreferrer" aria-label="응답 앞부분의 길이 검사 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-61.png" alt="응답 앞부분의 길이 검사" width="221" height="152" loading="lazy" decoding="async">
  </a>
  <figcaption>응답 앞부분의 길이 검사 · 발표 자료 86쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-62.png" target="_blank" rel="noopener noreferrer" aria-label="BACKTIME 값 갱신 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-62.png" alt="BACKTIME 값 갱신" width="210" height="53" loading="lazy" decoding="async">
  </a>
  <figcaption>BACKTIME 값 갱신 · 발표 자료 86쪽</figcaption>
</figure>


### 5.6. 응답을 줄 단위로 나누기

검사를 통과한 응답은 `strtok`으로 줄바꿈 기준으로 나눕니다. 이후 반복 호출을 통해 각 항목의 주소를 차례대로 저장합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-63.png" target="_blank" rel="noopener noreferrer" aria-label="strtok을 통한 응답 분리 시작 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-63.png" alt="strtok을 통한 응답 분리 시작" width="188" height="177" loading="lazy" decoding="async">
  </a>
  <figcaption>strtok을 통한 응답 분리 시작 · 발표 자료 87쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-64.png" target="_blank" rel="noopener noreferrer" aria-label="응답 항목을 반복해서 저장하는 부분 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-64.png" alt="응답 항목을 반복해서 저장하는 부분" width="190" height="138" loading="lazy" decoding="async">
  </a>
  <figcaption>응답 항목을 반복해서 저장하는 부분 · 발표 자료 87쪽</figcaption>
</figure>


첫 번째 항목을 제외한 나머지 항목은 `sub_10003040`에 전달합니다. 뒤의 다운로드 함수와 연결해 보면, 이 항목들이 다운로드할 URL로 사용되는 흐름을 확인할 수 있습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-65.png" target="_blank" rel="noopener noreferrer" aria-label="분리한 항목을 sub_10003040에 전달 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-65.png" alt="분리한 항목을 sub_10003040에 전달" width="167" height="212" loading="lazy" decoding="async">
  </a>
  <figcaption>분리한 항목을 sub_10003040에 전달 · 발표 자료 88쪽</figcaption>
</figure>


### 5.7. 임시 파일 이름과 경로 구성

`sub_10003040`에서는 `GetTempPathA`로 임시 폴더 경로를 가져옵니다. 이어서 문자를 선택하는 과정을 반복해 8글자 이름을 만듭니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-66.png" target="_blank" rel="noopener noreferrer" aria-label="임시 폴더 경로 획득 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-66.png" alt="임시 폴더 경로 획득" width="212" height="143" loading="lazy" decoding="async">
  </a>
  <figcaption>임시 폴더 경로 획득 · 발표 자료 89쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-67.png" target="_blank" rel="noopener noreferrer" aria-label="8글자 파일 이름 생성 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-67.png" alt="8글자 파일 이름 생성" width="177" height="128" loading="lazy" decoding="async">
  </a>
  <figcaption>8글자 파일 이름 생성 · 발표 자료 89쪽</figcaption>
</figure>


만든 이름에 `.pif` 확장자를 붙여 임시 폴더 아래의 파일 경로를 구성하고, 응답에서 얻은 URL과 이 경로를 `sub_10002EC0`에 넘깁니다. 여기서 확장자만으로 실제 내려받을 파일의 내부 형식을 판단할 수는 없습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-68.png" target="_blank" rel="noopener noreferrer" aria-label="pif 확장자 준비 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-68.png" alt="pif 확장자 준비" width="178" height="205" loading="lazy" decoding="async">
  </a>
  <figcaption>pif 확장자 준비 · 발표 자료 90쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-69.png" target="_blank" rel="noopener noreferrer" aria-label="URL과 저장 경로를 다운로드 함수에 전달 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-69.png" alt="URL과 저장 경로를 다운로드 함수에 전달" width="177" height="72" loading="lazy" decoding="async">
  </a>
  <figcaption>URL과 저장 경로를 다운로드 함수에 전달 · 발표 자료 90쪽</figcaption>
</figure>


### 5.8. 추가 파일 다운로드와 실행 시도

발표에서는 이 부분을 `urlmon.dll`과 `URLDownloadToFileA`를 사용하는 흐름으로 분석했습니다. 화면에는 변형된 문자열 표기가 보이며, DLL 로드와 함수 주소 획득 이후의 호출부를 따라가 다운로드 역할을 확인했습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-70.png" target="_blank" rel="noopener noreferrer" aria-label="다운로드에 사용할 DLL 로드 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-70.png" alt="다운로드에 사용할 DLL 로드" width="245" height="82" loading="lazy" decoding="async">
  </a>
  <figcaption>다운로드에 사용할 DLL 로드 · 발표 자료 91쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-71.png" target="_blank" rel="noopener noreferrer" aria-label="다운로드 함수 주소 획득 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-71.png" alt="다운로드 함수 주소 획득" width="326" height="55" loading="lazy" decoding="async">
  </a>
  <figcaption>다운로드 함수 주소 획득 · 발표 자료 91쪽</figcaption>
</figure>


획득한 함수 주소를 호출해 응답 항목의 URL에서 임시 파일 경로로 다운로드를 시도하고, 반환값을 검사합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-72.png" target="_blank" rel="noopener noreferrer" aria-label="다운로드 호출과 결과 검사 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-72.png" alt="다운로드 호출과 결과 검사" width="326" height="138" loading="lazy" decoding="async">
  </a>
  <figcaption>다운로드 호출과 결과 검사 · 발표 자료 92쪽</figcaption>
</figure>


다운로드 성공 분기에서는 `WinExec`로 임시 파일의 실행을 시도합니다. 제시된 코드에서는 `WinExec`의 실행 성공 여부를 따로 검사하지 않고 `1`을 반환합니다. 따라서 이 부분에서 확인한 것은 **추가 파일 다운로드·실행 기능의 존재**이며, 실제 추가 파일이 성공적으로 실행되었다는 동적 분석 결과는 아닙니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-73.png" target="_blank" rel="noopener noreferrer" aria-label="임시 파일의 WinExec 호출 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-73.png" alt="임시 파일의 WinExec 호출" width="216" height="162" loading="lazy" decoding="async">
  </a>
  <figcaption>임시 파일의 WinExec 호출 · 발표 자료 93쪽</figcaption>
</figure>


### 5.9. NPKI 폴더 탐색

이제 별도 작업 스레드의 인증서 탐색 과정을 살펴봤습니다. `GetDriveTypeA` 결과를 통해 고정 드라이브 `3`과 이동식 드라이브 `2`를 선택합니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-74.png" target="_blank" rel="noopener noreferrer" aria-label="고정·이동식 드라이브 유형 검사 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-74.png" alt="고정·이동식 드라이브 유형 검사" width="190" height="117" loading="lazy" decoding="async">
  </a>
  <figcaption>고정·이동식 드라이브 유형 검사 · 발표 자료 94쪽</figcaption>
</figure>


각 드라이브에 `NPKI`를 붙인 경로를 만들고 탐색 함수에 전달합니다. 원본 EXE의 고정 드라이브 탐색과 달리, 이 부분에는 이동식 드라이브도 대상에 포함되어 있습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-75.png" target="_blank" rel="noopener noreferrer" aria-label="드라이브의 NPKI 경로 구성 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-75.png" alt="드라이브의 NPKI 경로 구성" width="191" height="128" loading="lazy" decoding="async">
  </a>
  <figcaption>드라이브의 NPKI 경로 구성 · 발표 자료 94쪽</figcaption>
</figure>


### 5.10. 인증서와 개인키 파일 읽기

NPKI 아래에서 대상 사용자 폴더를 찾으면 `signCert.der`와 `signPri.key`의 경로를 구성합니다. 각각 인증서와 개인키 파일을 대상으로 하는 부분입니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-76.png" target="_blank" rel="noopener noreferrer" aria-label="signCert.der와 signPri.key 경로 구성 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-76.png" alt="signCert.der와 signPri.key 경로 구성" width="270" height="190" loading="lazy" decoding="async">
  </a>
  <figcaption>signCert.der와 signPri.key 경로 구성 · 발표 자료 95쪽</figcaption>
</figure>


이후 `sub_10005870`에서 두 파일 내용을 읽어 저장하고, 전송할 본문을 만드는 `sub_10003FA0`을 호출합니다. 기초 정적 분석에서 발견한 파일명 문자열이 실제 파일 접근 코드와 연결되는 지점입니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-77.png" target="_blank" rel="noopener noreferrer" aria-label="두 파일을 읽고 전송 본문 생성 함수 호출 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-77.png" alt="두 파일을 읽고 전송 본문 생성 함수 호출" width="183" height="122" loading="lazy" decoding="async">
  </a>
  <figcaption>두 파일을 읽고 전송 본문 생성 함수 호출 · 발표 자료 95쪽</figcaption>
</figure>


### 5.11. HTTP POST 본문 구성과 전송

읽어 둔 두 파일의 내용을 하나의 전송 데이터로 묶습니다. `sprintf`로 `1.der`, `1.key`와 같은 파일명 및 형식 정보를 붙여 각 파일을 구분할 수 있게 구성합니다. 앞서 확인한 `multipart/form-data` 문자열과 연결해서 볼 수 있는 부분입니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-78.png" target="_blank" rel="noopener noreferrer" aria-label="인증서·개인키를 포함하는 전송 본문 구성 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-78.png" alt="인증서·개인키를 포함하는 전송 본문 구성" width="300" height="199" loading="lazy" decoding="async">
  </a>
  <figcaption>인증서·개인키를 포함하는 전송 본문 구성 · 발표 자료 96쪽</figcaption>
</figure>


이후 `HttpOpenRequestA`로 `POST` 요청을 만들고, `HttpSendRequestA`에 데이터 주소와 길이를 전달합니다. 인증서와 개인키를 읽는 부분부터 전송 호출까지 이어지는 코드가 확인됩니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-79.png" target="_blank" rel="noopener noreferrer" aria-label="HttpOpenRequestA의 POST 요청 생성 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-79.png" alt="HttpOpenRequestA의 POST 요청 생성" width="240" height="72" loading="lazy" decoding="async">
  </a>
  <figcaption>HttpOpenRequestA의 POST 요청 생성 · 발표 자료 97쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-80.png" target="_blank" rel="noopener noreferrer" aria-label="HttpSendRequestA에 전송 데이터 전달 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-80.png" alt="HttpSendRequestA에 전송 데이터 전달" width="209" height="177" loading="lazy" decoding="async">
  </a>
  <figcaption>HttpSendRequestA에 전송 데이터 전달 · 발표 자료 97쪽</figcaption>
</figure>


자료에는 이 POST 요청으로 실제 인증정보가 외부에 전달되었다는 패킷이나 서버 수신 결과가 제시되어 있지 않습니다. 따라서 **인증정보를 수집해 전송하려는 코드가 확인되었다**고 정리했습니다.

### 5.12. DNS 조회 후 IP로 재시도

전송 실패 이후에는 `8.8.8.8` 등의 DNS 서버에 조회하여 접속 대상의 IP 주소를 얻는 경로가 있습니다. 화면에서는 DNS 조회 관련 함수 호출과 소켓 설정을 확인할 수 있습니다.

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-81.png" target="_blank" rel="noopener noreferrer" aria-label="DNS 서버 주소를 전달하는 호출부 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-81.png" alt="DNS 서버 주소를 전달하는 호출부" width="408" height="215" loading="lazy" decoding="async">
  </a>
  <figcaption>DNS 서버 주소를 전달하는 호출부 · 발표 자료 98쪽</figcaption>
</figure>

<figure class="analysis-figure">
  <a href="/assets/images/npki-analysis/figure-82.png" target="_blank" rel="noopener noreferrer" aria-label="DNS 조회에 사용하는 소켓과 포트 설정 — 원본 보기">
    <img src="/assets/images/npki-analysis/figure-82.png" alt="DNS 조회에 사용하는 소켓과 포트 설정" width="402" height="218" loading="lazy" decoding="async">
  </a>
  <figcaption>DNS 조회에 사용하는 소켓과 포트 설정 · 발표 자료 98쪽</figcaption>
</figure>


발표에서 정리한 후속 흐름은 `sub_10002250`에서 URL의 호스트를 조회한 IP로 바꾸고, 기존 요청 경로를 유지해 다시 전송을 시도하는 것입니다. 여기서 `8.8.8.8`은 DNS 조회에 쓰이는 주소로 구분해야 하며, 인증정보를 받는 서버 주소라고 해석하면 안 됩니다.

<h2 id="conclusion">6. 분석 결과 정리</h2>

이번 분석의 흐름을 정리하면 다음과 같습니다.

```text
원본 EXE
  └─ 내부 DLL을 64to32.dll로 생성
      └─ 64to32 서비스 등록 → svchost.exe에서 실행
          ├─ 텍스트 파일 경로로 HTTP GET 요청
          │   └─ 응답 항목 처리 → 추가 파일 다운로드·실행 시도
          └─ 고정·이동식 드라이브의 NPKI 탐색
              └─ signCert.der / signPri.key 읽기
                  └─ HTTP POST 전송 시도
                      └─ 실패 시 DNS 조회 결과를 이용해 재시도
```

| 분석 항목 | 확인한 근거 | 확인 범위 |
| --- | --- | --- |
| 내부 DLL 설치 | 리소스 추출 파일과 생성된 DLL의 크기·MD5·SHA-1 일치 | 동적 분석에서 확인 |
| 서비스 실행 | SysAnalyzer, Process Explorer, 서비스 레지스트리와 IDA 코드 | 동적·정적 분석에서 확인 |
| 텍스트 파일 요청 | http.log와 Wireshark의 두 GET 경로 | 분석 환경에서 요청 확인, INetSim 응답 |
| 다른 드라이브에 DLL 복사 | EXE의 StartAddress 및 하위 탐색 흐름 | 코드상 기능, 실제 성공은 미확인 |
| 원본 EXE 자기 삭제 | 경로 획득, 삭제 명령 구성, ShellExecuteA | 삭제 시도 코드 확인 |
| 추가 파일 다운로드·실행 | 응답 분리, 임시 pif 경로, 다운로드 호출, WinExec | 코드상 기능, 실제 실행 성공은 미확인 |
| 인증서·개인키 수집과 전송 | NPKI 탐색, 파일 읽기, POST 본문과 전송 호출 | 코드상 기능, 실제 외부 유출 성공은 미확인 |

이를 종합하면 **원본 EXE는 내부 DLL을 설치하고 서비스로 실행시키는 드로퍼 역할**을 합니다. **64to32.dll은 추가 파일 다운로드·실행 기능과 NPKI 인증서·개인키 수집 및 전송 기능을 가진 정보 탈취형 DLL**로 판단했습니다.

이번 분석에서는 PEStudio에서 본 문자열과 API를 출발점으로 삼고, 동적 분석에서 생성된 파일과 서비스를 확인한 다음, IDA에서 각각의 호출 흐름을 연결했습니다. 특히 내부 리소스의 DLL과 실행 후 생성된 DLL의 해시를 비교한 과정이 EXE와 DLL의 관계를 확인하는 근거가 되었습니다.

다만 인증서·개인키 파일의 전송 기능을 확인한 것과 실제 유출에 성공한 것은 다릅니다. 추가 파일 실행, 다른 드라이브로의 복사, 최종 전송 성공 여부는 별도의 실행 결과로 확인해야 할 부분으로 남겼습니다.

---

*자료: SecurityFirst 2026년 2학기 정규팀 4주차 세미나 발표 자료 — 이하늘, 2026.10.28. 본문의 분석 화면은 해당 발표 자료에서 가져왔습니다.*
