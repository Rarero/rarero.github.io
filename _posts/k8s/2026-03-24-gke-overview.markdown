---
layout: post
title: "[GKE] Google Kubernetes Engine 개요 및 주요 기능 정리"
date: 2026-03-24 09:00:00 +0900
tags: [Kubernetes, GKE, GCP, Google Cloud, Fleet, Connect Gateway, Connect Agent, Release Channel, Cloud Build, Cloud Deploy, Artifact Registry, Container Registry, CI/CD]
categories: k8s
---

이 문서는 **GCP(Google Cloud Platform)**의 관리형 Kubernetes 서비스인 **GKE(Google Kubernetes Engine)**의 개요와 주요 기능들을 팀 내부 공유 목적으로 정리한 문서입니다. 이후 NKS(Naver Kubernetes Service) 문서와 비교표 문서가 이어질 예정입니다.

<br>

---

# 1. GKE란?

**Google Kubernetes Engine(GKE)**은 Kubernetes 오픈소스 컨테이너 오케스트레이션 플랫폼의 **관리형(Managed) 구현**입니다.

Google은 사내 클러스터 관리 시스템인 **Borg**에서 대규모로 프로덕션 워크로드를 운영해 온 수년간의 경험을 바탕으로 Kubernetes를 개발했으며, GKE는 이 노하우가 집약된 서비스입니다. GKE를 사용하면 Google Cloud의 인프라를 사용하여 컨테이너화된 애플리케이션을 대규모로 배포하고 운영할 수 있습니다.

> **핵심 포인트**: GKE 환경은 그룹화되어 클러스터를 형성하는 **Compute Engine VM(노드)**으로 구성됩니다. 앱(워크로드)을 컨테이너로 패키지화하고, 컨테이너 모음을 노드에 **포드(Pod)**로 배포한 뒤, **Kubernetes API**를 사용하여 관리·확장·모니터링합니다.

<br>

---

# 2. GKE를 사용해야 하는 경우

GKE는 **네트워킹, 확장, 하드웨어, 보안** 등 컨테이너화된 앱을 실행하는 인프라를 구성할 수 있는 플랫폼이 필요한 경우에 적합합니다. GKE는 컨트롤 플레인 및 노드와 같은 많은 기본 구성요소를 관리하면서 Kubernetes의 운영 능력을 제공합니다.

## 2.1 GKE의 이점

| 이점 분류 | 상세 내용 |
|-----------|----------|
| **플랫폼 관리** | - Autopilot 모드의 완전 관리형 노드 (강화 및 권장사항 자동 적용)<br>- 출시 채널(Release Channel)을 통한 관리형 업그레이드 환경<br>- 유연한 유지보수 기간 및 제외 설정<br>- Standard 모드에서의 세분화된 노드 풀 제어 |
| **보안 상황 개선** | - Container-Optimized OS 기반 강화 노드<br>- 보안 조치 기본 제공, 정책 컨트롤러<br>- 자동 업그레이드를 통한 최신 보안 패치 적용<br>- 보안 상태 대시보드<br>- Google Cloud Observability 통합 (로깅/모니터링) |
| **비용 최적화** | - Autopilot: 실행 중인 포드에서 요청하는 리소스에 대한 요금만 부과<br>- Standard: 노드의 모든 리소스에 대한 요금 청구<br>- **Spot Pod** 지원 (내결함성 워크로드 비용 절감)<br>- Autopilot 모드의 운영 오버헤드 최소화 |
| **안정성과 가용성** | - **>99% 월별 업타임 SLO**<br>- Autopilot 클러스터의 포드 수준 SLA<br>- 리전 클러스터의 고가용성 컨트롤 플레인 및 워커 노드<br>- 지원 중단 사전 예방적 모니터링 및 추천<br>- 멀티 클러스터 서비스 기능 |

## 2.2 GKE 사용 사례

| 사용 사례 | 설명 |
|-----------|------|
| AI 및 ML 작업 | GPU/TPU 기반 모델 학습·서빙, LLM 배포 |
| 대규모 데이터 처리 | 규모에 맞는 배치/스트리밍 데이터 파이프라인 |
| 확장 가능한 온라인 게임 플랫폼 | Agones 기반 게임 서버 오케스트레이션 |
| 과부하 발생 시 안정적인 애플리케이션 | HPA/VPA 기반 자동 확장 |

<br>

---

# 3. GKE 작업 모드: Autopilot vs Standard

