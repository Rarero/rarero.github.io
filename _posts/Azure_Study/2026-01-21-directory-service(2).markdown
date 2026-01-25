---
layout: post
title: "디렉토리 서비스(Directory Service) (2): Active Directory 심층 분석"
date: 2026-01-21 09:00:00 +0900
tags: [Study, Active Directory, Kerberos, Windows]
categories: Azure_Study
---

지난 포스트 [**디렉토리 서비스(Directory Service) (1): 기본 개념과 프로토콜**]({% post_url 2026-01-19-directory-service(1) %})에서는 LDAP과 X.500 기반의 디렉토리 서비스 기본 개념을 다뤘다.

이번 포스트에서는 Windows 환경의 핵심 인프라인 **Active Directory**의 내부 구조, Kerberos 인증, 복제 메커니즘, Group Policy 등을 심층 분석한다.

<br>

## 1. Active Directory 개요

### 1.1 정의 및 역할

**Active Directory Domain Services (AD DS)**는 Microsoft가 Windows 2000부터 제공하는 디렉토리 서비스로, Windows 네트워크 환경에서 중앙화된 인증, 인가, 리소스 관리를 담당한다.

**핵심 기능**:

1. **인증 서비스**: Kerberos v5, NTLM 프로토콜 지원
2. **디렉토리 서비스**: LDAP 기반 계층적 정보 저장소
3. **정책 관리**: Group Policy를 통한 중앙 집중식 설정 배포
4. **DNS 통합**: 동적 DNS 업데이트 및 서비스 위치 (SRV 레코드)
5. **복제**: Multi-Master 복제를 통한 고가용성

### 1.2 AD DS의 주요 구성요소

**1) Domain Controller (DC)**
- AD DS 데이터베이스를 호스팅하는 서버
- 인증 요청 처리
- 디렉토리 객체 관리
- 다른 DC와 복제 수행

**2) Active Directory Database (NTDS.DIT)**
```
파일 위치: %SystemRoot%\NTDS\ntds.dit

구조:
- ESE (Extensible Storage Engine) 데이터베이스
- 최대 크기: 16TB (이론적)
- 트랜잭션 로그 지원
```

**데이터베이스 구성**:
```
NTDS.DIT 파일
  ├── Schema Partition (스키마 정보)
  ├── Configuration Partition (토폴로지 정보)
  ├── Domain Partition (도메인 객체: 사용자, 그룹, 컴퓨터)
  └── Application Partitions (DNS, 애플리케이션 데이터)

트랜잭션 로그:
  - edb.log (현재 로그)
  - edb*.log (이전 로그)
  - edb.chk (체크포인트)
```

**3) Global Catalog (GC)**
- 포레스트 전체의 부분 속성 복제본
- 포트: 3268 (LDAP), 3269 (LDAPS)
- 크로스 도메인 검색 가능
- 유니버설 그룹 멤버십 정보 포함

**GC가 저장하는 속성 예시**:
```
전체 복제 (자체 도메인):
  - 모든 속성

부분 복제 (다른 도메인):
  - objectClass
  - cn (Common Name)
  - sAMAccountName
  - userPrincipalName
  - mail
  - member (그룹 멤버십)
  ... (약 200개의 핵심 속성만)
```

**4) Schema**
AD에 저장 가능한 객체 클래스와 속성 정의.

```
Schema Partition DN:
CN=Schema,CN=Configuration,DC=example,DC=com

주요 객체:
- classSchema: 객체 클래스 정의 (user, computer, group 등)
- attributeSchema: 속성 정의 (sAMAccountName, mail 등)
```

**예시 - User 클래스 정의**:
```
CN=User,CN=Schema,CN=Configuration,DC=example,DC=com

objectClass: classSchema
cn: User
subClassOf: organizationalPerson
objectClassCategory: 1 (Structural)
mustContain: (필수 속성 없음)
mayContain: userPrincipalName, sAMAccountName, mail, ...
systemMustContain: objectSid, objectGUID
systemMayContain: ...
```

> 참고: Microsoft Docs, "Active Directory Domain Services Overview"

<br>

## 2. AD 논리적 구조

### 2.1 Forest (포레스트)

**정의**: AD의 최상위 컨테이너. 보안과 관리의 최종 경계.

**특징**:
- 공통 스키마 공유
- 공통 Configuration Partition 공유
- 공통 Global Catalog
- 트러스트 관계로 연결된 도메인 트리 집합

**포레스트 구성 예시**:
```
Forest Root Domain: example.com
  ├── Tree: example.com
  │     ├── Domain: example.com
  │     └── Child Domain: asia.example.com
  │           └── Child Domain: korea.asia.example.com
  └── Tree: subsidiary.com
        └── Domain: subsidiary.com
```

