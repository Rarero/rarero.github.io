---
layout: post
title: "Microsoft Entra (1): 서비스 개요와 ID 및 액세스 관리 생태계"
date: 2026-02-02 09:00:00 +0900
tags: [Study, Azure, Microsoft Entra, Identity, IAM, Security]
categories: Azure_Study
---

클라우드 환경에서 가장 중요한 보안 요소 중 하나는 **ID 및 액세스 관리(Identity and Access Management, IAM)** 입니다.

Microsoft는 2022년 Azure Active Directory(Azure AD)를 비롯한 여러 ID 및 액세스 관리 서비스를 **Microsoft Entra** 제품군으로 통합하며 전체 ID 보안 플랫폼을 재편했습니다.

![entraid icon change](/images/26-02-03-microsoft-entra(1)-change_icon.png)
<div style="text-align: center;"><small>2022년 변경된 아이콘</small></div>

이번 포스트에서는 Microsoft Entra가 무엇이며, 어떤 제품군으로 구성되어 있는지 전체적으로 살펴보겠습니다.

> 참고: [Microsoft Learn, "New name for Azure Active Directory"](https://learn.microsoft.com/ko-kr/entra/fundamentals/new-name)

<br>

## 1. Microsoft Entra란 무엇인가?

Microsoft Entra는 **ID 및 네트워크 액세스 관리 제품군**으로, 조직의 **제로 트러스트(Zero Trust)**<sup>1</sup> 보안 전략을 구현하는 **트러스트 패브릭(Trust Fabric)**<sup>2</sup>입니다. ID 검증, 액세스 조건 확인, 권한 관리, 통신 암호화, 위협 모니터링 등 통합 보안 계층을 제공합니다.

> <sup>1</sup> **제로 트러스트(Zero Trust)**: "절대 신뢰하지 말고, 항상 검증하라(Never Trust, Always Verify)"는 보안 원칙입니다. 네트워크 위치와 관계없이 모든 사용자, 디바이스, 애플리케이션의 접근을 명시적으로 검증하고, 최소 권한만 부여하며, 침해를 가정하여 지속적으로 모니터링합니다.
>
> <sup>2</sup> **트러스트 패브릭(Trust Fabric)**: ID, 액세스 제어, 네트워크 보안을 통합적으로 연결하여 조직 전체에 걸쳐 일관된 보안 정책을 적용하는 기반 구조입니다. Entra는 이러한 패브릭을 통해 온프레미스, 클라우드, 하이브리드 환경 전반에 걸친 통합 보안 계층을 제공합니다.

### 1.1 등장 배경

전통적인 보안 모델은 기업 네트워크 경계를 기준으로 내부는 신뢰하고 외부는 차단하는 방식이었습니다. 하지만 현대의 클라우드 시대에는:

- **멀티 클라우드 환경**: AWS, Azure, GCP 등 여러 클라우드 플랫폼 사용
- **SaaS 애플리케이션 급증**: Microsoft 365, Salesforce, Workday 등 수백 개의 SaaS 앱 사용
- **하이브리드 환경**: 온프레미스와 클라우드가 공존
- **원격 근무 증가**: 어디서나 접근 가능한 유연한 근무 환경
- **다양한 ID 유형**: 사용자뿐만 아니라 기기, 애플리케이션, 서비스 등 다양한 주체 관리 필요

이러한 변화로 전통적인 경계 기반 보안 모델은 한계에 도달했고, 새로운 보안 접근 방식이 필요하게 되었습니다.

### 1.2 Microsoft Entra의 핵심 가치

**1) 통합된 ID 관리 플랫폼**
- 단일 제어 플레인에서 모든 ID 통합 관리 (사용자, 디바이스, 애플리케이션, 워크로드)
- 온프레미스, 클라우드, 하이브리드 환경 전반에 일관된 보안 정책 적용
- 네트워크 액세스 보안까지 포괄하는 엔드투엔드 솔루션

**2) 제로 트러스트 보안 구현**
- 명시적 검증, 최소 권한, 침해 가정의 3대 원칙 기반
- 조건부 액세스 및 위험 기반 정책으로 실시간 보안 제어
- AI 기반 위협 탐지 및 자동 대응

