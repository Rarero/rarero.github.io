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

## 1. 조건부 액세스 (Conditional Access)

**조건부 액세스란?**

조건부 액세스는 **제로 트러스트 보안 모델**의 핵심 구성 요소로, 사용자가 클라우드 앱에 접근할 때 **누가(Who), 어디서(Where), 무엇을(What), 어떻게(How)** 접근하는지를 평가하여 액세스를 허용하거나 차단하는 정책 기반 접근 제어 시스템입니다.

**핵심 개념:**

```
조건부 액세스 = 신호 평가 + 의사 결정 + 제어 적용

신호 (Signals):
• 사용자/그룹 멤버십
• IP 위치 정보
• 디바이스 상태 (관리됨/비관리됨)
• 애플리케이션
• 실시간 위험 탐지

의사 결정 (Decision):
• 액세스 차단
• 액세스 허용
• 추가 요구사항 (MFA, 디바이스 준수 등)

제어 (Controls):
• Grant: MFA, 규정 준수 디바이스, 승인된 앱
• Session: 로그인 빈도, 앱 제한, 영구 브라우저 세션
```

**왜 필요한가?**

전통적인 경계 기반 보안(방화벽, VPN)은 클라우드 시대에 한계가 있습니다:
- 사용자가 어디서든(집, 카페, 해외) 접근
- BYOD(Bring Your Own Device) 증가
- SaaS 앱의 폭발적 증가
- 내부자 위협 및 자격 증명 탈취 공격

조건부 액세스는 **컨텍스트 기반 동적 제어**를 통해 이러한 문제를 해결합니다.

> **실무 예시:**
> - 사무실 내부에서는 자유롭게 접근, 외부에서는 MFA 요구
> - 재무 데이터는 회사 관리 디바이스에서만 접근 허용
> - 위험한 로그인 시도는 즉시 차단하고 관리자에게 알림

<br>

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

### 1.2 정책 조합과 충돌 해결

**복수 정책 적용 시 처리 방식:**

조건부 액세스에서는 여러 정책이 동시에 적용될 수 있으며, 이때 다음 규칙에 따라 처리됩니다:

1. **Block 우선 원칙**
   - 단 하나라도 "차단" 제어가 충족되면 즉시 접근 거부
   - 나머지 정책은 평가하지 않음 (성능 최적화)

2. **Grant 요구사항 누적**
   - 모든 Grant 정책의 요구사항이 AND로 결합
   - 예: 정책A(MFA) + 정책B(디바이스 준수) = MFA **그리고** 디바이스 준수 모두 필요

3. **Session 제어 병합**
   - 가장 제한적인 값 적용
   - 예: 정책A(로그인 빈도 8시간) + 정책B(로그인 빈도 4시간) = **4시간** 적용

**실무 적용 예시:**

```
시나리오: 위험 기반 적응형 접근 제어

정책 계층:
1. 높은 위험 → 즉시 차단 (Block 우선)
2. 중간 위험 → MFA 요구 (Grant)
3. 낮은 위험 + 외부 위치 → 관리 디바이스 필요 (Grant)

평가 예시:
• 높은 위험 탐지 → 1번 정책 차단 (즉시 종료)
• 중간 위험 + 사무실 → 2번 정책 MFA 요구
• 낮은 위험 + VPN → 3번 정책 관리 디바이스 검증
• 중간 위험 + 외부 → 2번+3번 누적 (MFA **그리고** 관리 디바이스)
```

**정책 설계 베스트 프랙티스:**

- **명확한 범위 설정**: 포함/제외 그룹을 명확히 구분하여 의도하지 않은 적용 방지
- **테스트 모드 활용**: 보고서 전용 모드로 먼저 영향도 분석
- **예외 관리**: Break Glass 계정은 모든 정책에서 제외
- **정책 수 최소화**: 유사한 조건은 하나의 정책으로 통합하여 성능 향상

### 1.3 세션 제어: 실시간 접근 관리

