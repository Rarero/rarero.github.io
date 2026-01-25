---
layout: post
title: "디렉토리 서비스(Directory Service) (1): 기본 개념과 프로토콜"
date: 2026-01-19 09:00:00 +0900
tags: [Study, Directory, LDAP, Identity]
categories: Azure_Study
---

접근제어를 구현하려면 사용자, 그룹, 리소스 등의 정보를 체계적으로 저장하고 조회할 수 있는 시스템이 필요합니다. 이러한 역할을 수행하는 것이 **디렉토리 서비스(Directory Service)**입니다.

이번 포스트에서는 디렉토리 서비스의 기본 개념, 역사적 배경, 그리고 핵심 프로토콜들을 정리합니다.

<br>

## 1. 디렉토리 서비스란?

### 1.1 정의

디렉토리 서비스는 네트워크 상의 리소스(사용자, 그룹, 디바이스, 애플리케이션 등)에 대한 정보를 **계층적**이고 **중앙집중화된** 데이터베이스에 저장하고, 이를 효율적으로 검색할 수 있도록 하는 분산 정보 서비스입니다.

**핵심 특징**:

1. **읽기 최적화(Read-Optimized)**
   - 쓰기보다 읽기 작업이 압도적으로 많은 환경에 최적화
   - 사용자 인증은 빈번하지만, 사용자 정보 변경은 상대적으로 드묾

2. **계층적 구조(Hierarchical Structure)**
   - 트리 형태의 논리적 조직 구조
   - 관계형 DB의 평면적 테이블과 대조적

3. **분산 아키텍처(Distributed Architecture)**
   - 복제(Replication)를 통한 고가용성
   - 여러 서버에 데이터 복사본 유지

4. **표준 프로토콜**
   - LDAP, Kerberos 등 개방형 표준 사용
   - 이기종 시스템 간 상호운용성

### 1.2 디렉토리 vs 데이터베이스

| 측면 | 디렉토리 | 관계형 데이터베이스 |
|------|---------|-------------------|
| **구조** | 계층적 트리 (DIT) | 평면적 테이블 |
| **작업 패턴** | 읽기 중심 (Read 90%+) | 읽기/쓰기 균형 |
| **일관성** | 최종 일관성 허용 | 강한 일관성(ACID) |
| **복제** | 멀티 마스터 복제 | 주로 단일 마스터 |
| **쿼리** | 속성 기반 검색 | SQL 복잡 쿼리 |
| **트랜잭션** | 제한적 지원 | 완전한 ACID 트랜잭션 |
| **스키마** | 유연한 스키마 확장 | 고정적 스키마 |

**예시**:
```
관계형 DB (Users 테이블):
ID | Name  | Department | Email
1  | Alice | Engineering| alice@example.com
2  | Bob   | Sales      | bob@example.com

디렉토리 (계층 구조):
dc=example,dc=com
  ├── ou=Engineering
  │     └── uid=alice
  │           ├── cn: Alice Smith
  │           ├── mail: alice@example.com
  │           └── employeeType: Engineer
  └── ou=Sales
        └── uid=bob
              ├── cn: Bob Johnson
              └── mail: bob@example.com
```

> 참고: ITU-T X.500 Series, "Information technology – Open Systems Interconnection – The Directory"

<br>

## 2. 디렉토리 서비스의 역사적 배경

### 2.1 X.500 표준 (1988)

**탄생 배경**
1980년대, 전 세계적으로 분산된 조직의 정보를 통합 관리할 필요성이 대두되었습니다. ITU-T와 ISO는 공동으로 **X.500** 표준을 개발했습니다.

**X.500의 핵심 개념**

1. **DIB (Directory Information Base)**
   - 전체 디렉토리 데이터의 논리적 집합
   - 전 세계적으로 분산된 하나의 거대한 디렉토리 구상

2. **DIT (Directory Information Tree)**
   - 계층적 트리 구조
   - 루트부터 리프까지 계층적으로 조직

3. **DSA (Directory System Agent)**
   - 디렉토리 서버 프로세스
   - DIB의 일부를 저장하고 관리

4. **DUA (Directory User Agent)**
   - 클라이언트 애플리케이션
   - 사용자 대신 DSA와 통신

