---
layout: post
title: "접근제어(Access Control) (1): 기본 개념과 주요 모델"
date: 2026-01-15 09:00:00 +0900
tags: [Study, Security, Access Control, Governance]
categories: Azure_Study
---

클라우드 환경에서 보안의 핵심은 "누가 무엇에 접근할 수 있는가"를 정의하고 통제하는 것입니다.

이번 포스트에서는 접근제어(Access Control)의 기본 개념과 주요 모델들을 정리하겠습니다.

<br>

## 1. 접근제어(Access Control)란?

접근제어는 시스템 리소스에 대한 접근을 허가하거나 거부하는 보안 메커니즘입니다. 단순히 "로그인"만을 의미하는 것이 아니라, 인증된 주체(Subject)가 객체(Object)에 대해 수행할 수 있는 작업(Operation)을 규제하는 전체 프로세스를 포괄합니다.

### 1.1 접근제어의 3요소

접근제어는 다음 세 가지 핵심 요소로 구성됩니다:

**1) Subject (주체)**
- 리소스에 접근을 요청하는 능동적 개체
- 사용자(User), 프로세스(Process), 서비스 계정(Service Account) 등
- 예: 개발자 계정, 애플리케이션 프로세스, VM 인스턴스

**2) Object (객체)**
- 접근이 통제되는 대상 리소스
- 파일, 데이터베이스, API 엔드포인트, 네트워크 리소스 등
- 예: Storage Account, SQL Database, Virtual Network

**3) Permission (접근 권한)**
- 주체가 객체에 대해 수행할 수 있는 작업의 유형
- Read, Write, Execute, Delete 등
- 예: Blob 읽기, VM 시작/중지, 키 자격 증명 모음 읽기

<br>

## 2. 주요 접근제어 모델

접근제어를 구현하는 방식은 여러 모델로 분류되며, 각 모델은 서로 다른 보안 요구사항과 조직 구조에 적합합니다.

이번 포스트에서는 가장 대표적인 4가지 모델인 **DAC(임의 접근제어)**, **MAC(강제 접근제어)**, **RBAC(역할 기반 접근제어)**, 그리고 **ABAC(속성 기반 접근제어)** 에 대해 자세히 알아보겠습니다.

### 2.1 DAC (Discretionary Access Control, 임의 접근제어)

**개념**

리소스의 소유자(Owner)가 다른 주체에게 접근 권한을 임의로 부여할 수 있는 모델입니다. "임의(Discretionary)"라는 표현은 소유자의 재량으로 권한을 결정한다는 의미입니다.

**동작 방식**
1. 리소스 소유자가 ACL(Access Control List)을 생성 또는 수정
2. ACL에 사용자별로 허용할 작업을 명시
3. 시스템은 ACL을 참조하여 접근을 허가/거부

![dac flow](/images/26-01-15-access-control(1)-dac.png)


**특징**
- **유연성**: 소유자가 자유롭게 권한 변경 가능
- **분산 관리**: 각 리소스 소유자가 독립적으로 권한 관리
- **취약점**: 사용자가 권한을 부적절하게 공유할 가능성 존재

**적용 사례**
- UNIX/Linux 파일 시스템 권한 (rwx)
- Windows NTFS 파일 시스템
- Azure Blob Storage의 ACL

**예시**
```bash
# Linux에서 파일 소유자가 권한 설정
chmod 755 myfile.txt  # owner: rwx, group: r-x, others: r-x
chown user:group myfile.txt
```

**보안 고려사항**

DAC는 사용자의 실수나 악의적 행동에 취약합니다. 사용자가 민감한 파일에 대해 "모두에게 읽기 권한"을 부여하는 실수가 발생할 수 있습니다.

<!--
> 참고: NIST SP 800-192, "Verification and Test Methods for Access Control Policies/Models"
-->

<br>

### 2.2 MAC (Mandatory Access Control, 강제 접근제어)

**개념**

시스템 관리자 또는 보안 관리자가 중앙에서 정의한 보안 정책에 따라 시스템이 **강제적으로** 접근을 제어하는 모델입니다. 개별 사용자나 소유자가 권한을 변경할 수 없습니다.

