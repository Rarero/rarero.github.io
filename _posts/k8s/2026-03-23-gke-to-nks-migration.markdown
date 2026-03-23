---
layout: post
title: "[Migration] GKE → NKS 마이그레이션 비교 분석"
date: 2026-03-23 10:00:00 +0900
tags: [Kubernetes, GKE, NKS, NCloud, GCP, Migration, Naver Cloud Platform, Google Kubernetes Engine, NCloud Kubernetes Service]
categories: k8s
---

이 문서는 **GCP(Google Cloud Platform)**에서 **NCP(Naver Cloud Platform)**로의 마이그레이션 사업 중, **GKE(Google Kubernetes Engine)**와 **NKS(NCloud Kubernetes Service)**의 비교 분석을 다룹니다. 개요, 마이그레이션 시 주의사항, 알아야 할 핵심 사항, 비용 차이, 그리고 각 서비스의 장단점을 종합적으로 정리합니다.

<br>

---

# 1. GKE와 NKS 개요

## 1.1 GKE (Google Kubernetes Engine)

| 항목 | 내용 |
|------|------|
| **제공사** | Google Cloud Platform (GCP) |
| **기반 기술** | Kubernetes (Google이 원래 개발한 오픈소스 프로젝트) |
| **출시** | 2015년 (Managed Kubernetes 서비스 중 최초) |
| **운영 모드** | Standard 모드, Autopilot 모드 |
| **Control Plane** | Google이 완전 관리 (무료 — Autopilot/Standard 모두) |
| **지원 K8s 버전** | 최신 Stable 버전 기준 N~N-2 (Release Channel 통해 자동 업그레이드 가능) |
| **주요 특징** | Autopilot(서버리스 노드 관리), GKE Enterprise(멀티클러스터 관리), Workload Identity, Binary Authorization, Config Sync 등 |

GKE는 Kubernetes를 만든 Google이 직접 운영하는 서비스로, **Kubernetes 생태계의 최신 기능을 가장 빠르게 반영**합니다. Autopilot 모드에서는 노드 프로비저닝, 스케일링, 보안 패치까지 Google이 전부 관리하며, Standard 모드에서는 노드풀을 직접 구성할 수 있습니다.

## 1.2 NKS (NCloud Kubernetes Service)

| 항목 | 내용 |
|------|------|
| **제공사** | Naver Cloud Platform (NCP) |
| **기반 기술** | Kubernetes (CNCF 인증 Kubernetes 배포) |
| **운영 모드** | Managed 모드 (노드풀 직접 관리) |
| **Control Plane** | Naver Cloud가 관리 (별도 과금 없음) |
| **지원 K8s 버전** | 일반적으로 Stable 버전 기준 제한적 지원 (GKE 대비 업데이트 지연 있음) |
| **주요 특징** | NCP 서비스(VPC, Load Balancer, Object Storage, NAS 등)와 네이티브 통합, 한국 리전 최적화 |

NKS는 네이버 클라우드 플랫폼에서 제공하는 Managed Kubernetes 서비스입니다. **국내 데이터 주권 요구사항을 충족**하며, NCP의 네트워크·스토리지·로드밸런서 서비스와 긴밀하게 통합됩니다. GKE의 Autopilot 같은 서버리스 모드는 없으며, Standard 모드에 가까운 형태로 운영됩니다.

## 1.3 핵심 차이 요약

| 비교 항목 | GKE | NKS |
|-----------|-----|-----|
| K8s 버전 업데이트 속도 | 빠름 (Release Channel) | 상대적으로 느림 |
| 서버리스 노드 관리 | Autopilot 지원 | 미지원 |
| 멀티클러스터 관리 | GKE Enterprise (Fleet) | 미지원 (개별 클러스터 관리) |
| 글로벌 리전 | 40+ 리전 | 한국(2), 싱가포르, 일본 등 제한적 |
| IAM 통합 | Workload Identity (GCP IAM ↔ K8s SA) | NCP Sub Account 기반 |
| GPU 노드 | 광범위한 GPU 옵션 (T4, A100, H100 등) | 제한적 GPU 옵션 |
| 네트워크 정책 | Dataplane V2 (Cilium 기반 eBPF) | Calico 기반 |
| Ingress/LB 통합 | GCE Ingress, Gateway API 네이티브 | NCP Load Balancer 연동 |
| 서비스 메시 | Anthos Service Mesh (Istio 기반) | 자체 서비스 메시 미제공 (직접 구성 필요) |
| 모니터링 | Cloud Monitoring/Logging 네이티브 통합 | Cloud Insight 연동 |

