---
layout: post
title: "Microsoft Entra (2): Microsoft Entra ID와 Domain Services 심층 분석"
date: 2026-02-05 09:00:00 +0900
tags: [Study, Azure, Microsoft Entra, Entra ID, Domain Services, Authentication]
categories: Azure_Study
---

지난 포스트 [**Microsoft Entra (1): 서비스 개요와 ID 및 액세스 관리 생태계**]({% post_url Azure_Study/2026-02-03-microsoft-entra(1) %})에서는 Microsoft Entra 제품군의 전체 구조를 살펴봤습니다.

이번 포스트에서는 Microsoft Entra 생태계의 **핵심 기반**인 **Entra ID**(구 Azure AD)와 레거시 애플리케이션 지원을 위한 **Entra Domain Services**를 심층적으로 분석합니다.

<br>

## 1. Microsoft Entra ID 심층 분석

Entra ID는 단순한 인증 서비스가 아닙니다. **제로 트러스트 정책 엔진**으로서 매일 **78조 개의 신호를 분석**하여 위험을 탐지하고, AI 기반 위험 평가와 조건부 액세스 정책을 통해 조직의 리소스를 보호합니다.

이 섹션에서는 Entra ID의 **핵심 보안 메커니즘**과 **정책 평가 엔진**의 작동 원리를 심층 분석합니다.

### 1.1 조건부 액세스: 제로 트러스트 정책 엔진

**조건부 액세스의 본질**

조건부 액세스는 Entra ID의 **제로 트러스트 정책 엔진**입니다. 사용자, 위치, 디바이스, 애플리케이션, 위험 신호 등 다양한 원본의 신호를 실시간으로 수집하여 액세스 결정을 내립니다.

```
조건부 액세스 작동 흐름:

1단계: 신호 수집 (Signal Collection)
   • 사용자 ID & 그룹 멤버십
   • IP 위치 정보 (국가/지역)
   • 디바이스 플랫폼 & 상태 (규정 준수 여부)
   • 대상 애플리케이션
   • 로그인 위험 수준 (Identity Protection 연동)
   • 사용자 위험 수준 (손상된 자격 증명 탐지)

2단계: 정책 평가 (Policy Evaluation)
   1) 세션 세부 정보 수집
      • 네트워크 위치 확인
      • 디바이스 ID 확인
      • 보고서 전용 모드 정책 포함 평가
   
   2) 정책 적용
      • 충족되지 않은 요구 사항 식별
      • 차단 정책 우선 처리
      • 순차적 제어 요구 (MFA → 준수 디바이스 등)

3단계: 액세스 제어 적용 (Enforcement)
   → 허용 또는 차단 결정
   → 허용 시: 세션 제어 적용
```

**정책 평가의 핵심 원칙**

1. **2단계 평가 프로세스**
   - 1단계: 모든 정책(보고서 전용 포함)에 대해 세션 세부 정보 수집
   - 2단계: 활성화된 정책만 적용하여 실제 액세스 제어 수행

2. **AND 논리 결합**
   - 하나의 사용자에게 여러 정책 적용 시 **모든 정책 충족 필수**
   - 예: 정책 A(MFA 필요) + 정책 B(규정 준수 디바이스 필요) = MFA **AND** 규정 준수 디바이스 모두 필요

3. **가장 제한적인 정책 우선**
   - 여러 정책 중 하나라도 "차단"이면 즉시 차단
   - 예: 정책 A(허용) + 정책 B(차단) = 차단

> 참고: [Microsoft Learn, "조건부 액세스란?"](https://learn.microsoft.com/ko-kr/entra/identity/conditional-access/overview)

### 1.2 Microsoft Entra ID Protection: AI 기반 위험 탐지

**Microsoft의 글로벌 위협 인텔리전스**

ID Protection은 하루 **78조 개의 보안 신호**를 분석하여 위험한 동작을 실시간으로 탐지합니다. 이 신호는 Active Directory, Microsoft 계정, Xbox 게임 등에서 수집되며, 기계 학습 모델을 통해 지속적으로 개선됩니다.

**위험 탐지 유형**

ID Protection은 두 가지 주요 위험을 탐지합니다:

**1) 로그인 위험 (Sign-in Risk)**

