---
layout: post
title: "Microsoft Entra (2): Entra ID와 Domain Services 심층 분석"
date: 2026-02-05 09:00:00 +0900
tags: [Study, Azure, Microsoft Entra, Entra ID, Domain Services, Authentication]
categories: Azure_Study
---

지난 포스트 [**Microsoft Entra (1): 서비스 개요와 ID 및 액세스 관리 생태계**]({% post_url 2026-02-03-microsoft-entra(1) %})에서는 Microsoft Entra 제품군의 전체 구조를 살펴봤습니다.

이번 포스트에서는 Microsoft Entra 생태계의 **핵심 기반**인 **Entra ID**(구 Azure AD)와 레거시 앱 지원을 위한 **Entra Domain Services**의 내부 동작 원리를 깊이 있게 분석합니다.

<br>

## 1. Microsoft Entra ID 심층 분석

### 1.1 Entra ID의 정체성

**클라우드 네이티브 ID 플랫폼**

Entra ID는 온프레미스 Active Directory(AD)의 클라우드 버전이 **아닙니다**. 완전히 새롭게 설계된 **클라우드 네이티브 인증 및 권한 부여 플랫폼**입니다.

**핵심 차이점: 온프레미스 AD vs Entra ID**

| 구분 | 온프레미스 AD | Entra ID |
|------|-------------|----------|
| **아키텍처** | 계층적 디렉터리 (OU, 도메인 트리) | 플랫 네임스페이스 (테넌트 기반) |
| **프로토콜** | LDAP, Kerberos, NTLM | OAuth 2.0, OpenID Connect, SAML |
| **쿼리 방식** | LDAP 쿼리 | Microsoft Graph API (REST) |
| **관리 도구** | Active Directory Users and Computers | Azure Portal, PowerShell, Graph API |
| **그룹 정책** | GPO (Group Policy Object) | Intune, 조건부 액세스 정책 |
| **도메인 가입** | 지원 | 지원 안 함 (단, Azure AD Join 존재) |
| **인증 대상** | 주로 Windows 도메인 가입 머신 | 모든 플랫폼 (Windows, macOS, iOS, Android) |
| **확장성** | 도메인 컨트롤러 수평 확장 필요 | 자동 확장 (Microsoft 관리) |

**핵심 개념**

Entra ID는 **OAuth 2.0** 및 **OpenID Connect** 표준 기반의 최신 인증 플랫폼입니다. 따라서 웹 앱, 모바일 앱, API 등 다양한 현대적 애플리케이션과 자연스럽게 통합됩니다.

```
전통적인 인증 (온프레미스 AD):
사용자 → Windows 로그인 → Kerberos 티켓 → 파일 서버 접근

현대적 인증 (Entra ID):
사용자 → 웹 브라우저/앱 → OAuth 토큰 → SaaS/API 접근
```

### 1.2 Entra ID 아키텍처

**테넌트(Tenant) 구조**

Entra ID의 기본 단위는 **테넌트(Tenant)** 입니다. 테넌트는 조직을 나타내는 Entra ID의 전용 인스턴스입니다.