<br>

---

# 2. GKE → NKS 마이그레이션 시 주의사항

## 2.1 Kubernetes 버전 호환성

> **핵심**: GKE에서 사용 중인 K8s 버전과 NKS 지원 버전을 반드시 사전 확인해야 합니다.

- GKE는 최신 K8s 버전을 빠르게 지원하지만, NKS는 지원 버전이 제한적이고 업데이트가 느립니다.
- **Deprecated API 사용 여부**를 점검해야 합니다. GKE에서 최신 버전 기준으로 작성된 매니페스트가 NKS의 하위 버전에서 지원되지 않을 수 있고, 반대로 NKS에서 이미 제거된 API를 GKE에서 사용 중일 수도 있습니다.
- `kubectl convert` 또는 `kubent`(Kube No Trouble) 도구로 호환성을 사전 점검하세요.

```bash
# Deprecated API 사전 점검
kubent --target-version=1.XX  # NKS 지원 버전으로 설정
```

## 2.2 네트워크 아키텍처 차이

| 항목 | GKE | NKS |
|------|-----|-----|
| VPC 모델 | VPC-native (Alias IP 기반) | NCP VPC 기반 |
| Pod IP 할당 | Secondary IP Range (Alias IP) | NCP VPC Subnet 기반 |
| Service 타입: LoadBalancer | GCP Network/HTTP(S) LB 자동 생성 | NCP Load Balancer 자동 생성 |
| DNS | Cloud DNS 또는 kube-dns | CoreDNS |
| Ingress Controller | GCE Ingress Controller (기본) | 별도 Ingress Controller 설치 필요 (nginx 등) |

**주의사항:**
- GKE의 **VPC-native 클러스터**에서 사용하던 Alias IP 기반 Pod 네트워크 구조가 NKS에서는 다르게 동작합니다. CIDR 설계를 NKS 환경에 맞게 재설계해야 합니다.
- GKE의 **내부 부하분산(Internal Load Balancer)** 설정은 NKS에서 NCP Private LoadBalancer로 재설정해야 합니다.
- GKE의 **GCE Ingress**를 사용 중이라면, NKS에서는 **nginx-ingress** 또는 NCP의 Application Load Balancer를 별도로 구성해야 합니다.
- **NetworkPolicy**: GKE Dataplane V2(Cilium eBPF 기반)에서 사용하던 정책은 NKS의 Calico 기반으로 전환 시 호환성을 확인해야 합니다. 대부분의 표준 NetworkPolicy는 호환되지만, GKE 전용 확장 기능(FQDN 정책 등)은 사용할 수 없습니다.

## 2.3 스토리지 마이그레이션

| 항목 | GKE | NKS |
|------|-----|-----|
| 기본 StorageClass | pd-standard / pd-ssd (Persistent Disk) | NCP Block Storage |
| CSI Driver | GCE PD CSI Driver | NCP CSI Driver |
| 파일 스토리지 | Filestore (NFS) | NCP NAS (NFS) |
| 오브젝트 스토리지 | Google Cloud Storage (GCS) | NCP Object Storage (S3 호환) |

**주의사항:**
- **PersistentVolume 데이터를 직접 이동할 수 없습니다.** GKE의 Persistent Disk 데이터를 백업(스냅샷, 파일 복사)한 뒤, NKS의 Block Storage로 복원해야 합니다.
- **StorageClass 이름과 파라미터**가 다르므로, 모든 PVC 매니페스트의 `storageClassName`을 NKS에 맞게 수정해야 합니다.
- GCS를 사용하는 워크로드는 **NCP Object Storage**(S3 호환 API)로 전환해야 하며, SDK/CLI 코드 수정이 필요합니다 (endpoint, 인증 방식 변경).
- Filestore → NCP NAS 전환 시 NFS 마운트 경로와 접근 권한을 재설정해야 합니다.

## 2.4 IAM 및 인증 체계 변경