### 2.2 Domain (도메인)

**정의**: 공통 디렉토리 데이터베이스를 공유하는 관리 단위.

**도메인의 역할**:
- 보안 경계 (각 도메인별 관리자 분리)
- 복제 경계 (도메인 내 모든 DC가 전체 복제)
- 정책 적용 범위 (GPO의 기본 적용 범위)

**도메인 명명 구조**:
```
DNS 이름: korea.asia.example.com
NetBIOS 이름: KOREA (15자 제한)

LDAP DN:
DC=korea,DC=asia,DC=example,DC=com
```

**도메인 기능 수준 (Domain Functional Level)**:
```
기능 수준에 따라 사용 가능한 기능 제한:
- Windows Server 2008
- Windows Server 2012
- Windows Server 2016
- Windows Server 2019
- Windows Server 2022

기능 수준 상향 조정:
  - 되돌릴 수 없음 (비가역적)
  - 모든 DC가 해당 OS 버전 이상이어야 함
```

### 2.3 Organizational Unit (OU)

**정의**: 도메인 내에서 객체를 조직하는 논리적 컨테이너.

**OU의 용도**:
- 관리 위임 (Delegation)
- Group Policy 적용
- 조직 구조 반영

**OU 계층 예시**:
```
DC=example,DC=com
  ├── OU=Corporate
  │     ├── OU=Users
  │     │     ├── OU=Engineering
  │     │     │     └── CN=Alice Smith
  │     │     └── OU=Sales
  │     │           └── CN=Bob Johnson
  │     └── OU=Computers
  │           ├── OU=Workstations
  │           └── OU=Servers
  └── OU=Groups
        ├── CN=Domain Admins
        └── CN=Engineering Team
```

**OU vs Container**:
| 측면 | OU | Container (CN) |
|------|-----|---------------|
| **GPO 연결** | 가능 | 불가능 |
| **위임** | 가능 | 제한적 |
| **중첩** | 무제한 | 불가능 (기본 컨테이너는 고정) |
| **예시** | OU=Users | CN=Users (기본 컨테이너) |

### 2.4 Trust Relationship (트러스트 관계)

**정의**: 도메인 또는 포레스트 간 인증 경로.

**트러스트 방향**:
```
단방향 트러스트:
Domain A ---trusts---> Domain B
  - B의 사용자가 A의 리소스에 접근 가능
  - A의 사용자는 B의 리소스에 접근 불가

양방향 트러스트:
Domain A <---trusts---> Domain B
  - 양쪽 사용자 모두 상대 도메인 리소스 접근 가능
```

**트러스트 타입**:

**1) Parent-Child Trust**
```
example.com (Parent)
    ↓ 양방향 전이적 트러스트
asia.example.com (Child)
```

**2) Tree-Root Trust**
```
example.com (Tree 1)
    ↔ 양방향 전이적 트러스트
subsidiary.com (Tree 2)
```

**3) Forest Trust**
```
Forest A (example.com)
    ↔
Forest B (partner.com)

특징:
  - 선택적 인증 가능
  - SID Filtering 적용
```

**4) External Trust**
```
Domain A (AD)
    ↔
Domain B (다른 포레스트 또는 NT 4.0 도메인)

특징:
  - 비전이적
  - 단일 도메인 간 트러스트
```

**5) Realm Trust**
```
AD Domain
    ↔
Kerberos v5 Realm (Unix/Linux)
```

**트러스트 전이성 (Transitivity)**:
```
전이적 트러스트:
A trusts B, B trusts C → A trusts C

비전이적 트러스트:
A trusts B, B trusts C → A는 C를 신뢰하지 않음
```

> 참고: Microsoft Docs, "How Domain and Forest Trusts Work"

<br>

## 3. AD 물리적 구조

### 3.1 Site (사이트)

**정의**: 고속 네트워크로 연결된 IP 서브넷의 집합. 복제 토폴로지와 클라이언트 서비스 위치 결정에 사용.

**사이트의 역할**:

1. **복제 최적화**
   - Site 내: 빠른 복제 (기본 15초 간격)
   - Site 간: 느린 복제 (기본 180분 간격, 압축 사용)

2. **서비스 위치 결정**
   - 클라이언트는 동일 Site의 DC 우선 사용
   - 로그온 트래픽 최소화

3. **DFS 복제**
   - 파일 서버 복제본 선택

**사이트 구성 예시**:
```
Site: Seoul-Office
  Subnets: 192.168.1.0/24, 192.168.2.0/24
  Domain Controllers: DC01, DC02

Site: Busan-Office
  Subnets: 192.168.100.0/24
  Domain Controllers: DC03

Site Link: Seoul-Busan
  Cost: 100
  Replication Interval: 180 minutes
  Replication Schedule: 24/7
```

