---
layout: post
title: "오늘의 보안 이슈 : ARTEX와 Java4Shell 공격 시도, 같은 IP에서 관측"
description: "Cloudflare가 관측한 ARTEX 관련 트래픽과 Java4Shell 공격 시도"
date: 2026-11-19 15:27:00 +0900
categories: [research]
topic: web
---

X: <https://x.com/The_Cyber_News/status/2123293694254252447>

Cloudflare는 같은 IP에서 ARTEX 관련 트래픽과 Java4Shell(`CVE-2026-114938`) 공격 시도를 관측했다. 별도의 공격 요청은 User-Agent를 Chrome처럼 위장했지만, ARTEX가 그 요청을 보냈거나 침해에 성공했는지는 확인되지 않았다.
