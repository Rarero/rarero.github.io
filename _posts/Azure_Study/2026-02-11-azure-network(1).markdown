---
layout: post
title: "Azure Network (1): Azure 네트워크의 기초와 동작 원리"
date: 2026-02-11 09:00:00 +0900
tags: [Study, Azure, Network, VNet, Subnet, NSG, UDR, Peering, Backbone, SDN, Accelerated Networking]
categories: Azure_Study
---

클라우드 인프라에서 **네트워크**는 모든 리소스 간 통신의 기반입니다.

Azure에서는 **Virtual Network(VNet)**를 중심으로 서브넷, 보안 그룹, 라우팅, 피어링 등 다양한 네트워킹 기능을 제공하며, 이를 통해 온프레미스와 동일한 수준의 네트워크 격리와 제어를 클라우드에서 구현할 수 있습니다.

이번 포스트에서는 Azure 네트워킹의 **기본 구성 요소**부터, 이들이 실제로 동작하는 **Microsoft 글로벌 백본 네트워크**와 **Azure 호스트의 패킷 처리 아키텍처**까지 체계적으로 살펴보겠습니다.

> 참고: [Microsoft Learn, "Azure Virtual Network overview"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-overview)

<br>

## 1. Azure Virtual Network (VNet)

**Azure Virtual Network(VNet)**는 Azure에서 프라이빗 네트워크를 구축하기 위한 **기본 빌딩 블록**입니다. VNet을 통해 Azure 리소스(VM, App Service, AKS 등)는 서로, 인터넷, 그리고 온프레미스 네트워크와 안전하게 통신할 수 있습니다.

### 1.1 VNet의 핵심 특성

```
VNet 핵심 특성
├── 주소 공간 (Address Space)
│   └── RFC 1918 프라이빗 IP 범위 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
├── 리전 범위 (Region Scope)
│   └── 단일 리전에 종속, 모든 가용 영역(Availability Zone)에 걸침
├── 격리 (Isolation)
│   └── VNet 간 트래픽은 기본적으로 격리됨
├── 비용
│   └── VNet 자체는 무료 (일부 기능은 과금)
└── 구독 제한
    └── 구독당 최대 1,000개 VNet
```

---

### 1.2 VNet이 제공하는 주요 시나리오

| &nbsp;시나리오&nbsp; | &nbsp;설명&nbsp; | &nbsp;관련 기능&nbsp; |
|---|---|---|
| 인터넷 통신 | 아웃바운드: 기본 제공 / 인바운드: Public IP 또는 Load Balancer | Public IP, NAT Gateway |
| Azure 리소스 간 통신 | 동일 VNet 내 리소스 간 프라이빗 통신 | Subnet, Service Endpoint |
| 온프레미스 연결 | 하이브리드 네트워크 구성 | VPN Gateway, ExpressRoute |
| 트래픽 필터링 | 서브넷 간 트래픽 제어 | NSG, Azure Firewall, NVA<sup>1</sup> |
| 트래픽 라우팅 | 커스텀 경로 설정 | UDR, BGP<sup>2</sup> |
| Azure 서비스 통합 | PaaS 서비스에 VNet 접근 | Service Endpoint, Private Link |

> <sup>1</sup> **NVA (Network Virtual Appliance)**는 Azure 관리형 네트워크 서비스 자체라기보다, 방화벽/프록시/IDS 같은 네트워크 기능을 VM 기반 가상 어플라이언스로 배포하는 패턴입니다.
>
> <sup>2</sup> **BGP (Border Gateway Protocol)**는 Azure 서비스가 아니라 경로 교환을 위한 라우팅 프로토콜이며, VPN Gateway/ExpressRoute 같은 연결 구성에서 경로 전파에 사용됩니다.

<br>

## 2. Subnet (서브넷)

VNet은 하나 이상의 **Subnet(서브넷)**으로 분할됩니다. 서브넷은 VNet 주소 공간의 하위 범위이며, **NSG** 및 **라우트 테이블**을 서브넷 단위로 연결하여 트래픽을 제어합니다.

### 2.1 서브넷 설계 원칙

