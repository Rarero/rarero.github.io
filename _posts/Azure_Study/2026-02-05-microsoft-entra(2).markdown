---
layout: post
title: "Microsoft Entra (2): Microsoft Entra ID와 Domain Services 심층 분석"
date: 2026-02-05 09:00:00 +0900
tags: [Study, Azure, Microsoft Entra, Entra ID, Domain Services, Authentication]
categories: Azure_Study
---

지난 포스트 [**Microsoft Entra (1): 서비스 개요와 ID 및 액세스 관리 생태계**]({% post_url Azure_Study/2026-02-03-microsoft-entra(1) %})에서는 Microsoft Entra 제품군의 전체 구조를 살펴봤습니다.

이번 포스트에서는 Entra ID의 **내부 작동 메커니즘**과 **아키텍처 설계 원칙**, 그리고 Domain Services의 **복제 토폴로지**와 **성능 최적화** 전략을 심층 분석합니다.

<br>

## 1. 조건부 액세스: 정책 엔진 내부 구조

### 1.1 정책 평가 엔진의 실행 순서

조건부 액세스 정책은 단순한 IF-THEN 규칙이 아닙니다. **다단계 평가 파이프라인**을 거쳐 실행되며, 성능과 보안을 동시에 고려한 최적화가 적용됩니다.

**평가 파이프라인 구조:**

```
1. 신호 수집 단계 (Signal Collection Phase)
   ├─ 동기 신호 (즉시 사용 가능)
   │  • 사용자 ObjectID, UPN
   │  • 클라이언트 IP (X-Forwarded-For 헤더 포함)
   │  • User-Agent (디바이스 플랫폼 파싱)
   │  • 대상 리소스 URI
   │
   └─ 비동기 신호 (병렬 조회)
      • 그룹 멤버십 (Graph API 호출, 캐시 우선)
      • 디바이스 규정 준수 상태 (Intune 조회, TTL 5분)
      • 로그인 위험 점수 (Identity Protection API, 실시간)
      • 위치 해석 (IP 지오로케이션 DB, 캐시)

2. 정책 필터링 단계 (Policy Filtering)
   ├─ 범위 기반 필터링 (O(1) 해시 조회)
   │  • 할당 대상: 사용자/그룹 포함/제외 (Set 연산)
   │  • 대상 앱: 리소스 ID 매칭
   │  
   └─ 조건 기반 필터링 (비트마스크 연산)
      • 플랫폼 조건: 비트 AND 연산
      • 위치 조건: Named Location ID 매칭
      • 클라이언트 앱 타입: Enum 비교

3. 정책 평가 단계 (Policy Evaluation)
   ├─ 블록 정책 우선 평가 (조기 종료)
   │  • 차단 제어가 있는 정책을 먼저 평가
   │  • 단 하나라도 차단 조건 충족 시 즉시 액세스 거부
   │  • 나머지 정책 평가 스킵 (성능 최적화)
   │
   ├─ Grant 정책 누적 평가 (AND 결합)
   │  • 모든 Grant 정책의 요구사항 수집
   │  • 중복 제거 (MFA 여러 번 요구 → 한 번만)
   │  • 충족 불가능한 조합 검사 (MFA + Block)
   │
   └─ Session 정책 병합
      • 가장 제한적인 값 선택
      • 예: 토큰 수명 8시간 vs 4시간 → 4시간 선택

4. 제어 적용 단계 (Enforcement)
   ├─ Grant 제어 검증
   │  • MFA: OATH 토큰/SMS/푸시 알림 검증
   │  • 디바이스 준수: Intune 정책 재확인
   │  • 승인된 앱: 클라이언트 인증서 검증
   │
   └─ Session 제어 주입
      • 액세스 토큰 클레임에 제한 조건 삽입
      • 예: { "xms_cc": ["CP1"], "exp": 14400 }
```

**성능 최적화 기법:**

1. **조기 종료 (Early Exit)**
   - 차단 정책이 충족되면 나머지 평가 스킵
   - 로그인당 평균 평가 시간: 50~150ms

2. **병렬 신호 수집**
   - 디바이스 상태, 위험 점수, 그룹 멤버십을 동시에 조회
   - 가장 느린 신호 대기 시간: ~200ms (Intune 조회)

3. **캐싱 전략**
   - 그룹 멤버십: 5분 TTL (토큰 갱신 시 재조회)
   - Named Location: 1시간 TTL (IP 블록 변경 빈도 낮음)
   - 디바이스 준수: 5분 TTL (Intune 동기화 주기)

4. **보고서 전용 모드 최적화**
   - 실제 정책과 별도 스레드에서 평가
   - 결과를 비동기로 로그에 기록
   - 사용자 경험에 영향 없음

### 1.2 복잡한 정책 조합 시나리오

**시나리오 1: 역할 기반 위치 제한**

