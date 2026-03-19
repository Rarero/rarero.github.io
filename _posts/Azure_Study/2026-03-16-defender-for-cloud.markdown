---
layout: post
title: "클라우드용 Microsoft Defender: ACR 이미지 스캔과 컨테이너 보안"
date: 2026-03-16 11:00:00 +0900
tags: [Study, Azure, Security, Defender for Cloud, Container, ACR, CSPM, CWPP, DevSecOps, Vulnerability]
categories: Azure_Study
---

이번 포스트에서는 **클라우드용 Microsoft Defender(Microsoft Defender for Cloud)**를 정리합니다. 이 기술을 검토하는 이유는 **ACR(Azure Container Registry) 이미지 취약점 스캔**을 실무에 적용하기 위함이며, 따라서 컨테이너 보안 영역에 중점을 두고 전체 서비스의 개요, 적용 범위, 구현 방법, 비용까지 다루겠습니다.

<br>

---

# 1. 클라우드용 Microsoft Defender 개요

## 1.1 Defender for Cloud란?

**Microsoft Defender for Cloud**는 Azure, AWS, GCP, 온프레미스를 아우르는 **클라우드 네이티브 애플리케이션 보호 플랫폼(CNAPP)**입니다. 하나의 서비스 안에 세 가지 핵심 축이 존재합니다.

| 축 | 역할 | 핵심 키워드 |
|---|---|---|
| **CSPM** (Cloud Security Posture Management) | 클라우드 구성 오류 탐지, 보안 점수 산출, 규정 준수 평가 | Secure Score, 벤치마크, 권장 사항 |
| **CWPP** (Cloud Workload Protection Platform) | 워크로드별 위협 탐지 및 취약점 관리 | Defender 플랜, 알림, 취약점 평가 |
| **DevSecOps** | 개발 파이프라인 보안(코드~배포) | IaC 스캔, CI/CD 통합, 이미지 스캔 |

> 참고: [Microsoft Learn, "What is Microsoft Defender for Cloud?"](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-cloud-introduction)

## 1.2 무료 vs 유료 (Foundational CSPM vs Defender 플랜)

Defender for Cloud는 **Azure 구독을 가진 모든 사용자**에게 기본(무료) 기능을 제공합니다.

| 구분 | Foundational CSPM (무료) | Defender CSPM / CWPP (유료) |
|---|---|---|
| **Secure Score** | ✅ | ✅ |
| **보안 권장 사항** | 기본 권장 사항 | 확장 권장 사항 + 공격 경로 분석 |1
| **자산 인벤토리** | ✅ | ✅ |
| **취약점 평가** | ❌ | ✅ (MDVM 기반) |
| **위협 탐지 알림** | ❌ | ✅ (플랜별) |
| **에이전트리스 스캔** | ❌ | ✅ |
| **공격 경로 분석** | ❌ | ✅ (Defender CSPM) |