```
┌─────────────────────────────────────────────────────────┐
│           Entra ID 테넌트: contoso.onmicrosoft.com      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Users (사용자)                                          │
│  ├─ john@contoso.com                                   │
│  ├─ jane@contoso.com                                   │
│  └─ admin@contoso.com                                  │
│                                                         │
│  Groups (그룹)                                           │
│  ├─ Finance Team                                       │
│  ├─ Engineering Team                                   │
│  └─ Admins                                             │
│                                                         │
│  Applications (앱 등록)                                  │
│  ├─ Internal HR App                                    │
│  ├─ Customer Portal                                    │
│  └─ Mobile App                                         │
│                                                         │
│  Service Principals (서비스 주체)                        │
│  ├─ Managed Identity for VM                           │
│  └─ GitHub Actions Service Principal                  │
│                                                         │
│  Policies (정책)                                         │
│  ├─ Conditional Access Policies                       │
│  ├─ MFA Policies                                       │
│  └─ Password Policies                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**멀티 테넌트 시나리오**

하나의 조직이 여러 테넌트를 운영할 수도 있습니다:

```
Contoso Corporation:
├─ Production 테넌트: contoso.onmicrosoft.com
├─ Development 테넌트: contoso-dev.onmicrosoft.com
└─ Partner 테넌트: contoso-partners.onmicrosoft.com
```

각 테넌트는 **완전히 독립적**이며, 사용자, 정책, 앱이 분리됩니다.

### 1.3 Entra ID의 핵심 구성 요소

#### 1.3.1 사용자 및 그룹

**사용자 유형**

1. **클라우드 전용 사용자 (Cloud-Only Users)**
   - Entra ID에서 직접 생성된 사용자
   - 예: `john@contoso.onmicrosoft.com`

2. **동기화된 사용자 (Synced Users)**
   - 온프레미스 AD에서 Entra ID Connect를 통해 동기화된 사용자
   - 온프레미스 AD가 **권한 있는 원본(Source of Authority)**

3. **게스트 사용자 (Guest Users)**
   - 외부 조직 또는 개인 계정 사용자
   - B2B 협업에 사용
   - 예: `partner@fabrikam.com` (External)

**그룹 유형**

1. **보안 그룹 (Security Groups)**
   - 리소스 접근 권한 관리
   - 예: "Finance Team" 그룹에 재무 앱 접근 권한 부여

2. **Microsoft 365 그룹**
   - 협업 도구 (Teams, SharePoint, Outlook) 통합
   - 자동으로 공유 사서함, 문서 라이브러리 생성

**동적 그룹 (Dynamic Groups)**

사용자 속성에 따라 **자동으로 멤버십 관리**:

```
규칙 예시:

IF user.department == "Engineering"
   AND user.country == "South Korea"
THEN 자동으로 "Korea Engineering" 그룹에 추가

쿼리 문법:
(user.department -eq "Engineering") -and (user.country -eq "South Korea")
```

#### 1.3.2 애플리케이션 등록 및 서비스 주체

**앱 등록 (App Registration)**

Entra ID와 통합하려는 애플리케이션을 등록하는 과정입니다.

```
앱 등록 프로세스:

1. Azure Portal → Entra ID → App registrations → New registration
2. 앱 이름, 지원되는 계정 유형, 리디렉션 URI 설정
3. Client ID 및 Client Secret 생성
4. API 권한 설정 (예: Microsoft Graph API 읽기 권한)
```

**앱 등록 정보**
- **Application (Client) ID**: 앱의 고유 식별자 (GUID)
- **Client Secret**: 앱이 Entra ID에 인증할 때 사용하는 비밀 키
- **Redirect URI**: OAuth 인증 후 사용자를 리디렉션할 URL
- **API Permissions**: 앱이 요청할 수 있는 권한 목록

**서비스 주체 (Service Principal)**

앱 등록의 **로컬 인스턴스**입니다. 앱 등록은 전역 정의이고, 서비스 주체는 특정 테넌트 내에서 앱이 실제로 실행되는 ID입니다.

```
관계:

App Registration (전역):
├─ Application ID: 12345678-1234-1234-1234-123456789abc
└─ Name: "Contoso HR App"

Service Principal (Tenant A):
└─ 실제 권한 및 역할 할당

Service Principal (Tenant B):
└─ 실제 권한 및 역할 할당 (독립적)
```

**관리 ID (Managed Identity)**

Azure 리소스(VM, App Service, Function 등)에 자동으로 할당되는 ID로, 자격 증명 관리 없이 다른 Azure 서비스에 인증할 수 있습니다.

```
시나리오: VM이 Key Vault에서 비밀 읽기

1. VM에 System-Assigned Managed Identity 활성화
2. Key Vault에서 해당 관리 ID에 "Secret Reader" 역할 부여
3. VM 내 코드는 자격 증명 없이 Key Vault API 호출
4. Azure가 자동으로 인증 토큰 발급 및 갱신
```

**장점**
- 코드에 자격 증명을 하드코딩하지 않음
- 자동 토큰 갱신 (개발자 관리 불필요)
- Azure 리소스 간 보안 통신

#### 1.3.3 인증 프로토콜 및 토큰

**Entra ID가 지원하는 주요 프로토콜**

1. **OAuth 2.0**: 권한 부여 프레임워크
2. **OpenID Connect (OIDC)**: OAuth 2.0 위에 구축된 인증 레이어
3. **SAML 2.0**: 엔터프라이즈 SSO를 위한 XML 기반 프로토콜

**OAuth 2.0 인증 흐름**

가장 일반적인 **Authorization Code Flow** 예시:

```
[사용자가 웹 앱에 로그인하는 과정]

