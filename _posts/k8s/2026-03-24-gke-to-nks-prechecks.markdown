---
layout: post
title: "[Migration] GKE → NKS 전환 시 사전 확인사항 및 기능 호환성 분석"
date: 2026-03-24 10:00:00 +0900
tags: [Kubernetes, GKE, NKS, NCloud, GCP, Migration, Naver Cloud Platform, Google Kubernetes Engine, NCloud Kubernetes Service, Checklist]
categories: k8s
---

GKE에서 NKS로의 마이그레이션을 진행하기 전, **사전에 확인해야 할 질문 리스트**, **이관 시 주의사항**, **기능 호환성 비교**, **고객사 사전 인지사항**을 정리한 문서입니다.

<br>

---

# 1. 사전 확인사항 (질문 리스트)

마이그레이션 착수 전, **아래 질문에 대한 답변이 확보되어야** 범위 산정과 리스크 관리가 가능합니다.

## 1.1 클러스터 구성

| # | 질문 | 확인 목적 |
|---|------|----------|
| 1 | 현재 GKE 클러스터 수와 각 클러스터의 **작업 모드**(Autopilot / Standard)는? | NKS는 Autopilot 미지원. Standard 기준으로만 전환 가능 |
| 2 | 각 클러스터에 등록된 **노드풀 수, 노드 스펙(vCPU/Memory), 머신 유형**은? | NKS 노드 스펙 매핑 및 비용 산정 |
| 3 | GKE **Release Channel**(Rapid/Regular/Stable/Extended) 중 어느 채널을 사용 중인가? | NKS에서 지원하는 K8s 버전과의 갭 확인 |
| 4 | 현재 GKE 클러스터의 **Kubernetes 버전**은? | NKS 지원 버전과 비교 (NKS는 지원 버전이 제한적) |
| 5 | **클러스터 Auto-scaler**(Cluster Autoscaler / NAP)를 사용 중인가? | NKS의 Auto-scaler 지원 범위 확인 |
| 6 | **멀티 클러스터 구성**(Fleet / GKE Enterprise)을 사용 중인가? | NKS에서 Fleet 미지원 → 개별 클러스터 관리로 전환 |
| 7 | **리전 클러스터** / **존 클러스터** 중 어느 것을 사용 중인가? | NKS 가용 영역 구성에 반영 |

## 1.2 워크로드 및 종속성

| # | 질문 | 확인 목적 |
|---|------|----------|
| 8 | 전체 **워크로드(Deployment, StatefulSet, DaemonSet, Job, CronJob) 목록**은? | 이관 대상 범위 확정 |
| 9 | GCP 종속 서비스(Cloud SQL, Pub/Sub, GCS, BigQuery, Memorystore 등)를 사용하는 워크로드는? | NCP 대응 서비스 매핑 또는 오픈소스 대체 필요 |
| 10 | **Workload Identity**(GCP IAM ↔ K8s SA 매핑)를 사용 중인가? | NKS에서 미지원 → NCP Sub Account + Access Key 방식으로 전환 |
| 11 | **ConfigMap / Secret**에 GCP 프로젝트 ID, 리전, 엔드포인트 등 GCP 종속 값이 있는가? | NCP 환경 값으로 일괄 변경 필요 |
| 12 | **Custom Resource Definition(CRD)** 및 **Operator**를 사용하는 워크로드가 있는가? | NKS 버전에서의 CRD 호환성 확인 |
| 13 | **GPU 워크로드**가 존재하는가? 사용 중인 GPU 유형(T4/A100/H100 등)은? | NKS GPU 노드 옵션 확인 (제한적) |
| 14 | **Init Container, Sidecar** 등 특수 패턴을 사용하는 워크로드가 있는가? | 일반적으로 호환되지만 GKE 전용 사이드카(Istio 등) 확인 |

## 1.3 네트워크