**3) 지능형 보안 및 자동화**
- AI/머신러닝 기반 위협 탐지 및 자동 대응
- ID 수명 주기 및 거버넌스 자동화
- 멀티 클라우드 환경의 권한 관리 및 최적화

> 참고: [Microsoft Learn, "What is Microsoft Entra?"](https://learn.microsoft.com/ko-kr/entra/fundamentals/what-is-entra)

<br>

## 2. Microsoft Entra 제품군 구조

Microsoft Entra 제품군은 **신뢰할 수 있는 ID의 엔드투엔드 보안 액세스**를 4단계로 구현합니다:

1. **제로 트러스트 액세스 제어 설정** (Foundation)
2. **직원에 대한 보안 액세스** (Employee Access)
3. **고객 및 파트너를 위한 보안 액세스** (External Access)
4. **모든 클라우드에서 액세스 보호** (Multi-cloud Protection)

전체 제품군은 다음과 같은 계층 구조로 구성됩니다:

```
Microsoft Entra (제품군 전체 브랜드)
┃
┣━━ 1단계: 제로 트러스트 액세스 제어 설정
┃   ┣━━ Microsoft Entra ID (구 Azure AD / 핵심 기반)
┃   ┗━━ Microsoft Entra Domain Services (관리형 도메인 서비스)
┃
┣━━ 2단계: 직원에 대한 보안 액세스
┃   ┣━━ Microsoft Entra Private Access (사내망 제로 트러스트 접속)
┃   ┣━━ Microsoft Entra Internet Access (인터넷/SaaS 트래픽 보호)
┃   ┣━━ Microsoft Entra ID Governance (ID 거버넌스 및 수명 주기)
┃   ┣━━ Microsoft Entra ID Protection (위험 탐지 및 대응)
┃   ┗━━ Microsoft Entra Verified ID (탈중앙화 검증 가능 자격 증명)
┃
┣━━ 3단계: 고객 및 파트너를 위한 보안 액세스
┃   ┗━━ Microsoft Entra External ID (외부 사용자 및 고객 ID 관리)
┃
┗━━ 4단계: 모든 클라우드에서 액세스 보호
    ┣━━ Microsoft Entra Workload ID (워크로드 ID 보안)
    ┗━━ Microsoft Entra Permissions Management (멀티 클라우드 권한 관리)
```

### 2.1 Microsoft Entra ID

Microsoft Entra ID는 Microsoft Entra 제품군의 **'뿌리'이자 가장 핵심이 되는 서비스**로, 모든 ID 및 액세스 관리의 기반을 제공합니다. 클라우드 기반의 ID 및 액세스 관리 서비스로서 다른 모든 Entra 서비스들이 이 위에서 작동합니다.

**주요 기능**
- **Single Sign-On (SSO)**: 수천 개의 SaaS 애플리케이션 통합 인증
- **Multi-Factor Authentication (MFA)**: 다단계 인증
- **조건부 액세스(Conditional Access)**: 사용자, 위치, 디바이스, 위험도 기반 액세스 제어
- **애플리케이션 관리**: 앱 등록, 권한 부여, API 보호

**에디션 구분**
- **Free**: 기본 ID 관리 및 디렉터리 기능
- **Microsoft Entra ID P1**: 조건부 액세스, 동적 그룹, 하이브리드 ID
- **Microsoft Entra ID P2**: ID 보호, 특권 ID 관리(PIM), 액세스 검토

**주요 하위 서비스**
- **ID Protection**: AI 기반 위험 탐지 및 자동 대응
- **ID Governance**: 액세스 검토, 권한 관리, 수명 주기 자동화
- **Workload ID**: 애플리케이션/서비스 계정의 ID 보호 및 관리

> 상세한 내용은 다음 포스트 [**Microsoft Entra (2): Microsoft Entra ID와 Domain Services 심층 분석**]({% post_url Azure_Study/2026-02-05-microsoft-entra(2) %})에서 다룹니다.
>
> 참고: [Microsoft Learn, "What is Microsoft Entra ID?"](https://learn.microsoft.com/ko-kr/entra/fundamentals/whatis)

### 2.2 Microsoft Entra Domain Services

관리형 도메인 서비스로, 온프레미스 Active Directory Domain Services(AD DS)의 클라우드 버전입니다. LDAP, Kerberos, NTLM 등 전통적인 도메인 인증 프로토콜을 지원합니다.

**주요 기능**
- 도메인 가입(Domain Join): 클라우드 VM을 관리형 도메인에 가입
- 레거시 인증 프로토콜 지원: LDAP, Kerberos, NTLM
- 그룹 정책(GPO): 중앙 집중식 관리
- 관리형 서비스: Microsoft가 패치, 모니터링, 백업 관리

**Entra ID와의 차이**
- Entra ID: 클라우드 네이티브 인증 (OAuth, SAML, OIDC)
- Domain Services: 전통적인 도메인 서비스 (LDAP, Kerberos, NTLM)

**관리형 서비스의 제약사항**
- Microsoft가 도메인 컨트롤러(DC)를 관리하므로 DC에 직접 접근 불가
- 'AAD DC Administrators' 그룹 권한 사용
- 스키마 확장 제한

> 상세한 내용은 다음 포스트 [**Microsoft Entra (2): Microsoft Entra ID와 Domain Services 심층 분석**]({% post_url Azure_Study/2026-02-05-microsoft-entra(2) %})에서 다룹니다.
>
> 참고: [Microsoft Learn, "What is Microsoft Entra Domain Services?"](https://learn.microsoft.com/ko-kr/entra/identity/domain-services/overview)

### 2.3 Microsoft Entra External ID

외부 사용자(파트너, 고객, 공급업체)의 ID를 관리하는 서비스입니다. B2B(기업 간 협업)와 CIAM(고객 ID 관리)을 통합 플랫폼에서 제공합니다.

**주요 구성 요소**

**1) Entra External ID for B2B (Business-to-Business)**
- 외부 조직의 사용자를 자사 디렉터리로 초대
- 파트너가 자신의 조직 계정으로 로그인하여 리소스 접근
- Azure AD, Microsoft 계정, Google, Facebook 등 지원

**사용 사례**
```
시나리오: 외부 컨설턴트와 협업

1. Contoso 회사가 외부 컨설팅 회사 Fabrikam과 협업
2. Contoso가 Fabrikam 직원(consultant@fabrikam.com)을 B2B 게스트로 초대
3. Fabrikam 직원은 자신의 회사 계정(Fabrikam AD)으로 로그인
4. Contoso의 SharePoint, Teams에 접근하여 협업
```

**2) Entra External ID for customers (CIAM - Customer Identity Access Management)**
- 소비자 대상 애플리케이션의 고객 계정 관리
- 소셜 로그인(Google, Facebook, Apple) 지원
- 사용자 정의 브랜딩 및 가입 흐름
- Self-service 비밀번호 재설정

**사용 사례**
```
시나리오: E-commerce 사이트

1. 온라인 쇼핑몰 앱에서 고객이 회원가입
2. 고객은 이메일 또는 Google/Facebook 계정으로 가입
3. Entra External ID가 고객 프로필 및 인증 관리
4. 맞춤형 마케팅 및 개인화된 쇼핑 경험 제공
```
> 참고: [Microsoft Learn, "What is Microsoft Entra External ID?"](https://learn.microsoft.com/ko-kr/entra/external-id/external-identities-overview)

### 2.4 Microsoft Entra Verified ID

**탈중앙화 ID(Decentralized Identity)** 기반의 검증 가능한 자격 증명 서비스입니다. W3C 표준인 **Verifiable Credentials**와 **Decentralized Identifiers (DIDs)** 를 구현합니다.

**핵심 개념**

**1) Self-Sovereign Identity (SSI)**
- 사용자가 자신의 ID 데이터를 직접 소유하고 제어
- 중앙 집중식 ID 저장소 없이 검증 가능한 증명서 발급

**2) 검증 가능한 자격 증명(Verifiable Credentials)**
- 디지털 형태의 증명서 (예: 학위 증명서, 고용 확인서, 면허증)
- 암호화 방식으로 위조 방지
- 사용자가 선택적으로 공유 가능