**동작 방식**
1. 모든 주체와 객체에 보안 레이블(Security Label) 할당
2. 보안 정책(Security Policy)이 레이블 간 접근 규칙 정의
3. 시스템이 정책을 강제 적용하여 접근 통제

![mac flow](/images/26-01-15-access-control(1)-mac.png)

**보안 레이블 체계**

MAC는 주체와 객체에 부여된 보안 등급(Label)을 비교하여 접근을 통제합니다. 일반적으로 다음과 같이 보안 수준을 계층적으로 분류(Classification)하여 관리합니다:
- **벨-라파듈라(Bell-LaPadula) 모델**: 정보가 낮은 보안 레벨로 유출되는 것을 방지하여 **기밀성**을 보장하는 모델입니다. 주로 군사 조직에서 기밀 자료를 다룰 때 사용됩니다.
  - No Read Up: 낮은 등급의 주체는 높은 등급의 객체를 읽을 수 없습니다 (읽기 금지)
  - No Write Down: 높은 등급의 주체는 낮은 등급의 객체에 쓸 수 없습니다 (쓰기 금지)
- **비바 무결성(Biba Integrity) 모델**: 데이터의 부적절한 변조를 방지하여 정보의 **무결성**을 보장하는 모델입니다. 신뢰할 수 없는 데이터가 중요한 시스템을 오염시키는 것을 막습니다.
  - No Read Down: 높은 등급의 주체는 낮은 등급의 객체를 읽을 수 없습니다 (오염 방지)
  - No Write Up: 낮은 등급의 주체는 높은 등급의 객체에 쓸 수 없습니다 (변조 방지)

**레이블 예시**
```
주체(Subject) 레이블:
- User A: Top Secret
- User B: Secret
- User C: Confidential

객체(Object) 레이블:
- File X: Top Secret
- File Y: Secret
- File Z: Unclassified

규칙 적용:
- User A는 File X, Y, Z 모두 읽기 가능
- User B는 File Y, Z만 읽기 가능
- User C는 File Z만 읽기 가능
```

**특징**
- **강력한 보안**: 중앙 정책으로 일관된 보안 유지
- **감사 추적**: 모든 접근이 정책 기반으로 기록됨
- **복잡성**: 레이블 관리와 정책 설정이 복잡함

**적용 사례**
- SELinux (Security-Enhanced Linux)
- 군사 및 정부 시스템
- 고도의 기밀 정보를 다루는 환경

<!--
> 참고: 
> - D. Elliott Bell and Leonard J. LaPadula, "Secure Computer Systems: Mathematical Foundations", MITRE Corporation, 1973
> - K. J. Biba, "Integrity Considerations for Secure Computer Systems", MITRE Corporation, 1977
-->

<br>

### 2.3 RBAC (Role-Based Access Control, 역할 기반 접근제어)

**개념**

사용자에게 직접 권한을 부여하는 대신, **역할(Role)**이라는 중간 계층을 도입하여 접근을 제어하는 모델입니다. 사용자는 역할을 할당받고, 역할은 권한을 보유합니다.

**핵심 구성요소**
1. **User (사용자)**: 시스템 사용자
2. **Role (역할)**: 조직 내 직무나 책임을 표현하는 논리적 그룹
3. **Permission (권한)**: 특정 객체에 대한 작업 허가
4. **Session (세션)**: 사용자가 역할을 활성화하는 컨텍스트

![rbac flow](/images/26-01-15-access-control(1)-rbac.png)

**RBAC 표준 모델 (NIST RBAC)**

NIST(National Institute of Standards and Technology, 미국 국립표준기술연구소)는 RBAC를 4단계 모델로 정의했습니다:

**1) Flat RBAC (기본 RBAC)**: 가장 단순한 형태의 RBAC로, 역할 간의 관계 없이 수평적으로 권한을 관리하는 모델입니다.
- User-Role 할당
- Role-Permission 할당
- 역할 계층 없음

**2) Hierarchical RBAC (계층적 RBAC)**: 조직의 상하 구조를 반영하여 역할 간에 상속 관계를 정의하는 모델입니다.
- 역할 간 상속 관계 지원
- 상위 역할은 하위 역할의 모든 권한 자동 상속
```
Senior Manager (모든 권한)
    ↓ 상속
Manager (조회 + 수정)
    ↓ 상속
Viewer (조회만)
```

