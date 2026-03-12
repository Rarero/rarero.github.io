---
layout: post
title: "Azure Network (3): 부하분산장치와 보안 서비스"
date: 2026-03-11 11:00:00 +0900
tags: [Study, Azure, Network, Application Gateway, Load Balancer, Front Door, Traffic Manager, Firewall, WAF, DDoS, VPN Gateway, ExpressRoute, Network Watcher]
categories: Azure_Study
---

지난 포스트 [**Azure Network (2): 하이브리드 연결과 네트워크 서비스 심층 분석**]({% post_url Azure_Study/2026-02-11-azure-network(2) %})에서는 VPN Gateway, ExpressRoute, Azure Firewall, Private Link, Service Endpoint, Azure DNS 등을 살펴봤습니다.

이번 포스트에서는 Azure의 **부하분산장치 4종**과 **보안 서비스**, 그리고 **하이브리드 연결과 네트워크 진단 도구**까지 폭넓게 다뤄보겠습니다. 네트워크 계층의 낮은 곳(L4)에서 시작해 높은 곳(L7)으로, 리전에서 글로벌로, 그리고 트래픽 분산에서 보안과 모니터링으로 자연스럽게 확장해 나가겠습니다.

> **용어 분류 기준(이 글에서의 표기):**
> - **서비스(Service)**: Azure에서 리소스로 배포/과금/관리되는 것 (예: Azure Firewall, NAT Gateway)
> - **기능/옵션(Feature/Option)**: 특정 서비스의 설정 항목 (예: VNet Peering, Gateway Transit)
> - **패턴(Pattern)**: 여러 기능을 조합한 아키텍처 방식 (예: Hub-and-Spoke, Service Chaining)
> - **기술/메커니즘(Technology/Mechanism)**: 동작 원리나 프로토콜 (예: BGP, LPM, SR-IOV)

<br>

---

# 부하분산 서비스: 트래픽을 나눠 담는 기술

Azure는 트래픽을 분산하는 4가지 서비스를 제공합니다. 이들은 **동작 계층(L4/L7)**과 **분산 범위(리전/글로벌)**에 따라 구분됩니다.

| 계층 | 리전(Regional) | 글로벌(Global) |
|---|---|---|
| **L7 (HTTP)** | Application Gateway | Azure Front Door |
| **L4 (TCP/UDP 또는 DNS)** | Azure Load Balancer | Traffic Manager |

가장 기본적인 L4 로드밸런서부터 시작해서, 점점 더 높은 계층과 넓은 범위로 올라가 보겠습니다.

---

## 1. Azure Load Balancer — 트래픽의 교통 정리사

**분류:** 서비스 (L4 리전 부하분산)

### 이게 뭔가요?

**Azure Load Balancer**는 네트워크에서 가장 기본적인 부하분산장치입니다. **TCP/UDP 레벨(L4)**에서 동작하며, 패킷의 IP 주소와 포트 번호만 보고 트래픽을 여러 서버로 나눠줍니다.

비유하자면, 고속도로 톨게이트에서 **차량 번호(IP)와 목적지(포트)**만 보고 어느 차선으로 보낼지 결정하는 것과 같습니다. 차 안에 뭐가 실려있는지(HTTP 내용)는 전혀 관심 없이, 빠르고 단순하게 분배하는 데 집중합니다. 덕분에 매우 낮은 지연시간과 초당 수백만 플로우 처리가 가능합니다.

> 참고: [Microsoft Learn, "What is Azure Load Balancer?"](https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-overview)

### 어떤 시나리오에서 쓰나요?

- **웹 서버 앞단**: 여러 대의 VM에서 동일한 웹 서비스를 운영할 때 트래픽을 고르게 배분
- **내부 서비스 분산**: 프론트엔드 → 백엔드 API, 앱 서버 → DB 서버 등 VNet 내부 티어 간 통신 분산
- **고가용성 확보**: 한 VM이 죽어도 나머지 VM이 자동으로 트래픽을 받아 서비스 중단 없이 운영
- **SSH/RDP 포트 포워딩**: 인바운드 NAT 규칙으로 특정 포트를 특정 VM에 1:1 매핑

### Public vs Internal

```
Public Load Balancer              Internal Load Balancer
┌───────────────┐                 ┌───────────────┐
│  인터넷 트래픽  │                 │  VNet 내부 트래픽│
│       ↓       │                 │       ↓       │
│  [공용 IP]     │                 │ [사설 IP]      │
│       ↓       │                 │       ↓       │
│ ┌──┬──┬──┐   │                 │ ┌──┬──┬──┐   │
│ │VM│VM│VM│   │                 │ │VM│VM│VM│   │
│ └──┴──┴──┘   │                 │ └──┴──┴──┘   │
└───────────────┘                 └───────────────┘
인터넷 → 백엔드 분산               내부 티어 간 분산
(웹 서버, API 게이트웨이)          (App→DB, 내부 서비스 간)
```

| 유형 | Frontend IP | 용도 |
|---|---|---|
| **Public** | 공용 IP | 인터넷에서 들어오는 트래픽을 백엔드 VM 풀로 분산 |
| **Internal** | VNet 사설 IP | VNet 또는 피어링된 네트워크 내부 트래픽 분산 |

### 핵심 구성 요소

| 구성 요소 | 설명 |
|---|---|
| **Frontend IP** | 트래픽이 도착하는 IP (공용 또는 사설) |
| **Backend Pool** | 트래픽을 수신하는 VM/VMSS/IP 그룹 |
| **부하분산 규칙** | Frontend IP:Port ↔ Backend Pool:Port 매핑 (TCP/UDP) |
| **Health Probe** | TCP, HTTP, HTTPS 프로브로 백엔드 상태를 주기적으로 확인. 비정상 인스턴스는 자동으로 풀에서 제외 |
| **인바운드 NAT 규칙** | 특정 Frontend 포트를 특정 백엔드 VM으로 1:1 매핑 (예: SSH 포트 포워딩) |
| **아웃바운드 규칙** | 백엔드 VM의 아웃바운드 SNAT 구성 |

### 트래픽은 어떻게 나눠질까? — 분산 알고리즘

Load Balancer는 기본적으로 **5-튜플 해시**를 사용합니다. 소스IP, 소스Port, 목적지IP, 목적지Port, 프로토콜 — 이 5가지 조합으로 해시값을 만들어 어느 VM으로 보낼지 결정합니다.

쉽게 말하면, 같은 클라이언트에서 같은 연결이면 항상 같은 VM으로 가지만, 새 연결이 열릴 때마다 다른 VM으로 갈 수 있다는 뜻입니다.

| 분산 모드 | 해시 키 | 특성 |
|---|---|---|
| **기본 (5-튜플)** | Src IP + Src Port + Dst IP + Dst Port + Protocol | 동일 세션은 같은 VM으로. 새 연결마다 재분산 |
| **Source IP affinity (2-튜플)** | Src IP + Dst IP | 같은 클라이언트IP는 항상 같은 VM으로 |
| **Source IP + Protocol (3-튜플)** | Src IP + Dst IP + Protocol | 클라이언트IP+프로토콜 조합별 고정 |