- GKE의 **Workload Identity**(GCP IAM ↔ K8s ServiceAccount 매핑)는 NKS에서 사용할 수 없습니다.
- NCP에서는 **Sub Account + Access Key/Secret Key** 기반으로 인증을 처리합니다.
- 워크로드에서 GCP 서비스에 직접 접근하던 코드(GCS, Pub/Sub, BigQuery 등)는 **NCP 대응 서비스 + NCP 인증 방식**으로 전환해야 합니다.
- K8s **RBAC** 설정 자체는 호환되지만, 외부 IdP(Google OAuth) 연동 부분은 재설정이 필요합니다.

## 2.5 CI/CD 파이프라인 재구성

| 기존 (GKE) | 전환 대상 (NKS) |
|-------------|-----------------|
| Cloud Build | NCP SourceBuild 또는 Jenkins/GitHub Actions |
| Artifact Registry (Container Registry) | NCP Container Registry |
| Cloud Deploy | ArgoCD, FluxCD 등 오픈소스 또는 수동 배포 |
| Config Sync (GitOps) | ArgoCD/FluxCD |

**주의사항:**
- 컨테이너 이미지를 **GCR/Artifact Registry → NCP Container Registry**로 마이그레이션해야 합니다.
- `skopeo copy` 또는 `crane copy` 도구로 이미지를 벌크 복사할 수 있습니다.

```bash
# 이미지 벌크 복사 예시
skopeo copy docker://gcr.io/my-project/my-app:v1 docker://my-registry.kr.ncr.ntruss.com/my-app:v1
```

- Deployment, StatefulSet 등의 매니페스트에서 **이미지 레지스트리 경로**를 모두 변경해야 합니다.
- GKE 전용 어노테이션(예: `cloud.google.com/neg`, `networking.gke.io/managed-certificates`)은 제거하거나 NKS 대응 어노테이션으로 교체해야 합니다.

## 2.6 Observability & Monitoring 전환

| 기존 (GKE) | 전환 대상 (NKS) |
|-------------|-----------------|
| Cloud Monitoring | NCP Cloud Insight 또는 Prometheus + Grafana |
| Cloud Logging | NCP Cloud Log Analytics 또는 EFK/Loki |
| Cloud Trace | Jaeger / Tempo |
| GKE Dashboard | Kubernetes Dashboard / Grafana |

**주의사항:**
- GKE에서 자동으로 수집되던 **Node/Pod 메트릭, 컨테이너 로그**가 NKS에서는 별도 설정이 필요할 수 있습니다.
- **Prometheus + Grafana** 스택을 직접 구축하거나, NCP Cloud Insight를 활용해야 합니다.
- 기존 Cloud Monitoring 알림 규칙은 수동으로 재생성해야 합니다.

<br>

---

# 3. GKE → NKS 마이그레이션 시 알아야 하는 핵심 사항

## 3.1 마이그레이션 전략 선택

### 전략 1: Lift & Shift (Re-host)
- K8s 매니페스트(YAML)를 최소 수정하여 NKS에 그대로 배포합니다.
- **장점**: 가장 빠른 전환, 리스크 최소화
- **단점**: GCP 종속 기능을 제거하는 수준이므로, NKS 최적화 부족
- **적합한 경우**: 긴급한 마이그레이션, 단순 워크로드

### 전략 2: Re-platform
- K8s 매니페스트를 NKS 환경에 맞게 최적화하여 배포합니다.
- StorageClass, Ingress, 모니터링 등을 NKS 네이티브 서비스로 교체합니다.
- **장점**: NKS 서비스를 활용한 운영 효율성 확보
- **단점**: 추가 작업 시간 필요
- **적합한 경우**: 대부분의 프로덕션 워크로드

### 전략 3: Re-architect
- 애플리케이션 아키텍처를 NKS/NCP에 최적화하여 재설계합니다.
- **장점**: NCP 서비스를 최대한 활용, 장기적 운영 효율
- **단점**: 가장 많은 시간과 비용 소요
- **적합한 경우**: 기술 부채 정리가 필요한 워크로드

## 3.2 마이그레이션 순서 권장안