조건부 액세스의 **세션 제어**는 로그인 성공 후에도 지속적으로 사용자 활동을 제어합니다. 토큰에 특수 클레임을 주입하여 구현됩니다.

**주요 세션 제어 유형:**

1. **애플리케이션 적용 제한 (App Enforced Restrictions)**
   - SharePoint/Exchange에 다운로드, 인쇄, 복사 제한 적용
   - 토큰 클레임: `"xms_cc": ["CP1"]` 주입
   - 앱이 클레임을 읽고 제한 기능 활성화

2. **로그인 빈도 (Sign-in Frequency)**
   - Refresh Token 수명을 단축하여 주기적 재인증 강제
   - 민감한 앱 접근 시 자주 재인증 (예: 1시간마다)

3. **영구 브라우저 세션 (Persistent Browser Session)**
   - "로그인 상태 유지" 옵션 제어
   - 공용 디바이스에서는 항상 비활성화

**지속적 액세스 평가 (Continuous Access Evaluation, CAE)**

CAE는 기존 토큰 모델의 **시간 지연 문제**를 해결합니다.

```
기존 방식의 문제:
Access Token 수명 1시간 → 계정 비활성화해도 토큰 유효 시 1시간 접근 가능

CAE 해결책:
1. 장기 토큰 발급 (24시간) + 실시간 이벤트 모니터링
2. 중요 이벤트 발생 시 **즉시** 토큰 무효화:
   • 계정 비활성화/삭제
   • 비밀번호 재설정
   • 관리자 세션 취소
   • IP 위치 급변 (불가능한 여행)
3. 리소스 서버가 매 요청마다 이벤트 확인
4. 무효화 감지 시 HTTP 401 + 재인증 요구

결과: 보안 이벤트 대응 시간 1시간 → 즉시 (수초 내)
```

**지원 서비스:** Microsoft Graph, SharePoint, Exchange, Teams  
**제한사항:** 레거시 인증(POP3, IMAP, SMTP) 미지원

### 1.4 정책 평가 최적화

**평가 순서와 성능:**

조건부 액세스 엔진은 수백 개의 정책을 효율적으로 처리하기 위해 다음과 같이 최적화됩니다:

1. **정책 필터링 (Policy Filtering)**
   - 사용자/그룹/앱 범위로 먼저 필터링 → 불필요한 정책 제외
   - 해시 테이블 기반 O(1) 조회로 성능 최적화

2. **Block 정책 우선 평가**
   - 차단 정책을 먼저 평가하여 조기 종료
   - 평균 평가 시간: 50-150ms

3. **신호 캐싱**
   - 그룹 멤버십: 5분 캐시
   - 디바이스 준수 상태: 5분 캐시
   - 위치 정보: 1시간 캐시

4. **병렬 신호 수집**
   - 디바이스 상태, 위험 점수, 그룹 멤버십을 동시 조회
   - 대기 시간 최소화

**정책 설계 권장사항:**

- 정책 수는 50개 이하로 유지 (성능 고려)
- 유사한 조건은 하나의 정책으로 통합
- 포함/제외 그룹을 명확히 구분
- 보고서 전용 모드로 영향도 사전 테스트

## 2. Identity Protection: ML 기반 위험 탐지

**Identity Protection이란?**

Entra ID Identity Protection은 **머신러닝 기반 위험 탐지 서비스**로, 사용자 로그인 및 계정 활동에서 의심스러운 패턴을 실시간으로 식별하고 자동으로 대응합니다.

**핵심 기능:**