| # | 질문 | 확인 목적 |
|---|------|----------|
| 15 | GKE 클러스터의 **VPC, Subnet, Pod CIDR, Service CIDR** 설계는? | NKS VPC/Subnet 재설계 |
| 16 | **Ingress** 유형은? (GCE Ingress / nginx / Gateway API) | NKS에서 GCE Ingress·Gateway API 미지원 → nginx 또는 NCP ALB로 교체 |
| 17 | **NetworkPolicy**를 사용 중인가? 어떤 정책을 적용했는가? | GKE Dataplane V2(Cilium) → NKS Calico. 표준 정책은 호환, FQDN 정책 등은 비호환 |
| 18 | **Internal Load Balancer**를 사용 중인가? | NKS에서 NCP Private LB로 재설정 |
| 19 | **Cloud DNS** 연동(External DNS) 또는 **Private DNS Zone**을 사용 중인가? | NCP Global DNS로 전환 |
| 20 | 외부 시스템과의 **VPN / Interconnect / Peering** 연결이 있는가? | NCP 네트워크 구성으로 재구축 필요 |

## 1.4 스토리지

| # | 질문 | 확인 목적 |
|---|------|----------|
| 21 | 사용 중인 **StorageClass** 종류와 PVC 수량은? (pd-standard, pd-ssd, pd-balanced 등) | NKS Block Storage 클래스로 매핑 |
| 22 | **StatefulSet** 워크로드에서 PV를 사용하는 데이터 크기·건수는? | 데이터 이전 계획 수립 |
| 23 | **Filestore(NFS)** 또는 **GCS FUSE**를 마운트하는 워크로드가 있는가? | NCP NAS 또는 Object Storage로 전환 |

## 1.5 CI/CD 및 운영

| # | 질문 | 확인 목적 |
|---|------|----------|
| 24 | 현재 CI/CD 파이프라인 구성은? (Cloud Build / Cloud Deploy / GitHub Actions / Jenkins 등) | NKS 배포 파이프라인 재구성 |
| 25 | 컨테이너 이미지 저장소는? (Artifact Registry / GCR) 이미지 수량은? | NCP Container Registry로 이미지 벌크 복사 |
| 26 | **Config Sync, Policy Controller** 등 GitOps 도구를 사용 중인가? | ArgoCD / FluxCD 등 오픈소스로 대체 |
| 27 | 모니터링·알림 구성은? (Cloud Monitoring 대시보드·알림 개수) | NCP Cloud Insight 또는 Prometheus+Grafana 재구성 |
| 28 | **Binary Authorization**(이미지 서명 검증)을 사용 중인가? | NKS 미지원 → Sigstore/Cosign + OPA Gatekeeper로 대체 |

## 1.6 보안 및 규제

| # | 질문 | 확인 목적 |
|---|------|----------|
| 29 | **GKE Sandbox(gVisor)** 또는 **Confidential GKE Nodes**를 사용 중인가? | NKS 미지원 → 대체 방안 마련 |
| 30 | **CMEK(Customer-Managed Encryption Key)** 를 사용 중인가? | NKS 암호화 옵션 확인 |
| 31 | 고객사의 **데이터 보관 규제**(개인정보보호법, 금융보안원 규정 등) 요건은? | NCP CSAP/금융 인증 활용 |
| 32 | **감사 로그**(Audit Log) 보존 기간 및 수집 채널은? | NCP Cloud Activity Tracer로 전환 |

<br>

---

# 2. GKE → NKS 이관 시 주의사항

## 2.1 Kubernetes 버전 갭

- NKS는 GKE 대비 **K8s 버전 업데이트가 느림**. GKE에서 최신 버전을 사용 중이라면 NKS에서 해당 버전을 지원하지 않을 수 있음.
- **이관 전 반드시 `kubent`(Kube No Trouble) 등으로 Deprecated API 사전 점검.**
- GKE가 지원하는 Beta/Alpha API를 사용 중이라면 NKS에서 사용 불가할 확률이 높음.

## 2.2 GKE 전용 어노테이션·레이블 제거

GKE 매니페스트에 존재하는 아래 어노테이션은 **NKS에서 동작하지 않으므로 반드시 제거 또는 교체**해야 합니다.

| 어노테이션 / 레이블 | 용도 (GKE) | NKS 대응 |
|---------------------|-----------|----------|
| `cloud.google.com/neg` | NEG(Network Endpoint Group) 연동 | 제거 |
| `cloud.google.com/backend-config` | BackendConfig CRD | 제거 → nginx 어노테이션으로 대체 |
| `networking.gke.io/managed-certificates` | Google 관리형 TLS 인증서 | 제거 → cert-manager 또는 NCP Certificate Manager |
| `iam.gke.io/gcp-service-account` | Workload Identity 바인딩 | 제거 → NCP 인증 방식 전환 |
| `cloud.google.com/gke-nodepool` | 노드풀 지정 | NKS 노드풀 레이블로 교체 |
| `cloud.google.com/load-balancer-type: "Internal"` | 내부 로드밸런서 | NCP Private LB 어노테이션 |