**X.500 프로토콜 스택**:
```
Application Layer: DAP (Directory Access Protocol)
                   ↓
Presentation Layer: ASN.1 인코딩
                   ↓
Session Layer
                   ↓
Transport Layer: OSI TP4
```

**DAP (Directory Access Protocol)**:
- X.500의 원래 접근 프로토콜
- OSI 7계층 전체 스택 요구
- 복잡하고 무거운 구현

**한계점**:
- OSI 프로토콜 스택의 복잡성
- 높은 오버헤드로 인한 성능 저하
- TCP/IP 기반 인터넷 환경과의 부적합

> 참고: ITU-T Recommendation X.500 (1988), "The Directory: Overview of concepts, models and services"

### 2.2 LDAP의 등장 (1993)

**탄생 배경**
X.500의 복잡성을 해결하고 TCP/IP 네트워크에서 사용할 수 있도록 미시간 대학교의 Tim Howes와 동료들이 **LDAP(Lightweight Directory Access Protocol)**을 개발했습니다.

**"Lightweight"의 의미**:
- OSI 전체 스택 대신 TCP/IP만 사용
- X.500 DAP의 경량화 버전
- 단순화된 인코딩 및 작업 세트

**LDAP 발전 과정**:
```
LDAPv1 (RFC 1487, 1993)
  - X.500 게이트웨이로 시작
  - DAP의 TCP/IP 바인딩

LDAPv2 (RFC 1777, 1995)
  - 독립 프로토콜로 발전
  - 기본 인증 메커니즘 추가

LDAPv3 (RFC 2251, 1997 → RFC 4511, 2006)
  - 확장 메커니즘 (Extensions)
  - SASL 인증 지원
  - TLS/SSL 암호화
  - 국제화(UTF-8) 지원
  - 현재 표준으로 광범위하게 사용
```

> 참고: 
> - RFC 4510, "Lightweight Directory Access Protocol (LDAP): Technical Specification Road Map"
> - Tim Howes, Mark Smith, "LDAP: Programming Directory-Enabled Applications with Lightweight Directory Access Protocol", 1997

<br>

## 3. LDAP 상세 분석

### 3.1 LDAP 데이터 모델

**1) 엔트리 (Entry)**
디렉토리의 기본 단위. 각 엔트리는 고유한 **DN(Distinguished Name)**으로 식별됩니다.

```
DN: uid=alice,ou=Engineering,dc=example,dc=com

Entry 구성:
  - DN (Distinguished Name): 고유 식별자
  - Attributes: 속성-값 쌍의 집합
```

**2) 속성 (Attribute)**
엔트리를 구성하는 정보 요소. 각 속성은 **속성 타입(Attribute Type)**과 하나 이상의 **값(Value)**을 가집니다.

```
objectClass: inetOrgPerson       # 속성 타입: objectClass, 값: inetOrgPerson
cn: Alice Smith                   # Common Name
cn: Alice S.                      # 다중값 가능
mail: alice@example.com
telephoneNumber: +82-10-1234-5678
```

**3) 객체 클래스 (Object Class)**
엔트리가 가져야 할 속성을 정의하는 템플릿(스키마).

**객체 클래스 타입**:
- **STRUCTURAL**: 엔트리의 기본 구조 정의 (하나만 가능)
- **AUXILIARY**: 추가 속성 제공 (여러 개 가능)
- **ABSTRACT**: 다른 클래스의 부모 클래스

**스키마 정의 예시**:
```ldif
objectClass: top                 # ABSTRACT (모든 클래스의 최상위)
objectClass: person              # STRUCTURAL
objectClass: organizationalPerson # STRUCTURAL (person 상속)
objectClass: inetOrgPerson       # STRUCTURAL (organizationalPerson 상속)
objectClass: posixAccount        # AUXILIARY (Unix 계정 속성 추가)
```

**inetOrgPerson 스키마**:
```
objectClass: inetOrgPerson
  MUST (필수 속성):
    - cn (commonName)
    - sn (surname)
    - objectClass
  MAY (선택 속성):
    - mail
    - telephoneNumber
    - uid
    - ... (수십 개의 선택 속성)
```

**4) DN (Distinguished Name)**
엔트리의 완전한 경로. 파일 시스템의 절대 경로와 유사합니다.

