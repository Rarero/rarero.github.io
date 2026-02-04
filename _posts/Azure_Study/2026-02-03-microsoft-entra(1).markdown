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

이번 포스트에서는 Microsoft Entra의 전체 구조와 주요 서비스들을 개요 수준에서 살펴보겠습니다.
> 참고: [Microsoft Learn, "New name for Azure Active Directory"](https://learn.microsoft.com/ko-kr/entra/fundamentals/new-name)

## 1. Microsoft Entra란?

### 1.1 온프레미스 Active Directory 개요

Microsoft Entra를 이해하기 위해서는 먼저 전통적인 **온프레미스 Active Directory(AD)**의 역할을 이해할 필요가 있습니다.

<!--
> Active Directory에 대한 더 자세한 내용은 이전 포스트 [**액세스 제어 (2): Active Directory와 Microsoft Entra ID**]({% post_url Azure_Study/2026-01-17-access-control(2) %})를 참고하세요.
-->

Active Directory는 온프레미스 환경에서 **사용자, 컴퓨터, 애플리케이션 등의 ID 정보를 저장하고 관리하는 디렉토리 서비스**입니다. 주요 기능으로는:

- **인증(Authentication)**: 사용자 신원 확인
- **인가(Authorization)**: 리소스 접근 권한 관리
- **디렉토리 서비스**: 조직의 계층적 구조로 객체 관리

**핵심 구조**

AD는 **포레스트(Forest) → 도메인(Domain) → 조직 단위(OU)** 순의 계층적 구조를 가지며, **도메인 컨트롤러(DC)**를 통해 인증 및 디렉토리 서비스를 제공합니다. 각 DC는 도메인의 전체 복사본을 보유하고 변경 사항을 자동으로 복제합니다.

### 1.2 등장 배경

**전통적인 ID 관리의 한계**

과거의 ID 관리는 주로 온프레미스 Active Directory(AD)를 중심으로 이루어졌습니다. 하지만 클라우드 시대가 도래하면서 다음과 같은 문제들이 발생했습니다:

- **멀티 클라우드 환경**: AWS, Azure, GCP 등 여러 클라우드 플랫폼 사용
- **SaaS 애플리케이션 급증**: Microsoft 365, Salesforce, Workday 등 수백 개의 SaaS 앱 사용
- **하이브리드 환경**: 온프레미스와 클라우드가 공존하는 복잡한 인프라
- **원격 근무 증가**: 제로 트러스트(Zero Trust) 보안 모델의 필요성 대두
- **다양한 ID 유형**: 사용자, 기기, 애플리케이션, 서비스 등 다양한 주체 관리 필요

**Microsoft Entra의 탄생**

Microsoft는 이러한 현대적인 요구사항을 충족하기 위해 2022년 5월, 기존의 Azure AD와 여러 ID 관련 서비스들을 **Microsoft Entra**라는 통합 제품군으로 재정비했습니다.


### 1.3 Microsoft Entra의 핵심 가치

Microsoft Entra는 다음 세 가지 핵심 가치를 제공합니다:

**1) 통합된 ID 관리 (Unified Identity Management)**
- 단일 제어 플레인에서 모든 ID 관리
- 온프레미스, 클라우드, 하이브리드 환경 지원
- 사용자, 디바이스, 애플리케이션, 워크로드 ID 통합 관리

**2) 제로 트러스트 보안 (Zero Trust Security)**
- "절대 신뢰하지 말고, 항상 검증하라(Never Trust, Always Verify)"
- 조건부 액세스 및 위험 기반 인증
- 최소 권한 원칙(Principle of Least Privilege) 적용

**3) 포괄적인 ID 보호 (Comprehensive Identity Protection)**
- AI 기반 위협 탐지 및 자동 대응
- ID 거버넌스 및 컴플라이언스
- 특권 액세스 관리(Privileged Access Management)

<br>

## 2. Microsoft Entra 제품군 구성

Microsoft Entra는 크게 **6개의 주요 서비스군**으로 구성됩니다.