```
Phase 1: 사전 준비
├── NKS 클러스터 설계 (노드 스펙, 네트워크, 보안 그룹)
├── NCP VPC/Subnet 설계 및 생성
├── NCP Container Registry 구성
├── CI/CD 파이프라인 사전 구축
└── 대상 워크로드 인벤토리 작성

Phase 2: 비프로덕션 환경 전환
├── Dev/Staging 클러스터 구축
├── 매니페스트 변환 및 테스트
├── 스토리지 마이그레이션 검증
└── 모니터링/로깅 구성 확인

Phase 3: 프로덕션 마이그레이션
├── 데이터 동기화 (DB, Object Storage)
├── 프로덕션 클러스터 배포
├── DNS 전환 (Weighted/Blue-Green)
├── 트래픽 단계적 전환
└── GKE 리소스 정리 (비용 절감)

Phase 4: 안정화
├── 성능 모니터링 및 튜닝
├── 알림 규칙 최적화
├── 운영 문서 업데이트
└── 장애 대응 훈련
```

## 3.3 매니페스트 변환 체크리스트

아래 항목을 GKE 매니페스트에서 확인하고 NKS에 맞게 변환해야 합니다:

| 체크 항목 | GKE 값 (예시) | NKS 변환 값 |
|-----------|---------------|-------------|
| 이미지 레지스트리 경로 | `gcr.io/project/app:v1` | `registry.kr.ncr.ntruss.com/app:v1` |
| StorageClass | `standard`, `premium-rwo` | NKS Block Storage 클래스명 |
| Ingress 어노테이션 | `kubernetes.io/ingress.class: gce` | `kubernetes.io/ingress.class: nginx` 또는 NCP ALB |
| Service 어노테이션 (LB) | `cloud.google.com/neg` | NKS LB 어노테이션 |
| Node Selector/Affinity | GKE 노드 레이블 | NKS 노드 레이블로 변경 |
| HPA metrics | `custom.googleapis.com/...` | Prometheus adapter 또는 NKS 지원 메트릭 |
| ConfigMap/Secret (GCP 참조) | GCP 프로젝트 ID, 리전 등 | NCP 리전, 엔드포인트로 변경 |
| ServiceAccount 어노테이션 | `iam.gke.io/gcp-service-account` | 제거 (NCP 인증 방식으로 전환) |

## 3.4 GCP 종속 서비스 매핑

GKE 워크로드에서 사용 중인 GCP 서비스를 NCP 대응 서비스로 전환해야 합니다:

| GCP 서비스 | NCP 대응 서비스 | 비고 |
|-----------|-----------------|------|
| Cloud SQL | NCP Cloud DB (MySQL/PostgreSQL) | 스키마/데이터 마이그레이션 필요 |
| Cloud Memorystore (Redis) | NCP Cloud Redis | 데이터 export/import |
| Cloud Pub/Sub | NCP Cloud Functions + MQ 또는 Kafka | 1:1 대응 서비스 부재, 아키텍처 재설계 필요 |
| Cloud Storage (GCS) | NCP Object Storage | S3 호환 API, 엔드포인트 변경 |
| BigQuery | NCP Cloud Hadoop / Data Forest | 완전한 대체 어려움, 별도 설계 필요 |
| Cloud CDN | NCP CDN+ | CDN 설정 재구성 |
| Cloud Armor | NCP Security Monitoring | WAF 규칙 재구성 필요 |
| Secret Manager | NCP Key Management Service | Secret 마이그레이션 필요 |
| Cloud DNS | NCP Global DNS | 레코드 마이그레이션 |

> **주의**: GCP의 일부 서비스(Pub/Sub, BigQuery, Spanner 등)는 NCP에 직접 대응하는 서비스가 없거나 기능 격차가 큰 경우가 있습니다. 이 경우 오픈소스(Kafka, ClickHouse 등)를 NKS 위에 직접 구축하는 방안을 검토해야 합니다.

## 3.5 DNS 전환 및 다운타임 최소화

- **Blue-Green 전환**: GKE와 NKS를 동시에 운영하면서, DNS Weighted Routing으로 트래픽을 점진적으로 이동합니다.
- **TTL 사전 조정**: 전환 최소 48시간 전에 DNS TTL을 60초 이하로 낮춰, 전환 시 빠른 전파를 유도합니다.
- **Health Check 구성**: NKS 측에 Health Check를 반드시 설정하여, 이상 시 자동으로 GKE로 롤백할 수 있도록 합니다.

