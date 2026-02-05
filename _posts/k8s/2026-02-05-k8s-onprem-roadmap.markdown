---
layout: post
title: "[k8s-onprem] On-Premise Kubernetes 학습 로드맵 ①"
date: 2026-02-05 09:00:00 +0900
tags: [Kubernetes, On-Premise, Container, Docker, Kubeadm, CNI, Storage]
categories: k8s
---

**On-Premise Kubernetes** 시리즈에서는 클라우드 없이 직접 물리/가상 서버에 Kubernetes 클러스터를 구축하고 운영하는 방법을 다룹니다. 컨테이너 기초부터 시작하여 클러스터 설치, 네트워킹, 스토리지, 스케줄링까지 Kubernetes의 핵심 개념을 실습 중심으로 학습합니다.

<br>

## 학습 목표

이 시리즈를 통해 다음을 습득할 수 있습니다:

- **컨테이너 기술의 본질 이해**: Linux Namespace, Cgroups, Overlay FS
- **Kubernetes 클러스터 직접 구축**: Kubeadm을 이용한 설치 및 구성
- **네트워킹 심화**: Service, Ingress, CNI 플러그인 동작 원리
- **스토리지 관리**: PV/PVC, StorageClass, CSI 드라이버
- **고급 스케줄링**: Affinity, Taints/Tolerations, Resource Management

<br>

## 학습 로드맵

### **Phase 1: 컨테이너 기초 (Week 1)**

**목표**: 컨테이너 기술의 근본 원리를 이해하고 이미지 최적화 및 보안을 학습합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **격리 기술의 본질** | • Linux Namespaces (PID, NET, MNT, UTS, IPC, USER, Cgroup)<br>• Cgroups v1 vs v2 차이점<br>• Overlay2 파일시스템 구조 |
| **런타임 아키텍처** | • OCI (Open Container Initiative) 표준<br>• containerd 아키텍처와 shim 프로세스<br>• CRI (Container Runtime Interface) 통신 규약 |
| **이미지 최적화** | • Multi-stage build 전략<br>• Distroless 이미지 활용<br>• Trivy를 이용한 보안 스캐닝 |

**실습 과제**:
- Docker/containerd 런타임 직접 비교
- 멀티 스테이지 빌드로 이미지 크기 90% 축소
- Namespace와 Cgroups를 직접 생성하여 격리 실험

<br>

### **Phase 2: 클러스터 구축 (Week 2)**

**목표**: Kubeadm으로 On-Premise Kubernetes 클러스터를 처음부터 끝까지 구축합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **Kubeadm Deep Dive** | • `kubeadm init` 단계별 분석<br>• PKI 인증서 체계 (CA, API Server, etcd 인증서)<br>• 조인 토큰 생성 및 보안 |
| **인증 & 인가** | • Kubeconfig 구조 및 Context 관리<br>• API Server의 4단계 필터링 (Authentication → Authorization → Admission → Validation)<br>• User vs ServiceAccount |
| **클러스터 검증** | • kubelet, kube-proxy 상태 확인<br>• Static Pod 동작 원리<br>• 클러스터 헬스체크 |

**실습 과제**:
- 3-Node 클러스터 구축 (1 Master + 2 Worker)
- 인증서 만료 날짜 확인 및 갱신 연습
- Kubeconfig에 새로운 사용자 추가

<br>

### **Phase 3: Workload 설계 패턴 (Week 3)**

**목표**: Pod 설계 패턴과 무중단 배포 전략을 마스터합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **Pod 설계 패턴** | • Sidecar: Fluent-bit 로그 수집, Envoy 프록시<br>• Ambassador: 외부 서비스 추상화<br>• Adapter: 메트릭 포맷 변환 |
| **생명주기 관리** | • Init Container로 의존성 해결<br>• PostStart/PreStop 훅 활용<br>• Graceful Shutdown 구현 |
| **배포 전략** | • Deployment RollingUpdate (maxSurge/maxUnavailable)<br>• Recreate vs RollingUpdate 비교<br>• Rollback 자동화 |

**실습 과제**:
- Sidecar 패턴으로 로그 수집 구현
- Init Container로 DB 마이그레이션 실행
- 무중단 배포 시뮬레이션 (트래픽 손실 0)

<br>

### **Phase 4: 네트워킹 심화 (Week 4)**

**목표**: Kubernetes 네트워킹의 모든 계층을 이해하고 트러블슈팅 능력을 키웁니다.

| 주제 | 핵심 내용 |
|------|----------|
| **Service 내부 구조** | • kube-proxy의 iptables 룰 분석<br>• IPVS 모드 성능 비교<br>• ClusterIP, NodePort, LoadBalancer 차이 |
| **DNS** | • CoreDNS 구조 및 ndots 설정<br>• Stub Domains로 외부 DNS 연동<br>• DNS 쿼리 최적화 |
| **Ingress** | • Nginx Ingress Controller 동작 원리<br>• Annotations를 이용한 URL Rewrite<br>• SSL/TLS 인증서 관리 |
| **CNI** | • Calico/Flannel 비교<br>• VxLAN vs BGP 라우팅<br>• Network Policy 구현 |

**실습 과제**:
- kube-proxy iptables 규칙 직접 분석
- Ingress로 A/B 테스트 구현
- Network Policy로 마이크로서비스 격리

<br>

### **Phase 5: 스토리지 관리 (Week 5)**

**목표**: Persistent Volume을 마스터하고 데이터 영속성을 보장합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **CSI (Container Storage Interface)** | • CSI 드라이버 구조<br>• Provisioner와 Attacher 역할<br>• Dynamic Provisioning |
| **PV/PVC** | • 정적 바인딩 vs 동적 바인딩<br>• Reclaim Policy (Retain, Delete, Recycle)<br>• Storage Class 파라미터 |
| **ConfigMap & Secret** | • etcd 암호화 (EncryptionConfiguration)<br>• 볼륨 마운트 vs 환경변수<br>• Secret 업데이트 전파 시간 |

**실습 과제**:
- NFS 기반 PV 구성
- StatefulSet으로 MySQL 클러스터 구축
- Secret 암호화 활성화 및 검증

<br>

### **Phase 6: 고급 스케줄링 (Week 6)**

**목표**: Pod 배치 전략과 리소스 관리를 최적화합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **스케줄링 전략** | • Node/Pod Affinity & Anti-Affinity<br>• Taints & Tolerations<br>• Topology Spread Constraints |
| **노드 유지보수** | • drain/cordon 동작 원리<br>• PDB (Pod Disruption Budget)<br>• Eviction API |
| **리소스 관리** | • QoS Classes (Guaranteed, Burstable, BestEffort)<br>• CPU Throttling과 Memory OOMKill<br>• Limits vs Requests 설계 원칙 |

**실습 과제**:
- GPU 노드에 특정 Pod만 배치
- PDB로 서비스 가용성 보장
- 리소스 부족 시나리오 재현 및 대응

<br>

## 다음 단계

On-Premise Kubernetes를 마스터한 후에는:

1. **[AKS 시리즈](/aks)**: Azure 환경에서의 Kubernetes 운영
2. **[CKA 시험 준비](/cka)**: 공식 자격증 취득

<br>

## 참고 자료

- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [CRI-O 공식 문서](https://cri-o.io/)
- [CNI 플러그인 스펙](https://github.com/containernetworking/cni)
- [OCI Runtime Spec](https://github.com/opencontainers/runtime-spec)

---

> **💡 Tip**: 이 시리즈는 실습 중심입니다. 직접 클러스터를 구축하고 문제를 해결하면서 학습하세요!