### 2.1 Microsoft Entra ID (구 Azure AD)

**개요**

Microsoft Entra ID는 Microsoft Entra 제품군의 **'뿌리'이자 가장 핵심이 되는 서비스**로, 모든 ID 및 액세스 관리의 기반을 제공합니다. Microsoft의 클라우드 기반 ID 및 액세스 관리 서비스로서, 다른 모든 Entra 서비스들이 이 위에서 작동합니다.

**주요 기능**
- **Single Sign-On (SSO)**: 수천 개의 SaaS 애플리케이션에 대한 통합 인증
- **Multi-Factor Authentication (MFA)**: 다단계 인증을 통한 보안 강화
- **조건부 액세스(Conditional Access)**: 사용자, 위치, 디바이스, 위험도 기반 액세스 제어
- **B2B/B2C 협업**: 외부 파트너 및 고객 ID 관리
- **애플리케이션 관리**: 앱 등록, 권한 부여, API 보호

**적용 대상**
- Microsoft 365, Azure 서비스 인증
- SaaS 애플리케이션 통합 인증
- 사용자 및 그룹 관리
- 개발자를 위한 인증 플랫폼 (OAuth 2.0, OpenID Connect)

**에디션 구분**
- **Free**: 기본 ID 관리 및 디렉터리 기능
- **Microsoft Entra ID P1**: 조건부 액세스, 동적 그룹, 하이브리드 ID
- **Microsoft Entra ID P2**: ID 보호, Privileged Identity Management (PIM), 액세스 검토

**고급 보안 기능 (P2 에디션)**

**1) Microsoft Entra ID Protection**
- **AI 기반 위험 탐지**: 의심스러운 로그인 패턴, 익명 IP, 비정상적인 위치 등 자동 감지
- **위험 기반 정책**: 고위험 사용자 자동 차단, 비밀번호 변경 강제
- **실시간 모니터링**: 위험 점수를 실시간으로 계산하여 동적 대응

**2) Microsoft Entra ID Governance**
- **액세스 검토(Access Reviews)**: 정기적으로 "누가 어떤 권한을 가져야 하는가" 검토
- **권한 관리(Entitlement Management)**: 액세스 패키지를 통한 셀프서비스 권한 요청
- **수명 주기 관리**: 입사/퇴사 시 자동 계정 생성/삭제, 부서 이동 시 권한 자동 조정
- **특권 ID 관리(PIM)**: 관리자 권한의 Just-In-Time 활성화 및 승인 워크플로

**적용 대상**
- 금융, 의료 등 규제 산업의 컴플라이언스 요구사항 충족
- 내부 감사 및 권한 거버넌스 강화
- 제로 트러스트 보안 모델 구현

### 2.2 Microsoft Entra Domain Services

**개요**

관리형 도메인 서비스로, **온프레미스 Active Directory Domain Services(AD DS)의 클라우드 버전**입니다.

**주요 기능**
- **도메인 가입(Domain Join)**: 클라우드 VM을 관리형 도메인에 가입
- **레거시 인증 프로토콜 지원**: LDAP, Kerberos, NTLM
- **그룹 정책(Group Policy)**: GPO를 통한 중앙 집중식 관리
- **관리형 서비스**: Microsoft가 패치, 모니터링, 백업 관리

**적용 대상**
- 온프레미스 AD DS에 의존하는 레거시 애플리케이션을 클라우드로 마이그레이션
- LDAP 또는 Kerberos 인증이 필요한 워크로드
- 온프레미스 AD 인프라 없이 도메인 서비스가 필요한 환경

**Entra ID와의 차이**
- Entra ID는 **클라우드 네이티브 인증 서비스** (OAuth, SAML, OpenID Connect)
- Domain Services는 **전통적인 도메인 서비스** (LDAP, Kerberos, NTLM)