```
요구사항: 재무팀은 본사에서만 SAP 접근 가능

정책 설계:
├─ 정책 A: "Finance - Office Only"
│  ├─ 할당: 그룹 = "Finance Team"
│  ├─ 클라우드 앱: SAP ERP
│  ├─ 조건: 위치 ≠ "Corporate HQ"
│  └─ 제어: 차단
│
└─ 정책 B: "Finance - MFA Required"
   ├─ 할당: 그룹 = "Finance Team"
   ├─ 클라우드 앱: SAP ERP
   ├─ 조건: 위치 = "Corporate HQ"
   └─ 제어: MFA 필요

평가 로직:
- 사무실 외부 → 정책 A 차단 (조기 종료)
- 사무실 내부 → 정책 B MFA 요구
```

**시나리오 2: 위험 기반 적응형 MFA**

```
요구사항: 로그인 위험에 따라 동적으로 MFA 요구

정책 계층:
├─ 정책 1: "High Risk Block" (우선순위 1)
│  ├─ 조건: 로그인 위험 = 높음
│  └─ 제어: 차단
│
├─ 정책 2: "Medium Risk MFA" (우선순위 2)
│  ├─ 조건: 로그인 위험 = 중간
│  └─ 제어: MFA 필요
│
└─ 정책 3: "Low Risk Compliant Device" (우선순위 3)
   ├─ 조건: 로그인 위험 = 낮음
   └─ 제어: 규정 준수 디바이스 필요

위험 점수 계산:
- IP 평판: 20점
- 불가능한 여행: 50점
- 익명 IP: 30점
- 비정상 토큰: 40점

총점 → 위험 수준 매핑:
  0-20: 낮음
 21-50: 중간
 51+: 높음
```

**시나리오 3: 디바이스 신뢰 레벨 기반 액세스**

```
디바이스 분류:
├─ Tier 0: Entra Hybrid Join + Intune 관리 + BitLocker
├─ Tier 1: Entra Join + Intune 관리
├─ Tier 2: Entra Registered (개인 디바이스)
└─ Tier 3: 미등록 디바이스

앱별 정책:
├─ SAP (민감)
│  └─ Tier 0만 허용
│
├─ SharePoint (중간 민감도)
│  └─ Tier 0/1 허용, Tier 2 MFA 필요
│
└─ Outlook Web (낮은 민감도)
   └─ Tier 0/1/2 허용, Tier 3 차단

구현:
정책 1: "SAP - Tier 0 Only"
  • 앱: SAP
  • 조건: 디바이스 상태 ≠ (Hybrid Join AND Compliant)
  • 제어: 차단

정책 2: "SharePoint - BYOD MFA"
  • 앱: SharePoint
  • 조건: 디바이스 상태 = Registered (BYOD)
  • 제어: MFA 필요

정책 3: "Outlook - Managed Only"
  • 앱: Outlook Web
  • 조건: 디바이스 상태 = 미등록
  • 제어: 차단
```

### 1.3 세션 제어의 내부 메커니즘

조건부 액세스의 세션 제어는 **토큰 클레임 주입**을 통해 구현됩니다.

**애플리케이션 적용 제한 (App Enforced Restrictions)**

```
메커니즘:
1. CA 정책이 세션 제어 "앱 적용 제한" 활성화
2. Entra ID가 액세스 토큰에 특수 클레임 주입:
   {
     "xms_cc": ["CP1"],  // Compliance Policy 1
     "acrs": "c1"        // Authentication Context Reference
   }
3. SharePoint/Exchange가 토큰 클레임 검사
4. CP1 정책 적용:
   - 다운로드 차단
   - 인쇄 차단
   - 복사/붙여넣기 제한

제한 사항:
- SharePoint Online, Exchange Online만 지원
- 레거시 인증 프로토콜(POP3, IMAP) 미지원
- 클라이언트 앱이 클레임 인식 필요
```

**로그인 빈도 (Sign-in Frequency)**

```
구현 방식:
1. Refresh Token 수명 단축
   기본: 90일 → 정책: 1시간
   
2. Access Token exp 클레임 조정
   기본: 1시간 → 정책: 30분

3. PRT (Primary Refresh Token) TTL 재정의
   Windows 10/11 디바이스의 PRT 수명 단축

토큰 갱신 시나리오:
- 사용자가 30분 후 리소스 접근 시도
- Access Token 만료 → Refresh Token으로 갱신 시도
- Refresh Token도 만료 → 재인증 요구
- MFA 재수행 (정책에 따라)
```

**지속적 액세스 평가 (Continuous Access Evaluation, CAE)**

