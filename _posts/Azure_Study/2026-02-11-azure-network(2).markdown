---
layout: post
title: "Azure Network (2): 하이브리드 연결과 네트워크 서비스 심층 분석"
date: 2026-02-11 10:00:00 +0900
tags: [Study, Azure, Network, VPN Gateway, ExpressRoute, Firewall, Private Link, Service Endpoint, DNS]
categories: Azure_Study
---

지난 포스트 [**Azure Network (1): Azure 네트워크의 기초와 동작 원리**]({% post_url Azure_Study/2026-02-11-azure-network(1) %})에서는 VNet, Subnet, NSG, UDR, VNet Peering 등 기본 구성 요소와 Microsoft 글로벌 백본, 호스트 네트워킹(VFP/SR-IOV) 아키텍처를 살펴봤습니다.

이번 포스트에서는 **VPN Gateway, ExpressRoute, Azure Firewall, Private Link, Service Endpoint, Azure DNS** — Azure 네트워크 서비스를 하나씩 깊이 있게 다룹니다. 단순 소개가 아닌, 각 서비스의 **내부 동작 메커니즘**까지 포함합니다.

<br>

## 1. VPN Gateway

**Azure VPN Gateway**는 Azure VNet과 온프레미스 네트워크 사이에 **암호화된 트래픽**을 공용 인터넷을 통해 전송하는 가상 네트워크 게이트웨이입니다.

> 참고: [Microsoft Learn, "What is Azure VPN Gateway?"](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)

### 1.1 VPN 연결 유형

```
VPN Gateway 연결 유형
├── Site-to-Site (S2S)
│   ├── IPsec/IKE VPN 터널
│   ├── 온프레미스 VPN 장비 ↔ Azure VPN Gateway
│   └── 용도: 본사/지사와 Azure 간 상시 연결
│
├── Point-to-Site (P2S)
│   ├── 개별 클라이언트 디바이스 → Azure VNet
│   ├── 프로토콜: OpenVPN / IKEv2 / SSTP
│   └── 용도: 원격 근무자의 Azure 리소스 접근
│
└── VNet-to-VNet
    ├── Azure VNet ↔ Azure VNet (IPsec/IKE)
    └── 용도: 리전 간 VNet 연결 (피어링 대안)
```

---

### 1.2 VPN Gateway SKU

VPN Gateway는 **세대(Generation)**와 **SKU**에 따라 성능이 달라집니다:

| &nbsp;SKU&nbsp; | &nbsp;S2S 터널&nbsp; | &nbsp;P2S 연결&nbsp; | &nbsp;집계 처리량&nbsp; | &nbsp;BGP 지원&nbsp; | &nbsp;가용 영역&nbsp; |
|---|---|---|---|---|---|
| Basic | 최대 10 | 최대 128 | 100 Mbps | ✗ | ✗ |
| VpnGw1 | 최대 30 | 최대 250 | 650 Mbps | ✓ | ✗ |
| VpnGw2 | 최대 30 | 최대 500 | 1 Gbps | ✓ | ✗ |
| VpnGw3 | 최대 30 | 최대 1,000 | 1.25 Gbps | ✓ | ✗ |
| VpnGw4 | 최대 100 | 최대 5,000 | 5 Gbps | ✓ | ✗ |
| VpnGw5 | 최대 100 | 최대 10,000 | 10 Gbps | ✓ | ✗ |
| VpnGw*AZ | 위와 동일 | 위와 동일 | 위와 동일 | ✓ | ✓ |

> **AZ SKU**: 가용 영역(Availability Zone)을 지원하여 **영역 수준 복원력**을 제공합니다.

<br>

## 2. ExpressRoute

**Azure ExpressRoute**는 연결 공급자를 통해 온프레미스 네트워크를 Microsoft 클라우드에 **프라이빗으로 연결**하는 서비스입니다. 트래픽은 **공용 인터넷을 거치지 않으며**, Layer 3(BGP) 기반의 연결을 제공합니다.

> 참고: [Microsoft Learn, "What is Azure ExpressRoute?"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction)

### 2.1 핵심 특성

```
ExpressRoute 특성
├── 프라이빗 연결
│   ├── 공용 인터넷 미경유
│   └── 연결 공급자(ISP)를 통한 전용 회선
│
├── 내장된 이중화 (Built-in Redundancy)
│   └── 모든 피어링 위치에서 이중 연결 제공
│
├── QoS 지원
│   └── Skype for Business 등 실시간 트래픽 우선 처리
│
├── 연결 대상
│   ├── Azure 서비스 (모든 리전)
│   ├── Microsoft 365 서비스
│   └── Dynamics 365
│
└── 대역폭 옵션
    └── 50 Mbps ~ 10 Gbps (ExpressRoute Direct: 100 Gbps)
```

