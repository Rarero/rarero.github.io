---
layout: post
title: Azure Private DNS 통신 과정
image: terraform.png
date: 2025-04-15 09:00:00 +0900
tags: [Azure, Networking]
categories: Terraform
---
# Azure Piravate DNS Zone 구축 및 테스트 가이드

이 문서는 Azure 환경에서 내부 리소스 간 안정적인 DNS 이름 해석과 통신을 보장하기 위해 Azure Piravate DNS Zone을 사용하는 방법을 설명합니다.  
실제 테스트를 통해 퍼블릭 IP와 프라이빗 IP 사용 시 발생하는 차이점을 비교하며, 부록에서는 Azure Piravate DNS Resolver에 대해 다룹니다.

---

## 1. Azure Piravate DNS Zone이 무엇인지

Azure Piravate DNS Zone은 Azure Virtual Network(VNet) 내에서 도메인 이름 기반의 리소스 간 통신을 가능하게 하는 사설 DNS 서비스입니다.  
내부 리소스들이 외부 공개 DNS 서버에 의존하지 않고, 안전하고 일관된 이름 해석을 수행할 수 있도록 돕습니다.

**주요 특징**

- **내부 이름 해석**: VNet 및 피어링된 VNet 내에서 도메인 이름을 통해 리소스를 확인할 수 있습니다.
- **보안 강화**: 외부에 노출되지 않는 사설 DNS 영역을 관리하여 보안을 유지합니다.
- **유연한 레코드 관리**: A, CNAME, MX 등 다양한 DNS 레코드 타입을 지원합니다.
- **네트워크 단순화**: 복잡한 내부 DNS 구성을 단순화하고 중앙에서 관리할 수 있습니다.

---

## 2. Azure Piravate DNS Zone 구성 방법

Azure Piravate DNS Zone을 구성하는 기본 절차는 다음과 같습니다.

1. **DNS Zone 생성**  
   Azure Portal 또는 CLI를 사용해 "privatedns.daoudata.local"과 같은 Private DNS Zone을 생성합니다.
2. **DNS 레코드 등록**  
   내부 리소스에 필요한 A 레코드 등을 등록합니다.  
   예시: "server2"라는 이름을 내부 IP "10.0.13.5"에 매핑합니다.
3. **VNet 링크 연결**  
   생성한 DNS Zone을 사용할 Virtual Network 또는 피어링된 VNet에 연결합니다.
4. **테스트 및 검증**  
   내부 VM에서 nslookup, ping, curl 등의 명령어를 사용해 이름 해석 및 통신이 올바르게 이루어지는지 확인합니다.

---

## 3. Azure Piravate DNS Zone 통신 아키텍처

Azure Piravate DNS Zone을 이용한 내부 통신은 다음과 같이 이루어집니다.

- **내부 네임 해석**  
  서버1에서 "server2"로 DNS 질의를 보내면, Azure DNS Resolver가 Private DNS Zone을 조회해 프라이빗 IP(예: 10.0.13.5)를 반환합니다.
- **통신 경로**  
  반환된 프라이빗 IP를 기반으로 서버1과 서버2 간의 트래픽이 VNet 내부 경로로 전송됩니다.
- **퍼블릭 IP와의 비교**  
  만약 퍼블릭 IP(예: 20.1.2.3)를 사용할 경우, 기본 라우팅에 의해 트래픽이 인터넷을 경유하게 되어 NSG 정책에 따라 차단될 수 있습니다.

---

## 4. Azure Piravate DNS Zone 구축 및 테스트

내부 통신 구성을 검증하기 위해 아래와 같이 테스트를 진행하였습니다.

### 4.1 테스트 환경

테스트 구성 요소는 다음과 같습니다.

| 구성 요소   | 설정 값                                      |
|-------------|----------------------------------------------|
| 서버1       | 10.0.11.21 (프라이빗 IP)                      |
| 서버2       | 10.0.13.5 (프라이빗 IP), 20.1.2.3 (퍼블릭 IP)   |
| NSG 정책    | 내부(VNet) 트래픽 허용, 외부(인터넷) 인바운드 차단   |

### 4.2 테스트 1: /etc/hosts에 퍼블릭 IP 등록

**구성**

서버1의 /etc/hosts 파일에 퍼블릭 IP를 아래와 같이 등록합니다.

```curl
20.1.2.3 server2
```

이후 터미널에서 다음 명령어를 실행합니다.

```curl
curl http://server2
```

**결과**

- 서버1은 server2를 20.1.2.3 (퍼블릭 IP)으로 인식합니다.
- 기본 라우팅에 따라 트래픽이 인터넷을 경유하여 전송됩니다.
- 서버2의 NSG 정책에 따라 외부 인바운드 트래픽이 차단되어 트래픽이 도달하지 않습니다.
- **통신 실패**

### 4.3 테스트 2: /etc/hosts 또는 DNS에서 프라이빗 IP 사용

**구성**

서버1의 /etc/hosts 파일에 프라이빗 IP를 등록하거나, Private DNS Zone을 통해 내부 네임 해석을 구성합니다.

등록 예시:

```curl
10.0.13.5 server2
```

또는 DNS 설정으로:

```lua
server2.privatedns.daoudata.local → 10.0.13.5
```

이후 터미널에서 다음 명령어를 실행합니다.

```curl
curl http://server2
```

**결과**

- 서버1은 server2를 10.0.13.5 (프라이빗 IP)로 인식합니다.
- 내부 VNet 경로를 통해 트래픽이 직접 전송됩니다.
- NSG 정책에 따라 내부 트래픽이 허용되어 정상 통신이 이루어집니다.
- **통신 성공**

---

## 5. 부록) Azure Piravate DNS Resolver란?

Azure Piravate DNS Resolver는 온프레미스 또는 비-Azure 네트워크에서 발생한 DNS 요청을 Azure Private DNS Zone으로 전달하는 매니지드 DNS 포워딩 서비스입니다.

**주요 기능 및 구성 요소**

- **온프레미스-클라우드 연결**  
  온프레미스 네트워크에서 Azure 내부 도메인 이름 해석을 가능하게 합니다.
- **인바운드/아웃바운드 포워딩**  
  DNS 요청을 특정 DNS 서버 또는 Private DNS Zone으로 전달하는 포워딩 규칙을 설정할 수 있습니다.
- **매니지드 서비스**  
  별도의 DNS 서버를 구축하지 않고도 Azure에서 효율적으로 DNS 해석을 관리할 수 있습니다.

자세한 정보는 Azure Piravate DNS Resolver 개요를 참고하세요.

---

## 결론

내부 리소스 간 통신 구성을 위해 Azure Piravate DNS Zone을 활용하고 프라이빗 IP 기반의 구성을 채택하는 것은 매우 중요합니다.  
퍼블릭 IP를 사용하는 경우 기본 라우팅에 의해 트래픽이 인터넷을 경유하여 NSG 정책에 의해 차단될 가능성이 크므로,  
안전하고 효율적인 내부 통신을 위해 반드시 프라이빗 IP 기반 구성을 사용해야 합니다.

이 가이드를 통해 Azure 환경에서 DNS 설정 및 내부 통신 시 발생할 수 있는 문제를 미연에 방지하고, 안전한 네트워크 아키텍처를 구축하시기 바랍니다.
