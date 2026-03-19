---
layout: post
title: "Azure Network (3): 부하분산, 보안, 하이브리드 연결"
date: 2026-03-11 11:00:00 +0900
tags: [Study, Azure, Network, Application Gateway, Load Balancer, Front Door, Traffic Manager, Firewall, WAF, DDoS, VPN Gateway, ExpressRoute, Network Watcher]
categories: Azure_Study
---

지난 포스트 [**Azure Network (2): 하이브리드 연결과 네트워크 서비스 심층 분석**]({% post_url Azure_Study/2026-02-11-azure-network(2) %})에서는 VPN Gateway, ExpressRoute, Azure Firewall, Private Link, Service Endpoint, Azure DNS 등을 살펴봤습니다.

이번 포스트에서는 Azure의 **부하분산장치 4종**과 **보안 서비스**, 그리고 **하이브리드 연결과 네트워크 진단 도구**까지 폭넓게 다뤄보겠습니다. 네트워크 계층의 낮은 곳(L4)에서 시작해 높은 곳(L7)으로, 리전에서 글로벌로, 그리고 트래픽 분산에서 보안과 모니터링으로 자연스럽게 확장해 나가겠습니다.

부하분산: Application Gateway / Load Balancer / Azure Front Door / Traffic Manager
보안: Azure Firewall / Azure WAF(AGW, AFD) / Azure DDoS Protection
하이브리드 연결: VPN Gateway(S2S, P2S) / ExpressRoute
네트워크 진단: Azure Network Watcher


> **용어 분류 기준(이 글에서의 표기):**
> - **서비스(Service)**: Azure에서 리소스로 배포/과금/관리되는 것
> - **기능/옵션(Feature/Option)**: 특정 서비스의 설정 항목
> - **패턴(Pattern)**: 여러 기능을 조합한 아키텍처 방식
> - **기술/메커니즘(Technology/Mechanism)**: 동작 원리나 프로토콜

<br>
 
---

# 부하분산 서비스

Azure는 트래픽을 분산하는 4가지 서비스를 제공합니다. 이들은 **동작 계층(L4/L7)**과 **분산 범위(리전/글로벌)**에 따라 구분됩니다.

| 계층 | 리전(Regional) | 글로벌(Global) |
|---|---|---|
| **L7 (HTTP/HTTPS)** | Application Gateway | Azure Front Door |
| **비-HTTP(S)** | Azure Load Balancer (L4, TCP/UDP) | Traffic Manager (DNS 기반) |

가장 기본적인 L4 로드밸런서부터 시작해서, 점점 더 높은 계층과 넓은 범위로 올라가 보겠습니다.

---

## 1. Azure Load Balancer

**분류:** 서비스 (L4 리전 부하분산)

### 개요

**Azure Load Balancer**는 네트워크에서 가장 기본적인 부하분산장치입니다. **TCP/UDP 레벨(L4)**에서 동작하며, 패킷의 IP 주소와 포트 번호만 보고 트래픽을 여러 서버로 나눠줍니다.

HTTP 콘텐츠를 해석하지 않는 대신, 빠르고 단순한 분배에 집중하며 매우 낮은 지연시간으로 대규모 플로우를 처리할 수 있습니다.

> 참고: [Microsoft Learn, "What is Azure Load Balancer?"](https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-overview)

### 활용 시나리오

- **웹 서버 앞단**: 여러 대의 VM에서 동일한 웹 서비스를 운영할 때 트래픽을 고르게 배분
- **내부 서비스 분산**: VNet 내부 티어 간 통신 분산
- **고가용성 확보**: 한 VM이 죽어도 나머지 VM이 자동으로 트래픽을 받아 서비스 중단 없이 운영
- **SSH/RDP 포트 포워딩**: 인바운드 NAT 규칙으로 특정 포트를 특정 VM에 1:1 매핑

Load Balancer는 프런트엔드 IP의 성격에 따라 **Public**과 **Internal**로 나뉩니다.

### 배포 유형(형식): 공개(Public) vs 내부(Internal)

| 유형 | Frontend IP | 용도 |
|---|---|---|
| **Public** | 공용 IP | 인터넷에서 들어오는 트래픽을 백엔드 VM 풀로 분산 |
| **Internal** | VNet 사설 IP | VNet 또는 피어링된 네트워크 내부 트래픽 분산 |

### 계층(Tier): 지역(Regional) vs 전역(Global)

**Public** 유형을 선택하면 포털에서 **계층(Tier)** 항목이 추가로 나타납니다. Internal 유형에는 계층 선택이 없습니다.

| 계층 | 설명 | 주의 |
|---|---|---|
| **지역(Regional)** | 단일 Azure 리전 내에서만 동작. 기본값 | SKU는 Standard 또는 Basic (Basic은 2025.9.30 퇴역) |
| **전역(Global)** | 여러 리전에 걸쳐 크로스 리전 부하분산 수행 | **Standard SKU 전용**. 백엔드 풀에 리전별 Standard LB를 등록하는 방식으로 동작 |

전역 계층(Global Tier)은 **Cross-region Load Balancer**로 불리며, 여러 리전에 위치한 Standard LB를 백엔드 풀로 묶어 단일 진입점을 제공합니다. 단일 리전 장애 시 다른 리전의 백엔드 풀로 트래픽이 자동 전환됩니다.

> **Internal LB에 계층 선택이 없는 이유**: 전역 계층은 인터넷에 노출된 공용 IP를 통해 글로벌 분산을 수행하는 구조이므로, 사설 IP를 사용하는 Internal 배포 유형과는 결합할 수 없습니다.

### 핵심 구성 요소

| 구성 요소 | 설명 |
|---|---|
| **Frontend IP** | 트래픽이 도착하는 IP (공용 또는 사설) |
| **Backend Pool** | 트래픽을 수신하는 VM/VMSS/IP 그룹 |
| **부하분산 규칙** | Frontend IP:Port ↔ Backend Pool:Port 매핑 (TCP/UDP) |
| **Health Probe** | TCP, HTTP, HTTPS 프로토콜을 지원하며 해당 방식으로 백엔드 상태를 주기적으로 확인. 비정상 인스턴스는 자동으로 풀에서 제외 |
| **인바운드 NAT 규칙** | 특정 Frontend 포트를 특정 백엔드 VM으로 1:1 매핑 |
| **아웃바운드 규칙** | 백엔드 VM의 아웃바운드 SNAT 구성 |

### 분산 알고리즘

Load Balancer는 기본적으로 **5-튜플 해시**를 사용합니다. <소스IP, 소스Port, 목적지IP, 목적지Port, 프로토콜> 5가지 조합으로 해시값을 만들어 어느 백엔드로 보낼지 결정합니다.

이 분산 알고리즘은 **부하분산 규칙(Load balancing rules)** 편집 화면에서 **Session persistence(세션 지속성)** 항목으로 선택할 수 있습니다. Inbound NAT rules / Outbound rules / Gateway Load Balancer 화면에서는 이 옵션이 노출되지 않습니다.

| 포털 옵션 | 내부 해시 키 | 특성 |
|---|---|---|
| **None** (기본값) | Src IP + Src Port + Dst IP + Dst Port + Protocol | 5-튜플 해시. 연결마다 독립 분산. stateless 서비스에 적합 |
| **Client IP** | Src IP + Dst IP | 2-튜플. 같은 클라이언트 IP는 항상 동일 백엔드로 고정 |
| **Client IP and Protocol** | Src IP + Dst IP + Protocol | 3-튜플. 클라이언트 IP + 프로토콜 조합별 고정 |