**3) Constrained RBAC (제약 조건 RBAC)**: 권한 남용을 방지하기 위해 역할 할당 및 수행에 제약 조건(SoD)을 적용한 모델입니다.
- **SoD (Separation of Duties)**: 직무 분리 원칙 적용
- **Static SoD**: 한 사용자가 충돌하는 두 역할을 동시에 가질 수 없습니다
  - 예: "지출 승인자"와 "지출 요청자" 역할을 동일인이 보유 금지
- **Dynamic SoD**: 한 세션에서 충돌하는 역할을 동시 활성화 불가

**4) Symmetric RBAC (대칭적 RBAC)**: 권한과 역할에 대한 관리 작업(할당, 생성 등) 자체를 RBAC로 통제하는 모델입니다.
- **핵심**: "역할을 부여하는 행위"도 하나의 권한으로 취급하여 관리합니다.
- **예시**: '인사팀장' 역할만이 신규 입사자에게 '사원' 역할을 할당할 수 있고, 일반 '관리자'는 할 수 없도록 제한하는 것.

```
Azure
```

**동작 예시**
```
조직 구조:
- Alice: Developer 역할
- Bob: DevOps 역할
- Charlie: Admin 역할

역할별 권한:
Developer:
  - Read: Source Code Repository
  - Write: Development Environment
  
DevOps:
  - Read: Infrastructure Logs
  - Write: CI/CD Pipeline
  - Execute: Deployment Scripts

Admin:
  - All Permissions (모든 리소스)

접근 시나리오:
1. Alice가 Production DB 수정 시도 → 거부 (Developer 역할에 권한 없음)
2. Bob이 CI/CD Pipeline 수정 → 허용 (DevOps 역할에 Write 권한 있음)
3. Charlie가 모든 리소스 접근 → 허용 (Admin 역할)
```

**장점**
- **관리 효율성**: 사용자별 개별 권한 관리 불필요, 역할만 관리
- **확장성**: 신규 사용자는 기존 역할을 할당받기만 하면 됨
- **보안 정책 일관성**: 역할 기반으로 정책 표준화
- **감사 용이성**: 역할별로 권한 추적 가능

**단점**
- **역할 폭발(Role Explosion)**: 세밀한 권한 제어 시 역할 수가 급증합니다
- **역할 설계 복잡도**: 조직 구조와 직무를 정확히 모델링해야 합니다

**적용 사례**

- Azure RBAC (Azure의 기본 접근제어 모델)
- AWS IAM Roles
- Kubernetes RBAC
- 대부분의 엔터프라이즈 애플리케이션

<!--
> 참고: 
> - NIST RBAC model: ANSI INCITS 359-2004, "Role Based Access Control"
> - David F. Ferraiolo, D. Richard Kuhn, "Role-Based Access Controls", 15th National Computer Security Conference, 1992
-->

<br>

### 2.4 ABAC (Attribute-Based Access Control, 속성 기반 접근제어)

**개념**

주체, 객체, 환경의 **속성(Attribute)**들을 평가하여 동적으로 접근을 결정하는 모델입니다. 여기서 **속성**이란 사용자의 '부서', '직급' 또는 리소스의 '보안 등급', '생성 날짜'와 같이 대상을 설명하는 구체적인 특성(Key-Value)을 의미합니다. 이러한 속성들의 조합을 통해 RBAC보다 훨씬 더 세밀하고 유연한 제어가 가능합니다.

**핵심 구성요소**

1. **Subject Attributes (주체 속성)**
   - 사용자 부서, 직급, 근무지, 보안 인증 등급
   - 예: `department=Engineering`, `clearance_level=3`

2. **Object Attributes (객체 속성)**
   - 리소스 분류, 민감도, 소유자, 생성 일자
   - 예: `classification=Confidential`, `data_owner=Finance`

3. **Environment Attributes (환경 속성)**
   - 접근 시간, 위치(IP/지역), 디바이스 유형, 위험 점수
   - 예: `time=business_hours`, `location=corporate_network`