### 3.2 Site Link

**정의**: Site 간 네트워크 연결을 나타내는 논리적 객체.

**Site Link 속성**:
```
Name: Seoul-Busan-Link
Sites: Seoul-Office, Busan-Office
Cost: 100 (낮을수록 선호)
Replication Interval: 180분
Transport: IP 또는 SMTP
Schedule: 복제 허용 시간대
```

**복제 경로 선택**:
```
Seoul (Cost 100) → Busan
Seoul (Cost 50) → Daejeon (Cost 50) → Busan
  Total: 100             Total: 100

→ 동일 비용이면 최소 홉 선택 (Seoul → Busan 직접)
```

### 3.3 Subnet

**정의**: IP 서브넷과 Site의 매핑.

```
Subnet: 192.168.1.0/24
Site: Seoul-Office
Location: "Seoul HQ, Building A"
```

**클라이언트 사이트 결정**:
1. 클라이언트의 IP 주소 확인
2. AD의 Subnet 객체와 매칭
3. 해당 Site 결정
4. 가장 가까운 DC 선택

<br>

## 4. Kerberos 인증

AD는 **Kerberos v5** (RFC 4120)를 기본 인증 프로토콜로 사용한다.

### 4.1 Kerberos 구성요소

**1) KDC (Key Distribution Center)**
- DC가 KDC 역할 수행
- 두 가지 서비스 제공:
  - **AS (Authentication Service)**: TGT 발급
  - **TGS (Ticket Granting Service)**: 서비스 티켓 발급

**2) Principal**
- 사용자, 컴퓨터, 서비스 등 인증 주체
- 형식: `user@REALM` 또는 `service/host@REALM`
  - 예: `alice@EXAMPLE.COM`, `HTTP/web.example.com@EXAMPLE.COM`

**3) Realm**
- Kerberos 인증 범위 (AD 도메인과 매핑)
- 대문자 표기: `EXAMPLE.COM`

**4) Ticket**
- 암호화된 인증 정보
- 종류:
  - **TGT (Ticket Granting Ticket)**: AS가 발급, TGS 요청에 사용
  - **Service Ticket**: TGS가 발급, 실제 서비스 접근에 사용

### 4.2 Kerberos 인증 흐름

**전체 프로세스**:
```
1. AS_REQ: Client → KDC (AS)
2. AS_REP: KDC (AS) → Client (TGT 발급)
3. TGS_REQ: Client → KDC (TGS)
4. TGS_REP: KDC (TGS) → Client (Service Ticket 발급)
5. AP_REQ: Client → Service Server
6. AP_REP: Service Server → Client (선택적)
```

**단계별 상세 분석**:

**Phase 1: Authentication Service Exchange (AS Exchange)**

**1) AS_REQ (Authentication Service Request)**
```
Client → KDC:
{
  Client Principal: alice@EXAMPLE.COM
  Service Principal: krbtgt/EXAMPLE.COM@EXAMPLE.COM (TGS Principal)
  Timestamp: 2026-01-21 10:30:00 (Encrypted with User's Key)
  Nonce: Random Value (재전송 공격 방지)
}

암호화:
  - Timestamp는 사용자 패스워드에서 파생된 키로 암호화
  - Pre-authentication 수행 (AS-REQ-PREAUTH)
```

**2) AS_REP (Authentication Service Reply)**
```
KDC → Client:
{
  TGT: {
    Client: alice@EXAMPLE.COM
    Server: krbtgt/EXAMPLE.COM
    Session Key (TGS Session Key): K_TGS
    Lifetime: 10 hours (default)
    Encrypted with: KDC's Master Key (krbtgt account password)
  },
  Encrypted Part (with User's Key): {
    TGS Session Key: K_TGS
    Ticket Lifetime
    Nonce (echo)
  }
}

처리:
  1. Client는 자신의 패스워드로 Encrypted Part 복호화
  2. TGS Session Key (K_TGS) 추출
  3. TGT는 Client가 복호화할 수 없음 (KDC만 가능)
  4. TGT를 캐시에 저장
```

**Phase 2: Ticket Granting Service Exchange (TGS Exchange)**

**3) TGS_REQ (Ticket Granting Service Request)**
```
Client → KDC:
{
  TGT: (위에서 받은 TGT)
  Authenticator: {
    Client: alice@EXAMPLE.COM
    Timestamp: Current Time
    Encrypted with: K_TGS (TGS Session Key)
  },
  Requested Service: HTTP/web.example.com@EXAMPLE.COM
}

Authenticator의 역할:
  - TGT만으로는 인증 불충분 (누군가 훔칠 수 있음)
  - Authenticator로 TGT의 정당한 소유자임을 증명
  - Timestamp로 재전송 공격 방지 (5분 내 유효)
```