기본값(None)에서도 동일 TCP 세션 내 패킷은 같은 백엔드로 전달되며, 새 연결마다 해시를 재계산해 재분산합니다.

세션 지속성을 높일수록(Client IP > Client IP and Protocol > None) 특정 백엔드로 트래픽이 몰릴 수 있으므로, NAT/프록시 환경에서는 분산 편향 여부를 함께 점검하는 것이 좋습니다.

> **주의**: Basic SKU는 **2025년 9월 30일에 퇴역**됩니다. 모든 신규 배포는 Standard SKU를 사용해야 하며, 기존 Basic도 마이그레이션이 필요합니다. Standard SKU는 **기본적으로 모든 인바운드 트래픽이 차단**되어 있어서 NSG로 명시적으로 허용해야 합니다.

---

## 2. Application Gateway

**분류:** 서비스 (L7 리전 부하분산)

### 개요

**Application Gateway(AGW)**는 HTTP/HTTPS 요청의 **URL 경로**, **호스트 헤더**, **쿠키** 등 L7 콘텐츠를 직접 해석하여 트래픽을 분산하는 **리전 레벨 L7 로드밸런서**입니다.

L4에서만 동작하는 Azure Load Balancer와 달리, 요청 내용을 읽고 판단하여 마이크로서비스 라우팅, SSL 오프로드, WAF 통합 등을 지원합니다.

