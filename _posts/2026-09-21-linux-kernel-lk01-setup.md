---
layout: post
title: "Linux 커널 보안 입문 — QEMU와 LK01 환경 준비"
description: "커널 공간의 특징과 실습용 rootfs.cpio 수정·부팅 기록"
date: 2026-09-21 00:00:00 +0900
categories: [blog-docs]
topic: system
---

{% raw %}
[https://pawnyable.cafe/linux-kernel/introduction/introduction.html?utm\_source=chatgpt.com#fn1](https://pawnyable.cafe/linux-kernel/introduction/introduction.html?utm_source=chatgpt.com#fn1)

커널 보안 공부를 시작하며 사용자 공간과 커널 공간의 차이를 정리하고, QEMU에서 실습용 Linux를 부팅했다.

Windows의 Kernel Exploit에서도 공통의 하드웨어 보안 기구나 권한 승격의 수법이 등장하기 때문에, 이 장의 지식은 Linux에 한정되지 않고 활용할 수 있다.

---

## 실습 환경 준비

## 사용자 공간과 커널 공간의 차이

사용자랜드 exploit과 커널 exploit의 차이는 목적이 존재한다.

유저랜드 exploit은 임의 명령 실행 이라고 하는 목표를 위주로 exploit을 작성 하였다.

하지만 커널 exploit은 권한 상승을 목적으로 exploit을 작성한다.

LPE(Local Privilege Escalation)

- 로컬 머신에서의 권한 상승

유저랜드에서의 권한 상승 취약점도 존재 하지만 이는 공격 프로그램이 높은 권한을 가지기 때문이다.

커널 exploit의 경우 2가지의 공격 대상이 존재

#### Linux 커널

이유 : Linux 커널의 코드(syscall, file system)는 커널 모드에서 실행되고, 커널에 버그가 있는 경우 LPE와 연결 가능성이 존재하기 때문

#### 커널 모듈

이유 : 디바이스 드라이버는 유저 공간에서 외부와의 교환을 하기 위한 인터페이스인데, 커널 드라이버도 커널 모드에서 실행되기 때문에 버그가 있는 경우 LPE와 이어지게 된다.

유저랜드의 경우 공격 대상의 서비스에 입력을 주는 exploit → 파이썬 주류로 사용

커널 exploit은 대상이 OS, 드라이버 → C언어 주로 사용

#### 커널 exploit의 특징

<strong>커널 exploit은 리소스가 공유된다는 점이다.</strong>

유저랜드에서는 공격 프로세스가 1개 존재해서, exploit 하는 것으로, 쉘을 취하는 공격이 가능함

Linux 커널이나, 디바이스 드라이버와 같은 프로그램은 OS를 사용하는 모든 프로세스에 공유되고 있어서 syscall은 누구나 자유로운 타이밍에 사용할 수 있다.

커널 공간에서 움직이는 코드를 작성할 때 항상 멀티스레드의 생각으로 프로그래밍을 하지 않으면 쉽게 취약성을 내장함

#### 힙 영역의 공유

<strong>커널의 힙 영역은 모든 드라이버와 커널에서 공유된다는 특징이 존재한다.</strong>

지금까지의 유저 랜드의 exploit에서, 프로그램마다 힙이 존재해서 Heap Overflow가 나타난다.

```c
ex)

다른 디바이스 드라이버로 힙 오버플로우가 일어나면, Linux 커널이 힙에 확보한 데이터까지
모두 오염되어 버린다.
(Heap의 리소스가 공통되며 사용되고 있기에)
```

장점

- 힙 주위의 작은 취약성에도 LPE에 연결될 가능성이 매우 높다.

단점

- 모든 프로그램의 영향을 받기 때문에 힙 상태를 예측할 수 없다는 것이다.<br />유저랜드의 프로그램은 단순한 것이면, 힙의 상태가 결정적이었기 때문에, 복잡한 힙 exploit이 가능하다. <br /><br />한편, 커널에서 Heap Overflow가 발생하는 청크의 뒤에 어떤 데이터가 존재하는지, Use-after-Free 된 후에 누가 그 주소를 사용하는지 모름

<strong>커널 exploit에서 Heap Spray가 중요</strong>

- Heap Spray : 원하는 데이터나 객체를 반복적으로 할당하여 힙 배치에 영향을 주려는 기법이다. 커널 분석에서 힙 스프레이가 반드시 실행 코드를 배치한다는 뜻은 아니다.

#### qemu 사용

Linux 커널 exploit을 작성할 때 디버깅을 위해 에뮬레이터 위에서 커널을 이동(VM이라면 무엇이든 상관 없고, qemu가 일반적이므로 이 사이트에서 qemu를 이용)

```c
qemu-system 설치
# apt install qemu-system
```

#### 실습

```c
[연습 문제 LK01]
(1) run.sh을 실행하여 Linux가 실행되는지 확인하십시오.
(2) 시작시 쉘이 루트 권한이되도록 rootfs.cpio편집하십시오.
(팁: 시작 시 메시지를 표시하는 스크립트를 찾습니다.)
```

먼저 문제 파일을 다운로드받고 <code>run.sh</code> 명령어를 입력해서 WSL에서 QEMU가 실행되는지 확인했고, 정상적으로 Linux가 부팅되는 것을 확인할 수 있었다.

부팅된 Linux에서 <code>id</code> 명령어를 통해 UID 값이 <strong>1337</strong>이라는 것을 확인했다. 이 UID를 0으로 바꿔서 root 권한의 쉘로 들어가는 문제이다.

<code>ls</code> 명령어를 통해 <code>rootfs.cpio</code>가 있는 것을 확인했다. QEMU 안에서 파일을 수정하면 다시 부팅했을 때 변경 내용이 사라지므로, QEMU에서 나온 뒤 WSL에서 <code>rootfs.cpio</code>를 수정하기로 했다.

먼저 임의의 디렉터리인 <code>test</code>를 만들고, 그 안에 cpio 파일을 풀어 주었다.

```txt
mkdir test
cd test
cpio -idmv < ../rootfs.cpio
```

이렇게 파일을 푼 뒤 <code>nano etc/init.d/S99pawnyable</code> 명령어로 부팅 스크립트를 열었다.

파일 내용을 보다 보면 <code>setsid cttyhack setuidgid 1337 sh</code>라는 줄이 있다. 여기서 <code>1337</code>을 <code>0</code>으로 바꾸면 부팅할 때 쉘이 root 권한으로 실행된다.

수정한 파일들을 다시 cpio 파일로 묶고, <code>run.sh</code>가 사용할 수 있도록 기존 <code>rootfs.cpio</code>를 교체했다.

```txt
find . -print0 | cpio -o --format=newc --null > ../rootfs_new.cpio
cd ..
cp rootfs.cpio rootfs_backup.cpio
cp rootfs_new.cpio rootfs.cpio
./run.sh
```

다시 들어간 뒤 <code>id</code> 명령어를 입력해 <code>uid=0(root)</code>가 나오는 것을 확인했고, 성공적으로 문제를 해결했다.

이번 LK01 실습은 제공된 부팅 이미지의 스크립트를 수정하는 **환경 준비 과정**이다. 커널 취약점을 악용해 권한을 상승시킨 실험과는 구분해야 한다.
{% endraw %}
