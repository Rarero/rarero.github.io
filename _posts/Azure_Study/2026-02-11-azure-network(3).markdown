---
layout: post
title: "Azure Network (3): 부하분산장치와 보안 서비스"
date: 2026-02-11 11:00:00 +0900
tags: [Study, Azure, Network, Application Gateway, Load Balancer, Front Door, Traffic Manager, Firewall, WAF, DDoS, VPN Gateway, ExpressRoute, Network Watcher]
categories: Azure_Study
---

지난 포스트 [**Azure Network (2): 하이브리드 연결과 네트워크 서비스 심층 분석**]({% post_url Azure_Study/2026-02-11-azure-network(2) %})에서는 VPN Gateway, ExpressRoute, Azure Firewall, Private Link, Service Endpoint, Azure DNS 등을 살펴봤습니다.

이번 포스트에서는 Azure의 **부하분산장치 4종(Application Gateway, Load Balancer, Azure Front Door, Traffic Manager)**과 **보안 서비스(Azure Firewall, WAF, DDoS Protection, VPN Gateway, ExpressRoute, Network Watcher)**를 체계적으로 정리합니다.

> **용어 분류 기준(이 글에서의 표기):**
> - **서비스(Service)**: Azure에서 리소스로 배포/과금/관리되는 것 (예: Azure Firewall, NAT Gateway)
> - **기능/옵션(Feature/Option)**: 특정 서비스의 설정 항목 (예: VNet Peering, Gateway Transit)
> - **패턴(Pattern)**: 여러 기능을 조합한 아키텍처 방식 (예: Hub-and-Spoke, Service Chaining)
> - **기술/메커니즘(Technology/Mechanism)**: 동작 원리나 프로토콜 (예: BGP, LPM, SR-IOV)

<br>

# Part 1. 부하분산장치

## 1. 부하분산 서비스 개요

Azure는 트래픽을 분산하는 4가지 서비스를 제공하며, **동작 계층(L4/L7)**과 **분산 범위(리전/글로벌)**에 따라 구분됩니다.

```
Azure 부하분산 서비스 분류

                 리전(Regional)           글로벌(Global)
              ┌─────────────────────┬─────────────────────┐
  L7 (HTTP)   │ Application Gateway │  Azure Front Door   │
              ├─────────────────────┼─────────────────────┤
  L4 (TCP/UDP)│ Azure Load Balancer │  Traffic Manager    │
              └─────────────────────┴─────────────────────┘
```

| 서비스 | 계층 | 범위 | 핵심 역할 |
|---|---|---|---|
| Application Gateway | L7 | 리전 | HTTP/HTTPS 기반 웹 트래픽 분산 및 WAF |
| Load Balancer | L4 | 리전 | TCP/UDP 기반 고성능 트래픽 분산 |
| Azure Front Door | L7 | 글로벌 | 글로벌 HTTP 가속, CDN, WAF 통합 |
| Traffic Manager | L4 (DNS) | 글로벌 | DNS 기반 글로벌 트래픽 라우팅 |

> **선택 기준**: "웹(HTTP) 트래픽인가?" → L7 / "비-HTTP(TCP/UDP)인가?" → L4, "단일 리전인가?" → 리전 서비스 / "멀티 리전인가?" → 글로벌 서비스

---

## 2. Application Gateway (AGW)

**분류:** 서비스 (L7 리전 부하분산)

**Azure Application Gateway**는 **웹 애플리케이션 전용 L7 로드밸런서**입니다. HTTP/HTTPS 요청을 해석하여 URL 경로, 호스트 헤더, 쿠키 등의 콘텐츠 기반으로 백엔드 풀에 트래픽을 분산합니다.