```
기존 토큰 모델 문제:
- Access Token 수명: 1시간
- 사용자 계정 비활성화해도 토큰이 유효하면 1시간 동안 접근 가능
- 보안 위협

CAE 해결 방법:
1. 장기 수명 토큰 발급 (24시간)
   {
     "exp": 1234567890,  // 24시간 후
     "xms_cc": ["cp1"],
     "client_claims": {...}
   }

2. 리소스 서버가 토큰 검증 시 CAE 이벤트 확인
   GET https://graph.microsoft.com/v1.0/me
   → Graph API가 Entra ID CAE 엔드포인트 조회

3. 중요 이벤트 발생 시 즉시 토큰 무효화
   - 사용자 계정 비활성화
   - 비밀번호 재설정
   - 관리자가 세션 취소
   - IP 위치 급변 (불가능한 여행)

4. 토큰 무효화 응답
   HTTP 401 Unauthorized
   WWW-Authenticate: Bearer realm="", error="insufficient_claims",
     claims="eyJ..."

5. 클라이언트가 재인증 수행

지원 리소스:
- Microsoft Graph
- SharePoint Online
- Exchange Online
- Teams

CAE 미지원 클라이언트:
- 레거시 인증 (Basic Auth)
- SMTP, POP3, IMAP
```

### 1.4 정책 충돌 해결 알고리즘

여러 정책이 동일한 사용자/앱에 적용될 때 충돌이 발생할 수 있습니다.

**충돌 해결 규칙:**

```
1. Block 우선 (최우선)
   정책 A: Grant (MFA)
   정책 B: Block
   → 결과: Block (정책 A 무시)

2. Grant 조건 누적 (AND 결합)
   정책 A: Grant (MFA)
   정책 B: Grant (Compliant Device)
   → 결과: MFA AND Compliant Device

3. Session 제어 병합 (가장 제한적)
   정책 A: Sign-in Frequency = 8 hours
   정책 B: Sign-in Frequency = 4 hours
   → 결과: 4 hours

4. 범위 포함/제외 Set 연산
   정책 A: Users = "Finance Team"
   정책 B: Exclude Users = "CFO"
   → Finance 멤버이지만 CFO는 정책 미적용

5. 충족 불가능 조건 검증
   정책 A: Grant (MFA)
   정책 B: Grant (MFA) + Block
   → 오류: 관리자에게 정책 수정 요청
```

**정책 우선순위 알고리즘 (유사 코드):**

```python
def evaluate_policies(user, app, context):
    applicable_policies = filter_policies(user, app, context)
    
    # 1. Block 정책 우선 평가
    for policy in applicable_policies:
        if policy.grant_control == "Block":
            if policy.conditions.match(context):
                return DENY  # 조기 종료
    
    # 2. Grant 요구사항 수집
    required_controls = set()
    for policy in applicable_policies:
        if policy.grant_control == "Grant":
            if policy.conditions.match(context):
                required_controls.update(policy.controls)
    
    # 3. 충돌 검사
    if "Block" in required_controls:
        log_error("Conflicting policies detected")
        return DENY
    
    # 4. 사용자가 요구사항 충족하는지 검증
    if verify_user_satisfies(required_controls, context):
        # 5. Session 제어 적용
        session_controls = merge_session_controls(applicable_policies)
        return GRANT_WITH_SESSION(session_controls)
    else:
        return REQUIRE_CONTROLS(required_controls)

def merge_session_controls(policies):
    merged = {}
    
    # 가장 짧은 로그인 빈도 선택
    signin_frequencies = [p.signin_freq for p in policies if p.signin_freq]
    if signin_frequencies:
        merged["signin_frequency"] = min(signin_frequencies)
    
    # 앱 제한 병합
    app_restrictions = [p.app_restrictions for p in policies if p.app_restrictions]
    if app_restrictions:
        merged["app_restrictions"] = union(app_restrictions)
    
    return merged
```

## 2. Identity Protection: ML 기반 위험 탐지 심화

### 2.1 위험 점수 계산 알고리즘

Identity Protection은 **앙상블 머신러닝 모델**을 사용하여 위험 점수를 계산합니다.

**신호 수집 및 특징 추출:**

```
로그인 이벤트당 수집 특징 (Feature Vector):

1. 네트워크 특징 (12차원)
   - IP 평판 점수 (0-100)
   - ASN (Autonomous System Number)
   - ISP 유형 (Corporate/Residential/Hosting/VPN)
   - 지리적 위치 (위도, 경도)
   - VPN/Tor 탐지 플래그
   - 익명 프록시 확률

2. 사용자 행동 특징 (15차원)
   - 평균 로그인 시간 (시간대 벡터)
   - 일반 로그인 위치 (IP 범위 3개)
   - 디바이스 핑거프린트 일치도
   - User-Agent 변화 빈도
   - 실패한 로그인 시도 횟수 (24시간)
   - 최근 비밀번호 변경 여부

3. 세션 특징 (8차원)
   - 로그인 속도 (이전 로그인과의 시간 간격)
   - 여행 속도 (km/h, 불가능한 여행 탐지)
   - 접근 앱 유형 변화
   - 프로토콜 이상 (OAuth vs SAML 전환)

4. 외부 위협 인텔리전스 (5차원)
   - 유출된 자격 증명 DB 매칭
   - 봇넷/C&C IP 목록

   - 악성 도메인 블랙리스트
   - 최근 침해 사고 연관 IP

총 특징 차원: 40차원 벡터
```

**앙상블 모델 구조:**