1. 사용자가 웹 앱에 접근
   → 앱: "로그인이 필요합니다"

2. 앱이 사용자를 Entra ID 로그인 페이지로 리디렉션
   → URL: https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize
   → 파라미터: client_id, redirect_uri, scope

3. 사용자가 자격 증명 입력 (+ MFA 가능)
   → Entra ID가 사용자 인증

4. Entra ID가 Authorization Code를 발급하여 앱의 Redirect URI로 리디렉션
   → https://myapp.com/callback?code=ABC123

5. 앱이 Authorization Code를 사용하여 Entra ID에 Access Token 요청
   → POST /token (client_id, client_secret, code 포함)

6. Entra ID가 Access Token 및 Refresh Token 발급
   → Access Token: API 호출에 사용 (유효 기간: 1시간)
   → Refresh Token: Access Token 갱신에 사용 (유효 기간: 90일)

7. 앱이 Access Token을 사용하여 보호된 API 호출
   → Authorization: Bearer <access_token>
```

**토큰 구조**

Entra ID의 Access Token은 **JWT (JSON Web Token)** 형식입니다.

```
JWT 구조:

Header.Payload.Signature

예시 (디코딩된 Payload):
{
  "aud": "https://graph.microsoft.com",
  "iss": "https://sts.windows.net/tenant-id/",
  "iat": 1609459200,
  "exp": 1609462800,
  "sub": "user-object-id",
  "name": "John Doe",
  "upn": "john@contoso.com",
  "roles": ["User.Read", "Mail.Send"]
}
```

**주요 클레임 (Claims)**
- **aud (audience)**: 토큰의 대상 (어떤 API를 호출할 수 있는지)
- **iss (issuer)**: 토큰 발급자 (Entra ID)
- **exp (expiration)**: 토큰 만료 시간
- **sub (subject)**: 사용자 고유 식별자
- **roles**: 사용자에게 부여된 역할 또는 권한

#### 1.3.4 조건부 액세스 (Conditional Access)

**개념**

조건부 액세스는 **IF-THEN-ELSE** 논리를 사용하여 접근을 제어하는 정책 엔진입니다.

```
정책 구조:

IF [조건(Conditions)]
THEN [액세스 제어(Access Controls)]
```

**조건 (Conditions)**

1. **사용자/그룹**: 특정 사용자, 그룹, 역할
2. **클라우드 앱**: 대상 애플리케이션 (예: Microsoft 365, Salesforce)
3. **위치**: IP 주소 범위 또는 국가
4. **디바이스 플랫폼**: Windows, iOS, Android 등
5. **디바이스 상태**: 관리형 디바이스, 규정 준수 디바이스
6. **로그인 위험**: AI 기반 위험 수준 (낮음, 중간, 높음)
7. **사용자 위험**: 손상된 자격 증명 탐지

**액세스 제어 (Access Controls)**

**허용(Grant)**
- MFA 요구
- 규정 준수 디바이스 필요
- Hybrid Azure AD Joined 디바이스 필요
- 승인된 클라이언트 앱 필요
- 앱 보호 정책 필요

**차단(Block)**
- 완전히 액세스 차단

**세션 제어(Session)**
- 제한된 세션 (예: 다운로드 금지, 복사/붙여넣기 금지)
- 로그인 빈도 제한 (예: 8시간마다 재인증)

**조건부 액세스 정책 예시**

**예시 1: 관리자 보호**
```
정책 이름: "Require MFA for Admins"

IF:
  - 사용자가 "Global Administrator" 역할을 가짐
  - 모든 클라우드 앱 접근 시

THEN:
  - MFA 요구
  - 승인된 디바이스에서만 접근 허용
```

**예시 2: 외부 접근 제한**
```
정책 이름: "Block External Access to Finance App"

IF:
  - 클라우드 앱이 "SAP Finance"
  - 위치가 "회사 IP 범위" 외부

THEN:
  - 액세스 차단