---

### 2.2 연결 모델

| &nbsp;모델&nbsp; | &nbsp;설명&nbsp; | &nbsp;적합한 경우&nbsp; |
|---|---|---|
| CloudExchange Co-location | 코로케이션 시설에서 직접 연결 | 데이터센터가 교환 시설에 위치 |
| Point-to-Point Ethernet | 전용 이더넷 연결 | 기업 DC와 Azure 간 1:1 연결 |
| Any-to-Any (IPVPN) | WAN과 Azure를 통합 | 기존 MPLS WAN에 Azure 추가 |
| ExpressRoute Direct | Microsoft 피어링 위치에서 직접 연결 | 100 Gbps 고대역폭 필요 시 |

---

### 2.3 MSEE 라우터와 BGP 라우팅 내부 동작

ExpressRoute 연결의 핵심 장비는 **MSEE(Microsoft Enterprise Edge) 라우터**입니다. 고객의 온프레미스 라우터(PE)와 MSEE 간에 **eBGP(External BGP)** 세션이 설정됩니다.

> 참고: [Microsoft Learn, "ExpressRoute routing requirements"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing)

```
ExpressRoute 물리적 연결 구조

On-Premises                    Microsoft 피어링 위치
┌──────────┐                  ┌────────────────────────┐
│ PE Router│ ←── Primary ──→  │  MSEE-Primary          │
│  (고객)  │     Link         │  (Microsoft Edge)      │
│          │                  │                        │
│          │ ←── Secondary ─→ │  MSEE-Secondary        │
│          │     Link         │  (이중화)              │
└──────────┘                  └────────────────────────┘
                                       │
                                       │ Microsoft 글로벌 백본
                                       │
                              ┌────────▼────────────┐
                              │    Azure Regions     │
                              │  (VNet, PaaS 등)     │
                              └─────────────────────┘

※ 모든 피어링 위치에서 이중(Primary/Secondary) 연결 필수
※ SLA 유지를 위해 양쪽 BGP 세션 모두 설정 필요
```

**BGP 세션 구성:**

```
BGP 세션 상세

Microsoft ASN: 12076 (전 세계 공통)
  → Azure Public, Private, Microsoft Peering 모두 동일

IP 서브넷 할당:
  고객이 /29 서브넷 제공 → /30 두 개로 분할
  
  예시: 192.168.100.128/29
  ├── Primary Link:  192.168.100.128/30
  │   PE Router:  192.168.100.129 (고객)
  │   MSEE:       192.168.100.130 (Microsoft)
  │
  └── Secondary Link: 192.168.100.132/30
      PE Router:  192.168.100.133 (고객)
      MSEE:       192.168.100.134 (Microsoft)

경로 제한:
  • Private Peering: 최대 4,000 IPv4 접두사 (Premium: 10,000)
  • Microsoft Peering: BGP 세션당 200 접두사
  • 제한 초과 시 BGP 세션 드롭
```