```
DN 구조:
uid=alice,ou=Engineering,dc=example,dc=com
 ↑        ↑               ↑
RDN    Container       Domain Components

구성 요소:
- RDN (Relative DN): uid=alice (엔트리 자체의 이름)
- Parent DN: ou=Engineering,dc=example,dc=com
```

**일반적인 DN 구성 요소**:
- `dc` (Domain Component): 도메인 이름 (예: dc=example,dc=com)
- `ou` (Organizational Unit): 조직 단위 (예: ou=Engineering)
- `cn` (Common Name): 일반 이름 (예: cn=Alice Smith)
- `uid` (User ID): 사용자 ID (예: uid=alice)

### 3.2 LDAP 디렉토리 트리 구조 (DIT)

**계층 예시**:
```
                    dc=example,dc=com (Root)
                            |
        ┌───────────────────┼───────────────────┐
        |                   |                   |
    ou=People          ou=Groups          ou=Services
        |                   |                   |
  ┌─────┴─────┐       ┌─────┴─────┐       ┌─────┴─────┐
  |           |       |           |       |           |
uid=alice  uid=bob  cn=Admins  cn=Users cn=LDAP   cn=Kerberos
```

**실제 LDIF (LDAP Data Interchange Format) 예시**:
```ldif
# Root Entry
dn: dc=example,dc=com
objectClass: top
objectClass: dcObject
objectClass: organization
dc: example
o: Example Corporation

# Organizational Unit
dn: ou=People,dc=example,dc=com
objectClass: top
objectClass: organizationalUnit
ou: People

# User Entry
dn: uid=alice,ou=People,dc=example,dc=com
objectClass: top
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
uid: alice
cn: Alice Smith
sn: Smith
mail: alice@example.com
userPassword: {SSHA}encrypted_password_hash
employeeNumber: 12345
```

> 참고: RFC 2849, "The LDAP Data Interchange Format (LDIF)"

### 3.3 LDAP 작업 (Operations)

LDAP는 9개의 핵심 작업을 정의합니다.

**1) Bind (인증)**
```
클라이언트가 서버에 인증

Simple Bind:
  - DN + 패스워드
  - 평문 전송 위험 (TLS 필수)

SASL Bind:
  - 다양한 인증 메커니즘 (GSSAPI/Kerberos, DIGEST-MD5 등)
  - 더 안전한 인증

Anonymous Bind:
  - 인증 없이 접속 (읽기 전용 공개 정보 조회)
```

**예시**:
```python
import ldap

conn = ldap.initialize('ldap://ldap.example.com')
conn.simple_bind_s('uid=admin,dc=example,dc=com', 'password')
```

**2) Search (검색)**
가장 자주 사용되는 작업. 필터를 사용하여 엔트리를 검색한다.

**검색 파라미터**:
- **Base DN**: 검색 시작점
- **Scope**: 검색 범위
  - `BASE`: Base DN만 검색
  - `ONE` (One Level): 직접 자식만
  - `SUB` (Subtree): 모든 하위 트리
- **Filter**: 검색 조건
- **Attributes**: 반환할 속성 목록

**필터 문법**:
```
AND: (&(condition1)(condition2))
OR:  (|(condition1)(condition2))
NOT: (!(condition))

예시:
(uid=alice)                           # uid가 alice인 엔트리
(&(objectClass=person)(cn=*Smith*))   # person 클래스이고 cn에 Smith 포함
(|(department=Sales)(department=Marketing))  # Sales 또는 Marketing 부서
```

**검색 예시**:
```python
# 모든 inetOrgPerson 검색
result = conn.search_s(
    'dc=example,dc=com',              # Base DN
    ldap.SCOPE_SUBTREE,                # Scope
    '(objectClass=inetOrgPerson)',     # Filter
    ['cn', 'mail', 'telephoneNumber']  # Attributes
)

# 결과:
# [
#   ('uid=alice,ou=People,dc=example,dc=com', 
#    {'cn': [b'Alice Smith'], 'mail': [b'alice@example.com']}),
#   ...
# ]
```

**3) Add (추가)**
새로운 엔트리 생성.