## 3.6 보안 고려사항

- **이미지 보안 스캐닝**: GKE에서 Container Analysis/Binary Authorization을 사용했다면, NKS에서는 별도의 이미지 스캐닝 도구(Trivy, Snyk 등)를 도입해야 합니다.
- **Pod Security**: GKE의 Pod Security Standards(PSS) 또는 GKE Sandbox(gVisor)를 사용 중이라면, NKS에서의 대체 방안을 마련해야 합니다.
- **네트워크 보안**: NCP의 ACG(Access Control Group)와 NACL로 NKS 클러스터의 네트워크 접근을 제어해야 합니다. GKE의 Authorized Networks 설정에 대응합니다.
- **암호화**: GKE의 CMEK(Customer-Managed Encryption Key)를 사용 중이라면, NKS에서의 암호화 옵션을 확인해야 합니다.

<br>

---

# 4. GKE와 NKS 비용 비교

## 4.1 Control Plane 비용

| 항목 | GKE | NKS |
|------|-----|-----|
| Control Plane 비용 | Standard: 무료 / Autopilot: 무료 | 무료 |
| Enterprise 기능 | GKE Enterprise: 클러스터당 약 $0.10/vCPU/hr | 해당 없음 |

> GKE Standard 및 Autopilot 모두 Control Plane 관리 비용을 부과하지 않습니다. NKS도 마찬가지입니다. 다만 **GKE Enterprise** 사용 시 추가 비용이 발생합니다.

## 4.2 Worker Node (컴퓨팅) 비용 비교

아래는 유사한 스펙의 노드 비용 비교입니다 (월 기준, 한국 리전):

| 스펙 | GKE (GCP asia-northeast3) | NKS (NCP KR) | 비고 |
|------|--------------------------|--------------|------|
| 2 vCPU / 8 GB RAM | 약 $67~73/월 (e2-standard-2) | 약 ₩73,000~80,000/월 (Standard g2) | NCP가 다소 저렴하거나 비슷 |
| 4 vCPU / 16 GB RAM | 약 $134~146/월 (e2-standard-4) | 약 ₩146,000~160,000/월 (Standard g2) | 유사한 수준 |
| 8 vCPU / 32 GB RAM | 약 $268~292/월 (e2-standard-8) | 약 ₩292,000~320,000/월 (Standard g2) | 유사한 수준 |
| GPU (T4 1개) | 약 $350~400/월 (n1-standard-4 + T4) | 약 ₩400,000~500,000/월 (GPU Server) | GKE가 GPU 옵션 다양 |

> **참고**: 위 가격은 정가(On-Demand) 기준 대략적인 비교이며, 할인 프로그램 적용 전 수치입니다. 환율 변동에 따라 차이가 있을 수 있습니다.

## 4.3 할인 프로그램 비교

| 항목 | GKE (GCP) | NKS (NCP) |
|------|-----------|-----------|
| 약정 할인 | CUD (Committed Use Discount): 1년 ~37%, 3년 ~55% | 약정 요금제: 1년/3년 약정 (약 20~40% 할인) |
| 자동 할인 | SUD (Sustained Use Discount): 최대 30% 자동 적용 | 해당 없음 |
| 선결제 할인 | CUD 선결제 시 추가 할인 | 선불 요금제 일부 할인 |
| 무료 사용량 | GCP Free Tier ($300 크레딧 / 90일) | NCP 무료 체험 (일부 제한) |

> **핵심 차이**: GCP는 **SUD(Sustained Use Discount)**를 통해 사용량이 많을수록 자동으로 할인이 적용됩니다. NCP에는 이에 대응하는 자동 할인이 없으므로, **약정 요금제를 적극 활용**해야 비용을 절감할 수 있습니다.

## 4.4 네트워크 비용

| 항목 | GKE (GCP) | NKS (NCP) |
|------|-----------|-----------|
| 아웃바운드 트래픽 | $0.12/GB (아시아 리전, 인터넷) | 일정 무료 대역폭 후 과금 (약 ₩100/GB) |
| 클러스터 내부 통신 | 같은 Zone 무료, 다른 Zone $0.01/GB | VPC 내부 무료 |
| Load Balancer | Forwarding Rule 당 ~$0.025/hr + 트래픽 | NCP LB 종류별 시간 과금 + 트래픽 |

