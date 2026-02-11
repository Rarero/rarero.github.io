---
layout: post
title: "[k8s] Kubernetes 학습 전체 로드맵"
date: 2025-01-01 08:00:00 +0900
tags: [Docker, Kubernetes, Roadmap, Learning Path, On-Premise, AKS, CKA]
categories: k8s
---

이 문서는 Kubernetes 전문가가 되기 위한 전체 학습 로드맵을 제시합니다. Docker 컨테이너 기초부터 Kubernetes 아키텍처 이해, On-Premise 클러스터 구축, Azure Kubernetes Service (AKS) 운영, 그리고 CKA 자격증 취득까지 체계적인 학습 경로를 안내합니다.

> **참고**: 이 로드맵은 [roadmap.sh/docker](https://roadmap.sh/docker)와 [roadmap.sh/kubernetes](https://roadmap.sh/kubernetes)의 학습 체계를 참고하여 재구성하였습니다.

<br>

## 학습 구조

**Phase 0: Docker & 컨테이너 기초 (3주)**
- Week 1: 컨테이너 기초 & Docker 기반 기술 (Linux, Namespace, cgroups, Union FS, Docker 설치)
- Week 2: Docker 핵심 사용법 & 이미지 빌드 (데이터 영속성, Dockerfile, 멀티스테이지 빌드, 레지스트리)
- Week 3: Docker Compose, 보안, 개발자 워크플로우 & Kubernetes 아키텍처 입문

**Phase 1: On-Premise Kubernetes (6주)**
- Week 4: 클러스터 구축 (Kubeadm, Minikube, Kind, kubectl)
- Week 5: Workload 리소스 & 구성 관리 (Pod, Deployment, StatefulSet, Job + ConfigMap, Secret, 리소스 관리)
- Week 6: 서비스 & 네트워킹 (Service, Ingress, DNS, CNI, NetworkPolicy)
- Week 7: 스토리지 & 볼륨 (PV/PVC, CSI Driver, StorageClass, NFS)
- Week 8: 스케줄링 & 오토스케일링 (Taints/Tolerations, Affinity, HPA, VPA, Cluster Autoscaler)
- Week 9: 배포 패턴 & Helm (Helm Charts, Canary, Rolling Update/Rollback, GitOps 기초)

**Phase 2: Azure Kubernetes Service (5주)**
- Week 10: AKS 기초 & Azure 네트워킹 통합 (클러스터 생성, Azure CNI, AGIC, Private AKS)
- Week 11: 스토리지, 데이터 관리 & 스케일링, 비용 최적화 (Azure Disk/File CSI, Key Vault, KEDA, Spot VM)
- Week 12: 모니터링 & 로깅 (Container Insights, Managed Prometheus, Grafana, Traces)
- Week 13: 보안 강화 (Workload Identity, Defender for Containers, Azure Policy, Pod Security)
- Week 14: CI/CD & GitOps (Azure DevOps, GitHub Actions, ArgoCD/Flux)

**Phase 3: CKA 시험 준비 (6주)**
- Week 15: 클러스터 유지보수 & etcd
- Week 16: 보안 & RBAC
- Week 17: 장애 대응 (Troubleshooting)
- Week 18: 로그 수집 아키텍처
- Week 19: Prometheus & Grafana
- Week 20: CKA 실전 시뮬레이션

**Appendix: 고급 주제 (선택)**
- Custom Resource Definitions (CRDs) & Operators
- Service Mesh (Istio, Linkerd)
- Multi-cluster & Federation

총 학습 기간: 약 20주 (5개월) + a

<br>

## 학습 구조 시각화: roadmap.sh 대비 커버리지

```
roadmap.sh/docker (57개 항목)              이 로드맵 커버리지
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━
컨테이너 개념 (What/Why/비교)        ───▶  Phase 0 Week 1
Linux 기초 (Package, Shell 등)       ───▶  Phase 0 Week 1
기반 기술 (Namespace, cgroups, UFS)  ───▶  Phase 0 Week 1
Docker 설치 (Desktop, Engine)        ───▶  Phase 0 Week 1
Docker 기본 (Volume, Bind Mount)     ───▶  Phase 0 Week 2
이미지 빌드 (Dockerfile, Caching)    ───▶  Phase 0 Week 2
컨테이너 레지스트리 (DockerHub 등)   ───▶  Phase 0 Week 2
Docker Run & Docker Compose          ───▶  Phase 0 Week 3
컨테이너 보안                        ───▶  Phase 0 Week 3
개발자 경험 (CI, Debuggers)          ───▶  Phase 0 Week 3
Docker & OCI 표준                    ───▶  Phase 0 Week 3

roadmap.sh/kubernetes (67개 항목)           이 로드맵 커버리지
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━
K8s 소개 & 설정                      ───▶  Phase 0 Week 3
Workload (Pod~Job)                   ───▶  Phase 1 Week 5
서비스 & 네트워킹                    ───▶  Phase 1 Week 6
ConfigMap & Secret                   ───▶  Phase 1 Week 5
Resource Requests/Limits/Quotas      ───▶  Phase 1 Week 5
보안 (RBAC, NetworkPolicy, PodSec)   ───▶  Phase 1 Week 6 / Phase 2 Week 13
모니터링 (Logs, Metrics, Traces)     ───▶  Phase 2 Week 12
오토스케일링 (HPA, VPA, Cluster)     ───▶  Phase 1 Week 8
스케줄링 (Taints, Topology, 우선순위)───▶  Phase 1 Week 8
스토리지 (CSI Driver)                ───▶  Phase 1 Week 7
배포 패턴 (Helm, Canary, GitOps)     ───▶  Phase 1 Week 9
CRD & Operators                      ───▶  Appendix
Service Mesh                         ───▶  Appendix
```

<br>

## 학습 목표

### 최종 목표

1. Docker 컨테이너를 자유자재로 빌드, 배포, 관리할 수 있는 능력
2. Kubernetes 클러스터를 처음부터 끝까지 구축하고 운영할 수 있는 능력
3. 프로덕션 환경의 복잡한 장애를 신속하게 진단하고 해결하는 능력
4. CKA (Certified Kubernetes Administrator) 자격증 취득
5. Azure 환경에서 엔터프라이즈급 Kubernetes 인프라 설계

### 핵심 역량 매트릭스

| 역량 | Phase 0 | On-Premise | AKS | CKA | Appendix |
|------|---------|-----------|-----|-----|----------|
| Docker & 컨테이너 | 5 | 3 | 2 | 2 | 2 |
| K8s 아키텍처 | 3 | 4 | 3 | 4 | 4 |
| 클러스터 구축 | 2 | 5 | 3 | 4 | 3 |
| 네트워킹 | 2 | 5 | 4 | 3 | 4 |
| 스토리지 | 2 | 4 | 5 | 3 | 2 |
| 구성 관리 | 1 | 4 | 4 | 3 | 2 |
| 오토스케일링 | 1 | 4 | 5 | 3 | 2 |
| 모니터링 & 관측성 | 1 | 3 | 5 | 4 | 3 |
| 장애 대응 | 1 | 4 | 3 | 5 | 3 |
| 보안 | 2 | 3 | 5 | 4 | 3 |
| CI/CD & GitOps | 2 | 2 | 5 | 1 | 3 |
| Helm & 배포 패턴 | 1 | 4 | 4 | 3 | 4 |
| CRD/Operator/Mesh | - | 1 | 2 | 1 | 5 |

(1~5: 해당 Phase에서의 학습 깊이. 5가 가장 깊음)

<br>

## 학습 트랙 상세

### Phase 0: Docker & 컨테이너 기초 (3주)

대상: 컨테이너를 처음 접하는 사람, Linux 기초부터 시작하려는 사람

학습 내용:

**Week 1 - 컨테이너 기초 & Docker 기반 기술**
- **Linux 기초**: 패키지 관리자 (apt, yum), 사용자/그룹/권한 체계 (UID/GID, chmod, chown), Shell 명령어 & 기본 스크립팅, 프로세스 관리 (ps, top, kill, systemctl), 파일시스템 구조 (/proc, /sys, /etc)
- **컨테이너 개념**: Bare Metal vs VM vs Container 아키텍처 비교, 컨테이너가 해결하는 문제 (환경 일관성, 격리, 경량 가상화), OCI (Open Container Initiative) 표준 개요
- **Docker 기반 기술** (컨테이너가 동작하는 원리): Linux Namespace (PID, Network, Mount, UTS, IPC, User), cgroups (CPU, Memory, I/O 리소스 제한), Union Filesystem (OverlayFS, 레이어 기반 파일시스템), chroot와 컨테이너의 관계
- **Docker 설치 & 첫 실행**: Docker Desktop vs Docker Engine (CE vs EE), Docker 데몬 아키텍처 (dockerd, containerd, runc), 컨테이너 라이프사이클 (create, start, stop, rm), docker run / docker ps / docker logs 기본 명령어

**Week 2 - Docker 핵심 사용법 & 이미지 빌드**
- **데이터 영속성**: Ephemeral Filesystem (컨테이너 삭제 시 데이터 소멸), Volume Mount (Docker 관리 명명된 볼륨), Bind Mount (호스트 디렉토리 마운트), tmpfs Mount (메모리 기반 임시 스토리지), Volume vs Bind Mount 선택 기준
- **3rd Party 이미지 활용**: 데이터베이스 (MySQL, PostgreSQL), 캐시 & 메시지 큐 (Redis, RabbitMQ), 웹 서버 (Nginx, Apache), Docker Hub 이미지 검색과 태그 이해, Official Image vs Community Image 차이
- **Dockerfile & 이미지 빌드**: 기본 명령어 (FROM, RUN, COPY, ADD, WORKDIR, EXPOSE, CMD, ENTRYPOINT), CMD vs ENTRYPOINT 차이와 조합, 레이어 캐싱 원리와 빌드 최적화 전략, .dockerignore 파일 활용, 멀티스테이지 빌드로 이미지 크기 최적화, 이미지 경량화 (Alpine 기반, Distroless), 빌드 인자 (ARG)와 환경 변수 (ENV) 차이
- **컨테이너 레지스트리**: DockerHub, Azure Container Registry (ACR), GitHub Container Registry (GHCR), 이미지 태깅 전략 (latest, semantic versioning, git commit hash), docker push / docker pull 워크플로우, Private Registry 운영 (Harbor)

**Week 3 - Docker Compose, 보안, 개발자 워크플로우 & K8s 입문**
- **Docker Compose**: 다중 컨테이너 오케스트레이션의 필요성, docker-compose.yml 구조 (services, networks, volumes), depends_on / healthcheck / restart policy, 환경별 Compose 파일 관리 (override), Docker Compose와 Kubernetes의 차이
- **컨테이너 보안**: 이미지 취약점 스캐닝 (Trivy, Docker Scout), rootless 컨테이너 실행, Read-only 파일시스템, 시크릿 관리 주의사항 (이미지에 하드코딩 금지), 컨테이너 런타임 보안 체크리스트
- **개발자 워크플로우**: Hot Reloading 설정 (Bind Mount + nodemon/air 등), 컨테이너 내부 디버깅 (docker exec, docker logs), Docker 기반 CI 파이프라인 기초, 개발/스테이징/프로덕션 이미지 관리
- **Kubernetes 아키텍처 입문**: Docker만으로 부족한 이유 (멀티 호스트 관리, 자가 복구, 선언적 관리), Control Plane 컴포넌트 (kube-apiserver, etcd, kube-scheduler, kube-controller-manager), Node 컴포넌트 (kubelet, kube-proxy, container runtime), 선언적(Declarative) vs 명령적(Imperative) 관리 방식, Desired State와 Reconciliation Loop 개념

준비물:
- Docker Desktop 또는 Docker Engine 설치
- Linux 환경 (VM 또는 WSL2)

[컨테이너 & Docker 기초 로드맵 보기](#) (작성 예정)

<br>

### Phase 1: On-Premise Kubernetes (6주)

대상: Docker를 이해한 사람, 클라우드 없이 Kubernetes를 직접 구축하고 싶은 사람

학습 내용:

**Week 4 - 클러스터 구축**
- **Kubeadm 기반 3-Node 클러스터** (Master 1 + Worker 2): 사전 요구사항 (swap off, br_netfilter, ip_forward), containerd 런타임 설치 및 설정, kubeadm init으로 Control Plane 초기화, kubeadm join으로 Worker 노드 추가, CNI 플러그인 설치 (Calico/Flannel)
- **로컬 개발 환경**: Minikube (단일 노드 로컬 클러스터), Kind (Docker-in-Docker 기반 멀티노드 클러스터), 관리형 서비스 비교 (EKS vs AKS vs GKE) 개요
- **kubectl 기본 사용법**: 리소스 조회 (get, describe, logs), 리소스 생성/삭제 (apply, delete), 컨텍스트 & 네임스페이스 관리, kubeconfig 구조 이해, kubectl explain으로 API 리소스 탐색

**Week 5 - Workload 리소스 & 구성 관리**
- **Pod 기초**: Pod 라이프사이클 (Pending, Running, Succeeded/Failed), 단일 컨테이너 Pod vs 멀티 컨테이너 Pod, Pod 설계 패턴 (Sidecar, Init Container, Ambassador, Adapter), Pod 내부 컨테이너 간 통신 (localhost, 공유 볼륨), Probe (Liveness, Readiness, Startup)
- **Workload 컨트롤러**: ReplicaSet (Pod 복제본 유지, Label Selector), Deployment (선언적 업데이트, 롤아웃 전략), StatefulSet (순서 보장, 안정적 네트워크 ID, 영속 스토리지), DaemonSet (모든 노드에 Pod 배치), Job/CronJob (일회성/주기적 작업 실행)
- **구성 관리**: ConfigMap (설정 데이터 분리, 환경변수/볼륨 마운트로 주입), Secret (Opaque/TLS/docker-registry 타입), envFrom으로 일괄 주입 vs 개별 key 선택 주입, ConfigMap/Secret 변경 시 Pod 반영 방식 (Rolling restart)
- **리소스 관리**: Resource Requests & Limits (CPU/Memory), QoS 클래스 (Guaranteed, Burstable, BestEffort), LimitRange (네임스페이스별 기본 리소스 제한), ResourceQuota (네임스페이스 총 리소스 사용량 제한)

**Week 6 - 서비스 & 네트워킹**
- **Service 타입**: ClusterIP (클러스터 내부 통신), NodePort (노드 포트를 통한 외부 노출), LoadBalancer (클라우드 L4 로드밸런서), ExternalName (외부 DNS 이름 매핑), Headless Service (StatefulSet 조합)
- **Ingress**: Ingress Controller 역할 (Nginx, Traefik), Ingress 규칙 (호스트 기반, 경로 기반 라우팅), TLS 종단 처리, Ingress Class 개념
- **네트워킹 심화**: Pod-to-Pod 통신 원리 (같은 노드, 다른 노드), CNI 플러그인 비교 (Calico, Flannel, Cilium, Weave), kube-proxy 동작 모드 (iptables vs IPVS), CoreDNS (서비스 디스커버리, Pod DNS 정책), NetworkPolicy (Ingress/Egress 규칙으로 Pod 간 통신 제어), iptables 규칙 분석으로 서비스 라우팅 이해

**Week 7 - 스토리지 & 볼륨**
- **볼륨 기초**: emptyDir (Pod 수준 임시 스토리지), hostPath (노드 파일시스템 마운트, 개발용)
- **PV / PVC**: PV (관리자가 프로비저닝하는 스토리지 리소스), PVC (사용자의 스토리지 요청), Access Modes (ReadWriteOnce, ReadOnlyMany, ReadWriteMany), Reclaim Policy (Retain, Delete, Recycle)
- **StorageClass & 동적 프로비저닝**: StorageClass 정의와 파라미터, 동적 PV 생성 흐름, Default StorageClass 설정
- **CSI (Container Storage Interface)**: CSI Driver 아키텍처, NFS CSI Driver 설치 및 구성, 볼륨 스냅샷과 복원
- **StatefulSet과 스토리지 조합**: volumeClaimTemplates로 Pod당 PVC 자동 생성, 스토리지 확장 (Volume Expansion)

**Week 8 - 스케줄링 & 오토스케일링**
- **kube-scheduler 동작 원리**: 스케줄링 파이프라인 (Filtering, Scoring), 스케줄링 실패 원인 분석 (Pending Pod)
- **스케줄링 제어**: Taints & Tolerations (특정 노드에 배치 거부/허용), Node Affinity/Anti-Affinity (선호/필수 노드 선택), Pod Affinity/Anti-Affinity (Pod 간 배치 규칙), Topology Spread Constraints (가용영역 분산), Pod Priority & Preemption (중요 워크로드 우선 배치)
- **Pod Disruption Budget (PDB)**: 자발적 중단 vs 비자발적 중단, minAvailable / maxUnavailable 설정
- **오토스케일링**: HPA (Horizontal Pod Autoscaler, CPU/Memory/사용자정의 메트릭 기반), VPA (Vertical Pod Autoscaler, Pod 리소스 자동 조정), Cluster Autoscaler (노드 수준 자동 확장/축소), Metrics Server 설치와 역할

**Week 9 - 배포 패턴 & Helm**
- **Helm**: Helm 아키텍처 (Chart, Release, Repository), Helm Chart 구조 (Chart.yaml, values.yaml, templates/), Chart 설치/업그레이드/롤백, Helm 템플릿 문법 (Go templates, values, helpers), 커스텀 Chart 작성, Chart Repository 운영 (ChartMuseum, OCI Registry)
- **배포 전략**: Rolling Update (maxSurge, maxUnavailable 설정), Rollback (revision 관리, kubectl rollout undo), Canary Deployment (수동 가중치 기반 배포), Blue-Green Deployment (서비스 전환 방식)
- **GitOps 기초**: GitOps 원칙 (Git을 Single Source of Truth로 사용), ArgoCD 소개 (설치, Application 정의, 동기화), Flux 소개 (구성 요소, HelmRelease), GitOps vs 전통적 CI/CD 비교

준비물:
- VirtualBox/VMware (VM 3대: Master 1 + Worker 2)
- 또는 Azure VM (Ubuntu 22.04 LTS)
- 최소 사양: CPU 2Core, RAM 4GB (VM당)

[On-Premise Kubernetes 로드맵 보기](/k8s/k8s-onprem-roadmap)

<br>

### Phase 2: Azure Kubernetes Service (5주)

대상: Azure 환경에서 Kubernetes를 운영하려는 사람

학습 내용:

**Week 10 - AKS 기초 & Azure 네트워킹 통합**
- **AKS 기초**: AKS vs On-Premise 운영 차이 (Control Plane 관리 주체, SLA), Azure Portal에서 AKS 클러스터 생성, Azure CLI (az aks create)로 클러스터 생성, 노드 풀 구성 (System Node Pool vs User Node Pool), AKS 클러스터 업그레이드 전략, Azure AD 통합 (Azure RBAC for Kubernetes), Managed Provider 선택 기준 (AKS vs EKS vs GKE)
- **Azure 네트워킹 통합**: 네트워크 모델 비교 (Azure CNI vs Kubenet vs Azure CNI Overlay), AKS와 Azure VNet 통합 및 Subnet 설계, NSG (Network Security Group) 연동, AGIC (Application Gateway Ingress Controller) 구성, Private AKS 클러스터 (API 서버 비공개 접근), Azure Private Link / Private Endpoint 연동, Azure DNS Zone 통합

**Week 11 - 스토리지, 데이터 관리 & 스케일링, 비용 최적화**
- **Azure 스토리지 통합**: Azure Disk CSI Driver (성능 티어: Standard/Premium/Ultra), Azure Files CSI Driver (SMB/NFS 프로토콜), StorageClass 정의와 동적 프로비저닝, Azure Key Vault Provider for Secrets Store CSI Driver, Key Vault에서 인증서/시크릿 자동 동기화
- **스케일링 & 비용 최적화**: Cluster Autoscaler (AKS에서의 설정과 동작), KEDA (Kubernetes Event-Driven Autoscaling, 이벤트 기반 스케일링), Spot VM Node Pool (비용 절감과 한계), Azure Reserved Instances & Savings Plans, 비용 분석 (Azure Cost Management + Kubecost), 노드 풀 전략 (워크로드별 노드 풀 분리), Start/Stop 클러스터 기능으로 개발 환경 비용 절감

**Week 12 - 모니터링 & 로깅**
- **Container Insights**: 활성화 및 Log Analytics 워크스페이스 연동, 노드/Pod/컨테이너 메트릭 수집, KQL (Kusto Query Language) 기본 쿼리, Live Logs로 실시간 로그 확인
- **Managed Prometheus & Grafana**: Azure Monitor Managed Prometheus 설정, Azure Managed Grafana 연동, PromQL 쿼리로 커스텀 메트릭 조회, Grafana 대시보드 구성 (클러스터, 노드, 워크로드)
- **알림 설정**: Azure Monitor Alert Rules 구성, Action Group으로 알림 채널 설정 (이메일, Teams, Webhook), Prometheus Alert Rules (AlertManager)
- **Distributed Tracing**: Application Insights 연동, OpenTelemetry Collector 배포, 요청 추적과 성능 병목 분석

**Week 13 - 보안 강화**
- **ID 및 접근 관리**: Workload Identity (Pod에서 Azure 리소스 접근), Managed Identity vs Service Principal 비교, Azure RBAC for AKS vs Kubernetes RBAC, Conditional Access 정책 적용
- **런타임 보안**: Microsoft Defender for Containers (위협 탐지), Azure Policy for AKS (Built-in 정책으로 규정 준수), Pod Security Standards (Restricted/Baseline/Privileged), Image Integrity (이미지 서명 검증)
- **네트워크 보안**: Kubernetes NetworkPolicy, Azure Firewall / NSG 연동, Azure Private Link로 PaaS 서비스 접근

**Week 14 - CI/CD & GitOps**
- **CI 파이프라인**: Azure DevOps Pipeline (빌드, 테스트, 이미지 빌드, ACR 푸시), GitHub Actions (workflow 구성, AKS 배포 액션), ACR Build Tasks (서버리스 이미지 빌드)
- **CD 파이프라인**: Helm 기반 배포 자동화, Kustomize 활용 (환경별 오버레이), 배포 승인 게이트 (Approval Gates)
- **GitOps**: AKS에서 Flux 확장 (Azure GitOps Extension), ArgoCD (Application, ApplicationSet, App of Apps 패턴), 환경 분리 전략 (dev/staging/prod), GitOps 시 시크릿 관리 (Sealed Secrets, SOPS)

준비물:
- Azure 구독 (무료 크레딧 가능)
- Azure CLI 설치
- Git 기본 지식

[AKS 학습 로드맵 보기](/k8s/aks-roadmap)

<br>

### Phase 3: CKA 시험 준비 (6주)

대상: Kubernetes 공식 자격증을 취득하려는 사람

학습 내용:

**Week 15 - 클러스터 유지보수 & etcd**
- etcd 스냅샷 백업 및 복구 절차
- 클러스터 업그레이드 실습 (kubeadm upgrade, kubelet/kubectl 업그레이드)
- kubeadm 인증서 갱신 및 만료 관리
- Static Pod 관리 (/etc/kubernetes/manifests)

**Week 16 - 보안 & RBAC**
- Custom Role/ClusterRole 생성 및 RoleBinding/ClusterRoleBinding
- ServiceAccount와 Token 관리
- NetworkPolicy로 멀티 네임스페이스 격리
- kubeconfig 파일 관리 및 인증 구조

**Week 17 - 장애 대응 (Troubleshooting)**
- kubelet 장애 시뮬레이션 및 복구 (systemctl, journalctl)
- OOMKill 분석 및 리소스 재조정
- Node NotReady 상태 대응 절차
- Pod CrashLoopBackOff / ImagePullBackOff 디버깅
- kubectl debug, kubectl exec, kubectl logs 활용 전략

**Week 18 - 로그 수집 아키텍처**
- Fluent-bit DaemonSet 배포 및 설정
- Loki 연동으로 중앙 집중 로깅
- Fluent-bit + Loki + Grafana 스택 구축

**Week 19 - Prometheus & Grafana**
- Prometheus Operator 배포 및 구성
- PromQL 쿼리 작성 (rate, histogram_quantile, aggregation)
- 알림 규칙 (Recording Rules, Alerting Rules) 작성
- Grafana 대시보드 구성 및 패널 설정

**Week 20 - CKA 실전 시뮬레이션**
- killer.sh 모의고사 3회 이상 풀이
- 시간 관리 전략 (120분 내 17~20문제)
- 자주 출제되는 유형 정리 (RBAC, etcd, NetworkPolicy, Troubleshooting)
- 약점 보완 집중 학습

준비물:
- CKA 시험 등록 ($395)
- killer.sh 모의고사 액세스
- On-Premise 클러스터 (실습용)

[CKA 준비 로드맵 보기](#) (준비 중)

<br>

### Appendix: 고급 주제 (선택)

대상: Kubernetes 운영 경험이 있고 심화 영역을 탐구하려는 사람

학습 내용:
- **CRD & Operators**: Custom Resource Definitions 생성, Operator 패턴 이해 및 구현
- **Service Mesh**: Istio/Linkerd로 서비스 간 통신 관리, mTLS, 트래픽 제어
- **Multi-cluster & Federation**: 다중 클러스터 관리, 클러스터 간 서비스 디스커버리
- **고급 관측성**: OpenTelemetry, Jaeger 분산 트레이싱
- **Kubernetes Alternatives 비교**: Docker Swarm, Nomad, ECS 등

[고급 주제 보기](#) (준비 중)

<br>

## 주차별 학습 계획

<details>
<summary><strong>Phase 0: Docker & 컨테이너 기초 (Week 1-3)</strong></summary>

| Week | 주제 | 핵심 학습 내용 | 핵심 실습 | 포스트 링크 |
|------|------|--------------|----------|------------|
| 1 | 컨테이너 기초 & Docker 기반 기술 | Linux 기초 (Package Manager, Users/Permissions, Shell Scripting, 프로세스 관리), Bare Metal vs VM vs Container 비교, Namespace/cgroups/OverlayFS 동작 원리, Docker Desktop/Engine 설치, 컨테이너 라이프사이클 | Linux 기본 명령어 실습, Namespace/cgroups 직접 생성, Docker 설치 및 hello-world 실행, VM vs Container 성능 비교 | [바로가기](#) |
| 2 | Docker 핵심 사용법 & 이미지 빌드 | Volume Mount/Bind Mount/tmpfs 영속성, 3rd Party 이미지 (DB/Cache/Web), Dockerfile 명령어(FROM~ENTRYPOINT), 레이어 캐싱/멀티스테이지 빌드, 컨테이너 레지스트리(DockerHub/ACR/GHCR), 이미지 태깅 전략 | MySQL 컨테이너 + Volume 영속성, 멀티스테이지 빌드로 이미지 최적화, DockerHub에 이미지 push/pull | [바로가기](#) |
| 3 | Compose, 보안, 개발 워크플로우 & K8s 입문 | Docker Compose (services/networks/volumes, healthcheck, override), 보안 (Trivy 스캐닝, rootless), 개발 워크플로우 (Hot Reload, docker exec 디버깅, CI 기초), K8s 아키텍처 (Control Plane/Node 컴포넌트, Desired State 개념) | Compose로 웹앱+DB 실행, 이미지 취약점 스캔, K8s Control Plane 컴포넌트 분석 | [바로가기](#) |

[컨테이너 & Docker 기초 전체 로드맵 보기](#) (작성 예정)

</details>

<details>
<summary><strong>Phase 1: On-Premise Kubernetes (Week 4-9)</strong></summary>

| Week | 주제 | 핵심 학습 내용 | 핵심 실습 | 포스트 링크 |
|------|------|--------------|----------|------------|
| 4 | 클러스터 구축 | Kubeadm으로 3-Node 클러스터 (swap off, containerd, CNI), Minikube/Kind 로컬 환경, 관리형 서비스 비교 (EKS/AKS/GKE), kubectl 기본 사용법 (get/describe/apply/explain), kubeconfig 구조 | Kubeadm 설치, kubectl 기본 명령어, 첫 번째 앱 배포, kubeconfig 컨텍스트 전환 | [바로가기](#) |
| 5 | Workload 리소스 & 구성 관리 | Pod 라이프사이클/Probe(Liveness/Readiness/Startup), Deployment/StatefulSet/DaemonSet/Job/CronJob, Sidecar/Init Container 패턴, ConfigMap/Secret(envFrom/볼륨 마운트), Resource Requests/Limits, QoS 클래스, LimitRange/ResourceQuota | Deployment로 Nginx 배포, StatefulSet으로 DB 배포, ConfigMap으로 설정 주입, Secret으로 비밀번호 관리, Namespace Quota 설정 | [바로가기](#) |
| 6 | 서비스 & 네트워킹 | ClusterIP/NodePort/LoadBalancer/ExternalName/Headless Service, Ingress Controller(Nginx/Traefik), TLS 종단, CNI 비교(Calico/Flannel/Cilium), kube-proxy(iptables/IPVS), CoreDNS, NetworkPolicy(Ingress/Egress) | Ingress Controller 구성, NetworkPolicy로 Pod 간 통신 제어, iptables 규칙 분석, CoreDNS 설정 확인 | [바로가기](#) |
| 7 | 스토리지 & 볼륨 | emptyDir/hostPath, PV/PVC(Access Modes/Reclaim Policy), StorageClass와 동적 프로비저닝, CSI Driver 아키텍처, NFS CSI 구성, 볼륨 스냅샷/복원, volumeClaimTemplates | NFS PV 구성, CSI Driver 설치, StatefulSet + PVC 배포, 볼륨 스냅샷 생성/복원 | [바로가기](#) |
| 8 | 스케줄링 & 오토스케일링 | kube-scheduler(Filtering/Scoring), Taints/Tolerations, Node/Pod Affinity, Topology Spread, Pod Priority/Preemption, PDB, HPA(CPU/Memory/Custom), VPA, Cluster Autoscaler, Metrics Server | Taints/Tolerations 설정, HPA로 부하 기반 스케일링, PDB 구성, Metrics Server 설치 | [바로가기](#) |
| 9 | 배포 패턴 & Helm | Helm Chart 구조(Chart.yaml/values.yaml/templates), Chart 설치/업그레이드/롤백, 커스텀 Chart 작성, Rolling Update(maxSurge/maxUnavailable), Canary/Blue-Green, GitOps 원칙, ArgoCD/Flux 소개 | Helm으로 앱 패키징 배포, 롤링 업데이트 & 롤백 실습, ArgoCD 설치 및 Application 동기화 | [바로가기](#) |

[On-Premise 전체 로드맵 보기](/k8s/k8s-onprem-roadmap)

</details>

<details>
<summary><strong>Phase 2: Azure Kubernetes Service (Week 10-14)</strong></summary>

| Week | 주제 | 핵심 학습 내용 | 핵심 실습 | 포스트 링크 |
|------|------|--------------|----------|------------|
| 10 | AKS 기초 & Azure 네트워킹 | AKS vs On-Prem 차이(Control Plane SLA), Azure Portal/CLI 클러스터 생성, 노드 풀(System/User), Azure AD 통합, Azure CNI/Kubenet/CNI Overlay 비교, AGIC 구성, Private AKS 클러스터, VNet/Subnet/NSG 설계 | Azure Portal/CLI에서 AKS 클러스터 생성, kubectl 연결, Azure AD 연동, AGIC 구성, Private AKS 설정 | [바로가기](#) |
| 11 | 스토리지 & 스케일링 & 비용 | Azure Disk/File CSI Driver(Standard/Premium/Ultra), Key Vault Provider CSI, 동적 프로비저닝, Cluster Autoscaler, KEDA(이벤트 기반), Spot VM Node Pool, Azure Cost Management/Kubecost | Azure Disk/File CSI 구성, Key Vault Provider 연동, Cluster Autoscaler 설정, Spot VM 노드 풀 생성, 비용 대시보드 | [바로가기](#) |
| 12 | 모니터링 & 로깅 | Container Insights(Log Analytics/KQL/Live Logs), Managed Prometheus & Grafana, PromQL 쿼리, Azure Monitor Alert Rules/Action Group, Application Insights, OpenTelemetry Collector | Container Insights 활성화, Managed Prometheus 설정, Grafana 대시보드 구성, Alert Rules 생성 | [바로가기](#) |
| 13 | 보안 강화 | Workload Identity, Managed Identity vs Service Principal, Azure RBAC for AKS, Defender for Containers(위협 탐지), Azure Policy(Built-in 정책), Pod Security Standards, Image Integrity, NetworkPolicy/Azure Firewall 연동 | Workload Identity 구성, Defender 활성화, Azure Policy 적용, Pod Security Standards 설정 | [바로가기](#) |
| 14 | CI/CD & GitOps | Azure DevOps Pipeline(빌드/테스트/ACR 푸시), GitHub Actions(AKS 배포), ACR Build Tasks, Helm/Kustomize 기반 CD, Flux Extension/ArgoCD(ApplicationSet/App of Apps), 환경 분리(dev/staging/prod), 시크릿 관리(Sealed Secrets/SOPS) | Azure Pipeline으로 CI/CD, ArgoCD로 GitOps 배포, Flux Extension 설정 | [바로가기](#) |

[AKS 전체 로드맵 보기](/k8s/aks-roadmap)

</details>

<details>
<summary><strong>Phase 3: CKA 시험 준비 (Week 15-20)</strong></summary>

| Week | 주제 | 핵심 학습 내용 | 핵심 실습 | 포스트 링크 |
|------|------|--------------|----------|------------|
| 15 | 클러스터 유지보수 | etcd 백업/복구, 클러스터 업그레이드(kubeadm upgrade), kubeadm 인증서 갱신, Static Pod 관리 | etcd 스냅샷 백업/복원, 클러스터 v1.28에서 v1.29 업그레이드 | [바로가기](#) |
| 16 | 보안 & RBAC | Custom Role/ClusterRole 생성, RoleBinding, ServiceAccount/Token 관리, NetworkPolicy 멀티 네임스페이스 격리, kubeconfig 인증 구조 | 커스텀 RBAC 구성, NetworkPolicy로 멀티 네임스페이스 격리 | [바로가기](#) |
| 17 | 장애 대응 | kubelet 복구(systemctl/journalctl), OOMKill 분석/리소스 재조정, Node NotReady 대응, CrashLoopBackOff/ImagePullBackOff 디버깅, kubectl debug/exec/logs 활용 | kubelet 장애 시뮬레이션 & 복구, OOM 재현 & 분석 | [바로가기](#) |
| 18 | 로그 수집 아키텍처 | Fluent-bit DaemonSet 배포/설정, Loki 연동, 중앙 집중 로깅 파이프라인 | Fluent-bit + Loki + Grafana 스택 구축 | [바로가기](#) |
| 19 | Prometheus & Grafana | Prometheus Operator 배포, PromQL(rate/histogram_quantile/aggregation), Recording Rules/Alerting Rules, Grafana 대시보드/패널 | Prometheus 설치, PromQL 쿼리 작성, 알림 설정, 대시보드 구성 | [바로가기](#) |
| 20 | CKA 실전 시뮬레이션 | killer.sh 모의고사 3회 풀이, 시간 관리(120분/17~20문제), 자주 출제 유형(RBAC/etcd/NetworkPolicy/Troubleshooting), 약점 보완 | killer.sh 모의고사 풀이, 약점 보완 집중 실습 | [바로가기](#) |

[CKA 전체 로드맵 보기](#) (준비 중)

</details>

<details>
<summary><strong>Appendix: 고급 주제 (선택)</strong></summary>

| 주제 | 핵심 학습 내용 | 핵심 실습 | 포스트 링크 |
|------|--------------|----------|------------|
| CRD & Operators | Custom Resource Definitions, Operator 패턴, Operator SDK | 커스텀 CRD 생성, 간단한 Operator 구현 | [바로가기](#) |
| Service Mesh | Istio/Linkerd 아키텍처, mTLS, 트래픽 관리, Canary with Mesh | Istio 설치, mTLS 활성화, 트래픽 분산 | [바로가기](#) |
| Multi-cluster | Federation, 클러스터 간 서비스 디스커버리, Submariner | 다중 클러스터 연결 실습 | [바로가기](#) |
| 고급 관측성 | OpenTelemetry, Jaeger 분산 트레이싱, SLO/SLI 정의 | OpenTelemetry Collector 배포, Jaeger 연동 | [바로가기](#) |

</details>

<br>

## 학습 팁

### 효율적인 학습 방법

1. **실습 중심**: 이론 30% + 실습 70%
2. **문서화**: 학습한 내용을 블로그/노트에 정리
3. **커뮤니티**: Kubernetes Slack, Reddit 활용
4. **반복 학습**: 핵심 개념은 주기적으로 복습
5. **kubectl 숙달**: 명령어를 외우지 말고 `--help`와 `explain`을 활용

### Docker 학습 우선순위 (roadmap.sh 기준)

1. **필수**: 컨테이너 개념 → Linux 기초 → Docker 설치 → Dockerfile → 빌드 → Compose
2. **중요**: Volume/Bind Mount → 레지스트리 → 보안 → 멀티스테이지 빌드
3. **심화**: OCI 표준 → Union Filesystem → CI 연동

### Kubernetes 학습 우선순위 (roadmap.sh 기준)

1. **필수**: Pod → Deployment → Service → Ingress → ConfigMap/Secret
2. **중요**: PV/PVC → RBAC → HPA → Helm → NetworkPolicy
3. **심화**: CRD/Operator → Service Mesh → 분산 트레이싱

<br>

## 학습 체크리스트

### Phase 0: Docker & 컨테이너 (3주 완료 시)

- [ ] Bare Metal / VM / Container 차이를 설명할 수 있다
- [ ] Linux Namespace와 cgroups의 역할을 설명할 수 있다
- [ ] Dockerfile 작성 및 멀티스테이지 빌드로 이미지 최적화를 할 수 있다
- [ ] Docker Compose로 다중 컨테이너 앱을 실행할 수 있다
- [ ] Volume Mount와 Bind Mount의 차이를 이해한다
- [ ] 컨테이너 이미지를 DockerHub/ACR에 push/pull 할 수 있다
- [ ] 컨테이너 보안 기초 (이미지 스캐닝, rootless)를 이해한다
- [ ] Kubernetes Control Plane 컴포넌트의 역할을 설명할 수 있다

### Phase 1: On-Premise Kubernetes (9주 완료 시)

- [ ] Kubeadm으로 클러스터 구축 및 노드 추가를 할 수 있다
- [ ] Pod, Deployment, StatefulSet, Job의 차이를 설명하고 적절히 사용한다
- [ ] Service (ClusterIP/NodePort/LB), Ingress로 외부 노출을 구성한다
- [ ] ConfigMap과 Secret으로 설정과 민감 데이터를 관리한다
- [ ] Resource Requests/Limits와 Namespace Quota를 설정한다
- [ ] PV/PVC와 CSI Driver로 스토리지를 구성한다
- [ ] RBAC로 권한을 관리하고 NetworkPolicy로 통신을 제어한다
- [ ] HPA를 설정하여 부하 기반 오토스케일링을 구현한다
- [ ] Helm Chart로 애플리케이션을 패키징하고 배포한다
- [ ] Rolling Update/Rollback을 수행할 수 있다

### Phase 2: AKS (14주 완료 시)

- [ ] AKS 클러스터 생성 및 Azure AD 연동
- [ ] AGIC로 Ingress 구성
- [ ] Azure Monitor (Logs, Metrics, Traces)로 관측성 확보
- [ ] Workload Identity로 Key Vault 접근
- [ ] ArgoCD로 GitOps 파이프라인 구축
- [ ] Cluster Autoscaler & Spot VM으로 비용 최적화

### Phase 3: CKA (20주 완료 시)

- [ ] etcd 스냅샷 백업 및 복원
- [ ] 클러스터 업그레이드 (1.28 → 1.29)
- [ ] kubelet 장애 해결
- [ ] Network Policy로 Pod 격리
- [ ] killer.sh 모의고사 66점 이상

<br>

## 시작하기

준비되셨나요? 아래 링크에서 학습을 시작하세요:

0. [Docker & 컨테이너 기초 로드맵](#) - 여기서 시작 (작성 예정)
1. [On-Premise Kubernetes 로드맵](/k8s/k8s-onprem-roadmap) - Phase 0 완료 후
2. [AKS 학습 로드맵](/k8s/aks-roadmap) - On-Prem 완료 후
3. [CKA 준비 로드맵](#) - 자격증 도전 (준비 중)

<br>

## 추천 자료

### 로드맵 참고
- [roadmap.sh/docker](https://roadmap.sh/docker) - Docker 학습 로드맵 (57개 항목)
- [roadmap.sh/kubernetes](https://roadmap.sh/kubernetes) - Kubernetes 학습 로드맵 (67개 항목)

### 공식 문서
- [Docker 공식 문서](https://docs.docker.com/)
- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [AKS 문서](https://docs.microsoft.com/azure/aks/)
- [CKA Curriculum](https://github.com/cncf/curriculum)
- [Helm 공식 문서](https://helm.sh/docs/)

### 실습 환경
- [Play with Docker](https://labs.play-with-docker.com/) - 무료 Docker 실습 환경
- [Play with Kubernetes](https://labs.play-with-k8s.com/) - 무료 임시 클러스터
- [killer.sh](https://killer.sh/) - CKA 모의고사

### 커뮤니티
- [Kubernetes Slack](https://slack.k8s.io/)
- [Reddit r/docker](https://www.reddit.com/r/docker/)
- [Reddit r/kubernetes](https://www.reddit.com/r/kubernetes/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/kubernetes)

---

Docker와 Kubernetes는 방대하지만, 체계적으로 학습하면 누구나 마스터할 수 있습니다.