## 2.3 Ingress 전면 교체

- GKE 기본 **GCE Ingress Controller**는 NKS에서 사용 불가.
- **Gateway API** 리소스(HTTPRoute, Gateway 등)도 NKS에서 미지원.
- NKS에서는 **nginx-ingress-controller**를 직접 배포하거나, NCP **Application Load Balancer**를 사용해야 함.
- Ingress 어노테이션을 전면 재작성해야 하므로, Ingress 리소스 수가 많을수록 공수 증가.

## 2.4 스토리지 이전은 수동

- GKE Persistent Disk ↔ NKS Block Storage 간 **직접 마이그레이션 경로 없음**.
- PV 데이터는 **백업(스냅샷/파일 복사) → NKS 환경에서 복원** 절차를 거쳐야 함.
- **StorageClass 이름·파라미터가 완전히 다름** → 모든 PVC 매니페스트 수정 필요.
- GCS 사용 워크로드는 NCP Object Storage(S3 호환)로 전환 → SDK/CLI 코드 수정 필요 (엔드포인트, 인증 방식 변경).

## 2.5 IAM 체계 전면 변경

- **Workload Identity(GCP IAM ↔ K8s SA) → 사용 불가**.
- NCP는 **Sub Account + Access Key / Secret Key** 기반 인증.
- 워크로드에서 GCP 서비스에 직접 접근하던 코드(GCS SDK, Pub/Sub Client 등)는 **NCP SDK + NCP 인증** 방식으로 전부 교체.
- K8s RBAC 자체는 호환되지만 **외부 IdP(Google OAuth) 연동 부분은 재설정** 필요.

## 2.6 모니터링·로깅 자동 수집 → 수동 구축

- GKE에서 **자동으로 수집되던** 노드/Pod 메트릭, 컨테이너 로그가 NKS에서는 별도 설정 필요.
- NCP **Cloud Insight** 기본 연동 범위가 GKE Cloud Monitoring 대비 제한적.
- 종합 관측성을 확보하려면 **Prometheus + Grafana + Loki(또는 EFK)** 스택 직접 구축 권장.
- 기존 Cloud Monitoring 알림 규칙은 **수동으로 재생성**해야 함.

## 2.7 DNS 전환 전략

- 전환 최소 **48시간 전에 DNS TTL을 60초 이하**로 낮출 것.
- GKE ↔ NKS **동시 운영 구간**에서 Weighted DNS 또는 Blue-Green 전환으로 무중단 이관.
- NKS 측에 **Health Check를 반드시 설정**하여 이상 시 GKE 자동 롤백 가능하도록 구성.

## 2.8 이미지 레지스트리 이전

- Artifact Registry(pkg.dev) / GCR(gcr.io) → **NCP Container Registry**(ncr.ntruss.com)로 벌크 복사.
- 도구: `skopeo copy` 또는 `crane copy`
- 이후 모든 Deployment, StatefulSet 등의 매니페스트에서 **이미지 경로를 일괄 변경**.

```bash
skopeo copy \
  docker://asia-northeast3-docker.pkg.dev/my-project/my-repo/app:v1 \
  docker://my-registry.kr.ncr.ntruss.com/app:v1
```

<br>

---

# 3. GKE vs NKS 기능 호환성 비교표

GKE 기능을 기준으로 NKS의 지원 여부와, 미지원 시 대체 방안을 정리합니다.

## 3.1 클러스터 관리

| 기능 | GKE | NKS | 비고 |
|------|:---:|:---:|------|
| 관리형 컨트롤 플레인 | O | O | 양측 모두 무료 관리 |
| Autopilot (완전 관리형 노드) | O | X | NKS는 Standard 유사 모드만 제공. **수동 노드풀 관리 필요** |
| Managed 유형 (인프라 전반 관리) | — | O | NKS 고유 기능. 워커 노드까지 NCP가 관리 (이미지 배포에만 집중) |
| Standard 유형 (노드풀 직접 관리) | O | O | 양측 대응 |
| Node Auto-provisioning (NAP) | O | X | NKS는 노드풀을 **사전에 수동 구성** 필요 |
| Cluster Autoscaler | O | O | 양측 지원 (NKS는 노드풀 단위) |
| Vertical Pod Autoscaler (VPA) | O | O | 표준 K8s 기능이므로 직접 설치·운용 가능 |