```

**예시 3: 위험 기반 접근 제어**
```
정책 이름: "High Risk Sign-in Protection"

IF:
  - 로그인 위험이 "높음"
  - 모든 사용자

THEN:
  - MFA 요구
  - 비밀번호 변경 강제
```

**평가 프로세스**

조건부 액세스 정책은 **모든 정책이 평가**되며, 가장 제한적인 정책이 적용됩니다.

```
평가 순서:

1. 사용자 로그인 시도
2. 모든 조건부 액세스 정책 평가
3. 조건 일치하는 정책 식별
4. 모든 일치 정책의 제어 사항 결합
5. 가장 제한적인 제어 적용 (예: 하나라도 "차단"이면 차단)
```

#### 1.3.5 MFA (Multi-Factor Authentication)

**인증 요소 3가지 범주**

1. **Something You Know (지식 요소)**: 비밀번호, PIN
2. **Something You Have (소유 요소)**: 스마트폰, 하드웨어 토큰
3. **Something You Are (생체 요소)**: 지문, 얼굴 인식

**Entra ID MFA 방법**

- **Microsoft Authenticator 앱** (푸시 알림 또는 TOTP 코드)
- **SMS 문자 메시지** (6자리 코드)
- **음성 통화** (자동 음성 안내)
- **OATH 하드웨어 토큰** (물리적 토큰 디바이스)
- **FIDO2 보안 키** (USB 또는 NFC 하드웨어 키)

**MFA 활성화 방법**

1. **사용자별 MFA**: 개별 사용자에게 수동으로 활성화
2. **조건부 액세스 정책**: 특정 조건에서 MFA 요구 (권장)
3. **보안 기본값(Security Defaults)**: 모든 사용자에게 자동으로 MFA 활성화 (신규 테넌트 기본값)

**MFA 흐름 예시**

```
1. 사용자가 비밀번호 입력
2. Entra ID가 조건부 액세스 정책 평가 → MFA 필요 판단
3. 사용자에게 MFA 프롬프트 표시
   → "Microsoft Authenticator 앱에서 알림을 승인하세요"
4. 사용자가 스마트폰에서 "승인" 버튼 클릭
5. Entra ID가 인증 완료 후 토큰 발급
```

#### 1.3.6 Single Sign-On (SSO)

**SSO의 작동 원리**

사용자가 한 번 로그인하면, Entra ID가 **세션 토큰**을 발급하여 브라우저 쿠키에 저장합니다. 이후 다른 앱 접근 시, Entra ID가 세션을 확인하여 재로그인 없이 액세스를 허용합니다.

```
SSO 시나리오:

1. 사용자가 Outlook.com에 로그인
   → Entra ID 세션 생성

2. 동일 브라우저에서 SharePoint 접근
   → Entra ID가 기존 세션 확인
   → 재로그인 없이 자동 로그인

3. Power BI 접근
   → 동일 세션 사용
   → 즉시 접근
```

**SSO 지원 프로토콜**

1. **SAML 2.0**: 엔터프라이즈 SaaS 앱 (Salesforce, Workday 등)
2. **OpenID Connect**: 최신 웹/모바일 앱
3. **Password-based SSO**: SAML/OIDC 미지원 레거시 앱

**SAML SSO 흐름**

```
1. 사용자가 Salesforce 접근
2. Salesforce가 사용자를 Entra ID로 리디렉션 (SAML Request)
3. Entra ID가 사용자 인증 (이미 로그인 상태면 스킵)
4. Entra ID가 SAML Response (Assertion) 발급
5. 사용자가 SAML Response를 들고 Salesforce로 리디렉션
6. Salesforce가 SAML Response 검증 후 로그인 완료
```

<br>

## 2. Microsoft Entra Domain Services 심층 분석

### 2.1 Domain Services의 필요성

**레거시 앱의 문제**

많은 기존 애플리케이션은 **LDAP**, **Kerberos**, **NTLM** 같은 전통적인 인증 프로토콜에 의존합니다. 하지만 Entra ID는 이러한 프로토콜을 지원하지 않습니다.

```
문제 시나리오:

- 10년 된 Java 엔터프라이즈 앱
- LDAP를 통해 사용자 디렉터리 조회
- Kerberos를 통해 인증 수행