**4) TGS_REP (Ticket Granting Service Reply)**
```
KDC → Client:
{
  Service Ticket: {
    Client: alice@EXAMPLE.COM
    Server: HTTP/web.example.com
    Service Session Key: K_Service
    Lifetime: 10 hours
    Encrypted with: Service's Key (web server account password)
  },
  Encrypted Part (with K_TGS): {
    Service Session Key: K_Service
    Ticket Lifetime
  }
}

처리:
  1. Client는 K_TGS로 Encrypted Part 복호화
  2. Service Session Key (K_Service) 추출
  3. Service Ticket 캐시에 저장
```

**Phase 3: Client/Server Exchange (AP Exchange)**

**5) AP_REQ (Application Request)**
```
Client → Service Server:
{
  Service Ticket: (위에서 받은 Service Ticket)
  Authenticator: {
    Client: alice@EXAMPLE.COM
    Timestamp: Current Time
    Encrypted with: K_Service
  }
}

Service Server 처리:
  1. Service Ticket을 자신의 키로 복호화
  2. K_Service 추출
  3. Authenticator를 K_Service로 복호화
  4. Client 정보 일치 및 Timestamp 유효성 검증
  5. 인증 성공 → 서비스 제공
```

**6) AP_REP (Application Reply, 선택적 상호 인증)**
```
Service Server → Client:
{
  Server Authenticator: {
    Timestamp: (Authenticator의 Timestamp + 1)
    Encrypted with: K_Service
  }
}

목적:
  - 클라이언트가 서버의 정당성을 확인
  - 중간자 공격 방지
```

**Kerberos 타임라인 다이어그램**:
```
Client               KDC (AS/TGS)           Service Server
  |                        |                        |
  | 1. AS_REQ (User+PW)    |                        |
  |----------------------->|                        |
  |                        |                        |
  | 2. AS_REP (TGT)        |                        |
  |<-----------------------|                        |
  | [TGT 캐시 저장]         |                        |
  |                        |                        |
  | 3. TGS_REQ (TGT+Service)|                       |
  |----------------------->|                        |
  |                        |                        |
  | 4. TGS_REP (Svc Ticket)|                        |
  |<-----------------------|                        |
  | [Service Ticket 캐시]   |                        |
  |                        |                        |
  | 5. AP_REQ (Svc Ticket) |                        |
  |------------------------------------------------>|
  |                        |                        |
  | 6. AP_REP (Optional)   |                        |
  |<------------------------------------------------|
  |                        |                        |
  | 7. Service Access      |                        |
  |<----------------------------------------------->|
```

### 4.3 Kerberos 티켓 내부 구조

**TGT (Ticket Granting Ticket) 상세**:
```
Ticket Version: 5
Realm: EXAMPLE.COM
Server Name: krbtgt/EXAMPLE.COM
Encryption Type: AES256-CTS-HMAC-SHA1-96

Encrypted Part (with krbtgt account key):
  Flags: 
    - FORWARDABLE: 0x40000000
    - PROXIABLE: 0x10000000
    - RENEWABLE: 0x00800000
    - INITIAL: 0x00400000
  Session Key: [32 bytes random AES key]
  Client Realm: EXAMPLE.COM
  Client Name: alice
  Transited: (empty for direct authentication)
  Auth Time: 2026-01-21 10:30:00
  Start Time: 2026-01-21 10:30:00
  End Time: 2026-01-21 20:30:00 (10 hours)
  Renew Till: 2026-01-28 10:30:00 (7 days)
  Authorization Data:
    - PAC (Privilege Attribute Certificate)
```

**PAC (Privilege Attribute Certificate)**:
Microsoft의 Kerberos 확장으로, 사용자 인가 정보를 포함한다.

```
PAC 구조:
  - User SID: S-1-5-21-xxxx-xxxx-xxxx-1001
  - Group SIDs: 
      - Domain Users: S-1-5-21-xxxx-xxxx-xxxx-513
      - Engineering Team: S-1-5-21-xxxx-xxxx-xxxx-1105
      - ...
  - User Account Control Flags
  - Logon Time
  - Logon Server
  - User Principal Name: alice@example.com
  - Server Signature: (KDC가 PAC 서명)
  - Privilege Server Signature: (추가 검증)
```

**PAC의 역할**:
1. Windows 리소스 접근 시 SID 기반 인가
2. 매번 LDAP 쿼리 없이 그룹 멤버십 확인
3. 티켓 위조 방지 (KDC 서명)

> 참고:
> - RFC 4120, "The Kerberos Network Authentication Service (V5)"
> - Microsoft Docs, "[MS-PAC]: Privilege Attribute Certificate Data Structure"

### 4.4 Kerberos vs NTLM