```
1. 위험 탐지 (Risk Detection)
   자동 탐지 항목:
   • 익명 IP 주소 (Tor, VPN)
   • 비정형 여행 (불가능한 거리/시간)
   • 맬웨어 연결 IP 주소
   • 유출된 자격 증명
   • 비정상적인 로그인 속성
   • 암호 스프레이 공격

2. 위험 수준 분류
   • 사용자 위험: 계정 자체가 손상되었을 가능성
   • 로그인 위험: 해당 로그인 시도가 의심스러울 가능성
   • 위험 레벨: 낮음(0-30), 중간(31-65), 높음(66-100)

3. 위험 기반 정책
   • 조건부 액세스와 통합
   • 위험 수준에 따라 자동 응답 (MFA, 차단, 비밀번호 변경)
   • Self-service 위험 복구 (사용자가 MFA로 자가 복구)
```

**작동 원리:**

```
사용자 로그인 시도
    ↓
[신호 수집] IP, 위치, 디바이스, 시간, 행동 패턴
    ↓
[ML 모델 분석] 40차원 특징 벡터 기반 위험 점수 계산
    ↓
[위험 평가] 낮음 / 중간 / 높음
    ↓
[자동 응답]
├─ 낮음: 정상 로그인 허용
├─ 중간: MFA 요구
└─ 높음: 차단 + 관리자 알림
```

**왜 중요한가?**

전통적인 룰 기반 보안은 새로운 공격 패턴에 취약합니다. Identity Protection은:
- **실시간 위협 탐지**: 수백만 로그인 데이터 학습
- **Microsoft 글로벌 위협 인텔리전스** 활용
- **자동화된 응답**: 관리자 개입 없이 즉시 대응
- **오탐 최소화**: 사용자 행동 프로파일링으로 정확도 향상

> **실무 효과:**
> - 자격 증명 탈취 공격 99% 자동 차단
> - 관리자 수동 검토 시간 80% 감소
> - 사용자 불편 최소화 (정상 사용자는 MFA만 요구)

<br>

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

## 3. 역할 기반 액세스 제어 (RBAC)

**Entra ID RBAC란?**

RBAC(Role-Based Access Control)는 사용자에게 **역할**을 할당하여 관리 권한을 제어하는 시스템입니다. "누가 무엇을 할 수 있는가"를 정의하여 최소 권한 원칙(Principle of Least Privilege)을 구현합니다.

**핵심 구성 요소:**

```
RBAC = 보안 주체 + 역할 정의 + 범위

1. 보안 주체 (Security Principal)
   • 사용자: john@contoso.com
   • 그룹: IT Admins
   • 서비스 주체: 앱 등록
   • 관리 ID: Azure VM의 시스템 할당 ID

2. 역할 정의 (Role Definition)
   기본 제공 역할 (60+ 개):
   • Global Administrator: 모든 권한
   • User Administrator: 사용자 관리
   • Application Administrator: 앱 등록 관리
   • Security Reader: 보안 정보 읽기
   
   사용자 지정 역할:
   • 세밀한 권한 조합 (예: 그룹만 읽기)

3. 범위 (Scope)
   • 테넌트 전체 (/)
   • 관리 단위 (AU)
   • 특정 리소스 (앱, 그룹 등)
```

**RBAC vs 전통적인 권한 관리:**

| 전통 방식 | Entra ID RBAC |
|----------|---------------|
| 사용자별 개별 권한 할당 | 역할 기반 그룹 할당 |
| 권한 변경 시 모든 사용자 수정 | 역할 정의만 수정 |
| 감사 복잡 | 역할 할당 로그로 추적 |
| 퇴사 시 권한 누락 위험 | 그룹 제거로 일괄 회수 |

**왜 중요한가?**

부적절한 권한 관리는 보안 사고의 주요 원인입니다:
- **과도한 권한**: 일반 사용자가 Global Admin 권한 → 내부자 위협
- **권한 누적**: 부서 이동 시 이전 권한 미회수 → 권한 확대
- **감사 부재**: 누가 언제 무엇을 했는지 추적 불가

RBAC는 이를 해결합니다:
- **최소 권한**: 필요한 만큼만 부여
- **분리된 관리**: 지역/부서별 권한 위임
- **감사 가능**: 모든 역할 할당 로그 기록