**관리형 서비스의 제약사항**
- **관리 권한 제한**: Microsoft가 도메인 컨트롤러(DC)를 관리하며, 사용자는 DC에 직접 접근(RDP 등)할 수 없습니다.
- **권한 구조**: 온프레미스의 'Domain Admins' 대신 'AAD DC Administrators' 그룹 권한을 사용합니다.
- **스키마 확장 제한**: 온프레미스 AD와 달리 스키마 확장이 제한적일 수 있습니다.

### 2.3 Microsoft Entra External ID

**개요**

외부 사용자(파트너, 고객, 공급업체 등)의 ID를 관리하는 서비스입니다. Microsoft는 최근 B2B와 B2C를 **통합된 유연한 플랫폼으로 진화**시키고 있으며, 단일 인터페이스에서 모든 외부 ID를 관리할 수 있도록 개선하고 있습니다.

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

### 2.4 Microsoft Entra Verified ID

**개요**

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

### 2.6 Microsoft Entra Global Secure Access (SSE)

**개요**

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

### 2.7 Microsoft Entra Workload ID

**개요**

사람이 아닌 **애플리케이션, 서비스, 스크립트, 컨테이너** 등의 비인간 ID(Workload Identity)를 관리하고 보호하는 서비스입니다. 현대 클라우드 환경에서는 사용자보다 워크로드 ID가 훨씬 많으며, 이들의 보안 관리가 매우 중요합니다.

**핵심 개념**

**1) 서비스 주체(Service Principal)**
- 애플리케이션이 Azure 리소스에 접근하기 위한 ID
- 애플리케이션 등록 시 자동 생성

**2) 관리 ID(Managed Identity)**
- **시스템 할당 관리 ID**: Azure 리소스(VM, App Service 등)에 자동으로 할당
- **사용자 할당 관리 ID**: 여러 리소스에서 공유 가능한 독립적인 ID
- 자격 증명 관리가 불필요 (Azure가 자동 관리)

**주요 기능**

**1) 자격 증명 없는 인증(Credential-Free Authentication)**
- 비밀번호, API 키를 코드에 하드코딩하지 않음
- Azure Key Vault, Storage 등에 관리 ID로 안전하게 접근

**2) 조건부 액세스 정책 적용**
- 워크로드 ID에도 사용자와 동일한 보안 정책 적용
- 특정 IP에서만 접근 허용, MFA 요구 등

**3) 워크로드 ID 페더레이션**
- Kubernetes, GitHub Actions 등 외부 플랫폼의 ID를 Azure AD와 연동
- OIDC(OpenID Connect)를 통한 토큰 교환

**사용 사례**

```
시나리오: Azure App Service에서 SQL Database 접근

[기존 방식 - 취약]
1. 연결 문자열에 DB 사용자명/비밀번호 포함
2. 코드나 환경 변수에 저장
3. 유출 위험 높음

[Workload ID 방식 - 안전]
1. App Service에 관리 ID 활성화
2. SQL Database에 관리 ID 접근 권한 부여
3. 코드에서 자격 증명 없이 연결
4. Azure가 자동으로 토큰 발급 및 갱신
```

**적용 대상**
- 클라우드 네이티브 애플리케이션 개발
- CI/CD 파이프라인 보안
- 컨테이너 및 Kubernetes 환경
- API 및 마이크로서비스 아키텍처

**보안 효과**
- **자격 증명 유출 방지**: 비밀번호를 코드에 저장하지 않음
- **자동 로테이션**: Azure가 토큰을 자동으로 갱신
- **최소 권한 원칙**: 필요한 리소스에만 세밀하게 권한 부여

<br>

## 3. Microsoft Entra 제품군의 통합 아키텍처

### 3.1 전체 구조

Microsoft Entra의 각 서비스는 독립적으로 작동하지만, 상호 연계되어 통합된 ID 보안 플랫폼을 구성합니다.

