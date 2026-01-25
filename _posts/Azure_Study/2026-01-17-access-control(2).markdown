---
layout: post
title: "접근제어(Access Control) (2): 구현 메커니즘과 Azure RBAC 심층 분석"
date: 2026-01-17 09:00:00 +0900
tags: [Study, Azure, RBAC, IAM, Security]
categories: Azure_Study
---

지난 포스트 [**접근제어(Access Control) (1): 기본 개념과 주요 모델**]({% post_url 2026-01-15-access-control(1) %})에서는 DAC, MAC, RBAC, ABAC 등 접근제어의 주요 모델들을 살펴봤습니다.

이번 포스트에서는 접근제어가 실제 시스템에서 어떻게 구현되는지, 그리고 Azure의 핵심 접근제어 메커니즘인 **Azure RBAC**의 내부 동작 원리를 깊이 있게 분석합니다.

<br>

## 1. 접근제어 구현 메커니즘

### 1.1 ACL (Access Control List)

**개념**
각 객체(리소스)에 연결된 **허가 목록**으로, "누가 이 리소스에 대해 무엇을 할 수 있는지"를 명시합니다.

**구조**
ACL은 ACE(Access Control Entry)들의 리스트로 구성됩니다:

```
ACL = [ ACE1, ACE2, ACE3, ... ]

ACE = {
  Principal: 주체 식별자 (User/Group ID)
  Permission: 허용할 작업 (Read, Write, Execute 등)
  Type: Allow 또는 Deny
}
```

**동작 원리**
1. 주체가 객체 접근 요청
2. 시스템이 해당 객체의 ACL을 조회
3. ACL을 순차적으로 검사하여 주체와 매칭되는 ACE 탐색
4. 매칭되는 ACE의 Permission을 기반으로 허가/거부 결정

**Windows NTFS ACL 예시**

```
파일: C:\Data\financials.xlsx
Owner: DOMAIN\alice

ACL Entries:
1. Principal: DOMAIN\alice
   Permission: Full Control
   Type: Allow

2. Principal: DOMAIN\Finance_Team
   Permission: Read, Write
   Type: Allow

3. Principal: DOMAIN\Everyone
   Permission: Read
   Type: Deny

4. Principal: DOMAIN\bob
   Permission: Read
   Type: Allow
```

**평가 순서**:
- Windows에서는 Deny ACE를 먼저 평가
- bob이 접근 시: Entry 3(Deny)가 Entry 4(Allow)보다 우선 적용 → 접근 거부

**장점**
- 객체별 세밀한 권한 설정
- 직관적이고 명확한 권한 표현

**단점**
- **확장성 문제**: 리소스와 사용자가 많으면 ACL 관리 부담 증가
- **일관성 유지 어려움**: 각 리소스마다 독립적으로 ACL 관리

**적용 사례**
- 파일 시스템 (NTFS, ext4)
- Azure Storage Blob ACL
- AWS S3 Bucket ACL
- 네트워크 방화벽 규칙

> 참고: Microsoft Docs, "Access Control Lists (ACLs)"

<br>

### 1.2 Capability-Based Security

**개념**
주체가 **능력(Capability)**이라는 토큰을 보유하면 해당 토큰이 명시하는 객체와 작업에 접근할 수 있는 모델입니다. ACL과 반대로 "주체 중심" 접근제어입니다.

**Capability의 구조**
```
Capability = {
  Object Reference: 객체 식별자
  Rights: 허용된 작업 집합
  Signature/Proof: 위변조 방지를 위한 서명
}
```

**동작 원리**
1. 시스템이 주체에게 Capability 발급
2. 주체가 작업 수행 시 Capability를 제시
3. 시스템이 Capability의 유효성과 서명을 검증
4. 검증 성공 시 Capability에 명시된 작업 허용

**ACL vs Capability 비교**

| 측면 | ACL | Capability |
|------|-----|------------|
| **관점** | 객체 중심 (누가 이 리소스에 접근?) | 주체 중심 (이 주체가 무엇을 할 수 있나?) |
| **저장** | 객체에 연결 | 주체가 소유 |
| **위임** | 어려움 (객체 ACL 수정 필요) | 용이 (Capability 전달) |
| **철회** | 용이 (ACL에서 삭제) | 어려움 (모든 사본 추적 필요) |
| **확장성** | 객체 수에 비례 | 주체 수에 비례 |

**실제 적용**