```python
add_record = [
    ('objectClass', [b'inetOrgPerson']),
    ('uid', [b'charlie']),
    ('cn', [b'Charlie Brown']),
    ('sn', [b'Brown']),
    ('mail', [b'charlie@example.com'])
]
conn.add_s('uid=charlie,ou=People,dc=example,dc=com', add_record)
```

**4) Modify (수정)**
기존 엔트리의 속성 변경.

```python
# mail 속성 변경
mod_attrs = [(ldap.MOD_REPLACE, 'mail', [b'alice.smith@example.com'])]
conn.modify_s('uid=alice,ou=People,dc=example,dc=com', mod_attrs)

# 작업 타입:
# MOD_ADD: 속성 값 추가
# MOD_DELETE: 속성 값 삭제
# MOD_REPLACE: 속성 값 교체
```

**5) Delete (삭제)**
엔트리 제거.

```python
conn.delete_s('uid=charlie,ou=People,dc=example,dc=com')
```

**6) Modify DN (이름 변경/이동)**
엔트리의 DN 변경 또는 다른 위치로 이동.

```python
# alice를 다른 OU로 이동
conn.rename_s(
    'uid=alice,ou=People,dc=example,dc=com',
    'uid=alice',
    'ou=Admins,dc=example,dc=com'
)
```

**7) Compare (비교)**
특정 속성 값이 일치하는지 확인 (인증 용도).

```python
result = conn.compare_s(
    'uid=alice,ou=People,dc=example,dc=com',
    'userPassword',
    'test_password'
)
# True 또는 False 반환
```

**8) Unbind (연결 종료)**
```python
conn.unbind_s()
```

**9) Abandon (작업 취소)**
진행 중인 작업을 취소.

> 참고: RFC 4511, "Lightweight Directory Access Protocol (LDAP): The Protocol"

### 3.4 LDAP 확장 메커니즘

LDAPv3는 확장성을 위해 두 가지 메커니즘을 제공한다.

**1) Extended Operations**
표준 9개 작업 외에 추가 기능 정의.

**예시 - StartTLS**:
```python
# TLS 암호화 시작
conn = ldap.initialize('ldap://ldap.example.com')
conn.start_tls_s()
conn.simple_bind_s(...)
```

**예시 - Password Modify (RFC 3modification)**:
```
Extended Operation: 1.3.6.1.4.1.4203.1.11.1
  - 사용자 패스워드 변경
```

**2) Controls**
요청 또는 응답에 추가 정보를 첨부하여 작업 동작 변경.

**Server-Side Sort Control (RFC 2891)**:
```python
# 검색 결과를 cn으로 정렬
sort_ctrl = ldap.controls.SimplePagedResultsControl(
    criticality=True,
    size=10,
    cookie=''
)
result = conn.search_ext_s(..., serverctrls=[sort_ctrl])
```

**Paged Results Control (RFC 2696)**:
대량의 검색 결과를 페이지 단위로 분할.

```python
page_size = 100
cookie = ''

while True:
    paged_ctrl = SimplePagedResultsControl(True, page_size, cookie)
    result = conn.search_ext_s(..., serverctrls=[paged_ctrl])
    
    # 결과 처리
    for dn, attrs in result:
        process(dn, attrs)
    
    # 다음 페이지 쿠키 추출
    pctrls = [c for c in result.controls if c.controlType == CONTROL_PAGEDRESULTS]
    if not pctrls[0].cookie:
        break  # 마지막 페이지
    cookie = pctrls[0].cookie
```

> 참고: RFC 3377, "Lightweight Directory Access Protocol (v3): Technical Specification"

<br>

## 4. LDAP 보안

### 4.1 인증 메커니즘

**1) Simple Bind**
- DN + 패스워드
- **위험**: 평문 전송 (중간자 공격 취약)
- **완화**: TLS/SSL 암호화 필수

**2) SASL (Simple Authentication and Security Layer)**
RFC 4422에 정의된 프레임워크.

**지원 메커니즘**:
- **EXTERNAL**: TLS 클라이언트 인증서 사용
- **GSSAPI**: Kerberos 인증
  ```
  Client → KDC: TGT 요청
  KDC → Client: TGT 발급
  Client → LDAP: Service Ticket 제시
  LDAP → Client: 인증 성공
  ```