> 참고: [Microsoft Learn, "What is Azure Application Gateway?"](https://learn.microsoft.com/en-us/azure/application-gateway/overview)

### 2.1 핵심 구성 요소

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
| **Health Probe** | 백엔드 인스턴스의 상태를 주기적으로 확인. 비정상 인스턴스를 자동으로 풀에서 제외 |
| **HTTP Settings** | 백엔드 연결에 사용할 프로토콜, 포트, 세션 어피니티, 타임아웃 설정 |

### 2.2 주요 기능

| 기능 | 설명 |
|---|---|
| **URL 경로 기반 라우팅** | `/api/*` → API 서버풀, `/images/*` → 정적 서버풀과 같이 경로별 분기 |
| **Multi-site 호스팅** | `app-a.contoso.com`, `app-b.contoso.com`을 하나의 AGW에서 처리 |
| **SSL/TLS 종료** | AGW에서 SSL을 복호화하여 백엔드 서버의 암복호화 부담 제거 |
| **End-to-End SSL** | 클라이언트→AGW와 AGW→백엔드 구간 모두 TLS 암호화 유지 |
| **세션 어피니티(Affinity)** | 쿠키 기반으로 동일 사용자를 같은 백엔드 인스턴스로 고정 |
| **자동 스케일링** | v2 SKU에서 트래픽에 따라 인스턴스를 자동 스케일 인/아웃 |
| **WAF 통합** | WAF SKU(또는 WAF_v2) 선택 시 OWASP 규칙 기반 웹 보안 내장 (Part 2에서 상세) |
| **리디렉션** | HTTP→HTTPS 리디렉션, 외부 URL 리디렉션 |

### 2.3 SKU 비교

| 항목 | Standard v2 | WAF v2 |
|---|---|---|
| 자동 스케일링 | 지원 | 지원 |
| 영역 중복(Zone Redundancy) | 지원 | 지원 |
| WAF | 미지원 | 지원 (OWASP CRS 3.x 규칙셋) |
| 정적 VIP | 지원 | 지원 |
| Private Link | 지원 | 지원 |

> **배포 요구사항**: 전용 서브넷이 필요합니다. 서브넷 이름은 자유이나, **다른 리소스를 함께 배포할 수 없습니다**. 최소 /24 이상을 권장합니다.

### 2.4 NSG 구성 요구사항

AGW v2 서브넷에는 인바운드 **65200-65535 포트**(GatewayManager 서비스 태그)를 허용하는 NSG 규칙이 필수입니다. 이 규칙이 없으면 AGW가 비정상 상태로 전환됩니다.

> 참고: [Microsoft Learn, "Application Gateway infrastructure configuration - NSG"](https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure-nsg)

---

## 3. Azure Load Balancer (ALB)

**분류:** 서비스 (L4 리전 부하분산)

**Azure Load Balancer**는 **TCP/UDP 레벨(L4)**에서 동작하는 고성능 로드밸런서입니다. HTTP 콘텐츠를 해석하지 않고 **패킷의 IP:Port 정보만으로** 분산하므로 매우 낮은 지연시간과 초당 수백만 플로우 처리가 가능합니다.

> 참고: [Microsoft Learn, "What is Azure Load Balancer?"](https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-overview)

### 3.1 Public vs Internal

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

### 3.2 핵심 구성 요소

| 구성 요소 | 설명 |
|---|---|
| **Frontend IP** | 트래픽이 도착하는 IP (공용 또는 사설) |
| **Backend Pool** | 트래픽을 수신하는 VM/VMSS/IP 그룹 |
| **부하분산 규칙** | Frontend IP:Port ↔ Backend Pool:Port 매핑 (TCP/UDP) |
| **Health Probe** | TCP, HTTP, HTTPS 프로브로 백엔드 상태 확인 |
| **인바운드 NAT 규칙** | 특정 Frontend 포트를 특정 백엔드 VM으로 1:1 매핑 (예: SSH 포트 포워딩) |
| **아웃바운드 규칙** | 백엔드 VM의 아웃바운드 SNAT 구성 |

### 3.3 분산 알고리즘

Load Balancer는 기본적으로 **5-튜플 해시**(소스IP, 소스Port, 목적지IP, 목적지Port, 프로토콜)를 사용하여 세션을 분산합니다.

| 분산 모드 | 해시 키 | 특성 |
|---|---|---|
| **기본 (5-튜플)** | Src IP + Src Port + Dst IP + Dst Port + Protocol | 동일 세션은 같은 VM으로. 새 연결마다 재분산 |
| **Source IP affinity (2-튜플)** | Src IP + Dst IP | 같은 클라이언트IP는 항상 같은 VM으로 |
| **Source IP + Protocol (3-튜플)** | Src IP + Dst IP + Protocol | 클라이언트IP+프로토콜 조합별 고정 |

### 3.4 Standard vs Basic SKU

| 항목 | Standard | Basic |
|---|---|---|
| 백엔드 풀 규모 | 최대 1,000 인스턴스 | 최대 300 |
| Health Probe | TCP, HTTP, HTTPS | TCP, HTTP |
| 가용 영역 지원 | 지원 (영역 중복/고정) | 미지원 |
| SLA | 99.99% | SLA 없음 |
| 보안 | 기본 닫힘 (NSG로 명시 허용) | 기본 열림 |
| 아웃바운드 규칙 | 지원 | 미지원 |
| 가격 | 유료 | **2025.9.30 퇴역** |

> **중요**: Basic SKU는 **2025년 9월 30일에 퇴역**됩니다. 모든 신규 배포는 Standard SKU를 사용해야 하며, 기존 Basic도 마이그레이션이 필요합니다.

---

## 4. Azure Front Door (AFD)

**분류:** 서비스 (L7 글로벌 부하분산 + CDN + WAF)

**Azure Front Door**는 Microsoft의 **글로벌 에지 네트워크(180+ PoP)**를 활용하는 L7 로드밸런서/CDN/WAF 통합 서비스입니다. 전 세계 사용자를 가장 가까운 PoP에서 수신하여 최적의 백엔드로 라우팅합니다.

> 참고: [Microsoft Learn, "What is Azure Front Door?"](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview)

### 4.1 동작 원리

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
| **2. Split TCP** | PoP에서 TCP 핸드셰이크를 종료하여 클라이언트 지연 최소화. PoP↔Origin은 Microsoft 백본의 **사전 워밍된(persistent) 연결** 사용 |
| **3. L7 라우팅** | URL 경로, 헤더, 쿠키 등 기반으로 최적 Origin 선택 |
| **4. 캐싱** | 정적 콘텐츠를 에지에 캐싱하여 Origin 부하 감소 |

### 4.2 주요 기능

| 기능 | 설명 |
|---|---|
| **글로벌 부하분산** | 지연시간(Latency) 기반, 가중치(Weighted), 우선순위(Priority), 세션 어피니티 라우팅 |
| **CDN 통합** | 에지 캐싱으로 정적 콘텐츠 가속 |
| **WAF 통합** | DRS(Default Rule Set) + 커스텀 규칙, Bot 보호 (Part 2에서 상세) |
| **SSL 오프로드** | 에지에서 TLS 종료, 관리형 인증서 자동 발급/갱신 |
| **URL 리디렉트/리라이트** | HTTP→HTTPS, 경로 리라이트 |
| **Private Link Origin** | 백엔드를 Private Endpoint로 연결하여 인터넷 비노출 |

### 4.3 SKU 비교

| 항목 | Standard | Premium |
|---|---|---|
| 정적 콘텐츠 가속 (CDN) | 지원 | 지원 |
| 동적 사이트 가속 | 지원 | 지원 |
| WAF | 커스텀 규칙만 | 관리형 규칙 + Bot 보호 |
| Private Link Origin | 미지원 | 지원 |
| 보안 보고서 | 미지원 | 지원 |

### 4.4 Application Gateway와의 차이

| 비교 항목 | Application Gateway | Azure Front Door |
|---|---|---|
| 범위 | 리전 (단일 데이터센터) | 글로벌 (180+ PoP 에지) |
| 배포 위치 | VNet 서브넷 내 | Microsoft 에지 네트워크 |
| CDN 기능 | 미지원 | 지원 |
| 백엔드 유형 | VM, VMSS, App Service (같은 리전 위주) | 모든 인터넷 연결 가능 엔드포인트 (글로벌) |
| 조합 사용 | AFD 뒤에 AGW를 배치하여 **글로벌 가속 + 리전 내 WAF/경로 분기** 조합 가능 |

---

## 5. Traffic Manager

**분류:** 서비스 (DNS 기반 글로벌 트래픽 라우팅)

**Azure Traffic Manager**는 **DNS 레벨**에서 동작하는 글로벌 트래픽 분산 서비스입니다. 데이터 경로(Data Plane)에 위치하지 않고, DNS 응답으로 최적 엔드포인트의 IP를 반환하는 방식입니다.

> 참고: [Microsoft Learn, "What is Traffic Manager?"](https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-overview)

### 5.1 동작 원리

```
Traffic Manager 동작 (DNS 기반)

1) 클라이언트 → DNS 쿼리: "myapp.trafficmanager.net"
2) Traffic Manager → DNS 응답: "endpoint-koreacentral.azurewebsites.net" (IP: x.x.x.x)
3) 클라이언트 → x.x.x.x 로 직접 연결 (Traffic Manager를 경유하지 않음)

   ┌──────────────┐     DNS Query      ┌─────────────────┐
   │   Client     │ ──────────────────→ │ Traffic Manager │
   │              │ ←────────────────── │   (DNS 응답)     │
   │              │     IP: x.x.x.x    └─────────────────┘
   │              │                           │
   │              │ ── 직접 연결 ──→ [Endpoint A: Korea Central]
   └──────────────┘                   [Endpoint B: East US]
                                      [Endpoint C: West Europe]
```

> **핵심**: Traffic Manager는 **트래픽 자체를 프록시하지 않습니다**. DNS 해석만 수행하므로 데이터 경로에 병목이 생기지 않지만, DNS TTL에 따른 전환 지연이 있을 수 있습니다.

### 5.2 라우팅 방법

| 라우팅 방법 | 설명 | 적용 시나리오 |
|---|---|---|
| **Priority** | 우선순위 기반. Primary 실패 시 Secondary로 전환 | Active-Passive DR |
| **Weighted** | 가중치 비율로 분산 (예: 70:30) | 블루-그린 배포, 점진적 마이그레이션 |
| **Performance** | 클라이언트에서 가장 가까운(지연시간 낮은) 엔드포인트 반환 | 글로벌 서비스 최적 응답 |
| **Geographic** | 클라이언트 지리적 위치에 따라 특정 엔드포인트 지정 | 데이터 주권, 지역별 콘텐츠 |
| **MultiValue** | 정상 엔드포인트 IP 여러 개를 한번에 반환 | 클라이언트가 직접 failover 처리 |
| **Subnet** | 클라이언트 IP 서브넷 범위별 엔드포인트 매핑 | 특정 네트워크 대역별 분기 |

### 5.3 Azure Front Door와의 차이

| 비교 항목 | Traffic Manager | Azure Front Door |
|---|---|---|
| 동작 계층 | DNS (L4) | HTTP (L7) |
| 데이터 경로 | **경유하지 않음** (DNS 응답만) | **경유함** (에지에서 프록시) |
| 프로토콜 | 모든 프로토콜 (TCP/UDP/HTTP 등) | HTTP/HTTPS만 |
| 캐싱/CDN | 미지원 | 지원 |
| WAF | 미지원 | 지원 |
| Failover 속도 | DNS TTL 의존 (수십초~수분) | 즉시 (에지에서 실시간 감지) |
| 비용 | 저렴 (DNS 쿼리 기반) | 상대적으로 높음 (트래픽 처리 기반) |

> 비-HTTP 프로토콜(게임 서버, IoT, 커스텀 TCP 등)의 글로벌 분산이 필요하면 Traffic Manager를 사용합니다. HTTP 워크로드에는 Front Door가 더 많은 기능(에지 캐싱, WAF, 실시간 Failover)을 제공합니다.
>
> 참고: [Microsoft Learn, "Traffic Manager FAQ"](https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-faqs)

### 5.4 부하분산 서비스 선택 가이드 (종합)

```
트래픽이 HTTP/HTTPS인가?
├── Yes → 글로벌 분산이 필요한가?
│          ├── Yes → Azure Front Door
│          └── No  → Application Gateway
└── No  → 글로벌 분산이 필요한가?
           ├── Yes → Traffic Manager
           └── No  → Azure Load Balancer
```

---

<br>

# Part 2. 보안 서비스 (NSG, ASG 제외)

## 6. Azure Firewall

**분류:** 서비스 (클라우드 네이티브 L3-L7 방화벽)

**Azure Firewall**은 VNet에 배포되는 **완전 관리형 상태 저장(Stateful) 네트워크 방화벽**입니다. 인바운드, 아웃바운드, East-West(VNet 간), 스포크 간 트래픽을 중앙에서 제어합니다.

> 참고: [Microsoft Learn, "What is Azure Firewall?"](https://learn.microsoft.com/en-us/azure/firewall/overview)

### 6.1 핵심 특성

```
Hub-Spoke 환경에서의 Azure Firewall 배치

                ┌─ Spoke A (Web) ─┐
                │                  │
Internet ──→ [Azure Firewall] ←──→├─ Spoke B (App) ─┤  ← UDR: 0.0.0.0/0 → Firewall IP
                │   (Hub VNet)     │
                │                  │
                └─ Spoke C (DB) ──┘

• 모든 Spoke 서브넷에 UDR을 설정하여 트래픽을 Firewall로 강제 경유
• Firewall이 허용/차단을 판단한 후 트래픽을 전달
```

| 항목 | 설명 |
|---|---|
| 배포 위치 | **AzureFirewallSubnet** (/26 필수) |
| 고가용성 | 내장 HA (다중 인스턴스, 자동 스케일링) |
| 가용 영역 | 최대 3개 AZ에 걸쳐 배포 가능 |
| 관리 | Azure Firewall Policy 또는 Azure Firewall Manager로 중앙 관리 |

### 6.2 SKU 비교

| 기능 | Basic | Standard | Premium |
|---|---|---|---|
| L3-L4 네트워크 규칙 | 지원 | 지원 | 지원 |
| FQDN 기반 필터링 | 지원 | 지원 | 지원 |
| 위협 인텔리전스 | 알림만 | 알림 + 차단 | 알림 + 차단 |
| **TLS 검사(복호화)** | 미지원 | 미지원 | 지원 |
| **IDPS** (침입 탐지/방지) | 미지원 | 미지원 | 지원 |
| **URL 필터링** | 미지원 | 지원 | 지원 |
| 웹 카테고리 필터링 | 미지원 | 지원 | 지원 (전체 URL 검사) |
| 처리량 | 250 Mbps | 30 Gbps | 100 Gbps |

> **TLS 검사**: 암호화된(HTTPS) 트래픽 내부를 검사하려면 방화벽이 **TLS를 복호화 후 검사하고 재암호화**해야 합니다. Premium SKU만 이 기능을 제공합니다.
>
> 참고: [Microsoft Learn, "Azure Firewall Premium features"](https://learn.microsoft.com/en-us/azure/firewall/premium-features)

### 6.3 규칙 처리 우선순위

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

> **중요**: DNAT 규칙이 가장 먼저 평가됩니다. DNAT로 허용된 트래픽은 Network 규칙에서 **암묵적으로 허용**됩니다(별도 Network 규칙 불필요).

---

## 7. Azure WAF (Web Application Firewall)

**분류:** 기능 (L7 웹 보안 — AGW 또는 AFD에 연결)

**Azure WAF**는 독립 서비스가 아니라 **Application Gateway** 또는 **Azure Front Door**에 연결하여 웹 애플리케이션을 OWASP Top 10 등의 일반적인 공격으로부터 보호하는 기능입니다.

> 참고: [Microsoft Learn, "What is Azure Web Application Firewall?"](https://learn.microsoft.com/en-us/azure/web-application-firewall/overview)

### 7.1 WAF 배포 위치 비교

| 항목 | WAF on Application Gateway | WAF on Front Door |
|---|---|---|
| 보호 범위 | 리전 단위 (AGW 뒤 백엔드) | 글로벌 에지 (전 세계 PoP에서 차단) |
| 공격 차단 시점 | 트래픽이 리전에 도달한 후 | 트래픽이 **Origin에 도달하기 전** 에지에서 차단 |
| 관리형 규칙셋 | OWASP CRS 3.x | DRS (Default Rule Set) + Bot Manager |
| 커스텀 규칙 | 지원 | 지원 |
| Bot 보호 | 제한적 | 지원 (Bot Manager 규칙셋) |
| 적합 시나리오 | 리전 내 웹앱 보호 | 글로벌 웹앱, DDoS+WAF 통합 보호 |

### 7.2 WAF 모드

| 모드 | 동작 | 용도 |
|---|---|---|
| **Detection** | 위반 로그만 기록, 트래픽은 통과 | 초기 도입 시 오탐(False Positive) 확인 |
| **Prevention** | 위반 트래픽 실제 차단 (403 응답) | 운영 환경 적용 |

> **WAF 운영 권장사항**: Microsoft 공식 문서에서는 WAF 도입 시 **Detection 모드로 먼저 운영**하여 오탐(False Positive)을 확인한 후, 필요한 규칙 제외(Exclusion) 설정을 마친 다음 Prevention 모드로 전환할 것을 권장합니다.
>
> 참고: [Microsoft Learn, "Web Application Firewall best practices"](https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-best-practices)

---

## 8. Azure DDoS Protection

**분류:** 서비스 (L3/L4 DDoS 완화)

Azure는 기본적으로 모든 리소스에 **DDoS Infrastructure Protection(무료)**을 제공합니다. **DDoS Network Protection**은 이를 강화하여 고객의 VNet 리소스에 대한 정교한 DDoS 공격을 완화합니다.

> 참고: [Microsoft Learn, "Azure DDoS Protection overview"](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview)

### 8.1 티어 비교

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

> **비용 보호(Cost Protection)**: DDoS 공격으로 인해 자동 스케일아웃된 리소스(VM, AGW, 대역폭 등) 비용을 Azure 크레딧으로 보상받을 수 있습니다.
>
> 참고: [Microsoft Learn, "Azure DDoS Protection - Cost guarantee"](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview#cost-guarantee)

### 8.2 보호 대상 리소스

DDoS Network Protection이 보호하는 **공용 IP가 연결된** 리소스:

- Azure Load Balancer (Public)
- Application Gateway
- Azure Front Door (에지 레벨 보호 별도 내장)
- VPN Gateway
- Azure Bastion
- VM에 직접 연결된 Public IP

> **주의**: DDoS Protection은 **공용 IP 리소스**에 대해서만 동작합니다. Private Endpoint, Internal Load Balancer 등 사설 IP만 사용하는 리소스에는 적용되지 않습니다.

---

## 9. VPN Gateway

**분류:** 서비스 (암호화된 하이브리드 연결)

**VPN Gateway**는 **GatewaySubnet**에 배포되어 온프레미스 네트워크와 Azure VNet 간 암호화된 터널을 제공하는 가상 네트워크 게이트웨이입니다.

> 참고: [Microsoft Learn, "What is Azure VPN Gateway?"](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)

### 9.1 연결 유형

```
┌──────────────────────────────────────────────────────┐
│                  VPN Gateway 연결 유형                 │
├───────────────┬──────────────────────────────────────┤
│               │                                      │
│  S2S (Site-   │  온프레미스 VPN 장비 ←──IPsec/IKE──→ │
│  to-Site)     │  Azure VPN Gateway                   │
│               │  • 항상 연결 (Always-on)              │
│               │  • 양쪽 네트워크 전체가 통신           │
│               │                                      │
├───────────────┼──────────────────────────────────────┤
│               │                                      │
│  P2S (Point-  │  개별 클라이언트 PC ←──VPN 터널──→   │
│  to-Site)     │  Azure VPN Gateway                   │
│               │  • 재택/원격 근무자 접속용             │
│               │  • OpenVPN / IKEv2 / SSTP            │
│               │                                      │
├───────────────┼──────────────────────────────────────┤
│               │                                      │
│  VNet-to-VNet │  Azure VNet A ←──IPsec/IKE──→       │
│               │  Azure VNet B (리전 간 암호화 연결)    │
│               │                                      │
└───────────────┴──────────────────────────────────────┘
```

### 9.2 S2S (Site-to-Site) 상세

| 항목 | 설명 |
|---|---|
| 용도 | 온프레미스 데이터센터 ↔ Azure VNet **상시 연결** |
| 프로토콜 | IPsec/IKEv2 (암호화 터널) |
| 온프레미스 요구사항 | **VPN 장비** 필요 (온프레미스 측 공인 IP, IKEv2 지원) |
| 대역폭 | SKU에 따라 100Mbps ~ 10Gbps |
| BGP 지원 | 지원 (Active-Active 구성 시 권장) |
| 다중 사이트 | 하나의 VPN Gateway에 여러 온프레미스 사이트 연결 가능 |

### 9.3 P2S (Point-to-Site) 상세

| 항목 | 설명 |
|---|---|
| 용도 | **개별 사용자** (재택근무, 출장)가 노트북/PC에서 Azure VNet으로 접속 |
| 프로토콜 | OpenVPN, IKEv2, SSTP (Windows 전용) |
| 인증 방법 | Azure AD 인증, 인증서 기반, RADIUS |
| 클라이언트 | Azure VPN Client, OpenVPN Client, 네이티브 OS VPN |
| 동시 연결 수 | SKU에 따라 250 ~ 10,000 |

> **S2S vs P2S 선택 기준**: 온프레미스 **네트워크 전체**를 Azure에 연결 → **S2S** / 개별 **사용자 PC**를 Azure에 연결 → **P2S**

### 9.4 VPN Gateway SKU

| SKU | S2S 터널 | P2S 연결 | 집계 처리량 | BGP | 영역 중복 |
|---|---|---|---|---|---|
| VpnGw1 | 30 | 250 | 650 Mbps | 지원 | 미지원 |
| VpnGw2 | 30 | 500 | 1 Gbps | 지원 | 미지원 |
| VpnGw3 | 30 | 1,000 | 1.25 Gbps | 지원 | 미지원 |
| VpnGw4 | 100 | 5,000 | 5 Gbps | 지원 | 미지원 |
| VpnGw5 | 100 | 10,000 | 10 Gbps | 지원 | 미지원 |
| VpnGw1**AZ** ~ 5**AZ** | 동일 | 동일 | 동일 | 지원 | 지원 |

> **배포 요구사항**: **GatewaySubnet** 전용 서브넷 필수 (/27 이상 권장). 이 서브넷에는 다른 리소스를 배포할 수 없습니다.

---

## 10. ExpressRoute

**분류:** 서비스 (전용 프라이빗 연결)

**ExpressRoute**는 온프레미스와 Azure 간을 **공용 인터넷을 경유하지 않는 전용 프라이빗 회선**으로 연결하는 서비스입니다. 통신사(Connectivity Provider)가 제공하는 전용 또는 MPLS 회선을 통해 연결됩니다.

> 참고: [Microsoft Learn, "What is Azure ExpressRoute?"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction)

### 10.1 VPN Gateway vs ExpressRoute

| 비교 항목 | VPN Gateway (S2S) | ExpressRoute |
|---|---|---|
| 연결 경로 | **공용 인터넷** (암호화 터널) | **전용 프라이빗 회선** (인터넷 비경유) |
| 프로토콜 | IPsec/IKEv2 | BGP 기반 L3 라우팅 |
| 대역폭 | 최대 10 Gbps | 최대 **100 Gbps** |
| 지연시간 | 인터넷 경로 의존 (가변적) | 전용 경로 (낮고 **일관적**) |
| SLA | 99.95% (Active-Active) | **99.95%** (Standard), **99.99%** (ExpressRoute Direct) |
| 비용 | 저렴 | 상대적으로 고가 (회선 + Gateway + 포트 비용) |
| 적합 환경 | 중소규모, 비용 민감 | 대기업, 대용량, 저지연 필수 |

### 10.2 ExpressRoute 피어링

| 피어링 유형 | 접근 대상 |
|---|---|
| **Azure Private Peering** | VNet 내 리소스 (VM, ILB, 프라이빗 엔드포인트 등) |
| **Microsoft Peering** | Microsoft 365, Azure PaaS 공용 엔드포인트 (Storage, SQL 등) |

> **참고**: Azure Public Peering은 **퇴역(Deprecated)**되었으며 Microsoft Peering으로 통합되었습니다.

### 10.3 ExpressRoute 회복 탄력성 구성

```
권장 구성: 각 피어링 위치에 이중 회선

[온프레미스 DC] ── 회선 A ──→ [피어링 위치 1] ──→ [Azure (Primary)]
                ── 회선 B ──→ [피어링 위치 2] ──→ [Azure (Secondary)]

• 각 회선은 Active-Active BGP 세션
• 하나의 회선 또는 피어링 위치 장애 시 자동 Failover
```

> Microsoft 공식 문서에서는 미션 크리티컬 워크로드에서 ExpressRoute를 **기본 경로**로, VPN Gateway S2S를 **백업 경로(Failover)**로 구성하는 방식을 권장합니다.
>
> 참고: [Microsoft Learn, "Using S2S VPN as a backup for ExpressRoute private peering"](https://learn.microsoft.com/en-us/azure/expressroute/use-s2s-vpn-as-backup-for-expressroute-privatepeering)

---

## 11. Azure Network Watcher

**분류:** 서비스 (네트워크 모니터링 및 진단)

**Azure Network Watcher**는 Azure 네트워크 리소스의 **모니터링, 진단, 로깅**을 위한 통합 도구 모음입니다. 트래픽이 왜 차단되는지, 패킷이 어디서 드롭되는지, 어떤 NSG 규칙이 적용되는지를 확인할 수 있습니다.

> 참고: [Microsoft Learn, "What is Azure Network Watcher?"](https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-overview)

### 11.1 주요 도구

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

### 11.2 실무 활용 흐름

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

> `NSG 흐름 로그 + 트래픽 분석`을 조합하면 어떤 IP가 어느 포트로 얼마나 통신하는지 Log Analytics 대시보드에서 확인할 수 있습니다.
>
> 참고: [Microsoft Learn, "Traffic analytics"](https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics)

---

<br>

## 12. 보안 서비스 선택 가이드 (종합)

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

## 13. 마치며: 핵심 요약 (Key Takeaways)

### ① 부하분산 (Load Balancing)
* **L7 리전**: Application Gateway — URL 경로/호스트 기반 라우팅, SSL 종료, WAF 통합
* **L4 리전**: Load Balancer — TCP/UDP 고성능 분산, 5-튜플 해시, Standard SKU 필수
* **L7 글로벌**: Azure Front Door — 180+ PoP 에지, CDN+WAF 통합, Split TCP
* **DNS 글로벌**: Traffic Manager — DNS 응답만, 데이터 경로 비경유, 비-HTTP 프로토콜 글로벌 분산

### ② 보안 (Security)
* **Azure Firewall**: Hub-Spoke 중앙 방화벽, DNAT→Network→Application 규칙 순서, Premium은 TLS 검사+IDPS
* **Azure WAF**: AGW(리전) 또는 AFD(글로벌)에 연결, Detection→Prevention 단계적 적용
* **DDoS Protection**: Infrastructure(무료/기본) vs Network(유료/ML 학습/비용 보호)

### ③ 하이브리드 연결 및 모니터링
* **VPN Gateway**: S2S(네트워크↔네트워크), P2S(사용자↔네트워크), IPsec 암호화
* **ExpressRoute**: 전용 프라이빗 회선, 최대 100Gbps, BGP 기반, 미션 크리티컬 권장
* **Network Watcher**: IP Flow Verify → Next Hop → Connection Troubleshoot → Packet Capture 순서로 진단

---

> **핵심 요약 한 줄 평**: "HTTP면 Front Door/AGW, 비-HTTP면 LB/Traffic Manager를 선택하고, 중앙 보안은 Firewall, 웹 보안은 WAF, 하이브리드는 ExpressRoute+VPN 조합으로 설계합니다."

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