→ Entra ID로는 직접 통합 불가!
```

**해결책: Entra Domain Services**

Entra Domain Services는 **관리형 도메인 서비스**를 제공하여, 온프레미스 AD DS와 동일한 프로토콜을 클라우드에서 사용할 수 있게 합니다.

### 2.2 Domain Services 아키텍처

**관리형 도메인**

Entra Domain Services는 Azure가 완전히 관리하는 도메인 컨트롤러(DC) 쌍을 제공합니다.

```
┌────────────────────────────────────────────────────────┐
│          Entra Domain Services 아키텍처                 │
└────────────────────────────────────────────────────────┘

Entra ID 테넌트: contoso.onmicrosoft.com
           │
           │ (단방향 동기화)
           ▼
┌──────────────────────────────────────────┐
│  Entra Domain Services 관리형 도메인      │
│  도메인 이름: aaddscontoso.com           │
│                                          │
│  ┌─────────────┐   ┌─────────────┐     │
│  │   DC1       │   │    DC2      │     │ (고가용성)
│  │ (Primary)   │   │  (Replica)  │     │
│  └─────────────┘   └─────────────┘     │
│                                          │
│  - LDAP 서버                             │
│  - Kerberos KDC                         │
│  - NTLM 인증                             │
│  - 그룹 정책 (GPO)                       │
└──────────────────────────────────────────┘
           │
           │ (도메인 가입, LDAP 쿼리)
           ▼
┌──────────────────────────────────────────┐
│      Azure Virtual Machines              │
│  - VM1 (도메인 가입됨)                    │
│  - VM2 (도메인 가입됨)                    │
│  - 레거시 앱 실행                         │
└──────────────────────────────────────────┘
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

```
Kerberos 인증 흐름:

1. 사용자가 도메인 가입 VM에 로그인
2. VM이 Domain Services KDC에 TGT (Ticket Granting Ticket) 요청
3. KDC가 TGT 발급
4. 사용자가 네트워크 리소스(파일 서버) 접근 시도
5. VM이 KDC에 서비스 티켓 요청 (TGT 사용)
6. KDC가 서비스 티켓 발급
7. VM이 서비스 티켓으로 파일 서버에 인증
```

**NTLM 인증**

레거시 시스템을 위해 NTLM도 지원됩니다.

#### 2.3.4 그룹 정책 (Group Policy)

Domain Services는 그룹 정책을 통해 VM 및 사용자 설정을 중앙에서 관리할 수 있습니다.

**기본 GPO**

Domain Services는 두 개의 기본 GPO를 제공합니다:
- **AADDC Computers**: 도메인 가입 컴퓨터에 적용
- **AADDC Users**: 도메인 사용자에 적용

**사용자 정의 GPO 생성**

```
GPO 생성 및 적용:

1. 도메인 가입 Windows VM에서 GPMC (Group Policy Management Console) 실행
2. "AADDC Computers" OU에 새 GPO 생성
3. GPO 설정 구성
   - 예: 화면 보호기 활성화, 비밀번호 정책, 소프트웨어 배포
4. GPO를 OU에 연결
5. 도메인 컴퓨터가 다음 그룹 정책 업데이트 시 설정 적용
```

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
┌──────────────────────────────────────────────────────────┐
│               하이브리드 ID 아키텍처                       │
└──────────────────────────────────────────────────────────┘

온프레미스 환경
┌─────────────────────┐
│  Active Directory   │
│  - Users            │
│  - Groups           │
│  - Computers        │
└──────┬──────────────┘
       │
       │ (Entra ID Connect)
       ▼
클라우드 환경
┌─────────────────────┐
│   Entra ID          │
│   - SSO             │
│   - MFA             │
│   - Conditional     │
│     Access          │
└──────┬──────────────┘
       │
       │ (자동 동기화)
       ▼
┌─────────────────────┐
│  Entra Domain       │
│  Services           │
│  - LDAP             │
│  - Kerberos         │
│  - GPO              │
└─────────────────────┘
       │
       │ (도메인 가입)
       ▼
┌─────────────────────┐
│  Azure Virtual      │
│  Machines           │
│  - Windows Server   │
│  - Legacy Apps      │
└─────────────────────┘
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