4. **Policy (정책)**
   - 속성 조합을 평가하는 규칙
   - 논리 연산자(AND, OR, NOT) 사용

**동작 방식**

ABAC는 **정책 엔진(Policy Engine)**이 속성을 평가하여 접근을 결정합니다:

![abac flow](/images/26-01-15-access-control(1)-abac.png)

```
IF (Subject.department == "Finance" 
    AND Object.classification == "Financial_Report" 
    AND Environment.time IN business_hours 
    AND Environment.location == "corporate_network")
THEN PERMIT
ELSE DENY
```

**XACML 표준**

XACML(eXtensible Access Control Markup Language)은 ABAC 정책을 표현하는 XML 기반 표준입니다.

**XACML 아키텍처 구성요소**:
1. **PAP (Policy Administration Point)**: 정책 생성 및 관리
2. **PDP (Policy Decision Point)**: 정책 평가 및 접근 결정
3. **PEP (Policy Enforcement Point)**: 결정 사항 강제 적용
4. **PIP (Policy Information Point)**: 속성 정보 제공

**예시 시나리오**
```
조건:
- 주체: Alice (department=Engineering, clearance=L2, location=Seoul)
- 객체: ProjectX (classification=Internal, owner=Engineering)
- 환경: time=14:00, day=Wednesday, network=VPN

정책 1:
IF subject.department == object.owner
   AND subject.clearance >= "L2"
   AND time BETWEEN 09:00 AND 18:00
THEN PERMIT: Read

정책 2:
IF subject.department == object.owner
   AND subject.clearance >= "L3"
   AND network == "corporate"
THEN PERMIT: Write

결과:
- Alice는 ProjectX를 읽을 수 있음 (정책 1 만족)
- Alice는 ProjectX를 수정할 수 없음 (정책 2의 clearance 조건 미충족)
```

**장점**
- **세밀한 제어**: 다양한 속성 조합으로 복잡한 정책 표현이 가능합니다
- **동적 결정**: 실시간 환경 변화에 대응할 수 있습니다 (시간, 위치 등)
- **확장성**: 새로운 속성 추가가 용이합니다
- **컨텍스트 인지**: 상황에 따른 적응적 접근제어가 가능합니다

**단점**
- **구현 복잡도**: 정책 엔진과 속성 관리 인프라가 필요합니다
- **성능 오버헤드**: 실시간 속성 평가로 인한 지연이 발생할 수 있습니다
- **정책 관리 어려움**: 복잡한 정책 조합 시 충돌 가능성이 있습니다

**적용 사례**
- Azure AD Conditional Access (조건부 액세스)
- AWS IAM Policy Conditions
- Google Cloud IAM Conditions
- 금융기관의 거래 승인 시스템

<!--
> 참고:
> - NIST SP 800-162, "Guide to Attribute Based Access Control (ABAC) Definition and Considerations", 2014
> - OASIS XACML 3.0 Specification
-->

<br>

## 3. 모델 비교 및 선택 기준

| 모델 | 관리 방식 | 유연성 | 복잡도 | 주요 사용 사례 |
|------|----------|--------|--------|---------------|
| **DAC** | 분산 (소유자) | 높음 | 낮음 | 파일 시스템, 개인 리소스 |
| **MAC** | 중앙 (시스템) | 낮음 | 높음 | 군사/정부, 기밀 데이터 |
| **RBAC** | 중앙 (관리자) | 중간 | 중간 | 엔터프라이즈 앱, 클라우드 |
| **ABAC** | 정책 기반 | 매우 높음 | 매우 높음 | 복잡한 규정 준수, 동적 환경 |

**선택 기준**

1. **조직 규모**
   - 소규모: DAC (간단하고 직관적)
   - 중대규모: RBAC (역할 기반 표준화)
   - 대규모/다국적: ABAC (세밀한 정책 제어)

2. **보안 요구사항**
   - 일반 업무: RBAC
   - 고도 기밀: MAC
   - 규정 준수(GDPR, HIPAA): ABAC

3. **환경 특성**
   - 정적 조직: RBAC
   - 동적/분산 환경: ABAC
   - 멀티 테넌트 SaaS: RBAC + ABAC 하이브리드

<br>