**동작 방식**
```
[학위 증명 시나리오]

1. 발급자(Issuer): 대학교
   - 졸업생에게 디지털 학위 증명서 발급
   - 증명서에 암호화 서명 추가

2. 소유자(Holder): 졸업생
   - 디지털 지갑에 학위 증명서 저장
   - 필요 시에만 선택적으로 공유

3. 검증자(Verifier): 채용 기업
   - 지원자가 제출한 학위 증명서의 진위 확인
   - 대학의 서명을 검증하여 위조 여부 판별
   - 졸업생의 개인정보는 최소한만 수집
```

**적용 대상**
- 학력/자격증 검증
- 신원 확인 (KYC - Know Your Customer)
- 고용 확인서
- 면허 및 인증서

**장점**
- **프라이버시 보호**: 필요한 정보만 선택적 공개
- **사용자 제어**: ID 데이터에 대한 완전한 소유권
- **위조 방지**: 암호화 기반 검증
- **상호 운용성**: W3C 표준 준수

> 참고: [Microsoft Learn, "Introduction to Microsoft Entra Verified ID"](https://learn.microsoft.com/ko-kr/entra/verified-id/decentralized-identifier-overview)

### 2.5 Microsoft Entra Permissions Management

**개요**

**CIEM (Cloud Infrastructure Entitlement Management)** 솔루션으로, 멀티 클라우드 환경에서 과도한 권한을 식별하고 관리합니다.

**핵심 문제: 과도한 권한 문제**

클라우드 환경에서는 많은 ID(사용자, 서비스 계정, 역할)가 필요 이상의 권한을 갖는 경우가 흔합니다.

```
예시: 과도한 권한 문제

개발자 계정:
- 부여된 권한: Storage Blob Data Owner (읽기/쓰기/삭제 모두 가능)
- 실제 사용 권한: 읽기(Read) 작업만 사용
- 위험: 계정이 탈취되면 모든 데이터 삭제 가능

→ 최소 권한 원칙(Least Privilege) 위반!
```

**주요 기능**

**1) 권한 사용 분석 (Permissions Usage Analytics)**
- 실제로 사용되는 권한과 부여된 권한 비교
- 미사용 권한 및 과도한 권한 식별
- 시간대별 권한 사용 패턴 분석