```
┌─────────────────────────────────────────────────────────────┐
│              Microsoft Entra 제품군 아키텍처                 │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │  Entra ID (Core)     │
                    │  - SSO               │
                    │  - MFA               │
                    │  - Conditional Access│
                    └──────────┬───────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
   ┌────────▼─────────┐ ┌─────▼──────┐  ┌────────▼─────────┐
   │ Entra Domain     │ │  Entra     │  │ Entra External   │
   │ Services         │ │  Verified  │  │ ID (B2B/B2C)     │
   │ - LDAP/Kerberos  │ │  ID        │  │ - Guest Access   │
   │ - Domain Join    │ │  - SSI     │  │ - Customer Auth  │
   └──────────────────┘ └────────────┘  └──────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Entra Permissions    │
                    │ Management (CIEM)    │
                    │ - Multi-cloud        │
                    └──────────────────────┘

        ┌────────────────────────────────────────┐
        │   통합 보안 정책 및 거버넌스            │
        │   - Identity Protection               │
        │   - Privileged Identity Management    │
        │   - Access Reviews                    │
        └────────────────────────────────────────┘
```

### 3.2 서비스 간 연계 사례

**사례 1: 하이브리드 환경의 통합 ID 관리**

```
시나리오: 온프레미스와 클라우드가 공존하는 기업

1. 온프레미스 AD에 사용자 계정 존재
2. Entra ID Connect로 온프레미스 AD와 Entra ID 동기화
3. 사용자는 동일한 자격 증명으로 온프레미스 앱 및 클라우드 SaaS 앱 접근
4. 레거시 앱은 Entra Domain Services를 통해 LDAP/Kerberos 인증 사용
5. Entra ID의 조건부 액세스 정책이 모든 접근에 적용
```

**사례 2: 외부 협업 및 고객 서비스**

```
시나리오: 파트너 협업 및 고객용 웹 앱 운영

1. 내부 직원: Entra ID로 관리
2. 외부 파트너: Entra External ID (B2B)로 게스트 초대
3. 고객: Entra External ID (CIAM)로 소셜 로그인 제공
4. 모든 외부 액세스에 대해 조건부 액세스 및 MFA 적용
5. Permissions Management로 외부 사용자의 권한 최소화
```

**사례 3: 탈중앙화 ID 및 검증**

```
시나리오: 교육 기관의 학위 검증

1. 대학이 Entra Verified ID로 디지털 학위 증명서 발급
2. 졸업생이 디지털 지갑에 증명서 저장
3. 기업 채용 시 Entra ID를 통해 검증
4. 실시간 위조 여부 확인, 개인정보는 최소 공개
```

<br>

## 4. Microsoft Entra의 보안 원칙

Microsoft Entra는 **제로 트러스트(Zero Trust)** 보안 모델을 기반으로 설계되었습니다.

### 4.1 제로 트러스트 3대 원칙

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

### 4.2 Entra에서 제로 트러스트 구현

**조건부 액세스 (Conditional Access)**
```
정책 예시:

IF 사용자가 재무팀 소속이고
   AND 기업 외부 위치에서 접근하며
   AND 비관리 디바이스를 사용한다면
THEN MFA 요구 + 읽기 전용 모드로 제한
```

**ID 보호 (Identity Protection)**
- AI 기반 위험 탐지 (의심스러운 로그인, 비정상 패턴)
- 자동 위험 기반 정책 적용 (고위험 사용자 차단, 비밀번호 변경 강제)

**특권 액세스 관리 (Privileged Identity Management)**
- 관리자 권한을 영구 부여하지 않음
- 필요 시 승인 절차를 거쳐 일시적으로 활성화
- 모든 특권 액세스 감사 및 모니터링

<br>

## 5. Microsoft Entra 선택 가이드

### 5.1 서비스 선택 기준