```
VNet: 10.0.0.0/16 (65,536 IPs)
│
├── Subnet-Web:        10.0.1.0/24     (256 IPs, 사용 가능: 251)
│   └── NSG-Web 연결
│
├── Subnet-App:        10.0.2.0/24     (256 IPs, 사용 가능: 251)
│   └── NSG-App 연결
│
├── Subnet-DB:         10.0.3.0/24     (256 IPs, 사용 가능: 251)
│   └── NSG-DB 연결
│
├── AzureFirewallSubnet: 10.0.255.0/26 (Azure Firewall 전용)
│
└── GatewaySubnet:     10.0.254.0/27   (VPN/ExpressRoute Gateway 전용)
```

> **주의**: Azure는 각 서브넷에서 **5개의 IP 주소를 예약**합니다.
> - x.x.x.**0**: 네트워크 주소
> - x.x.x.**1**: Azure 기본 게이트웨이
> - x.x.x.**2, 3**: Azure DNS 매핑
> - x.x.x.**255**: 브로드캐스트 주소

---

### 2.2 특수 목적 서브넷

| &nbsp;서브넷 이름&nbsp; | &nbsp;용도&nbsp; | &nbsp;최소 크기&nbsp; |
|---|---|---|
| GatewaySubnet | VPN/ExpressRoute Gateway 배포 | /27 권장 |
| AzureFirewallSubnet | Azure Firewall 배포 | /26 필수 |
| AzureBastionSubnet | Azure Bastion 배포 | /26 이상 |
| RouteServerSubnet | Azure Route Server 배포 | /27 |

<br>

## 3. Network Security Group (NSG)

**NSG**는 Azure 네트워크에서 트래픽을 필터링하는 **상태 저장(stateful) 방화벽** 역할을 합니다. 인바운드/아웃바운드 보안 규칙을 통해 5-튜플 기반으로 트래픽을 허용하거나 거부합니다.

### 3.1 5-튜플 매칭

```
보안 규칙 평가 기준 (5-Tuple)
┌─────────────────────────────────────────────────┐
│  ① Source IP/CIDR                               │
│  ② Source Port                                  │
│  ③ Destination IP/CIDR                          │
│  ④ Destination Port                             │
│  ⑤ Protocol (TCP / UDP / ICMP / Any)            │
└─────────────────────────────────────────────────┘
        ↓
    Priority 기반 평가 (100~4096, 낮을수록 우선)
        ↓
    ┌─ Allow → 트래픽 통과
    └─ Deny  → 트래픽 차단
```

---

### 3.2 기본 규칙 (Default Rules)

NSG는 생성 시 **삭제할 수 없는** 기본 규칙을 포함합니다:

**인바운드 기본 규칙:**

| &nbsp;우선순위&nbsp; | &nbsp;이름&nbsp; | &nbsp;Source&nbsp; | &nbsp;Destination&nbsp; | &nbsp;동작&nbsp; |
|---|---|---|---|---|
| 65000 | AllowVNetInBound | VirtualNetwork | VirtualNetwork | Allow |
| 65001 | AllowAzureLoadBalancerInBound | AzureLoadBalancer | Any | Allow |
| 65500 | DenyAllInbound | Any | Any | Deny |

**아웃바운드 기본 규칙:**

| &nbsp;우선순위&nbsp; | &nbsp;이름&nbsp; | &nbsp;Source&nbsp; | &nbsp;Destination&nbsp; | &nbsp;동작&nbsp; |
|---|---|---|---|---|
| 65000 | AllowVNetOutBound | VirtualNetwork | VirtualNetwork | Allow |
| 65001 | AllowInternetOutBound | Any | Internet | Allow |
| 65500 | DenyAllOutBound | Any | Any | Deny |

> NSG는 **상태 저장(Stateful)**입니다. 인바운드에서 허용된 트래픽의 응답은 아웃바운드 규칙과 관계없이 자동 허용됩니다.

---

### 3.3 Service Tag와 ASG

**Service Tag**는 Azure 서비스의 IP 주소 그룹을 나타내는 미리 정의된 태그입니다. Microsoft가 자동으로 IP 범위를 관리하므로 수동 업데이트가 필요 없습니다.