## 3.1 제어 평면(Control Plane)과 데이터 평면(Data Plane)에서의 접근제어

클라우드 환경(예: Azure)에서는 리소스를 관리하는 **제어 평면**과 실제 데이터를 다루는 **데이터 평면**으로 나누어 접근제어를 이해하는 것이 중요합니다.

| 구분 | 제어 평면 (Control Plane) | 데이터 평면 (Data Plane) |
|:---:|:---:|:---:|
| **정의** | 리소스 자체의 관리 및 구성 (생성, 수정, 삭제) | 리소스 내부에 저장된 데이터에 대한 접근 (읽기, 쓰기) |
| **적용 모델** | 주로 **RBAC** (관리자 역할 중심) | **RBAC** (데이터 역할) + **DAC/ABAC** (세밀한 제어) |
| **핵심 질문** | "누가 VM을 끄고 켤 수 있는가?" | "누가 스토리지의 특정 파일을 읽을 수 있는가?" |
| **Azure 예시** | `Contributor`, `Owner` | `Storage Blob Data Reader`, `SQL DB User` |

- **RBAC의 역할**: 제어 평면에서는 관리 권한을 부여하는 데 표준적으로 사용됩니다. 최근에는 데이터 평면에서도 ID 기반 인증과 결합하여(예: Azure RBAC for Key Vault) 사용 비중이 늘고 있습니다.
- **ABAC의 필요성**: 데이터 평면은 다루는 객체(파일, 데이터베이스 레코드 등)의 수가 방대하므로, 역할(Role)만으로는 관리가 어렵습니다. 이때 태그(Tag)나 속성(Attribute)을 활용한 ABAC를 결합하여 더 유연하게 통제합니다.

<br>

## 4. 현대 클라우드 환경의 접근제어 트렌드

**4.1 Zero Trust 모델**

전통적 경계 기반 보안에서 벗어나 "신뢰하지 말고 항상 검증하라(Never Trust, Always Verify)"는 원칙을 적용합니다.

**핵심 원칙**:
- 모든 접근 요청을 인증/인가
- 최소 권한 원칙(Least Privilege)
- 마이크로 세그멘테이션(Micro-segmentation)
- 지속적 모니터링 및 검증

**Azure에서의 구현**:
- Conditional Access (ABAC 기반)
- Just-In-Time Access
- Privileged Identity Management (PIM)

> 참고: NIST SP 800-207, "Zero Trust Architecture", 2020

**4.2 하이브리드 모델**

실무에서는 여러 모델을 조합하여 사용합니다:

```
Base Layer: RBAC (기본 역할 할당)
    ↓
Policy Layer: ABAC (조건부 정책 적용)
    ↓
Enforcement: MAC-like 중앙 정책 강제
```

예: Azure에서 "Reader 역할(RBAC)"을 가진 사용자가 "회사 네트워크에서만(ABAC)" 접근 가능하도록 설정

<br>

다음 포스트에서는 이러한 접근제어 모델들이 실제로 어떻게 구현되며, 특히 **Azure RBAC**의 구체적인 동작 메커니즘과 실전 활용법을 다루겠습니다.

<br>

<!-- ## 참고문헌

1. [NIST SP 800-192, "Verification and Test Methods for Access Control Policies/Models"](https://csrc.nist.gov/publications/detail/sp/800-192/final)
2. [ANSI INCITS 359-2004, "Role Based Access Control"](https://www.incits.org/standards-information/standards-search)
3. [NIST SP 800-162, "Guide to Attribute Based Access Control (ABAC) Definition and Considerations", 2014](https://csrc.nist.gov/publications/detail/sp/800-162/final)
4. David Elliott Bell and Leonard J. LaPadula, "Secure Computer Systems: Mathematical Foundations", MITRE Corporation, 1973
5. Kenneth J. Biba, "Integrity Considerations for Secure Computer Systems", MITRE Corporation, 1977
6. David F. Ferraiolo, D. Richard Kuhn, "Role-Based Access Controls", 15th National Computer Security Conference, 1992
7. [OASIS XACML 3.0 Specification](https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html)
8. [NIST SP 800-207, "Zero Trust Architecture", 2020](https://csrc.nist.gov/publications/detail/sp/800-207/final) -->
