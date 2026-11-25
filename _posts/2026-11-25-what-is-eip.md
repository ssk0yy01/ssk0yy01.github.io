---
layout: post
title: "EIP가 뭔데?"
description: "이더리움 개선 제안인 EIP의 개념과 분류, ERC 및 Solidity와의 관계를 정리합니다."
date: 2026-11-25 10:00:00 +0900
categories: [blog-docs]
topic: web3
---

#### EIP(<b>Ethereum Improvement Proposal</b>)란?

간단하게 설명하면 이더리움에 새로운 기능이나 규칙을 도입하려는 사람이 다음 내용을 문서로 정리해 공개적으로 제안하는 제도이다.

```py
현재 어떤 문제가 있는가?
왜 개선해야 하는가?
새로운 규칙은 어떻게 동작하는가?
기존 시스템과 호환되는가?
어떤 보안 위험이 있는가?
```

즉, EIP는 단순한 아이디어가 아닌 개발자들이 실제로 구현할 수 있도록 작성된 공개적인 기술 설계서이다.<br />그리고 EIP를 작성했다고 바로 적용되는 것이 아니라 지갑이나 애플리케이션에 채택되거나 네트워크 업그레이드에 포함되어야 사용된다.

그리고 누구나 EIP를 제안할 수 있지만, 실제로 채택되기까지 많은 검토와 구현이 필요하다.

```py
EIP 작성자
코어 개발자
클라이언트 개발팀
지갑과 애플리케이션 개발자
검증자와 노드 운영자
사용자와 커뮤니티
```

#### Standards Track EIP 종류

Standards Track EIP는 크게 4개의 하위 분류로 나눌 수 있다.

<table header-row="true">
<colgroup>
<col />
<col width="387.99998474121094" />
</colgroup>
<tr>
<td>
분류
</td>
<td>
내용
</td>
</tr>
<tr>
<td>
Core
</td>
<td>
이더리움 프로토콜 자체
</td>
</tr>
<tr>
<td>
Networking
</td>
<td>
노드 간 통신 방식
</td>
</tr>
<tr>
<td>
Interface
</td>
<td>
지갑과 클라이언트의 인터페이스
</td>
</tr>
<tr>
<td>
ERC
</td>
<td>
토큰·스마트 컨트랙트 애플리케이션 표준
</td>
</tr>
</table>

그리고 이번 EIP 기술 블로그에서는 Core EIP와 ERC 두 분야로 나눠서 소개할 것이다.

#### EIP와 ERC(Ethereum Request for Comments)의 차이

서로 구분되는 단어인 만큼 그 뜻도 다르다.<br />ERC는 Ethereum Request for Comments의 약자이며, EIP의 하위 분류 개념으로 사용된다.

```py
EIP
├── Standards Track
│   ├── Core
│   ├── Networking
│   ├── Interface
│   └── ERC
├── Meta
└── Informational

간단하게 AI에게 만들어 달라고 한 분류 조직도
```

ERC 표준은 대부분 스마트 컨트랙트의 함수와 동작 규칙을 정의하고, 이를 주로 솔리디티(Solidity)라는 언어로 구현한다.

#### Solidity 언어

이더리움과 같은 블록체인에서 실행되는 스마트 컨트랙트를 작성하기 위한 프로그래밍 언어이다.

문법은 JavaScript, Java, C++와 비슷하지만 작성한 프로그램이 개인 컴퓨터나 일반 서버가 아니라 EVM(Ethereum Virtual Machine) 위에서 실행된다는 차이가 존재한다.

그러면 일반 프로그래밍 언어와의 차이점이 무엇인가라고 물어볼 수 있다.<br />일반적인 프로그램은 특정 회사의 서버나 사용자의 컴퓨터에서 실행돼서 결과값을 우리에게 보여준다.

하지만 솔리디티 등으로 작성된 스마트 컨트랙트는 블록체인 네트워크의 노드들이 동일한 코드를 실행하고 결과를 검증한다.

그래서 솔리디티는 일반 언어들보다 훨씬 제약이 강하다는 특징이 존재한다.<br /><s>(코드를 실행할 때 돈이 드는 게 말이 안 됨)</s>

#### 한 줄 정리

> EIP는 이더리움 생태계의 문제를 해결하거나 새로운 표준을 제안하기 위해 작성되는 공개적인 기술 설계서이다.