## 3.2 업그레이드 및 버전 관리

| 기능 | GKE | NKS | 비고 |
|------|:---:|:---:|------|
| Release Channel (Rapid/Regular/Stable/Extended) | O | X | NKS는 지원 버전 중 **수동 선택** 방식 |
| 자동 컨트롤 플레인 업그레이드 | O | X | NKS는 콘솔/API로 **수동 업그레이드** |
| 자동 노드 업그레이드 | O | X | NKS는 **수동 노드 업그레이드** |
| 유지보수 기간 / 제외 설정 | O | X | 직접 운영 일정 관리 필요 |
| 연장 채널 (최대 24개월 지원) | O | X | NKS는 제공되는 버전 범위 내에서만 운영 |
| 가속화된 패치 자동 업그레이드 | O | X | — |
| 출시 시퀀싱 (환경 간 순차 업그레이드) | O | X | **ArgoCD Rollout** 등으로 직접 구현 가능 |

## 3.3 멀티 클러스터 관리

| 기능 | GKE | NKS | 비고 |
|------|:---:|:---:|------|
| Fleet (클러스터 그룹 관리) | O | X | NKS는 클러스터 **개별 관리** |
| Connect Gateway (통합 kubectl 접근) | O | X | 각 클러스터에 **직접 kubeconfig** 구성 |
| Connect Agent (외부 클러스터 통합) | O | X | NKS 전용 에이전트 없음 |
| Fleet 기반 팀 관리 | O | X | NKS에서는 RBAC + Namespace로 직접 구분 |
| 멀티 클러스터 Service / Ingress | O | X | **Submariner** 또는 **Cilium ClusterMesh** 등 3rd-party로 구현 가능 |
| Config Sync (Fleet 전체 구성 동기화) | O | X | **ArgoCD / FluxCD**로 대체 |
| Policy Controller | O | X | **OPA Gatekeeper / Kyverno**로 대체 |

## 3.4 네트워크

| 기능 | GKE | NKS | 비고 |
|------|:---:|:---:|------|
| VPC-native 클러스터 (Alias IP) | O | X | NKS는 NCP VPC Subnet 기반 Pod IP 할당 |
| Dataplane V2 (Cilium eBPF) | O | X | NKS는 **Calico** 기반 |
| NetworkPolicy (표준) | O | O | 양측 지원. 단, GKE FQDN 정책은 NKS 비호환 |
| GCE Ingress Controller | O | X | **nginx-ingress-controller** 직접 배포 |
| Gateway API (HTTPRoute, Gateway) | O | X | **nginx-ingress** 또는 **NCP ALB** 사용 |
| Google 관리형 TLS 인증서 | O | X | **cert-manager** + Let's Encrypt 또는 **NCP Certificate Manager** |
| Internal Load Balancer | O | O | NCP **Private Load Balancer**로 대응 |
| Cloud DNS 통합 | O | X | **NCP Global DNS** + ExternalDNS addon |
| Cloud Armor (WAF) | O | X | **NCP Security Monitoring**(WAF) 또는 **ModSecurity** |

## 3.5 스토리지

| 기능 | GKE | NKS | 비고 |
|------|:---:|:---:|------|
| Persistent Disk (pd-standard/pd-ssd) | O | X | **NCP Block Storage** CSI 사용 |
| Filestore (관리형 NFS) | O | X | **NCP NAS** 사용 |
| GCS FUSE (Object Storage 마운트) | O | X | **s3fs** 또는 **goofys**로 NCP Object Storage 마운트 |
| Backup for GKE (클러스터/워크로드 백업) | O | X | **Velero** (3rd-party)로 대체 |
| Volume Snapshot | O | O | NKS CSI 드라이버에서 지원 |

## 3.6 보안