| 측면 | Kerberos | NTLM |
|------|----------|------|
| **프로토콜** | 개방형 표준 (RFC 4120) | Microsoft 독점 |
| **인증 방식** | 티켓 기반 | 챌린지-응답 |
| **상호 인증** | 지원 (AP_REP) | 미지원 |
| **위임** | 제한된 위임 가능 | 불가능 |
| **성능** | 우수 (티켓 재사용) | 낮음 (매번 DC 통신) |
| **보안** | 강력 (AES 암호화) | 약함 (MD4 해시) |
| **사용 사례** | 기본 (AD 환경) | 레거시, 비도메인 시스템 |

**NTLM 사용 시나리오** (피해야 하지만 필요한 경우):
- IP 주소로 접근 (SPN 없음)
- 방화벽이 Kerberos 포트(88) 차단
- Windows 작업 그룹 환경
- 레거시 애플리케이션

<br>

## 5. AD 복제 (Replication)

### 5.1 복제 모델

AD는 **Multi-Master Replication** 모델을 사용한다.

**특징**:
- 모든 DC가 쓰기 가능 (RODC 제외)
- 변경사항은 자동으로 모든 DC에 복제
- 충돌 해결 메커니즘 내장

### 5.2 복제 파티션

AD는 4가지 파티션을 복제한다:

**1) Schema Partition**
```
DN: CN=Schema,CN=Configuration,DC=example,DC=com
범위: Forest 전체
복제: 모든 DC

내용:
  - classSchema (User, Computer 등)
  - attributeSchema (cn, mail 등)
```

**2) Configuration Partition**
```
DN: CN=Configuration,DC=example,DC=com
범위: Forest 전체
복제: 모든 DC

내용:
  - Sites
  - Site Links
  - Subnets
  - Services
  - Partitions
```

**3) Domain Partition**
```
DN: DC=example,DC=com
범위: 단일 Domain
복제: 해당 도메인의 모든 DC

내용:
  - Users
  - Computers
  - Groups
  - OUs
  - GPOs (실제 정책은 SYSVOL)
```

**4) Application Partition**
```
DN: DC=DomainDnsZones,DC=example,DC=com
    DC=ForestDnsZones,DC=example,DC=com
범위: 사용자 정의 가능
복제: 선택적

내용:
  - DNS Zone Data
  - 애플리케이션별 데이터
```

### 5.3 복제 메커니즘

**1) USN (Update Sequence Number)**
각 DC는 모든 변경사항에 고유한 USN을 할당한다.

```
DC01에서 User 생성:
  Local USN: 1234
  Object GUID: {abc-123-def}
  Attribute: cn = "Alice"
  USN-Changed: 1234

DC01 → DC02 복제:
  DC02가 DC01에게 "USN 1200 이후 변경사항 주세요"
  DC01이 USN 1201~1234 변경사항 전송
  DC02가 로컬 데이터베이스에 적용하고 자신의 USN 증가
```

**High-Watermark Vector**:
각 DC는 다른 DC의 최신 USN을 추적한다.

```
DC02의 High-Watermark Table:
  DC01: USN 1234
  DC03: USN 5678
  DC04: USN 9012

→ DC01에게는 1234 이후만 요청
→ DC03에게는 5678 이후만 요청
```

**2) Up-to-Dateness Vector**
객체별로 최신 복제 상태를 추적.

```
User Object: CN=Alice
  Originating DC: DC01
  Originating USN: 1234
  Version: 3

DC02에서 복제 시:
  1. DC01의 USN 1234인 변경사항 받음
  2. 로컬에서 적용 (Local USN 5001 할당)
  3. Up-to-Datedness Vector 업데이트:
       DC01: USN 1234
```

**3) Replication Metadata**
각 속성마다 복제 메타데이터 저장.

```powershell
# PowerShell로 복제 메타데이터 조회
Get-ADReplicationAttributeMetadata -Object "CN=Alice,OU=Users,DC=example,DC=com" -Server DC01

출력:
Object          : CN=Alice,OU=Users,DC=example,DC=com
Attribute       : cn
Version         : 2
LastOriginatingChangeTime : 2026-01-21 10:30:00
LastOriginatingChangeDirectoryServerIdentity : DC01.example.com
LastOriginatingChangeUsn : 1234
```

### 5.4 복제 충돌 해결

**시나리오**: 동일 객체의 동일 속성을 두 DC에서 동시에 수정

```
시간: 10:30:00
DC01: Alice의 telephoneNumber를 "111-1111"로 변경 (Version 2, USN 1234)
DC02: Alice의 telephoneNumber를 "222-2222"로 변경 (Version 2, USN 5001)

복제 시 충돌 발생!
```

**해결 규칙**:

**1) Property Version Number (PVN)**
- 높은 버전 번호가 우선
- 위 예시에서는 둘 다 Version 2 → 동일

**2) Timestamp**
- 더 최근의 변경사항이 우선
- 두 변경이 동일 시간이면?

**3) Originating DSA GUID**
- DC의 GUID를 비교하여 높은 값이 우선
- 완전히 결정론적 (항상 동일한 결과)

**예시 해결**:
```
DC01 GUID: {10000000-0000-0000-0000-000000000001}
DC02 GUID: {20000000-0000-0000-0000-000000000001}

DC02의 GUID가 더 높음 → DC02의 "222-2222"가 최종 값
```

**Conflict Resolution 로그**:
```
Event ID: 1084 (Directory Service Event Log)
  Source: NTDS Replication
  Description: Conflict detected for attribute telephoneNumber
  Resolved: DC02's value "222-2222" selected based on GUID
```

### 5.5 복제 토폴로지

**KCC (Knowledge Consistency Checker)**가 자동으로 복제 토폴로지를 생성한다.

**Intra-Site Replication (Site 내 복제)**:
```
목표: 고속 네트워크 활용, 최소 지연

토폴로지: Ring + Hub-Spoke
  - 모든 DC가 Ring으로 연결
  - 7개 이상일 때 Hub 추가

복제 간격: 15초 (변경 알림 기반)
압축: 없음
```

**Inter-Site Replication (Site 간 복제)**:
```
목표: WAN 대역폭 절약

토폴로지: Site Link 기반
  - Site Link Cost에 따라 경로 선택

복제 간격: 180분 (기본, 조정 가능)
압축: 있음 (85% 압축률)
```

**Bridgehead Server**:
Site 간 복제를 담당하는 DC.

```
Seoul Site:
  DC01 (Bridgehead)
  DC02
  DC03

Busan Site:
  DC04 (Bridgehead)
  DC05

복제 흐름:
  DC01 → DC04 (Site 간)
  DC04 → DC05 (Site 내)
  DC01 → DC02, DC03 (Site 내)
```

**복제 모니터링**:
```powershell
# 복제 상태 확인
repadmin /replsummary

# 특정 객체의 복제 추적
repadmin /showobjmeta "CN=Alice,OU=Users,DC=example,DC=com"

# 복제 오류 확인
repadmin /showrepl * /csv | ConvertFrom-Csv | Where {$_.LastFailureStatus -ne 0}
```

> 참고: Microsoft Docs, "How Active Directory Replication Topology Works"

<br>

## 6. Group Policy (그룹 정책)

### 6.1 GPO 구조

**Group Policy Object (GPO)**는 설정 집합을 담고 있는 객체다.

**GPO 구성**:
```
GPO = GPC (Group Policy Container) + GPT (Group Policy Template)

GPC (AD에 저장):
  CN={GUID},CN=Policies,CN=System,DC=example,DC=com
  - 메타데이터
  - 버전 번호
  - 링크 정보

GPT (SYSVOL에 저장):
  \\domain.com\SYSVOL\domain.com\Policies\{GUID}\
    ├── GPT.INI (버전 정보)
    ├── Machine\ (컴퓨터 설정)
    │     ├── Registry.pol
    │     └── Scripts\
    └── User\ (사용자 설정)
          ├── Registry.pol
          └── Scripts\
```

**버전 번호**:
```
GPO Version = (User Version << 16) | Computer Version

예시:
  User Version: 3
  Computer Version: 5
  GPO Version: 0x00030005 (196613)

GPC Version과 GPT.INI Version이 일치해야 함 (불일치 시 복제 문제)
```

### 6.2 GPO 처리 순서 (LSDOU)

**적용 순서** (나중에 적용된 정책이 우선):
```
1. Local (로컬 그룹 정책)
2. Site (사이트 연결 GPO)
3. Domain (도메인 연결 GPO)
4. OU (상위 → 하위 OU 순서)

예시:
  Local GPO
    ↓ (덮어쓰기)
  Site GPO
    ↓
  Domain GPO
    ↓
  OU=Corporate GPO
    ↓
  OU=Users GPO
    ↓
  OU=Engineering GPO (최종 적용)
```

**예외 설정**:

**1) Block Inheritance**
```
OU=Engineering
  └── Block Inheritance: Enabled

→ 상위 GPO가 적용되지 않음 (Site, Domain GPO 차단)
→ 단, "Enforced" GPO는 여전히 적용됨
```

**2) Enforced (No Override)**
```
Domain GPO
  └── Enforced: Yes

→ 하위 OU의 Block Inheritance를 무시하고 강제 적용
→ 보안 정책에 주로 사용
```

**처리 순서 요약**:
```
1. Enforced GPO (Domain/Site)
2. OU GPO (하위 → 상위, Block Inheritance 고려)
3. Domain GPO (Enforced 아님)
4. Site GPO (Enforced 아님)
5. Local GPO
```