```
주요 Service Tag 예시
├── VirtualNetwork     : VNet 주소 공간 + 피어링된 VNet + 온프레미스
├── AzureLoadBalancer  : Azure 인프라 로드밸런서
├── Internet           : VNet 외부의 공용 IP 공간
├── Storage            : Azure Storage 서비스 IP 범위
├── Sql                : Azure SQL Database IP 범위
├── AzureMonitor       : Azure Monitor 서비스 IP 범위
└── AppService         : Azure App Service IP 범위
```

**Application Security Group (ASG)**는 VM을 논리적으로 그룹화하여 NSG 규칙에서 참조할 수 있게 합니다:

```
예시: ASG 기반 NSG 규칙

ASG: WebServers (VM1, VM2, VM3)
ASG: DBServers  (VM4, VM5)

규칙: WebServers → DBServers, Port 1433, Allow
  → 개별 IP 대신 논리 그룹으로 관리
  → VM 추가/제거 시 규칙 변경 불필요
```

---

### 3.4 Security Admin Rules (Virtual Network Manager)

**Azure Virtual Network Manager**의 **Security Admin Rules**은 NSG보다 **높은 우선순위**로 평가됩니다. 조직 수준에서 강제적인 네트워크 정책을 적용할 때 사용합니다.

```
트래픽 평가 순서
┌──────────────────────────────┐
│ ① Security Admin Rules       │  ← 조직 관리자 (최우선)
│ ② NSG Rules                  │  ← 리소스 소유자
│ ③ Default Rules              │  ← Azure 기본 규칙
└──────────────────────────────┘
```

<br>

## 4. 트래픽 라우팅 (Routing)

Azure는 VNet 내의 각 서브넷에 대해 **자동으로 라우트 테이블(시스템 경로)**을 생성하며, 필요에 따라 **사용자 정의 경로(UDR)**로 기본 동작을 재정의할 수 있습니다.

### 4.1 시스템 경로 (System Routes)

VNet이 생성되면 Azure는 각 서브넷에 다음 **기본 시스템 경로**를 자동 추가합니다:

| &nbsp;Source&nbsp; | &nbsp;주소 접두사&nbsp; | &nbsp;다음 홉 유형&nbsp; |
|---|---|---|
| Default | VNet 주소 범위 | Virtual network |
| Default | 0.0.0.0/0 | Internet |
| Default | 10.0.0.0/8 | None |
| Default | 172.16.0.0/12 | None |
| Default | 192.168.0.0/16 | None |
| Default | 100.64.0.0/10 | None |

> **다음 홉 유형 설명**:
> - **Virtual network**: VNet 주소 공간 내의 트래픽을 서브넷 간 직접 라우팅
> - **Internet**: 0.0.0.0/0 접두사 → Azure 서비스 트래픽은 백본 네트워크를 통해, 나머지는 인터넷으로
> - **None**: RFC 1918 프라이빗 주소로 향하는 트래픽을 드롭 (VNet 주소 공간에 포함되면 Virtual network으로 변경)

---

### 4.2 선택적 시스템 경로 (Optional System Routes)

특정 Azure 기능을 활성화하면 추가 시스템 경로가 자동 생성됩니다:

| &nbsp;기능&nbsp; | &nbsp;주소 접두사&nbsp; | &nbsp;다음 홉 유형&nbsp; | &nbsp;적용 범위&nbsp; |
|---|---|---|---|
| VNet Peering | 피어링된 VNet 주소 범위 | VNet peering | 모든 서브넷 |
| VNet Gateway | BGP 또는 로컬 네트워크 게이트웨이 접두사 | Virtual network gateway | 모든 서브넷 |
| Service Endpoint | 서비스의 공용 IP | VirtualNetworkServiceEndpoint | 활성화된 서브넷만 |

---

### 4.3 사용자 정의 경로 (UDR: User-Defined Routes)

UDR은 Azure의 기본 시스템 경로를 **재정의(Override)**하여 트래픽 흐름을 커스텀할 수 있습니다. 라우트 테이블을 만들어 서브넷에 연결합니다.

```
UDR 대표 시나리오: NVA를 통한 강제 터널링

인터넷 트래픽 → Subnet → UDR(0.0.0.0/0 → NVA) → 방화벽 검사 → 인터넷

┌──────────┐     ┌──────────────┐     ┌────────────┐
│  Subnet  │────▶│   NVA/FW     │────▶│  Internet  │
│  (VM)    │     │  10.0.100.4  │     │            │
└──────────┘     └──────────────┘     └────────────┘
     ↑
  UDR: 0.0.0.0/0
  Next Hop: Virtual Appliance
  Next Hop IP: 10.0.100.4
```