- **DIGEST-MD5**: 챌린지-응답 방식 (deprecated, SCRAM 권장)
- **SCRAM**: 현대적인 챌린지-응답 메커니즘

**3) Anonymous Bind**
- 인증 없이 접속
- 공개 정보 조회 용도
- **보안 정책**으로 제한 필요

### 4.2 암호화

**1) LDAPS (LDAP over SSL/TLS)**
- 포트: 636 (LDAP는 389)
- 연결 시작부터 TLS로 암호화
- 레거시 방식 (현재는 StartTLS 권장)

**2) StartTLS**
- 포트: 389 (일반 LDAP와 동일)
- 평문으로 연결 후 TLS로 업그레이드
- Extended Operation 사용
- **권장 방식**

**TLS 설정 예시**:
```python
import ldap

ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_DEMAND)
ldap.set_option(ldap.OPT_X_TLS_CACERTFILE, '/path/to/ca-cert.pem')

conn = ldap.initialize('ldap://ldap.example.com')
conn.start_tls_s()
```

### 4.3 접근제어 (ACI - Access Control Information)

LDAP 서버는 엔트리별로 세밀한 접근제어를 설정할 수 있다.

**OpenLDAP ACI 예시**:
```ldif
# 사용자는 자신의 엔트리만 읽고 수정 가능
access to dn.children="ou=People,dc=example,dc=com"
    by self write
    by anonymous auth
    by * none

# 관리자 그룹은 모든 작업 가능
access to *
    by group.exact="cn=Admins,ou=Groups,dc=example,dc=com" write
    by * read
```

**Microsoft AD ACI**:
- SDDL (Security Descriptor Definition Language) 사용
- ACL과 유사한 구조
- GUI(Active Directory Users and Computers)로 관리

> 참고:
> - RFC 4422, "Simple Authentication and Security Layer (SASL)"
> - RFC 4513, "Lightweight Directory Access Protocol (LDAP): Authentication Methods and Security Mechanisms"

<br>

## 5. LDAP 스키마

스키마는 디렉토리에 저장할 수 있는 데이터의 구조와 규칙을 정의한다.

### 5.1 스키마 구성요소

**1) 속성 타입 (Attribute Type)**
```ldif
attributetype ( 2.5.4.3 
    NAME 'cn' 
    DESC 'common name'
    SUP name
    EQUALITY caseIgnoreMatch
    SUBSTR caseIgnoreSubstringsMatch
    SYNTAX 1.3.6.1.4.1.1466.115.121.1.15 )

구성:
- OID: 2.5.4.3 (고유 식별자)
- NAME: cn (속성 이름)
- DESC: 설명
- SUP: 부모 속성 (상속)
- EQUALITY: 동등 비교 규칙
- SUBSTR: 부분 문자열 매칭 규칙
- SYNTAX: 데이터 타입 (1.3.6.1.4.1.1466.115.121.1.15 = Directory String)
```

**2) 객체 클래스 (Object Class)**
```ldif
objectclass ( 2.5.6.6 
    NAME 'person' 
    DESC 'RFC2256: a person'
    SUP top
    STRUCTURAL
    MUST ( sn $ cn )
    MAY ( userPassword $ telephoneNumber $ seeAlso $ description ) )

구성:
- STRUCTURAL: 구조적 클래스
- SUP: 부모 클래스 (top)
- MUST: 필수 속성
- MAY: 선택 속성
```

**3) 매칭 규칙 (Matching Rule)**
속성 값을 비교하는 방법 정의.

```
caseIgnoreMatch: 대소문자 구분 없음
caseExactMatch: 대소문자 구분
integerMatch: 정수 비교
generalizedTimeMatch: 시간 비교
```

**4) 문법 (Syntax)**
속성 값의 데이터 타입.

```
Directory String (UTF-8): 1.3.6.1.4.1.1466.115.121.1.15
Integer: 1.3.6.1.4.1.1466.115.121.1.27
Boolean: 1.3.6.1.4.1.1466.115.121.1.7
Binary: 1.3.6.1.4.1.1466.115.121.1.5
DN: 1.3.6.1.4.1.1466.115.121.1.12
```

### 5.2 스키마 확장