1. **OAuth 2.0 Access Token**
   - Access Token = Capability
   - Token에 scope(권한)와 resource(객체)가 인코딩됨
   - Token 소유자는 명시된 API 엔드포인트에 접근 가능

2. **Unix File Descriptor**
   - File Descriptor = Capability
   - 프로세스가 파일을 open()하면 FD 획득
   - FD를 통해서만 파일 작업 수행 가능

3. **Azure Shared Access Signature (SAS)**
   - SAS Token = Capability
   - Storage 리소스에 대한 시간 제한적 접근 권한
   ```
   SAS Token 구조:
   https://myaccount.blob.core.windows.net/container/blob?
   sp=r&  # Permission: Read
   st=2026-01-17T00:00:00Z&  # Start Time
   se=2026-01-18T00:00:00Z&  # Expiry Time
   sv=2021-06-08&  # Service Version
   sig=<signature>  # HMAC-SHA256 Signature
   ```

> 참고:
> - Dennis, J. B., Van Horn, E. C., "Programming Semantics for Multiprogrammed Computations", Communications of the ACM, 1966
> - Microsoft Azure Storage Documentation, "Shared Access Signatures (SAS)"

<br>

### 1.3 Policy-Based Access Control

**개념**
선언적 정책(Policy)을 평가하여 접근을 결정하는 방식입니다. ABAC의 구현 형태로, 정책 언어로 복잡한 규칙을 표현합니다.

**정책 언어 예시**