**UDR에서 지정 가능한 다음 홉 유형:**

| &nbsp;다음 홉 유형&nbsp; | &nbsp;설명&nbsp; |
|---|---|
| Virtual appliance | NVA(방화벽, 프록시 등)로 트래픽 전달. IP 포워딩 활성화 필요 |
| Virtual network gateway | VPN Gateway로 트래픽 전달 (ExpressRoute는 지원 안 함) |
| Virtual network | VNet 내 기본 라우팅 재정의 |
| Internet | 특정 주소를 인터넷으로 명시적 라우팅 |
| None | 트래픽 드롭 (블랙홀) |

---

### 4.4 경로 선택 우선순위

동일한 주소 접두사에 대해 여러 경로가 존재하면, Azure는 다음 우선순위로 선택합니다:

```
경로 선택 우선순위
1. 사용자 정의 경로 (UDR)        ← 최우선
2. BGP 경로
3. 시스템 경로 (System Route)

※ 동일 접두사인 경우 Longest Prefix Match 적용
   예) 10.0.0.0/24 vs 10.0.0.0/16 → /24 우선
```

> **주의**: VNet 서비스 엔드포인트 경로는 BGP나 UDR보다 우선합니다. 이 경로는 재정의할 수 없습니다.

---

### 4.5 Service Tag 기반 UDR

UDR의 주소 접두사 대신 **Service Tag**를 사용할 수 있습니다. Microsoft가 IP 범위를 자동 관리하므로 유지보수가 간편합니다.

```bash
# Azure CLI 예시: Storage 트래픽을 NVA로 라우팅
az network route-table route create \
    --resource-group MyResourceGroup \
    --route-table-name MyRouteTable \
    --name StorageRoute \
    --address-prefix Storage \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address 10.0.100.4
```

> 라우트 테이블당 Service Tag 경로는 최대 **25개**까지 생성 가능합니다.

<br>

## 5. VNet Peering (가상 네트워크 피어링)

**VNet Peering**은 두 개 이상의 VNet을 **Microsoft 백본 네트워크**를 통해 **직접 연결**하는 방법입니다. 피어링된 VNet 간 트래픽은 공용 인터넷을 거치지 않으므로 **높은 대역폭과 낮은 지연 시간**을 보장합니다.

### 5.1 피어링 유형

```
VNet Peering 유형
├── Local Peering (동일 리전)
│   ├── 동일 리전 내 두 VNet 연결
│   └── 지연 시간: 최소 (리전 내 백본)
│
└── Global Peering (크로스 리전)
    ├── 서로 다른 Azure 리전의 VNet 연결
    └── 지연 시간: 리전 간 백본 네트워크 경유
```

---

### 5.2 피어링 핵심 특성

| &nbsp;특성&nbsp; | &nbsp;설명&nbsp; |
|---|---|
| 비전이적(Non-transitive) | VNet-A ↔ VNet-B, VNet-B ↔ VNet-C 연결 시, VNet-A와 VNet-C는 자동 연결 안 됨 |
| 주소 공간 겹침 불가 | 피어링하려면 VNet 주소 공간이 겹치면 안 됨 |
| 양방향 설정 필요 | 양쪽 VNet에서 각각 피어링 설정 필요 |
| 기본 피어 제한 | VNet당 최대 **500개** (Virtual Network Manager로 1,000개까지 확장) |
| 과금 | Ingress/Egress에 소액의 데이터 전송 요금 부과 |

---

### 5.3 게이트웨이 전송 (Gateway Transit)

게이트웨이 전송을 사용하면 **허브 VNet에 배포된 VPN/ExpressRoute Gateway**를 스포크 VNet에서 공유할 수 있습니다.

