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

> **용어 분류 기준(이 글에서의 표기):**  
> - **서비스(Service)**: Azure에서 리소스로 배포/과금/관리되는 것 (예: Azure Firewall, NAT Gateway)  
> - **기능/옵션(Feature/Option)**: 특정 서비스의 설정 항목 (예: VNet Peering, Gateway Transit)  
> - **패턴(Pattern)**: 여러 기능을 조합한 아키텍처 방식 (예: Hub-and-Spoke, Service Chaining)  
> - **기술/메커니즘(Technology/Mechanism)**: 동작 원리나 프로토콜 (예: BGP, LPM, SR-IOV)

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

일부 Azure 서비스는 **전용 서브넷에 배포**해야 합니다. 이 서비스들이 전용 서브넷을 요구하는 이유는, 서브넷 내에 **자체 인프라 리소스(게이트웨이 인스턴스, 방화벽 노드 등)를 직접 주입**하고 관리해야 하기 때문입니다. 일반 VM이나 다른 리소스와 같은 서브넷에 있으면 IP 충돌, NSG/UDR 충돌, 서비스 내부 통신 간섭 등의 문제가 발생할 수 있어 Azure가 **서브넷 이름까지 강제**하는 경우가 많습니다.

| &nbsp;서브넷 이름&nbsp; | &nbsp;용도&nbsp; | &nbsp;최소 크기&nbsp; | &nbsp;최소 크기 근거&nbsp; |
|---|---|---|---|
| GatewaySubnet | VPN/ExpressRoute Gateway 배포 | /27 권장 | Active-Active 구성 시 게이트웨이 인스턴스 2개 + 향후 ExpressRoute 공존 시 추가 인스턴스. /28까지 가능하지만 /27 이상을 권장 |
| AzureFirewallSubnet | Azure Firewall 배포 | /26 필수 | Firewall은 부하에 따라 내부적으로 **인스턴스를 자동 스케일아웃**(최대 20개)합니다. 각 인스턴스가 IP를 소비하므로 최소 64개 IP(/26)가 필요 |
| AzureBastionSubnet | Azure Bastion 배포 | /26 이상 | Bastion도 동시 접속 세션 수에 따라 내부 인스턴스를 스케일링합니다. /26은 최소이며, 50개 이상 동시 RDP/SSH 세션이 예상되면 /26 이상 필요 |
| RouteServerSubnet | Azure Route Server 배포 | /27 | Route Server 인스턴스(이중화) + 내부 관리 IP 확보. 서비스 자체가 소규모라 /27이면 충분 |

> **왜 최소 크기가 정해져 있나?**: 이 서비스들은 서브넷 안에 **여러 내부 인스턴스를 배포**하여 고가용성과 확장성을 제공합니다. 각 인스턴스가 서브넷의 프라이빗 IP를 하나씩 점유하고, Azure 예약 IP 5개도 차감되므로, 충분한 주소 공간이 없으면 **배포 실패 또는 스케일링 불가**가 발생합니다.

---

### 2.3 프라이빗 서브넷과 기본 아웃바운드 액세스 폐지

Azure는 **2025년 9월 30일**부터 새로 생성되는 VM, VMSS 등의 리소스에 대해 **기본 아웃바운드 액세스(Default Outbound Access)**를 제공하지 않습니다. 그리고 **2026년 3월 31일**부터는 서브넷 생성 시 **프라이빗 서브넷(Private Subnet)**이 새 기본 선택으로 설정됩니다.

> 참고: [Microsoft Learn, "Default outbound access for VMs in Azure will be retired"](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/default-outbound-access)

```
기본 아웃바운드 액세스 변경 타임라인

[기존 동작 (2025.9.30 이전)]
  VM 생성 → Public IP 없어도 → 아웃바운드 인터넷 가능
  → Azure 플랫폼이 내부 IP 풀에서 암묵적 SNAT 수행 (무료)
  → 구독에 Public IP 리소스가 생기는 것이 아님
  → 어떤 IP로 나가는지 사용자가 확인 불가 (매번 바뀔 수 있음)

[변경 후 (2025.9.30~)]
  VM 생성 → 명시적 아웃바운드 방법 미설정 시 → 인터넷 접근 불가

[2026.3.31~]
  서브넷 생성 시 "프라이빗 서브넷" 옵션이 기본 활성화
  → defaultOutboundAccess: false
```