**1) AWS IAM Policy (JSON 기반)**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::example-bucket/*"
      ],
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        },
        "DateGreaterThan": {
          "aws:CurrentTime": "2026-01-01T00:00:00Z"
        }
      }
    }
  ]
}
```

**정책 평가 로직**:
- Effect: 결과 (Allow/Deny)
- Action: 허용할 작업
- Resource: 대상 리소스
- Condition: 추가 제약 조건 (IP, 시간 등)

**2) OPA (Open Policy Agent) - Rego 언어**
```rego
package authz

default allow = false

allow {
  input.method == "GET"
  input.user.role == "reader"
}

allow {
  input.method == "POST"
  input.user.role == "writer"
  input.resource.owner == input.user.id
}
```

**정책 평가 흐름**:
1. 접근 요청 → JSON 형태로 input 구성
2. Policy Engine이 정책 평가
3. 결과 반환 (true/false 또는 allow/deny)

**장점**
- 복잡한 비즈니스 규칙을 선언적으로 표현
- 코드 변경 없이 정책만 수정하여 권한 변경
- 중앙 집중식 정책 관리

**단점**
- 정책 작성 및 디버깅의 학습 곡선
- 실시간 평가 시 성능 고려 필요

> 참고:
> - AWS IAM Documentation, "Policy Evaluation Logic"
> - Open Policy Agent Documentation

<br>

## 2. Azure RBAC 심층 분석

Azure RBAC(Role-Based Access Control)는 Azure의 핵심 접근제어 시스템입니다. Azure Resource Manager(ARM) 레이어에서 동작하며, 모든 Azure 리소스에 대한 권한을 통합 관리합니다.

### 2.1 Azure RBAC의 핵심 구성요소

**1) Security Principal (보안 주체)**

접근을 요청하는 ID 객체:

- **User**: Microsoft Entra ID(구 Azure AD) 사용자
- **Group**: 사용자 그룹
- **Service Principal**: 애플리케이션이나 서비스의 ID
- **Managed Identity**: Azure 리소스에 자동으로 할당되는 ID
  - System-assigned: 리소스와 생명주기 동일
  - User-assigned: 독립적으로 관리되는 ID

**2) Role Definition (역할 정의)**

허용된 작업(Actions)과 금지된 작업(NotActions)의 집합:

```json
{
  "Name": "Virtual Machine Contributor",
  "Id": "9980e02c-c2be-4d73-94e8-173b1dc7cf3c",
  "IsCustom": false,
  "Description": "Manage virtual machines, but not access to them",
  "Actions": [
    "Microsoft.Compute/virtualMachines/*",
    "Microsoft.Network/networkInterfaces/*",
    "Microsoft.Storage/storageAccounts/read"
  ],
  "NotActions": [
    "Microsoft.Compute/virtualMachines/login/action"
  ],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/{subscription-id}"
  ]
}
```

**역할 정의 구성 요소**:
- **Actions**: 관리 평면(Management Plane) 작업 허용
  - 예: VM 생성, 삭제, 설정 변경
- **NotActions**: Actions에서 특정 작업 제외
- **DataActions**: 데이터 평면(Data Plane) 작업 허용
  - 예: Blob 읽기/쓰기, Queue 메시지 처리
- **NotDataActions**: DataActions에서 특정 작업 제외
- **AssignableScopes**: 역할을 할당할 수 있는 범위

**3) Scope (범위)**

권한이 적용되는 계층적 범위:

```
Management Group (최상위)
  ↓
Subscription (구독)
  ↓
Resource Group (리소스 그룹)
  ↓
Resource (개별 리소스)
```

**상속 원칙**:
- 상위 범위의 역할 할당은 하위 범위에 자동 상속
- 예: Subscription 수준에서 "Reader" 역할 할당 시, 모든 Resource Group과 Resource에 대해 읽기 권한 보유

**4) Role Assignment (역할 할당)**

Security Principal + Role + Scope의 조합:

```json
{
  "id": "/subscriptions/{sub-id}/providers/Microsoft.Authorization/roleAssignments/{guid}",
  "properties": {
    "roleDefinitionId": "/subscriptions/{sub-id}/providers/Microsoft.Authorization/roleDefinitions/{role-id}",
    "principalId": "{user-or-group-object-id}",
    "principalType": "User",
    "scope": "/subscriptions/{sub-id}/resourceGroups/myResourceGroup"
  }
}
```

> 참고: Microsoft Learn, "Azure RBAC documentation"

<br>

### 2.2 Azure RBAC 권한 평가 프로세스

Azure는 사용자의 모든 요청에 대해 다음과 같은 다단계 평가 프로세스를 수행합니다.

**1단계: 인증 (Authentication)**
```
User Request → Microsoft Entra ID
              → Token 발급 (with claims: user_id, groups, roles)
```

**2단계: 컨텍스트 수집**
- 요청한 작업(Operation): 예 `Microsoft.Compute/virtualMachines/write`
- 대상 리소스(Resource): 예 `/subscriptions/{sub}/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1`
- 주체 정보(Principal): Token에서 추출한 user_id 및 group 멤버십

**3단계: 역할 할당 수집**
```sql
-- 의사 코드
SELECT role_assignments
WHERE scope IN (
  '/subscriptions/{sub}',
  '/subscriptions/{sub}/resourceGroups/rg1',
  '/subscriptions/{sub}/resourceGroups/rg1/.../vm1'
)
AND principal_id IN (user_id, user_groups)
```

Azure는 요청된 리소스의 **모든 상위 범위**에서 역할 할당을 수집한다.

**4단계: 역할 정의 해석**

수집된 각 역할 할당에 대해 역할 정의를 로드하고 Actions/NotActions를 평가한다.

**예시 시나리오**:
```
User: Alice (user_id: u123, member of: DevTeam group)
Request: DELETE VM 'vm1'
  Operation: Microsoft.Compute/virtualMachines/delete
  Resource: /subscriptions/sub1/resourceGroups/rg1/.../vm1

역할 할당 1:
  Principal: u123 (Alice)
  Role: Reader
  Scope: /subscriptions/sub1
  
역할 할당 2:
  Principal: DevTeam (group)
  Role: Virtual Machine Contributor
  Scope: /subscriptions/sub1/resourceGroups/rg1

역할 할당 3:
  Principal: u123 (Alice)
  Role: Owner
  Scope: /subscriptions/sub1/resourceGroups/rg1/.../vm1
```

**5단계: 권한 집계 (Union)**

Azure RBAC는 **허용적 모델(Additive model)**을 사용한다:
- 모든 역할 할당의 권한을 합집합(Union)으로 계산
- 하나라도 작업을 허용하면 최종 허용

```
Reader Actions:
  - */read