> 참고: [Microsoft Learn, "What is Azure Application Gateway?"](https://learn.microsoft.com/en-us/azure/application-gateway/overview)

### 활용 시나리오

- **마이크로서비스 라우팅**: URL 경로 기반 분기
- **다중 도메인 호스팅**: 하나의 AGW에서 여러 도메인 처리
- **SSL 오프로드**: 백엔드 서버 대신 AGW에서 HTTPS 암복호화를 처리해 서버 부하 절감
- **웹 보안**: WAF를 통합하여 SQL Injection, XSS 같은 웹 공격을 자동 차단

### 트래픽 흐름

![Azure Application Gateway Flow](/images/26-03-11-2026-03-11-azure-network(3)-application-gateway-works.png)

위 그림은 Azure Application Gateway의 **요청 처리 흐름(Flow)**을 보여줍니다. 핵심 순서는 **Frontend IP → Listener(IP/Port/Protocol/Certificate) → Rule → Backend Pool + HTTP Settings(+ Custom Probe)** 입니다.

즉, Listener가 요청을 받으면 Rule이 어느 Backend Pool로 보낼지 결정하고, HTTP Settings/Probe가 "어떻게 보낼지"와 "보낼 수 있는 상태인지"를 함께 판단합니다.


![Azure Application Gateway Component](/images/26-03-11-2026-03-11-azure-network(3)-application-gateway-component.png)

| 구성 요소 | 설명 |
|---|---|
| **Frontend IP** | 공용 IP, 사설 IP 또는 둘 다 설정 가능. 클라이언트가 접속하는 진입점 |
| **Listener** | 프로토콜(HTTP/HTTPS), 포트, 호스트명 조합으로 요청을 수신. Multi-site 리스너로 여러 도메인을 하나의 AGW에서 처리 |
| **Rule** | Listener와 Backend Pool을 연결. Basic(1:1) 또는 Path-based(URL 경로 분기) |
| **Backend Pool** | 실제 요청을 처리하는 대상 (VM, VMSS, App Service, IP 주소) |
| **Health Probe** | 백엔드 인스턴스 상태를 주기적으로 확인하여 비정상 인스턴스를 자동 제외 |
| **HTTP Settings** | 백엔드 연결에 사용할 프로토콜, 포트, 세션 어피니티, 타임아웃 설정 |

> 참고(공식 구성 요소 문서): [Microsoft Learn, "Application Gateway 구성 요소"](https://learn.microsoft.com/ko-kr/azure/application-gateway/application-gateway-components)

### 주요 기능 (L7에서 가능한 일)

Load Balancer가 L4(IP/Port/Protocol) 기준으로 분산한다면, Application Gateway는 L7(경로/호스트/쿠키) 기준으로 라우팅, 보안, TLS 처리를 수행합니다.

| 관점 | 기능 | 실제 동작 | 사용 예시 |
|---|---|---|---|
| **라우팅** | **URL 경로 기반 라우팅** | URL 경로를 기준으로 요청을 서로 다른 백엔드 풀로 분기하며, 경로별로 개별 HTTP Settings(타임아웃/포트/프로토콜) 적용 가능 | 하나의 도메인에서 웹/API/정적 자원을 분리하고 경로별 특성에 맞게 튜닝할 때 |
| | **Multi-site 호스팅** | Host 헤더(`app-a.contoso.com`, `app-b.contoso.com`)에 따라 백엔드 분기 (v2 기준 최대 100개+ 사이트 통합 가능) | 여러 도메인을 AGW 하나로 통합해 운영 복잡도를 줄일 때 |
| | **리디렉션/리라이트** | HTTP→HTTPS, 경로/호스트 리디렉션 및 URL 리라이트 적용 | 표준 URL 정책과 보안 정책(HTTPS 강제)을 일관 적용할 때 |
| **보안** | **SSL/TLS 종료** | 클라이언트 TLS를 AGW에서 종료하고 백엔드에는 HTTP 또는 재암호화 HTTPS로 전달 | 백엔드 암복호화 부담을 줄이고, 인증서 갱신/배포를 AGW에서 중앙 관리할 때 |
| | **End-to-End SSL** | 클라이언트→AGW, AGW→백엔드 구간 모두 TLS 유지 | 내부 구간까지 암호화가 필요한 보안/컴플라이언스 환경 |
| | **WAF 통합** | OWASP 규칙 기반으로 SQLi/XSS 등 웹 공격을 Detection(탐지) 또는 Prevention(차단) 모드로 운영 | 인터넷 노출 웹앱에서 오탐 점검 후 단계적으로 차단 정책을 적용할 때 |
| **가용성, 성능** | **상태 판별(Health Probe)** | 백엔드 상태를 주기적으로 확인해 비정상 인스턴스를 자동 제외 | 일부 서버 장애 시에도 서비스 중단 없이 트래픽을 우회할 때 |
| | **세션 어피니티(Affinity)** | AGW 쿠키로 같은 사용자를 동일 인스턴스에 고정 | 세션 상태를 서버 메모리에 두는 레거시 앱 운영 시 |
| | **자동 스케일링(v2)** | 트래픽 증가 시 인스턴스 자동 확장, 감소 시 축소 | 피크 시간대 변동이 큰 웹 서비스 |
| | **WebSocket/HTTP2 지원** | 장기 연결(WebSocket)과 최신 HTTP 프로토콜 최적화(HTTP/2)를 지원 | 실시간 채팅/알림, 고빈도 API 호출 등 지연 민감 워크로드 |

> 참고: 자동 스케일링은 사용자가 직접 트리거하는 기능이 아니며, 최소/최대 인스턴스 수만 설정하면 Azure가 트래픽에 따라 자동 조절. 현재 인스턴스 수는 포털에서 직접 확인할 수 없고, Azure Monitor의 **Capacity Units** 메트릭으로 간접 확인만 가능.

### SKU 비교

| 항목 | Standard v2 | WAF v2 |
|---|---|---|
| 자동 스케일링 | 지원 | 지원 |
| 영역 중복(Zone Redundancy) | 지원 | 지원 |
| WAF | 미지원 | 지원 (DRS 2.1 / OWASP CRS 3.2) |
| 정적 VIP | 지원 | 지원 |
| Private Link | 지원 | 지원 |

### 포털에서 볼 수 있는 추가 설정

**FIPS 140-2 모드**

미국 연방정부가 정한 암호화 모듈 보안 표준입니다. 켜면 AGW가 **FIPS 인증을 받은 암호화 알고리즘만 사용**하게 됩니다 (TLS 핸드셰이크, 키 교환 등). 미국 정부 기관이나 규제가 엄격한 금융/의료 환경에서 컴플라이언스 충족을 위해 필요하며, 일반적인 웹 서비스라면 별도로 켤 필요가 없습니다.

> 참고: 활성화 시 일부 TLS 암호 스위트가 제한되어 클라이언트 호환성이 줄어들 수 있습니다.

**HTTP/2**

포털의 HTTP2 토글은 **클라이언트 → AGW 구간**에서 HTTP/2 프로토콜을 허용할지 여부입니다.

- **사용**: 클라이언트가 HTTP/2로 요청하면 AGW가 HTTP/2로 응답합니다 (멀티플렉싱, 헤더 압축 등 성능 이점).
- **사용 안 함**: 모든 클라이언트 연결을 HTTP/1.1로만 처리합니다.

> 참고: AGW → 백엔드 구간은 항상 **HTTP/1.1**로 통신합니다. HTTP/2는 클라이언트 쪽에만 적용되므로, 특별한 이유가 없으면 **사용**으로 두는 것이 성능상 유리합니다.

### 배포 시 주의사항

**전용 서브넷 필요**: AGW는 전용 서브넷이 필수입니다. 다른 리소스는 함께 배치할 수 없습니다.

**서브넷 크기 권장**: v2는 `/24` 권장입니다. 필수는 아니지만 스케일(최대 125)과 유지보수 시 IP 여유를 확보하기 쉽습니다.

**IP 여유 확인**: 인스턴스 IP + Private Frontend IP + Azure 예약 5개를 함께 계산해야 합니다. 여유가 부족하면 확장이나 업그레이드가 막힐 수 있습니다.

**NSG 필수 규칙**: 리스너 포트(예: 80/443), GatewayManager(65200-65535, v2), AzureLoadBalancer 허용이 필요합니다. 아웃바운드 Internet 허용도 막지 않아야 합니다.

**추가 체크**: DNS 해석(FQDN), UDR 강제 터널링(`0.0.0.0/0`) 영향, 서브넷 `join/read` 권한(RBAC)을 함께 확인하세요.

> 참고: [Microsoft Learn, "Application Gateway infrastructure configuration - NSG"](https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure-nsg)

---

## 3. Traffic Manager

**분류:** 서비스 (DNS 기반 글로벌 트래픽 라우팅)

### 개요

지금까지의 서비스가 리전 안에서 트래픽을 나누는 것이었다면, Traffic Manager는 **전 세계** 여러 리전에 걸친 서비스로 트래픽을 보내줍니다.

Traffic Manager는 앞서 말한 LB나 AGW와 같이 트래픽을 직접 중계하는 방식이 아닌, **DNS 응답만** 주는 방식을 취합니다.

**왜 DNS 방식을 쓸까?**

LB나 AGW처럼 트래픽을 직접 중계(프록시)하려면 모든 패킷이 해당 장비를 거쳐야 합니다. 글로벌 규모에서 이렇게 하면 중계 지점이 병목이 되고, 처리량에 비례해 비용도 올라갑니다. Traffic Manager는 DNS 레벨에서 동작하기 때문에:

- **병목이 없습니다** — 실제 데이터는 클라이언트와 엔드포인트 사이에서 직접 오가므로, Traffic Manager 자체가 처리량 한계가 될 일이 없습니다.
- **프로토콜 제약이 없습니다** — HTTP뿐 아니라 TCP/UDP 등 어떤 프로토콜이든 글로벌 분산이 가능합니다 (DNS는 "어디로 가라"만 알려주고: 실제 연결은 클라이언트가 하므로).
- **비용이 저렴합니다** — 트래픽 전체가 아닌 DNS 쿼리 수 기반 과금이어서, 대용량 트래픽에도 비용 부담이 적습니다.

### 동작 흐름

![Traffic Manager Workflow](/images/26-03-11-2026-03-11-azure-network(3)-Traffic-Manager-Workflow.png)

| 단계 | 동작 |
|---|---|
| **1** | 클라이언트가 `www.contoso.com`에 접속 요청 |
| **2** | DNS가 CNAME(`contoso.trafficmanager.net`)을 확인하고 Traffic Manager에 쿼리 |
| **3~4** | Traffic Manager가 엔드포인트 Health Check 결과와 라우팅 정책을 기반으로 최적 엔드포인트를 선택 |
| **5~6** | 선택된 엔드포인트의 실제 IP(예: `contoso-eu.cloudapp.net`)를 DNS에 반환 |
| **7** | DNS가 클라이언트에게 해당 IP를 응답 |
| **8** | 클라이언트가 해당 IP로 **직접 연결** (Traffic Manager는 더 이상 관여하지 않음) |

핵심은 Traffic Manager가 **데이터 경로에 없다**는 점입니다. DNS 응답으로 "어디로 가라"고 알려줄 뿐, 실제 트래픽은 클라이언트와 엔드포인트 사이에서 직접 오갑니다.

> 참고: [Microsoft Learn, "Traffic Manager 작동 방식"](https://learn.microsoft.com/ko-kr/azure/traffic-manager/traffic-manager-how-it-works)

### 활용 시나리오

- **글로벌 서비스의 지역별 라우팅**
- **재해 복구(DR)**: Primary 리전이 다운되면 자동으로 Secondary 리전으로 DNS 전환
- **블루-그린 배포**: 새 버전에 트래픽의 10%만 보내다가 점진적으로 늘리기
- **비-HTTP 프로토콜의 글로벌 분산**

### 라우팅 방법

| 라우팅 방법 | 설명 | 적용 시나리오 |
|---|---|---|
| **성능(Performance)** | 클라이언트에서 가장 가까운(지연시간 낮은) 엔드포인트 반환 | 글로벌 서비스 최적 응답 |
| **가중치(Weighted)** | 가중치 비율로 분산 | 블루-그린 배포, 점진적 마이그레이션 |
| **우선 순위(Priority)** | 우선순위 기반. Primary 실패 시 Secondary로 전환 | Active-Passive DR |
| **지역(Geographic)** | 클라이언트 지리적 위치에 따라 특정 엔드포인트 지정 | 데이터 주권, 지역별 콘텐츠 |
| **다중값(MultiValue)** | 정상 엔드포인트 IP 여러 개를 한번에 반환 (외부 IPv4/IPv6 엔드포인트만 지원) | 클라이언트가 직접 failover 처리 |
| **서브넷(Subnet)** | 클라이언트 IPv4 서브넷 범위별 엔드포인트 매핑 | 특정 네트워크 대역별 분기 |

### 특성과 주의점

- **트래픽 자체를 프록시하지 않습니다.** DNS 해석만 수행하므로 데이터 경로에 병목이 생기지 않지만, DNS TTL에 따른 전환 지연(수십 초~수 분)이 있을 수 있습니다.
- **HTTP가 아닌 프로토콜도 지원합니다.** DNS 레벨에서 동작하므로 비-HTTP 트래픽 분산에 적합합니다.
- **비용이 저렴합니다.** DNS 쿼리 수 기반 과금이므로 트래픽 기반 과금인 다른 글로벌 서비스보다 훨씬 저렴합니다.

> 참고: [Microsoft Learn, "Traffic Manager FAQ"](https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-faqs)

---

## 4. Azure Front Door

**분류:** 서비스 (L7 글로벌 부하분산 + CDN + WAF)

### 개요

**Azure Front Door(AFD)**는 Microsoft의 **글로벌 에지 네트워크(118개 이상의 에지 위치, 100개 이상의 도시)** 위에서 동작하는, Azure에서 가장 기능이 풍부한 부하분산 서비스입니다. L7 로드밸런서, CDN, WAF를 하나로 통합했습니다.

Traffic Manager가 DNS 응답만 주고 빠지는 방식이었다면, Front Door는 **전 세계 에지(PoP)에서 요청을 직접 받아서 처리**합니다. 클라이언트의 요청이 가장 가까운 PoP에 도착하면, Front Door가 해당 요청을 직접 수신하고 최적의 Origin을 선택해서 Microsoft 백본 네트워크를 통해 전달합니다. 즉, Traffic Manager와 달리 **데이터 경로에 Front Door가 포함**됩니다.

> 참고: [Microsoft Learn, "What is Azure Front Door?"](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview)

### 활용 시나리오

- **글로벌 웹 서비스 가속**: 전 세계 사용자에게 빠른 응답 제공 (Split TCP + 에지 캐싱)
- **글로벌 웹 보안**: 에지에서 DDoS, WAF, Bot 보호를 한번에 처리
- **CDN**: 정적 콘텐츠(이미지, JS, CSS)를 에지에 캐싱하여 원본 서버 부하 감소
- **멀티 리전 고가용성**: 한 리전이 다운되면 에지에서 즉시(실시간) 다른 리전으로 전환


### 동작 원리

Front Door는 전 세계에 분산된 **PoP(Point of Presence)**를 통해 클라이언트와 Origin 사이에서 요청을 중계합니다.

![Front Door Routing](/images/26-03-11-2026-03-11-azure-network(3)-Front-Door-Routing.png)

각 지역의 사용자는 DNS 해석을 통해 가장 가까운 PoP의 **유니캐스트 IP**를 받아 해당 PoP에 연결되고, PoP는 Microsoft 백본 네트워크를 경유하여 최적의 Origin(백엔드)으로 요청을 전달합니다. 클라이언트↔PoP 구간의 TLS 핸드셰이크를 PoP에서 종료(**Split TCP**)하고, PoP↔Origin 구간은 이미 워밍된 백본 연결을 재사용하기 때문에 체감 지연이 크게 줄어듭니다.

> **Split TCP가 왜 빠를까?** 일반 HTTPS 통신은 TCP 3-way handshake + TLS handshake까지 여러 RTT가 필요합니다. 한국→미국 서버의 RTT가 150ms라면 연결 수립에만 수백 ms가 걸리지만, Front Door는 사용자 근처 PoP에서 핸드셰이크를 끝내고 PoP→Origin은 이미 열려 있는 백본 연결을 사용하므로 체감 속도가 훨씬 빨라집니다.

PoP에 도착한 요청은 아래 순서로 처리됩니다.

![Front Door Routing Process](/images/26-03-11-2026-03-11-azure-network(3)-Front-Door-Routing-Process.png)

| 순서 | 처리 단계 | 설명 |
|---|---|---|
| 1~2 | **DNS 해석 및 연결** | Front Door ATM 프로필이 가장 가까운 PoP의 유니캐스트 IP를 반환 |
| 3 | **TLS 연결 수립** | 클라이언트가 PoP에 연결하고, Front Door 프로필과 매칭하여 TLS 핸드셰이크 완료 |
| 4 | **WAF 규칙 평가** | WAF가 활성화되어 있으면 요청을 먼저 검사하여 악성 트래픽 차단 |
| 5 | **라우트 매칭** | Front Door 라우트 규칙에 따라 요청을 처리할 Origin 그룹을 선택 |
| 6 | **규칙 엔진 평가** | 사용자가 정의한 추가적인 비즈니스 규칙이 있다면 규칙 엔진(Rules Engine)을 통해 헤더 수정, 리디렉션, 리라이트 등 추가 처리 |
| 7 | **캐시 확인** | 에지에 캐싱된 콘텐츠가 있으면 Origin 요청 없이 즉시 반환 |
| 8~9 | **Origin 선택 및 전달** | 캐시 미스 시, Origin 그룹에서 최적 Origin을 선택하여 Microsoft 백본을 통해 요청 전달 |

> 참고: [Microsoft Learn, "Front Door 라우팅 아키텍처"](https://learn.microsoft.com/ko-kr/azure/frontdoor/front-door-routing-architecture?pivots=front-door-standard-premium)

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

### Front Door vs Application Gateway 비교

이 두 서비스는 모두 L7에서 동작하기 때문에 자주 비교됩니다. 핵심 차이는 **범위**입니다:

| 비교 항목 | Application Gateway | Azure Front Door |
|---|---|---|
| 범위 | 리전 (단일 데이터센터) | 글로벌 (180+ PoP 에지) |
| 배포 위치 | VNet 서브넷 내 | Microsoft 에지 네트워크 |
| CDN 기능 | 미지원 | 지원 |
| 백엔드 유형 | VM, VMSS, App Service (같은 리전 위주) | 모든 인터넷 연결 가능 엔드포인트 (글로벌) |

> **둘을 함께 쓸 수도 있습니다.** 글로벌 사용자를 Front Door로 받고, 각 리전 내에서는 Application Gateway로 세밀한 경로 라우팅 + WAF를 적용하는 조합이 대규모 서비스에서 흔히 쓰입니다.

### Traffic Manager vs Front Door 비교

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

![LB Select Guide](/images/26-03-11-2026-03-11-azure-network(3)-LB-Select-Guide.png)

| 서비스 | 계층 | 범위 | 한 줄 요약 |
|---|---|---|---|
| Load Balancer | L4 | 리전 | TCP/UDP 고속 분산의 기본기 |
| Application Gateway | L7 | 리전 | URL을 읽고 판단하는 웹 전용 분산 |
| Traffic Manager | DNS | 글로벌 | DNS 응답으로 길만 알려주는 가벼운 글로벌 분산 |
| Azure Front Door | L7 | 글로벌 | 에지에서 모든 걸 해주는 올인원 글로벌 서비스 |

<br>

---

# 보안 서비스

Azure는 네트워크 보안을 위해 역할이 다른 3가지 서비스를 제공합니다.

| 서비스 | 동작 계층 | 보호 대상 | 핵심 역할 |
|---|---|---|---|
| **Azure Firewall** | L3-L7 | VNet 전체 (인바운드/아웃바운드/Spoke 간) | 네트워크 트래픽 중앙 제어 |
| **Azure WAF** | L7 (HTTP/HTTPS) | 웹 애플리케이션 (AGW 또는 AFD에 연결) | OWASP 웹 공격 탐지/차단 |
| **Azure DDoS Protection** | L3/L4 | 공용 IP 리소스 | 대규모 DDoS 공격 완화 |

네트워크 전체를 제어하는 Firewall부터 시작해서, 웹 보안(WAF), DDoS 대응 순서로 살펴보겠습니다.

---

## 5. Azure Firewall

**분류:** 서비스 (클라우드 네이티브 L3-L7 방화벽)

### 개요

**Azure Firewall**은 VNet에 배포되는 **완전 관리형 상태 저장(Stateful) 방화벽**입니다. NSG가 서브넷/NIC 단위로 트래픽을 제어한다면, Azure Firewall은 **VNet 전체의 인바운드/아웃바운드/Spoke 간 트래픽을 한 곳에서 중앙 관리**합니다.

Hub-Spoke 아키텍처에서 Hub VNet에 배치하여 모든 Spoke의 트래픽이 Firewall을 거치도록 하는 것이 대표적인 패턴입니다.

> 참고: [Microsoft Learn, "What is Azure Firewall?"](https://learn.microsoft.com/en-us/azure/firewall/overview)

### 활용 시나리오

- **Hub-Spoke 아키텍처의 중앙 보안**: 모든 Spoke VNet의 트래픽을 Hub의 Firewall로 모아서 통제
- **아웃바운드 트래픽 제어**: FQDN/URL 기반 제한
- **인바운드 NAT**: 인터넷에서 내부 서비스로의 접근을 DNAT 규칙으로 제어
- **규정 준수**: 모든 트래픽 로그를 중앙에서 기록하여 감사 요구사항 충족

### Hub-Spoke에서의 배치

![Firewall Hub & Spoke](/images/26-03-11-2026-03-11-azure-network(3)-Firewall-Hub-n-Spoke.png)

위 그림은 Azure의 대표적인 **Hub-Spoke 네트워크 토폴로지**입니다. Hub VNet에 공유 서비스를 집중 배치하고, Spoke VNet은 워크로드별(Production / Non-production)로 분리합니다.

**Hub VNet의 핵심 구성 요소:**

| 구성 요소 | 역할 |
|---|---|
| **Azure Firewall** | 모든 Spoke의 인바운드/아웃바운드/Spoke간 트래픽을 중앙에서 검사 및 제어 |
| **VPN Gateway / ExpressRoute** | 온프레미스(Cross-premises network)와의 하이브리드 연결 |
| **Azure Bastion** | VM에 대한 SSH/RDP 접속을 공용 IP 노출 없이 브라우저에서 수행 |
| **Azure Monitor** | Hub/Spoke 전체의 진단 로그, 메트릭, 알림을 중앙 수집 |

**트래픽 흐름:**

- Spoke VNet은 **VNet Peering**으로 Hub에 연결되며, 각 Spoke 서브넷에 **UDR(사용자 정의 경로)**을 설정하여 모든 트래픽을 Hub의 Firewall로 **강제 경유(Forced Tunnel)** 시킵니다.
- Firewall이 규칙에 따라 허용/차단을 판단한 후에만 트래픽이 전달됩니다. 인터넷 아웃바운드, Spoke 간 통신, 온프레미스 연결 모두 동일하게 Firewall을 거칩니다.
- 온프레미스 트래픽도 VPN Gateway/ExpressRoute → Firewall을 경유하도록 구성하면 온프레미스↔Azure 간 트래픽까지 일관된 보안 정책을 적용할 수 있습니다.

**Spoke 간 분리:**

- Production Spoke와 Non-production Spoke는 서로 직접 피어링하지 않고, 반드시 Hub Firewall을 거쳐서만 통신하도록 설계합니다. 이렇게 하면 개발/테스트 환경에서 운영 환경으로의 무단 접근을 방지할 수 있습니다.
- 비피어링 Spoke끼리도 Hub를 통해 연결(Peered or directly connected)할 수 있으며, 이 경우에도 Firewall 규칙이 적용됩니다.

**Azure Virtual Network Manager**를 사용하면 VNet Peering, 보안 규칙, 라우팅 구성을 여러 구독/VNet에 걸쳐 중앙에서 일괄 관리할 수 있습니다.

> 참고: [Microsoft Learn, "Hub-spoke network topology in Azure"](https://learn.microsoft.com/ko-kr/azure/architecture/networking/architecture/hub-spoke)

### 핵심 특성

| 항목 | 설명 |
|---|---|
| 배포 위치 | **AzureFirewallSubnet** (/26 이상 필수) |
| 고가용성 | 내장 HA (다중 인스턴스, 자동 스케일링) |
| 가용 영역 | 최대 3개 AZ에 걸쳐 배포 가능 |
| 관리 | Azure Firewall Policy 또는 Azure Firewall Manager로 중앙 관리 |

### SKU별 기능

SKU에 따라 검사할 수 있는 범위가 달라집니다. Basic은 L3-L4 수준의 기본 필터링, Standard는 FQDN/URL 필터링과 위협 인텔리전스, Premium은 여기에 **TLS 복호화와 IDPS(침입 탐지/방지)**가 추가됩니다.

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

> 참고: [Microsoft Learn, "Azure Firewall Premium features"](https://learn.microsoft.com/en-us/azure/firewall/premium-features)

### 규칙 처리 순서

Firewall Policy에서 규칙은 **Rule Collection Group → Rule Collection → Rule** 3단 계층으로 구성됩니다.

```
Firewall Policy 규칙 계층

Firewall Policy
 └─ Rule Collection Group (우선순위: 100~65000)
      └─ Rule Collection (우선순위, 유형: DNAT / Network / Application)
           └─ Rule (개별 규칙)
```

**처리 순서:**

1. **Rule Collection Group**이 우선순위 순으로 평가됩니다 (숫자가 낮을수록 먼저).
2. 각 Group 안에서는 **유형별 순서**가 적용됩니다: **DNAT → Network → Application**.
3. 같은 유형 내에서는 **Rule Collection 우선순위** 순으로 평가됩니다.
4. 모든 Group의 모든 규칙에 매칭되지 않으면 **기본 동작: 차단(Deny by default)**.

예를 들어 Group A(우선순위 200)와 Group B(우선순위 300)가 있다면, Group A의 DNAT → Network → Application 규칙이 **모두 먼저** 평가된 뒤 Group B로 넘어갑니다. Group B의 Network 규칙이 Group A의 Application 규칙보다 먼저 평가되는 일은 없습니다.

> **DNAT와 암묵적 허용**: DNAT(Destination NAT) 규칙은 인터넷에서 들어오는 트래픽의 **목적지 IP:Port를 변환**하여 내부 서버로 전달하는 규칙입니다. 예를 들어 "Firewall 공용 IP의 443 포트로 들어온 요청을 내부 VM 10.0.1.4:443으로 보내라"는 식입니다. DNAT 규칙에 매칭되었다는 것은 관리자가 이미 **"이 트래픽은 내부로 전달하겠다"고 명시적으로 허용**한 것이므로, 같은 트래픽을 Network 규칙에서 다시 허용/차단 판단하는 것은 불필요합니다. 이 때문에 Azure Firewall은 DNAT 매칭 트래픽에 대해 Network 규칙을 건너뛰는 **암묵적 허용(Implicit Allow)** 을 적용합니다. 만약 이중 판단을 하면 관리자가 DNAT로 열어둔 트래픽이 Network 규칙의 Deny에 걸려 차단되는 모순이 발생할 수 있기 때문입니다.

> 참고: [Microsoft Learn, "Azure Firewall Policy rule sets"](https://learn.microsoft.com/en-us/azure/firewall/policy-rule-sets)

### Firewall Policy

Azure Firewall의 규칙 관리 방식은 **Classic Rules(레거시)**과 **Firewall Policy** 두 가지가 있습니다.

| 항목 | Classic Rules (레거시) | Firewall Policy (권장) |
|---|---|---|
| 규칙 저장 위치 | Firewall 리소스에 직접 내장 | **별도의 Azure 리소스**로 분리 |
| 다중 Firewall 공유 | 불가 (각 Firewall에 개별 설정) | **하나의 Policy를 여러 Firewall에 연결** 가능 |
| 계층 구조 (상속) | 미지원 | **부모-자식 Policy** 상속 지원 |
| Premium 기능 (TLS 검사, IDPS) | 미지원 | Policy에서 구성 |
| 관리 도구 | 개별 Firewall에서 직접 편집 | Azure Firewall Manager로 중앙 관리 |

**Firewall Policy**는 Firewall과 독립된 최상위 리소스입니다. 규칙을 Firewall 밖으로 분리함으로써 다음이 가능해집니다:

- **여러 Firewall에 동일 Policy를 연결**하여 규칙 일관성을 유지할 수 있습니다. Hub-Spoke가 여러 리전에 걸쳐 있더라도 하나의 Policy로 통일할 수 있습니다.
- **부모-자식 계층 구조**: 보안팀이 부모 Policy에 조직 필수 규칙(예: 특정 FQDN 차단)을 정의하면, 각 팀은 자식 Policy에 팀별 규칙만 추가합니다. 자식은 부모 규칙을 상속받으며, 부모 규칙이 우선 적용됩니다.
- **Premium 기능(TLS 검사, IDPS)**은 Firewall Policy를 통해서만 구성할 수 있습니다. Premium SKU를 사용하려면 반드시 Firewall Policy가 필요합니다.

> **Classic Rules는 신규 배포에 권장되지 않습니다.** 기존 Classic 구성도 Firewall Policy로 마이그레이션할 수 있으며, Classic과 Policy를 동시에 사용할 수는 없습니다.
>
> 참고: [Microsoft Learn, "Azure Firewall Policy overview"](https://learn.microsoft.com/en-us/azure/firewall/policy-overview)

---

## 6. Azure WAF

**분류:** 기능 (L7 웹 보안 — AGW 또는 AFD에 연결)

### 개요

**WAF(Web Application Firewall)**는 독립 서비스가 아니라, **Application Gateway** 또는 **Azure Front Door**에 붙여서 사용하는 보안 기능입니다. SQL Injection, XSS(Cross-Site Scripting) 같은 **OWASP Top 10 웹 공격**을 자동으로 탐지하고 차단합니다.

Azure Firewall이 네트워크 전체의 L3-L7 트래픽을 제어한다면, WAF는 **HTTP/HTTPS 웹 트래픽에 특화된 보안**을 담당합니다.

> 참고: [Microsoft Learn, "What is Azure Web Application Firewall?"](https://learn.microsoft.com/en-us/azure/web-application-firewall/overview)

### 활용 시나리오

- **웹 애플리케이션 보호**: OWASP Top 10 계열 공격 방어
- **Bot 차단**: 악성 크롤러, 스크래퍼, 자동화된 공격 Bot 필터링
- **규정 준수**: PCI DSS 등 보안 규정에서 요구하는 WAF 배포 조건 충족
- **글로벌 에지 보안**: Front Door WAF로 공격 트래픽이 Origin에 도달하기 전에 에지에서 차단

### 배치 위치에 따른 보호 범위

| 항목 | WAF on Application Gateway | WAF on Front Door |
|---|---|---|
| 보호 범위 | 리전 단위 (AGW 뒤 백엔드) | 글로벌 에지 (전 세계 PoP에서 차단) |
| 공격 차단 시점 | 트래픽이 리전에 도달한 후 | 트래픽이 **Origin에 도달하기 전** 에지에서 차단 |
| 관리형 규칙셋 | DRS 2.1 / OWASP CRS 3.2 | DRS (Default Rule Set) + Bot Manager |
| Bot 보호 | 제한적 | 지원 (Bot Manager 규칙셋) |
| 적합 시나리오 | 리전 내 단일 웹앱 보호 | 글로벌 웹앱, DDoS+WAF 통합 보호 |

> Front Door WAF는 공격을 에지에서 차단하므로 악성 트래픽이 리전까지 도달하지 못합니다. 리전 내부에서만 접근 가능한 웹앱이라면 AGW WAF가 적합합니다.

### WAF 운영 모드

| 모드 | 동작 | 용도 |
|---|---|---|
| **Detection** | 위반 로그만 기록, 트래픽은 통과 | 초기 도입 시 오탐(False Positive) 확인 |
| **Prevention** | 위반 트래픽 실제 차단 (403 응답) | 운영 환경 적용 |

WAF를 처음 도입할 때는 **Detection 모드**로 시작하는 것이 권장됩니다. 정상 요청이 오탐으로 차단될 수 있으므로, 로그를 확인해 **Exclusion(제외)** 설정을 적용한 뒤 Prevention 모드로 전환합니다.

> 참고: [Microsoft Learn, "Web Application Firewall best practices"](https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-best-practices)

### WAF Policy 연결 범위와 우선순위 (Application Gateway)

WAF Policy는 AGW의 **세 가지 수준**에 각각 연결할 수 있으며, 더 구체적인 수준에 연결된 정책이 우선 적용됩니다.

| 연결 수준 | 설명 | 우선순위 |
|---|---|---|
| **수신기(Listener)** | 특정 리스너에 연결. 해당 리스너로 들어오는 요청에만 적용 | **가장 높음** |
| **경로(Path Rule)** | 경로 기반 라우팅 규칙의 특정 경로에 연결 | 중간 |
| **AGW 전체(Global)** | Application Gateway 리소스 자체에 연결. 개별 정책이 없는 리스너/경로에 적용 | 가장 낮음 |

예를 들어 AGW 전체에 OWASP CRS 3.2 관리형 규칙이 포함된 Policy A를 걸고, 특정 리스너에 커스텀 규칙만 있는 Policy B를 걸면, 해당 리스너의 요청은 **Policy B만 적용**됩니다. Policy A의 관리형 규칙은 평가되지 않습니다.

### 정책 내부 규칙 처리 순서

하나의 WAF Policy 안에서는 다음 순서로 규칙이 평가됩니다:

```
WAF Policy 규칙 처리 순서

1. Custom Rules (우선순위 숫자 순)
        ↓ 매칭 안 되면
2. Managed Rules (DRS 2.1 / OWASP CRS 3.2)
        ↓ 매칭 안 되면
3. 기본 동작: 통과
```

- **Custom Rules**이 Managed Rules보다 항상 먼저 평가됩니다.
- Custom Rules 내에서는 **우선순위(Priority) 숫자가 낮은 규칙**이 먼저 평가됩니다.
- 규칙의 Action은 **Allow(통과)**, **Block(차단)**, **Log(기록만)**, **Redirect(리디렉션)** 등이 있습니다.

### 주의: 정책 단위 적용의 함정

WAF는 **정책 단위로 독립 적용**됩니다. 수신기에 걸린 정책이 있으면 해당 요청은 **그 정책 안의 규칙만 평가**하고, AGW 전체에 걸린 다른 정책은 거치지 않습니다.

이로 인해 실무에서 흔히 발생하는 문제:

- AGW 전체에 OWASP CRS 3.2가 포함된 정책을 걸어둠
- 특정 리스너에 IP 허용/차단용 커스텀 규칙만 있는 별도 정책을 연결
- **결과**: 해당 리스너의 트래픽은 커스텀 규칙의 Allow/Block 결과와 관계없이 **OWASP 관리형 규칙을 거치지 못함**. 커스텀 규칙에서 Allow로 통과해도 AGW 전체 정책의 OWASP 검사가 적용되지 않습니다.

이 때문에 수신기/경로 수준에 별도 정책을 걸 경우, **해당 정책 안에도 관리형 규칙을 포함**시켜야 합니다. 정책 간 체이닝(한 정책 통과 후 다른 정책 평가)은 지원되지 않습니다.

> 참고: [Microsoft Learn, "WAF Policy per-listener and per-site"](https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/policy-overview)

---

## 7. Azure DDoS Protection

**분류:** 서비스 (L3/L4 DDoS 완화)

### 개요

**DDoS(Distributed Denial of Service)** 공격은 대량의 트래픽을 동시에 보내 서비스를 마비시키는 공격입니다.

Azure는 모든 리소스에 기본적으로 **DDoS Infrastructure Protection(무료)**을 제공합니다. 공용 IPv4/IPv6 주소를 사용하는 모든 Azure 서비스(Azure DNS 같은 PaaS 포함)를 추가 비용 없이 보호하며, 사용자 구성이나 애플리케이션 변경 없이 자동으로 동작합니다.

다만 Infrastructure Protection은 Azure 플랫폼 전체를 보호하는 일괄적인 방어막이라 개별 서비스에 맞춤화되어 있지 않습니다. 유료 계층인 **DDoS IP Protection**과 **DDoS Network Protection**은 개별 서비스의 트래픽 패턴을 ML로 학습하여 맞춤형으로 방어합니다.

> 참고: [Microsoft Learn, "Azure DDoS Protection overview"](https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview)

### 활용 시나리오

- **공용 IP가 있는 비즈니스 크리티컬 서비스 보호**
- **공격 가시성 확보**: 공격이 어디서, 언제, 얼마나 큰 규모로 왔는지 텔레메트리로 확인
- **비용 보호**: DDoS로 인해 자동 스케일아웃된 비용을 Azure 크레딧으로 보상
- **긴급 대응**: Microsoft DDoS Rapid Response 팀의 전문 지원

### 계층 비교

| 항목 | DDoS Infrastructure Protection | DDoS IP Protection | DDoS Network Protection |
|---|---|---|---|
| 비용 | **무료** (자동 적용) | 보호된 IP당 과금 | 보호된 IP 100개당 과금 (월 약 $2,944 + 초과) |
| 보호 대상 | 공용 IPv4/IPv6를 사용하는 **모든 Azure 서비스** (PaaS 포함) | 특정 공용 IP 리소스 | VNet에 연결된 공용 IP 리소스 |
| 사용자 구성 | 불필요 (자동 적용) | 공용 IP에서 활성화 | VNet에서 활성화 |
| 트래픽 프로파일링 | 플랫폼 수준 일괄 임계값 | ML 기반 적응형 임계값 | ML 기반 적응형 임계값 |
| 메트릭 및 경고 | 미지원 | 지원 | 지원 |
| 완화 보고서 | 미지원 | 지원 | 지원 |
| DDoS Rapid Response | 미지원 | 미지원 | **지원** |
| 비용 보호 | 미지원 | 미지원 | **지원** |
| WAF 할인 | 미지원 | 미지원 | **지원** |
| 공용 IP Basic 계층 보호 | 지원 | **미지원** | 지원 |

**DDoS IP Protection**은 Network Protection과 기능이 거의 동일하지만, **DDoS Rapid Response, 비용 보호, WAF 할인이 빠져 있고** IP 단위로 과금되어 보호할 IP가 적을 때 비용 효율적입니다.

> **비용 보호(Cost Protection)**: DDoS 공격 시 자동 스케일링이 활성화되면 공격 트래픽 처리를 위해 VM과 대역폭이 급증하여 예상치 못한 비용이 발생할 수 있습니다. Network Protection은 DDoS로 인한 스케일 아웃 비용을 Azure 크레딧으로 보상합니다.

> 참고: [Microsoft Learn, "Azure DDoS Protection SKU 비교"](https://learn.microsoft.com/ko-kr/azure/ddos-protection/ddos-protection-sku-comparison)

### 보호 대상 리소스

DDoS Protection(IP/Network)이 보호하는 **공용 IP가 연결된 리소스**:

- IaaS VM, Load Balancer (Classic/Standard), Application Gateway (WAF 포함)
- Azure Firewall, VPN Gateway, Azure Bastion, Azure API Management (프리미엄)
- Service Fabric, NVA(네트워크 가상 어플라이언스)
- BYOIP(사용자 지정 IP 접두사)로 Azure에 가져온 공용 IP 범위

**지원되지 않는 리소스:**

- Azure Virtual WAN
- NAT Gateway에 연결된 공용 IP
- 다중 테넌트 PaaS 서비스 (App Service Environment, VNET 통합 외 모드의 API Management)

> **웹 워크로드 권장 아키텍처**: DDoS Protection + AGW WAF(또는 Front Door WAF)를 함께 사용하면 L3/L4(DDoS)와 L7(웹 공격)을 모두 방어할 수 있습니다.

> 참고: [Microsoft Learn, "Azure DDoS Protection 참조 아키텍처"](https://learn.microsoft.com/ko-kr/azure/ddos-protection/ddos-protection-reference-architectures)

### 주의사항

- DDoS Protection은 **공용 IP 리소스에 대해서만 동작**합니다. Private Endpoint, Internal LB 등 사설 IP만 사용하는 리소스에는 적용되지 않습니다.
- Network Protection의 월 $2,944는 적지 않은 비용입니다. 보호할 공용 IP가 소수라면 **IP Protection**이 비용 효율적이고, 소규모 서비스라면 무료 Infrastructure Protection으로 충분할 수 있습니다.
- 단일 VM이 공용 IP 뒤에서 실행되는 구성은 권장되지 않습니다. DDoS 공격 감지 시 완화가 즉시 시작되지 않을 수 있어, 스케일 아웃이 불가능한 단일 VM은 중단될 수 있습니다.

<br>

---

# 하이브리드 연결

온프레미스(회사 데이터센터)와 Azure를 연결하는 2가지 서비스입니다. 비용과 성능 요구사항에 따라 선택합니다.

| 서비스 | 동작 계층 | 연결 경로 | 핵심 역할 |
|---|---|---|---|
| **VPN Gateway** | L3 (IPsec/IKE) | 공용 인터넷 (암호화 터널) | S2S(사이트 간 상시 연결), P2S(개인 원격 접속) |
| **ExpressRoute** | L3 (BGP) | 전용 프라이빗 회선 | 대용량·저지연 전용 연결 |

---

## 8. VPN Gateway

**분류:** 서비스 (암호화된 하이브리드 연결)

### 개요

**VPN Gateway**는 온프레미스와 Azure VNet 사이에 **암호화된 터널**을 만들어주는 서비스입니다. 공용 인터넷을 통해 연결하되, IPsec/IKE 프로토콜로 모든 데이터가 암호화됩니다.

> 참고: [Microsoft Learn, "What is Azure VPN Gateway?"](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways)

### 연결 유형 — S2S vs P2S

| 유형 | 연결 구성 | 특징 |
|---|---|---|
| **S2S (Site-to-Site)** | 온프레미스 VPN 장비 ←─ IPsec/IKE 터널 ─→ Azure VPN GW | 회사 네트워크 전체를 Azure에 연결. 항상 연결(Always-on). 온프레미스에 VPN 장비(공인 IP) 필요 |
| **P2S (Point-to-Site)** | 개별 PC/노트북 ←─ VPN 클라이언트 ─→ Azure VPN GW | 재택근무자·출장자가 개인 PC로 Azure에 접속. 필요할 때만 연결. VPN 장비 불필요(소프트웨어 클라이언트만) |

### S2S (Site-to-Site) 상세

| 항목 | 설명 |
|---|---|
| 용도 | 온프레미스 데이터센터 ↔ Azure VNet **상시 연결** |
| 프로토콜 | IPsec/IKEv2 (암호화 터널) |
| 온프레미스 요구사항 | **VPN 장비** 필요 (온프레미스 측 공인 IP, IKEv2 지원) |
| 대역폭 | SKU에 따라 650 Mbps ~ 10 Gbps (VpnGw1 ~ VpnGw5 기준, Basic SKU 2025.9.30 퇴역) |
| BGP 지원 | 지원 (Active-Active 구성 시 권장) |
| 다중 사이트 | 하나의 VPN Gateway에 여러 온프레미스 사이트 연결 가능 |

### P2S (Point-to-Site) 상세

| 항목 | 설명 |
|---|---|
| 용도 | **개별 사용자** (재택근무, 출장)가 노트북/PC에서 Azure VNet으로 접속 |
| 프로토콜 | OpenVPN, IKEv2, SSTP (Windows 전용) |
| 인증 방법 | Azure AD(Entra ID) 인증 **(OpenVPN 프로토콜 전용)**, 인증서 기반, RADIUS |
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

### 배포 시 주의사항

- **GatewaySubnet** 전용 서브넷 필수 (/27 이상 권장). 이 서브넷에는 다른 리소스를 배포할 수 없습니다.
- VPN Gateway는 **배포에 30~45분**이 걸립니다. 급하게 필요한 상황이면 미리 준비해두세요.
- S2S 연결 시 온프레미스 VPN 장비의 **공인 IP가 필요**합니다. NAT 뒤에 있으면 추가 설정이 필요할 수 있습니다.

---

## 9. ExpressRoute

**분류:** 서비스 (전용 프라이빗 연결)

### 개요

**ExpressRoute**는 통신사(Connectivity Provider)가 제공하는 **전용 프라이빗 회선**으로 온프레미스와 Azure를 직접 연결합니다. 공용 인터넷을 거치지 않기 때문에 **대역폭이 크고, 지연이 낮으며, 품질이 일정**합니다.

> 참고: [Microsoft Learn, "What is Azure ExpressRoute?"](https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction)

### 활용 시나리오

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
| SLA | 99.95% (Active-Active 구성) | 99.95% (공식 Azure SLA 기준) |
| 비용 | 저렴 | 상대적으로 고가 (회선 + Gateway + 포트 비용) |
| 적합 환경 | 중소규모, 비용 민감 | 대기업, 대용량, 저지연 필수 |

### ExpressRoute 피어링

| 피어링 유형 | 접근 대상 |
|---|---|
| **Azure Private Peering** | VNet 내 리소스 (VM, ILB, 프라이빗 엔드포인트 등) |
| **Microsoft Peering** | Microsoft 365, Azure PaaS 공용 엔드포인트 (Storage, SQL 등) |

> **참고**: Azure Public Peering은 **퇴역(Deprecated)**되었으며 Microsoft Peering으로 통합되었습니다.

> 참고: [Microsoft Learn, "Using S2S VPN as a backup for ExpressRoute private peering"](https://learn.microsoft.com/en-us/azure/expressroute/use-s2s-vpn-as-backup-for-expressroute-privatepeering)

<br>

---

# 네트워크 진단

네트워크 리소스의 모니터링, 진단, 로깅을 위한 통합 도구입니다.

---

## 10. Azure Network Watcher

**분류:** 서비스 (네트워크 모니터링 및 진단)

### 개요

**Azure Network Watcher**는 네트워크 리소스의 **모니터링, 진단, 로깅**을 위한 통합 도구 모음입니다. 트래픽 차단 원인 확인, 패킷 드롭 지점 추적, NSG 규칙 분석 등 네트워크 문제 해결에 필요한 도구를 한 곳에서 제공합니다.

> 참고: [Microsoft Learn, "What is Azure Network Watcher?"](https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-overview)

### 활용 시나리오

- **VM 간 통신 장애 진단**: "VM A에서 VM B의 443 포트로 왜 연결이 안 되지?"
- **경로 확인**: "이 트래픽이 Azure Firewall을 제대로 경유하고 있는지 확인하고 싶다"
- **보안 감사**: "지난 1시간 동안 이 서브넷에 어떤 트래픽이 있었는지 로그를 보고 싶다"
- **VPN 터널 진단**: "S2S VPN 터널이 자꾸 끊어지는 원인을 찾고 싶다"
- **트래픽 패턴 시각화**: "전체 네트워크 트래픽 흐름을 대시보드로 한눈에 보고 싶다"

### 주요 도구

| 도구 | 기능 | 대표 시나리오 |
|---|---|---|
| **IP 흐름 확인 (IP Flow Verify)** | 특정 5-튜플에 대해 NSG 허용/차단 여부 확인 | "이 VM에서 저 VM의 443 포트로 통신이 왜 안 되지?" |
| **NSG 진단 (NSG Diagnostics)** | 트래픽에 적용되는 NSG 규칙 상세 분석 | "어떤 NSG 규칙이 이 트래픽을 차단하는 거지?" |
| **다음 홉 (Next Hop)** | VM에서 특정 목적지로 가는 다음 홉 유형 확인 | "이 트래픽이 Firewall을 경유하고 있는지 확인하고 싶다" |
| **연결 문제 해결 (Connection Troubleshoot)** | 소스→목적지 간 연결 경로 추적 및 지연 측정 | "VM에서 SQL DB까지 연결이 안 된다. 어디서 끊기지?" |
| **패킷 캡처 (Packet Capture)** | VM NIC에서 패킷을 캡처하여 pcap 파일로 저장 | "이상 트래픽의 실제 패킷 내용을 분석하고 싶다" |
| **NSG 흐름 로그 (NSG Flow Logs)** | NSG를 통과하는 모든 트래픽의 흐름 로그 기록 | "지난 1시간 동안 이 서브넷에 어떤 트래픽이 있었나?" |
| **VPN 진단** | VPN Gateway 연결 상태 및 터널 진단 | "S2S VPN 터널이 자꾸 끊어진다" |
| **연결 모니터 (Connection Monitor)** | 엔드포인트 간 연결 상태를 **지속적으로** 모니터링 | "온프레미스 ↔ Azure 간 지연/패킷 손실 추이를 보고 싶다" |
| **트래픽 분석 (Traffic Analytics)** | NSG 흐름 로그를 분석하여 시각화 대시보드 제공 | "전체 네트워크 트래픽 패턴을 한눈에 보고 싶다" |

### 실무 트러블슈팅 흐름

실제로 가장 흔한 문제인 "VM A → VM B 통신 안 됨"을 Network Watcher로 해결하는 순서입니다.
각 단계에서 결과에 따라 분기하며, 문제 지점을 좁혀나갑니다:

![Network Watcher Flow](/images/26-03-11-2026-03-11-azure-network(3)-Network-Watcher_Flow.png)

> 첫 번째 원칙: **"일단 IP Flow Verify부터"**. 각 단계에서 문제가 발견되면 해당 지점에서 원인을 해결하고, 문제가 없으면 다음 단계로 진행합니다.

> **팁**: `NSG 흐름 로그 + 트래픽 분석`을 조합하면 어떤 IP가 어느 포트로 얼마나 통신하는지 Log Analytics 대시보드에서 한눈에 파악할 수 있습니다. 보안 감사나 이상 트래픽 탐지에 매우 유용합니다.

> 참고: [Microsoft Learn, "Traffic analytics"](https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics)

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