**2) 멀티 클라우드 지원**
- Azure, AWS, GCP 통합 관리
- 단일 대시보드에서 모든 클라우드 권한 가시성 확보

**3) 권한 크리프(Permission Creep) 방지**
- 시간이 지나면서 누적된 불필요한 권한 탐지
- 자동화된 권한 정리 권장 사항 제공

**4) Just-In-Time (JIT) 액세스**
- 필요할 때만 일시적으로 권한 부여
- 사용 후 자동으로 권한 회수

**5) Permission Creep Index (PCI)**
- 조직 내 권한 위험도를 수치화하여 직관적으로 모니터링
- 권한 관리 상태를 한눈에 파악 가능

**적용 대상**
- 멀티 클라우드 환경 운영 조직
- 보안 컴플라이언스 요구사항이 엄격한 산업 (금융, 의료 등)
- 대규모 클라우드 인프라 관리

**보안 효과**
- **공격 표면 축소**: 과도한 권한 제거로 위험 감소
- **컴플라이언스 강화**: 최소 권한 원칙 준수
- **감사 간소화**: 모든 권한 사용 내역 추적

> 참고: [Microsoft Learn, "What is Microsoft Entra Permissions Management?"](https://learn.microsoft.com/ko-kr/entra/permissions-management/overview)

### 2.6 Microsoft Entra Global Secure Access

Microsoft Entra의 최신 확장 영역으로, ID 보안을 넘어 **네트워크 액세스 보안(Security Service Edge, SSE)**까지 포괄합니다. 제로 트러스트 네트워크 액세스(ZTNA)를 구현하여 VPN 없이도 안전한 리소스 접근을 제공합니다.

**주요 구성 요소**

**1) Microsoft Entra Internet Access**
- **보안 웹 게이트웨이(SWG)**: 모든 인터넷 및 SaaS 트래픽에 대한 보안 정책 적용
- **위협 차단**: 악성 사이트, 피싱, 멀웨어 차단
- **조건부 액세스 통합**: Entra ID 정책과 네트워크 정책의 통합