```
위험 점수 계산 파이프라인:

1. Random Forest (실시간 탐지)
   - 30개 의사결정 트리
   - 최대 깊이: 10
   - 특징 샘플링: 0.7
   → 이상 IP, 불가능한 여행 탐지

2. Gradient Boosting (정밀 분류)
   - XGBoost 기반
   - 학습 률: 0.05
   - 트리 수: 100
   → 미세한 행동 패턴 분석

3. Neural Network (복잡한 패턴)
   - 3층 MLP (40 → 20 → 10 → 1)
   - 활성화 함수: ReLU
   → 다차원 상관관계 학습

4. 앙상블 결합 (Weighted Voting)
   최종 점수 = 0.4 * RF + 0.35 * GB + 0.25 * NN
   
   점수 → 위험 레벨 매핑:
     0-30: 낮음 (Low)
    31-65: 중간 (Medium)
    66-100: 높음 (High)
```

**오탐(False Positive) 최소화 전략:**

```
문제: VPN 사용 → 익명 IP 탐지 → 오탐

해결 방법:
1. 사용자 행동 프로파일링
   - 지난 30일간 VPN 사용 패턴 학습
   - 일관된 VPN 사용 → 위험 점수 하향 조정

2. 컨텍스트 기반 조정
   - 회사 승인 VPN IP 범위 → 화이트리스트
   - 출장 일정 (Outlook 일정 연동) → 위치 변화 예상

3. 피드백 루프
   - 관리자 "안전 확인" 클릭 → 모델 재학습
   - 사용자 MFA 성공 → 위험 점수 점진적 감소
```

### 2.2 위험 기반 자동 응답 (AIBR)

```
Automated Investigation and Response (AIBR) 워크플로:

1. 위험 탐지 (예: 불가능한 여행)
   ↓
2. 위험 점수 계산 (85점 → 높음)
   ↓
3. CA 정책 트리거
   ├─ 세션 즉시 종료 (CAE)
   ├─ MFA 챌린지 발송
   └─ 관리자 알림 (Security Center)
   ↓
4. 사용자 응답 분석
   ├─ MFA 성공 → 위험 80점으로 감소
   ├─ MFA 실패 → 위험 95점으로 증가, 계정 잠금
   └─ 응답 없음 (5분) → 계정 일시 차단
   ↓
5. 관리자 개입
   ├─ 위험 확인 → 계정 비활성화, 디바이스 격리
   ├─ 안전 확인 → 위험 해제, 모델 재학습
   └─ 비밀번호 재설정 강제
```

**위험 수준별 자동화 액션:**

| 위험 레벨 | 자동 액션 | 복구 조건 |
|-----------|----------|----------|
| **낮음 (0-30)** | • 로그 기록만 | • 자동 해제 |
| **중간 (31-65)** | • MFA 요구<br>• 토큰 수명 단축 | • MFA 성공<br>• 30분 정상 활동 |
| **높음 (66-100)** | • 세션 즉시 종료<br>• 모든 토큰 무효화<br>• 계정 일시 차단 | • 비밀번호 재설정<br>• 관리자 승인<br>• MFA 재등록 |

## 3. RBAC 심화: 대규모 권한 관리 설계 패턴

### 3.1 관리 단위 (Administrative Units) 활용

대규모 조직에서는 **관리 단위 (AU)**를 사용하여 권한을 지역/부서별로 분리합니다.

**AU 설계 패턴:**

```
조직 구조:
├─ AU: Korea Region
│  ├─ 사용자: 1,000명
│  └─ 그룹: 50개
│
├─ AU: US Region  
│  ├─ 사용자: 3,000명
│  └─ 그룹: 150개
│
└─ AU: Finance Department (교차 AU)
   ├─ 사용자: Korea 200명 + US 300명
   └─ 그룹: 10개

권한 위임:
├─ Korea IT Admin
│  └─ 역할: User Administrator (범위: Korea AU)
│     → Korea 사용자만 관리 가능
│
├─ US IT Admin
│  └─ 역할: User Administrator (범위: US AU)
│     → US 사용자만 관리 가능
│
└─ Global Finance Admin
   └─ 역할: User Administrator (범위: Finance AU)
      → 전 지역 재무팀 관리 가능
```

**AU 멤버십 동적 할당:**

```
동적 규칙 예시:

AU: "Remote Workers"
규칙:
(user.country -eq "Korea") -and 
(user.department -eq "Engineering") -and
(user.extensionAttribute1 -eq "Remote")

자동 멤버십 관리:
- HR 시스템에서 extensionAttribute1 업데이트
- Entra ID가 동적 그룹 평가 (15분 주기)
- AU 멤버십 자동 추가/제거
- IT Admin이 새로운 원격 근무자 권한 자동 관리
```

### 3.2 커스텀 역할 설계 베스트 프랙티스

**최소 권한 역할 분리 예시:**

