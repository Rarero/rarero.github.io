---
layout: post
title: "[k8s] Kubernetes 학습 전체 로드맵"
date: 2025-01-01 08:00:00 +0900
tags: [Docker, Kubernetes, Roadmap, Learning Path, On-Premise, AKS, CKA, Container, Linux]
categories: k8s
---

이 문서는 **Kubernetes 전문가**가 되기 위한 전체 학습 로드맵을 제시합니다. Linux 컨테이너 격리 기술의 동작 원리부터 Docker 실전 활용, On-Premise 클러스터 구축, Azure Kubernetes Service(AKS) 운영, 그리고 CKA 자격증 취득까지 체계적인 학습 경로를 안내합니다.

> **참고**: 이 로드맵은 [roadmap.sh/docker](https://roadmap.sh/docker) (57개 항목)와 [roadmap.sh/kubernetes](https://roadmap.sh/kubernetes) (67개 항목)의 학습 체계를 참고하여 재구성하였습니다.

<br>

## 학습 구조

**Phase 0: Docker & Container 기초 (4주)**
- Week 1: Container와 Docker의 이해 (Container 등장 배경, Docker 설치, 아키텍처, 기본 명령어, 라이프사이클)
- Week 2: Container 핵심 격리 기술 - Linux Kernel 심화 (Namespace 7종, Cgroups v1/v2, OverlayFS, Container Runtime 계층, OCI 표준)
- Week 3: Docker 이미지 빌드, 데이터 관리 & 레지스트리 (Dockerfile, 레이어 캐싱, Multi-stage Build, Volume/Bind Mount, Registry, Tagging)
- Week 4: Docker Compose, 네트워크, 보안 & Kubernetes 입문 (Compose, bridge/host/overlay, Trivy, K8s 아키텍처 개요)

**Phase 1: On-Premise Kubernetes (7주)**
- Week 5: 클러스터 구축 & kubectl 마스터 (Kubeadm 3-Node 구축, CNI 설치, Minikube/Kind, kubectl 상세, kubeconfig)
- Week 6: Pod & Workload 리소스 심화 (Pod 라이프사이클, Probe, 멀티컨테이너 패턴, Deployment, StatefulSet, DaemonSet, Job/CronJob)
- Week 7: 구성 관리 & 리소스 제어 (ConfigMap, Secret, Resource Requests/Limits, QoS 클래스, LimitRange, ResourceQuota)
- Week 8: 서비스 & 네트워킹 심화 (Service 5종, Ingress Controller, TLS, Pod-to-Pod 통신, CNI 비교, kube-proxy, CoreDNS, NetworkPolicy)
- Week 9: 스토리지, 볼륨 & 상태 관리 (emptyDir, hostPath, PV/PVC, StorageClass, CSI Driver, 스냅샷, StatefulSet+PVC)
- Week 10: 스케줄링 & 오토스케일링 (kube-scheduler, Taints/Tolerations, Affinity, Topology Spread, PDB, HPA, VPA, Cluster Autoscaler)
- Week 11: Helm, 배포 전략 & GitOps 기초 (Helm Chart 구조/템플릿, Rolling Update, Canary, Blue-Green, ArgoCD, Flux)

**Phase 2: Azure Kubernetes Service (5주)**
- Week 12: AKS 기초 & Azure 네트워킹 통합 (클러스터 생성, 노드 풀, Azure CNI/Kubenet/CNI Overlay, AGIC, Private AKS)
- Week 13: 스토리지, 스케일링 & 비용 최적화 (Azure Disk/File CSI, Key Vault CSI, KEDA, Spot VM, Cost Management)
- Week 14: 모니터링 & 로깅 (Container Insights, KQL, Managed Prometheus, Grafana, Alert Rules, Application Insights, OpenTelemetry)
- Week 15: 보안 강화 (Workload Identity, Azure RBAC for AKS, Defender for Containers, Azure Policy, Pod Security Standards)
- Week 16: CI/CD & GitOps (Azure DevOps Pipeline, GitHub Actions, ACR Build Tasks, Helm/Kustomize CD, Flux/ArgoCD, 시크릿 관리)

**Phase 3: CKA 시험 준비 (6주)**
- Week 17: 클러스터 유지보수 & etcd (etcd 백업/복구, 클러스터 업그레이드, 인증서 갱신, Static Pod)
- Week 18: 보안 & RBAC (Custom Role/ClusterRole, ServiceAccount, NetworkPolicy 멀티 네임스페이스 격리, kubeconfig 인증)
- Week 19: 장애 대응 (kubelet 복구, OOMKill 분석, Node NotReady, CrashLoopBackOff, kubectl debug/exec/logs)
- Week 20: 로그 수집 아키텍처 (Fluent-bit DaemonSet, Loki, 중앙 집중 로깅 파이프라인)
- Week 21: Prometheus & Grafana (Prometheus Operator, PromQL, Recording/Alerting Rules, 대시보드 구성)
- Week 22: CKA 실전 시뮬레이션 (killer.sh 모의고사, 시간 관리, 빈출 유형, 약점 보완)

**Appendix: 고급 주제 (선택)**
- Custom Resource Definitions (CRDs) & Operators
- Service Mesh (Istio, Linkerd)
- Multi-cluster & Federation

총 학습 기간: **약 22주 (5.5개월)** + α

<br>

## 학습 구조 시각화: roadmap.sh 대비 커버리지

```
roadmap.sh/docker (57개 항목)              이 로드맵 커버리지
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━
컨테이너 개념 (What/Why/비교)        ───▶  Phase 0 Week 1
Linux 기초 (Package, Shell 등)       ───▶  Phase 0 Week 1
기반 기술 (Namespace, cgroups, UFS)  ───▶  Phase 0 Week 2 ★ 심화
Docker 설치 (Desktop, Engine)        ───▶  Phase 0 Week 1
Docker 기본 (Run, Lifecycle)         ───▶  Phase 0 Week 1
이미지 빌드 (Dockerfile, Caching)    ───▶  Phase 0 Week 3
데이터 영속성 (Volume, Bind Mount)   ───▶  Phase 0 Week 3
3rd Party 이미지 (DB, CLI)           ───▶  Phase 0 Week 3
컨테이너 레지스트리 (DockerHub 등)   ───▶  Phase 0 Week 3
Docker Compose                       ───▶  Phase 0 Week 4
Docker 네트워킹                      ───▶  Phase 0 Week 4
컨테이너 보안                        ───▶  Phase 0 Week 4
개발자 경험 (CI, Debuggers)          ───▶  Phase 0 Week 4
Docker & OCI 표준                    ───▶  Phase 0 Week 2

roadmap.sh/kubernetes (67개 항목)           이 로드맵 커버리지
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━
K8s 소개 & 설정                      ───▶  Phase 0 Week 4
클러스터 구축 & 로컬 환경            ───▶  Phase 1 Week 5
Workload (Pod, Deployment 등)        ───▶  Phase 1 Week 6
구성 관리 (ConfigMap, Secret)        ───▶  Phase 1 Week 7
리소스 관리 (Requests, Quotas)       ───▶  Phase 1 Week 7
서비스 & 네트워킹                    ───▶  Phase 1 Week 8
보안 (RBAC, NetworkPolicy, PodSec)   ───▶  Phase 1 Week 8 / Phase 2 Week 15
모니터링 (Logs, Metrics, Traces)     ───▶  Phase 2 Week 14
오토스케일링 (HPA, VPA, Cluster)     ───▶  Phase 1 Week 10
스케줄링 (Taints, Topology, 우선순위)───▶  Phase 1 Week 10
스토리지 (CSI Driver, Stateful)      ───▶  Phase 1 Week 9
배포 패턴 (Helm, Canary, GitOps)     ───▶  Phase 1 Week 11
CRD & Operators                      ───▶  Appendix
Service Mesh                         ───▶  Appendix
```

<br>

## 학습 목표

### 최종 목표

1. **Linux 컨테이너 격리 기술**을 커널 레벨에서 이해하고 직접 시연할 수 있는 능력
2. Docker 컨테이너를 자유자재로 빌드, 배포, 관리할 수 있는 능력
3. Kubernetes 클러스터를 처음부터 끝까지 구축하고 운영할 수 있는 능력
4. 프로덕션 환경의 복잡한 장애를 신속하게 진단하고 해결하는 능력
5. CKA (Certified Kubernetes Administrator) 자격증 취득
6. Azure 환경에서 엔터프라이즈급 Kubernetes 인프라 설계

### 핵심 역량 매트릭스

| 역량 | Phase 0 | On-Premise | AKS | CKA | Appendix |
|------|---------|-----------|-----|-----|----------|
| Linux 격리 기술 | **5** | 2 | 1 | 2 | 2 |
| Docker & 컨테이너 | **5** | 3 | 2 | 2 | 2 |
| K8s 아키텍처 | 3 | **5** | 3 | 4 | 4 |
| 클러스터 구축 | 2 | **5** | 3 | 4 | 3 |
| 네트워킹 | 2 | **5** | 4 | 3 | 4 |
| 스토리지 | 2 | 4 | **5** | 3 | 2 |
| 구성 관리 | 1 | 4 | 4 | 3 | 2 |
| 오토스케일링 | 1 | 4 | **5** | 3 | 2 |
| 모니터링 & 관측성 | 1 | 3 | **5** | 4 | 3 |
| 장애 대응 | 1 | 4 | 3 | **5** | 3 |
| 보안 | 2 | 3 | **5** | 4 | 3 |
| CI/CD & GitOps | 2 | 2 | **5** | 1 | 3 |
| Helm & 배포 패턴 | 1 | 4 | 4 | 3 | 4 |
| CRD/Operator/Mesh | - | 1 | 2 | 1 | **5** |

(1~5: 해당 Phase에서의 학습 깊이. **5**가 가장 깊음)

<br>

## 학습 트랙 상세

### Phase 0: Docker & Container 기초 (4주)

대상: 컨테이너를 처음 접하는 사람, Linux 기초부터 시작하려는 사람

학습 내용:

**Week 1 - Container와 Docker의 이해**

컨테이너 기술이 왜 등장했고, Docker가 어떻게 IT 인프라의 패러다임을 바꿨는지 이해합니다. Docker를 설치하고 기본 명령어를 통해 컨테이너 라이프사이클을 직접 체험합니다.

- **IT 인프라 진화 과정**: Bare Metal 서버의 한계 (리소스 낭비, 확장 불가), Hypervisor와 VM의 등장과 개선점 (리소스 공유, 격리), VM의 한계 (무거운 Guest OS, 느린 시작, 이미지 이동성 부족), Container의 등장과 핵심 차이 (OS 커널 공유, 경량, 빠른 시작)
- **Docker가 가져온 변화**: 개발 환경 표준화 ("내 컴퓨터에서는 되는데" 해결), 마이크로서비스 아키텍처 실현, CI/CD 파이프라인 혁신, 인프라 비용 절감 사례
- **Docker 설치 및 환경 구성**: Docker Desktop (Mac/Windows/Linux) vs Docker Engine (Linux 서버), Docker 데몬 상태 확인 및 기본 설정, docker version / docker info 명령어로 환경 확인
- **Docker 아키텍처 이해**: Client-Server 모델 (Docker CLI → REST API → dockerd), Docker Daemon (dockerd)의 역할, containerd와 runc의 존재 인식 (Week 2에서 심화), Docker Registry (Docker Hub)의 역할
- **컨테이너 라이프사이클 관리**: docker run / docker ps / docker stop / docker start / docker rm, docker logs / docker exec / docker top / docker stats, 포그라운드(-it) vs 백그라운드(-d) 실행, 포트 매핑(-p), 환경변수(-e), 이름 지정(--name)
- **이미지와 컨테이너의 관계**: 이미지 = 읽기 전용 템플릿, 컨테이너 = 이미지의 실행 인스턴스, docker pull / docker images / docker rmi, 이미지 레이어 구조 기초 개념 (docker history)
- **docker run 내부 동작 분석**: 이미지 확인 → Pull → 컨테이너 생성 → Namespace/Cgroups 설정 → 프로세스 시작, docker inspect로 상세 설정 확인
- **이미지 이식성 (docker save/load)**: 오프라인 환경 이미지 전달, tar 파일 저장과 로드, gzip 압축을 통한 전송 최적화

**핵심 실습:**
- Docker 설치 및 hello-world 실행
- Nginx 컨테이너 실행 및 포트 매핑으로 웹 접속
- 컨테이너 라이프사이클 전체 순환 (create → start → stop → rm)
- docker inspect로 컨테이너 내부 구조 분석
- docker save/load로 이미지 파일 전달 실습

[Week 1 상세 학습 보기]({% post_url k8s/2025-01-06-k8s-week01-container-docker %})

<br>

---

**Week 2 - Container 핵심 격리 기술: Linux Kernel 심화**

Docker 컨테이너가 실제로 어떻게 프로세스를 격리하고 리소스를 제한하는지 Linux 커널 레벨에서 이해합니다. Namespace, Cgroups, Union Filesystem을 직접 다뤄보고, Container Runtime의 전체 계층 구조를 파악합니다.

- **Linux Namespace (7가지 격리 메커니즘)**:
  - PID Namespace: 격리된 프로세스 ID 공간 (컨테이너 내 PID 1)
  - Network Namespace: 독립된 네트워크 인터페이스, IP, 라우팅 테이블
  - Mount Namespace: 격리된 파일시스템 마운트 포인트
  - UTS Namespace: 독립된 호스트명/도메인명
  - IPC Namespace: 격리된 프로세스 간 통신 (메시지 큐, 세마포어)
  - User Namespace: 독립된 UID/GID 매핑 (rootless 컨테이너의 기반)
  - Cgroup Namespace: Cgroup 루트 디렉토리 격리
  - **실습**: unshare로 PID/Network/Mount Namespace 직접 생성, ip netns로 네트워크 네임스페이스 구성 및 veth pair 통신
- **Cgroups (Control Groups) v1/v2**:
  - Cgroups의 역할: 프로세스 그룹의 CPU, Memory, Disk I/O, Network 리소스 제한
  - v1 vs v2 차이 (컨트롤러별 독립 계층 vs 단일 통합 계층)
  - **실습**: /sys/fs/cgroup 직접 조작으로 CPU 50% 제한, Memory 100MB 제한 후 OOM Killer 관찰
  - Docker의 Cgroups 사용법 (--cpus, --memory 옵션 → Cgroups 매핑)
- **Union Filesystem (OverlayFS)**:
  - 레이어 기반 파일시스템의 원리 (lowerdir + upperdir + merged)
  - Docker의 스토리지 드라이버 (overlay2)
  - 이미지 레이어 구조 (Read-Only 레이어 + Read-Write 컨테이너 레이어)
  - docker history로 레이어 분석, /var/lib/docker/overlay2 디렉토리 탐색
- **Container Runtime 계층 구조**:
  - 고수준: Docker CLI → Docker Daemon (dockerd)
  - 중간: containerd (이미지 관리, 네트워크, 볼륨)
  - 저수준: runc (Namespace/Cgroups 생성, 실제 컨테이너 프로세스 실행)
  - shim 프로세스의 역할 (컨테이너 독립 실행)
- **OCI (Open Container Initiative) 표준**:
  - OCI Runtime Specification (config.json)
  - OCI Image Specification (manifest, layers, config)
  - 표준이 중요한 이유 (런타임 교체 가능성)
- **containerd vs CRI-O 비교**:
  - containerd: Docker 출신, 범용, ctr/nerdctl CLI
  - CRI-O: Kubernetes 전용, Red Hat 주도, 경량
  - CRI (Container Runtime Interface) 규격
- **runc 직접 사용**:
  - Alpine rootfs 준비 → runc spec → config.json 수정 → runc run
  - Docker 없이 컨테이너 실행하는 전체 과정 체험

**핵심 실습:**
- unshare로 PID Namespace 생성 후 ps aux로 격리 확인
- ip netns로 격리 네트워크 구성 및 veth pair 통신
- Cgroups로 CPU/Memory 제한 후 stress 도구로 검증
- Docker 컨테이너의 Namespace/Cgroups 경로 직접 확인 (/proc/PID/ns, /sys/fs/cgroup)
- runc로 Docker 없이 컨테이너 실행

[Week 2 상세 학습 보기]({% post_url k8s/2025-01-07-k8s-week02-linux-container-isolation %})

<br>

---

**Week 3 - Docker 이미지 빌드, 데이터 관리 & 레지스트리**

프로덕션 수준의 Docker 이미지를 빌드하고, 데이터 영속성을 관리하며, 레지스트리를 활용하는 전체 워크플로우를 학습합니다.

- **Dockerfile 명령어 완전 정복**:
  - 기본: FROM, RUN, COPY, ADD, WORKDIR, EXPOSE, CMD, ENTRYPOINT
  - CMD vs ENTRYPOINT 차이와 조합 (exec form vs shell form)
  - ARG vs ENV 차이 (빌드 시점 vs 런타임)
  - LABEL, HEALTHCHECK, USER, SHELL 명령어
  - .dockerignore 파일로 빌드 컨텍스트 최적화
- **이미지 빌드 최적화**:
  - 레이어 캐싱 원리 (각 명령어 = 1개 레이어, 변경 시 이후 모두 무효화)
  - 빌드 순서 최적화 전략 (변경 빈도 낮은 것부터 → 높은 것 순)
  - Multi-stage Build로 빌드 도구와 런타임 분리
  - 이미지 경량화: Alpine (5MB) vs Distroless vs scratch
  - 보안 베스트 프랙티스 (root 금지, 최소 패키지, 취약점 스캐닝)
- **데이터 영속성 (Data Persistence)**:
  - Ephemeral Container Filesystem: 컨테이너 삭제 시 데이터 소멸
  - Volume Mount: Docker가 관리하는 명명된 볼륨 (docker volume create/ls/inspect)
  - Bind Mount: 호스트 디렉토리를 직접 마운트 (-v /host/path:/container/path)
  - tmpfs Mount: 메모리 기반 임시 스토리지 (보안 민감 데이터)
  - Volume vs Bind Mount 선택 기준
- **3rd Party 이미지 활용**:
  - 데이터베이스 (MySQL, PostgreSQL, MongoDB)
  - 캐시 & 메시지 큐 (Redis, RabbitMQ)
  - 웹 서버 (Nginx, Apache, Caddy)
  - Official Image vs Community Image 판단 기준
- **컨테이너 레지스트리**:
  - Docker Hub (Public/Private Repository)
  - Azure Container Registry (ACR)
  - GitHub Container Registry (GHCR)
  - Harbor (Private Registry)
  - Image Tagging 전략: latest의 위험성, Semantic Versioning, Git Commit Hash
  - docker push / docker pull 워크플로우

**핵심 실습:**
- Node.js/Python 앱을 Multi-stage Build로 최적화 (이미지 크기 90% 감소)
- Volume Mount로 PostgreSQL 데이터 영속화
- Bind Mount로 개발 중 소스 코드 실시간 반영
- Docker Hub와 ACR에 이미지 push/pull
- Trivy로 이미지 취약점 스캐닝

<br>

---

**Week 4 - Docker Compose, 네트워크, 보안 & Kubernetes 입문**

멀티 컨테이너 환경을 Docker Compose로 관리하고, Docker 네트워킹과 보안을 학습한 후, Kubernetes가 필요한 이유와 아키텍처를 입문합니다.

- **Docker 네트워킹**:
  - 네트워크 드라이버: bridge (기본), host, none, overlay, macvlan
  - bridge 네트워크 내부 동작 (docker0, veth pair, iptables NAT)
  - 사용자 정의 bridge 네트워크 (컨테이너 간 DNS 통신)
  - docker network create / connect / disconnect
- **Docker Compose**:
  - 왜 Compose가 필요한가 (멀티 컨테이너 오케스트레이션)
  - docker-compose.yml 구조 (services, networks, volumes, configs)
  - depends_on / healthcheck / restart policy
  - 환경별 Compose 관리 (docker-compose.override.yml)
  - docker compose up / down / logs / ps / exec
  - Compose와 Kubernetes의 근본적 차이
- **컨테이너 보안**:
  - 이미지 취약점 스캐닝 (Trivy, Docker Scout, Snyk)
  - rootless 컨테이너 실행 (USER 명령어, --user 옵션)
  - Read-only 파일시스템 (--read-only)
  - 시크릿 관리 (이미지에 하드코딩 금지, Docker Secrets, 환경변수 주의사항)
  - Seccomp / AppArmor 프로파일
  - 컨테이너 런타임 보안 체크리스트
- **개발자 워크플로우**:
  - Hot Reloading 설정 (Bind Mount + nodemon/air/watchfiles)
  - 컨테이너 내부 디버깅 (docker exec -it, docker logs -f, docker cp)
  - Docker 기반 CI 파이프라인 기초 (빌드 → 테스트 → 푸시)
  - 개발(dev) / 스테이징(staging) / 프로덕션(prod) 이미지 관리 전략
- **Kubernetes 아키텍처 입문**:
  - Docker만으로 부족한 이유 (멀티 호스트 관리, 자가 복구, 선언적 관리, 서비스 디스커버리)
  - Control Plane 컴포넌트: kube-apiserver (API 게이트웨이), etcd (상태 저장소), kube-scheduler (Pod 배치), kube-controller-manager (desired state 유지)
  - Node 컴포넌트: kubelet (Pod 관리), kube-proxy (네트워크 라우팅), container runtime (containerd)
  - 선언적(Declarative) vs 명령적(Imperative) 관리 방식
  - Desired State와 Reconciliation Loop 개념
  - Kubernetes 대안 비교: Docker Swarm, HashiCorp Nomad, Apache Mesos

**핵심 실습:**
- Docker Compose로 웹앱 + DB + Redis 3-tier 아키텍처 실행
- 사용자 정의 bridge 네트워크에서 컨테이너 간 DNS 통신
- Trivy로 이미지 취약점 스캔 후 수정
- rootless 컨테이너 + read-only FS 설정
- Kubernetes Control Plane 컴포넌트 역할 정리

준비물:
- Docker Desktop 또는 Docker Engine 설치
- Linux 환경 (VM 또는 WSL2)
- Git 기본 사용법

<br>

### Phase 1: On-Premise Kubernetes (7주)

대상: Docker를 이해한 사람, 클라우드 없이 Kubernetes를 직접 구축하고 운영하고 싶은 사람

학습 내용:

**Week 5 - 클러스터 구축 & kubectl 마스터**

Kubernetes 클러스터를 직접 구축하고, kubectl을 통해 클러스터와 대화하는 방법을 완전히 익힙니다. 클러스터가 부트스트랩되는 전체 과정을 단계별로 이해합니다.

- **Kubeadm 기반 3-Node 클러스터 구축**:
  - 사전 요구사항: swap off, br_netfilter 모듈, net.ipv4.ip_forward=1
  - containerd 런타임 설치 및 설정 (/etc/containerd/config.toml)
  - kubeadm init 단계별 분석 (Preflight → Certs → kubeconfig → Control Plane → Upload → Bootstrap Token → Addons)
  - kubeadm join으로 Worker 노드 추가 (토큰 기반 인증)
  - CNI 플러그인 설치 (Calico 기본, Flannel/Cilium 대비)
  - PKI 인증서 체계 이해 (CA, API Server, kubelet, etcd)
- **로컬 개발 환경 구성**:
  - Minikube: 단일 노드 로컬 클러스터 (addons 활용)
  - Kind: Docker-in-Docker 기반 멀티 노드 클러스터 (CI 환경 활용)
  - 관리형 서비스 비교 (AKS vs EKS vs GKE) 개요
- **kubectl 완전 정복**:
  - 리소스 조회: get (-o wide/yaml/json), describe, logs (-f, --tail, --previous)
  - 리소스 생성/관리: apply (-f, -k), create, delete, edit, patch
  - 디버깅: exec (-it), port-forward, cp, debug
  - 탐색: api-resources, api-versions, explain (--recursive)
  - 출력 포맷: -o jsonpath, -o custom-columns, --sort-by
- **kubeconfig & Context 관리**:
  - kubeconfig 파일 구조 (clusters, users, contexts)
  - 컨텍스트 전환 (kubectl config use-context)
  - 네임스페이스 기본값 설정 (kubectl config set-context --current --namespace)
  - 멀티 클러스터 관리 (KUBECONFIG 환경변수, 파일 병합)
- **첫 번째 애플리케이션 배포**:
  - kubectl run으로 명령적 배포
  - YAML 매니페스트로 선언적 배포
  - kubectl apply vs kubectl create 차이
  - 배포 확인 및 문제 해결 기초

**핵심 실습:**
- VirtualBox/VMware에서 VM 3대로 Kubeadm 클러스터 구축
- kubectl 기본~고급 명령어 전량 실습
- kubeconfig 멀티 컨텍스트 관리
- Nginx Deployment 선언적 배포 및 서비스 노출

준비물:
- VirtualBox/VMware (VM 3대: Master 1 + Worker 2)
- 대안: Azure VM (Ubuntu 22.04 LTS)
- 최소 사양: CPU 2Core, RAM 4GB (VM당)

<br>

---

**Week 6 - Pod & Workload 리소스 심화**

Kubernetes에서 실행되는 모든 워크로드의 기본 단위인 Pod을 깊이 이해하고, 다양한 워크로드 컨트롤러를 상황에 맞게 선택하여 활용합니다.

- **Pod 기초와 라이프사이클**:
  - Pod이란? (하나 이상의 컨테이너를 감싸는 최소 배포 단위)
  - Pod 라이프사이클: Pending → Running → Succeeded/Failed
  - Pod Phase vs Container State 차이
  - Pod 재시작 정책 (Always, OnFailure, Never)
- **멀티 컨테이너 Pod 패턴**:
  - Sidecar: 로깅 에이전트, 프록시 (Envoy)
  - Init Container: 사전 조건 확인, 설정 초기화
  - Ambassador: 외부 서비스 프록시
  - Adapter: 로그 포맷 변환, 모니터링 어댑터
  - Pod 내부 컨테이너 간 통신 (localhost, 공유 볼륨)
- **Probe (헬스 체크)**:
  - Liveness Probe: 컨테이너 정상 동작 여부 (실패 시 재시작)
  - Readiness Probe: 트래픽 수신 준비 여부 (실패 시 Service에서 제외)
  - Startup Probe: 느린 시작 앱 보호 (시작 완료까지 다른 Probe 비활성)
  - Probe 유형: httpGet, tcpSocket, exec, grpc
  - initialDelaySeconds, periodSeconds, failureThreshold 튜닝
- **워크로드 컨트롤러**:
  - **ReplicaSet**: Pod 복제본 유지, Label Selector 메커니즘 (직접 사용보단 Deployment 통해 관리)
  - **Deployment**: 선언적 업데이트 (RollingUpdate/Recreate 전략), kubectl rollout status/history/undo, maxSurge/maxUnavailable 설정
  - **StatefulSet**: 순서 보장된 배포/삭제, 안정적 네트워크 ID (pod-0, pod-1), Headless Service 조합, volumeClaimTemplates
  - **DaemonSet**: 모든(또는 특정) 노드에 Pod 배치 (로깅, 모니터링 에이전트), updateStrategy (RollingUpdate/OnDelete)
  - **Job**: 일회성 작업 실행, completions/parallelism 설정, activeDeadlineSeconds, backoffLimit
  - **CronJob**: 주기적 작업 실행, cron 표현식, concurrencyPolicy (Allow/Forbid/Replace), startingDeadlineSeconds

**핵심 실습:**
- Pod YAML 직접 작성 및 라이프사이클 관찰
- Sidecar 패턴: Nginx + Fluent-bit 로깅 에이전트
- Init Container: 데이터베이스 연결 대기
- Liveness/Readiness Probe 설정 및 장애 시뮬레이션
- Deployment로 Nginx 배포, 롤링 업데이트 & 롤백
- StatefulSet으로 3-replica 데이터베이스 클러스터 배포
- CronJob으로 주기적 백업 작업 스케줄링

<br>

---

**Week 7 - 구성 관리 & 리소스 제어**

애플리케이션 설정을 코드에서 분리하여 ConfigMap과 Secret으로 관리하고, Namespace 단위의 리소스 제어를 통해 멀티 테넌트 환경을 구성합니다.

- **ConfigMap (설정 데이터 분리)**:
  - ConfigMap 생성 (kubectl create configmap, YAML, --from-file, --from-literal, --from-env-file)
  - 환경변수로 주입 (envFrom, valueFrom.configMapKeyRef)
  - 볼륨으로 마운트 (파일로 노출, subPath)
  - ConfigMap 변경 시 자동 반영 (볼륨 마운트) vs 수동 반영 (환경변수)
  - Immutable ConfigMap (성능 최적화)
- **Secret (민감 데이터 관리)**:
  - Secret 타입: Opaque (범용), kubernetes.io/tls (TLS 인증서), kubernetes.io/dockerconfigjson (레지스트리 인증)
  - Secret 생성 (kubectl create secret, YAML + base64 인코딩)
  - 환경변수 / 볼륨 주입 (ConfigMap과 동일 방식)
  - Secret은 base64 인코딩 ≠ 암호화 (etcd 암호화 필요성)
  - Secret 관리 베스트 프랙티스 (RBAC 제한, etcd encryption at rest)
- **Resource Requests & Limits**:
  - CPU 단위 (1 core = 1000m), Memory 단위 (Mi, Gi)
  - Requests: 스케줄링 기준 (노드에 최소 이 만큼 여유 있어야 배치)
  - Limits: 최대 사용 제한 (CPU throttling, Memory OOMKill)
  - Requests ≤ Limits 관계
- **QoS (Quality of Service) 클래스**:
  - Guaranteed: Requests == Limits (최우선 보호)
  - Burstable: Requests < Limits (중간 우선순위)
  - BestEffort: Requests/Limits 미지정 (OOM 시 가장 먼저 종료)
  - QoS와 OOM Killer 우선순위
- **Namespace 리소스 제어**:
  - **LimitRange**: Namespace 내 개별 Pod/Container의 기본값 및 최대/최소 리소스 설정
  - **ResourceQuota**: Namespace 전체의 총 리소스 사용량 제한 (CPU, Memory, Pod 수, PVC 수)
  - 실전 시나리오: dev/staging/prod Namespace 리소스 분리

**핵심 실습:**
- ConfigMap으로 Nginx 설정 파일 주입 (nginx.conf 외부 관리)
- Secret으로 데이터베이스 비밀번호 관리
- Resource Requests/Limits 설정 후 OOM Kill 시뮬레이션
- LimitRange로 기본 리소스 정책 설정
- ResourceQuota로 Namespace별 리소스 총량 제한
- QoS 클래스별 OOM 우선순위 실험

<br>

---

**Week 8 - 서비스 & 네트워킹 심화**

Kubernetes 내부의 서비스 디스커버리와 네트워킹 메커니즘을 이해합니다. Pod-to-Pod 통신부터 외부 노출까지 전체 네트워킹 스택을 학습합니다.

- **Service 타입별 상세**:
  - **ClusterIP**: 클러스터 내부 통신 (기본값), VirtualIP + Endpoint 매핑
  - **NodePort**: 모든 노드의 특정 포트로 외부 노출 (30000-32767 범위)
  - **LoadBalancer**: 클라우드 L4 로드밸런서 연동 (On-Prem에서는 MetalLB)
  - **ExternalName**: CNAME 레코드로 외부 DNS 매핑
  - **Headless Service** (clusterIP: None): StatefulSet 조합, 개별 Pod DNS 제공
  - Service의 Label Selector와 Endpoint 동작 원리
- **Ingress & Ingress Controller**:
  - Ingress Controller 역할 (L7 Reverse Proxy)
  - Nginx Ingress Controller / Traefik 비교
  - Ingress 규칙: 호스트 기반 라우팅, 경로 기반 라우팅
  - pathType (Exact, Prefix, ImplementationSpecific)
  - TLS 종단 처리 (Secret + tls 설정)
  - IngressClass 개념 (다중 컨트롤러 운영)
- **Pod-to-Pod 통신 원리**:
  - 같은 노드 내 통신 (bridge, veth pair)
  - 다른 노드 간 통신 (CNI 플러그인의 오버레이/라우팅)
  - Kubernetes 네트워킹 모델 (모든 Pod은 고유 IP, NAT 없이 통신)
- **CNI 플러그인 비교**:
  - Calico: BGP 기반 라우팅, NetworkPolicy 강력
  - Flannel: 단순 오버레이 (VXLAN), 쉬운 Setup
  - Cilium: eBPF 기반, 고성능, L7 정책
  - Weave: Mesh 네트워크
- **kube-proxy 동작 모드**:
  - iptables 모드 (기본): 룰 기반 패킷 포워딩
  - IPVS 모드: L4 로드밸런서 커널 모듈, 대규모 Service에 적합
  - iptables 규칙 분석으로 Service → Pod 라우팅 이해
- **CoreDNS**:
  - 서비스 디스커버리: <service>.<namespace>.svc.cluster.local
  - Pod DNS 정책 (ClusterFirst, Default)
  - CoreDNS 설정 (Corefile, 커스텀 도메인)
- **NetworkPolicy**:
  - Ingress/Egress 규칙으로 Pod 간 통신 제어
  - podSelector, namespaceSelector, ipBlock
  - 기본 Deny-All 정책 구성
  - CNI별 NetworkPolicy 지원 현황 (Calico: 지원, Flannel: 미지원)

**핵심 실습:**
- Service 4종 (ClusterIP/NodePort/LB/Headless) 생성 및 접근 테스트
- Nginx Ingress Controller 설치 및 호스트/경로 기반 라우팅
- TLS 인증서 적용
- iptables -t nat -L로 Service NAT 규칙 분석
- NetworkPolicy로 Namespace 간 트래픽 격리
- CoreDNS nslookup 테스트

<br>

---

**Week 9 - 스토리지, 볼륨 & 상태 관리**

Kubernetes에서 상태를 가진 애플리케이션(Stateful Application)을 운영하기 위한 스토리지 아키텍처를 학습합니다. Volume, PV/PVC, CSI Driver까지 전체 스토리지 스택을 다룹니다.

- **볼륨 기초**:
  - emptyDir: Pod 수준 임시 스토리지 (Pod 삭제 시 소멸), 사이드카 간 데이터 공유 용도
  - hostPath: 노드 파일시스템 마운트 (개발/테스트 한정, 프로덕션 비권장)
  - downwardAPI: Pod 메타데이터를 파일로 노출
  - projected: 여러 소스(Secret, ConfigMap, downwardAPI)를 단일 볼륨에 투영
- **PV (PersistentVolume) & PVC (PersistentVolumeClaim)**:
  - PV: 관리자가 프로비저닝한 스토리지 리소스 (용량, Access Mode, Reclaim Policy 정의)
  - PVC: 사용자의 스토리지 요청 (원하는 용량, Access Mode 명시)
  - PV-PVC 바인딩 프로세스 (Capacity, Access Mode, StorageClass 매칭)
  - Access Modes: ReadWriteOnce (RWO), ReadOnlyMany (ROX), ReadWriteMany (RWX), ReadWriteOncePod (RWOP)
  - Reclaim Policy: Retain (수동 정리), Delete (PV 삭제), Recycle (deprecated)
- **StorageClass & 동적 프로비저닝**:
  - StorageClass 역할: PVC 요청 시 자동으로 PV 생성
  - StorageClass 파라미터 (provisioner, reclaimPolicy, volumeBindingMode, allowVolumeExpansion)
  - Default StorageClass 설정
  - volumeBindingMode: Immediate vs WaitForFirstConsumer
- **CSI (Container Storage Interface) 드라이버**:
  - CSI 아키텍처: Controller Plugin (프로비저닝) + Node Plugin (마운트)
  - NFS CSI Driver 설치 (Helm chart) 및 구성
  - 볼륨 스냅샷(VolumeSnapshot) 생성 및 복원
  - Volume Expansion (PVC 크기 증가)
- **StatefulSet과 스토리지 통합**:
  - volumeClaimTemplates: Pod별 전용 PVC 자동 생성
  - Pod 재시작/재스케줄 시 동일 PVC 유지
  - 순서 보장 배포 + 영속 스토리지 조합 패턴 (데이터베이스, 메시지 큐)
- **스토리지 설계 패턴**:
  - 데이터베이스 on Kubernetes: 고려사항과 한계
  - 로그/임시 데이터: emptyDir
  - 공유 파일: NFS/Azure Files (RWX)
  - 블록 스토리지: Disk (RWO)

**핵심 실습:**
- emptyDir로 사이드카 간 로그 공유
- PV/PVC 수동 프로비저닝 (NFS 기반)
- StorageClass로 동적 프로비저닝 설정
- NFS CSI Driver Helm 설치
- StatefulSet + volumeClaimTemplates로 3-replica DB 배포
- VolumeSnapshot 생성 및 복원

<br>

---

**Week 10 - 스케줄링 & 오토스케일링**

kube-scheduler의 동작 원리를 이해하고, 다양한 스케줄링 제약 조건을 활용하여 Pod 배치를 제어합니다. 부하 변화에 자동으로 대응하는 오토스케일링을 구성합니다.

- **kube-scheduler 동작 원리**:
  - 스케줄링 파이프라인: Filtering (후보 노드 선별) → Scoring (최적 노드 선택)
  - Filtering 플러그인: PodFitsResources, NodeAffinity, Taints, etc.
  - Scoring 플러그인: LeastAllocated, MostAllocated, InterPodAffinity, etc.
  - 스케줄링 실패 분석 (Pending Pod → kubectl describe pod → Events 확인)
- **Taints & Tolerations**:
  - Taint 효과: NoSchedule, PreferNoSchedule, NoExecute
  - 실전 활용: GPU 노드 전용, Master 노드 보호, 유지보수 중 노드 비우기
  - Toleration 설정으로 Taint 우회
- **Node Affinity / Anti-Affinity**:
  - requiredDuringSchedulingIgnoredDuringExecution (필수)
  - preferredDuringSchedulingIgnoredDuringExecution (선호)
  - 노드 Label 기반 배치 (리전, 존, 인스턴스 타입)
- **Pod Affinity / Anti-Affinity**:
  - 같은 노드에 관련 Pod 배치 (통신 지연 최소화)
  - 서로 다른 노드에 동일 Pod 분산 (고가용성)
  - topologyKey 이해 (kubernetes.io/hostname, topology.kubernetes.io/zone)
- **Topology Spread Constraints**:
  - maxSkew, topologyKey, whenUnsatisfiable
  - availability zone 간 균등 분산
- **Pod Priority & Preemption**:
  - PriorityClass 생성 및 할당
  - 높은 우선순위 Pod이 낮은 우선순위 Pod을 축출 (Preemption)
- **Pod Disruption Budget (PDB)**:
  - 자발적 중단 (노드 유지보수, 클러스터 업그레이드) vs 비자발적 중단 (하드웨어 장애)
  - minAvailable / maxUnavailable 설정
  - 안전한 노드 drain과의 관계
- **Horizontal Pod Autoscaler (HPA)**:
  - CPU / Memory 기반 자동 스케일링
  - Custom Metrics 기반 (Prometheus Adapter 활용)
  - HPA 알고리즘 (desiredReplicas = ceil[currentReplicas × (currentMetric / targetMetric)])
  - stabilizationWindow, scaleDown/scaleUp behavior
- **Vertical Pod Autoscaler (VPA)**:
  - Pod의 Requests/Limits 자동 조정
  - UpdateMode: Off (추천만), Auto (자동 적용), Initial (생성 시만)
  - HPA와의 충돌 주의 (CPU 기반 동시 사용 금지)
- **Cluster Autoscaler**:
  - 노드 수준 자동 확장/축소
  - Pending Pod 감지 → 노드 추가, 저활용 노드 → 축소
  - Metrics Server 설치 (HPA/VPA 전제 조건)

**핵심 실습:**
- GPU 노드에 Taint 설정 → GPU 워크로드만 Toleration으로 배치
- Node Affinity로 특정 zone 노드에 Pod 배치
- Pod Anti-Affinity로 동일 Deployment의 Pod 분산
- Metrics Server 설치 후 HPA 구성 (CPU 70% 기준)
- 부하 테스트 (hey/wrk)로 HPA 스케일아웃 관찰
- PDB 설정 후 안전한 노드 drain 실습

<br>

---

**Week 11 - Helm, 배포 전략 & GitOps 기초**

Helm으로 Kubernetes 애플리케이션을 패키징하고, 다양한 배포 전략을 실전 적용합니다. GitOps의 원칙을 이해하고 ArgoCD/Flux를 체험합니다.

- **Helm 아키텍처 & 핵심 개념**:
  - Chart: 패키지 단위 (Chart.yaml, values.yaml, templates/, charts/)
  - Release: Chart의 설치 인스턴스 (버전 관리, 롤백)
  - Repository: Chart 저장소 (ArtifactHub, ChartMuseum, OCI Registry)
  - Helm v2 → v3 변화 (Tiller 제거, 3-way merge)
- **Helm Chart 구조 상세**:
  - Chart.yaml: 메타데이터 (name, version, appVersion, dependencies)
  - values.yaml: 기본 설정값 (--set / -f로 오버라이드)
  - templates/: Go template 기반 Kubernetes 매니페스트
  - helpers.tpl (_helpers.tpl): 재사용 가능한 템플릿 함수
  - NOTES.txt: 설치 후 안내 메시지
- **Helm 템플릿 문법**:
  - Go template 기초: {{ .Values.xxx }}, {{ .Release.Name }}
  - 제어 구조: if/else, range, with
  - 함수: default, toYaml, indent, nindent, quote
  - Named Template: define / include
  - 파이프라인: {{ .Values.image.tag | default .Chart.AppVersion }}
- **Chart 관리**:
  - helm install / upgrade / rollback / uninstall
  - helm template (렌더링 미리보기)
  - helm lint (검증)
  - 커스텀 Chart 작성 (helm create → 수정 → 패키징)
  - Chart 의존성 관리 (dependencies in Chart.yaml)
- **배포 전략**:
  - **Rolling Update**: maxSurge/maxUnavailable 설정, 점진적 교체
  - **Rollback**: kubectl rollout undo, helm rollback, revision 관리
  - **Canary Deployment**: 소량 트래픽으로 검증 후 전체 배포 (수동 가중치 조정)
  - **Blue-Green Deployment**: 두 환경 전환 (Service selector 변경)
  - 각 전략의 트레이드오프 (속도 vs 안전성 vs 리소스)
- **GitOps 기초**:
  - GitOps 원칙: Git = Single Source of Truth, 선언적 구성, 자동 수렴
  - Pull 방식 (GitOps) vs Push 방식 (전통 CI/CD)
  - **ArgoCD**: 설치, Application 리소스 정의, 동기화 정책 (Auto-sync/Manual), ApplicationSet
  - **Flux**: Kustomize Controller, Helm Controller, Source Controller, HelmRelease
  - ArgoCD vs Flux 비교 (UI, 복잡도, 생태계)

**핵심 실습:**
- helm create로 커스텀 Chart 작성 (웹앱 + ConfigMap + Service + Ingress)
- values.yaml 오버라이드로 dev/prod 환경 분리
- helm install → upgrade → rollback 라이프사이클
- Rolling Update: maxSurge=1, maxUnavailable=0으로 안전 배포
- ArgoCD 설치 → Git 리포와 연동 → Application 자동 동기화

<br>

### Phase 2: Azure Kubernetes Service (5주)

대상: Azure 환경에서 Kubernetes를 운영하려는 사람

학습 내용:

**Week 12 - AKS 기초 & Azure 네트워킹 통합**

Azure의 관리형 Kubernetes 서비스인 AKS를 이해하고, Azure 네트워킹과 통합하여 프로덕션급 클러스터를 구성합니다.

- **AKS 기초**:
  - AKS vs On-Premise 운영 차이 (Control Plane 관리, SLA, 업그레이드)
  - Azure Portal / Azure CLI (az aks create)로 클러스터 생성
  - 노드 풀 구성: System Node Pool (kube-system 워크로드) vs User Node Pool (사용자 앱)
  - AKS 클러스터 업그레이드 전략 (Blue-Green Node Pool, Surge Upgrade)
  - Azure AD(Entra ID) 통합 인증, Azure RBAC for Kubernetes Authorization
  - 관리형 서비스 상세 비교 (AKS vs EKS vs GKE: 네트워킹, 비용, 생태계)
- **Azure 네트워킹 통합**:
  - 네트워크 모델 비교: Azure CNI (Pod당 VNet IP) vs Kubenet (NAT 기반) vs Azure CNI Overlay (오버레이 + VNet 통합)
  - VNet/Subnet 설계: Pod Subnet, Node Subnet, AKS 서비스 CIDR
  - NSG (Network Security Group) 연동
  - AGIC (Application Gateway Ingress Controller) 구성
  - Private AKS 클러스터 (Private Endpoint로 API 서버 비공개)
  - Azure Private Link / Private Endpoint로 PaaS 서비스 접근
  - Azure DNS Zone 통합

**핵심 실습:**
- Azure CLI로 AKS 클러스터 생성 (Azure CNI, 2 Node Pool)
- kubectl로 AKS 연결 (az aks get-credentials)
- Private AKS 클러스터 생성 및 Bastion을 통한 접근
- AGIC 구성 후 웹앱 외부 노출

<br>

---

**Week 13 - 스토리지, 스케일링 & 비용 최적화**

Azure 스토리지 서비스를 AKS와 통합하고, 이벤트 기반 스케일링과 비용 최적화 전략을 학습합니다.

- **Azure 스토리지 통합**:
  - Azure Disk CSI Driver: Standard HDD/SSD, Premium SSD, Ultra Disk 성능 비교
  - Azure Files CSI Driver: SMB/NFS 프로토콜 지원 (RWX 가능)
  - StorageClass 정의와 동적 프로비저닝
  - Azure Key Vault Provider for Secrets Store CSI Driver (시크릿/인증서 자동 동기화)
- **스케일링 전략**:
  - Cluster Autoscaler (AKS 설정: --enable-cluster-autoscaler, min/max count)
  - KEDA (Kubernetes Event-Driven Autoscaling): Azure Queue, Kafka, HTTP 이벤트 기반 스케일링
  - AKS Node Autoprovisioning (NAP) / Karpenter
- **비용 최적화**:
  - Spot VM Node Pool (최대 90% 할인, 퇴거 정책)
  - Azure Reserved Instances & Savings Plans
  - Azure Cost Management + Kubecost 연동
  - 노드 풀 분리 전략 (워크로드별 VM 크기 최적화)
  - AKS Start/Stop 기능 (개발 환경 비용 절감)

**핵심 실습:**
- Azure Disk/File CSI 구성
- Key Vault Provider CSI 연동
- Cluster Autoscaler 설정
- KEDA로 Azure Queue 기반 이벤트 스케일링
- Spot VM Node Pool 생성

<br>

---

**Week 14 - 모니터링 & 로깅**

AKS의 관측성(Observability)을 확보합니다. Logs, Metrics, Traces 세 기둥을 중심으로 Azure Monitor 통합 모니터링을 구성합니다.

- **Container Insights**:
  - 활성화 및 Log Analytics 워크스페이스 연동
  - 노드/Pod/컨테이너 메트릭 수집
  - KQL (Kusto Query Language) 기본 쿼리 (ContainerLog, Perf, KubeEvents)
  - Live Logs/Live Metrics로 실시간 관찰
- **Managed Prometheus & Grafana**:
  - Azure Monitor Managed Prometheus 설정 (DCR, DCE)
  - Azure Managed Grafana 연동
  - PromQL 쿼리 (rate, histogram_quantile, aggregation)
  - 대시보드 구성 (클러스터, 노드, 워크로드)
- **알림 설정**:
  - Azure Monitor Alert Rules (Metric Alerts, Log Alerts)
  - Action Group (이메일, Teams Webhook, Logic App)
  - Prometheus Alert Rules (AlertManager)
- **Distributed Tracing**:
  - Application Insights 연동
  - OpenTelemetry Collector 배포
  - 요청 추적 체인과 성능 병목 분석

**핵심 실습:**
- Container Insights 활성화 + KQL 쿼리 작성
- Managed Prometheus + Grafana 대시보드 구성
- Alert Rule 생성 (Pod 재시작 횟수 > 3, CPU > 80%)
- OpenTelemetry Collector 배포 및 트레이스 수집

<br>

---

**Week 15 - 보안 강화**

AKS의 ID 관리, 런타임 보안, 네트워크 보안을 전방위로 강화합니다.

- **ID 및 접근 관리**:
  - Workload Identity: Pod에서 Azure 리소스 접근 (OIDC 기반 Federation)
  - Managed Identity vs Service Principal 비교
  - Azure RBAC for AKS vs Kubernetes RBAC (이중 인가 구조)
  - Conditional Access 정책 적용
- **런타임 보안**:
  - Microsoft Defender for Containers (위협 탐지, 이상 행위 감지)
  - Azure Policy for AKS (Built-in 정책: 특권 컨테이너 금지, 허용 이미지 제한)
  - Pod Security Standards: Restricted / Baseline / Privileged
  - Image Integrity (이미지 서명 검증, Notary)
- **네트워크 보안**:
  - Kubernetes NetworkPolicy + Calico/Cilium
  - Azure Firewall 연동 (Egress 제어)
  - Azure Private Link로 PaaS 서비스 비공개 접근
  - mTLS (Service Mesh를 통한 Pod 간 암호화)

**핵심 실습:**
- Workload Identity 구성 (Pod → Key Vault 접근)
- Defender for Containers 활성화 및 위협 시뮬레이션
- Azure Policy 적용 (특권 컨테이너 차단)
- Pod Security Standards Restricted 적용
- NetworkPolicy + Azure Firewall Egress 제어

<br>

---

**Week 16 - CI/CD & GitOps**

AKS를 위한 완전한 CI/CD 파이프라인을 구축하고, GitOps를 통한 선언적 배포 자동화를 구현합니다.

- **CI 파이프라인**:
  - Azure DevOps Pipeline (빌드 → 테스트 → 이미지 빌드 → ACR 푸시)
  - GitHub Actions (workflow 구성, AKS 배포 Action)
  - ACR Build Tasks (서버리스 이미지 빌드, 소스 트리거)
- **CD 파이프라인**:
  - Helm 기반 배포 자동화
  - Kustomize 활용 (base + overlays로 환경별 설정)
  - 배포 승인 게이트 (Approval Gates)
  - Helm vs Kustomize 선택 기준
- **GitOps on AKS**:
  - AKS Flux Extension (Azure 공식 GitOps)
  - ArgoCD on AKS (Application, ApplicationSet, App of Apps 패턴)
  - 환경 분리 전략 (dev/staging/prod 브랜치 또는 디렉토리)
  - GitOps 시크릿 관리: Sealed Secrets (Bitnami), SOPS + age/Azure Key Vault, External Secrets Operator
- **프로덕션 배포 체크리스트**:
  - 이미지 태깅 전략 (Git SHA, Semantic Versioning)
  - 배포 검증 (Smoke Test, Progressive Delivery)
  - Rollback 절차 및 자동화

**핵심 실습:**
- GitHub Actions: PR → 빌드 → ACR 푸시 → AKS 배포 파이프라인
- ArgoCD: Git 리포 → AKS Application 자동 동기화
- Kustomize: base + dev/prod 오버레이 배포
- Sealed Secrets으로 Git에 안전하게 시크릿 저장

준비물:
- Azure 구독 (무료 크레딧 가능)
- Azure CLI 설치
- Git 기본 지식

<br>

### Phase 3: CKA 시험 준비 (6주)

대상: Kubernetes 공식 자격증을 취득하려는 사람

학습 내용:

**Week 17 - 클러스터 유지보수 & etcd**

CKA 시험의 핵심 영역인 클러스터 관리와 etcd 백업/복구를 집중 훈련합니다.

- **etcd 관리**:
  - etcd의 역할 (모든 클러스터 상태 저장, Raft 합의 알고리즘)
  - etcdctl snapshot save/restore 절차
  - 인증서 기반 etcdctl 접근 (--cacert, --cert, --key)
  - 백업 주기 및 자동화 전략
- **클러스터 업그레이드**:
  - kubeadm upgrade plan → upgrade apply (Control Plane)
  - kubelet/kubectl 업그레이드 (Worker Node)
  - 업그레이드 순서: Master → Worker (한 번에 1 minor version씩)
  - drain / cordon / uncordon 절차
- **인증서 관리**:
  - kubeadm certs check-expiration
  - kubeadm certs renew all
  - 인증서 만료 시 증상과 복구
- **Static Pod**:
  - /etc/kubernetes/manifests 디렉토리
  - kubelet이 직접 관리 (API 서버 없이 실행)
  - Static Pod으로 Control Plane 컴포넌트 동작 이해

**핵심 실습:**
- etcd 스냅샷 백업 및 특정 시점으로 복원
- 클러스터 v1.29 → v1.30 업그레이드 전체 과정
- 인증서 갱신 실습
- Static Pod 생성 및 확인

<br>

---

**Week 18 - 보안 & RBAC**

CKA 시험의 보안 관련 문제를 집중 대비합니다. RBAC과 NetworkPolicy를 실전 수준으로 다룹니다.

- **RBAC 상세**:
  - Role (Namespace 범위) vs ClusterRole (클러스터 범위)
  - RoleBinding vs ClusterRoleBinding
  - Custom Role 작성 (verbs: get, list, watch, create, update, patch, delete)
  - ServiceAccount + RoleBinding 조합
  - 기본 ServiceAccount 토큰과 자동 마운트 비활성화
- **인증 & kubeconfig**:
  - 인증 방식: 인증서 기반 (X.509), 토큰 기반, OIDC
  - kubeconfig 파일 수동 생성 (신규 사용자용)
  - kubectl로 사용자 인증서 생성 (CSR → 승인)
- **NetworkPolicy 멀티 네임스페이스 격리**:
  - Namespace 간 통신 제어
  - 특정 Pod만 DB 접근 허용
  - Egress 규칙으로 외부 접근 제한

**핵심 실습:**
- 개발팀용 Custom Role + RoleBinding 생성
- ServiceAccount + Token으로 API 접근
- 3개 Namespace간 NetworkPolicy 격리 구성
- kubeconfig 수동 생성으로 신규 사용자 추가

<br>

---

**Week 19 - 장애 대응 (Troubleshooting)**

CKA 시험에서 가장 높은 비중을 차지하는 Troubleshooting 영역을 실전 시뮬레이션으로 훈련합니다.

- **Node 장애**:
  - kubelet 서비스 장애 → systemctl start kubelet, journalctl -u kubelet
  - Node NotReady 원인 분석 (kubelet 미실행, 인증서 만료, 디스크 부족)
  - kubectl get nodes / kubectl describe node
- **Pod 장애**:
  - CrashLoopBackOff: 로그 확인 → 설정/코드 문제 수정
  - ImagePullBackOff: 이미지 이름/태그, 레지스트리 인증 확인
  - Pending: 리소스 부족, Taint 불일치, PVC 바인딩 실패
  - OOMKilled: 메모리 Limits 조정, 애플리케이션 메모리 프로파일링
  - CreateContainerError: SecurityContext 문제, 볼륨 마운트 실패
- **네트워크 장애**:
  - Service 접근 불가: Endpoint 확인, Label Selector 매칭
  - DNS 해석 실패: CoreDNS Pod 상태, resolve.conf 확인
  - Pod 간 통신 불가: NetworkPolicy, CNI 상태 확인
- **Control Plane 장애**:
  - API 서버 불능: Static Pod 매니페스트 확인, 인증서 만료 확인
  - Scheduler 불능: Pod Pending 상태 지속
  - Controller Manager 불능: Deployment 스케일링 미반영
- **디버깅 도구**:
  - kubectl debug (Ephemeral Container / 노드 디버깅)
  - kubectl exec -it
  - kubectl logs --previous (이전 크래시 로그)
  - kubectl get events --sort-by=.lastTimestamp
  - crictl (컨테이너 런타임 직접 디버깅)

**핵심 실습:**
- kubelet 중지 → NotReady 재현 → 복구
- OOMKill 재현 (메모리 과다 사용) → 리소스 재조정
- CrashLoopBackOff 시뮬레이션 → 원인 분석 → 수정
- API Server Static Pod 매니페스트 고의 손상 → 복구
- CoreDNS Deployment 삭제 → DNS 장애 재현 → 복구

<br>

---

**Week 20 - 로그 수집 아키텍처**

Kubernetes 클러스터의 중앙 집중 로깅 파이프라인을 구축합니다.

- **로깅 아키텍처 패턴**:
  - DaemonSet 기반 노드 에이전트 (Fluent-bit/Fluentd)
  - Sidecar 기반 앱별 수집
  - 직접 전송 (Application → Log Backend)
  - 각 패턴의 장단점과 선택 기준
- **Fluent-bit 배포 및 설정**:
  - DaemonSet 매니페스트 작성
  - Input/Filter/Output 파이프라인 설정
  - 로그 파싱 (JSON, Regex, Multiline)
  - 메타데이터 보강 (Kubernetes 필터: Namespace, Pod, Container 정보)
- **Loki 스택**:
  - Loki 아키텍처 (라벨 기반 인덱싱, chunk 스토리지)
  - Loki vs Elasticsearch 비교 (비용, 복잡도, 쿼리 능력)
  - LogQL 쿼리 기초
- **Fluent-bit + Loki + Grafana 통합**:
  - 전체 파이프라인: 앱 로그 → Fluent-bit → Loki → Grafana
  - Grafana에서 LogQL로 로그 검색 및 대시보드 구성

**핵심 실습:**
- Fluent-bit DaemonSet Helm 배포
- Loki Helm 설치 및 구성
- Grafana Loki DataSource 연동
- 로그 검색 대시보드 구성

<br>

---

**Week 21 - Prometheus & Grafana**

Kubernetes 모니터링의 표준인 Prometheus와 Grafana를 설치하고 운영합니다. PromQL로 메트릭을 분석하고 알림을 구성합니다.

- **Prometheus 아키텍처**:
  - Pull 모델 (Prometheus가 타겟에서 메트릭 수집)
  - Service Discovery (Kubernetes SD)
  - TSDB (Time Series Database) 구조
  - Prometheus Operator & kube-prometheus-stack
- **Prometheus Operator 배포**:
  - Helm으로 kube-prometheus-stack 설치
  - ServiceMonitor / PodMonitor 정의
  - Custom 메트릭 수집 대상 추가
- **PromQL 쿼리**:
  - Instant Vector vs Range Vector
  - 핵심 함수: rate(), increase(), histogram_quantile(), avg_over_time()
  - Aggregation: sum, avg, max, min by (label)
  - 실전 쿼리 패턴 (CPU 사용률, Memory 사용률, HTTP 요청 레이트, 에러율)
- **알림 규칙**:
  - Recording Rules (자주 사용하는 쿼리 사전 계산)
  - Alerting Rules (조건 + for 지속 시간 + severity)
  - AlertManager: 라우팅, 그룹핑, 억제(inhibit), 뮤트
  - 알림 채널 (Slack, Email, PagerDuty, Webhook)
- **Grafana 대시보드**:
  - Prometheus DataSource 연동
  - 패널 유형 (Time Series, Gauge, Stat, Table, Heatmap)
  - 커뮤니티 대시보드 활용 (Node Exporter, Kubernetes Cluster)
  - 커스텀 대시보드 작성

**핵심 실습:**
- kube-prometheus-stack Helm 설치
- ServiceMonitor로 사용자 앱 메트릭 수집
- PromQL 실전 쿼리 10종 작성
- Alerting Rule 작성 (Pod 재시작 > 3회, Memory > 80%)
- Grafana 커스텀 대시보드 구성

<br>

---

**Week 22 - CKA 실전 시뮬레이션**

CKA 시험 합격을 위한 최종 점검과 실전 모의고사를 진행합니다.

- **시험 구조 파악**:
  - 120분, 17~20문제, 실습 기반 (터미널에서 직접 해결)
  - 합격 기준: 66점
  - 오픈북: kubernetes.io 공식 문서 참조 가능
  - PSI 시험 환경 (원격 감독, 웹캠, 깨끗한 책상)
- **빈출 유형 정리**:
  - RBAC: Role/ClusterRole + Binding 생성 (15-20%)
  - etcd: 스냅샷 백업 및 복원 (10%)
  - NetworkPolicy: Pod 간 통신 제어 (10%)
  - Troubleshooting: Pod/Node 장애 해결 (30%)
  - 클러스터 업그레이드 (10%)
  - Ingress/Service 구성 (10%)
  - PV/PVC 관리 (5-10%)
- **시간 관리 전략**:
  - 쉬운 문제 먼저 (2-3분), 어려운 문제 나중에 (10분+)
  - kubectl explain 적극 활용 (문법 확인)
  - 자주 쓰는 alias 설정 (alias k=kubectl, export do="--dry-run=client -o yaml")
  - vim/nano 단축키 숙달
- **killer.sh 모의고사**:
  - 최소 3회 풀이
  - 오답 분석 및 약점 보완
  - 실전과 동일한 시간 제한 연습

**핵심 실습:**
- killer.sh 모의고사 풀이 (3회)
- 약점 주제 집중 실습
- 120분 시간 제한 시뮬레이션

준비물:
- CKA 시험 등록 ($395)
- killer.sh 모의고사 액세스
- On-Premise 클러스터 (실습용)

<br>

### Appendix: 고급 주제 (선택)

대상: Kubernetes 운영 경험이 있고 심화 영역을 탐구하려는 사람

학습 내용:
- **CRD & Operators**: Custom Resource Definitions 생성, Operator 패턴 이해 (Reconciliation Loop), Operator SDK, 세계적 Operator 사례 (Prometheus Operator, cert-manager)
- **Service Mesh**: Istio/Linkerd 아키텍처, Sidecar Proxy (Envoy), mTLS 자동화, 트래픽 분할, Canary with Mesh, 관측성 통합
- **Multi-cluster & Federation**: 다중 클러스터 관리 전략, 클러스터 간 서비스 디스커버리 (Submariner), Kubernetes Federation v2, 멀티 클라우드 활용
- **고급 관측성**: OpenTelemetry 수집기, Jaeger 분산 트레이싱, SLO/SLI 정의 및 모니터링, Chaos Engineering (Litmus, Chaos Monkey)

<br>

## 주차별 학습 계획

<details>
<summary><strong>Phase 0: Docker & Container 기초 (Week 1-4)</strong></summary>

| Week | 주제 | 핵심 학습 내용 | 핵심 실습 | 포스트 |
|------|------|--------------|----------|--------|
| 1 | Container와 Docker의 이해 | Bare Metal→VM→Container 진화, Docker 설치(Desktop/Engine), Docker 아키텍처(Client→Daemon→Registry), 컨테이너 라이프사이클(run/stop/rm/logs/exec), 이미지vs컨테이너, docker run 내부 동작, save/load 이식성 | Docker 설치, Nginx 컨테이너 포트 매핑, inspect 분석, save/load 실습 | [Week 1]({% post_url k8s/2025-01-06-k8s-week01-container-docker %}) |
| 2 | Container 격리 기술 - Linux Kernel 심화 | Namespace 7종(PID/NET/MNT/UTS/IPC/USER/CGROUP)+실습, Cgroups v1/v2(CPU/Memory 제한)+실습, OverlayFS 레이어 구조, Container Runtime 계층(Docker→containerd→runc), OCI 표준, containerd vs CRI-O | unshare로 Namespace 생성, Cgroups로 리소스 제한, runc 직접 실행 | [Week 2]({% post_url k8s/2025-01-07-k8s-week02-linux-container-isolation %}) |
| 3 | 이미지 빌드 & 데이터 관리 | Dockerfile 전체 명령어, CMD vs ENTRYPOINT, 레이어 캐싱 최적화, Multi-stage Build, Alpine/Distroless 경량화, Volume/Bind Mount/tmpfs, 3rd Party 이미지, Registry(DockerHub/ACR/GHCR), Tagging 전략 | Multi-stage Build로 90% 크기 감소, Volume 영속화, ACR 푸시 | 작성 예정 |
| 4 | Compose, 네트워크, 보안 & K8s 입문 | Docker 네트워킹(bridge/host/overlay), Compose(services/volumes/networks/healthcheck), 보안(Trivy/rootless/read-only), K8s 아키텍처(Control Plane+Node 컴포넌트), Desired State, K8s 대안 비교 | Compose 3-tier 앱, Trivy 스캔, K8s 컴포넌트 분석 | 작성 예정 |

</details>

<details>
<summary><strong>Phase 1: On-Premise Kubernetes (Week 5-11)</strong></summary>

| Week | 주제 | 핵심 학습 내용 | 핵심 실습 | 포스트 |
|------|------|--------------|----------|--------|
| 5 | 클러스터 구축 & kubectl | Kubeadm 3-Node 클러스터(swap/br_netfilter/containerd/CNI), kubeadm init 단계 분석, Minikube/Kind, kubectl 완전 정복(get/describe/apply/explain/jsonpath), kubeconfig 구조/컨텍스트 | Kubeadm 클러스터 구축, kubectl 명령어 전량 실습, 첫 앱 배포 | 작성 예정 |
| 6 | Pod & Workload 리소스 | Pod 라이프사이클/Phase/재시작정책, 멀티컨테이너(Sidecar/Init/Ambassador/Adapter), Probe(Liveness/Readiness/Startup), ReplicaSet, Deployment(롤아웃/롤백), StatefulSet, DaemonSet, Job/CronJob | Pod YAML 작성, Sidecar 패턴, Probe 장애 시뮬, 롤링 업데이트 | 작성 예정 |
| 7 | 구성 관리 & 리소스 제어 | ConfigMap(envFrom/볼륨/immutable), Secret(Opaque/TLS/docker-registry/etcd 암호화), Requests/Limits, QoS(Guaranteed/Burstable/BestEffort), LimitRange, ResourceQuota, Namespace 멀티테넌트 | ConfigMap으로 Nginx 설정 주입, OOM Kill 시뮬, Quota 설정 | 작성 예정 |
| 8 | 서비스 & 네트워킹 | Service 5종(ClusterIP/NodePort/LB/ExternalName/Headless), Ingress(Nginx/Traefik/TLS/IngressClass), Pod-to-Pod 통신, CNI 비교(Calico/Flannel/Cilium), kube-proxy(iptables/IPVS), CoreDNS, NetworkPolicy | Service 4종 테스트, Ingress TLS, iptables 분석, NetworkPolicy 격리 | 작성 예정 |
| 9 | 스토리지 & 상태 관리 | emptyDir/hostPath/projected, PV/PVC(Access Modes/Reclaim Policy/바인딩), StorageClass(동적 프로비저닝/volumeBindingMode), CSI Driver(NFS), 스냅샷/복원, Volume Expansion, StatefulSet+PVC | PV/PVC 구성, StorageClass 동적 프로비저닝, CSI 설치, 스냅샷 | 작성 예정 |
| 10 | 스케줄링 & 오토스케일링 | kube-scheduler(Filtering/Scoring), Taints/Tolerations, Node/Pod Affinity, Topology Spread, Priority/Preemption, PDB, HPA(CPU/Custom), VPA, Cluster Autoscaler, Metrics Server | Taint+Toleration, Affinity 배치, HPA 부하 테스트, PDB+drain | 작성 예정 |
| 11 | Helm & 배포 전략 & GitOps | Helm 아키텍처(Chart/Release/Repo), Chart 구조(values/templates/helpers), Go template, helm install/upgrade/rollback, Rolling Update, Canary, Blue-Green, GitOps 원칙, ArgoCD, Flux | 커스텀 Chart 작성, helm 라이프사이클, ArgoCD 자동 동기화 | 작성 예정 |

</details>

<details>
<summary><strong>Phase 2: Azure Kubernetes Service (Week 12-16)</strong></summary>

| Week | 주제 | 핵심 학습 내용 | 핵심 실습 | 포스트 |
|------|------|--------------|----------|--------|
| 12 | AKS 기초 & Azure 네트워킹 | AKS vs On-Prem(Control Plane SLA), Portal/CLI 클러스터 생성, 노드 풀(System/User), Azure AD 통합, Azure CNI/Kubenet/CNI Overlay, AGIC, Private AKS, VNet/Subnet 설계 | AKS 클러스터 생성, Private AKS, AGIC 설정 | 작성 예정 |
| 13 | 스토리지 & 스케일링 & 비용 | Azure Disk/File CSI(Standard/Premium/Ultra), Key Vault CSI Provider, Cluster Autoscaler, KEDA(이벤트 기반), Spot VM, Reserved Instances, Cost Management/Kubecost, Start/Stop | CSI 구성, Key Vault 연동, KEDA, Spot Node Pool | 작성 예정 |
| 14 | 모니터링 & 로깅 | Container Insights(KQL/Live Logs), Managed Prometheus+Grafana(PromQL/대시보드), Alert Rules/Action Group, Application Insights, OpenTelemetry | Container Insights, Prometheus+Grafana 대시보드, Alert 설정 | 작성 예정 |
| 15 | 보안 강화 | Workload Identity, Managed Identity vs SP, Azure RBAC for AKS, Defender for Containers, Azure Policy, Pod Security Standards, Image Integrity, NetworkPolicy+Firewall | Workload Identity, Defender, Policy, Pod Security | 작성 예정 |
| 16 | CI/CD & GitOps | Azure DevOps Pipeline, GitHub Actions, ACR Build Tasks, Helm/Kustomize CD, Flux Extension, ArgoCD(ApplicationSet), 환경 분리, Sealed Secrets/SOPS | GitHub Actions CI/CD, ArgoCD GitOps, Kustomize 배포 | 작성 예정 |

</details>

<details>
<summary><strong>Phase 3: CKA 시험 준비 (Week 17-22)</strong></summary>

| Week | 주제 | 핵심 학습 내용 | 핵심 실습 | 포스트 |
|------|------|--------------|----------|--------|
| 17 | 클러스터 유지보수 & etcd | etcd 역할(Raft), etcdctl snapshot save/restore, 클러스터 업그레이드(kubeadm upgrade), kubelet/kubectl 업그레이드, 인증서 갱신(kubeadm certs), Static Pod | etcd 백업/복원, v1.29→v1.30 업그레이드 | 작성 예정 |
| 18 | 보안 & RBAC | Role/ClusterRole, RoleBinding/ClusterRoleBinding, ServiceAccount Token, kubeconfig 수동 생성, X.509 인증서 기반 사용자, NetworkPolicy 멀티 네임스페이스 | 커스텀 RBAC, SA+Token, NetworkPolicy 격리 | 작성 예정 |
| 19 | 장애 대응 | kubelet 복구(systemctl/journalctl), Node NotReady, CrashLoopBackOff/ImagePullBackOff, OOMKill, Pending(리소스/Taint/PVC), DNS 장애, API Server 복구, kubectl debug/crictl | kubelet 장애→복구, OOM 재현, API Server 복구 | 작성 예정 |
| 20 | 로그 수집 아키텍처 | 로깅 패턴(DaemonSet/Sidecar/직접전송), Fluent-bit(Input/Filter/Output), Loki(라벨 인덱싱/LogQL), Fluent-bit+Loki+Grafana 통합 | Fluent-bit DaemonSet, Loki, Grafana 로그 대시보드 | 작성 예정 |
| 21 | Prometheus & Grafana | Prometheus 아키텍처(Pull/SD/TSDB), Operator+kube-prometheus-stack, ServiceMonitor/PodMonitor, PromQL(rate/histogram_quantile), Recording/Alerting Rules, AlertManager, Grafana 대시보드 | Prometheus 설치, PromQL 쿼리, Alert 설정, 대시보드 | 작성 예정 |
| 22 | CKA 실전 시뮬레이션 | 시험 구조(120분/17~20문제/66점), 빈출 유형(RBAC 20%/Troubleshooting 30%/etcd 10%), 시간 관리, alias/vim 설정, killer.sh 3회 풀이, 오답 분석 | killer.sh 모의고사 3회, 약점 집중 실습 | 작성 예정 |

</details>

<br>

## 학습 체크리스트

### Phase 0: Docker & Container (4주 완료 시)

- [ ] Bare Metal / VM / Container 차이를 설명할 수 있다
- [ ] Docker 아키텍처 (Client → Daemon → containerd → runc)를 도식화할 수 있다
- [ ] Linux Namespace 7가지의 역할을 설명하고 unshare로 직접 생성할 수 있다
- [ ] Cgroups로 CPU/Memory 제한을 직접 설정할 수 있다
- [ ] OverlayFS 레이어 구조를 이해하고 docker history로 분석할 수 있다
- [ ] Dockerfile 작성 및 멀티스테이지 빌드로 이미지 최적화를 할 수 있다
- [ ] Volume Mount와 Bind Mount의 차이를 이해하고 적절히 선택한다
- [ ] Docker Compose로 다중 컨테이너 앱을 실행할 수 있다
- [ ] 컨테이너 보안 기초 (이미지 스캐닝, rootless)를 적용할 수 있다
- [ ] Kubernetes Control Plane 컴포넌트의 역할을 설명할 수 있다

### Phase 1: On-Premise Kubernetes (11주 완료 시)

- [ ] Kubeadm으로 클러스터 구축 및 노드 추가를 할 수 있다
- [ ] Pod, Deployment, StatefulSet, Job의 차이를 설명하고 적절히 사용한다
- [ ] Liveness/Readiness/Startup Probe를 올바르게 설정한다
- [ ] ConfigMap과 Secret으로 설정과 민감 데이터를 관리한다
- [ ] Resource Requests/Limits와 QoS 클래스를 이해하고 적용한다
- [ ] Service (ClusterIP/NodePort/LB), Ingress로 외부 노출을 구성한다
- [ ] Pod-to-Pod 통신 원리와 CNI 역할을 설명할 수 있다
- [ ] NetworkPolicy로 Pod 간 통신을 제어한다
- [ ] PV/PVC와 CSI Driver로 스토리지를 구성한다
- [ ] HPA를 설정하여 부하 기반 오토스케일링을 구현한다
- [ ] Helm Chart로 애플리케이션을 패키징하고 배포한다
- [ ] Rolling Update/Rollback을 수행할 수 있다

### Phase 2: AKS (16주 완료 시)

- [ ] AKS 클러스터 생성 및 Azure AD 연동
- [ ] Azure CNI / Kubenet / CNI Overlay 차이를 설명할 수 있다
- [ ] AGIC로 Ingress 구성
- [ ] Azure Monitor (Logs, Metrics, Traces)로 관측성 확보
- [ ] Workload Identity로 Key Vault 접근
- [ ] ArgoCD로 GitOps 파이프라인 구축
- [ ] Cluster Autoscaler & Spot VM으로 비용 최적화

### Phase 3: CKA (22주 완료 시)

- [ ] etcd 스냅샷 백업 및 복원
- [ ] 클러스터 업그레이드 (1.29 → 1.30)
- [ ] kubelet 장애 해결
- [ ] Network Policy로 Pod 격리
- [ ] killer.sh 모의고사 66점 이상

<br>

## 전체 요약

### 전체 주차 요약표

| Phase | Week | 주제 | 핵심 키워드 |
|-------|------|------|-----------|
| **Phase 0** | 1 | Container와 Docker의 이해 | Bare Metal→VM→Container, Docker 설치/아키텍처/명령어 |
|  | 2 | Linux Kernel 격리 기술 | Namespace, Cgroups, OverlayFS, containerd/runc, OCI |
|  | 3 | 이미지 빌드 & 데이터 관리 | Dockerfile, Multi-stage, Volume, Registry, Tagging |
|  | 4 | Compose, 보안 & K8s 입문 | Compose, Security, K8s Architecture, Desired State |
| **Phase 1** | 5 | 클러스터 구축 | Kubeadm, CNI, kubectl, kubeconfig |
|  | 6 | Workload 리소스 | Pod, Probe, Deployment, StatefulSet, Job |
|  | 7 | 구성 관리 & 리소스 | ConfigMap, Secret, QoS, LimitRange, Quota |
|  | 8 | 서비스 & 네트워킹 | Service, Ingress, CNI, kube-proxy, NetworkPolicy |
|  | 9 | 스토리지 & 상태 관리 | PV/PVC, StorageClass, CSI, Snapshot, StatefulSet |
|  | 10 | 스케줄링 & 오토스케일링 | Scheduler, Taint, Affinity, HPA, VPA, CA |
|  | 11 | Helm & 배포 & GitOps | Helm Chart, Rolling/Canary, ArgoCD, Flux |
| **Phase 2** | 12 | AKS 기초 & 네트워킹 | AKS, Azure CNI, AGIC, Private AKS |
|  | 13 | 스토리지 & 스케일링 & 비용 | Disk/File CSI, KEDA, Spot VM, Cost |
|  | 14 | 모니터링 & 로깅 | Container Insights, Prometheus, Grafana, OTel |
|  | 15 | 보안 강화 | Workload Identity, Defender, Policy, Pod Security |
|  | 16 | CI/CD & GitOps | GitHub Actions, ArgoCD, Flux, Sealed Secrets |
| **Phase 3** | 17 | 클러스터 유지보수 | etcd, 업그레이드, 인증서, Static Pod |
|  | 18 | 보안 & RBAC | Role, RoleBinding, ServiceAccount, kubeconfig |
|  | 19 | 장애 대응 | kubelet, OOM, CrashLoop, DNS, API Server |
|  | 20 | 로그 수집 | Fluent-bit, Loki, LogQL, Grafana |
|  | 21 | Prometheus & Grafana | Prometheus Operator, PromQL, Alerting, Dashboard |
|  | 22 | CKA 실전 | killer.sh, 시간 관리, 빈출 유형, 시뮬레이션 |
| **Appendix** | - | 고급 주제 | CRD, Operator, Service Mesh, Multi-cluster |

### Phase별 학습 흐름

```
Phase 0 (4주)             Phase 1 (7주)              Phase 2 (5주)           Phase 3 (6주)
Docker & Container        On-Premise K8s             AKS                    CKA
━━━━━━━━━━━━━━━━━         ━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━        ━━━━━━━━━━━━━━━
Week 1: Docker 기초   →   Week 5: 클러스터 구축  →   Week 12: AKS 기초  →   Week 17: 유지보수
Week 2: 격리 기술 ★   →   Week 6: Workload      →   Week 13: 스케일링  →   Week 18: RBAC
Week 3: 이미지/볼륨   →   Week 7: 구성/리소스   →   Week 14: 모니터링  →   Week 19: Troubleshoot
Week 4: Compose/K8s   →   Week 8: 네트워킹      →   Week 15: 보안      →   Week 20: 로그
                           Week 9: 스토리지      →   Week 16: CI/CD     →   Week 21: Prometheus
                           Week 10: 스케줄링                                Week 22: CKA 시험
                           Week 11: Helm/GitOps
                                                                           ┌─────────────┐
                                                                           │  Appendix   │
                                                                           │ CRD/Mesh/   │
                                                                           │ Multi-cluster│
                                                                           └─────────────┘
```

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
2. **중요**: Namespace/Cgroups → Volume/Bind Mount → 레지스트리 → 보안 → Multi-stage
3. **심화**: OCI 표준 → Union Filesystem → Container Runtime 계층 → CI 연동

### Kubernetes 학습 우선순위 (roadmap.sh 기준)

1. **필수**: Pod → Deployment → Service → Ingress → ConfigMap/Secret
2. **중요**: PV/PVC → RBAC → HPA → Helm → NetworkPolicy
3. **심화**: CRD/Operator → Service Mesh → 분산 트레이싱

<br>

## 시작하기

준비되셨나요? 아래 링크에서 학습을 시작하세요:

1. [Week 1: Container와 Docker의 이해]({% post_url k8s/2025-01-06-k8s-week01-container-docker %}) - **여기서 시작**
2. [Week 2: Linux 격리 기술 심화]({% post_url k8s/2025-01-07-k8s-week02-linux-container-isolation %})
3. Week 3~22: 작성 예정

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