```
Hub-Spoke 토폴로지에서 Gateway Transit

              On-Premises
                  │
            VPN / ExpressRoute
                  │
          ┌───────▼───────┐
          │   Hub VNet    │
          │  (Gateway)    │
          │  10.0.0.0/16  │◄── "Allow Gateway Transit" 활성화
          └──┬─────────┬──┘
    Peering  │         │  Peering
             │         │
     ┌───────▼──┐  ┌───▼───────┐
     │ Spoke-1  │  │ Spoke-2   │
     │ 10.1.0/16│  │ 10.2.0/16 │◄── "Use Remote Gateway" 활성화
     └──────────┘  └───────────┘
```

> **장점**: 각 스포크 VNet에 별도 게이트웨이를 배포하지 않아도 됨 → **비용 절감**

---

### 5.4 서비스 체이닝 (Service Chaining)

UDR과 피어링을 **조합**하면, 한 VNet의 트래픽을 피어링된 VNet의 NVA(방화벽)를 통해 라우팅할 수 있습니다.

```
서비스 체이닝 예시

Spoke VNet (10.1.0.0/16)
  └── UDR: 0.0.0.0/0 → Hub NVA (10.0.100.4)
                │
        Peering │
                ▼
Hub VNet (10.0.0.0/16)
  └── NVA Subnet (10.0.100.0/24)
        └── Firewall VM (10.0.100.4) → 검사 후 인터넷 또는 온프레미스
```

<br>

## 6. Microsoft 글로벌 네트워크 (WAN Backbone)

앞서 살펴본 VNet, NSG, UDR 등은 모두 **논리적 구성 요소**입니다. 이들이 실제로 어떤 물리적 인프라 위에서 동작하는지 이해하려면, Azure의 기반인 **Microsoft 글로벌 네트워크**를 알아야 합니다.