GKE에는 **Autopilot**과 **Standard** 두 가지 작업 모드가 있습니다.

| 구분 | Autopilot 모드 | Standard 모드 |
|------|---------------|---------------|
| **노드 관리** | Google Cloud가 완전 관리 | 사용자가 노드 풀 직접 관리 |
| **노드 OS** | Container-Optimized OS 고정 | 사용자가 선택 가능 |
| **과금 방식** | 실행 중인 포드의 요청 리소스 기준 | 노드(VM) 전체 리소스 기준 |
| **노드 접근** | gcloud/콘솔에서 기본 VM 접근 불가 | SSH로 기본 VM 직접 접근 가능 |
| **머신 선택** | 컴퓨팅 클래스 요청 → GKE가 자동 프로비저닝 | 노드 풀 생성 시 머신 유형 선택·구성 |
| **자동 복구/업그레이드** | 완전 자동 | 자동 업그레이드·복구 기본 활성화 (비활성화 가능) |
| **권장 대상** | 대부분의 워크로드 (Google 권장) | 노드 풀·클러스터 수동 관리가 필요한 특수 요구사항 |

> **권장사항**: Google은 **Autopilot 모드** 사용을 권장합니다. 노드를 Google Cloud가 관리하여 워크로드 중심의 비용 최적화된, 프로덕션에 즉시 사용 가능한 환경을 제공합니다.

<br>

---

# 4. GKE 클러스터 아키텍처

## 4.1 아키텍처 다이어그램

아래는 GKE 클러스터의 전체 아키텍처를 보여주는 다이어그램입니다.