| 기능 | GKE | NKS | 비고 |
|------|:---:|:---:|------|
| Workload Identity (GCP IAM ↔ K8s SA) | O | X | **NCP Sub Account + Access Key/Secret Key** 방식 |
| Binary Authorization (이미지 서명 검증) | O | X | **Sigstore/Cosign + OPA Gatekeeper** |
| GKE Sandbox (gVisor 기반 격리) | O | X | **Kata Containers** 또는 **gVisor** 직접 설치 (제한적) |
| Confidential GKE Nodes | O | X | NKS 미지원 |
| Container-Optimized OS | O | X | NKS는 **Ubuntu** 기반 노드 |
| 보안 상태 대시보드 | O | X | **Trivy + Grafana** 또는 **NCP Security Monitoring** |
| Secret Manager 연동 | O | X | **NCP Key Management Service** 또는 **External Secrets Operator** |
| Pod Security Standards (PSS/PSA) | O | O | K8s 표준 기능. NKS 버전이 지원하면 사용 가능 |

## 3.7 CI/CD 및 GitOps

| 기능 | GKE | NKS | 비고 |
|------|:---:|:---:|------|
| Cloud Build (관리형 CI) | O | X | **NCP SourceBuild** 또는 **GitHub Actions / Jenkins** |
| Cloud Deploy (관리형 CD) | O | X | **ArgoCD / FluxCD / Spinnaker** |
| Artifact Registry (컨테이너+패키지) | O | X | **NCP Container Registry** (컨테이너 이미지만) |
| Config Sync (GitOps) | O | X | **ArgoCD / FluxCD** |

## 3.8 관측성 (Observability)

| 기능 | GKE | NKS | 비고 |
|------|:---:|:---:|------|
| Cloud Monitoring (자동 메트릭 수집) | O | X | **NCP Cloud Insight** 또는 **Prometheus + Grafana** |
| Cloud Logging (자동 로그 수집) | O | X | **NCP Cloud Log Analytics** 또는 **EFK / Loki** |
| Cloud Trace (분산 추적) | O | X | **Jaeger / Tempo** |
| Managed Prometheus | O | X | **Prometheus** 직접 운영 (Helm chart) |
| GKE Dashboard | O | X | **Kubernetes Dashboard** 또는 **Headlamp / Lens** |

## 3.9 기타

| 기능 | GKE | NKS | 비고 |
|------|:---:|:---:|------|
| Anthos Service Mesh (관리형 Istio) | O | X | **Istio / Linkerd** 직접 설치 |
| Migrate for GKE (VM → 컨테이너) | O | X | — |
| GKE Sandbox (gVisor) | O | X | — |
| Spot Pod (Spot VM 기반 Pod) | O | X | NKS에서 Spot 노드 미지원 |
| GPU 다양성 (T4/A100/H100/L4/TPU) | O | △ | NKS GPU 옵션 제한적. **TPU 미지원** |
| Terraform Provider 성숙도 | O | △ | NCP Terraform Provider는 기능 제한적 |
| 글로벌 리전 (40+) | O | X | NKS는 한국·싱가포르·일본 등 제한적 리전 |

<br>

---

# 4. 고객사가 사전에 인지해야 할 사항

## 4.1 운영 부담 증가

> GKE(특히 Autopilot)에서 자동 처리되던 영역이 NKS에서는 **직접 관리 영역**으로 전환됩니다.

| 영역 | GKE | NKS 전환 후 |
|------|-----|------------|
| 노드 프로비저닝·스케일링 | Autopilot 자동 | 노드풀 수동 구성, AutoScaler 설정 |
| K8s 버전 업그레이드 | Release Channel 자동 | 콘솔/API에서 수동 트리거 |
| 보안 패치 적용 | 자동 패치 | 수동 업그레이드 또는 NKS 패치 대기 |
| 모니터링 스택 | Cloud Monitoring 기본 제공 | Prometheus+Grafana 직접 구축·운영 |
| 로그 수집 | Cloud Logging 기본 제공 | EFK/Loki 직접 구축 또는 Cloud Log Analytics |
| 인증서 관리 | Google 관리형 인증서 | cert-manager 직접 운영 |
| GitOps/정책 관리 | Config Sync, Policy Controller | ArgoCD + OPA Gatekeeper 직접 운영 |

**핵심**: 운영 인력 확보 또는 운영 자동화(IaC, GitOps) 도입이 선행되어야 합니다.