> **실무 예시:**
> - HR 팀: User Administrator 역할 (HR 부서 사용자만)
> - 헬프데스크: Password Administrator 역할 (비밀번호 재설정만)
> - 보안팀: Security Administrator 역할 (조건부 액세스 정책 관리)

<br>

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

## 4. Privileged Identity Management (PIM)

**PIM이란?**

PIM(Privileged Identity Management)은 **Just-In-Time(JIT) 관리자 권한 관리 서비스**로, 높은 권한을 가진 역할을 "필요한 시간에만" 활성화하여 보안 위험을 최소화합니다.

**핵심 개념:**

```
전통적 방식:              PIM 방식:
사용자 → 영구 Admin 권한   사용자 → 적격(Eligible) 역할
         24/7 노출                  ↓
         공격 위험              필요 시 활성화 요청
                                    ↓
                                MFA + 승인 + 근거
                                    ↓
                                시간 제한 활성화 (1-8시간)
                                    ↓
                                자동 만료 → 적격 상태로 복귀
```

**역할 할당 유형:**

1. **적격 할당 (Eligible)**
   - 권한 없음 (평상시)
   - 활성화 시에만 권한 부여
   - MFA, 승인, 근거 입력 필요
   - 대부분의 관리자 역할에 권장

2. **활성 할당 (Active)**
   - 즉시 권한 사용 가능
   - 시간 제한 설정 가능
   - Break Glass 계정용

**PIM 워크플로:**

```
1. 역할 활성화 요청
   사용자가 "Global Admin" 역할 활성화 요청
   • 활성화 기간: 4시간
   • 근거: "긴급 서비스 복구 작업"
   ↓
2. 정책 검증
   • MFA 요구됨? → Authenticator 앱 승인
   • 승인 필요? → 상사에게 승인 요청 전송
   • 최대 기간 초과? → 거부
   ↓
3. 승인 프로세스 (옵션)
   • 승인자: 상사, 보안팀, CISO
   • 타임아웃: 8시간 (자동 거부)
   • 에스컬레이션: 다음 승인자에게 전달
   ↓
4. 역할 활성화
   • 4시간 동안 Global Admin 권한 부여
   • 모든 활동 감사 로그 기록
   ↓
5. 자동 만료
   • 4시간 후 권한 자동 제거
   • 적격 상태로 복귀
```

**보안 이점:**

| 지표 | 영구 권한 | PIM 적용 |
|------|-----------|----------|
| 권한 노출 시간 | 24시간 × 365일 = 8,760시간/년 | 주 1회 × 4시간 = 208시간/년 |
| 노출 감소율 | - | **97.6% 감소** |
| 무단 사용 위험 | 높음 (자격 증명 탈취 시 즉시 악용) | 낮음 (MFA + 승인 필요) |
| 감사 추적 | 제한적 | 모든 활성화 로그 기록 |

**왜 필요한가?**

관리자 권한은 조직의 가장 중요한 공격 표적입니다:
- **자격 증명 탈취**: 피싱으로 Global Admin 계정 탈취 → 전체 테넌트 장악
- **내부자 위협**: 퇴사한 직원의 영구 권한 미회수 → 데이터 유출
- **권한 남용**: 정당한 이유 없는 권한 사용 → 감사 실패

PIM은 이를 방어합니다:
- **Zero Standing Privilege**: 평상시 권한 없음
- **승인 기반 제어**: 권한 사용 시 이유와 승인 필요
- **시간 제한**: 최소 필요 시간만 활성화
- **완전한 감사**: 누가, 언제, 왜, 얼마나 권한을 사용했는지 기록

> **실무 적용:**
> - Global Administrator: 모두 적격 할당, 승인 필수
> - User Administrator: 적격 할당, MFA만 요구
> - Security Reader: 활성 할당 (읽기 전용은 위험 낮음)
> - Break Glass 계정: 활성 할당 (긴급 상황용)

<br>

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