**2) Microsoft Entra Private Access**
- **제로 트러스트 네트워크 액세스(ZTNA)**: VPN 대체 솔루션
- **애플리케이션 단위 접근**: 전체 네트워크가 아닌 특정 앱에만 접근 허용
- **세밀한 권한 제어**: 사용자 ID 기반으로 내부 리소스 접근 제어

**적용 대상**
- 원격 근무 환경에서 VPN 대체
- SaaS 및 인터넷 트래픽 보안 강화
- 레거시 앱에 대한 제로 트러스트 접근 구현

> 참고: [Microsoft Learn, "What is Global Secure Access?"](https://learn.microsoft.com/ko-kr/entra/global-secure-access/overview-what-is-global-secure-access)

<br>

## 3. Microsoft Entra의 보안 원칙

Microsoft Entra는 **제로 트러스트(Zero Trust)** 보안 모델을 기반으로 설계되었습니다.

### 3.1 제로 트러스트 3대 원칙

**1) 명시적 검증 (Verify Explicitly)**
- 모든 액세스 요청에 대해 사용자 ID, 위치, 디바이스 상태, 워크로드, 데이터 분류 등 모든 가용 데이터 포인트를 사용하여 검증
- 단순히 "내부 네트워크"에 있다고 해서 신뢰하지 않음

**2) 최소 권한 액세스 (Least Privilege Access)**
- JIT(Just-In-Time) 및 JEA(Just-Enough-Access) 적용
- 필요한 시간 동안 필요한 만큼만 권한 부여
- Permissions Management를 통해 과도한 권한 제거

**3) 침해 가정 (Assume Breach)**
- 이미 침해당했다고 가정하고 피해 최소화
- 마이크로 세그멘테이션 및 네트워크 격리
- 이상 행위 탐지 및 자동 대응

### 3.2 Entra에서 제로 트러스트 구현

Entra는 다음과 같은 방식으로 제로 트러스트 원칙을 실제 구현합니다:

**조건부 액세스 (Conditional Access)**
```
정책 예시:

IF 사용자가 재무팀 소속이고
   AND 기업 외부 위치에서 접근하며
   AND 비관리 디바이스를 사용한다면
THEN MFA 요구 + 읽기 전용 모드로 제한
```

**통합 보안 기능**
- **ID Protection**: AI 기반 실시간 위험 탐지 및 자동 차단
- **PIM (Privileged Identity Management)**: Just-In-Time 권한 활성화 및 승인 워크플로
- **Permissions Management**: 멀티 클라우드 환경의 과도한 권한 식별 및 제거
- **Global Secure Access**: 네트워크 레벨 제로 트러스트 적용

> 참고: [Microsoft Learn, "Zero Trust security model"](https://learn.microsoft.com/ko-kr/security/zero-trust/zero-trust-overview)

<br>

## 4. Microsoft Entra 선택 가이드

### 4.1 서비스 선택 기준

| 요구사항 | 추천 서비스 | 주요 인증 프로토콜 |
|---------|-----------|------------------|
| 직원/내부 사용자 인증 및 SSO | **Entra ID** | OAuth 2.0, OIDC, SAML |
| Microsoft 365, Azure 리소스 접근 | **Entra ID** | OAuth 2.0, OIDC |
| AI 기반 위험 탐지 및 ID 보호 | **Entra ID Protection (P2)** | - |
| 권한 검토 및 액세스 거버넌스 | **Entra ID Governance (P2)** | - |
| 애플리케이션/서비스 계정 관리 | **Entra Workload ID** | Managed Identity, OIDC |
| 레거시 앱 LDAP/Kerberos 인증 | **Entra Domain Services** | LDAP, Kerberos, NTLM |
| 온프레미스 AD 마이그레이션 | **Entra Domain Services** | LDAP, Kerberos |
| 외부 파트너/공급업체 협업 | **Entra External ID (B2B)** | OAuth 2.0, OIDC, SAML |
| 고객용 앱 회원가입/로그인 | **Entra External ID (CIAM)** | OAuth 2.0, OIDC |
| 디지털 증명서 발급/검증 | **Entra Verified ID** | W3C VC, DID |
| 멀티 클라우드 권한 관리 | **Entra Permissions Management** | - |
| VPN 대체 및 제로 트러스트 네트워크 | **Entra Global Secure Access** | ZTNA |

### 4.2 하이브리드 시나리오

**온프레미스 AD + Entra ID 통합**
- **Entra ID Connect**: 온프레미스 AD와 Entra ID 동기화
- **Pass-through Authentication** 또는 **Password Hash Sync** 선택
- **Seamless SSO**: 사용자가 회사 네트워크에서 별도 로그인 없이 클라우드 앱 접근

**온프레미스 AD + Domain Services**
- 온프레미스 AD를 유지하면서 클라우드에서도 도메인 서비스 필요 시
- Entra Domain Services는 독립적인 관리형 도메인 제공
- 온프레미스 AD와 Entra ID 간 단방향 동기화 가능

<br>

## 5. 정리

이번 포스트에서는 Microsoft Entra 제품군의 전체 구조와 각 서비스의 역할을 살펴봤습니다.

**핵심 요약**:

**1) Microsoft Entra의 정의**
- ID 및 네트워크 액세스 관리 통합 제품군
- 제로 트러스트 보안 전략 기반 트러스트 패브릭
- 온프레미스, 클라우드, 하이브리드 환경 지원