Virtual Machine Contributor Actions:
  - Microsoft.Compute/virtualMachines/*
  NotActions:
  - Microsoft.Compute/virtualMachines/login/action

Owner Actions:
  - *

최종 권한 = Reader ∪ VM Contributor ∪ Owner = Owner (모든 작업 허용)
```

**6단계: Deny Assignments 확인**

Azure는 **Deny Assignments**를 통해 특정 주체의 작업을 명시적으로 거부할 수 있다:

```json
{
  "properties": {
    "principals": [
      {
        "id": "{principal-id}"
      }
    ],
    "permissions": [
      {
        "actions": [
          "Microsoft.Compute/virtualMachines/delete"
        ],
        "notActions": []
      }
    ],
    "scope": "/subscriptions/{sub-id}/resourceGroups/rg1"
  }
}
```

**평가 우선순위**:
```
Deny Assignments > Allow (Role Assignments)
```

Deny가 존재하면 모든 Allow를 무시하고 즉시 거부한다.

**7단계: 최종 결정**

```python
# 의사 코드
def evaluate_access(principal, operation, resource):
    # 1. Deny Assignments 확인
    if has_deny_assignment(principal, operation, resource):
        return DENY
    
    # 2. Allow 권한 집계
    allowed_operations = set()
    for assignment in get_role_assignments(principal, resource):
        role_def = get_role_definition(assignment.role_id)
        allowed_operations.update(role_def.actions)
        allowed_operations.difference_update(role_def.not_actions)
    
    # 3. 와일드카드 매칭
    if matches_any_pattern(operation, allowed_operations):
        return ALLOW
    else:
        return DENY
```

**와일드카드 패턴 매칭**:
```
역할 Actions: ["Microsoft.Compute/virtualMachines/*"]

요청 작업: "Microsoft.Compute/virtualMachines/delete"
→ 매칭: True (패턴에 부합)

요청 작업: "Microsoft.Storage/storageAccounts/write"
→ 매칭: False (패턴 불일치)
```

> 참고: Microsoft Learn, "How Azure RBAC determines if a user has access to a resource"

<br>

### 2.3 기본 제공 역할 (Built-in Roles)

Azure는 75개 이상의 기본 제공 역할을 제공한다. 주요 역할들의 권한 범위를 분석한다.

**1) Owner (소유자)**

```json
{
  "Actions": ["*"],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": []
}
```

- **권한**: 모든 작업 (리소스 생성/삭제/수정 + RBAC 관리)
- **특징**: 다른 사용자에게 역할 할당 가능
- **사용 사례**: 구독 관리자, 프로젝트 Owner

**2) Contributor (기여자)**

```json
{
  "Actions": ["*"],
  "NotActions": [
    "Microsoft.Authorization/*/Delete",
    "Microsoft.Authorization/*/Write",
    "Microsoft.Authorization/elevateAccess/Action"
  ],
  "DataActions": [],
  "NotDataActions": []
}
```

- **권한**: 리소스 관리 (생성/삭제/수정)
- **제한**: RBAC 역할 할당/삭제 불가
- **사용 사례**: 개발자, DevOps 엔지니어

**3) Reader (읽기 권한자)**

```json
{
  "Actions": ["*/read"],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": []
}
```

- **권한**: 모든 리소스 조회만 가능
- **제한**: 어떤 변경도 불가
- **사용 사례**: 감사자, 읽기 전용 사용자

**4) 서비스별 특화 역할 예시**

**Virtual Machine Contributor**:
```json
{
  "Actions": [
    "Microsoft.Compute/virtualMachines/*",
    "Microsoft.Network/networkInterfaces/*",
    "Microsoft.Network/virtualNetworks/read",
    "Microsoft.Storage/storageAccounts/read"
  ],
  "NotActions": []
}
```

**Storage Blob Data Reader** (Data Plane 역할):
```json
{
  "Actions": [
    "Microsoft.Storage/storageAccounts/blobServices/containers/read"
  ],
  "NotActions": [],
  "DataActions": [
    "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read"
  ],
  "NotDataActions": []
}
```

**주의사항**:
- Management Plane 역할(예: Contributor)은 Data Plane 접근 권한을 자동으로 부여하지 않음
- Blob 데이터를 읽으려면 별도로 `Storage Blob Data Reader` 같은 Data Plane 역할 필요

> 참고: Microsoft Learn, "Azure built-in roles"

<br>

### 2.4 커스텀 역할 (Custom Roles)

기본 제공 역할로 충분하지 않을 때 조직의 요구사항에 맞는 커스텀 역할을 생성할 수 있습니다.

**커스텀 역할 생성 예시**

**시나리오**: VM 시작/중지만 가능하고 삭제는 불가한 역할

```json
{
  "Name": "Virtual Machine Operator",
  "IsCustom": true,
  "Description": "Can start and stop VMs but cannot delete them",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Compute/virtualMachines/deallocate/action"
  ],
  "NotActions": [
    "Microsoft.Compute/virtualMachines/delete"
  ],
  "AssignableScopes": [
    "/subscriptions/{subscription-id}"
  ]
}
```

**생성 방법 (Azure CLI)**:
```bash
az role definition create --role-definition @vm-operator-role.json
```

**커스텀 역할 설계 베스트 프랙티스**

1. **최소 권한 원칙 (Principle of Least Privilege)**
   - 필요한 작업만 정확히 허용
   - 와일드카드(`*`) 사용 최소화

2. **명확한 명명 및 설명**
   - 역할 이름으로 목적 명확히 표현
   - Description에 사용 사례 기술

3. **AssignableScopes 제한**
   - 필요한 범위로만 제한 (특정 구독/리소스 그룹)
   - Management Group 수준 할당은 신중히 고려

4. **정기적 검토**
   - 불필요한 권한 제거
   - Actions 목록 최신화

**제한사항**:
- 테넌트당 최대 **5,000개**의 커스텀 역할
- 역할 정의당 최대 **2,048개**의 Actions

> 참고: Microsoft Learn, "Azure custom roles"

<br>

### 2.5 Management Plane vs Data Plane

Azure의 작업은 두 평면으로 분류됩니다:

**Management Plane**
- **대상**: 리소스 자체의 생명주기 관리
- **작업 예시**: VM 생성, Storage Account 삭제, Virtual Network 구성
- **엔드포인트**: Azure Resource Manager (management.azure.com)
- **권한**: Actions/NotActions로 제어

**Data Plane**
- **대상**: 리소스 내부의 데이터 작업
- **작업 예시**: Blob 읽기/쓰기, SQL 쿼리 실행, Key Vault Secret 접근
- **엔드포인트**: 각 서비스의 데이터 엔드포인트 (예: myaccount.blob.core.windows.net)
- **권한**: DataActions/NotDataActions로 제어

**예시: Storage Account**

```
Management Plane:
- Storage Account 생성/삭제
- 방화벽 규칙 설정
- 암호화 구성 변경