각 로그인 세션에서 실시간으로 평가되며, 해당 로그인이 손상되었을 가능성을 나타냅니다.

> **실시간 탐지 예시:**
> - **익명 IP**: TOR 브라우저, VPN 사용 탐지 → 위험 중간
> - **불가능한 여행**: 서울→뉴욕 2시간 이동 → 위험 높음
> - **비정상 토큰**: 토큰 클레임 이상 징후 → 위험 높음

**2) 사용자 위험 (User Risk)**

사용자 계정이 손상되었을 가능성을 누적 평가합니다.

> **오프라인 분석 예시:**
> - **유출된 자격 증명**: 다크웹/침해 DB 발견 → 위험 높음
> - **악성 IP**: 봇넷/C&C 서버 로그인 → 위험 중간

**위험 기반 조건부 액세스 통합**

ID Protection의 위험 탐지는 조건부 액세스와 자동으로 통합됩니다.

> **정책 예시:**
> 
> **정책 1: High Risk Remediation**
> - 조건: 로그인 위험 ≥ 높음
> - 조치: MFA + 안전한 비밀번호 재설정
> 
> **정책 2: User Risk Auto-Remediation**
> - 조건: 사용자 위험 ≥ 중간
> - 조치: 비밀번호 변경 + MFA 재등록

**자동 수정 흐름:** 위험 탐지 → 조건부 액세스 트리거 → MFA 완료 → 위험 감소 → 비밀번호 재설정 → 위험 해제

**조사 및 대응 워크플로**

조사 프로세스:

1. 위험 탐지 발생
   ↓
2. 관리자 알림
   • 이메일 통지
   • Azure Portal
   ↓
3. 보고서 검토
   • 위험한 로그인
   • 위험한 사용자
   • 위험 탐지 세부 정보
   ↓
4. 수동 조치
   • 위험 해제
   • 안전 확인
   • 손상 확인