| 요구사항 | 추천 서비스 | 주요 인증 프로토콜 |
|---------|-----------|------------------|
| 직원/내부 사용자 인증 및 SSO | **Entra ID** | OAuth 2.0, OIDC, SAML |
| Microsoft 365, Azure 리소스 접근 | **Entra ID** | OAuth 2.0, OIDC |
| AI 기반 위험 탐지 및 ID 보호 | **Entra ID Protection (P2)** | - |
| 권한 검토 및 액세스 거버넌스 | **Entra ID Governance (P2)** | - |
| 레거시 앱 LDAP/Kerberos 인증 | **Entra Domain Services** | LDAP, Kerberos, NTLM |
| 온프레미스 AD 마이그레이션 | **Entra Domain Services** | LDAP, Kerberos |
| 외부 파트너/공급업체 협업 | **Entra External ID (B2B)** | OAuth 2.0, OIDC, SAML |
| 고객용 앱 회원가입/로그인 | **Entra External ID (CIAM)** | OAuth 2.0, OIDC |
| 디지털 증명서 발급/검증 | **Entra Verified ID** | W3C VC, DID |
| 애플리케이션/서비스 계정 관리 | **Entra Workload ID** | Managed Identity, OIDC |
| 멀티 클라우드 권한 관리 | **Entra Permissions Management** | - |
| VPN 대체 및 제로 트러스트 네트워크 | **Entra Global Secure Access** | ZTNA |

### 5.2 하이브리드 시나리오

**온프레미스 AD + Entra ID 통합**
- **Entra ID Connect**: 온프레미스 AD와 Entra ID 동기화
- **Pass-through Authentication** 또는 **Password Hash Sync** 선택
- **Seamless SSO**: 사용자가 회사 네트워크에서 별도 로그인 없이 클라우드 앱 접근

**온프레미스 AD + Domain Services**
- 온프레미스 AD를 유지하면서 클라우드에서도 도메인 서비스 필요 시
- Entra Domain Services는 독립적인 관리형 도메인 제공
- 온프레미스 AD와 Entra ID 간 단방향 동기화 가능

<br>

## 6. 마치며

Microsoft Entra는 단순히 Azure AD의 이름을 바꾼 것이 아니라, **현대적인 ID 및 액세스 관리의 포괄적인 생태계**를 구성하는 전략적 제품군입니다.

**핵심 포인트 요약**

**1) 핵심 ID 관리 (Core Identity)**
- **Entra ID**: 모든 서비스의 뿌리, 클라우드 기반 인증 및 SSO (OAuth, OIDC, SAML)
  - ID Protection: AI 기반 위험 탐지 및 자동 대응
  - ID Governance: 권한 검토, 액세스 수명 주기, 특권 ID 관리
- **Entra Domain Services**: 레거시 앱 지원을 위한 관리형 도메인 (LDAP, Kerberos)

**2) 접근 보안 및 가시성 (Security & Network Access)**
- **Entra Global Secure Access**: 제로 트러스트 네트워크 액세스 (SSE, ZTNA, VPN 대체)

**3) 외부 및 신규 ID 기술 (Modern Identity)**
- **Entra External ID**: 외부 사용자 및 고객 ID 관리 (B2B/B2C 통합 플랫폼)
- **Entra Verified ID**: 탈중앙화 ID 및 검증 가능한 자격 증명 (W3C VC, DID)

**4) 워크로드 및 권한 관리 (Specialized Management)**
- **Entra Workload ID**: 애플리케이션, 서비스, 컨테이너 ID 관리 (관리 ID, 자격증명 없는 인증)
- **Entra Permissions Management**: 멀티 클라우드 권한 최적화 (CIEM, PCI 지표)

다음 포스트 [**Microsoft Entra (2): Microsoft Entra ID와 Domain Services 심층 분석**]({% post_url Azure_Study/2026-02-05-microsoft-entra(2) %})에서는 가장 핵심적인 두 서비스인 **Entra ID**와 **Entra Domain Services**의 내부 동작 원리, 아키텍처, 그리고 실전 사용 사례를 깊이 있게 다루겠습니다.

<!--
> 참고 자료:
> - Microsoft Learn, "What is Microsoft Entra?"
> - Microsoft Entra documentation
> - Zero Trust security model - Microsoft Security
-->