> 네트워크 비용은 트래픽 패턴에 따라 크게 달라집니다. **아웃바운드 트래픽이 많은 워크로드**는 NCP가 유리할 수 있고, **멀티존/멀티리전 내부 통신이 많은 워크로드**는 GCP의 Cross-Zone 비용에 주의해야 합니다.

## 4.5 총 소유 비용(TCO) 관점

| 비용 요소 | GKE 유리 | NKS 유리 |
|-----------|----------|----------|
| 순수 컴퓨팅 비용 | △ (SUD/CUD로 대폭 할인 가능) | △ (약정으로 할인 가능) |
| 운영 인력 비용 | ✅ (Autopilot으로 운영 부담 감소) | △ (수동 관리 필요) |
| 한국 사용자 네트워크 지연 | △ | ✅ (국내 네트워크 최적화) |
| 기술 지원 비용 | △ (영어 기반, 유료 Premium Support) | ✅ (한국어 기술 지원) |
| 데이터 보관 규제 비용 | △ (한국 리전 있으나 해외 기업) | ✅ (국내 기업, 데이터 주권 충족) |
| 부가서비스 비용 | △ (풍부한 매니지드 서비스) | △ (부족한 서비스는 직접 구축 비용 발생) |

<br>

---

# 5. NKS가 GKE보다 나은 점과 부족한 점

## 5.1 NKS가 GKE보다 나은 점

### ① 데이터 주권 및 컴플라이언스
- **국내 기업**으로서 데이터 주권 요구사항을 자연스럽게 충족합니다.
- 공공 클라우드 인증(CSAP), 금융 클라우드 인증 등 **국내 규제 대응**에 강점이 있습니다.
- 개인정보보호법, 데이터 3법 등 국내 법률 준수가 용이합니다.

### ② 한국어 기술 지원
- **한국어 기반 기술 지원**을 받을 수 있어, 장애 대응 시 커뮤니케이션이 원활합니다.
- GCP의 Premium Support는 영어 기반이며 별도 비용이 발생합니다.

### ③ 국내 네트워크 최적화
- NCP의 국내 백본 네트워크를 활용하여 **한국 사용자 대상 서비스의 네트워크 지연이 최소화**됩니다.
- 국내 ISP와의 직접 피어링이 잘 되어있어, 국내 트래픽 처리에 유리합니다.

### ④ 국내 결제 및 정산
- **원화(KRW) 결제**가 가능하여, 환율 변동 리스크가 없습니다.
- 세금계산서 발행 등 국내 회계 처리가 간편합니다.

### ⑤ NCP 에코시스템 통합
- NCP의 다른 서비스(CLOVA, Papago, NAVER Maps API 등)와의 통합이 용이합니다.
- 국내 특화 서비스(본인인증, NICE 연동 등)와의 연계가 자연스럽습니다.

## 5.2 NKS가 GKE보다 부족한 점

### ① Kubernetes 기능 성숙도
- GKE는 Kubernetes를 만든 Google이 운영하며, **최신 K8s 기능을 가장 먼저 지원**합니다.
- NKS는 K8s 버전 업데이트가 느리고, GKE Autopilot, Binary Authorization, Config Sync 등 **고급 기능이 부재**합니다.
- Gateway API, Managed Istio, Backup for GKE 등 GKE 전용 기능들은 NKS에서 대체 불가하거나 직접 구축해야 합니다.

### ② 글로벌 확장성
- GKE는 **40개 이상의 글로벌 리전**을 제공하지만, NKS는 한국 중심의 제한된 리전만 지원합니다.
- 글로벌 서비스를 운영해야 한다면 NKS만으로는 한계가 있습니다.

### ③ 자동화 및 운영 편의성
- GKE Autopilot은 **노드 관리를 완전히 자동화**하지만, NKS는 노드풀을 직접 관리해야 합니다.
- GKE의 **Release Channel**(Rapid/Regular/Stable)을 통한 자동 업그레이드 관리가 더 정교합니다.
- GKE의 **Node Auto-provisioning(NAP)**은 워크로드에 맞는 노드를 자동으로 생성하지만, NKS에서는 수동으로 노드풀을 사전 구성해야 합니다.