> **팁**: 레거시 애플리케이션이 세션 상태를 서버 메모리에 저장하는 경우 Source IP affinity를 쓰면 세션이 유지됩니다. 하지만 가능하면 앱을 stateless하게 만들고 기본 5-튜플을 쓰는 것이 부하 분산 효과가 더 좋습니다.

### Standard vs Basic SKU

| 항목 | Standard | Basic |
|---|---|---|
| 백엔드 풀 규모 | 최대 1,000 인스턴스 | 최대 300 |
| Health Probe | TCP, HTTP, HTTPS | TCP, HTTP |
| 가용 영역 지원 | 지원 (영역 중복/고정) | 미지원 |
| SLA | 99.99% | SLA 없음 |
| 보안 | 기본 닫힘 (NSG로 명시 허용 필요) | 기본 열림 |
| 아웃바운드 규칙 | 지원 | 미지원 |
| 가격 | 유료 | **2025.9.30 퇴역** |

> **⚠️ 주의**: Basic SKU는 **2025년 9월 30일에 퇴역**됩니다. 모든 신규 배포는 Standard SKU를 사용해야 하며, 기존 Basic도 마이그레이션이 필요합니다. Standard SKU는 **기본적으로 모든 인바운드 트래픽이 차단**되어 있어서 NSG로 명시적으로 허용해야 합니다 — 보안은 좋지만 처음 배포할 때 "왜 통신이 안 되지?" 하고 당황할 수 있으니 꼭 기억하세요.

---

## 2. Application Gateway — URL을 읽는 똑똑한 로드밸런서

**분류:** 서비스 (L7 리전 부하분산)

### 이게 뭔가요?

Load Balancer가 "차량 번호만 보는 톨게이트"였다면, **Application Gateway(AGW)**는 "택배 상자의 라벨까지 읽는 물류 센터"입니다.

HTTP/HTTPS 요청을 직접 열어서 **URL 경로**, **호스트 헤더**, **쿠키** 같은 내용을 확인한 뒤, 요청의 성격에 따라 다른 서버 그룹에 보내줍니다. 예를 들어 `/api/*` 요청은 API 서버로, `/images/*` 요청은 정적 파일 서버로 보내는 식이죠.