> 참고: [Microsoft Learn, "Defender for Cloud pricing"](https://learn.microsoft.com/en-us/azure/defender-for-cloud/concept-cloud-security-posture-management)

<br>

---

# 2. Defender for Cloud로 할 수 있는 범위

## 2.1 전체 보호 플랜 맵

Defender for Cloud는 워크로드 유형별로 **개별 플랜**을 활성화하는 구조입니다. 필요한 플랜만 선택하여 비용을 제어할 수 있습니다.

| 플랜 | 보호 대상 | 주요 기능 |
|---|---|---|
| **Defender CSPM** | 클라우드 보안 태세 전체 | 공격 경로 분석, 에이전트리스 스캔, 거버넌스 |
| **Defender for Servers** | VM, Arc 서버 | 취약점 평가, EDR(MDE 통합), 파일 무결성 모니터링 |
| **Defender for Containers** | AKS, ACR, EKS, GKE | 이미지 취약점 스캔, 런타임 위협 탐지, K8s 감사 로그 |
| **Defender for Storage** | Storage Account | 맬웨어 스캔, 민감 데이터 탐지 |
| **Defender for Databases** | SQL, Cosmos DB, OSS DB | SQL 위협 탐지, 취약점 평가 |
| **Defender for App Service** | App Service | 웹앱 위협 탐지 |
| **Defender for Key Vault** | Key Vault | 비정상 접근 탐지 |
| **Defender for Resource Manager** | ARM 컨트롤 플레인 | 의심스러운 관리 작업 탐지 |
| **Defender for DNS** | DNS 쿼리 | 악성 도메인 통신 탐지 |
| **Defender for APIs** | API Management | API 위협 탐지 |

## 2.2 우리가 중점적으로 볼 영역: 컨테이너 보안

이번 검토의 핵심은 **Defender for Containers** 플랜입니다. 이 플랜 하나로 컨테이너 라이프사이클 전체(Build → Registry → Runtime)를 보호할 수 있습니다.

### 컨테이너 보안 보호 범위

```
┌─────────────────────────────────────────────────────────────┐
│                  Defender for Containers                     │
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Build   │───▶│   Registry   │───▶│    Runtime       │   │
│  │          │    │   (ACR)      │    │    (AKS)         │   │
│  │ CI/CD    │    │              │    │                  │   │
│  │ 파이프라인  │    │ 이미지 스캔     │    │ 런타임 위협 탐지 │   │
│  │ 이미지     │    │ 취약점 평가     │    │ K8s 감사 로그    │   │
│  │ 스캔      │    │ 맬웨어 탐지     │    │ 네트워크 정책    │   │
│  └──────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

<br>

---

# 3. 핵심: ACR 이미지 스캔 (컨테이너 취약점 평가)

## 3.1 작동 방식

Defender for Containers를 활성화하면 ACR에 저장된 컨테이너 이미지에 대한 **취약점 평가(Vulnerability Assessment)**가 자동으로 수행됩니다.

### 스캔 엔진: MDVM (Microsoft Defender Vulnerability Management)

기존 Qualys 기반 스캐너는 **사용 중단(deprecated)** 되었으며, 현재는 **MDVM(Microsoft Defender Vulnerability Management)** 엔진으로 전환되었습니다.

| 항목 | MDVM (현재) |
|---|---|
| **스캔 트리거** | 이미지 Push 시 + 주기적 재스캔 (24시간마다) |
| **스캔 방식** | 에이전트리스 (ACR에서 직접 스캔) |
| **OS 패키지** | ✅ (Debian, Ubuntu, RHEL, Alpine, Windows 등) |
| **언어 패키지** | ✅ (Python, Node.js, .NET, Java, Go, Ruby, Rust, PHP) |
| **CVE 데이터베이스** | Microsoft 위협 인텔리전스 + NVD |
| **악용 가능성 정보** | ✅ (EPSS, 실제 exploit 여부 등 우선순위 산정) |
| **결과 확인** | Defender for Cloud 포털, Azure Resource Graph, API |

> 참고: [Microsoft Learn, "Container vulnerability assessment powered by MDVM"](https://learn.microsoft.com/en-us/azure/defender-for-cloud/agentless-vulnerability-assessment-azure)

### 스캔 흐름

```
개발자가 이미지 Push
        │
        ▼
   ACR에 이미지 저장
        │
        ▼
  Defender가 이미지 감지
        │
        ▼
  MDVM 엔진이 에이전트리스 스캔 수행
   ├─ OS 패키지 취약점 확인
   ├─ 언어 패키지 취약점 확인
   └─ 맬웨어 시그니처 확인
        │
        ▼
  결과를 Defender for Cloud에 보고
   ├─ 보안 권장 사항으로 표시
   ├─ 심각도별 분류 (Critical/High/Medium/Low)
   └─ 수정 가이드 제공
```

## 3.2 ACR 이미지 스캔이 커버하는 것과 커버하지 못하는 것

| 커버하는 것 | 커버하지 못하는 것 |
|---|---|
| OS 패키지 CVE (apt, yum, apk 등) | 애플리케이션 로직 취약점 |
| 언어 의존성 CVE (pip, npm, NuGet 등) | 커스텀 바이너리 내부 취약점 |
| 알려진 맬웨어 시그니처 | 제로데이(알려지지 않은 취약점) |
| Base 이미지 취약점 | 런타임에서만 드러나는 구성 문제 |
| 이미지 레이어별 분석 | Dockerfile 자체의 보안 모범 사례 위반 |

## 3.3 런타임 보호 (AKS)

ACR 스캔이 "배포 전 검사"라면, **런타임 보호**는 "배포 후 감시"입니다. Defender for Containers는 AKS 클러스터에서 다음을 추가로 제공합니다.

| 기능 | 설명 |
|---|---|
| **K8s 감사 로그 분석** | Kubernetes API 서버의 감사 로그를 분석하여 의심스러운 활동 탐지 |
| **런타임 위협 탐지** | 컨테이너 내부의 프로세스 수준 위협 탐지 (Defender 센서 기반) |
| **K8s 보안 권장 사항** | RBAC 과다 권한, 특권 컨테이너, 호스트 네트워크 사용 등 감지 |
| **바이너리 드리프트 탐지** | 이미지에 없던 실행 파일이 런타임에 생성/실행되면 알림 |
| **네트워크 이상 탐지** | 비정상적인 네트워크 통신 패턴 감지 |

> Defender 센서는 AKS 노드에 **DaemonSet**으로 배포됩니다. Defender for Containers 플랜 활성화 시 자동 배포 옵션을 선택할 수 있습니다.

<br>

---

# 4. 실무 적용 방법

## 4.1 Defender for Containers 활성화

### 방법 1: Azure Portal

1. **Azure Portal** → **Microsoft Defender for Cloud** → **환경 설정(Environment settings)**
2. 대상 **구독(Subscription)** 선택
3. **Defender 플랜(Defender plans)** 탭 → **Containers** 플랜을 **On**으로 전환
4. 설정(Settings)에서 세부 옵션 확인:
   - **에이전트리스 이미지 스캔**: ✅ (ACR 이미지 스캔용, 기본 활성화)
   - **Defender 센서**: ✅ (AKS 런타임 보호용)
   - **Azure Policy for Kubernetes**: ✅ (K8s 보안 권장 사항용)

### 방법 2: Azure CLI

```bash
# 구독에 Defender for Containers 플랜 활성화
az security pricing create \
  --name Containers \
  --tier Standard

# 활성화 상태 확인
az security pricing show \
  --name Containers
```

### 방법 3: Terraform

```hcl
resource "azurerm_security_center_subscription_pricing" "containers" {
  tier          = "Standard"
  resource_type = "Containers"
}
```

### 방법 4: Bicep

```bicep
resource defenderContainers 'Microsoft.Security/pricings@2024-01-01' = {
  name: 'Containers'
  properties: {
    pricingTier: 'Standard'
  }
}
```

## 4.2 ACR 이미지 스캔 결과 확인

### Portal에서 확인

1. **Defender for Cloud** → **권장 사항(Recommendations)**
2. 다음 권장 사항을 검색:
   - `Container registry images should have vulnerability findings resolved`
3. 해당 권장 사항 클릭 → 영향받는 리소스(ACR, 이미지)별 상세 내역 확인

### Azure Resource Graph 쿼리로 확인

대량의 이미지 스캔 결과를 프로그래밍 방식으로 조회할 때 유용합니다.

```kusto
securityresources
| where type == "microsoft.security/assessments/subassessments"
| where properties.id contains "containerRegistryVulnerabilityAssessment"
| extend
    imageDigest = tostring(properties.additionalData.imageDigest),
    repository = tostring(properties.additionalData.repositoryName),
    registry = tostring(properties.additionalData.registryHost),
    severity = tostring(properties.status.severity),
    cveId = tostring(properties.id),
    description = tostring(properties.description),
    patchable = tostring(properties.additionalData.patchable)
| project registry, repository, imageDigest, cveId, severity, patchable, description
| order by severity asc
```

### CI/CD 파이프라인 통합 (Azure DevOps / GitHub Actions)

**빌드 단계에서 이미지를 스캔**하여 취약점이 있는 이미지가 ACR에 Push되기 전에 차단할 수 있습니다.

```yaml
# GitHub Actions 예시: Microsoft Defender for DevOps 통합
name: Container Image Scan

on:
  push:
    branches: [main]

jobs:
  build-and-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Login to ACR
        uses: azure/docker-login@v1
        with:
          login-server: myregistry.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Push to ACR
        run: |
          docker tag myapp:${{ github.sha }} myregistry.azurecr.io/myapp:${{ github.sha }}
          docker push myregistry.azurecr.io/myapp:${{ github.sha }}

      # Push 후 Defender가 자동으로 스캔
      # 결과는 Defender for Cloud 포털 및 Resource Graph에서 확인
```

> **참고:** Defender for DevOps를 통해 GitHub/Azure DevOps와 직접 연동하면, PR 단계에서 스캔 결과를 코멘트로 받아볼 수도 있습니다.
> [Microsoft Learn, "Overview of Defender for DevOps"](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-devops-introduction)

## 4.3 알림(Alert) 및 대응 구성

### 알림 규칙 설정

Defender for Cloud의 보안 알림을 실시간으로 받으려면 **알림 규칙(Alert rules)**을 구성합니다.

1. **Defender for Cloud** → **보안 알림(Security alerts)** → **알림 규칙 만들기**
2. 이메일, Logic App, Webhook, ITSM 도구 등으로 알림 라우팅 가능
3. **심각도별 필터링**: Critical/High만 즉각 대응, Medium/Low는 주기적 리뷰

### 워크플로 자동화 예시

```
취약점 발견 (Critical)
    │
    ▼
Defender 보안 알림 생성
    │
    ▼
Logic App / Azure Function 트리거
    │
    ├──▶ Teams/Slack 채널에 알림 전송
    ├──▶ Jira/ServiceNow 티켓 자동 생성  
    └──▶ ACR 이미지에 Quarantine 태그 적용 (자동 격리)
```

<br>

---

# 5. 비용

## 5.1 Defender for Containers 가격 구조

Defender for Containers는 **두 가지 과금 축**으로 구성됩니다.

| 과금 항목 | 단위 | 가격 (참고가) | 설명 |
|---|---|---|---|
| **vCore 시간** | vCore/시간 | ~$0.0095/vCore/시간 | AKS 노드의 vCore 수 × 사용 시간 기준 |
| **이미지 스캔** | 이미지 초과분/건 | 20개/구독/월 무료, 초과 시 건당 ~$0.29 | ACR에 저장된 고유 이미지 기준 |

> ⚠️ **가격은 리전 및 시점에 따라 변동**될 수 있습니다. 반드시 [공식 가격 페이지](https://azure.microsoft.com/en-us/pricing/details/defender-for-cloud/)에서 최신 가격을 확인하세요.

### 가격 시뮬레이션 예시

**시나리오**: AKS 클러스터 3대 (각 4 vCore 노드 × 3개 = 총 36 vCore), ACR 이미지 50개

| 항목 | 계산 | 월 예상 비용 |
|---|---|---|
| vCore 시간 | 36 vCore × 730시간 × $0.0095 | ~$249.66 |
| 이미지 스캔 | (50 - 20 무료) × $0.29 | ~$8.70 |
| **합계** | | **~$258.36/월** |

## 5.2 다른 플랜과의 비용 비교 (참고)

| 플랜 | 과금 기준 | 대략적 월 비용 |
|---|---|---|
| Defender CSPM | 청구 가능 리소스 수 기준 | ~$5/서버/월 |
| Defender for Servers P2 | 서버 수 | ~$15/서버/월 |
| **Defender for Containers** | **vCore 시간 + 이미지 수** | **위 시뮬레이션 참조** |
| Defender for Storage | 트랜잭션 수 + 스토리지 크기 | ~$10/스토리지 계정/월 |

## 5.3 비용 최적화 팁

- **필요한 플랜만 활성화**: 예를 들어, ACR 이미지 스캔만 필요하면 Defender for Containers만 켜고 다른 플랜은 Off 유지
- **비프로덕션 구독 분리**: 개발/스테이징 구독에서는 Defender를 끄거나 Foundational CSPM(무료)만 사용
- **이미지 정리**: 사용하지 않는 이미지를 ACR에서 제거하여 스캔 대상 이미지 수를 줄임
- **스캔 제외 규칙 활용**: 특정 레지스트리/리포지토리를 스캔 제외 가능
- **Azure Advisor 모니터링**: Defender 관련 비용 권장 사항을 주기적으로 확인

<br>

---

# 6. 정리: 실무 도입 판단 기준

## ACR 이미지 스캔을 도입해야 하는 경우

| 판단 기준 | 설명 |
|---|---|
| ✅ ACR에 컨테이너 이미지를 저장하고 AKS로 배포하는 워크로드가 있다 | 핵심 대상 |
| ✅ 규정 준수(컴플라이언스) 요구사항이 있다 | ISO 27001, SOC 2 등에서 취약점 관리 요구 |
| ✅ 보안 사고 사전 예방이 필요하다 | 알려진 CVE를 포함한 이미지가 프로덕션에 배포되는 것을 방지 |
| ✅ DevSecOps 파이프라인을 구축하려 한다 | CI/CD에서 취약점 게이트를 추가 |

## 도입 시 고려사항

| 항목 | 내용 |
|---|---|
| **비용** | 이미지 수와 AKS 노드 규모에 따라 비용이 달라지므로 사전 산정 필요 |
| **오탐(False Positive)** | 일부 CVE는 실제 영향이 없을 수 있으므로, 심각도 + 악용 가능성 기반으로 우선순위 판단 |
| **기존 도구와의 중복** | Trivy, Snyk 등 이미 사용 중인 스캔 도구가 있다면 역할 중복 여부 검토 |
| **스캔 주기** | Push 시 + 24시간 주기 재스캔이 기본이므로, 긴급 CVE 대응에는 수동 재스캔이 필요할 수 있음 |

<br>

---

# 참고 자료

| 주제 | 링크 |
|---|---|
| Defender for Cloud 개요 | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-cloud-introduction) |
| Defender for Containers 개요 | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-introduction) |
| MDVM 기반 컨테이너 취약점 평가 | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/defender-for-cloud/agentless-vulnerability-assessment-azure) |
| Defender for Cloud 가격 | [Azure Pricing](https://azure.microsoft.com/en-us/pricing/details/defender-for-cloud/) |
| Defender for DevOps | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-devops-introduction) |
| Defender 센서 (AKS) | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-cloud-glossary#defender-sensor) |