**커스텀 속성 추가 예시**:
```ldif
# 사번(employeeID) 속성 정의
dn: cn=schema
changetype: modify
add: attributetypes
attributetypes: ( 1.3.6.1.4.1.99999.1.1.1 
  NAME 'employeeID' 
  DESC 'Employee ID Number'
  EQUALITY caseIgnoreMatch
  SYNTAX 1.3.6.1.4.1.1466.115.121.1.15
  SINGLE-VALUE )

# 커스텀 객체 클래스 정의
add: objectclasses
objectclasses: ( 1.3.6.1.4.1.99999.1.2.1 
  NAME 'customEmployee' 
  DESC 'Custom Employee Object'
  SUP inetOrgPerson
  AUXILIARY
  MAY ( employeeID $ department $ manager ) )
```

**OID 할당**:
- IANA에서 Private Enterprise Number (PEN) 할당
- 기업별 고유 OID 네임스페이스
- 예: `1.3.6.1.4.1.{PEN}.{custom}`

> 참고: RFC 4512, "Lightweight Directory Access Protocol (LDAP): Directory Information Models"

<br>

## 6. LDAP 복제 (Replication)

대규모 환경에서는 고가용성과 성능을 위해 여러 LDAP 서버에 데이터를 복제한다.

### 6.1 복제 모델

**1) Single-Master Replication (주-보조 복제)**
```
Master (R/W)
  ↓ 복제
Replica 1 (R/O)
  ↓ 복제
Replica 2 (R/O)
```

- **Master**: 쓰기 작업 처리
- **Replica**: 읽기 작업만 처리
- **장점**: 일관성 유지 용이
- **단점**: Master가 SPOF (Single Point of Failure)

**2) Multi-Master Replication (다중 마스터 복제)**
```
Master 1 (R/W) ←→ Master 2 (R/W)
      ↑              ↑
      └──────────────┘
        양방향 복제
```

- 모든 서버가 쓰기 가능
- **장점**: 고가용성, 지리적 분산
- **단점**: 충돌 해결 메커니즘 필요

**충돌 시나리오**:
```
시간: T1
Master 1: uid=alice의 mail을 alice1@example.com으로 변경
Master 2: uid=alice의 mail을 alice2@example.com으로 변경

충돌 해결:
- Timestamp 기반: 최신 변경 사항 우선
- CSN (Change Sequence Number): 고유 시퀀스로 판단
- 관리자 수동 해결
```

### 6.2 동기화 프로토콜

**1) syncrepl (RFC 4533)**
OpenLDAP의 표준 복제 메커니즘.

```ldif
# Replica 설정
syncrepl rid=001
    provider=ldap://master.example.com
    type=refreshAndPersist
    retry="60 10 300 +"
    searchbase="dc=example,dc=com"
    bindmethod=simple
    binddn="cn=replicator,dc=example,dc=com"
    credentials=password
```

**동작 모드**:
- **refreshOnly**: 주기적으로 폴링
- **refreshAndPersist**: 실시간 변경 사항 푸시

**2) Microsoft AD Replication**
- **KCC (Knowledge Consistency Checker)**: 자동 복제 토폴로지 생성
- **USN (Update Sequence Number)**: 변경 추적
- **Multi-master 복제**: 모든 DC가 쓰기 가능

> 참고: RFC 4533, "The Lightweight Directory Access Protocol (LDAP) Content Synchronization Operation"

<br>

## 7. LDAP 성능 최적화

### 7.1 인덱싱

**인덱스 타입**:
```ldif
# OpenLDAP 인덱스 설정
olcDbIndex: objectClass eq
olcDbIndex: cn,sn,mail eq,pres,sub
olcDbIndex: uid eq
olcDbIndex: memberOf eq

인덱스 타입:
- eq: Equality (정확한 매칭)
- pres: Presence (속성 존재 여부)
- sub: Substring (부분 문자열)
- approx: Approximate (유사 검색)
```

**인덱스 필요성 판단**:
- 자주 검색되는 속성
- 대규모 엔트리 집합에서 사용
- 필터 조건으로 자주 사용

**주의사항**:
- 과도한 인덱스는 쓰기 성능 저하
- 인덱스 크기로 인한 메모리 사용 증가

### 7.2 캐싱

**Entry Cache**:
```
# OpenLDAP 캐시 설정
olcDbCacheSize: 10000       # 최대 엔트리 수
olcDbIDLcacheSize: 30000    # Index Data Lookup 캐시
```