```
문제: Application Administrator는 너무 광범위한 권한 보유
- 모든 앱 등록 관리
- 서비스 주체 삭제 가능
- 엔터프라이즈 앱 동의 권한

해결: 커스텀 역할 세분화

역할 1: "App Registration Creator"
허용 권한:
  microsoft.directory/applications/create
  microsoft.directory/applications/basic/update
  microsoft.directory/applications/credentials/update

차단 권한:
  microsoft.directory/applications/delete
  microsoft.directory/servicePrincipals/*

사용 사례: 개발팀이 앱 등록 생성만 가능

역할 2: "App Consent Manager"
허용 권한:
  microsoft.directory/servicePrincipals/appRoleAssignedTo/update
  microsoft.directory/servicePrincipals/permissions.Grant

차단 권한:
  microsoft.directory/applications/*

사용 사례: 보안팀이 API 권한 승인만 담당

역할 3: "App Credential Auditor"
허용 권한:
  microsoft.directory/applications/credentials/read
  microsoft.directory/servicePrincipals/credentials/read

차단 권한:
  microsoft.directory/applications/credentials/update

사용 사례: 감사팀이 앱 시크릿 만료 모니터링
```

**JSON 템플릿 예시:**

```json
{
  "displayName": "App Registration Creator",
  "description": "Can create app registrations but cannot delete",
  "rolePermissions": [
    {
      "allowedResourceActions": [
        "microsoft.directory/applications/create",
        "microsoft.directory/applications/basic/update",
        "microsoft.directory/applications/credentials/update"
      ],
      "condition": null
    }
  ],
  "isBuiltIn": false,
  "isEnabled": true,
  "templateId": "custom-app-creator-001"
}
```

## 4. PIM 심화: 승인 워크플로와 감사

### 4.1 복잡한 승인 체인 설계

**다단계 승인 워크플로:**

```
시나리오: Global Administrator 활성화

승인 단계:
1단계: 직속 상사 승인
  - 타임아웃: 8시간
  - 에스컬레이션: 다음 승인자에게 자동 전달

2단계: 보안팀 승인
  - 위험 평가: Identity Protection 점수 확인
  - 위험 높음 시 자동 거부
  - 타임아웃: 4시간

3단계: CISO 승인 (Critical Roles만)
  - 근거 텍스트 검토
  - 비즈니스 시간 외 요청 시 추가 검증
  - 타임아웃: 24시간

구현 (PowerShell):
$settings = New-Object Microsoft.Open.MSGraph.Model.AzureADMSPrivilegedRoleSettings
$settings.ApprovalSettings = @{
    ApprovalMode = "Serial"
    ApprovalStages = @(
        @{
            ApprovalStageTimeOutInDays = 0.33  # 8시간
            Approvers = @(@{Id = "manager-group-id"; Type = "Group"})
            IsApproverJustificationRequired = $true
        },
        @{
            ApprovalStageTimeOutInDays = 0.17  # 4시간
            Approvers = @(@{Id = "security-team-id"; Type = "Group"})
            IsApproverJustificationRequired = $true
        },
        @{
            ApprovalStageTimeOutInDays = 1
            Approvers = @(@{Id = "ciso-id"; Type = "User"})
            IsApproverJustificationRequired = $true
        }
    )
}
```

### 4.2 PIM 감사 로그 분석

**감사 로그 스키마:**

```
로그 예시 (JSON):
{
  "activityDateTime": "2026-02-05T10:30:00Z",
  "activityDisplayName": "Add member to role completed (PIM activation)",
  "initiatedBy": {
    "user": {
      "id": "user-guid",
      "userPrincipalName": "john@contoso.com"
    }
  },
  "targetResources": [
    {
      "type": "Role",
      "displayName": "Global Administrator",
      "modifiedProperties": [
        {
          "displayName": "Role.ActivationDuration",
          "newValue": "PT4H"  // 4시간
        }
      ]
    }
  ],
  "additionalDetails": [
    {
      "key": "Justification",
      "value": "Emergency user account unlock"
    },
    {
      "key": "RequestType",
      "value": "Activation"
    },
    {
      "key": "AssignmentState",
      "value": "Active"
    },
    {
      "key": "Approver",
      "value": "manager@contoso.com"
    }
  ]
}
```

**KQL 쿼리 예시 (Log Analytics):**

```kusto
// 승인 없이 활성화된 역할 탐지
AuditLogs
| where TimeGenerated > ago(7d)
| where OperationName == "Add member to role completed (PIM activation)"
| extend Justification = tostring(AdditionalDetails[0].value)
| extend Approver = tostring(AdditionalDetails[3].value)
| where Approver == ""  // 승인자 없음
| project TimeGenerated, InitiatedBy, TargetResources, Justification
| order by TimeGenerated desc

// 비정상 시간대 활성화
AuditLogs
| where TimeGenerated > ago(30d)
| where OperationName contains "PIM activation"
| extend Hour = hourofday(TimeGenerated)
| where Hour < 7 or Hour > 20  // 업무 시간 외
| summarize Count=count() by InitiatedBy, bin(TimeGenerated, 1d)
| where Count > 3  // 비정상 빈도

// 평균 활성화 시간 분석
AuditLogs
| where OperationName == "Add member to role completed (PIM activation)"
| extend Duration = tostring(AdditionalDetails[0].value)
| extend DurationMinutes = toint(replace(@"PT(\d+)H", @"\1", Duration)) * 60
| summarize AvgDuration=avg(DurationMinutes), MaxDuration=max(DurationMinutes) 
    by Role=tostring(TargetResources[0].displayName)
| order by AvgDuration desc
```