Data Plane:
- Blob 업로드/다운로드
- Container 생성/삭제
- Blob 메타데이터 수정
```

**권한 할당 조합**:
```
User A:
  Role 1: Storage Account Contributor (Management Plane)
    → Storage Account 설정 변경 가능
  Role 2: Storage Blob Data Reader (Data Plane)
    → Blob 데이터 읽기 가능

결과: User A는 Storage Account를 관리하고 Blob을 읽을 수 있지만 쓰기는 불가
```

**주의점**: 
- `Owner` 또는 `Contributor` 역할만으로는 Blob 데이터에 접근할 수 없음
- 별도의 Data Plane 역할(예: `Storage Blob Data Contributor`) 필요
- 단, Storage Account 키를 직접 사용하면 RBAC를 우회하여 전체 접근 가능 (비권장)

> 참고: Microsoft Learn, "Azure control plane and data plane"

<br>

### 2.6 조건부 액세스(Conditional Access)와의 통합

Azure RBAC는 RBAC 모델이지만, Microsoft Entra ID의 **조건부 액세스**와 결합하여 ABAC 기능을 구현할 수 있다.

**조건부 액세스 정책 구성요소**

1. **Assignments (할당)**
   - Users/Groups: 정책이 적용될 사용자
   - Cloud apps: 대상 애플리케이션

2. **Conditions (조건)**
   - Sign-in risk: 로그인 위험 수준
   - Device platforms: OS 유형 (Windows, macOS, iOS 등)
   - Locations: IP 범위 또는 국가
   - Client apps: 브라우저, 모바일 앱 등

3. **Access controls (접근 제어)**
   - Grant: 다단계 인증(MFA) 요구, 규정 준수 디바이스 요구
   - Session: 세션 시간 제한, 앱 제어

**통합 시나리오**

```
조건부 액세스 정책:
  IF User.Role == "Contributor"
     AND Location NOT IN "Corporate Network"
     AND Risk Level > "Medium"
  THEN Require MFA

RBAC:
  User: Bob
  Role: Contributor (VM 관리 권한)
  Scope: /subscriptions/sub1

결과:
  - Bob이 회사 네트워크에서 접속: VM 관리 가능 (MFA 불필요)
  - Bob이 외부에서 접속: MFA 인증 후 VM 관리 가능
  - 위험 로그인 감지 시: MFA 강제 또는 접근 차단