![GKE 클러스터 아키텍처](https://docs.cloud.google.com/static/kubernetes-engine/images/cluster-architecture.svg?hl=ko)

> 출처: [GKE 클러스터 아키텍처 - Google Cloud 문서](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/cluster-architecture?hl=ko)

**구성요소 설명:**

| 구성요소 | 역할 |
|----------|------|
| **컨트롤 플레인** | GKE가 관리. Kubernetes API 서버(`kube-apiserver`), 워크로드 컨트롤러, 스케줄러, 클러스터 상태 스토리지 실행 |
| **노드** | Autopilot → GKE 관리 / Standard → 사용자 관리. 모든 Pod는 노드에서 실행 |
| **기타 Google Cloud 서비스** | GKE와 통합하여 사용 (Cloud Logging, Monitoring, Artifact Registry 등) |

## 4.2 컨트롤 플레인과 Kubernetes API

- 컨트롤 플레인은 클러스터의 **통합 엔드포인트**로, **Kubernetes API 서버 프로세스(`kube-apiserver`)**를 실행하여 API 요청을 처리합니다.
- API 호출 방법:
  - **직접 호출**: HTTP/gRPC
  - **간접 호출**: `kubectl`, Google Cloud 콘솔

## 4.3 클러스터 상태 데이터베이스 (etcd / Spanner)

오픈소스 Kubernetes는 기본적으로 클러스터의 모든 데이터를 저장하는 데이터베이스로 **etcd**를 사용합니다.

GKE에서는 클러스터 상태를 **두 가지 키-값 저장소** 중 하나에 저장합니다:

| 저장소 | 설명 |
|--------|------|
| **etcd** | 각 컨트롤 플레인 VM에서 실행되는 etcd 인스턴스에 저장 |
| **Spanner** | Google의 분산 데이터베이스인 Spanner에 저장. 컨트롤 플레인 외부에서 실행 |

> **핵심**: 데이터베이스 유형과 관계없이, **모든 GKE 클러스터는 컨트롤 플레인에서 etcd API를 제공**합니다. Kubernetes API 서버는 etcd API를 사용해 백엔드 클러스터 상태 데이터베이스와 통신합니다. 즉, 내부적으로 Spanner를 사용하더라도 Kubernetes API 서버 입장에서는 etcd API 인터페이스를 통해 동일하게 접근합니다.

## 4.4 컨트롤 플레인과 Artifact Registry 상호작용

클러스터를 만들거나 업데이트할 때 GKE는 **Kubernetes 시스템 소프트웨어용 컨테이너 이미지**를 `pkg.dev` 또는 `gcr.io` 도메인의 **Artifact Registry** 저장소에서 가져옵니다.

레지스트리 중단 시 영향받는 작업:
- 새 클러스터 생성
- 클러스터 버전 업그레이드

> **권장**: 리전 중단에 대비하여 **여러 리전에 걸쳐 배포**하는 것을 권장합니다.

<br>

---

# 5. 출시 채널 (Release Channel)

GKE는 클러스터 및 노드의 **Kubernetes 버전 업그레이드를 체계적으로 관리**하기 위해 **출시 채널(Release Channel)** 기능을 제공합니다.

## 5.1 출시 채널 개요

출시 채널을 사용하면 **기능 가용성과 안정성 사이의 균형**을 선택하여 클러스터에 맞는 버전을 지정할 수 있습니다. GKE는 시간 경과에 따라 모든 클러스터를 자동 업그레이드하여 보안 업데이트, 알려진 문제에 대한 수정 사항, 새 기능을 제공합니다.

## 5.2 가용 채널

| 채널 | 출시 시기 | 특징 |
|------|----------|------|
| **신속 (Rapid)** | 업스트림 OSS GA 후 **수 주 이내** | 최신 Kubernetes 버전을 빠르게 제공. **사전 프로덕션 환경 테스트에 권장** |
| **일반 (Regular, 기본)** | 신속 채널 출시 후 **2~3개월** | 기능과 안정성의 균형. **대부분의 사용자에게 권장** |
| **안정화 (Stable)** | 일반 채널 출시 후 **2~3개월** | 새 기능보다 안정성 우선. **프로덕션 워크로드에 최적** |
| **연장 (Extended)** | 일반 채널에 맞춤 | **최대 24개월** 마이너 버전 유지 가능 (14개월 스탠더드 + 10개월 연장 지원) |
| **채널 없음** (비권장) | 일반 채널에 맞춤 | 노드 풀별 자동 업그레이드 비활성화 가능. **권장되지 않음** |

## 5.3 출시 채널 채택 주기

![출시 채널 채택 주기](https://docs.cloud.google.com/static/kubernetes-engine/images/release-channel-adoption-cycle.svg?hl=ko)

> 출처: [출시 채널 정보 - Google Cloud 문서](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/release-channels?hl=ko)

- **혁신가** → 업스트림 Kubernetes 출시 버전 직접 사용
- **얼리 어답터** → 신속 채널
- **조기 다수자** → 일반 채널
- **다수자** → 안정화 채널
- **후기 다수자** → 지원 중단 임박 버전 사용 (전환 필요)

## 5.4 채널 간 비교 — 등록 vs 미등록

| 기능 | 출시 채널 등록 클러스터 | 미등록 클러스터 |
|------|----------------------|---------------|
| 컨트롤 플레인 자동 업그레이드 | O | O |
| 노드 자동 업그레이드 | O (기본) | O (기본, 노드 풀 수준 비활성화 가능) |
| 유지보수 제외 범위 | "업그레이드 없음"(30일), "마이너 업그레이드 없음"(지원 종료 시까지), "마이너 또는 노드 업그레이드 없음" | "업그레이드 없음"(30일)만 가능 |
| 가속화된 패치 자동 업그레이드 | O | X |
| 출시 시퀀싱 (Fleet/범위 기반) | O | X |
| 장기적 지원 (연장 채널) | O | X |
| Autopilot 지원 | O | X |

## 5.5 연장 채널 제한사항

연장 채널에서는 다음 기능을 사용하는 클러스터를 등록할 **수 없습니다**:
- Autopilot 클러스터 모드
- 알파 클러스터
- 명시적으로 사용 설정된 Kubernetes 베타 API
- Windows Server 노드 풀
- 구성 커넥터
- 관리형 Cloud Service Mesh, GKE용 서비스 디렉터리, 구성 동기화, 정책 컨트롤러
- 멀티 클러스터 게이트웨이, 멀티 클러스터 인그레스, 멀티 클러스터 서비스

<br>

---

# 6. Fleet 기반 팀 관리

## 6.1 Fleet이란?

**Fleet**은 함께 관리할 수 있는 Kubernetes 클러스터 및 기타 리소스를 **논리적으로 그룹화**한 개념입니다. Fleet 서비스(허브 서비스)에서 관리됩니다.

### 왜 Fleet이 필요한가?

조직에서 프로덕션/비프로덕션 분리, 팀/서비스별 분리 등 여러 이유로 다수의 클러스터를 운영하게 됩니다. 예를 들어:

- 10개 Google Cloud 프로젝트 × 2개 GKE 클러스터 = **20개 클러스터**
- Fleet **없이**: 각 프로젝트별로 개별 변경 + 프로젝트 간 컨텍스트 전환 필요
- Fleet **사용**: **단일 Fleet 호스트 프로젝트**에서 전체 클러스터 그룹을 통합 관리

### Fleet의 범위

Fleet은 단순한 클러스터 그룹 이상입니다:
- **클러스터 경계를 추상화**하는 Fleet 기반 기능 활용 가능
- 여러 클러스터에서 특정 팀에 속한 리소스를 정의·관리
- Fleet 전체에 **동일한 구성을 자동 적용**
- Google Cloud 내부 GKE 클러스터 + Google Cloud **외부 클러스터** 모두 포함 가능

## 6.2 Fleet 만들기

- 선택한 **Fleet 호스트 프로젝트**에 클러스터를 **등록**하는 방식
- 일부 클러스터 유형은 생성 시 **자동 등록**, 일부는 **수동 등록** 필요
- Google Cloud 외부 클러스터를 등록하면 **Connect Agent**가 설치됨

## 6.3 클러스터 인증 옵션

Fleet에서는 모든 개발자·관리자를 위한 **일관되고 안전한 클러스터 인증**을 두 가지 방식으로 제공합니다:

| 인증 방식 | 설명 |
|-----------|------|
| **Google Cloud ID** | Connect Gateway를 통해 Fleet 멤버 클러스터에 연결. 클러스터에 직접 IP로 연결할 필요 없음 |
| **서드 파티 ID** | Microsoft ADFS 등 기존 서드 파티 ID 공급업체 지원. OIDC 및 LDAP 지원 |

<br>

---

# 7. Connect Gateway

## 7.1 Connect Gateway란?

**Connect Gateway**는 Fleet의 기능을 기반으로 빌드된 서비스로, GKE 사용자가 클러스터의 위치(Google Cloud, 다른 퍼블릭 클라우드, 온프레미스)에 관계없이 **간단하고 일관되며 안전한 방식**으로 Fleet 멤버 클러스터에 연결하고 명령어를 실행할 수 있게 합니다.

## 7.2 Connect Gateway를 사용하는 이유

| 기능 | 설명 |
|------|------|
| **클러스터 검색** | 간단한 쿼리로 Google Cloud, 다른 퍼블릭 클라우드, 온프레미스에 등록된 클러스터 확인 |
| **통합 연결** | Google Cloud 콘솔과 동일한 인프라를 사용하여 원하는 클러스터에 연결 |
| **일관된 인증** | Google Cloud 서비스에서 사용하는 것과 동일한 ID로 인증 |
| **일관된 승인** | Fleet에 등록된 모든 클러스터에서 일관되게 승인 |
| **DevOps 자동화** | 빌드 파이프라인 및 CI/CD 자동화에 활용 가능 (Cloud Build 통합) |

## 7.3 작동 흐름

```
1. 클러스터 검색
   $ gcloud container fleet memberships list

2. 클러스터 자격 증명 가져오기
   $ gcloud container fleet memberships get-credentials <membership-name>

3. kubectl로 명령어 실행
   (a) Connect Gateway에서 인증 → 게이트웨이 사용 권한 확인
   (b) GKE 클러스터: 게이트웨이가 직접 연결
       비-GKE 클러스터: Connect 서비스 + Connect Agent를 통해 API 서버로 전달
   (c) Kubernetes API 서버가 요청 승인
```

## 7.4 지연 시간

- Connect Gateway를 통한 요청의 추가 RTT 지연: **p95 < 500ms**, **p99 < 1초**

## 7.5 ID 지원

| ID 유형 | 지원 여부 |
|---------|----------|
| Google Workspace 사용자 | O |
| Google 그룹스 | O (GKE Identity Service 추가 설정 필요) |
| 서드 파티 ID (Azure AD, Okta 등) | O (직원 ID 제휴 사용) |

<br>

---

# 8. Connect Agent

## 8.1 Connect Agent란?

**Connect Agent**는 **Google Cloud 외부의 클러스터를 Fleet에 등록**할 때 설치되는 Deployment입니다. 클러스터와 Google Cloud 프로젝트 사이의 연결을 설정하고 Kubernetes 요청을 처리합니다.

> **중요**: Connect Agent는 Google Cloud에서 실행되는 GKE 클러스터에는 **설치할 필요가 없습니다**. 외부 클러스터(온프레미스, 다른 클라우드)만 해당됩니다.

### Fleet과 Connect Agent의 관계 정리

| 구분 | Fleet | Connect Agent |
|------|-------|---------------|
| **역할** | 클러스터를 논리적으로 그룹화하여 **통합 관리**하는 서비스 | 외부 클러스터를 Google Cloud와 **연결**하기 위한 에이전트 |
| **대상** | GKE 클러스터 + 외부 클러스터 모두 | **외부 클러스터만** (GKE 클러스터는 불필요) |
| **목적** | 멀티 클러스터 관리, 정책 일관성, 관찰 가능성 | 외부 클러스터 ↔ Google Cloud 간 보안 연결 설정 |

## 8.2 Connect Agent의 동작

- **NAT, 이그레스 프록시, VPN, 기타 상호 연결**을 순회할 수 있음
- Kubernetes 클러스터/API 서버에 **공개 또는 외부에 노출된 IP 주소가 필요 없음**
- 클러스터와 Google Cloud 간에 **오랫동안 유지되는 암호화된 연결** 설정

## 8.3 보안 및 감사 로깅

Connect를 통해 전송되는 데이터에 대한 **개발자의 제어권이 유지**됩니다:
- Kubernetes API 서버가 모든 요청에 대해 **인증, 승인, 감사 로깅** 수행
- Google 및 사용자는 클러스터 관리자가 **RBAC 등으로 승인**한 후에만 데이터/API에 접근 가능
- 클러스터 관리자가 해당 **승인을 취소** 가능

### 감사 로깅 유형

| 로깅 유형 | 설명 |
|-----------|------|
| **Connect 감사 로깅** | Connect Agent를 통한 클러스터 접근 기록 |
| **Connect Gateway 감사 로깅** | Connect Gateway를 통한 API 호출 기록 |
| **GKE Hub 감사 로깅** | Fleet 멤버십 및 기능 변경 기록 |

## 8.4 리소스 사용량

| 항목 | 수치 |
|------|------|
| CPU | 일반적으로 **500m** |
| 메모리 | 일반적으로 **200Mi** |

> 실제 사용량은 초당 요청 수, 요청 크기, 클러스터 크기, 사용자 수, Fleet 지원 기능 수에 따라 달라집니다.

<br>

---

# 9. Google Cloud 통합 CI/CD (Cloud Build + Cloud Deploy)

GKE는 Google Cloud의 CI/CD 서비스들과 강력하게 통합됩니다.

## 9.1 CI/CD 파이프라인 구성

```
[소스 코드]
    │
    ▼
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│ Cloud Build  │────▶│ Artifact Registry │────▶│  Cloud Deploy  │
│ (빌드/테스트) │     │  (이미지 저장)     │     │  (배포 자동화)  │
└─────────────┘     └──────────────────┘     └───────┬────────┘
                                                      │
                                              ┌───────▼────────┐
                                              │   GKE 클러스터   │
                                              │  (Dev/Stg/Prod) │
                                              └────────────────┘
```

| 서비스 | 역할 | 설명 |
|--------|------|------|
| **Cloud Build** | CI (빌드) | 컨테이너 이미지 빌드, 테스트 실행, 취약점 스캔 |
| **Artifact Registry** | 이미지 저장소 | 빌드된 컨테이너 이미지 및 아티팩트 저장·관리 |
| **Cloud Deploy** | CD (배포) | GKE 클러스터에 대한 **선언적 배포 자동화** (Dev → Staging → Production 파이프라인) |

> **권장사항**: Cloud Build, Cloud Deploy, Artifact Registry를 사용하도록 CI/CD 파이프라인을 구성하면 **보안, 확장성, 단순성**을 최적화할 수 있습니다.

### Cloud Deploy 특징
- **선언적 배포**: 배포 대상, 파이프라인 단계를 YAML로 정의
- **승인 게이트**: 프로덕션 배포 전 수동 승인 프로세스 지원
- **롤백**: 이전 릴리스로 간편한 롤백
- **감사 가능성**: 모든 배포 기록이 추적됨

<br>

---

# 10. 이미지 저장소 전환: Container Registry → Artifact Registry

## 10.1 전환 배경

| 항목 | Container Registry (구) | Artifact Registry (신) |
|------|------------------------|----------------------|
| **도메인** | `gcr.io` | `pkg.dev` |
| **서비스 상태** | 2025년 3월 **서비스 종료** | 활성 (현재 권장) |
| **저장소 유형** | 컨테이너 이미지만 | 컨테이너 이미지 + 언어별 패키지(npm, Maven, Python 등) |
| **인증** | Docker 기반 인증 | gcloud / 서비스 계정 키 / Workload Identity |
| **IAM 제어** | GCS 버킷 수준 | 저장소 수준의 세분화된 IAM |
| **취약점 스캔** | 기본 | 고급 (On-Demand Scanning, 자동 스캔) |
| **VPC Service Controls** | 제한적 | 완전 지원 |
| **멀티 리전 저장소** | O | O |
| **리전별 저장소** | X | O |
| **가격 정책** | GCS 저장소 비용 | 전용 가격 정책 (저장소 요금 + 네트워크 요금) |

## 10.2 마이그레이션 시 주의사항

1. **기존 `gcr.io` 이미지 참조를 `pkg.dev`로 변경** 필요
2. CI/CD 파이프라인의 이미지 빌드·푸시 대상 업데이트
3. Kubernetes Deployment 매니페스트의 이미지 경로 변경
4. Artifact Registry는 **gcr.io 호환 모드**(리다이렉트)를 지원하여 점진적 마이그레이션 가능

> **참고**: GKE 클러스터 생성·업데이트 시 시스템 이미지를 `pkg.dev` 또는 `gcr.io`에서 가져오며, Artifact Registry로의 전환이 완료되었습니다.

<br>

---

# 11. 주요 기능 요약 표

아래 표는 이 문서에서 다룬 GKE의 주요 기능들을 한눈에 정리한 것입니다. **추후 NKS 문서 작성 및 비교 분석에 활용**할 예정입니다.

| 분류 | 기능 | GKE 지원 여부 |
|------|------|:------------:|
| **클러스터 관리** | 관리형 컨트롤 플레인 | ✅ |
| | Autopilot (완전 관리형 노드) | ✅ |
| | Standard (사용자 관리 노드) | ✅ |
| **업그레이드 관리** | 출시 채널 (Release Channel) | ✅ |
| | 자동 컨트롤 플레인 업그레이드 | ✅ |
| | 자동 노드 업그레이드 | ✅ |
| | 유지보수 기간/제외 | ✅ |
| | 연장 채널 (최대 24개월 지원) | ✅ |
| | 가속화된 패치 자동 업그레이드 | ✅ |
| **멀티 클러스터 관리** | Fleet (클러스터 그룹화) | ✅ |
| | Connect Gateway | ✅ |
| | Connect Agent (외부 클러스터 통합) | ✅ |
| | Fleet 기반 팀 관리 | ✅ |
| | 출시 시퀀싱 (환경 간 업그레이드 관리) | ✅ |
| **보안** | Container-Optimized OS | ✅ |
| | 보안 상태 대시보드 | ✅ |
| | Workload Identity | ✅ |
| | RBAC 기반 접근 제어 | ✅ |
| | 감사 로깅 (Connect, Gateway, Hub) | ✅ |
| **CI/CD 통합** | Cloud Build | ✅ |
| | Cloud Deploy | ✅ |
| | Artifact Registry (pkg.dev) | ✅ |
| **관찰 가능성** | Google Cloud Logging | ✅ |
| | Google Cloud Monitoring | ✅ |
| | Managed Prometheus | ✅ |
| **비용** | Autopilot: 포드 리소스 기반 과금 | ✅ |
| | Spot Pod (내결함성 워크로드) | ✅ |
| | 무료 등급 (클러스터 관리 비용 무료) | ✅ |
| **SLA** | 월별 업타임 >99% | ✅ |
| | Autopilot 포드 수준 SLA | ✅ |
| **이미지 저장소** | Artifact Registry (pkg.dev) | ✅ |
| | Container Registry (gcr.io) — 종료됨 | ❌ (25.03 종료) |

<br>

---

# 참고 자료

- [GKE 개요](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/kubernetes-engine-overview?hl=ko)
- [GKE 클러스터 아키텍처](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/cluster-architecture?hl=ko)
- [출시 채널 정보](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/release-channels?hl=ko)
- [Fleet 관리 개요](https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs?hl=ko)
- [Connect Gateway 개요](https://docs.cloud.google.com/kubernetes-engine/enterprise/multicluster-management/gateway?hl=ko)
- [Connect Agent 개요](https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs/connect-agent?hl=ko)
- [Container Registry에서 Artifact Registry로 전환](https://docs.cloud.google.com/kubernetes-engine/docs/deprecations/container-registry?hl=ko)