**Connection Pooling**:
클라이언트는 연결 풀을 사용하여 반복적인 연결 생성 오버헤드 감소.

### 7.3 검색 최적화

**1) 적절한 Scope 사용**
```
BASE < ONE < SUB
(빠름)        (느림)

필요한 최소 범위만 검색
```

**2) 필터 최적화**
```
❌ 비효율: (|(cn=*)(mail=*))  # 모든 엔트리 스캔

✅ 효율: (&(objectClass=person)(cn=Alice*))  # 인덱스 활용
```

**3) 속성 선택**
```python
# 모든 속성 반환 (느림)
result = conn.search_s(..., attrs=None)

# 필요한 속성만 반환 (빠름)
result = conn.search_s(..., attrs=['cn', 'mail'])
```

<br>

## 8. LDAP의 현대적 활용

### 8.1 주요 사용 사례

1. **중앙 인증 (Central Authentication)**
   - Linux/Unix 시스템의 PAM/NSS 통합
   - 애플리케이션 SSO (Single Sign-On)

2. **주소록/연락처 관리**
   - 기업 전화번호부
   - 이메일 클라이언트 주소록

3. **설정 관리**
   - 네트워크 장비 설정 저장
   - 애플리케이션 구성 중앙 관리

4. **DNS 레코드 저장**
   - BIND DNS의 백엔드로 LDAP 사용

### 8.2 주요 LDAP 서버 구현체

**1) OpenLDAP**
- 오픈소스 표준 구현
- Linux/Unix 환경에서 가장 많이 사용
- 고성능, 확장 가능

**2) Microsoft Active Directory**
- LDAP 호환 (일부 확장 포함)
- Windows 환경의 사실상 표준
- Kerberos, DNS, Group Policy 통합

**3) 389 Directory Server (Red Hat)**
- Red Hat/CentOS의 기본 디렉토리
- Multi-master 복제 지원

**4) Apache Directory Server**
- Java 기반 LDAP 서버
- 크로스 플랫폼

**5) Azure AD / Entra ID**
- 클라우드 기반 디렉토리
- LDAP 직접 지원 안 함 (Azure AD Domain Services에서 제공)
- REST API (Microsoft Graph) 기반

<br>

다음 포스트에서는 Microsoft **Active Directory**의 내부 구조, Kerberos 인증, Group Policy, 복제 메커니즘 등을 심층적으로 분석할 예정입니다.

<br>

<!--
## 참고문헌

1. [ITU-T Recommendation X.500 (1988), "The Directory: Overview of concepts, models and services"](https://www.itu.int/rec/T-REC-X.500)
2. [RFC 4510, "Lightweight Directory Access Protocol (LDAP): Technical Specification Road Map"](https://www.rfc-editor.org/rfc/rfc4510)
3. [RFC 4511, "Lightweight Directory Access Protocol (LDAP): The Protocol"](https://www.rfc-editor.org/rfc/rfc4511)
4. [RFC 4512, "Lightweight Directory Access Protocol (LDAP): Directory Information Models"](https://www.rfc-editor.org/rfc/rfc4512)
5. [RFC 4513, "Lightweight Directory Access Protocol (LDAP): Authentication Methods and Security Mechanisms"](https://www.rfc-editor.org/rfc/rfc4513)
6. [RFC 4422, "Simple Authentication and Security Layer (SASL)"](https://www.rfc-editor.org/rfc/rfc4422)
7. [RFC 2849, "The LDAP Data Interchange Format (LDIF)"](https://www.rfc-editor.org/rfc/rfc2849)
8. [RFC 3377, "Lightweight Directory Access Protocol (v3): Technical Specification"](https://www.rfc-editor.org/rfc/rfc3377)
9. [RFC 4533, "The Lightweight Directory Access Protocol (LDAP) Content Synchronization Operation"](https://www.rfc-editor.org/rfc/rfc4533)
10. Tim Howes, Mark Smith, "LDAP: Programming Directory-Enabled Applications with Lightweight Directory Access Protocol", Macmillan Technical Publishing, 1997
11. Gerald Carter, "LDAP System Administration", O'Reilly Media, 2003
-->
-->