```

**정책 예시 (JSON)**:
```json
{
  "displayName": "Require MFA for Contributors from external networks",
  "conditions": {
    "users": {
      "includeRoles": ["b24988ac-6180-42a0-ab88-20f7382dd24c"]  // Contributor
    },
    "locations": {
      "includeLocations": ["All"],
      "excludeLocations": ["AllTrusted"]
    }
  },
  "grantControls": {
    "operator": "AND",
    "builtInControls": ["mfa"]
  }
}
```

> 참고: Microsoft Learn, "What is Conditional Access?"

<br>

### 2.7 PIM (Privileged Identity Management)

**개념**
Just-In-Time (JIT) 권한 부여를 통해 상시 권한 할당의 위험을 줄인다. 사용자는 필요한 시점에만 권한을 활성화(Activate)한다.

**핵심 기능**

**1) Just-In-Time Access**
```
일반 상태: User는 Reader 역할만 보유
          ↓
승인 요청: "Contributor 역할 필요 (이유: 배포 작업)"
          ↓
승인 후: Contributor 역할 활성화 (최대 8시간)
          ↓
만료: 자동으로 Contributor 역할 제거
```

**2) 승인 워크플로우**
```json
{
  "roleName": "Owner",
  "activationSettings": {
    "maximumDuration": "PT8H",  // ISO 8601 format: 8시간
    "requireApproval": true,
    "approvers": [
      {
        "id": "{approver-object-id}"
      }
    ],
    "requireJustification": true,
    "requireMFA": true
  }
}
```

**3) 액세스 검토 (Access Reviews)**
- 주기적으로 역할 할당의 적절성을 검토
- 불필요한 권한 자동 제거
- 규정 준수 감사 추적

**동작 시나리오**:
```
1. Alice는 평소에 Reader 역할만 보유
2. 긴급 배포 필요 시 PIM 포털에서 Contributor 활성화 요청
3. MFA 인증 수행
4. 승인자(Manager)가 요청 검토 및 승인
5. 4시간 동안 Contributor 권한 활성화
6. 4시간 후 자동으로 Reader로 회귀
```

**보안 이점**:
- **공격 표면 축소**: 상시 고권한 계정 수 감소
- **감사 추적**: 모든 권한 활성화 로그 기록
- **적시성**: 필요한 시점에만 권한 부여

> 참고: Microsoft Learn, "What is Microsoft Entra Privileged Identity Management?"

<br>

### 2.8 Azure RBAC 모범 사례

**1) 최소 권한 원칙 적용**
```
❌ 나쁜 예: 모든 개발자에게 Subscription Owner 부여
✅ 좋은 예: Resource Group 수준에서 필요한 역할만 부여
```

**2) 그룹 기반 할당**
```
❌ 나쁜 예: 각 사용자에게 개별적으로 역할 할당
✅ 좋은 예: DevTeam 그룹을 만들고 그룹에 역할 할당
```

**3) 적절한 범위 선택**
```
필요한 최소 범위에서 할당:
Management Group > Subscription > Resource Group > Resource
                                              ↑
                                         대부분의 경우 여기서 할당
```

**4) 서비스 주체 권한 최소화**
```json
// Application Service Principal
{
  "appId": "{app-id}",
  "roleAssignments": [
    {
      "role": "Storage Blob Data Contributor",  // ✅ 특정 역할
      "scope": "/subscriptions/.../storageAccounts/myapp-storage"  // ✅ 특정 리소스
    }
  ]
}

// ❌ 피해야 할 패턴: Subscription 수준에서 Contributor 역할
```

**5) 정기적 권한 검토**
```powershell
# 불필요한 역할 할당 찾기
Get-AzRoleAssignment -Scope "/subscriptions/{sub-id}" | 
  Where-Object {$_.SignInName -eq "user@example.com"} |
  Format-Table RoleDefinitionName, Scope
```

**6) Managed Identity 활용**
```
❌ 나쁜 예: Service Principal 자격 증명을 코드에 하드코딩
✅ 좋은 예: VM에 Managed Identity 할당하여 자격 증명 없이 인증
```

**7) 감사 로그 모니터링**
```
모니터링 대상 작업:
- Microsoft.Authorization/roleAssignments/write
- Microsoft.Authorization/roleDefinitions/write
- Microsoft.Authorization/roleAssignments/delete