**2) 4단계 제품 구조**
- 1단계: 제로 트러스트 액세스 제어 설정 (Entra ID, Domain Services)
- 2단계: 직원에 대한 보안 액세스 (Private/Internet Access, ID Governance, ID Protection, Verified ID)
- 3단계: 고객 및 파트너를 위한 보안 액세스 (External ID)
- 4단계: 모든 클라우드에서 액세스 보호 (Workload ID, Permissions Management)

**3) 제로 트러스트 3대 원칙**
- 명시적 검증 (Verify Explicitly)
- 최소 권한 액세스 (Least Privilege Access)
- 침해 가정 (Assume Breach)

**4) 서비스 선택 가이드**
- 직원 인증: Entra ID
- 레거시 앱: Domain Services
- 외부 협업: External ID (B2B)
- 고객 인증: External ID (CIAM)
- 멀티 클라우드 권한 관리: Permissions Management
- VPN 대체: Global Secure Access

<br>

다음 포스트 [**Microsoft Entra (2): Microsoft Entra ID와 Domain Services 심층 분석**]({% post_url Azure_Study/2026-02-05-microsoft-entra(2) %})에서는 가장 핵심적인 두 서비스인 **Entra ID**와 **Entra Domain Services**의 내부 동작 원리, 아키텍처, 그리고 실전 사용 사례를 깊이 있게 다루겠습니다.

<br>

<!--
## 참고문헌

1. [Microsoft Learn, "New name for Azure Active Directory"](https://learn.microsoft.com/ko-kr/entra/fundamentals/new-name)
2. [Microsoft Learn, "What is Microsoft Entra?"](https://learn.microsoft.com/ko-kr/entra/fundamentals/what-is-entra)
3. [Microsoft Learn, "What is Microsoft Entra ID?"](https://learn.microsoft.com/ko-kr/entra/fundamentals/whatis)
4. [Microsoft Learn, "What is Microsoft Entra Domain Services?"](https://learn.microsoft.com/ko-kr/entra/identity/domain-services/overview)
5. [Microsoft Learn, "What is Microsoft Entra External ID?"](https://learn.microsoft.com/ko-kr/entra/external-id/external-identities-overview)
6. [Microsoft Learn, "Introduction to Microsoft Entra Verified ID"](https://learn.microsoft.com/ko-kr/entra/verified-id/decentralized-identifier-overview)
7. [Microsoft Learn, "What is Microsoft Entra Permissions Management?"](https://learn.microsoft.com/ko-kr/entra/permissions-management/overview)
8. [Microsoft Learn, "What is Global Secure Access?"](https://learn.microsoft.com/ko-kr/entra/global-secure-access/overview-what-is-global-secure-access)
9. [Microsoft Learn, "Zero Trust security model"](https://learn.microsoft.com/ko-kr/security/zero-trust/zero-trust-overview)
10. [Microsoft Entra documentation](https://learn.microsoft.com/ko-kr/entra/)
-->