## 5. 토큰 메커니즘 심화: 검증과 보안

### 5.1 JWT 서명 알고리즘과 키 롤링

**토큰 서명 프로세스:**

```
1. Entra ID가 토큰 페이로드 생성
{
  "aud": "api://myapp",
  "iss": "https://sts.windows.net/tenant-id/",
  "iat": 1234567890,
  "exp": 1234571490,
  "sub": "user-object-id",
  "roles": ["User.Read.All"]
}

2. RS256 알고리즘으로 서명
   - RSA 2048비트 프라이빗 키 사용
   - PKCS#1 v1.5 패딩
   - SHA-256 해시

3. JWT 구조
   Header:
   {
     "typ": "JWT",
     "alg": "RS256",
     "kid": "key-id-2024-02"  // 키 식별자
   }

   Payload: (위 페이로드)

   Signature:
   RSASSA-PKCS1-v1_5(
     SHA256(base64(header) + "." + base64(payload)),
     private_key
   )

4. 최종 토큰
   eyJ0eXAi...헤더.eyJhdWQ...페이로드.SflKxwR...서명
```

**키 롤링 전략:**

```
Entra ID 키 관리:

활성 키:
├─ Primary Key (kid: 2024-02)
│  - 생성: 2024-02-01
│  - 만료: 2024-08-01
│  - 상태: Active (서명용)
│
└─ Secondary Key (kid: 2024-01)
   - 생성: 2024-01-01
   - 만료: 2024-07-01
   - 상태: Validation Only (검증용)

롤링 프로세스:
1. 2024-07-15: 새 키 생성 (kid: 2024-03)
2. 2024-07-22: 2024-03을 Primary로 승격
3. 2024-07-22: 2024-02를 Secondary로 강등
4. 2024-08-01: 2024-02 만료, 폐기

클라이언트 영향:
- JWK Set 엔드포인트 자동 조회
- https://login.microsoftonline.com/common/discovery/keys
- 다중 키 검증 지원 (이전 키로 서명된 토큰도 유효)
```

### 5.2 토큰 재생 공격 방어

**문제: 토큰 탈취 후 재사용**

```
공격 시나리오:
1. 공격자가 네트워크 스니핑으로 Access Token 탈취
2. 탈취한 토큰으로 API 호출
3. 토큰이 유효하면 접근 성공
```

**방어 메커니즘:**

```
1. Token Binding (RFC 8473)
   토큰을 TLS 연결에 바인딩
   
   토큰 클레임 추가:
   {
     "cnf": {
       "x5t#S256": "thumbprint-of-cert"
     }
   }
   
   검증 과정:
   - 클라이언트가 TLS 핸드셰이크 시 인증서 제시
   - 서버가 토큰의 thumbprint와 비교
   - 불일치 시 거부

2. DPoP (Demonstrating Proof of Possession)
   토큰을 프라이빗 키와 연결
   
   요청 헤더:
   Authorization: DPoP <access_token>
   DPoP: <proof_jwt>
   
   Proof JWT:
   {
     "jti": "random-nonce",
     "htm": "POST",  // HTTP method
     "htu": "https://api.example.com/data",  // 요청 URL
     "iat": 1234567890,
     "ath": "SHA256(access_token)"  // 토큰 해시
   }
   
   - 매 요청마다 새로운 Proof 생성
   - 서버가 Proof 서명 검증
   - 재생 공격 불가

3. 토큰 리보케이션 (CAE)
   실시간 토큰 상태 확인
   (앞서 CAE 섹션 참조)
```

## 6. 관리 ID 심화: IMDS 프로토콜과 보안

### 6.1 IMDS 엔드포인트 상세

**Azure Instance Metadata Service (IMDS) 구조:**

```
IMDS 엔드포인트:
http://169.254.169.254/metadata/

특징:
- Link-local 주소 (VM 내부에서만 접근 가능)
- HTTP 프로토콜 (암호화 없음, 로컬 통신이므로 안전)
- 헤더 필수: Metadata: true

API 경로:
├─ /metadata/instance  # VM 메타데이터
├─ /metadata/identity  # 관리 ID 토큰
├─ /metadata/attested  # 증명 데이터
└─ /metadata/scheduledevents  # 유지보수 이벤트
```

**토큰 획득 프로세스:**