> 참고: [Microsoft Learn, "Microsoft global network"](https://learn.microsoft.com/en-us/azure/networking/microsoft-global-network)

### 6.1 백본 인프라 규모

Microsoft는 세계에서 **가장 큰 백본 네트워크 중 하나**를 소유하고 운영합니다:

```
Microsoft 글로벌 네트워크 규모
├── 광섬유 총 길이: 165,000+ 마일 (265,000+ km)
├── 데이터센터 리전: 61개 Azure 리전
├── 엣지 노드: 175+ 글로벌 위치
├── 인터넷 피어링: 4,000+ 고유 ISP 파트너
├── 해저 케이블: MAREA, AEC, NCP 등 다수
└── 서비스 대상: Azure, Microsoft 365, Xbox, Bing, Dynamics 365
```

핵심은 **모든 Azure 서비스 간 트래픽이 공용 인터넷을 거치지 않는다**는 것입니다. VM 간 통신, Storage 접근, SQL Database 쿼리 — 모두 Microsoft 글로벌 WAN 내부에서 처리됩니다.

> 참고: [Microsoft Learn, "Microsoft global network"](https://learn.microsoft.com/en-us/azure/networking/microsoft-global-network) — "any traffic between data centers, within Microsoft Azure or between Microsoft services routes within our global network and never over the public Internet"

---

### 6.2 Cold Potato Routing vs Hot Potato Routing

Azure가 다른 클라우드 제공자와 **근본적으로 다른 점** 중 하나가 라우팅 전략입니다.

```
라우팅 전략 비교

[Hot Potato Routing] (타 제공자 방식)
  사용자 → ISP → 가장 가까운 엣지에서 즉시 공용 인터넷으로 핸드오프
  → 인터넷을 통해 목적지까지 이동
  → 경로 품질이 인터넷 상태에 의존

[Cold Potato Routing] (Microsoft 방식)
  사용자 → ISP → Microsoft 엣지 노드 (가장 가까운 POP)
  → Microsoft WAN 백본을 통해 목적지 리전까지 이동
  → 최종 목적지 근처에서 비로소 백본 외부로 핸드오프
  → 트래픽이 Microsoft 네트워크에 가능한 오래 머무름

예시: 런던 사용자 → 도쿄 서비스 접근
  ① 런던 엣지 노드에서 MS 백본 진입
  ② 프랑스 → Trans-Arabia 경로 → 인도 → 일본
  ③ 도쿄 리전에서 서비스 도달
  ④ 응답은 동일한 경로를 대칭적(Symmetric)으로 반환
```

> 참고: [Microsoft Learn, "Microsoft global network - Get the premium cloud network"](https://learn.microsoft.com/en-us/azure/networking/microsoft-global-network#get-the-premium-cloud-network) — "At Microsoft, we choose and utilize direct interconnects instead of transit-links"

Cold Potato Routing은 패킷이 Microsoft 네트워크 안에 **가능한 오래 머무르도록** 합니다. 이는 **지연 시간, 지터, 패킷 손실** 측면에서 일관된 품질을 보장합니다.

---

### 6.3 소프트웨어 정의 네트워크 관리

Microsoft는 글로벌 네트워크를 **소프트웨어 정의(SDN) 방식**으로 운영합니다:

```
운영 원칙
├── 통합 SDN 기술로 모든 하드웨어 요소 제어
│   └── 중복 제거 및 장애 감소
├── 프로덕션 네트워크의 미러 환경 구축
│   └── 수백만 건의 시뮬레이션으로 변경 사항 검증
├── 제로 다운타임 업데이트
│   └── 수 주가 아닌 수 시간 내 롤아웃
├── 클라우드 기반 모니터링
│   └── 완전 자동화된 장애 완화
└── 최고 수준의 스위칭 하드웨어
    └── 네트워크 계층별 최적 장비 배치
```

> 참고: [Microsoft Learn, "Microsoft global network - Well managed using software-defined innovation"](https://learn.microsoft.com/en-us/azure/networking/microsoft-global-network#well-managed-using-software-defined-innovation) — "Use unified and software-defined Networking technology to control all hardware elements in the network"

<br>

## 7. Azure 호스트 네트워킹: 패킷은 어떻게 흐르는가

Azure VM이 네트워크 패킷을 보내거나 받을 때, 패킷은 **Azure 호스트의 가상 스위치(Virtual Switch)**를 거칩니다. 이 과정을 이해하면 NSG, UDR, VNet Peering이 실제로 **어디에서** 적용되는지 알 수 있습니다.

> 참고: [Microsoft Learn, "Accelerated Networking overview"](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview)

### 7.1 기본 데이터 경로 (Virtual Switch)

```
기본 데이터 경로 (Accelerated Networking 미적용)

┌───────────────────────────────────────────────────┐
│                    Azure Host                     │
│                                                   │
│  ┌─────────┐                                      │
│  │   VM    │                                      │
│  │  ┌────┐ │    Synthetic NIC                     │
│  │  │vNIC│ │ ←→ (VMbus/netvsc 드라이버)            │
│  │  └────┘ │          │                           │
│  └─────────┘          │                           │
│                       ▼                           │
│              ┌─────────────────┐                  │
│              │  Virtual Switch │ ← 모든 정책 적용  │
│              │   (VFP 엔진)    │   - NSG 규칙      │
│              │                 │   - UDR 라우팅    │
│              │                 │   - VNet 격리     │
│              │                 │   - 부하 분산     │
│              └────────┬────────┘                  │
│                       │                           │
│              ┌────────▼────────┐                  │
│              │  Physical NIC   │                  │
│              │  (Mellanox)     │                  │
│              └────────┬────────┘                  │
└───────────────────────┼───────────────────────────┘
                        │
                   DC 물리 네트워크
```

핵심은 **VFP(Virtual Filtering Platform)** 엔진입니다. Azure의 모든 네트워크 정책 — NSG, UDR, VNet 격리, 서브넷 라우팅 — 은 이 가상 스위치에서 소프트웨어적으로 실행됩니다. VM은 이 정책의 존재를 알지 못합니다.

> 참고: [Microsoft Learn, "Accelerated Networking overview"](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview) — "The virtual switch provides all policy enforcement to network traffic. Policies include network security groups, access control lists, isolation, and other network virtualized services."

---

### 7.2 Accelerated Networking: SR-IOV로 호스트 우회

**Accelerated Networking**은 SR-IOV(Single Root I/O Virtualization)를 사용하여 **가상 스위치를 우회**합니다. 이는 Azure 네트워킹 성능에서 가장 큰 차이를 만드는 기능입니다.

> 참고: [Microsoft Learn, "How Accelerated Networking works in Linux and FreeBSD VMs"](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-how-it-works)

```
Accelerated Networking 데이터 경로

┌───────────────────────────────────────────────────┐
│                    Azure Host                     │
│                                                   │
│  ┌─────────┐                                      │
│  │   VM    │                                      │
│  │  ┌────┐ │    ① Synthetic NIC (eth0)            │
│  │  │vNIC│ │ ←→ netvsc 드라이버 (제어/폴백 경로)    │
│  │  │    │ │                                      │
│  │  │ VF │ │ ←→ ② SR-IOV VF (enP53091s1np0)       │
│  │  └────┘ │    mlx5 드라이버 (고속 데이터 경로)     │
│  └─────────┘          │                           │
│                       │ ← 가상 스위치 우회!         │
│              ┌────────┼────────┐                  │
│              │  Virtual Switch │ (우회됨)          │
│              └─────────────────┘                  │
│                       │                           │
│              ┌────────▼────────┐                  │
│              │  Physical NIC   │ ← 정책을 하드웨어에│
│              │  (Mellanox)     │   오프로드        │
│              └────────┬────────┘                  │
└───────────────────────┼───────────────────────────┘
                        │
                   DC 물리 네트워크
```

**동작 원리:**

1. VM에 **두 개의 네트워크 인터페이스**가 생성됩니다
   - **Synthetic NIC** (`eth0`): VMbus 기반, netvsc 드라이버 — 제어 경로 및 폴백
   - **VF(Virtual Function)** (`enP*`): SR-IOV, mlx5 드라이버 — **고속 데이터 경로**
2. 두 인터페이스는 **동일한 MAC 주소**를 공유하며 **자동 본딩(bonding)** 됩니다
3. NSG 등의 정책은 **물리 NIC 하드웨어에서 직접 적용** (오프로드)
4. 호스트 유지보수 시 VF가 일시 제거되면, **synthetic NIC로 자동 폴백** (30초~수 분)

> 참고: [Microsoft Learn, "Accelerated Networking overview - Benefits"](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview#benefits) — "Removing the virtual switch from the data path eliminates the time that packets spend in the host for policy processing"

---

### 7.3 성능 영향

| &nbsp;항목&nbsp; | &nbsp;Virtual Switch 경유&nbsp; | &nbsp;Accelerated Networking&nbsp; |
|---|---|---|
| 지연 시간 (Latency) | 호스트 CPU에서 정책 처리 후 전달 | 하드웨어 직접 전달 → **대폭 감소** |
| 초당 패킷 수 (PPS) | 호스트 CPU 처리량에 제한 | NIC 하드웨어 처리 → **대폭 증가** |
| 지터 (Jitter) | CPU 부하에 따라 변동 | 하드웨어 오프로드로 **일관됨** |
| CPU 사용량 | 네트워크 처리에 CPU 소비 | 네트워크 처리 부담 **제거** |

> 참고: [Microsoft Learn, "Accelerated Networking overview"](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview) — "Bypassing the virtual switch in the host leads to less CPU utilization for processing network traffic"

**호스트 서비스 이벤트 시 동작:**

Azure 호스트가 유지보수(하이퍼바이저 업그레이드, 네트워크 인프라 업데이트 등)를 수행할 때, VF 인터페이스가 **일시적으로 제거**됩니다. 이 기간 동안 트래픽은 자동으로 synthetic NIC를 통해 흐르며, 유지보수 완료 후 VF가 복원됩니다. 애플리케이션이 VF가 아닌 **synthetic 인터페이스에만 바인딩**해야 하는 이유입니다.

> 참고: [Microsoft Learn, "How Accelerated Networking works - Azure host servicing"](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-how-it-works#azure-host-servicing)

<br>

## 8. VNet Encryption: 데이터센터 내부 암호화

Azure는 데이터센터 간 트래픽을 기본적으로 MACsec(IEEE 802.1AE)으로 암호화합니다. **VNet Encryption**은 여기에 더해 **VNet 내부 VM 간 트래픽**까지 암호화하는 기능입니다.

> 참고: [Microsoft Learn, "What is Azure Virtual Network encryption?"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-encryption-overview)

```
VNet Encryption 동작

VM-A (10.0.1.4)              VM-B (10.0.2.4)
      │                            │
      │         DTLS 터널           │
      └─────── 암호화됨 ────────────┘
               (자동 설정)

지원 범위:
  ✓ 동일 VNet 내 VM 간
  ✓ 피어링된 VNet 간 (Local & Global Peering)
  ✓ Virtual Machine Scale Sets

요구 사항:
  • Accelerated Networking 필수 (SR-IOV 기반 암호화)
  • Accelerated Networking 지원 VM SKU (D/E/F 시리즈 v4 이상 등 AN 지원 SKU)
```

> **주의**: VNet Encryption 활성화된 VNet에서는 Azure Firewall, Application Gateway, DNS Private Resolver가 **지원되지 않습니다**. 또한 **ExpressRoute Gateway가 연결된 VNet에는 VNet Encryption을 활성화하지 마세요** (온프레미스 통신 장애 발생).

> 참고: [Microsoft Learn, "VNet encryption - Limitations"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-encryption-overview#limitations)

<br>

## 9. 마치며: 체크리스트

**VNet & 서브넷:**
- [ ] VNet 주소 공간을 충분히 크게 설계 (향후 확장 고려)
- [ ] 서브넷을 워크로드 역할별로 분리 (Web/App/DB/관리)
- [ ] 특수 서브넷(GatewaySubnet, AzureFirewallSubnet 등) 사전 계획
- [ ] 온프레미스와 겹치지 않는 주소 공간 선택

**NSG:**
- [ ] 모든 서브넷에 NSG 연결 (기본 거부 → 필요한 트래픽만 허용)
- [ ] Service Tag 활용으로 규칙 관리 단순화
- [ ] ASG로 VM 그룹 관리
- [ ] NSG Flow Logs 활성화 (트래픽 모니터링)

**라우팅:**
- [ ] 기본 라우팅 동작 이해 후 UDR 적용
- [ ] NVA에 IP 포워딩 설정 확인
- [ ] GatewaySubnet에 0.0.0.0/0 UDR 연결 금지
- [ ] BGP 경로 전파 비활성화 여부 검토

**VNet Peering:**
- [ ] Hub-Spoke 토폴로지 채택 검토
- [ ] Gateway Transit으로 게이트웨이 공유
- [ ] 주소 공간 겹침 사전 검증
- [ ] 비전이적 특성 고려한 연결 설계

**글로벌 네트워크 & 호스트 네트워킹:**
- [ ] Cold Potato vs Hot Potato 라우팅의 성능 차이를 이해하는가
- [ ] Virtual Switch(VFP)와 Accelerated Networking(SR-IOV)의 데이터 경로 차이 이해
- [ ] NSG 정책이 호스트 어디에서 평가되는지 아는가
- [ ] 호스트 유지보수 시 VF → Synthetic 폴백 동작 이해

<br>

다음 포스트 [**Azure Network (2): 하이브리드 연결과 네트워크 서비스 심층 분석**]({% post_url Azure_Study/2026-02-11-azure-network(2) %})에서는 **VPN Gateway, ExpressRoute, Azure Firewall, Private Link, Service Endpoint, Azure DNS** 등 Azure 네트워크 서비스를 하나씩 심층적으로 다루겠습니다.

<br>

<!--
## 참고문헌

1. [Microsoft Learn, "Azure Virtual Network overview"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-overview)
2. [Microsoft Learn, "Azure virtual network peering"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview)
3. [Microsoft Learn, "Network security groups"](https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview)
4. [Microsoft Learn, "Azure virtual network traffic routing"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview)
5. [Microsoft Learn, "Azure Virtual Network FAQ"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq)
6. [Microsoft Learn, "Virtual network service tags"](https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview)
7. [Microsoft Learn, "Application security groups"](https://learn.microsoft.com/en-us/azure/virtual-network/application-security-groups)
8. [Microsoft Learn, "Azure Virtual Network Manager"](https://learn.microsoft.com/en-us/azure/virtual-network-manager/overview)
9. [Microsoft Learn, "Azure networking documentation"](https://learn.microsoft.com/en-us/azure/networking/)
10. [Microsoft Learn, "Microsoft global network"](https://learn.microsoft.com/en-us/azure/networking/microsoft-global-network)
11. [Microsoft Learn, "Accelerated Networking overview"](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview)
12. [Microsoft Learn, "How Accelerated Networking works in Linux and FreeBSD VMs"](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-how-it-works)
13. [Microsoft Learn, "What is Azure Virtual Network encryption?"](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-encryption-overview)
-->