### ④ 생태계 및 서드파티 통합
- GKE는 **Terraform, Pulumi, Crossplane** 등의 IaC 도구에서 풍부한 Provider를 지원합니다.
- NKS의 Terraform Provider는 상대적으로 기능이 제한적입니다.
- Marketplace, Helm Chart 등에서 GKE/GCP 전용 최적화가 적용된 오픈소스가 더 많습니다.

### ⑤ 모니터링 및 관측성
- GKE는 **Cloud Monitoring, Cloud Logging, Cloud Trace**가 기본 통합되어 있어, 별도 설정 없이 풍부한 관측성을 제공합니다.
- NKS에서는 Prometheus + Grafana, EFK/Loki 등을 **직접 구축해야 하는 경우가 많아** 초기 설정 및 운영 부담이 증가합니다.

### ⑥ 고급 보안 기능
- GKE는 **Binary Authorization**(신뢰 이미지만 배포), **GKE Sandbox**(gVisor 기반 컨테이너 격리), **Workload Identity**(IAM 네이티브 바인딩) 등 Kubernetes 보안에 특화된 기능을 제공합니다.
- NKS에서는 이러한 기능을 서드파티 도구(OPA/Gatekeeper, Falco 등)로 보완해야 합니다.

### ⑦ GPU 및 고성능 컴퓨팅
- GKE는 **NVIDIA T4, A100, H100, L4** 등 다양한 GPU와 **TPU**를 지원하여 ML/AI 워크로드에 강점이 있습니다.
- NKS의 GPU 옵션은 GKE 대비 제한적이며, TPU에 대응하는 서비스는 없습니다.

<br>

---

# 6. 종합 정리 및 결론

## 마이그레이션 핵심 요약

| 영역 | 핵심 포인트 |
|------|------------|
| **K8s 호환성** | 버전 차이 확인, Deprecated API 점검 필수 |
| **네트워크** | VPC/Subnet 재설계, Ingress/LB 구성 변경 필수 |
| **스토리지** | PV 데이터 수동 이전, StorageClass 변경 필수 |
| **인증/보안** | Workload Identity → NCP Sub Account 전환, 보안 도구 재구축 |
| **CI/CD** | 이미지 레지스트리 이전, 파이프라인 재구성 |
| **모니터링** | 자동 수집 → 수동 구축 (Prometheus/Grafana 등) |
| **비용** | 컴퓨팅 유사, 운영비는 GKE(Autopilot)가 절감 가능, NKS는 환율/규제 유리 |
| **GCP 종속 서비스** | 1:1 대응 불가 서비스 존재, 오픈소스 대체 또는 재설계 필요 |

## 마이그레이션 성공을 위한 권고사항

1. **인벤토리 먼저**: GKE에서 사용 중인 모든 리소스(워크로드, 서비스, 스토리지, GCP 종속 서비스)를 빠짐없이 목록화합니다.
2. **PoC 선행**: 핵심 워크로드 1~2개를 NKS에 먼저 배포하여 호환성과 성능을 검증합니다.
3. **단계적 전환**: Big Bang 방식이 아닌 **점진적 트래픽 전환**(Weighted DNS, Blue-Green)으로 리스크를 최소화합니다.
4. **롤백 계획 수립**: 마이그레이션 실패 시 GKE로 즉시 복귀할 수 있는 절차를 사전에 준비합니다.
5. **운영 역량 확보**: NKS/NCP에 대한 운영팀 교육을 마이그레이션 전에 완료합니다.
6. **GCP 종속성 최소화**: 마이그레이션 전에 가능한 한 오픈소스·표준 기반으로 전환하면 이후 전환이 수월해집니다.

> **결론**: GKE는 Kubernetes 기능 성숙도, 자동화, 글로벌 확장성에서 우위에 있고, NKS는 데이터 주권, 국내 네트워크, 한국어 지원, 원화 결제에서 강점을 가집니다. 마이그레이션의 성공은 **GCP 종속 요소를 정확히 파악하고, NKS/NCP 환경에 맞게 체계적으로 전환하는 데 달려 있습니다.** 충분한 사전 검증(PoC)과 단계적 전환 전략이 핵심입니다.