## 4.2 GCP 종속 서비스 대체가 불가능한 영역

아래 GCP 서비스는 NCP에 **1:1 대응 서비스가 없거나 기능 격차가 큼**.

| GCP 서비스 | NCP 상황 | 대응 방안 |
|-----------|---------|----------|
| BigQuery | 직접 대응 없음 | ClickHouse / Apache Spark (NKS 위 직접 구축) 또는 NCP Data Forest |
| Cloud Pub/Sub | 직접 대응 없음 | Apache Kafka (NKS 위 직접 구축) 또는 NCP Cloud Functions 활용 |
| Cloud Spanner | 직접 대응 없음 | CockroachDB / TiDB (직접 구축) |
| Anthos Service Mesh | 직접 대응 없음 | Istio / Linkerd (직접 설치·운영) |
| Binary Authorization | 직접 대응 없음 | Sigstore + OPA Gatekeeper (직접 구축) |

→ **직접 구축 시 추가 인프라 비용 + 운영 인력 비용** 발생을 사전에 비용 계획에 반영해야 합니다.

## 4.3 마이그레이션 중 서비스 영향

- **완전 무중단 이관은 가능하지만 준비 공수가 큼.** Blue-Green + Weighted DNS 전환 필요.
- 데이터베이스(Cloud SQL → NCP Cloud DB) 이관 시 **동기화 지연 구간** 발생 가능 → 데이터 정합성 검증 절차 필요.
- 이미지 레지스트리 이전, 매니페스트 변경, DNS 전환 등 **병렬 작업 조율이 핵심**.
- **롤백 계획을 반드시 수립.** GKE 리소스를 마이그레이션 완료 후 최소 2주간 유지하여 즉시 복귀 가능하도록 할 것.

## 4.4 비용 구조 변화

| 비용 요소 | 변화 방향 | 설명 |
|-----------|----------|------|
| 컴퓨팅 | 유사~소폭 증감 | 노드 스펙에 따라 NCP 약정 활용 시 비슷한 수준 |
| 운영 인력 | **증가 가능** | Autopilot 자동 관리 → 수동 관리 전환으로 운영 부담 증가 |
| 관측성 스택 | **증가 가능** | Prometheus+Grafana+Loki 직접 운영 시 추가 리소스·관리 비용 |
| GCP 미대응 서비스 직접 구축 | **증가** | Kafka, ClickHouse 등 직접 운영 시 인프라+운영 비용 발생 |
| 네트워크 | **감소 가능** | 국내 트래픽 중심이면 NCP가 유리 |
| 환율 리스크 | **제거** | 원화 결제로 환율 변동 리스크 없음 |
| 규제 대응 | **감소** | CSAP/금융 인증 기반으로 규제 대응 비용 절감 |

## 4.5 일정 관련

- PoC(1~2개 핵심 워크로드 선행 검증)를 **반드시 포함**할 것.
- 비프로덕션(Dev/Staging) → 프로덕션 순서로 **단계적 전환**이 원칙.
- Big Bang 전환은 리스크가 크므로 **권장하지 않음**.
- 마이그레이션 완료 후 **안정화 기간(최소 2~4주)** 확보 필요.

## 4.6 조직 역량

- NKS 운영 경험이 없는 조직이라면, 마이그레이션 전 **NKS 교육 및 핸즈온 워크숍**을 선행.
- Prometheus, ArgoCD, Istio 등 **오픈소스 운영 역량**이 요구됨. GKE에서 관리형으로 사용하던 것을 직접 운영해야 하므로.
- NCP 기술지원(한국어) 채널을 사전에 확보하고, 지원 범위(SLA)를 계약 단계에서 명확히 할 것.

<br>

---

# 참고 자료

- [GKE 개요 및 주요 기능 정리](/k8s/gke-overview/) (내부 문서)
- [GKE → NKS 마이그레이션 비교 분석](/k8s/Migration-GKE-→-NKS-마이그레이션-비교-분석/) (내부 문서)
- [GKE 클러스터 아키텍처](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/cluster-architecture?hl=ko)
- [Ncloud Kubernetes Service](https://www.ncloud.com/product/compute/kubernetes)
- [NCP Container Registry](https://www.ncloud.com/product/containers/containerRegistry)