Azure Monitor 또는 Sentinel로 이상 패턴 탐지
```

> 참고: Microsoft Learn, "Best practices for Azure RBAC"

<br>

## 3. Azure RBAC vs Other Azure Access Controls

Azure에는 RBAC 외에도 여러 접근제어 메커니즘이 존재한다. 각각의 역할과 차이점을 이해해야 한다.

### 3.1 Azure RBAC vs Azure AD Roles

| 측면 | Azure RBAC | Microsoft Entra ID Roles |
|------|------------|--------------------------|
| **대상** | Azure 리소스 | Entra ID 객체 (사용자, 그룹, 앱) |
| **범위** | Management Group ~ Resource | Tenant (테넌트) 전체 |
| **예시 역할** | Owner, Contributor, Reader | Global Administrator, User Administrator |
| **사용 사례** | VM 관리, Storage 접근 | 사용자 계정 생성, 앱 등록 |

**중요**: 두 시스템은 독립적이다. Entra ID의 Global Administrator라도 Azure 리소스 접근 권한은 별도로 필요하다.

### 3.2 Azure Policy

**목적**: 리소스의 **규정 준수(Compliance)** 강제

```json
{
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Compute/virtualMachines"
        },
        {
          "field": "location",
          "notIn": ["koreacentral", "koreasouth"]
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  }
}
```

**차이점**:
- **RBAC**: "누가 무엇을 할 수 있는가?" (주체 중심)
- **Policy**: "무엇이 허용/금지되는가?" (리소스 속성 중심)

**조합 예시**:
- RBAC: User에게 Contributor 역할 부여 → VM 생성 가능
- Policy: VM은 Korea Central에만 생성 가능 → 다른 지역에 생성 시도 시 거부

### 3.3 Resource Locks

**목적**: 실수로 인한 중요 리소스 삭제/수정 방지

```
Lock Types:
- CanNotDelete: 삭제 차단 (수정은 가능)
- ReadOnly: 읽기만 가능 (수정/삭제 모두 차단)
```

**RBAC과의 관계**:
- Resource Lock은 RBAC 권한보다 우선함
- Owner 역할을 가져도 Lock이 걸린 리소스는 삭제 불가

> 참고: Microsoft Learn, "Lock your resources to protect your infrastructure"

<br>

## 정리

이번 포스트에서는 접근제어의 구현 메커니즘(ACL, Capability, Policy)과 Azure RBAC의 심층 동작 원리를 살펴봤습니다.

**핵심 요약**:
1. Azure RBAC는 Security Principal + Role + Scope의 할당 조합
2. 권한 평가는 허용적 모델(Union)이며 Deny Assignments가 최우선
3. Management Plane과 Data Plane은 별도 권한 체계
4. 조건부 액세스와 PIM을 통해 ABAC 및 JIT 구현 가능
5. 최소 권한 원칙과 그룹 기반 할당이 모범 사례

다음 포스트 시리즈에서는 **디렉토리 서비스(Directory Service)**의 개념과 구현 방식을 다루겠습니다.

<br>

<!--
## 참고문헌

1. [Microsoft Docs, "Access Control Lists (ACLs)"](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists)
2. [Microsoft Azure Storage Documentation, "Shared Access Signatures (SAS)"](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
3. Dennis, J. B., Van Horn, E. C., "Programming Semantics for Multiprogrammed Computations", Communications of the ACM, 1966
4. [AWS IAM Documentation, "Policy Evaluation Logic"](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
5. [Open Policy Agent Documentation](https://www.openpolicyagent.org/)
6. [Microsoft Learn, "Azure RBAC documentation"](https://learn.microsoft.com/en-us/azure/role-based-access-control/)
7. [Microsoft Learn, "How Azure RBAC determines if a user has access to a resource"](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview)
8. [Microsoft Learn, "Azure built-in roles"](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
9. [Microsoft Learn, "Azure custom roles"](https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles)
10. [Microsoft Learn, "Azure control plane and data plane"](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/control-plane-and-data-plane)
11. [Microsoft Learn, "What is Conditional Access?"](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview)
12. [Microsoft Learn, "What is Microsoft Entra Privileged Identity Management?"](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure)
13. [Microsoft Learn, "Best practices for Azure RBAC"](https://learn.microsoft.com/en-us/azure/role-based-access-control/best-practices)
14. [Microsoft Learn, "Lock your resources to protect your infrastructure"](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
-->
-->