### 6.3 GPO 적용 프로세스

**클라이언트 GPO 처리**:
```
1. 네트워크 초기화
2. DC 위치 결정 (사이트 기반)
3. GPO 목록 가져오기 (LDAP 쿼리)
   LDAP Filter: (&(objectClass=groupPolicyContainer)(gPLink=*))
4. GPO 버전 확인 (로컬 캐시와 비교)
5. 변경된 GPO만 다운로드 (SMB, \\DC\SYSVOL)
6. CSE (Client-Side Extensions) 실행
7. Registry.pol 적용
8. 스크립트 실행
9. 이벤트 로그 기록
```

**CSE (Client-Side Extension)**:
GPO의 특정 영역을 처리하는 클라이언트 측 DLL.

```
주요 CSE:
  - Registry: {35378EAC-683F-11D2-A89A-00C04FBBCFA2}
  - Security: {827D319E-6EAC-11D2-A4EA-00C04F79F83A}
  - Scripts: {42B5FAAE-6536-11D2-AE5A-0000F87571E3}
  - Folder Redirection: {25537BA6-77A8-11D2-9B6C-0000F8080861}
  - Software Installation: {C6DC5466-785A-11D2-84D0-00C04FB169F7}
```

**GPO 갱신**:
```
사용자 로그온: 동기 적용 (Foreground Processing)
백그라운드: 비동기 적용 (Background Processing)
  - Workstation: 90분 + Random(0~30분)
  - Server: 90분 + Random(0~30분)
  - DC: 5분

강제 갱신:
  gpupdate /force
```

### 6.4 Group Policy Preferences vs Policy

| 측면 | Policy (정책) | Preferences (기본 설정) |
|------|--------------|------------------------|
| **강제성** | 강제 적용 (회색 처리) | 초기 설정 (사용자 변경 가능) |
| **제거** | GPO 제거 시 롤백 | GPO 제거 시 유지 |
| **대상** | 관리 템플릿 제공 항목만 | 레지스트리, 파일, 환경 변수 등 |
| **사용 사례** | 보안 정책, 표준화 | 드라이브 매핑, 바로가기 |

**Preferences 예시**:
```xml
<!-- Drive Mapping Preference -->
<DriveMap clsid="{935D1B74-9CB8-4e3c-9914-7DD559B7A417}">
  <Properties action="U" thisDrive="NOCHANGE" 
              allDrives="NOCHANGE" 
              userName="" 
              path="\\server\share" 
              label="Shared Drive" 
              persistent="1" 
              useLetter="1" 
              letter="Z"/>
</DriveMap>
```

### 6.5 보안 필터링 및 WMI 필터

**보안 필터링**:
GPO를 특정 사용자/그룹에만 적용.

```
GPO: "Engineering Software"
Security Filtering:
  - Engineering Team (Group)
  - Alice Smith (User)

→ 해당 그룹/사용자만 GPO 적용
→ "Read" + "Apply Group Policy" 권한 필요
```

**WMI 필터**:
동적 조건 기반 GPO 적용.

```wql
-- Windows 10 이상만 적용
SELECT * FROM Win32_OperatingSystem 
WHERE Version LIKE "10.%" OR Version LIKE "11.%"

-- 메모리 8GB 이상만 적용
SELECT * FROM Win32_ComputerSystem 
WHERE TotalPhysicalMemory >= 8589934592
```

**GPO 적용 조건**:
```
1. 링크 활성화
2. LSDOU 순서 처리
3. 보안 필터링 통과 (Read + Apply GP 권한)
4. WMI 필터 통과 (조건 만족)
5. GPO 적용
```

> 참고: Microsoft Docs, "Group Policy Overview"

<br>

## 7. RODC (Read-Only Domain Controller)

### 7.1 RODC 개념

지사 또는 보안이 약한 환경에 배치되는 읽기 전용 DC.

**특징**:
- 모든 AD 파티션의 읽기 전용 복제본
- 쓰기 작업은 Writable DC로 리디렉션
- 패스워드는 선택적으로만 캐시 (PRP)

### 7.2 Password Replication Policy (PRP)

**기본 정책**:
```
Allowed RODC Password Replication Group: (비어 있음)
Denied RODC Password Replication Group:
  - Domain Admins
  - Enterprise Admins
  - Schema Admins
  - Denied RODC Password Replication Group
  - ... (모든 권한 있는 그룹)

→ 기본적으로 어떤 패스워드도 캐시되지 않음
```