> 참고: [Microsoft Learn, "Microsoft Entra ID Protection이란?"](https://learn.microsoft.com/ko-kr/entra/id-protection/overview-identity-protection)

### 1.3 역할 기반 액세스 제어 (RBAC)

**RBAC의 작동 원리**

Entra ID의 RBAC는 **최소 권한 원칙**에 따라 관리자 권한을 세밀하게 제어합니다.

```
RBAC 접근 검증 흐름:

1. 사용자가 Microsoft Graph API 호출
   ↓
2. Entra ID가 토큰의 wids 클레임 평가
   또는 역할 할당 데이터베이스 조회
   ↓
3. 요청된 작업이 역할 권한에 포함되는지 확인
   ↓
4. 액세스 허용 또는 거부
```

**역할 할당의 3대 요소**

역할 할당 = 보안 주체 + 역할 정의 + 범위

1. 보안 주체 (Security Principal)
   • 사용자: john@contoso.com
   • 그룹: Finance Team (역할 할당 가능)
   • 서비스 주체: 앱 ID

2. 역할 정의 (Role Definition)
   • 기본 제공: User Administrator
   • 사용자 지정: Custom App Admin
   • 권한 집합: Create/Read/Update

3. 범위 (Scope)
   • 테넌트 전체 (/)
   • 관리 단위 (AU)
   • 특정 애플리케이션

**범위의 세부 제어**

> **시나리오: 애플리케이션 관리 권한 위임**
> 
> **Alice (전역):** Application Administrator → 테넌트 전체 → 모든 앱 관리
> 
> **Bob (제한):** Application Administrator → "HR App"만 → HR App만 관리

> 참고: [Microsoft Learn, "Microsoft Entra ID의 역할 기반 액세스 제어 개요"](https://learn.microsoft.com/ko-kr/entra/identity/role-based-access-control/custom-overview)

### 1.4 Privileged Identity Management (PIM)

**Just-In-Time 액세스의 필요성**

영구적인 관리자 권한은 보안 위험을 증가시킵니다. PIM은 **필요한 시간에만** 권한을 활성화하여 공격 표면을 최소화합니다.

**PIM의 핵심 개념**

**역할 할당 유형:**

**1. 적격 (Eligible):** 즉시 권한 없음 → 활성화 시에만 부여 → MFA/승인/근거 필요

**2. 활성 (Active):** 즉시 권한 사용 → 시간 제한 권장 → 긴급 액세스용

**PIM 활성화 워크플로**

1. **활성화 요청** → 역할/기간/근거 입력
2. **정책 확인** → MFA, 승인, 최대 기간 검증
3. **MFA 완료** → Authenticator 앱 승인
4. **승인자 검토** → [승인]/[거부] 선택
5. **역할 활성화** → 지정 시간 동안 권한 부여
6. **자동 만료** → 적격 상태로 복귀

**PIM의 보안 이점**

> **적용 효과 (관리자 5명 기준):**
> - **적용 전:** 영구 권한 → 43,800시간/년 노출
> - **적용 후:** 주 1회 4시간 활성화 → 208시간/년 노출
> - **결과:** 노출 시간 99.5% 감소

> 참고: [Microsoft Learn, "Microsoft Entra Privileged Identity Management란?"](https://learn.microsoft.com/ko-kr/entra/id-governance/privileged-identity-management/pim-configure)
  
  → 노출 시간 감소: 99.5%
```

> 참고: [Microsoft Learn, "Microsoft Entra Privileged Identity Management란?"](https://learn.microsoft.com/ko-kr/entra/id-governance/privileged-identity-management/pim-configure)

### 1.5 인증 메커니즘 심층 분석

**토큰의 삼위일체: ID Token, Access Token, Refresh Token**

Entra ID의 OAuth 2.0/OIDC 인증은 세 가지 유형의 토큰을 사용합니다. 각 토큰은 명확히 구분된 역할을 가집니다.

토큰 유형별 역할:

1. ID Token (JWT) - "사용자가 누구인가?"
   • 목적: 사용자 신원 증명
   • 용도: 클라이언트 앱이 사용자 프로필 확인
   • 포함 정보:
     - 이름, 이메일, 프로필 사진 URL
     - sub (사용자 고유 ID)
     - iss (발급자: Entra ID)
     - aud (대상: 클라이언트 앱 ID)
   • 대상: 클라이언트 애플리케이션
   • 유효 기간: 1시간

2. Access Token (JWT) - "이 리소스에 접근할 권한이 있는가?"
   • 목적: API 호출 권한 증명
   • 용도: Microsoft Graph, Azure API 호출
   • 포함 정보:
     - scp (Scope: User.Read, Mail.Send 등)
     - roles (역할 기반 권한)
     - aud (대상 API)
   • 사용 방법: Authorization: Bearer <access_token>
   • 대상: 리소스 서버 (API)
   • 유효 기간: 60~90분
   • 저장: 메모리 (권장)

3. Refresh Token (Opaque) - "사용자 재로그인 없이 Access Token 갱신"
   • 목적: Access Token 자동 갱신
   • 특성:
     - 불투명 토큰 (JWT 아님)
     - 단일 사용 (갱신 시 새 RT 재발급)
     - 조건부 액세스 재평가 트리거
   • 유효 기간: 최대 90일
   • 저장: 안전한 저장소 (encrypted)
   • 보안:
     - Token Rotation (회전 방식)
     - 탈취 감지 시 즉시 무효화

**토큰 발급 및 갱신 흐름**

1. 초기 인증 (Authorization Code Flow)
   사용자 로그인 → Authorization Code
   → ID Token + Access Token + Refresh Token

2. Access Token으로 API 호출
   GET https://graph.microsoft.com/v1.0/me
   Authorization: Bearer <access_token>

3. Access Token 만료 (90분 후)
   Refresh Token으로 자동 갱신
   → 새 Access Token + 새 Refresh Token 발급
   → 조건부 액세스 정책 재평가

5. Continuous Access Evaluation (CAE)
   • 실시간 세션 취소 트리거:
     - 사용자 계정 비활성화
     - 비밀번호 재설정
     - 위험 수준 변화
     - 조건부 액세스 정책 변경
   
   → 즉시 토큰 무효화

**세션 관리 및 SSO**

Entra ID 세션 계층:

1. Primary Refresh Token (PRT)
   • Windows 10/11 디바이스
   • 유효 기간: 14일
   • Kerberos 티켓 발급 가능
   ↓
2. Web SSO Session
   • 브라우저 쿠키
   • 기본 유효 기간: 세션
   • 조건부 액세스 제어 가능
   ↓
3. Application Access Token
   • 개별 앱별 토큰
   • 짧은 수명 (1시간)
   • API 호출 전용

> 참고: [Microsoft Learn, "Microsoft Entra 인증"](https://learn.microsoft.com/ko-kr/entra/identity/authentication/overview-authentication)

### 1.6 관리 ID (Managed Identities): 암호 없는 인증

**관리 ID의 필요성**

전통적으로 애플리케이션이 Azure 리소스에 접근하려면 **자격 증명**(비밀번호, 인증서)을 저장하고 관리해야 했습니다. 이는 보안 위험과 운영 부담을 증가시킵니다.

관리 ID는 Azure 리소스 자체에 ID를 부여하여 **자격 증명 없이** 다른 Azure 서비스에 인증할 수 있게 합니다.

**관리 ID 유형**

**1. 시스템 할당 (System-assigned)**
- 리소스와 1:1 자동 연동, 리소스 삭제 시 ID도 자동 삭제
- 장점: 수명 주기 자동 관리, 설정 간단
- 단점: 리소스당 하나만 할당

**2. 사용자 할당 (User-assigned)**
- 독립 리소스로 여러 리소스에 공유 가능
- 장점: 권한 관리 중앙화, 재사용 가능
- 단점: 수동 수명 주기 관리 필요

**관리 ID 작동 원리**

> **시나리오: VM이 Key Vault에서 비밀 읽기**
> 
> 1. **ID 활성화** → VM에 관리 ID 할당 → Entra ID에 서비스 주체 자동 생성
> 2. **권한 부여** → Key Vault에서 VM의 관리 ID에 "Secrets Get" 권한 부여
> 3. **코드 작성** → ManagedIdentityCredential 사용 (자격 증명 불필요)
> ```python
> from azure.identity import ManagedIdentityCredential
> from azure.keyvault.secrets import SecretClient
> 
> credential = ManagedIdentityCredential()
> client = SecretClient(vault_url="https://myvault...", credential=credential)
> secret = client.get_secret("db-pwd")
> ```
> 4. **토큰 발급** → VM이 IMDS를 통해 토큰 자동 획득
> 5. **리소스 접근** → 토큰으로 Key Vault 접근

**Workload Identity Federation**

외부 워크로드(GitHub Actions, Kubernetes)가 비밀 없이 Azure에 접근할 수 있게 합니다.

> **GitHub Actions 예시:**
> 
> **기존:** GitHub Secrets에 CLIENT_SECRET 저장 → 보안 위험
> 
> **개선:** Federated Credential 설정 → OIDC 토큰 교환 → Secret 관리 불필요

**보안 이점**

> **적용 전:** 자격 증명 하드코딩 → 수동 갱신 → 유출 위험
> 
> **적용 후:** 자격 증명 불필요 → 자동 갱신 → RBAC 세밀 제어

> 참고: [Microsoft Learn, "Azure 리소스에 대한 관리 ID"](https://learn.microsoft.com/ko-kr/entra/identity/managed-identities-azure-resources/overview)

<br>

**SAML 2.0 페더레이션 흐름:**

1. 사용자가 Salesforce 접근
2. Salesforce가 사용자를 Entra ID로 리디렉션 (SAML Request)
3. Entra ID가 사용자 인증 (이미 로그인 상태면 스킵)
4. Entra ID가 SAML Response (Assertion) 발급
5. 사용자가 SAML Response를 들고 Salesforce로 리디렉션
6. Salesforce가 SAML Response 검증 후 로그인 완료

<br>

## 2. Microsoft Entra Domain Services 심층 분석

### 2.1 Domain Services의 필요성

**레거시 앱의 문제**

많은 기존 애플리케이션은 **LDAP**, **Kerberos**, **NTLM** 같은 전통적인 인증 프로토콜에 의존합니다. 하지만 Entra ID는 이러한 프로토콜을 지원하지 않습니다.

> **문제 시나리오:** 10년 된 Java 앱 → LDAP 디렉터리 조회 + Kerberos 인증 → Entra ID 직접 통합 불가

**해결책: Entra Domain Services**

Entra Domain Services는 **관리형 도메인 서비스**를 제공하여, 온프레미스 AD DS와 동일한 프로토콜을 클라우드에서 사용할 수 있게 합니다.

### 2.2 Domain Services 아키텍처

**관리형 도메인**

Entra Domain Services는 Azure가 완전히 관리하는 도메인 컨트롤러(DC) 쌍을 제공합니다.

```
Entra Domain Services 아키텍처:

Entra ID 테넌트: contoso.onmicrosoft.com
  │
  │ (단방향 동기화)
  ▼
Entra Domain Services 관리형 도메인
  도메인 이름: aaddscontoso.com
  
  구성 요소:
  • DC1 (Primary) + DC2 (Replica) - 고가용성
  • LDAP 서버
  • Kerberos KDC
  • NTLM 인증
  • 그룹 정책 (GPO)
  │
  │ (도메인 가입, LDAP 쿼리)
  ▼
Azure Virtual Machines
  • VM1 (도메인 가입됨)
  • VM2 (도메인 가입됨)
  • 레거시 앱 실행
```

**동기화 흐름**

```
온프레미스 AD (옵션)
    │
    │ (Entra ID Connect)
    ▼
Entra ID
    │
    │ (자동 동기화: 사용자, 그룹, 자격 증명 해시)
    ▼
Entra Domain Services
```

**중요 특징**
- **단방향 동기화**: Entra ID → Domain Services (역방향 불가)
- **자동 동기화**: 사용자 및 그룹 변경 사항이 자동으로 반영
- **패스워드 해시 동기화**: 사용자가 동일한 비밀번호로 도메인 로그인 가능

### 2.3 Domain Services 주요 기능

#### 2.3.1 도메인 가입 (Domain Join)

Azure VM을 Domain Services 관리형 도메인에 가입시킬 수 있습니다.

```
도메인 가입 프로세스:

1. Azure에서 Windows Server VM 생성
2. VM을 Domain Services 가상 네트워크에 배치
3. VM에서 "시스템 속성" → "도메인 변경"
4. 도메인 이름 입력: aaddscontoso.com
5. 도메인 관리자 자격 증명 입력
6. VM이 도메인에 가입됨

결과:
- 도메인 사용자로 VM에 로그인 가능
- GPO가 VM에 자동 적용
- 도메인 리소스 접근 가능
```

#### 2.3.2 LDAP 지원

레거시 앱이 LDAP 프로토콜을 사용하여 사용자 및 그룹 정보를 조회할 수 있습니다.

```
LDAP 쿼리 예시:

LDAP Server: ldap://aaddscontoso.com
Base DN: DC=aaddscontoso,DC=com

쿼리:
(&(objectClass=user)(sAMAccountName=john))

결과:
dn: CN=John Doe,OU=AADDC Users,DC=aaddscontoso,DC=com
displayName: John Doe
mail: john@contoso.com
memberOf: CN=Finance Team,OU=AADDC Users,DC=aaddscontoso,DC=com
```

**보안 LDAP (LDAPS)**

기본적으로 LDAP 통신은 암호화되지 않습니다. Domain Services는 **LDAPS (LDAP over SSL/TLS)** 를 지원하여 안전한 통신을 보장합니다.

```
LDAPS 설정:

1. 인증서 생성 (도메인 이름과 일치)
2. Domain Services에 인증서 업로드
3. 클라이언트에서 LDAPS 연결
   → ldaps://aaddscontoso.com:636
```

#### 2.3.3 Kerberos 및 NTLM 인증

**Kerberos 인증**

Domain Services는 Kerberos KDC (Key Distribution Center) 역할을 수행합니다.

Kerberos 인증 흐름:

1. 사용자가 도메인 가입 VM에 로그인
2. VM이 Domain Services KDC에 TGT (Ticket Granting Ticket) 요청
3. KDC가 TGT 발급
4. 사용자가 네트워크 리소스(파일 서버) 접근 시도
5. VM이 KDC에 서비스 티켓 요청 (TGT 사용)
6. KDC가 서비스 티켓 발급
7. VM이 서비스 티켓으로 파일 서버에 인증

**NTLM 인증**

레거시 시스템을 위해 NTLM도 지원됩니다.

#### 2.3.4 그룹 정책 (Group Policy)

Domain Services는 그룹 정책을 통해 VM 및 사용자 설정을 중앙에서 관리할 수 있습니다.

**기본 GPO**

Domain Services는 두 개의 기본 GPO를 제공합니다:
- **AADDC Computers**: 도메인 가입 컴퓨터에 적용
- **AADDC Users**: 도메인 사용자에 적용

**사용자 정의 GPO 생성**

GPO 생성 및 적용:

1. 도메인 가입 Windows VM에서 GPMC (Group Policy Management Console) 실행
2. "AADDC Computers" OU에 새 GPO 생성
3. GPO 설정 구성
   - 예: 화면 보호기 활성화, 비밀번호 정책, 소프트웨어 배포
4. GPO를 OU에 연결
5. 도메인 컴퓨터가 다음 그룹 정책 업데이트 시 설정 적용

### 2.4 Domain Services vs 온프레미스 AD DS

**공통점**
- LDAP, Kerberos, NTLM 프로토콜 지원
- 도메인 가입 및 그룹 정책
- 사용자 및 그룹 관리

**차이점**

| 기능 | 온프레미스 AD DS | Entra Domain Services |
|------|----------------|---------------------|
| **관리 책임** | 고객이 DC 설치, 패치, 백업 | Microsoft가 관리 |
| **스키마 확장** | 가능 | 불가능 |
| **도메인/포리스트 신뢰** | 지원 | 제한적 (단방향 포리스트 트러스트만) |
| **관리자 권한** | Domain Admin, Enterprise Admin | AAD DC Administrators 그룹 (제한된 권한) |
| **OU 구조** | 완전히 사용자 정의 가능 | 기본 OU만 제공 (AADDC Users, AADDC Computers) |
| **비용** | 인프라 비용 + 관리 인력 | 월별 구독 비용 |

**제한 사항**

Domain Services는 관리형 서비스이므로 다음 작업은 불가능합니다:
- 도메인 컨트롤러에 직접 RDP 접속
- 스키마 수정
- Enterprise Admin 또는 Schema Admin 권한 획득
- 완전한 OU 계층 구조 생성

### 2.5 Domain Services 사용 사례

**사례 1: 레거시 앱 마이그레이션**

```
시나리오: 온프레미스 LDAP 기반 Java 앱을 Azure로 마이그레이션

1. Azure에서 Entra Domain Services 배포
2. 온프레미스 AD와 Entra ID 동기화 (Entra ID Connect)
3. Entra ID가 Domain Services와 자동 동기화
4. Azure VM에 Java 앱 배포 및 도메인 가입
5. 앱의 LDAP 연결 문자열을 Domain Services로 변경
6. 앱이 Domain Services LDAP를 통해 사용자 인증 수행
```

**사례 2: 하이브리드 파일 서버**

```
시나리오: Azure에서 Windows 파일 서버 운영

1. Domain Services 배포
2. Azure에 Windows Server VM 생성 및 도메인 가입
3. VM에 파일 공유 구성
4. 도메인 사용자/그룹에 NTFS 권한 부여
5. 온프레미스 사용자가 VPN을 통해 Azure 파일 서버 접근
6. Kerberos 인증으로 안전하게 파일 접근
```

**사례 3: Lift-and-Shift 마이그레이션**

```
시나리오: 온프레미스 AD 의존 앱을 그대로 클라우드로 이전

1. Domain Services 배포
2. 온프레미스 AD와 동기화
3. Azure Migrate로 VM을 Azure로 마이그레이션
4. 마이그레이션된 VM을 Domain Services 도메인에 가입
5. GPO 및 LDAP 쿼리가 자동으로 Domain Services로 전환
```

<br>

## 3. Entra ID와 Domain Services 통합 시나리오

### 3.1 하이브리드 ID 아키텍처

많은 조직은 온프레미스 AD, Entra ID, Domain Services를 모두 사용하는 **하이브리드 환경**을 운영합니다.

```
하이브리드 ID 아키텍처:

[온프레미스 환경]
Active Directory
  • Users
  • Groups
  • Computers
  │
  │ (Entra ID Connect)
  ▼
[클라우드 환경]
Entra ID
  • SSO
  • MFA
  • Conditional Access
  │
  │ (자동 동기화)
  ▼
Entra Domain Services
  • LDAP
  • Kerberos
  • GPO
  │
  │ (도메인 가입)
  ▼
Azure Virtual Machines
  • Windows Server
  • Legacy Apps
```

### 3.2 ID 라이프사이클 관리

**신규 사용자 프로비저닝**

```
1. HR 시스템에서 신규 직원 등록
2. 온프레미스 AD에 사용자 계정 생성
3. Entra ID Connect가 Entra ID로 동기화 (5분 이내)
4. Entra ID가 Domain Services로 동기화 (30분 이내)
5. 사용자가 다음 작업 가능:
   - Microsoft 365 로그인 (Entra ID)
   - Azure VM에 도메인 로그인 (Domain Services)
   - 온프레미스 리소스 접근 (온프레미스 AD)
```

**사용자 퇴사 처리**

```
1. HR 시스템에서 퇴사 직원 비활성화
2. 온프레미스 AD 계정 비활성화
3. Entra ID Connect가 변경 사항 동기화
4. Entra ID 계정 비활성화 → 모든 클라우드 앱 접근 차단
5. Domain Services 계정 비활성화 → Azure VM 로그인 불가
```

### 3.3 인증 방식 선택

**Entra ID Connect 인증 옵션**

온프레미스 AD 사용자가 Entra ID로 인증할 때, 세 가지 방식 중 선택할 수 있습니다:

**1) Password Hash Synchronization (PHS)**
- 온프레미스 AD 비밀번호 해시를 Entra ID로 동기화
- 사용자가 Entra ID에서 직접 인증
- 장점: 온프레미스 인프라 의존 없음, 재해 복구 시 유리
- 단점: 클라우드에 비밀번호 해시 저장 (일부 조직의 정책 위배 가능)

**2) Pass-through Authentication (PTA)**
- Entra ID가 인증 요청을 온프레미스 AD로 전달
- 온프레미스 에이전트가 AD에서 직접 인증 검증
- 장점: 비밀번호가 클라우드에 저장되지 않음
- 단점: 온프레미스 인프라 의존

**3) Federated Authentication (ADFS)**
- Active Directory Federation Services 사용
- 가장 복잡하지만 고급 시나리오 지원
- 장점: 스마트 카드 인증 등 고급 기능
- 단점: 높은 관리 부담

**권장 사항**

대부분의 조직에는 **PHS + Seamless SSO** 조합이 권장됩니다. 간단하고 안정적이며, 재해 복구 시에도 사용자가 계속 인증할 수 있습니다.

<br>

## 4. 마치며

Microsoft Entra ID와 Entra Domain Services는 각각 **현대적 클라우드 인증**과 **레거시 앱 지원**이라는 서로 다른 목적을 가지고 있지만, 함께 사용될 때 강력한 하이브리드 ID 플랫폼을 구성합니다.

**핵심 포인트 요약**

**Entra ID**
- 클라우드 네이티브 인증 플랫폼 (OAuth, OIDC, SAML)
- SSO, MFA, 조건부 액세스를 통한 제로 트러스트 보안
- 앱 등록, 서비스 주체, 관리 ID를 통한 현대적 앱 통합
- Microsoft Graph API를 통한 프로그래밍 방식 관리

**Entra Domain Services**
- 관리형 도메인 서비스 (LDAP, Kerberos, NTLM)
- 레거시 앱의 클라우드 마이그레이션 지원
- 도메인 가입 및 그룹 정책을 통한 VM 관리
- Entra ID와 자동 동기화

**선택 가이드**
- 최신 웹/모바일 앱 개발 → **Entra ID**
- 레거시 LDAP/Kerberos 앱 → **Entra Domain Services**
- SaaS 앱 통합 및 SSO → **Entra ID**
- Azure VM 도메인 가입 → **Entra Domain Services**
- 외부 파트너 협업 → **Entra External ID (B2B)**
- 고객용 앱 → **Entra External ID (CIAM)**

다음 단계로 실습을 진행하시려면, Azure Portal에서 직접 Entra ID 테넌트를 생성하고 조건부 액세스 정책을 설정해보는 것을 권장합니다!

<br>

<!--
> 참고 자료:
> - Microsoft Learn, "What is Microsoft Entra ID?"
> - Microsoft Learn, "What is Microsoft Entra Domain Services?"
> - Microsoft Identity Platform documentation
> - Azure AD authentication protocols
-->