> 참고: [Microsoft Learn, "What is Azure Application Gateway?"](https://learn.microsoft.com/en-us/azure/application-gateway/overview)

### 어떤 시나리오에서 쓰나요?

- **마이크로서비스 라우팅**: 하나의 도메인 뒤에 여러 서비스가 있을 때 URL 경로별로 분기 (`/users` → 사용자 서비스, `/orders` → 주문 서비스)
- **다중 도메인 호스팅**: `app-a.contoso.com`과 `app-b.contoso.com`을 하나의 AGW에서 처리 (Multi-site)
- **SSL 오프로드**: 백엔드 서버 대신 AGW에서 HTTPS 암복호화를 처리해 서버 부하 절감
- **웹 보안**: WAF를 통합하여 SQL Injection, XSS 같은 웹 공격을 자동 차단

### 트래픽 흐름

```
Application Gateway 트래픽 흐름

Client → [Frontend IP] → [Listener] → [Rule] → [Backend Pool]
              │               │            │            │
         공용/사설 IP    포트+프로토콜   경로/호스트    VM/VMSS/App Service
                           + SSL 인증서    기반 라우팅   + Health Probe
```

| 구성 요소 | 설명 |
|---|---|
| **Frontend IP** | 공용 IP, 사설 IP 또는 둘 다 설정 가능. 클라이언트가 접속하는 진입점 |
| **Listener** | 프로토콜(HTTP/HTTPS), 포트, 호스트명 조합으로 요청을 수신. Multi-site 리스너로 여러 도메인을 하나의 AGW에서 처리 |
| **Rule** | Listener와 Backend Pool을 연결. Basic(1:1) 또는 Path-based(URL 경로 분기) |
| **Backend Pool** | 실제 요청을 처리하는 대상 (VM, VMSS, App Service, IP 주소) |
| **Health Probe** | 백엔드 인스턴스 상태를 주기적으로 확인하여 비정상 인스턴스를 자동 제외 |
| **HTTP Settings** | 백엔드 연결에 사용할 프로토콜, 포트, 세션 어피니티, 타임아웃 설정 |

### 주요 기능 — Load Balancer와 뭐가 다를까?

Load Balancer는 "어디로 보낼까"만 결정하지만, Application Gateway는 요청 내용을 이해하고 더 많은 일을 합니다:

| 기능 | 설명 |
|---|---|
| **URL 경로 기반 라우팅** | `/api/*` → API 서버풀, `/images/*` → 정적 서버풀과 같이 경로별 분기 |
| **Multi-site 호스팅** | `app-a.contoso.com`, `app-b.contoso.com`을 하나의 AGW에서 처리 |
| **SSL/TLS 종료** | AGW에서 SSL을 복호화하여 백엔드 서버의 암복호화 부담 제거 |
| **End-to-End SSL** | 클라이언트→AGW와 AGW→백엔드 구간 모두 TLS 암호화 유지 |
| **세션 어피니티(Affinity)** | 쿠키 기반으로 동일 사용자를 같은 백엔드 인스턴스로 고정 |
| **자동 스케일링** | v2 SKU에서 트래픽에 따라 인스턴스를 자동 스케일 인/아웃 |
| **WAF 통합** | OWASP 규칙 기반 웹 보안 내장 (WAF 섹션에서 상세히 다룸) |
| **리디렉션** | HTTP→HTTPS 리디렉션, 외부 URL 리디렉션 |

### SKU 비교

| 항목 | Standard v2 | WAF v2 |
|---|---|---|
| 자동 스케일링 | 지원 | 지원 |
| 영역 중복(Zone Redundancy) | 지원 | 지원 |
| WAF | 미지원 | 지원 (OWASP CRS 3.x 규칙셋) |
| 정적 VIP | 지원 | 지원 |
| Private Link | 지원 | 지원 |

### ⚠️ 배포할 때 꼭 알아야 할 것들

**전용 서브넷이 필수입니다.** AGW는 자기만의 서브넷이 필요하며, 다른 리소스를 같이 넣을 수 없습니다. 최소 /24 이상을 권장합니다.

**NSG 포트 설정을 잊지 마세요.** AGW v2 서브넷에는 인바운드 **65200-65535 포트**(GatewayManager 서비스 태그)를 반드시 허용해야 합니다. 이 규칙이 없으면 AGW가 **비정상 상태(Unhealthy)**로 전환됩니다. 첫 배포에서 자주 놓치는 부분이니 체크리스트에 넣어두세요.

> 참고: [Microsoft Learn, "Application Gateway infrastructure configuration - NSG"](https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure-nsg)

---

## 3. Traffic Manager — DNS로 길을 알려주는 네비게이션

**분류:** 서비스 (DNS 기반 글로벌 트래픽 라우팅)

### 이게 뭔가요?

지금까지의 서비스가 리전 안에서 트래픽을 나누는 것이었다면, Traffic Manager는 **전 세계** 여러 리전에 걸친 서비스로 트래픽을 보내줍니다.

그런데 방식이 좀 독특합니다. 트래픽을 직접 중계하는 게 아니라, **DNS 응답만** 줍니다. 마치 네비게이션이 "이 길로 가세요"라고 안내만 하고, 실제 운전은 직접 하는 것과 같습니다.

```
Traffic Manager 동작 (DNS 기반)

1) 클라이언트 → DNS 쿼리: "myapp.trafficmanager.net"
2) Traffic Manager → DNS 응답: "한국 리전이 제일 가까우니까 여기로 가세요" (IP: x.x.x.x)
3) 클라이언트 → x.x.x.x 로 직접 연결 (Traffic Manager는 더 이상 관여하지 않음)
```

```
   ┌──────────────┐     DNS Query      ┌─────────────────┐
   │   Client     │ ──────────────────→ │ Traffic Manager │
   │              │ ←────────────────── │   (DNS 응답)     │
   │              │     IP: x.x.x.x    └─────────────────┘
   │              │                           │
   │              │ ── 직접 연결 ──→ [Endpoint A: Korea Central]
   └──────────────┘                   [Endpoint B: East US]
                                      [Endpoint C: West Europe]
```

> 참고: [Microsoft Learn, "What is Traffic Manager?"](https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-overview)

### 어떤 시나리오에서 쓰나요?

- **글로벌 서비스의 지역별 라우팅**: 한국 사용자는 Korea Central로, 미국 사용자는 East US로
- **재해 복구(DR)**: Primary 리전이 다운되면 자동으로 Secondary 리전으로 DNS 전환
- **블루-그린 배포**: 새 버전에 트래픽의 10%만 보내다가 점진적으로 늘리기
- **비-HTTP 프로토콜의 글로벌 분산**: 게임 서버, IoT, 커스텀 TCP 등 HTTP가 아닌 트래픽도 글로벌하게 분산 가능

### 라우팅 방법 — "어떤 기준으로 길을 안내할까?"

| 라우팅 방법 | 설명 | 적용 시나리오 |
|---|---|---|
| **Priority** | 우선순위 기반. Primary 실패 시 Secondary로 전환 | Active-Passive DR |
| **Weighted** | 가중치 비율로 분산 (예: 70:30) | 블루-그린 배포, 점진적 마이그레이션 |
| **Performance** | 클라이언트에서 가장 가까운(지연시간 낮은) 엔드포인트 반환 | 글로벌 서비스 최적 응답 |
| **Geographic** | 클라이언트 지리적 위치에 따라 특정 엔드포인트 지정 | 데이터 주권, 지역별 콘텐츠 |
| **MultiValue** | 정상 엔드포인트 IP 여러 개를 한번에 반환 | 클라이언트가 직접 failover 처리 |
| **Subnet** | 클라이언트 IP 서브넷 범위별 엔드포인트 매핑 | 특정 네트워크 대역별 분기 |

### ⚠️ 알아두면 좋은 특성과 주의점

- **트래픽 자체를 프록시하지 않습니다.** DNS 해석만 수행하므로 데이터 경로에 병목이 생기지 않지만, DNS TTL에 따른 전환 지연(수십 초~수 분)이 있을 수 있습니다.
- **HTTP가 아닌 프로토콜도 지원합니다.** DNS 레벨에서 동작하므로 TCP, UDP 등 어떤 프로토콜이든 상관없습니다. 이게 Front Door와의 가장 큰 차별점입니다.
- **비용이 저렴합니다.** DNS 쿼리 수 기반 과금이므로 트래픽 기반 과금인 다른 글로벌 서비스보다 훨씬 저렴합니다.

> 참고: [Microsoft Learn, "Traffic Manager FAQ"](https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-faqs)

---

## 4. Azure Front Door — 전 세계에 배치된 스마트 경비원

**분류:** 서비스 (L7 글로벌 부하분산 + CDN + WAF)

### 이게 뭔가요?

**Azure Front Door(AFD)**는 Microsoft의 **글로벌 에지 네트워크(180개 이상의 PoP)** 위에서 동작하는, Azure에서 가장 기능이 풍부한 부하분산 서비스입니다. L7 로드밸런서, CDN, WAF를 하나로 통합했습니다.

Traffic Manager가 "네비게이션"이었다면, Front Door는 **"전 세계 공항에 배치된 안내 데스크"**에 비유할 수 있습니다. 사용자가 가장 가까운 공항(PoP)에 도착하면, 안내 데스크가 짐(요청)을 직접 받아서 최적의 목적지(Origin)까지 Microsoft 전용 고속도로(백본)로 배달해줍니다.

> 참고: [Microsoft Learn, "What is Azure Front Door?"](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview)

### 어떤 시나리오에서 쓰나요?

- **글로벌 웹 서비스 가속**: 전 세계 사용자에게 빠른 응답 제공 (Split TCP + 에지 캐싱)
- **글로벌 웹 보안**: 에지에서 DDoS, WAF, Bot 보호를 한번에 처리
- **CDN**: 정적 콘텐츠(이미지, JS, CSS)를 에지에 캐싱하여 원본 서버 부하 감소
- **멀티 리전 고가용성**: 한 리전이 다운되면 에지에서 즉시(실시간) 다른 리전으로 전환

### 동작 원리

```
글로벌 사용자 요청 흐름

[한국 사용자] ──→ [서울 PoP] ──┐
                                ├──→ [최적 백엔드 선택] ──→ Backend (Korea Central)
[미국 사용자] ──→ [시카고 PoP] ─┤                     ──→ Backend (East US)
                                │
[유럽 사용자] ──→ [암스테르담 PoP]┘                    ──→ Backend (West Europe)

              Anycast 기반          Split TCP + 캐싱        Origin
              글로벌 수신            Microsoft 백본 경유       실제 서버
```

| 단계 | 설명 |
|---|---|
| **1. Anycast 수신** | 사용자는 DNS를 통해 가장 가까운 PoP로 연결 |
| **2. Split TCP** | PoP에서 TCP 핸드셰이크를 종료하여 클라이언트 지연 최소화. PoP↔Origin은 Microsoft 백본의 사전 워밍된 연결 사용 |
| **3. L7 라우팅** | URL 경로, 헤더, 쿠키 등 기반으로 최적 Origin 선택 |
| **4. 캐싱** | 정적 콘텐츠를 에지에 캐싱하여 Origin 부하 감소 |

> **Split TCP가 왜 빠를까?** 일반적인 HTTPS 통신은 TCP 3-way handshake + TLS handshake까지 여러 번의 왕복(RTT)이 필요합니다. 한국에서 미국 서버까지의 RTT가 150ms라면, 연결 수립에만 수백 ms가 걸립니다. Front Door는 사용자 근처의 PoP에서 이 핸드셰이크를 끝내고, PoP→Origin은 이미 연결이 열려있는 Microsoft 백본을 사용하기 때문에 체감 속도가 훨씬 빨라집니다.

### 주요 기능

| 기능 | 설명 |
|---|---|
| **글로벌 부하분산** | 지연시간(Latency) 기반, 가중치(Weighted), 우선순위(Priority), 세션 어피니티 라우팅 |
| **CDN 통합** | 에지 캐싱으로 정적 콘텐츠 가속 |
| **WAF 통합** | DRS(Default Rule Set) + 커스텀 규칙, Bot 보호 |
| **SSL 오프로드** | 에지에서 TLS 종료, 관리형 인증서 자동 발급/갱신 |
| **URL 리디렉트/리라이트** | HTTP→HTTPS, 경로 리라이트 |
| **Private Link Origin** | 백엔드를 Private Endpoint로 연결하여 Origin을 인터넷에 노출하지 않음 |

### SKU 비교

| 항목 | Standard | Premium |
|---|---|---|
| 정적 콘텐츠 가속 (CDN) | 지원 | 지원 |
| 동적 사이트 가속 | 지원 | 지원 |
| WAF | 커스텀 규칙만 | 관리형 규칙 + Bot 보호 |
| Private Link Origin | 미지원 | **지원** |
| 보안 보고서 | 미지원 | 지원 |

### Front Door vs Application Gateway — 둘 다 L7인데 뭐가 다를까?

이 두 서비스는 모두 L7에서 동작하기 때문에 자주 비교됩니다. 핵심 차이는 **범위**입니다:

| 비교 항목 | Application Gateway | Azure Front Door |
|---|---|---|
| 범위 | 리전 (단일 데이터센터) | 글로벌 (180+ PoP 에지) |
| 배포 위치 | VNet 서브넷 내 | Microsoft 에지 네트워크 |
| CDN 기능 | 미지원 | 지원 |
| 백엔드 유형 | VM, VMSS, App Service (같은 리전 위주) | 모든 인터넷 연결 가능 엔드포인트 (글로벌) |

> **둘을 함께 쓸 수도 있습니다.** 글로벌 사용자를 Front Door로 받고, 각 리전 내에서는 Application Gateway로 세밀한 경로 라우팅 + WAF를 적용하는 조합이 대규모 서비스에서 흔히 쓰입니다.

### Traffic Manager vs Front Door — 글로벌 서비스가 둘 다 있는데?

| 비교 항목 | Traffic Manager | Azure Front Door |
|---|---|---|
| 동작 계층 | DNS (L4) | HTTP (L7) |
| 데이터 경로 | **경유하지 않음** (DNS 응답만) | **경유함** (에지에서 프록시) |
| 프로토콜 | 모든 프로토콜 (TCP/UDP/HTTP 등) | HTTP/HTTPS만 |
| 캐싱/CDN | 미지원 | 지원 |
| WAF | 미지원 | 지원 |
| Failover 속도 | DNS TTL 의존 (수십초~수분) | 즉시 (에지에서 실시간 감지) |
| 비용 | 저렴 (DNS 쿼리 기반) | 상대적으로 높음 (트래픽 처리 기반) |

> **정리하면**: HTTP 워크로드의 글로벌 분산에는 Front Door, 비-HTTP 프로토콜(게임 서버, IoT, 커스텀 TCP 등)의 글로벌 분산에는 Traffic Manager를 선택하세요.

---

## 부하분산 서비스 선택 가이드

여기까지 4가지 부하분산 서비스를 살펴봤습니다. 실제로 어떤 걸 써야 할지 한번에 정리해봅시다:

```
트래픽이 HTTP/HTTPS인가?
├── Yes → 글로벌 분산이 필요한가?
│          ├── Yes → Azure Front Door
│          └── No  → Application Gateway
└── No  → 글로벌 분산이 필요한가?
           ├── Yes → Traffic Manager
           └── No  → Azure Load Balancer
```

| 서비스 | 계층 | 범위 | 한 줄 요약 |
|---|---|---|---|
| Load Balancer | L4 | 리전 | TCP/UDP 고속 분산의 기본기 |
| Application Gateway | L7 | 리전 | URL을 읽고 판단하는 웹 전용 분산 |
| Traffic Manager | DNS | 글로벌 | DNS 응답으로 길만 알려주는 가벼운 글로벌 분산 |
| Azure Front Door | L7 | 글로벌 | 에지에서 모든 걸 해주는 올인원 글로벌 서비스 |

<br>

---

# 보안 서비스: 네트워크를 지키는 방패들

부하분산이 "트래픽을 나눠 담는 기술"이었다면, 이제는 "나쁜 트래픽을 걸러내는 기술"입니다. 가장 넓은 범위(네트워크 전체)의 보안부터 시작해서, 점점 특화된 영역으로 좁혀 가겠습니다.

---

## 5. Azure Firewall — 네트워크의 중앙 검문소

**분류:** 서비스 (클라우드 네이티브 L3-L7 방화벽)

### 이게 뭔가요?

**Azure Firewall**은 VNet에 배포되는 **완전 관리형 상태 저장(Stateful) 방화벽**입니다.

이전 포스트에서 다뤘던 NSG가 "각 건물 입구의 출입 카드 리더기"였다면, Azure Firewall은 **"아파트 단지 정문의 경비실"**입니다. 모든 트래픽이 이 경비실을 반드시 거쳐야 하고, 인바운드·아웃바운드·VNet 간(East-West) 트래픽까지 중앙에서 한 곳에서 규칙을 관리합니다.

> 참고: [Microsoft Learn, "What is Azure Firewall?"](https://learn.microsoft.com/en-us/azure/firewall/overview)

### 어떤 시나리오에서 쓰나요?

- **Hub-Spoke 아키텍처의 중앙 보안**: 모든 Spoke VNet의 트래픽을 Hub의 Firewall로 모아서 통제
- **아웃바운드 트래픽 제어**: "VM들이 인터넷의 어디에 접속할 수 있는지"를 FQDN/URL 기반으로 제한 (예: `*.microsoft.com`만 허용)
- **인바운드 NAT**: 인터넷에서 내부 서비스로의 접근을 DNAT 규칙으로 제어
- **규정 준수**: 모든 트래픽 로그를 중앙에서 기록하여 감사 요구사항 충족

### Hub-Spoke에서의 배치

```
Hub-Spoke 환경에서의 Azure Firewall 배치

                ┌─ Spoke A (Web) ─┐
                │                  │
Internet ──→ [Azure Firewall] ←──→├─ Spoke B (App) ─┤  ← UDR: 0.0.0.0/0 → Firewall IP
                │   (Hub VNet)     │
                │                  │
                └─ Spoke C (DB) ──┘

• 모든 Spoke 서브넷에 UDR을 설정하여 트래픽을 Firewall로 강제 경유
• Firewall이 허용/차단을 판단한 후에만 트래픽이 전달됨
```

### 핵심 특성

| 항목 | 설명 |
|---|---|
| 배포 위치 | **AzureFirewallSubnet** (/26 이상 필수) |
| 고가용성 | 내장 HA (다중 인스턴스, 자동 스케일링) |
| 가용 영역 | 최대 3개 AZ에 걸쳐 배포 가능 |
| 관리 | Azure Firewall Policy 또는 Azure Firewall Manager로 중앙 관리 |

### SKU별 기능 — "얼마나 깊이 검사할 수 있을까?"

Firewall의 SKU는 곧 "검사의 깊이"를 결정합니다. Basic은 출입증만 확인하고, Standard는 짐도 검사하고, Premium은 포장까지 뜯어서(TLS 복호화) 내용물을 확인합니다.

| 기능 | Basic | Standard | Premium |
|---|---|---|---|
| L3-L4 네트워크 규칙 | 지원 | 지원 | 지원 |
| FQDN 기반 필터링 | 지원 | 지원 | 지원 |
| 위협 인텔리전스 | 알림만 | 알림 + 차단 | 알림 + 차단 |
| **TLS 검사(복호화)** | 미지원 | 미지원 | **지원** |
| **IDPS** (침입 탐지/방지) | 미지원 | 미지원 | **지원** |
| **URL 필터링** | 미지원 | 지원 | 지원 |
| 웹 카테고리 필터링 | 미지원 | 지원 | 지원 (전체 URL 검사) |
| 처리량 | 250 Mbps | 30 Gbps | 100 Gbps |

> **TLS 검사란?** 요즘 대부분의 트래픽은 HTTPS로 암호화되어 있어서, 방화벽이 겉만 봐서는 내용을 알 수 없습니다. TLS 검사는 방화벽이 **암호화를 풀고(복호화) → 내용을 검사하고 → 다시 암호화**하는 기능입니다. Premium SKU에서만 가능하며, 이를 위해 중간 CA 인증서 설정이 필요합니다.
>
> 참고: [Microsoft Learn, "Azure Firewall Premium features"](https://learn.microsoft.com/en-us/azure/firewall/premium-features)

### 규칙 처리 순서 — "어떤 순서로 검사할까?"

```
Azure Firewall 규칙 처리 순서

1. DNAT 규칙 (인바운드 NAT)
        ↓ 매칭 안 되면
2. Network 규칙 (L3/L4: IP, Port, Protocol)
        ↓ 매칭 안 되면
3. Application 규칙 (L7: FQDN, URL, 웹 카테고리)
        ↓ 매칭 안 되면
4. 기본 동작: 차단 (Deny by default)
```

> **⚠️ 실수하기 쉬운 포인트**: DNAT 규칙이 가장 먼저 평가됩니다. DNAT로 허용된 트래픽은 Network 규칙에서 **암묵적으로 허용**됩니다(별도 Network 규칙 불필요). "왜 DNAT 트래픽에 대한 Network 규칙이 안 먹히지?" 하는 경우가 종종 있는데, 이 동작 때문입니다.

---

## 6. Azure WAF — 웹 애플리케이션 전용 보안관

**분류:** 기능 (L7 웹 보안 — AGW 또는 AFD에 연결)

### 이게 뭔가요?

Azure Firewall이 "정문 경비실"이라면, **WAF(Web Application Firewall)**는 **"웹 서버 앞에 서 있는 전문 보안 요원"**입니다.

WAF는 독립 서비스가 아닙니다. **Application Gateway** 또는 **Azure Front Door**에 붙여서 사용하는 기능이며, SQL Injection, XSS(Cross-Site Scripting) 같은 **OWASP Top 10 웹 공격**을 자동으로 탐지하고 차단합니다.

> 참고: [Microsoft Learn, "What is Azure Web Application Firewall?"](https://learn.microsoft.com/en-us/azure/web-application-firewall/overview)

### 어떤 시나리오에서 쓰나요?

- **웹 애플리케이션 보호**: SQL Injection, XSS, CSRF 등 웹 취약점 공격 방어
- **Bot 차단**: 악성 크롤러, 스크래퍼, 자동화된 공격 Bot 필터링
- **규정 준수**: PCI DSS 등 보안 규정에서 요구하는 WAF 배포 조건 충족
- **글로벌 에지 보안**: Front Door WAF로 공격 트래픽이 Origin에 도달하기 전에 에지에서 차단

### 어디에 붙이느냐에 따라 달라지는 보호 범위

| 항목 | WAF on Application Gateway | WAF on Front Door |
|---|---|---|
| 보호 범위 | 리전 단위 (AGW 뒤 백엔드) | 글로벌 에지 (전 세계 PoP에서 차단) |
| 공격 차단 시점 | 트래픽이 리전에 도달한 후 | 트래픽이 **Origin에 도달하기 전** 에지에서 차단 |
| 관리형 규칙셋 | OWASP CRS 3.x | DRS (Default Rule Set) + Bot Manager |
| Bot 보호 | 제한적 | 지원 (Bot Manager 규칙셋) |
| 적합 시나리오 | 리전 내 단일 웹앱 보호 | 글로벌 웹앱, DDoS+WAF 통합 보호 |

> **어디에 배치하느냐가 중요합니다.** Front Door WAF는 공격을 에지에서 차단하므로 악성 트래픽이 아예 여러분의 리전까지 오지 못합니다. 하지만 리전 내부에서만 접근 가능한 웹앱이라면 AGW WAF가 더 적합합니다.

### WAF 운영 모드 — "처음부터 차단하지 마세요"

| 모드 | 동작 | 용도 |
|---|---|---|
| **Detection** | 위반 로그만 기록, 트래픽은 통과 | 초기 도입 시 오탐(False Positive) 확인 |
| **Prevention** | 위반 트래픽 실제 차단 (403 응답) | 운영 환경 적용 |

WAF를 처음 도입할 때는 반드시 **Detection 모드**로 시작하세요. 정상적인 사용자 요청이 잘못 차단(False Positive)되는 경우가 생각보다 많습니다.

예를 들어, 게시판에 코드 조각을 입력하면 (`SELECT * FROM users WHERE...`), WAF가 이걸 SQL Injection 공격으로 오인해서 차단할 수 있습니다. Detection 모드에서 며칠간 로그를 확인하고, 오탐이 발생하는 규칙에 대해 **Exclusion(제외)** 설정을 마친 다음 Prevention 모드로 전환하는 것이 Microsoft 공식 권장사항입니다.

> 참고: [Microsoft Learn, "Web Application Firewall best practices"](https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-best-practices)

---

## 7. Azure DDoS Protection — 대규모 공격에 대한 방패

**분류:** 서비스 (L3/L4 DDoS 완화)

### 이게 뭔가요?

DDoS(Distributed Denial of Service) 공격은 수많은 좀비 PC가 동시에 트래픽을 보내 서비스를 마비시키는 공격입니다. 비유하자면, 식당에 진짜 손님(정상 트래픽) 대신 수천 명이 동시에 전화를 걸어 예약 전화를 먹통으로 만드는 것과 같습니다.

Azure는 기본적으로 모든 리소스에 **DDoS Infrastructure Protection(무료)**을 제공합니다. 하지만 이건 Azure 플랫폼 전체를 보호하는 일괄적인 방어막이라 개별 서비스에 맞춤화되어 있지 않습니다. **DDoS Network Protection**은 여러분의 서비스 트래픽 패턴을 ML로 학습해서 훨씬 정교하게 방어합니다.

> 참고: [Microsoft Learn, "Azure DDoS Protection overview"](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview)

### 어떤 시나리오에서 쓰나요?

- **공용 IP가 있는 비즈니스 크리티컬 서비스 보호**: Public LB, AGW, VM의 공용 IP 등
- **공격 가시성 확보**: 공격이 어디서, 언제, 얼마나 큰 규모로 왔는지 텔레메트리로 확인
- **비용 보호**: DDoS로 인해 자동 스케일아웃된 비용을 Azure 크레딧으로 보상
- **긴급 대응**: Microsoft DDoS Rapid Response 팀의 전문 지원

### Infrastructure vs Network Protection

| 항목 | DDoS Infrastructure Protection | DDoS Network Protection |
|---|---|---|
| 비용 | **무료** (모든 Azure 리소스에 자동 적용) | **유료** (월 약 $2,944 + 초과 트래픽) |
| 보호 대상 | Azure 플랫폼 전체 | 특정 VNet에 연결된 공용 IP 리소스 |
| 트래픽 프로파일링 | 플랫폼 수준의 일괄 임계값 | 고객 트래픽 패턴을 **학습(ML 기반)**하여 적응형 임계값 |
| 공격 텔레메트리 | 미지원 | 지원 (Azure Monitor 메트릭, 진단 로그) |
| 공격 알림 | 미지원 | 지원 (실시간 알림) |
| 공격 후 보고서 | 미지원 | 지원 (상세 완화 보고서) |
| DDoS Rapid Response | 미지원 | 지원 (Microsoft DDoS 전문팀 지원) |
| 비용 보호 | 미지원 | 지원 (DDoS로 인한 스케일 아웃 비용 크레딧) |
| WAF 할인 | 미지원 | 지원 (AGW WAF v2 비용 포함) |

> **비용 보호(Cost Protection)가 왜 중요할까?** DDoS 공격이 왔을 때, 서비스가 다운되는 것도 문제지만 자동 스케일링이 켜져 있으면 공격 트래픽 처리를 위해 VM과 대역폭이 급증하고 **엄청난 요금 폭탄**이 날아올 수 있습니다. Network Protection은 이런 비용을 Azure 크레딧으로 보상해줍니다.
>
> 참고: [Microsoft Learn, "Azure DDoS Protection - Cost guarantee"](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview#cost-guarantee)

### ⚠️ 주의사항

- DDoS Protection은 **공용 IP 리소스에 대해서만 동작**합니다. Private Endpoint, Internal LB 등 사설 IP만 사용하는 리소스에는 적용되지 않습니다.
- 보호 대상: Public Load Balancer, Application Gateway, VM의 Public IP, VPN Gateway, Azure Bastion 등
- 월 $2,944는 적지 않은 비용입니다. 소규모 서비스라면 무료 Infrastructure Protection으로 충분할 수 있고, 비즈니스 크리티컬한 서비스에 선별적으로 적용하는 것이 일반적입니다.

<br>

---

# 하이브리드 연결: 온프레미스와 Azure를 잇는 다리

지금까지 Azure 안에서의 트래픽 분산과 보안을 다뤘습니다. 이제는 **온프레미스(회사 데이터센터)와 Azure를 연결하는 방법**을 살펴봅니다. 비용과 성능 요구사항에 따라 VPN Gateway와 ExpressRoute 중에서 선택합니다.

---

## 8. VPN Gateway — 인터넷 위의 암호화 터널

**분류:** 서비스 (암호화된 하이브리드 연결)

### 이게 뭔가요?

**VPN Gateway**는 온프레미스와 Azure VNet 사이에 **암호화된 터널**을 만들어주는 서비스입니다.

공용 인터넷을 통해 연결하지만, IPsec/IKE 프로토콜로 모든 데이터가 암호화됩니다. 비유하자면, 일반 도로(인터넷)에 **투명 방음 터널**을 설치해서 밖에서는 안이 보이지 않게 안전하게 오가는 것과 같습니다.

> 참고: [Microsoft Learn, "What is Azure VPN Gateway?"](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)

### 연결 유형 — S2S vs P2S

VPN Gateway에는 두 가지 주요 시나리오가 있습니다:

```
┌──────────────────────────────────────────────────────┐
│  S2S (Site-to-Site)                                  │
│  온프레미스 VPN 장비 ←──IPsec/IKE 터널──→ Azure VPN GW│
│  • 회사 네트워크 전체를 Azure에 연결                    │
│  • 항상 연결 (Always-on)                              │
│  • 온프레미스에 VPN 장비(공인 IP 필요)                  │
├──────────────────────────────────────────────────────┤
│  P2S (Point-to-Site)                                 │
│  개별 PC/노트북 ←──VPN 클라이언트──→ Azure VPN GW     │
│  • 재택근무자, 출장자가 개인 PC로 Azure에 접속          │
│  • 필요할 때만 연결                                    │
│  • VPN 장비 불필요 (소프트웨어 클라이언트만)             │
└──────────────────────────────────────────────────────┘
```

> **쉽게 기억하기**: **S2S = 사이트(건물) 대 사이트(건물)** — 회사 네트워크 전체를 연결. **P2S = 포인트(개인) 대 사이트(건물)** — 개인 PC가 접속.

### S2S (Site-to-Site) 상세

| 항목 | 설명 |
|---|---|
| 용도 | 온프레미스 데이터센터 ↔ Azure VNet **상시 연결** |
| 프로토콜 | IPsec/IKEv2 (암호화 터널) |
| 온프레미스 요구사항 | **VPN 장비** 필요 (온프레미스 측 공인 IP, IKEv2 지원) |
| 대역폭 | SKU에 따라 100Mbps ~ 10Gbps |
| BGP 지원 | 지원 (Active-Active 구성 시 권장) |
| 다중 사이트 | 하나의 VPN Gateway에 여러 온프레미스 사이트 연결 가능 |

### P2S (Point-to-Site) 상세

| 항목 | 설명 |
|---|---|
| 용도 | **개별 사용자** (재택근무, 출장)가 노트북/PC에서 Azure VNet으로 접속 |
| 프로토콜 | OpenVPN, IKEv2, SSTP (Windows 전용) |
| 인증 방법 | Azure AD(Entra ID) 인증, 인증서 기반, RADIUS |
| 클라이언트 | Azure VPN Client, OpenVPN Client, 네이티브 OS VPN |
| 동시 연결 수 | SKU에 따라 250 ~ 10,000 |

### VPN Gateway SKU

| SKU | S2S 터널 | P2S 연결 | 집계 처리량 | BGP | 영역 중복 |
|---|---|---|---|---|---|
| VpnGw1 | 30 | 250 | 650 Mbps | 지원 | 미지원 |
| VpnGw2 | 30 | 500 | 1 Gbps | 지원 | 미지원 |
| VpnGw3 | 30 | 1,000 | 1.25 Gbps | 지원 | 미지원 |
| VpnGw4 | 100 | 5,000 | 5 Gbps | 지원 | 미지원 |
| VpnGw5 | 100 | 10,000 | 10 Gbps | 지원 | 미지원 |
| VpnGw1**AZ** ~ 5**AZ** | 동일 | 동일 | 동일 | 지원 | **지원** |

### ⚠️ 배포할 때 꼭 알아야 할 것들

- **GatewaySubnet** 전용 서브넷 필수 (/27 이상 권장). 이 서브넷에는 다른 리소스를 배포할 수 없습니다.
- VPN Gateway는 **배포에 30~45분**이 걸립니다. 급하게 필요한 상황이면 미리 준비해두세요.
- S2S 연결 시 온프레미스 VPN 장비의 **공인 IP가 필요**합니다. NAT 뒤에 있으면 추가 설정이 필요할 수 있습니다.

---

## 9. ExpressRoute — 공용 인터넷을 거치지 않는 전용 고속도로

**분류:** 서비스 (전용 프라이빗 연결)

### 이게 뭔가요?

VPN Gateway가 "일반 도로에 암호화 터널을 설치한 것"이라면, **ExpressRoute**는 **"아예 전용 고속도로를 까는 것"**입니다.

통신사(Connectivity Provider)가 제공하는 전용 프라이빗 회선으로 온프레미스와 Azure를 직접 연결합니다. 공용 인터넷을 거치지 않기 때문에 **대역폭이 크고, 지연이 낮으며, 품질이 일정**합니다.

> 참고: [Microsoft Learn, "What is Azure ExpressRoute?"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction)

### 어떤 시나리오에서 쓰나요?

- **대기업의 대용량 데이터 전송**: 수 Gbps~수십 Gbps 규모의 데이터가 오가는 환경
- **금융/의료 등 저지연 필수 환경**: 일관된 낮은 지연시간이 보장되어야 하는 트랜잭션 처리
- **규정 준수**: 데이터가 공용 인터넷을 절대 거치면 안 되는 보안 요구사항
- **Microsoft 365/PaaS 접근**: Microsoft Peering으로 M365, Azure PaaS에도 전용 경로로 접근

### VPN Gateway vs ExpressRoute — 핵심 비교

| 비교 항목 | VPN Gateway (S2S) | ExpressRoute |
|---|---|---|
| 연결 경로 | **공용 인터넷** (암호화 터널) | **전용 프라이빗 회선** (인터넷 비경유) |
| 프로토콜 | IPsec/IKEv2 | BGP 기반 L3 라우팅 |
| 대역폭 | 최대 10 Gbps | 최대 **100 Gbps** |
| 지연시간 | 인터넷 경로 의존 (가변적) | 전용 경로 (낮고 **일관적**) |
| SLA | 99.95% (Active-Active) | **99.95%** (Standard), **99.99%** (ExpressRoute Direct) |
| 비용 | 저렴 | 상대적으로 고가 (회선 + Gateway + 포트 비용) |
| 적합 환경 | 중소규모, 비용 민감 | 대기업, 대용량, 저지연 필수 |

> **VPN이 더 나은 경우도 있습니다.** ExpressRoute 회선 비용은 월 수백만 원 이상입니다. 대역폭이 크지 않고 약간의 지연 변동이 허용되는 환경이라면 VPN Gateway가 훨씬 합리적입니다.

### ExpressRoute 피어링

| 피어링 유형 | 접근 대상 |
|---|---|
| **Azure Private Peering** | VNet 내 리소스 (VM, ILB, 프라이빗 엔드포인트 등) |
| **Microsoft Peering** | Microsoft 365, Azure PaaS 공용 엔드포인트 (Storage, SQL 등) |

> **참고**: Azure Public Peering은 **퇴역(Deprecated)**되었으며 Microsoft Peering으로 통합되었습니다.

### 회복 탄력성 — 하나가 끊겨도 괜찮도록

미션 크리티컬 환경에서는 단일 회선에 의존하면 안 됩니다:

```
권장 구성: 각 피어링 위치에 이중 회선

[온프레미스 DC] ── 회선 A ──→ [피어링 위치 1] ──→ [Azure (Primary)]
                ── 회선 B ──→ [피어링 위치 2] ──→ [Azure (Secondary)]

• 각 회선은 Active-Active BGP 세션
• 하나의 회선 또는 피어링 위치 장애 시 자동 Failover
```

Microsoft 공식 문서에서는 미션 크리티컬 워크로드에서 ExpressRoute를 **기본 경로**로, VPN Gateway S2S를 **백업 경로(Failover)**로 구성하는 방식을 권장합니다. 이렇게 하면 ExpressRoute 회선이 모두 다운되는 극단적인 상황에서도 VPN으로 우회할 수 있습니다.

> 참고: [Microsoft Learn, "Using S2S VPN as a backup for ExpressRoute private peering"](https://learn.microsoft.com/en-us/azure/expressroute/use-s2s-vpn-as-backup-for-expressroute-privatepeering)

<br>

---

# 네트워크 진단: 문제가 생겼을 때 쓰는 도구

지금까지 트래픽 분산, 보안, 하이브리드 연결을 다뤘습니다. 마지막으로 이 모든 것이 잘 동작하는지 확인하고, 문제가 생겼을 때 원인을 찾는 도구를 알아봅니다.

---

## 10. Azure Network Watcher — 네트워크 문제 해결의 만능 도구함

**분류:** 서비스 (네트워크 모니터링 및 진단)

### 이게 뭔가요?

**Azure Network Watcher**는 네트워크 리소스의 **모니터링, 진단, 로깅**을 위한 통합 도구 모음입니다.

"트래픽이 왜 차단되지?", "패킷이 어디서 드롭되지?", "어떤 NSG 규칙이 적용되지?" — 이런 질문에 답해주는 Azure 네트워크의 **청진기**입니다.

> 참고: [Microsoft Learn, "What is Azure Network Watcher?"](https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-overview)

### 어떤 시나리오에서 쓰나요?

- **VM 간 통신 장애 진단**: "VM A에서 VM B의 443 포트로 왜 연결이 안 되지?"
- **경로 확인**: "이 트래픽이 Azure Firewall을 제대로 경유하고 있는지 확인하고 싶다"
- **보안 감사**: "지난 1시간 동안 이 서브넷에 어떤 트래픽이 있었는지 로그를 보고 싶다"
- **VPN 터널 진단**: "S2S VPN 터널이 자꾸 끊어지는 원인을 찾고 싶다"
- **트래픽 패턴 시각화**: "전체 네트워크 트래픽 흐름을 대시보드로 한눈에 보고 싶다"

### 주요 도구

| 도구 | 기능 | 대표 시나리오 |
|---|---|---|
| **IP 흐름 확인 (IP Flow Verify)** | 특정 5-튜플에 대해 NSG 허용/차단 여부 확인 | "이 VM에서 저 VM의 443 포트로 통신이 왜 안 되지?" |
| **다음 홉 (Next Hop)** | VM에서 특정 목적지로 가는 다음 홉 유형 확인 | "이 트래픽이 Firewall을 경유하고 있는지 확인하고 싶다" |
| **NSG 진단 (NSG Diagnostics)** | 트래픽에 적용되는 NSG 규칙 상세 분석 | "어떤 NSG 규칙이 이 트래픽을 차단하는 거지?" |
| **연결 문제 해결 (Connection Troubleshoot)** | 소스→목적지 간 연결 경로 추적 및 지연 측정 | "VM에서 SQL DB까지 연결이 안 된다. 어디서 끊기지?" |
| **패킷 캡처 (Packet Capture)** | VM NIC에서 패킷을 캡처하여 pcap 파일로 저장 | "이상 트래픽의 실제 패킷 내용을 분석하고 싶다" |
| **NSG 흐름 로그 (NSG Flow Logs)** | NSG를 통과하는 모든 트래픽의 흐름 로그 기록 | "지난 1시간 동안 이 서브넷에 어떤 트래픽이 있었나?" |
| **VPN 진단** | VPN Gateway 연결 상태 및 터널 진단 | "S2S VPN 터널이 자꾸 끊어진다" |
| **연결 모니터 (Connection Monitor)** | 엔드포인트 간 연결 상태를 **지속적으로** 모니터링 | "온프레미스 ↔ Azure 간 지연/패킷 손실 추이를 보고 싶다" |
| **트래픽 분석 (Traffic Analytics)** | NSG 흐름 로그를 분석하여 시각화 대시보드 제공 | "전체 네트워크 트래픽 패턴을 한눈에 보고 싶다" |

### 실무 트러블슈팅 흐름 — "VM 간 통신이 안 될 때"

실제로 가장 흔한 문제인 "VM A → VM B 통신 안 됨"을 Network Watcher로 해결하는 순서입니다:

```
"VM A → VM B 통신이 안 된다" 문제 해결 순서

1. IP Flow Verify   → NSG가 차단하는지 확인
       ↓ 허용됨
2. Next Hop          → 트래픽이 올바른 경로(Firewall/직접)를 타는지 확인
       ↓ 경로 정상
3. Connection Troubleshoot → 전 구간 연결 추적 (지연, 드롭 지점 확인)
       ↓ 특정 구간 문제 발견
4. Packet Capture    → 해당 구간의 실제 패킷 분석
```

> 이 순서를 기억해두면 대부분의 네트워크 문제를 체계적으로 짚어낼 수 있습니다. **"일단 IP Flow Verify부터"**가 첫 번째 원칙입니다.

> **팁**: `NSG 흐름 로그 + 트래픽 분석`을 조합하면 어떤 IP가 어느 포트로 얼마나 통신하는지 Log Analytics 대시보드에서 한눈에 파악할 수 있습니다. 보안 감사나 이상 트래픽 탐지에 매우 유용합니다.
>
> 참고: [Microsoft Learn, "Traffic analytics"](https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics)

<br>

---

# 보안 서비스 선택 가이드 (종합)

```
어떤 보안 서비스를 써야 하나?

네트워크 전체의 중앙 트래픽 제어가 필요?
├── Yes → Azure Firewall (Standard/Premium)
└── No
     └── 웹 애플리케이션(HTTP) 보호가 필요?
          ├── Yes → 글로벌 보호? → WAF on Front Door
          │         리전 보호?  → WAF on Application Gateway
          └── No
               └── DDoS 공격 대응 + 텔레메트리가 필요?
                    ├── Yes → DDoS Network Protection
                    └── No  → DDoS Infrastructure Protection (기본 무료)

온프레미스와 연결이 필요?
├── 대용량/저지연 필수 → ExpressRoute
├── 중소규모/비용 민감 → VPN Gateway (S2S)
└── 원격 사용자 접속  → VPN Gateway (P2S)

네트워크 문제 진단이 필요?
└── Azure Network Watcher (IP Flow Verify, Packet Capture, 흐름 로그 등)
```

<br>

---

## 마치며

이번 포스트에서는 네트워크 계층의 가장 낮은 곳(L4 Load Balancer)부터 시작해, URL을 읽는 L7(Application Gateway), 전 세계로 확장하는 글로벌 서비스(Traffic Manager, Front Door), 그리고 이 모든 것을 보호하는 보안 서비스(Firewall, WAF, DDoS Protection)와 하이브리드 연결(VPN Gateway, ExpressRoute), 진단 도구(Network Watcher)까지 한 흐름으로 살펴봤습니다.

핵심을 한 줄로 정리하면:

> **"HTTP면 Front Door/AGW, 비-HTTP면 LB/Traffic Manager를 선택하고, 중앙 보안은 Firewall, 웹 보안은 WAF, 하이브리드는 ExpressRoute+VPN 조합으로, 문제가 생기면 Network Watcher로 진단합니다."**

<br>

<!--
## 참고문헌

1. [Microsoft Learn, "What is Azure Application Gateway?"](https://learn.microsoft.com/en-us/azure/application-gateway/overview)
2. [Microsoft Learn, "What is Azure Load Balancer?"](https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-overview)
3. [Microsoft Learn, "What is Azure Front Door?"](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview)
4. [Microsoft Learn, "What is Traffic Manager?"](https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-overview)
5. [Microsoft Learn, "What is Azure Firewall?"](https://learn.microsoft.com/en-us/azure/firewall/overview)
6. [Microsoft Learn, "What is Azure Web Application Firewall?"](https://learn.microsoft.com/en-us/azure/web-application-firewall/overview)
7. [Microsoft Learn, "Azure DDoS Protection overview"](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview)
8. [Microsoft Learn, "What is Azure VPN Gateway?"](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)
9. [Microsoft Learn, "What is Azure ExpressRoute?"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction)
10. [Microsoft Learn, "What is Azure Network Watcher?"](https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-overview)
-->