**프라이빗 서브넷이란?**

프라이빗 서브넷(`defaultOutboundAccess: false`)은 해당 서브넷의 리소스가 Azure 플랫폼의 암묵적 SNAT를 통한 아웃바운드 인터넷 접근을 **차단**합니다. 아웃바운드 인터넷이 필요한 경우 다음 중 하나를 **명시적으로** 구성해야 합니다:

| &nbsp;명시적 아웃바운드 방법&nbsp; | &nbsp;설명&nbsp; |
|---|---|
| **NAT Gateway** | 서브넷 단위로 연결. 예측 가능한 공용 IP로 SNAT 제공 (권장) |
| **Azure Load Balancer 아웃바운드 규칙** | LB 뒤의 VM에 아웃바운드 SNAT 규칙 설정 |
| **VM에 Public IP 직접 할당** | 개별 VM에 고정 또는 동적 공용 IP 할당 |
| **Azure Firewall / NVA** | UDR로 트래픽을 방화벽 경유 후 인터넷 접근 |

> **왜 바뀌었나?**: 기존 기본 아웃바운드는 Azure 플랫폼 내부 IP 풀의 **암묵적 SNAT**였습니다. VM에 Public IP 리소스가 할당되는 것이 아니라, 플랫폼이 보이지 않는 곳에서 NAT를 수행했기에 **무료**였습니다. 하지만 바로 그 점이 문제였습니다 — 어떤 IP로 나가는지 알 수 없으니 보안 감사에서 식별이 어렵고, IP 허용 목록(allowlist) 관리가 불가능하며, DDoS Protection 적용도 안 되는 **보안 취약점**이었습니다.

---

### 2.4 NAT Gateway

**Azure NAT Gateway**는 서브넷의 아웃바운드 인터넷 트래픽에 대해 **확장 가능하고 예측 가능한 SNAT(Source NAT)**를 제공하는 완전 관리형 서비스입니다. 프라이빗 서브넷이 기본값이 되면서, 아웃바운드 인터넷이 필요한 서브넷에는 NAT Gateway가 사실상 **필수 구성 요소**가 됩니다.

> 참고: [Microsoft Learn, "What is Azure NAT Gateway?"](https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview)

NAT Gateway 동작

![NAT Gateway](/images/26-02-11-2026-02-11-azure-network(1)-NAT_Gateway.png)

```
특성:
  • 서브넷의 모든 아웃바운드 → NAT Gateway의 공용 IP로 SNAT
  • 공용 IP 최대 16개 또는 /28 접두사 연결 가능
  • 64,512 SNAT 포트 (공용 IP당)
  • TCP/UDP idle timeout: 4~120분 (기본 4분)
  • 인바운드 전용 연결 시작은 불가 (아웃바운드 전용)
```

**공용 IP 다중 연결의 의미:**

NAT Gateway에 여러 공용 IP를 연결하면, **모든 IP가 하나의 SNAT 풀(pool)로 동작**합니다. "이 VM은 IP-A로, 저 VM은 IP-B로" 같은 지정은 **불가능**합니다 — Azure 플랫폼이 해시 기반으로 자동 분배하며 사용자가 제어할 수 없습니다.

그렇다면 IP를 여러 개 붙이는 이유는 **SNAT 포트 용량 확보** 때문입니다:

| &nbsp;공용 IP 수&nbsp; | &nbsp;총 SNAT 포트&nbsp; | &nbsp;용도&nbsp; |
|---|---|---|
| 1개 | 64,512 | 소규모 서브넷 |
| 4개 | 258,048 | 중간 규모 |
| 16개 | 1,032,192 | 대규모 (수백~수천 VM이 동시 외부 호출) |

**SNAT 포트 고갈(Exhaustion)**: 서브넷 내 VM들이 동시에 많은 아웃바운드 연결을 맺으면 포트가 부족해져 연결 실패가 발생합니다. 공용 IP를 추가하면 전체 포트 풀이 커지므로 이 문제를 해결할 수 있습니다. 특정 IP로의 트래픽 고정이 필요하다면 NAT Gateway 대신 **VM에 Public IP를 직접 할당**해야 합니다.

---

### 2.5 서브넷 위임 (Subnet Delegation)