> 참고: [Microsoft Learn, "ExpressRoute routing requirements - Autonomous System numbers"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing#autonomous-system-numbers-asn) — "Microsoft uses AS 12076 for Azure public, Azure private and Microsoft peering"

---

### 2.4 피어링 유형별 트래픽 경로

ExpressRoute는 **피어링 유형**에 따라 접근 가능한 서비스가 달라집니다:

```
ExpressRoute 피어링 유형

┌──────────────────────────────────────────────────────────────┐
│                      ExpressRoute Circuit                    │
│                                                              │
│  ┌─────────────────────┐    ┌──────────────────────────────┐ │
│  │  Private Peering    │    │  Microsoft Peering           │ │
│  │                     │    │                              │ │
│  │  접근 대상:          │    │  접근 대상:                   │ │
│  │  • Azure VNet (IaaS)│    │  • Microsoft 365             │ │
│  │  • VM, LB, App GW   │    │  • Dynamics 365              │ │
│  │  • Private IP 통신   │    │  • Azure PaaS (Public IP)    │ │
│  │                     │    │                              │ │
│  │  IP: Private 또는    │    │  IP: Public IP 필수          │ │
│  │       Public IPv4    │    │  NAT 필요                    │ │
│  └─────────────────────┘    └──────────────────────────────┘ │
│                                                              │
│  ※ Public Peering은 Deprecated → Microsoft Peering으로 통합  │
└──────────────────────────────────────────────────────────────┘
```

---

### 2.5 BGP Community를 활용한 경로 제어

Microsoft는 광고하는 모든 경로에 **BGP Community 값**을 태깅합니다. 이를 통해 온프레미스에서 특정 Azure 리전이나 서비스로 향하는 트래픽을 **정밀하게 제어**할 수 있습니다.

```
BGP Community 값 구조 (예시)

서비스별:
  Exchange Online:     12076:5010
  SharePoint Online:   12076:5020
  Microsoft Entra ID:  12076:5060
  Azure Global:        12076:5050

리전별:
  Korea Central:       12076:50029
  Japan East:          12076:50012
  East US:             12076:50004
  West Europe:         12076:50002

활용 예시:
  여러 ExpressRoute 회선을 운영할 때,
  BGP Community 값으로 특정 리전 트래픽을
  가장 가까운 회선으로 라우팅 → 최적 경로 보장
```

> 참고: [Microsoft Learn, "ExpressRoute routing requirements - Support for BGP communities"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing#support-for-bgp-communities)

---

### 2.6 주요 기능

**Global Reach**

ExpressRoute Global Reach를 사용하면 **서로 다른 온프레미스 사이트 간**에 Microsoft 백본을 통해 데이터를 교환할 수 있습니다.

```
Global Reach 시나리오

서울 DC ──── ExpressRoute ──── Microsoft 백본 ──── ExpressRoute ──── 도쿄 DC
                                    │
                              Azure Regions
                            (동시에 접근 가능)

→ 서울 ↔ 도쿄 간 트래픽이 Microsoft 글로벌 백본을 경유
→ 별도의 WAN 회선 없이 사이트 간 통신 가능
```

**FastPath**

ExpressRoute FastPath는 게이트웨이를 **우회**하여 VNet 내 VM으로 직접 데이터 경로를 설정합니다. 대용량 데이터 전송 시 성능이 향상됩니다.

**Local SKU**

데이터 전송이 동일 **메트로 지역** 내에서만 발생하는 경우, Local SKU를 사용하면 **Egress 데이터 전송 비용 없이** ExpressRoute를 이용할 수 있습니다.

<br>

## 3. 하이브리드 연결 비교와 공존 아키텍처

### 3.1 VPN Gateway vs ExpressRoute

| &nbsp;항목&nbsp; | &nbsp;VPN Gateway&nbsp; | &nbsp;ExpressRoute&nbsp; |
|---|---|---|
| 연결 방식 | 공용 인터넷 (IPsec 암호화) | 프라이빗 전용 회선 |
| 대역폭 | 최대 10 Gbps | 최대 100 Gbps (Direct) |
| 지연 시간 | 인터넷 경유 (가변적) | 낮고 일관됨 |
| 이중화 | Active-Active 구성 가능 | 내장된 이중화 |
| SLA | 99.95% (Active-Active) | 99.95% |
| 비용 | 상대적으로 저렴 | 높음 (회선 + 게이트웨이 + 데이터) |
| 설정 시간 | 수 분 | 수 주 (ISP 프로비저닝) |
| Microsoft 365 | 지원 안 함 | Microsoft Peering으로 지원 |
| 용도 | 개발/테스트, 소규모 워크로드 | 프로덕션, 대용량 데이터, 미션 크리티컬 |

---

### 3.2 ExpressRoute + VPN 공존 아키텍처

ExpressRoute와 VPN Gateway는 **동일 VNet에 공존**할 수 있으며, ExpressRoute를 주 경로로, VPN을 장애 조치 경로로 구성합니다.

```
공존 아키텍처와 경로 우선순위

On-Premises
┌────────────┐
│  DC Router │
└──┬─────┬───┘
   │     │
   │ER   │VPN (IPsec, 암호화)
   │     │
┌──▼─────▼───────────────────────────────┐
│  GatewaySubnet                         │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ ER Gateway   │  │  VPN Gateway   │  │
│  │ (Active)     │  │  (Standby)     │  │
│  └──────────────┘  └────────────────┘  │
│                                        │
│  경로 우선순위:                          │
│    ER Gateway 경로 > VPN Gateway 경로    │
│    (ER 장애 시 자동으로 VPN으로 전환)      │
└────────────────────────────────────────┘
```

> **실무 팁**: ExpressRoute를 주 회선으로, VPN Gateway를 장애 조치 경로로 구성하는 것이 모범 사례입니다.

<br>

## 4. Azure Firewall

**Azure Firewall**은 Azure에서 제공하는 **클라우드 네이티브 관리형 네트워크 방화벽** 서비스입니다. 완전한 상태 저장(Stateful) 방화벽으로, **동서(East-West)** 및 **남북(North-South)** 트래픽을 모두 검사합니다.

> 참고: [Microsoft Learn, "What is Azure Firewall?"](https://learn.microsoft.com/en-us/azure/firewall/overview)

### 4.1 Azure Firewall SKU

```
Azure Firewall SKU 비교
├── Basic
│   ├── 대상: 중소기업(SMB)
│   ├── 처리량: ~250 Mbps
│   └── 기능: L3-L4 필터링, 위협 인텔리전스 (알림만)
│
├── Standard
│   ├── 대상: 대부분의 엔터프라이즈
│   ├── 처리량: ~30 Gbps
│   ├── 기능:
│   │   ├── L3-L7 필터링
│   │   ├── 위협 인텔리전스 (알림 + 차단)
│   │   ├── DNS 프록시
│   │   ├── 웹 카테고리 필터링
│   │   └── FQDN 태그/필터링
│   └── SNAT/DNAT 지원
│
└── Premium
    ├── 대상: 고도로 민감한 환경
    ├── 처리량: ~100 Gbps
    ├── Standard 모든 기능 포함 +
    │   ├── TLS 검사 (인바운드/아웃바운드)
    │   ├── IDPS (67,000+ 시그니처)
    │   ├── URL 필터링
    │   └── 웹 카테고리 (전체 URL 경로 기반)
    └── 규제 준수 환경에 적합
```

---

### 4.2 Azure Firewall 아키텍처 (Hub-Spoke)

Azure Firewall은 일반적으로 **Hub VNet**에 배포되어 모든 스포크 트래픽을 중앙에서 검사합니다.

```
Hub-Spoke with Azure Firewall

                      Internet
                         │
                   ┌─────▼─────┐
                   │  Azure    │
                   │  Firewall │
                   │ (Hub VNet)│
                   └──┬─────┬──┘
         UDR 0.0.0.0/0│     │UDR 0.0.0.0/0
            ┌─────────▼─┐ ┌─▼─────────┐
            │  Spoke-1  │ │  Spoke-2  │
            │ (Web Tier)│ │ (DB Tier) │
            └───────────┘ └───────────┘

트래픽 흐름:
  Spoke → Hub Firewall → Spoke (East-West)
  Spoke → Hub Firewall → Internet (North-South)
  Internet → Hub Firewall → Spoke (Inbound)
```

---

### 4.3 Azure Firewall vs NSG

[이전 포스트]({% post_url Azure_Study/2026-02-11-azure-network(1) %})에서 다룬 NSG와 Azure Firewall은 **계층이 다른 보안 도구**입니다:

| &nbsp;항목&nbsp; | &nbsp;NSG&nbsp; | &nbsp;Azure Firewall&nbsp; |
|---|---|---|
| 레이어 | L3-L4 (IP, Port) | L3-L7 (FQDN, URL, TLS) |
| 상태 저장 | Stateful | Stateful |
| 적용 범위 | 서브넷/NIC 단위 | 중앙 집중 (Hub) |
| FQDN 기반 필터링 | ✗ | ✓ |
| TLS 검사 | ✗ | ✓ (Premium) |
| IDPS | ✗ | ✓ (Premium) |
| SNAT/DNAT | ✗ | ✓ |
| 비용 | 무료 | 유료 (고정 + 데이터 처리) |
| 로깅 | NSG Flow Logs | Azure Monitor, Log Analytics |

> **모범 사례**: NSG와 Azure Firewall을 **함께 사용**합니다. NSG로 서브넷 수준의 기본 필터링, Azure Firewall로 중앙 집중식 L7 보안을 적용합니다.

---

### 4.4 Azure Firewall Manager

**Azure Firewall Manager**는 여러 구독과 리전에 걸친 Azure Firewall 인스턴스를 **중앙에서 관리**합니다.

> 참고: [Microsoft Learn, "Azure Firewall Manager overview"](https://learn.microsoft.com/en-us/azure/firewall-manager/overview)

주요 기능:
- 방화벽 정책의 계층적 관리 (전역 정책 → 로컬 정책)
- Secured Virtual Hub (Azure Virtual WAN 통합)
- 타사 SECaaS(Security as a Service) 통합
- DDoS Protection Plan 연결

<br>

## 5. Private Link & Private Endpoint

**Azure Private Link**를 사용하면 Azure PaaS 서비스(Storage, SQL Database 등)에 **VNet의 프라이빗 IP 주소**를 통해 접근할 수 있습니다. 트래픽은 Microsoft 백본 네트워크만 경유하며, 공용 인터넷에 노출되지 않습니다.

> 참고: [Microsoft Learn, "What is Azure Private Link?"](https://learn.microsoft.com/en-us/azure/private-link/private-link-overview)

### 5.1 핵심 개념과 NIC 주입 메커니즘

Private Endpoint를 생성하면 Azure는 지정한 서브넷에 **Network Interface(NIC)**를 주입합니다. 이 NIC는 PaaS 서비스의 특정 인스턴스에 **1:1로 매핑**됩니다.

```
Private Endpoint = 서브넷에 주입된 NIC

┌─── VNet: 10.0.0.0/16 ────────────────────────────┐
│                                                   │
│  ┌─── Subnet-App: 10.0.1.0/24 ────────────────┐  │
│  │                                             │  │
│  │  VM-1 (10.0.1.4) ──────┐                   │  │
│  │  VM-2 (10.0.1.5) ──────┤                   │  │
│  │                        │ Private IP로 접근   │  │
│  │                        ▼                    │  │
│  │  PE-NIC (10.0.1.10) ←── Private Endpoint    │  │
│  │    │                    │                   │  │
│  │    │ 매핑 대상:          │                   │  │
│  │    │ mystorage.blob...  │                   │  │
│  │    │ (이 인스턴스만!)     │                   │  │
│  └────┼────────────────────┘                   │  │
│       │                                        │  │
└───────┼────────────────────────────────────────┘  │
        │ Microsoft Backbone (공용 인터넷 미경유)     │
        ▼                                           │
┌───────────────────┐                               │
│  Azure Storage    │ ← mystorage 계정의 blob 서비스  │
│  (PaaS Instance)  │   다른 Storage 계정 접근 불가    │
└───────────────────┘   → 데이터 유출 방지 (Exfiltration Protection)
```

> 참고: [Microsoft Learn, "What is Azure Private Link? - Key benefits"](https://learn.microsoft.com/en-us/azure/private-link/private-link-overview#key-benefits) — "A private endpoint is mapped to an instance of a PaaS resource instead of the entire service"

**주요 이점:**

| &nbsp;이점&nbsp; | &nbsp;설명&nbsp; |
|---|---|
| 프라이빗 액세스 | VNet에서 프라이빗 IP로 PaaS 서비스 접근 |
| 데이터 유출 방지 | 특정 리소스 인스턴스에만 매핑, 다른 리소스 접근 차단 |
| 온프레미스 접근 | ExpressRoute/VPN을 통해 온프레미스에서 Private Endpoint 접근 가능 |
| 글로벌 연결 | 다른 리전의 서비스에도 프라이빗 연결 가능 |
| 사용자 정의 서비스 | Standard Load Balancer 뒤에 자체 서비스를 Private Link로 게시 가능 |

---

### 5.2 DNS 해석 내부 메커니즘

Private Endpoint가 동작하려면 **DNS 해석이 프라이빗 IP를 반환**해야 합니다. 이 과정이 정확하게 어떻게 이루어지는지가 Private Link의 핵심입니다.

```
DNS 해석 체인 (Private Endpoint 활성 시)

1단계: 애플리케이션이 FQDN 쿼리
   → mystorage.blob.core.windows.net

2단계: Azure DNS가 CNAME 리다이렉트
   → mystorage.blob.core.windows.net
     CNAME → mystorage.privatelink.blob.core.windows.net

3단계: Private DNS Zone에서 A 레코드 해석
   → mystorage.privatelink.blob.core.windows.net
     A → 10.0.1.10 (Private Endpoint IP)

┌─────────────────────────────────────────────────────────┐
│  DNS 해석 경로                                           │
│                                                         │
│  [공용 DNS에서]                                          │
│  mystorage.blob.core.windows.net                        │
│    ↓ CNAME                                              │
│  mystorage.privatelink.blob.core.windows.net            │
│    ↓                                                    │
│  [Private DNS Zone에서]   [공용 인터넷에서]               │
│  → A: 10.0.1.10 ✓        → A: 52.x.x.x (Public IP)    │
│    (VNet 내부)               (VNet 외부)                 │
└─────────────────────────────────────────────────────────┘

Private DNS Zone 구성:
  Zone: privatelink.blob.core.windows.net
  VNet Link: Hub-VNet (자동 등록 활성화 가능)
  A Record: mystorage → 10.0.1.10
```

> 참고: [Microsoft Learn, "Azure DNS overview"](https://learn.microsoft.com/en-us/azure/dns/dns-overview)

<br>

## 6. Service Endpoint

**VNet Service Endpoint**는 Azure 서비스에 대한 트래픽이 **Azure 백본 네트워크**를 통해 최적 경로로 라우팅되도록 하며, 서비스 방화벽 규칙에서 **VNet 기반 접근 제어**를 활성화합니다.

> 참고: [Microsoft Learn, "Virtual network service endpoints"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview)

### 6.1 동작 원리

```
Service Endpoint 적용 전/후

[적용 전]
VM (10.0.1.4) ──→ Public IP로 라우팅 ──→ Azure Storage
  Source IP: Public IP (NAT)
  경로: 공용 인터넷 또는 강제 터널링 경유 가능

[적용 후]
VM (10.0.1.4) ──→ Azure 백본 직통 ──→ Azure Storage
  Source IP: 10.0.1.4 (Private IP)
  경로: Azure 백본 네트워크 (최적 경로)
  추가: 서비스 방화벽에서 VNet/서브넷 기반 접근 허용
```

**지원되는 주요 서비스:**

| &nbsp;Azure 서비스&nbsp; | &nbsp;리소스 프로바이더&nbsp; |
|---|---|
| Azure Storage | Microsoft.Storage |
| Azure SQL Database | Microsoft.Sql |
| Azure Cosmos DB | Microsoft.AzureCosmosDB |
| Azure Key Vault | Microsoft.KeyVault |
| Azure Service Bus | Microsoft.ServiceBus |
| Azure Event Hubs | Microsoft.EventHub |

---

### 6.2 Service Endpoint vs Private Endpoint: 내부 동작 비교

두 서비스는 모두 Azure PaaS에 대한 네트워크 보안을 강화하지만, **내부 동작 방식이 근본적으로 다릅니다**:

```
내부 동작 비교

[Service Endpoint]
  ┌───────────────┐
  │  VM (10.0.1.4)│
  └──────┬────────┘
         │ Source IP: 10.0.1.4 (Private!)
         │ 서비스 엔드포인트 경로 자동 추가
         │ (VirtualNetworkServiceEndpoint next hop)
         ▼
  Azure 백본 ──→ Storage Public IP (변경 없음)
  
  특성:
  • 서비스의 Public IP는 그대로 유지
  • Source IP만 Private으로 변경 (VNet Identity 전달)
  • 서비스 방화벽에서 "허용할 VNet/서브넷" 규칙 설정
  • DNS 변경 없음
  • 경로가 BGP/UDR보다 우선 (재정의 불가)

[Private Endpoint]
  ┌───────────────┐
  │  VM (10.0.1.4)│
  └──────┬────────┘
         │ Destination: 10.0.1.10 (Private!)
         │ 일반 VNet 라우팅 사용
         ▼
  PE-NIC (10.0.1.10) ──→ Azure 백본 ──→ Storage Instance
  
  특성:
  • NIC가 서브넷에 주입 → Private IP 사용
  • DNS CNAME 리다이렉트 필수
  • 특정 리소스 인스턴스에만 매핑 (Exfiltration 방지)
  • 온프레미스에서 ExpressRoute/VPN으로 직접 접근 가능
```

> 참고: [Microsoft Learn, "Compare Private Endpoints and Service Endpoints"](https://learn.microsoft.com/en-us/azure/virtual-network/vnet-integration-for-azure-services#compare-private-endpoints-and-service-endpoints)

| &nbsp;항목&nbsp; | &nbsp;Service Endpoint&nbsp; | &nbsp;Private Endpoint&nbsp; |
|---|---|---|
| 데이터 경로 | VNet → 백본 → 서비스 Public IP | VNet → PE NIC → 백본 → 서비스 |
| Source IP | Private IP (VNet Identity) | Private IP |
| Destination IP | 서비스 Public IP (변경 없음) | Private IP (PE NIC) |
| 주소 공간 소비 | 없음 | 서브넷 IP 1개 소비 |
| 접근 범위 | **서비스 전체** (모든 Storage 계정) | **특정 인스턴스만** |
| 온프레미스 접근 | 불가 (추가 방화벽 설정 필요) | 가능 (ExpressRoute/VPN 경유) |
| 경로 우선순위 | BGP/UDR보다 우선 (재정의 불가) | 일반 VNet 라우팅 사용 |
| DNS 변경 | 불필요 | Private DNS Zone 필수 |
| 비용 | 무료 | PE 시간당 + 데이터 처리 요금 |

> **Microsoft 권장사항**: 보안 및 프라이빗 접근이 중요한 프로덕션 환경에서는 **Private Endpoint** 사용을 권장합니다. Service Endpoint은 간단한 구성과 비용이 중요한 시나리오에 적합합니다.

<br>

## 7. Azure DNS와 하이브리드 DNS

### 7.1 Azure DNS 서비스 구성

> 참고: [Microsoft Learn, "Azure DNS overview"](https://learn.microsoft.com/en-us/azure/dns/dns-overview)

```
Azure DNS 서비스
├── Azure Public DNS
│   └── 인터넷 향 DNS 도메인 호스팅
│
├── Azure Private DNS
│   ├── VNet 내부 DNS 이름 해석
│   ├── VM 자동 등록 (Autoregistration)
│   └── 사용자 정의 DNS 솔루션 불필요
│
├── Azure DNS Private Resolver
│   ├── 온프레미스 → Azure Private DNS Zone 쿼리 (인바운드)
│   ├── Azure → 온프레미스 DNS 쿼리 (아웃바운드)
│   └── VM 기반 DNS 서버 대체
│
└── Azure Traffic Manager
    ├── DNS 기반 트래픽 로드 밸런싱
    ├── 라우팅 방법: 우선순위, 가중치, 성능, 지리적
    └── 엔드포인트 상태 모니터링
```

---

### 7.2 하이브리드 DNS 아키텍처 (DNS Private Resolver)

온프레미스에서 Private Endpoint에 접근하려면, 온프레미스 DNS가 `privatelink.*` 영역을 **Azure DNS로 조건부 포워딩**해야 합니다. **Azure DNS Private Resolver**가 이를 해결합니다.

> 참고: [Microsoft Learn, "Azure DNS Private Resolver"](https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview)

```
하이브리드 DNS 아키텍처 (DNS Private Resolver)

On-Premises                              Azure
┌──────────────┐                  ┌────────────────────────────┐
│  DC DNS      │                  │  Hub VNet                  │
│  Server      │                  │                            │
│              │                  │  ┌──────────────────────┐  │
│  조건부 포워딩:│ ExpressRoute    │  │ DNS Private Resolver │  │
│  privatelink.│ ──────────────→  │  │                      │  │
│  *.core...   │                  │  │ Inbound Endpoint     │  │
│  → Resolver  │                  │  │ (10.0.0.4)           │  │
│    Inbound IP│                  │  │                      │  │
│              │                  │  │ Outbound Endpoint    │  │
│              │  ←────────────── │  │ (온프레미스 DNS 질의)  │  │
│              │                  │  └──────────┬───────────┘  │
└──────────────┘                  │             │              │
                                  │  ┌──────────▼───────────┐  │
                                  │  │  Private DNS Zone    │  │
                                  │  │  privatelink.blob... │  │
                                  │  │  A: mystorage→10.0.1.10│ │
                                  │  └──────────────────────┘  │
                                  └────────────────────────────┘

흐름:
  ① 온프레미스 VM이 mystorage.blob.core.windows.net 쿼리
  ② DC DNS → CNAME → privatelink.blob... → Resolver Inbound로 포워딩
  ③ Resolver가 Private DNS Zone에서 10.0.1.10 반환
  ④ 온프레미스 VM → ExpressRoute → Private Endpoint (10.0.1.10) 접근
```

<br>

## 8. 엔터프라이즈 네트워크 레퍼런스 아키텍처

지금까지 다룬 모든 구성 요소를 결합한 엔터프라이즈급 Azure 네트워크 레퍼런스 아키텍처입니다:

```
                              Internet
                                 │
                           Azure DDoS
                            Protection
                                 │
                        ┌────────▼────────┐
                        │  Azure Firewall │
                        │   (Hub VNet)    │
                        │  10.0.0.0/16    │
                        └──┬──────┬───┬───┘
                           │      │   │
           ┌───────────────┤      │   ├───────────────┐
           │               │      │   │               │
    ┌──────▼──────┐ ┌──────▼──┐   │  ┌▼──────────────┐
    │  Spoke-Web  │ │Spoke-App│   │  │  Spoke-Data   │
    │ 10.1.0.0/16 │ │10.2.0/16│   │  │  10.3.0.0/16  │
    │ ┌─────────┐ │ │┌───────┐│   │  │ ┌───────────┐ │
    │ │ NSG-Web │ │ ││NSG-App││   │  │ │  NSG-DB   │ │
    │ └─────────┘ │ │└───────┘│   │  │ └───────────┘ │
    └─────────────┘ └─────────┘   │  └───────────────┘
                                  │           │
                           GatewaySubnet      │ Private Endpoint
                           ┌──────▼──────┐    │
                           │ VPN Gateway │    ▼
                           │ ER Gateway  │  Azure SQL
                           └──────┬──────┘  (PaaS)
                                  │
                            On-Premises DC

네트워크 보안 계층:
  ① DDoS Protection    → 볼류메트릭 공격 방어
  ② Azure Firewall     → L7 트래픽 검사 (중앙)
  ③ NSG                → 서브넷/NIC 레벨 필터링
  ④ Private Endpoint   → PaaS 프라이빗 접근
  ⑤ Service Endpoint   → Azure 백본 최적 경로
```

<br>

## 9. 전체 데이터 경로 추적: VM → Storage

지금까지의 개념을 종합하여, VM이 Azure Storage에 접근할 때 **패킷이 실제로 거치는 모든 계층**을 추적합니다.

```
시나리오: VM → Private Endpoint → Azure Storage

① VM 내부 (Guest OS)
   APP → TCP SYN → 10.0.1.10:443
   ↓

② VM NIC (Accelerated Networking 활성 시)
   ├── VF Interface (mlx5) → SR-IOV → Physical NIC 직접
   │   (NSG 정책은 NIC 하드웨어에서 오프로드 평가)
   └── 또는 Synthetic → Virtual Switch → VFP 정책 평가 → Physical NIC
   ↓

③ Azure Host Physical NIC
   패킷이 호스트 ToR(Top-of-Rack) 스위치로 전송
   ↓

④ 데이터센터 네트워크
   ToR → Aggregation → Core 스위치
   ↓

⑤ Microsoft 백본 WAN (Private Endpoint이므로 프라이빗 경로)
   동일 리전 내: DC 내부 패브릭
   크로스 리전: 글로벌 백본 광섬유
   ↓

⑥ Azure Storage 서비스 프론트엔드
   Private Endpoint NIC 매핑으로 특정 Storage 계정 도달
   ↓

⑦ 응답: 역순으로 반환 (Stateful — 원래 경로 추적)
```

> 이 흐름에서 [이전 포스트]({% post_url Azure_Study/2026-02-11-azure-network(1) %})의 핵심 개념이 모두 연결됩니다: **VFP/SR-IOV**(②), **NSG 정책 평가**(②), **글로벌 백본**(⑤), **Private Endpoint NIC 매핑**(⑥).

<br>

## 10. 마치며: 체크리스트

**하이브리드 연결:**
- [ ] 워크로드 중요도에 따라 VPN Gateway 또는 ExpressRoute 선택
- [ ] ExpressRoute + VPN 공존으로 장애 조치 경로 구성
- [ ] ExpressRoute MSEE와 고객 PE 간 BGP 세션 구조 이해
- [ ] BGP Community 값으로 리전별 경로 최적화 검토
- [ ] Private/Microsoft Peering의 용도 차이 파악

**Azure Firewall:**
- [ ] Hub VNet에 중앙 배포, 스포크 트래픽을 UDR로 강제
- [ ] 환경에 맞는 SKU 선택 (Basic/Standard/Premium)
- [ ] Azure Firewall Manager로 다중 인스턴스 관리
- [ ] 진단 로깅을 Log Analytics에 전송

**프라이빗 접근:**
- [ ] 프로덕션 PaaS 리소스에 Private Endpoint 적용
- [ ] Private Endpoint의 NIC 주입 메커니즘 이해
- [ ] DNS CNAME 체인(FQDN → privatelink.* → Private IP) 설명 가능
- [ ] Service Endpoint와 Private Endpoint의 내부 동작 차이 설명 가능
- [ ] PaaS 서비스의 공용 네트워크 접근 비활성화

**DNS:**
- [ ] Private DNS Zone 구성 및 VNet Link 설정
- [ ] DNS Private Resolver로 하이브리드 DNS 해석 통합
- [ ] 온프레미스 DNS 조건부 포워딩 구성

**네트워크 모니터링:**
- [ ] Azure Network Watcher 활성화
- [ ] NSG Flow Logs → Log Analytics 전송
- [ ] Azure Firewall 로그 → KQL 대시보드 구성
- [ ] Connection Monitor로 하이브리드 연결 상태 모니터링

<br>

<!--
## 참고문헌

1. [Microsoft Learn, "What is Azure VPN Gateway?"](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)
2. [Microsoft Learn, "What is Azure ExpressRoute?"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction)
3. [Microsoft Learn, "ExpressRoute routing requirements"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing)
4. [Microsoft Learn, "What is Azure Firewall?"](https://learn.microsoft.com/en-us/azure/firewall/overview)
5. [Microsoft Learn, "Azure Firewall Manager overview"](https://learn.microsoft.com/en-us/azure/firewall-manager/overview)
6. [Microsoft Learn, "What is Azure Private Link?"](https://learn.microsoft.com/en-us/azure/private-link/private-link-overview)
7. [Microsoft Learn, "Virtual network service endpoints"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview)
8. [Microsoft Learn, "Compare Private Endpoints and Service Endpoints"](https://learn.microsoft.com/en-us/azure/virtual-network/vnet-integration-for-azure-services#compare-private-endpoints-and-service-endpoints)
9. [Microsoft Learn, "Azure DNS overview"](https://learn.microsoft.com/en-us/azure/dns/dns-overview)
10. [Microsoft Learn, "Azure DNS Private Resolver"](https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview)
11. [Microsoft Learn, "Network security groups"](https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview)
12. [Microsoft Learn, "Azure virtual network traffic routing"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview)
13. [Microsoft Learn, "Azure networking documentation"](https://learn.microsoft.com/en-us/azure/networking/)
-->