```
1. VM 내부 애플리케이션이 IMDS 호출
GET http://169.254.169.254/metadata/identity/oauth2/token?
  api-version=2018-02-01&
  resource=https://vault.azure.net
Headers:
  Metadata: true

2. IMDS가 VM의 관리 ID 확인
   - System-assigned: VM 속성에서 ID 조회
   - User-assigned: client_id 파라미터로 ID 특정

3. IMDS가 Entra ID에 토큰 요청
   - VM의 서비스 주체로 인증
   - resource 파라미터에 지정된 리소스용 토큰 발급

4. Entra ID가 토큰 발급
{
  "access_token": "eyJ0eXAi...",
  "expires_in": "3599",
  "expires_on": "1234567890",
  "resource": "https://vault.azure.net",
  "token_type": "Bearer"
}

5. IMDS가 토큰을 VM 애플리케이션에 반환

6. 애플리케이션이 토큰을 캐싱
   - 만료 시간 확인 (expires_on)
   - 만료 5분 전에 갱신
```

### 6.2 IMDS 보안 강화

**네트워크 격리 환경에서의 관리 ID:**

```
문제: Private Endpoint 사용 시 IMDS 접근 불가

해결: Azure Private Link for Entra ID (Preview)

아키텍처:
┌─────────────────────────────────────────┐
│ Azure VNet (10.0.0.0/16)                │
│                                         │
│ ┌─────────────────┐                    │
│ │ VM (10.0.1.4)   │                    │
│ │ - 관리 ID 활성화│                    │
│ └─────┬───────────┘                    │
│       │                                 │
│       │ IMDS 호출                       │
│       ▼                                 │
│ ┌──────────────────────────────┐       │
│ │ Private Endpoint             │       │
│ │ IP: 10.0.2.10                │       │
│ │ → login.microsoftonline.com  │       │
│ └──────────────┬───────────────┘       │
└────────────────┼───────────────────────┘
                 │
                 │ Private Link
                 ▼
        ┌────────────────────┐
        │ Entra ID (Azure)   │
        │ - 토큰 발급 서비스  │
        └────────────────────┘

DNS 설정:
login.microsoftonline.com → 10.0.2.10 (Private)
일반 퍼블릭 엔드포인트 차단
```

**IMDS 요청 속도 제한:**

```
제한 사항:
- 초당 최대 5회 토큰 요청
- 초과 시 HTTP 429 (Too Many Requests)

대응 전략:
1. 토큰 캐싱
   - 만료 시간 추적
   - 만료 5분 전에만 갱신

2. 지수 백오프
   재시도 간격: 1초 → 2초 → 4초 → 8초

3. 토큰 공유 (멀티 스레드 환경)
   - 싱글톤 패턴으로 토큰 관리자 구현
   - 모든 스레드가 동일한 토큰 인스턴스 사용

Python 구현 예시:
```python
import time
import threading
from datetime import datetime, timedelta

class ManagedIdentityToken:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
                    cls._instance._token = None
                    cls._instance._expires_on = None
        return cls._instance
    
    def get_token(self, resource):
        now = datetime.utcnow()
        
        # 토큰이 없거나 5분 내 만료 시 갱신
        if not self._token or \
           (self._expires_on - now) < timedelta(minutes=5):
            with self._lock:
                # Double-checked locking
                if not self._token or \
                   (self._expires_on - now) < timedelta(minutes=5):
                    self._token = self._fetch_token(resource)
        
        return self._token
    
    def _fetch_token(self, resource):
        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = requests.get(
                    "http://169.254.169.254/metadata/identity/oauth2/token",
                    params={"resource": resource, "api-version": "2018-02-01"},
                    headers={"Metadata": "true"},
                    timeout=2
                )
                
                if response.status_code == 429:
                    wait_time = 2 ** attempt  # 지수 백오프
                    time.sleep(wait_time)
                    continue
                
                response.raise_for_status()
                data = response.json()
                self._expires_on = datetime.fromtimestamp(int(data["expires_on"]))
                return data["access_token"]
                
            except requests.exceptions.Timeout:
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
        
        raise Exception("Failed to acquire token after retries")
```

## 7. Domain Services 심화: 복제와 성능

### 7.1 도메인 컨트롤러 복제 메커니즘

**복제 토폴로지:**

```
Entra Domain Services 복제 아키텍처:

[Azure Region: Korea Central]
┌─────────────────────────────────────┐
│ Replica Set 1                       │
│ ┌──────────┐      ┌──────────┐     │
│ │  DC1     │◄────►│  DC2     │     │
│ │ (Primary)│      │ (Replica)│     │
│ └────┬─────┘      └─────┬────┘     │
└──────┼──────────────────┼───────────┘
       │                  │
       │ (복제)           │
       │                  │
[Azure Region: US East]    │
┌──────┼──────────────────┼───────────┐
│ Replica Set 2            │          │
│ ┌────▼─────┐      ┌─────▼────┐     │
│ │  DC3     │◄────►│  DC4     │     │
│ │ (Replica)│      │ (Replica)│     │
│ └──────────┘      └──────────┘     │
└─────────────────────────────────────┘

복제 프로토콜:
- Active Directory Replication (RPC)
- 변경 알림 메커니즘 (Change Notification)
- 15분 주기 동기화 (기본값)
```

**복제 충돌 해결:**

```
시나리오: DC1과 DC3에서 동시에 동일 사용자 속성 수정