**서브넷 위임**은 특정 Azure PaaS 서비스가 해당 서브넷에 **서비스 고유의 리소스를 주입하고 관리**할 수 있도록 허용하는 설정입니다. 위임된 서브넷은 해당 서비스 전용이 되며, 다른 리소스 유형의 배포가 제한됩니다.

> 참고: [Microsoft Learn, "Add or remove a subnet delegation"](https://learn.microsoft.com/en-us/azure/virtual-network/manage-subnet-delegation)

```
서브넷 위임 개념

VNet: 10.0.0.0/16
│
├── Subnet-App: 10.0.1.0/24 (위임 없음 → VM, PE 등 자유 배포)
│
├── Subnet-SQL-MI: 10.0.2.0/24
│   └── 위임: Microsoft.Sql/managedInstances
│       → SQL Managed Instance 전용 서브넷
│       → VM 등 다른 리소스 배포 불가
│       → Azure가 서비스 네트워크 정책(NSG/UDR) 자동 추가
│
├── Subnet-WebApp: 10.0.3.0/24
│   └── 위임: Microsoft.Web/serverFarms
│       → App Service VNet Integration 전용
│
└── Subnet-Container: 10.0.4.0/24
    └── 위임: Microsoft.ContainerInstance/containerGroups
        → Azure Container Instances 전용
```

**주요 위임 서비스:**

| &nbsp;서비스&nbsp; | &nbsp;위임 대상 (Resource Provider)&nbsp; | &nbsp;용도&nbsp; |
|---|---|---|
| SQL Managed Instance | Microsoft.Sql/managedInstances | MI 인스턴스 배포 |
| App Service | Microsoft.Web/serverFarms | VNet Integration |
| Container Instances | Microsoft.ContainerInstance/containerGroups | ACI 배포 |
| Databricks | Microsoft.Databricks/workspaces | Databricks 워크스페이스 |
| NetApp Files | Microsoft.NetApp/volumes | NetApp 볼륨 |
| API Management | Microsoft.ApiManagement/service | APIM VNet 주입 |

> **주의**: 위임된 서브넷에는 해당 서비스 외의 리소스를 배포할 수 없습니다. 또한 위임을 제거하려면 해당 서브넷의 위임된 리소스를 먼저 삭제해야 합니다.

---

<br>

## 3. Network Security Group (NSG)

**NSG**는 Azure 네트워크에서 트래픽을 필터링하는 **상태 저장(stateful) 방화벽** 역할을 합니다. 인바운드/아웃바운드 보안 규칙을 통해 5-튜플 기반으로 트래픽을 허용하거나 거부합니다.

### 3.1 5-튜플 매칭

**5-튜플(5-Tuple)**이란 네트워크 패킷 하나를 **고유하게 식별**할 수 있는 5가지 정보의 조합입니다. 모든 TCP/UDP 패킷 헤더에는 이 5가지 값이 포함되어 있으며, 이 조합이 같으면 같은 "흐름(flow)"에 속하는 패킷으로 간주합니다.

```
5-Tuple: 패킷을 식별하는 5가지 정보
-----------------------------
① Source IP/CIDR       – 보낸 쪽 IP 주소
② Source Port          – 보낸 쪽 포트 번호
③ Destination IP/CIDR  – 받는 쪽 IP 주소
④ Destination Port     – 받는 쪽 포트 번호
⑤ Protocol (TCP / UDP / ICMP / Any)
```

**왜 5-튜플인가?**

방화벽이 트래픽을 제어하려면 "어떤 패킷을 허용/차단할지" 판단 기준이 필요합니다. IP 주소만으로는 부족합니다 — 같은 서버라도 웹(443)은 열고 SSH(22)는 막아야 할 수 있고, 같은 포트라도 특정 출발지에서만 허용해야 할 수 있습니다. 5-튜플은 패킷의 **출발지, 목적지, 프로토콜**을 모두 조합하기 때문에 이런 세밀한 제어가 가능합니다.

```
예시: "10.0.1.0/24 서브넷에서 DB 서브넷으로 SQL(1433/TCP)만 허용"

  Source IP:   10.0.1.0/24      (App 서브넷)
  Source Port: *                (클라이언트 포트는 임의)
  Dest IP:     10.0.3.0/24      (DB 서브넷)
  Dest Port:   1433             (SQL Server)
  Protocol:    TCP
  → Allow ✓

위 5가지 조건이 모두 일치하면 허용, 아니면 다음 규칙으로 넘어감
```

NSG는 각 보안 규칙을 **우선순위(Priority)**가 작은 순서부터 평가합니다:

![NGS Flow](/images/26-02-11-2026-02-11-azure-network(1)-NSG_Flow.png)

> **참고**: 5-튜플 매칭은 NSG뿐 아니라 Azure Load Balancer의 세션 분배, NAT Gateway의 SNAT 포트 할당 등에서도 사용되는 네트워크의 기본 개념입니다.

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

**Application Security Group (ASG)**는 VM NIC를 논리적으로 그룹화하여 NSG 규칙의 Source/Destination으로 참조할 수 있게 합니다.

즉, 질문하신 것처럼 **"NSG 적용 범위를 더 유연하게 관리"**하기 위한 기능이 맞습니다. 다만 정확히는 **NSG를 부착(Associate)하는 범위 자체를 바꾸는 기능은 아닙니다**:

- NSG 부착 범위: **서브넷 또는 NIC**
- ASG 역할: NSG 규칙 안에서 대상(출발지/목적지)을 **IP/CIDR 대신 논리 그룹**으로 표현

정리하면, NSG는 "어디에 적용할지"를 결정하고, ASG는 "그 안에서 누구와 통신을 허용/차단할지"를 더 쉽게 관리하게 해줍니다.

![application security group](/images/26-02-11-2026-02-11-azure-network(1)-asg.png)

**왜 ASG를 쓰는가?**

환경이 커질수록 VM IP는 변경되거나 개수가 자주 바뀝니다. ASG를 사용하면 NSG 규칙을 IP로 일일이 관리하지 않고, NIC를 그룹에 넣고 빼는 방식으로 운영할 수 있어 규칙 수와 운영 복잡도를 크게 줄일 수 있습니다.


> 참고: ASG는 보통 동일 VNet 내 NIC들을 논리적으로 묶어 NSG 규칙 가독성과 운영성을 높이는 데 사용합니다.

---

### 3.4 Security Admin Rules (Virtual Network Manager)

**분류:** AVNM 기능(정책 강제 옵션)

Security Admin Rule은 AVNM에서 조직 공통 정책을 중앙 강제하는 규칙이며, NSG보다 먼저 평가됩니다. 제어 항목은 NSG와 유사하게 방향/프로토콜/소스·목적지 IP 프리픽스/포트(L3/L4) 기반입니다.

- `Allow`: 일단 통과시키고 이후 NSG가 추가 평가
- `Always Allow`: NSG 평가를 건너뛰고 즉시 허용
- `Deny`: 즉시 차단하고 NSG 평가로 가지 않음

즉, **매칭 수준은 NSG와 유사**하지만, **운영 모델은 NSG 위의 상위 거버넌스 레이어**입니다. 보통 Security Admin Rule은 조직 공통 가드레일(예: 고위험 포트 차단), NSG는 앱/팀별 세부 제어에 사용합니다.

![Virtual Network Manager](/images/26-02-11-2026-02-11-azure-network(1)-Virtual_Network_Manager.png)

> 참고(공식): https://learn.microsoft.com/azure/virtual-network-manager/concept-security-admins, https://learn.microsoft.com/azure/virtual-network/network-security-groups-overview

<br>

## 4. 트래픽 라우팅 (Routing)

Azure 라우팅은 단순한 경로 나열이 아니라, **기본은 안전하게 자동화하고(Platform-managed), 예외는 명시적으로 선언하는(User-managed)** 모델입니다. 즉, 설계 철학은 **"기본은 자동화, 예외는 명시"**입니다.

### 4.1 Azure가 경로를 고르는 실제 순서

**분류:** 기술/메커니즘 (라우팅 결정 로직)

실제 데이터 플레인에서의 판단 순서는 아래처럼 이해하면 가장 정확합니다.

1. **Longest Prefix Match (LPM) 우선**  
   목적지 IP에 가장 구체적으로 맞는 Prefix(예: `/25` > `/24` > `/16`)를 먼저 선택합니다.

2. **Prefix 길이가 같을 때 Source 우선순위 적용**  
   동일 Prefix 경쟁 시 `UDR > BGP > System` 순서로 선택합니다.

3. **예외: 특정 시스템 경로는 우선 선호됨**  
   Microsoft Learn 기준으로 VNet/Peering/Service Endpoint 관련 일부 시스템 경로는 선호 경로로 동작합니다. 특히 Service Endpoint(`VirtualNetworkServiceEndpoint`) 경로는 라우트 테이블로 재정의할 수 없습니다.

> 참고: [Azure에서 트래픽 라우팅에 대한 경로를 선택하는 방법](https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview#how-azure-selects-routes-for-traffic-routing)

### 4.2 시스템 경로: 기본 동작을 이해하기

VNet이 생성되면 Azure는 각 서브넷에 기본 시스템 경로를 자동 추가합니다.

> 여기서 `Source`는 트래픽의 출발지가 아니라, **해당 경로를 만든 원천(Route source)**을 의미합니다.  
> 즉, `Default`는 "Azure가 기본으로 넣어준 시스템 경로"라는 뜻입니다.

| &nbsp;Source&nbsp; | &nbsp;주소 접두사&nbsp; | &nbsp;다음 홉 유형&nbsp; |
|---|---|---|
| Default | VNet 주소 범위 | Virtual network |
| Default | 0.0.0.0/0 | Internet |
| Default | 10.0.0.0/8 | None |
| Default | 172.16.0.0/12 | None |
| Default | 192.168.0.0/16 | None |
| Default | 100.64.0.0/10 | None |

`Source`에 자주 보이는 값은 아래와 같습니다:
- `Default`: Azure 기본 시스템 경로
- `User`: 사용자가 UDR(Route table)로 추가한 경로
- `BGP`: VPN Gateway/ExpressRoute를 통해 학습된 경로

**표 읽는 법 (핵심):**
- 이 표는 "출발지"가 아니라 **목적지 IP 기준**으로 읽습니다.
- `주소 접두사`는 매칭 조건, `다음 홉 유형`은 매칭 시 전달 위치입니다.
- `0.0.0.0/0`은 "인터넷" 자체가 아니라 **모든 IPv4 목적지(기본값, catch-all)**를 뜻합니다.
- 따라서 `0.0.0.0/0 → Internet`은 "더 구체 경로가 없으면 Internet 다음 홉으로 보낸다"는 의미입니다.
- 실제 적용 시에는 **Longest Prefix Match(가장 구체적인 경로 우선)**가 먼저 적용됩니다.

> **다음 홉 유형 설명**:
> - **Virtual network**: VNet 주소 공간 내의 트래픽을 서브넷 간 직접 라우팅
> - **Internet**: 0.0.0.0/0 접두사 → Azure 서비스 트래픽은 백본 네트워크를 통해, 나머지는 인터넷으로
> - **None**: RFC 1918 프라이빗 주소 + `100.64.0.0/10`(RFC 6598 Shared Address Space, 통신사 CG-NAT용)으로 향하는 트래픽을 기본적으로 드롭 (해당 대역이 VNet 주소 공간에 포함되면 Virtual network 경로가 더 구체적으로 적용)

---

### 4.3 선택적 시스템 경로 (Optional System Routes)

특정 Azure 기능을 활성화하면 추가 시스템 경로가 자동 생성됩니다:

| &nbsp;기능&nbsp; | &nbsp;주소 접두사&nbsp; | &nbsp;다음 홉 유형&nbsp; | &nbsp;적용 범위&nbsp; |
|---|---|---|---|
| VNet Peering | 피어링된 VNet 주소 범위 | VNet peering | 모든 서브넷 |
| VNet Gateway | BGP 또는 로컬 네트워크 게이트웨이 접두사 | Virtual network gateway | 모든 서브넷 |
| Service Endpoint | 서비스의 공용 IP | VirtualNetworkServiceEndpoint | 활성화된 서브넷만 |

---

### 4.4 사용자 정의 경로 (UDR: User-Defined Routes)

**분류:** 기능 (VNet 라우팅 제어)

UDR은 Azure 기본 경로를 **명시적으로 재정의**하거나, 추가 경로를 선언할 때 사용합니다. 다만 모든 경우를 강제로 덮어쓰는 것이 아니라, **LPM + 동등 Prefix 우선순위 규칙** 안에서 동작합니다.

UDR 대표 시나리오: NVA를 통한 강제 터널링
![UDR](/images/26-02-11-2026-02-11-azure-network(1)-UDR.png)


**UDR에서 지정 가능한 다음 홉 유형:**

| &nbsp;다음 홉 유형&nbsp; | &nbsp;설명&nbsp; |
|---|---|
| Virtual appliance | NVA(방화벽, 프록시 등)로 트래픽 전달. IP 포워딩 활성화 필요 |
| Virtual network gateway | VPN Gateway로 트래픽 전달 (ExpressRoute는 지원 안 함) |
| Virtual network | VNet 내 기본 라우팅 재정의 |
| Internet | 특정 주소를 인터넷으로 명시적 라우팅 |
| None | 트래픽 드롭 (블랙홀) |

> 실무 팁: `0.0.0.0/0` 강제 터널링 시 NVA로 보내는 경우, NVA NIC의 IP 포워딩 및 OS 레벨 포워딩 설정이 누락되면 트래픽이 드롭됩니다.

---

### 4.5 실무에서 자주 놓치는 3가지

1. **LPM이 최상위 규칙**  
  `UDR > BGP > System`은 먼저가 아니라, **동일 Prefix일 때만** 적용됩니다.

2. **피어링의 비전이성(Non-Transitivity)**  
  `A↔B`, `B↔C`여도 `A↔C`는 자동 통신되지 않습니다. Spoke 간 통신은 직접 피어링/직접 연결을 추가하거나, Hub NVA를 경유하도록 UDR 및 `Allow forwarded traffic`을 설계해야 합니다.

3. **Service Endpoint 우선 경로**  
  Service Endpoint가 활성화되면 해당 서비스 트래픽은 강제 터널링(`0.0.0.0/0`) 의도와 다르게 백본 경로를 선호할 수 있습니다. 완전한 사설 경로 통제가 필요하면 Private Endpoint(Private Link) 기반으로 설계합니다.

> 참고: [Hub-Spoke 권장사항](https://learn.microsoft.com/azure/architecture/networking/architecture/hub-spoke#recommendations), [Service endpoint precedence FAQ](https://learn.microsoft.com/azure/private-link/private-link-faq#does-the-service-endpoint-route-always-take-precedence), [Service chaining](https://learn.microsoft.com/azure/virtual-network/virtual-network-peering-overview#service-chaining)

### 4.6 경로 선택 요약

아래 순서로 보면 대부분의 라우팅 이슈를 빠르게 해석할 수 있습니다:

```
경로 선택 의사결정 트리
1) 목적지에 가장 구체적으로 맞는 Prefix인가? (LPM)
2) Prefix가 동일하면 Source 우선순위인가? (UDR > BGP > System)
3) Service Endpoint 등 선호 시스템 경로 예외에 해당하는가?
```

> **주의**: Service Endpoint 경로는 라우트 테이블로 재정의할 수 없습니다.

---

### 4.7 Service Tag 기반 UDR

**분류:** 기능 (UDR 표현 방식)

UDR의 주소 접두사 대신 **Service Tag**를 사용할 수 있습니다. Microsoft가 IP 범위를 자동 관리하므로 유지보수가 간편합니다.

**언제 유용한가?**
- Azure 서비스의 공용 IP 대역이 자주 바뀌는 환경에서, 고정 CIDR 대신 정책을 안정적으로 유지하고 싶을 때
- "Storage/SQL/AppService 트래픽만 NVA 경유"처럼 서비스 단위 라우팅을 간결하게 관리하고 싶을 때

**실무에서 꼭 알아야 할 동작 규칙**
- **Exact match 우선**: 동일 목적지에 대해 "명시적 IP Prefix 경로"와 "Service Tag 경로"가 동시에 매칭되면, 명시적 IP Prefix 경로가 우선됩니다.
- Service Tag끼리 겹칠 때는 더 구체적인 태그가 우선될 수 있습니다(예: `Storage.EastUS`가 `Storage`보다 구체적).
- 라우트 테이블당 Service Tag 경로는 최대 **25개**까지 사용할 수 있습니다.

**설계 팁**
- 가능하면 전역 태그(`Storage`)보다 **리전 태그**(`Storage.<Region>`)를 우선 사용해 우회 범위를 최소화하세요.
- Service Endpoint/Private Endpoint 설계와 함께 볼 때는, "라우팅 제어"(UDR)와 "접근 경로/보안 경계"(PE/SE) 목적을 분리해서 판단하는 것이 안전합니다.

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
  >
  > 참고(공식): https://learn.microsoft.com/azure/virtual-network/virtual-networks-udr-overview#custom-routes

<br>

## 5. VNet Peering (가상 네트워크 피어링)

**분류:** 기능/옵션 (VNet 연결 기능)

Azure가 Peering에서 추구하는 방향은 단순합니다. **필요한 연결은 빠르게(백본 직결), 불필요한 전이는 막아서(비전이성) 경계와 책임을 명확히 유지**하는 것입니다.

**VNet Peering**은 두 VNet을 Microsoft 백본으로 직접 연결해, 공용 인터넷 우회 없이 낮은 지연과 높은 처리량을 제공합니다.

### 5.1 피어링 유형

| 유형 | 설명 | 언제 선택하나 |
|---|---|---|
| Local Peering | 동일 리전 VNet 간 연결 | 애플리케이션 계층 간 저지연 통신이 필요할 때 |
| Global Peering | 서로 다른 리전 VNet 간 연결 | 멀티리전 DR/활성-활성 구조가 필요할 때 |

> 핵심은 둘 다 인터넷이 아니라 **Microsoft 백본 경로**를 사용한다는 점입니다.

---

### 5.2 피어링 핵심 특성

| &nbsp;특성&nbsp; | &nbsp;설명&nbsp; |
|---|---|
| 비전이적(Non-transitive) | VNet-A ↔ VNet-B, VNet-B ↔ VNet-C 연결 시, VNet-A와 VNet-C는 자동 연결 안 됨 |
| 주소 공간 겹침 불가 | 피어링하려면 VNet 주소 공간이 겹치면 안 됨 |
| 양방향 설정 필요 | 양쪽 VNet에서 각각 피어링 설정 필요 |
| 기본 피어 제한 | VNet당 최대 **500개** (Virtual Network Manager로 1,000개까지 확장) |
| 과금 | Ingress/Egress에 소액의 데이터 전송 요금 부과 |

>**왜 비전이성이 중요한가** </br>
>네트워크 전파 범위를 의도적으로 제한해 **장애 전파와 과도한 신뢰 확장**을 막기 때문입니다. 대규모 환경에서 Hub-and-Spoke를 쓰는 이유도 이 경계를 운영하기 쉽기 때문입니다.

---

### 5.3 게이트웨이 전송 (Gateway Transit)

**분류:** 피어링 옵션(기능)

게이트웨이 전송은 **허브의 VPN/ExpressRoute Gateway를 스포크가 재사용**하도록 하는 기능입니다.

의미를 한 줄로 요약하면: **게이트웨이 중복 배포를 줄여 비용과 운영 복잡도를 낮추는 기능**입니다.

주의할 점은, Gateway Transit은 주로 **스포크↔원격 네트워크(온프레미스 등)** 경로 공유를 위한 설정이며, 스포크 간 자동 전이를 만들어주지는 않습니다.

![Gateway Transit](/images/26-02-11-2026-02-11-azure-network(1)-gw_transit_option.png)

![Gateway Transit](/images/26-02-11-2026-02-11-azure-network(1)-gw_transit.png)

> **장점**: 각 스포크 VNet에 별도 게이트웨이를 배포하지 않아도 됨 → **비용 절감**

---

### 5.4 서비스 체이닝 (Service Chaining)

**분류:** 네트워크 패턴

서비스 체이닝은 UDR + Peering 조합으로 **트래픽을 중앙 보안 지점(NVA/Firewall)으로 강제 경유**시키는 패턴입니다.

Azure 아키텍처 관점에서 이는 "연결"과 "검사/통제"를 분리하는 방식입니다:
- Peering: 네트워크 도달성 제공
- UDR + NVA: 보안 정책 집행

그래서 실무에서는 Spoke 간 직접 연결이 가능하더라도, 보안/감사 요구가 크면 Hub 경유 체이닝을 선택합니다.

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

> 참고(공식): https://learn.microsoft.com/azure/virtual-network/virtual-network-peering-overview, https://learn.microsoft.com/azure/architecture/networking/architecture/hub-spoke#recommendations

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

> **용어 유래**: "뜨거운 감자(Hot Potato)"는 손에 쥐자마자 빨리 다른 사람에게 던지는 것, "차가운 감자(Cold Potato)"는 천천히 끝까지 쥐고 있는 것에서 비유됩니다. 트래픽을 얼마나 빨리 자신의 네트워크 밖으로 내보내느냐의 차이입니다.

```
라우팅 전략 비교

[Hot Potato Routing]
  사용자 → ISP → 자사 네트워크 엣지에서 즉시 공용 인터넷으로 핸드오프
  → 인터넷(타 AS)을 통해 목적지까지 이동
  → 자사 백본 사용을 최소화 → 비용 절감 목적

[Cold Potato Routing]
  사용자 → ISP → 클라우드 엣지 노드 (가장 가까운 POP)
  → 클라우드 사업자의 WAN 백본을 통해 목적지 리전까지 이동
  → 최종 목적지 근처에서 비로소 백본 외부로 핸드오프
  → 트래픽이 사업자 네트워크에 가능한 오래 머무름
```

---

#### 벤더별 기본 전략

| 벤더 | 기본 전략 | 비고 |
|------|----------|------|
| **Microsoft Azure** | Cold Potato | 글로벌 WAN 백본(MSWAN) 기본 적용. 별도 옵션 없음 |
| **AWS** | Hot Potato | 기본적으로 외부 인터넷 경유. [AWS Global Accelerator](https://aws.amazon.com/global-accelerator/)를 추가하면 Cold Potato와 유사한 효과 가능 (유료 옵션) |
| **Google Cloud** | 선택 가능 | **Premium Tier**: Cold Potato (Google 백본 최대 활용) / **Standard Tier**: Hot Potato (인터넷 경유, 저렴) |
| **일반 ISP / CDN** | Hot Potato | Peering 포인트에서 최대한 빨리 라우팅 핸드오프. 트랜짓 비용 최소화 목적 |

> AWS는 기본 라우팅만으로는 공용 인터넷 경유이므로 장거리 리전 간 통신에서 지연 편차가 발생할 수 있습니다.  
> Google Cloud는 Tier를 명시적으로 선택해야 하며, Standard Tier는 비용이 낮지만 품질 보장이 없습니다.

---

#### 장단점 비교

**Cold Potato Routing**

| 구분 | 내용 |
|------|------|
| **장점** | ① 낮고 일관된 지연 시간(Latency) 및 지터(Jitter) <br> ② 패킷 손실률 감소 — 인터넷 혼잡 구간 최소화 <br> ③ 대칭 라우팅 보장 — 왕복 경로가 동일하여 디버깅·모니터링 용이 <br> ④ SLA 품질 예측 가능 — 내부 네트워크이므로 인터넷 장애 영향 격리 |
| **단점** | ① 운영 비용 증가 — 대규모 자체 WAN 인프라 유지 필요 <br> ② 사업자 의존 — 경로 제어권이 클라우드 사업자에게 있음 <br> ③ 사업자 네트워크 장애 시 고객 영향 범위가 넓을 수 있음 |

**Hot Potato Routing**

| 구분 | 내용 |
|------|------|
| **장점** | ① 사업자 입장에서 백본 운영 비용 절감 <br> ② 여러 ISP 경로를 활용 — 특정 경로 장애 시 우회 가능 <br> ③ Tier/요금제 선택의 유연성 제공 (Google처럼 옵션 분리 가능) |
| **단점** | ① 지연 시간이 인터넷 혼잡 상태에 따라 변동 <br> ② 비대칭 라우팅(Asymmetric Routing) 발생 가능 — 왕복 경로가 달라 트러블슈팅 어려움 <br> ③ 패킷 손실, 지터 등 품질 보장 불가 — BGP 경로 변경에 영향 <br> ④ 장거리 리전 간 통신 품질이 일관되지 않음 |

```
비대칭 라우팅 예시 (Hot Potato)

요청: 서울 → 시드니
  서울 ISP → Peering A → 인터넷 경유 → 시드니

응답: 시드니 → 서울
  시드니 ISP → Peering B → 인터넷 경유 → (다른 경로) → 서울
  → 왕복 경로가 달라 지연 계산, 패킷 추적이 복잡해짐
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
- [ ] 프라이빗 서브넷 기본값 전환(2026.3.31) 대비: 명시적 아웃바운드 방법 구성 확인
- [ ] NAT Gateway를 아웃바운드 인터넷이 필요한 서브넷에 연결
- [ ] 서브넷 위임이 필요한 PaaS 서비스(SQL MI, App Service 등)에 전용 서브넷 할당
- [ ] Private Endpoint 네트워크 정책(NSG/UDR) 적용 여부 검토

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
