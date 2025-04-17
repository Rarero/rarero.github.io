---
layout: post
title: "Azure DNS Private Resolver"
image: terraform.png
date: 2025-04-17 09:00:00 +0900
tags: [azure, networking]
categories: azure
---
## Azure Private DNS Resolver 개요 및 구성 가이드

Azure Private DNS Resolver는 Azure 내에서 DNS 쿼리를 안전하게 처리할 수 있도록 지원하는 완전 관리형 DNS 포워딩 서비스입니다.  
온프레미스 및 Azure 외부 네트워크에서 Azure Private DNS Zone과 통신하거나, Azure 리소스가 외부 DNS 이름을 조회할 수 있게 해주는 역할을 합니다.

## 1. 주요 구성 요소

- **인바운드 엔드포인트**  
  온프레미스 또는 외부에서 Azure로 들어오는 DNS 요청을 수신합니다.  
  지정된 IP 주소를 통해 Azure 내부의 프라이빗 DNS 영역에 접근할 수 있습니다.

- **아웃바운드 엔드포인트**  
  Azure 내부 리소스가 온프레미스 또는 외부 DNS 서버로 DNS 요청을 보낼 수 있도록 지원합니다.  
  아웃바운드 포워딩은 DNS 포워딩 규칙 세트를 통해 구성됩니다.

- **DNS 포워딩 규칙 세트 (DNS forwarding ruleset)**  
  도메인 이름 패턴에 따라 특정 DNS 서버로 쿼리를 전달할 수 있도록 정의합니다.  
  예: `*.contoso.com` 쿼리를 특정 온프레미스 DNS 서버로 전달.

## 2. 기능 요약

- **DNS 통합**: Azure 내부와 외부 DNS 해석을 통합적으로 구성 가능  
- **보안성 향상**: DNS 요청을 Azure Virtual Network 내부에서 안전하게 처리  
- **Zone-less 구조**: 별도의 DNS 영역 구성 없이도 포워딩 정책만으로 활용 가능  
- **자동 확장 및 고가용성**: Azure 관리형으로 안정성과 확장성이 보장됨

## 3. 구성 시 고려 사항

- 인바운드/아웃바운드 엔드포인트는 서브넷에 배포되며, 해당 서브넷에는 `Microsoft.Network/dnsResolvers` 위임이 필요합니다.  
- 포워딩 규칙 세트는 리소스 그룹 수준에서 관리되며, 여러 VNet에 연결 가능  
- BYO DNS 환경에서 점진적인 전환 가능 (혼합 사용도 가능)

## 4. 사용 시나리오

- Azure 리소스가 온프레미스의 도메인을 조회할 경우  
- 온프레미스에서 Azure Private DNS Zone의 이름을 해석해야 하는 경우  
- 복잡한 하이브리드 DNS 아키텍처를 단순화하려는 경우  

[ Azure DNS Private Resolver 아키텍처 ]
![alt text](../images/Azure_DNS_Private_Resolver_Architecture.png)
자세한 내용은 [Azure 공식 문서](https://learn.microsoft.com/ko-kr/azure/dns/dns-private-resolver-overview)를 참고하세요.

---
## 5. 언제 Azure Private DNS Resolver가 필요한가?

Azure Private DNS Resolver는 모든 환경에서 반드시 필요한 구성 요소는 아니지만, 다음과 같은 상황에서는 필수적이거나 매우 유용합니다.

### 5.1 Resolver가 필요한 대표 시나리오

- **Azure → 온프레미스 도메인 조회**  
  Azure VM 또는 서비스가 온프레미스 DNS 도메인(예: `db.corp.local`)을 조회해야 할 경우  
  → 아웃바운드 엔드포인트 및 DNS 포워딩 규칙 필요

- **온프레미스 → Azure Private DNS Zone 도메인 조회**  
  온프레미스 시스템이 Azure Private DNS Zone의 도메인 이름(예: `sql.privatelink.database.windows.net`)을 해석해야 할 경우  
  → 인바운드 엔드포인트 필요

- **복잡한 하이브리드 네트워크에서 DNS 허브를 구성하려는 경우**  
  다수의 VNet, 온프레미스 환경 간의 통합된 DNS 해석 구조를 구성할 때

- **보안 정책상 Azure 리소스가 퍼블릭 DNS 사용을 제한받는 경우**  
  내부적으로 통제된 DNS 포워딩 경로를 지정해야 할 때

### 5.2 Resolver가 필요하지 않은 경우

- Azure 리소스 간 Private DNS Zone 사용만 필요한 경우 (자동 해석 가능)
- Azure 리소스가 퍼블릭 도메인을 조회할 경우 (기본 Azure DNS 사용)
- 외부 클라이언트가 온프레미스 도메인을 조회하는 경우 (VPN 등 직접 연결 필요)

### 5.3 핵심 요약

| 상황 | Resolver 필요 여부 | 설명 |
|:------|:------------------|:------|
| Azure → 온프레미스 도메인 조회 | 필요 | 아웃바운드 포워딩 구성 |
| 온프레미스 → Azure Private DNS Zone | 필요 | 인바운드 엔드포인트 구성 |
| 외부 → 온프레미스 도메인 | 불필요 | 온프레미스 DNS 서버 직접 연결 필요 |
| Azure 리소스 → 퍼블릭 도메인 | 불필요 | 기본 DNS 경로 사용 |