DC1: user.title = "Manager"  (USN: 100)
DC3: user.title = "Director" (USN: 102)

충돌 해결 규칙:
1. USN (Update Sequence Number) 비교
   → USN이 높은 값 우선 (Director 승리)

2. 타임스탬프 비교 (USN 동일 시)
   → 최신 타임스탬프 우선

3. GUID 비교 (타임스탬프 동일 시)
   → GUID가 큰 DC의 값 우선

4. 충돌 로그 기록
   Event ID 1308: "Replication conflict resolved"
```

### 7.2 LDAP 쿼리 최적화

**인덱싱 전략:**

Domain Services 기본 인덱스:
- sAMAccountName (Unique Index)
- userPrincipalName (Unique Index)
- mail
- displayName
- memberOf (특수: 링크 값 테이블)

**쿼리 성능 비교:**

| 쿼리 유형 | 인덱스 | 평균 속도 |
|----------|--------|----------|
| `(sAMAccountName=john)` | Yes | <10ms |
| `(displayName=John*)` | Yes | ~50ms |
| `(description=*test*)` | No | ~2000ms |
| `(objectClass=user)` | Yes | ~100ms |

**최적화 권장사항:**
1. 인덱스된 속성 우선 사용
2. 와일드카드는 접미사만 사용 (prefix* OK, *suffix 느림)
3. 서브트리 검색 대신 OneLevel 사용
4. 필요한 속성만 반환 (속성 목록 지정)
```

**페이징과 Continuation Token:**

```
대량 쿼리 시나리오: 10,000명 사용자 조회

비효율적:
SearchRequest(
  baseDN="DC=contoso,DC=com",
  filter="(objectClass=user)",
  scope=SUBTREE,
  sizeLimit=0  # 무제한
)
→ 메모리 부족, 타임아웃

효율적 (페이징):
1단계:
SearchRequest(
  ... (동일)
  controls=[PagedResultsControl(size=1000, cookie='')]
)
Response:
  entries: [user1, user2, ..., user1000]
  cookie: "AQAAABQAAAAxMjM0NTY..."

2단계:
SearchRequest(
  ... (동일)
  controls=[PagedResultsControl(size=1000, cookie=<이전 쿠키>)]
)

10번 반복하여 전체 조회
```

**LDAP 연결 풀링:**

```
문제: 매 쿼리마다 LDAP 연결 생성 → 오버헤드

해결: 연결 풀 사용

.NET 예시:
LdapConnection connection = new LdapConnection(
    new LdapDirectoryIdentifier("aaddscontoso.com", 389)
);
connection.SessionOptions.ProtocolVersion = 3;
connection.Timeout = TimeSpan.FromSeconds(30);

// 연결 풀 설정
connection.SessionOptions.TcpKeepAlive = true;
connection.SessionOptions.SendTimeout = TimeSpan.FromSeconds(30);

// 연결 재사용
connection.Bind(credentials);
for (int i = 0; i < 1000; i++)
{
    var request = new SearchRequest(/* ... */);
    var response = (SearchResponse)connection.SendRequest(request);
    // 처리
}
// 연결 유지 (폐기하지 않음)

성능 향상:
- 연결 없음: 평균 150ms/쿼리
- 연결 풀: 평균 15ms/쿼리
- 10배 향상
```

## 8. 마치며: 엔터프라이즈 운영 체크리스트

Entra ID와 Domain Services를 프로덕션 환경에서 안전하게 운영하려면 다음 체크리스트를 따르세요.

**보안 강화:**
- [ ] 조건부 액세스 정책 50개 이상 설계 (세분화된 제어)
- [ ] Identity Protection 활성화 및 위험 정책 구성
- [ ] PIM으로 모든 관리자 역할 전환 (영구 할당 제거)
- [ ] 관리 ID를 모든 Azure 리소스에 적용
- [ ] CAE 지원 앱 우선 사용
- [ ] MFA 강제 (레거시 인증 차단)

**성능 최적화:**
- [ ] LDAP 쿼리 인덱스 최적화
- [ ] 토큰 캐싱 전략 구현
- [ ] Domain Services 다중 지역 복제 설정
- [ ] 조건부 액세스 정책 수 최소화 (중복 제거)

**모니터링:**
- [ ] Log Analytics 워크스페이스 통합
- [ ] PIM 감사 로그 KQL 쿼리 구성
- [ ] 위험 탐지 알림 자동화
- [ ] 토큰 발급 이상 탐지 대시보드

**재해 복구:**
- [ ] Entra ID Connect 동기화 서버 이중화
- [ ] Domain Services 지역 간 복제 검증
- [ ] Break Glass 계정 설정 (2개 이상)
- [ ] 백업 MFA 방법 구성

다음 포스트에서는 **Entra Verified ID**, **Permissions Management**, **External ID**를 다룰 예정입니다!

> 참고: [Microsoft Learn, "Entra ID Best Practices"](https://learn.microsoft.com/ko-kr/entra/identity/)