**커스텀 정책**:
```
Allowed List:
  - Branch Office Users (Group)

Denied List:
  - Administrators

인증 시나리오:
1. Alice (Branch Office Users)가 RODC에 로그인
2. RODC가 Writable DC에게 패스워드 검증 요청
3. 검증 성공 후 Alice의 패스워드 해시를 RODC에 캐시
4. 다음 로그인부터는 RODC가 직접 인증 (WAN 트래픽 감소)
5. Bob (Administrators)은 절대 캐시되지 않음
```

### 7.3 RODC 복제

**단방향 복제**:
```
Writable DC → RODC (복제)
RODC → Writable DC (복제 안 됨)

장점:
  - RODC가 손상되어도 다른 DC에 영향 없음
  - 보안 사고 격리
```

**AdminSDHolder 보호**:
RODC는 권한 있는 그룹의 패스워드를 복제하지 않음.

> 참고: Microsoft Docs, "Read-Only Domain Controllers"

<br>

## 8. FSMO Roles (Flexible Single Master Operations)

Multi-Master 환경에서도 특정 작업은 단일 DC만 수행한다.

### 8.1 FSMO 역할

**Forest 수준 (포레스트당 1개)**:

**1) Schema Master**
- 스키마 변경 권한 (classSchema, attributeSchema 추가/수정)
- Exchange, Lync 등 애플리케이션 설치 시 스키마 확장

**2) Domain Naming Master**
- 도메인 추가/제거 권한
- 도메인 이름 중복 방지

**Domain 수준 (도메인당 1개)**:

**3) PDC Emulator**
- **시간 동기화**: 포레스트 시간 소스
- **패스워드 변경**: 최신 패스워드 관리
  - 다른 DC에서 인증 실패 시 PDC Emulator에 재확인
- **그룹 정책**: 기본 GPO 편집 대상
- **계정 잠금**: 계정 잠금 정책 집계

**4) RID Master**
- RID Pool 할당
  - 각 DC는 RID Pool (500개 SID)을 할당받음
  - SID = Domain SID + RID
  - 예: S-1-5-21-1234567890-1234567890-1234567890-**1001**
- Pool 고갈 시 RID Master에게 요청

**5) Infrastructure Master**
- 크로스 도메인 참조 업데이트
- Group 객체의 다른 도메인 멤버 추적
- **주의**: GC와 동일 DC에 배치하면 안 됨 (단, 모든 DC가 GC면 무관)

### 8.2 FSMO 역할 확인 및 이전

**확인**:
```powershell
# Forest FSMO
Get-ADForest | Select-Object SchemaMaster, DomainNamingMaster

# Domain FSMO
Get-ADDomain | Select-Object PDCEmulator, RIDMaster, InfrastructureMaster
```

**정상 이전**:
```powershell
Move-ADDirectoryServerOperationMasterRole -Identity "DC02" -OperationMasterRole PDCEmulator
```

**강제 점유 (Seize, 비상 시)**:
```powershell
Move-ADDirectoryServerOperationMasterRole -Identity "DC03" -OperationMasterRole PDCEmulator -Force

# 주의: 원래 FSMO holder는 네트워크에서 영구 제거해야 함
```

> 참고: Microsoft Docs, "FSMO Roles"

<br>

## 정리

이번 포스트에서는 Active Directory의 논리적/물리적 구조, Kerberos 인증 메커니즘, 복제 프로세스, Group Policy, FSMO 역할 등을 심층 분석했다.

**핵심 요약**:
1. AD는 Multi-Master LDAP 디렉토리 + Kerberos KDC + DNS + GPO의 통합 시스템
2. Kerberos는 티켓 기반 인증으로 보안과 성능을 동시에 제공
3. USN 기반 복제와 충돌 해결로 분산 환경에서 일관성 유지
4. GPO의 LSDOU 순서와 상속 메커니즘으로 세밀한 정책 제어
5. FSMO 역할로 특정 작업의 일관성 보장

다음 포스트 시리즈에서는 **Azure Entra ID (구 Azure AD)**의 아키텍처와 클라우드 디렉토리 서비스를 다룰 예정이다.

<br>

## 참고문헌

1. Microsoft Docs, "Active Directory Domain Services Overview"
2. Microsoft Docs, "How Domain and Forest Trusts Work"
3. RFC 4120, "The Kerberos Network Authentication Service (V5)"
4. Microsoft Docs, "[MS-PAC]: Privilege Attribute Certificate Data Structure"
5. Microsoft Docs, "How Active Directory Replication Topology Works"
6. Microsoft Docs, "Group Policy Overview"
7. Microsoft Docs, "Read-Only Domain Controllers"
8. Microsoft Docs, "FSMO Roles"
9. Brian Desmond et al., "Active Directory: Designing, Deploying, and Running Active Directory", O'Reilly Media, 5th Edition, 2013
10. Microsoft Press, "Windows Server 2022 Inside Out", 2022
