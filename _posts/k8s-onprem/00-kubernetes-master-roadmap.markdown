---
layout: post
title: "Kubernetes 학습 전체 로드맵 - On-Premise부터 CKA까지"
date: 2026-02-05 08:00:00 +0900
tags: [Kubernetes, Roadmap, Learning Path, On-Premise, AKS, CKA]
categories: k8s-onprem
---

이 문서는 **Kubernetes 전문가**가 되기 위한 전체 학습 로드맵을 제시합니다. On-Premise 클러스터 구축부터 Azure Kubernetes Service (AKS) 운영, 그리고 CKA 자격증 취득까지 체계적인 학습 경로를 안내합니다.

<br>

## 📚 학습 구조 개요

Kubernetes 학습은 **3개의 주요 트랙**으로 구성됩니다:

```
┌─────────────────────────────────────────────────────────────┐
│                  Kubernetes 마스터 로드맵                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 1: On-Premise Kubernetes (6주)                       │
│  ├─ Week 1: 컨테이너 기술의 심연                            │
│  ├─ Week 2: 클러스터 구축                                    │
│  ├─ Week 3: Workload 설계 패턴                              │
│  ├─ Week 4: 네트워킹 심화                                    │
│  ├─ Week 5: 스토리지 관리                                    │
│  └─ Week 6: 고급 스케줄링                                    │
│                                                              │
│  Phase 2: Azure Kubernetes Service (7주)                    │
│  ├─ Week 1: AKS 기초 & On-Prem 비교                         │
│  ├─ Week 2: Azure 네트워킹 통합                              │
│  ├─ Week 3: 스토리지 & 데이터 관리                           │
│  ├─ Week 4: Auto-scaling & 비용 최적화                      │
│  ├─ Week 5: 모니터링 & 로깅                                  │
│  ├─ Week 6: 보안 강화                                        │
│  └─ Week 7: CI/CD & GitOps                                  │
│                                                              │
│  Phase 3: CKA 시험 준비 (6주)                                │
│  ├─ Week 1: 클러스터 유지보수 & etcd                         │
│  ├─ Week 2: 보안 & RBAC                                     │
│  ├─ Week 3: 장애 대응 (Troubleshooting)                     │
│  ├─ Week 4: 로그 수집 아키텍처                               │
│  ├─ Week 5: Prometheus & Grafana                            │
│  └─ Week 6: CKA 실전 시뮬레이션                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

총 학습 기간: 약 19주 (4.5개월)
```

<br>

## 🎯 학습 목표

### **최종 목표**

1. **기술 역량**: Kubernetes 클러스터를 처음부터 끝까지 구축하고 운영할 수 있는 능력
2. **문제 해결**: 프로덕션 환경의 복잡한 장애를 신속하게 진단하고 해결하는 능력
3. **자격증**: CKA (Certified Kubernetes Administrator) 취득
4. **실무 적용**: Azure 환경에서 엔터프라이즈급 Kubernetes 인프라 설계

### **핵심 역량 매트릭스**

| 역량 | On-Premise | AKS | CKA |
|------|-----------|-----|-----|
| **클러스터 구축** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **네트워킹** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **스토리지** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **모니터링** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **장애 대응** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **보안** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **CI/CD** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |

<br>

## 📖 학습 트랙 상세

### **🔧 Phase 1: On-Premise Kubernetes (6주)**

**대상**: Kubernetes를 처음 배우는 사람, 클라우드 없이 실습하고 싶은 사람

**학습 내용**:
- 컨테이너 격리 기술 (Namespace, Cgroups)
- Kubeadm으로 클러스터 직접 구축
- CNI 플러그인 설치 및 비교
- PV/PVC를 이용한 스토리지 관리
- RBAC 및 Network Policy

**준비물**:
- VirtualBox/VMware (VM 3대: Master 1 + Worker 2)
- 또는 Azure VM (Ubuntu 22.04 LTS)
- 최소 사양: CPU 2Core, RAM 4GB (VM당)

**[👉 On-Premise Kubernetes 로드맵 보기](/k8s-onprem/00-onprem-kubernetes-roadmap)**

<br>

### **☁️ Phase 2: Azure Kubernetes Service (7주)**

**대상**: Azure 환경에서 Kubernetes를 운영하려는 사람

**학습 내용**:
- AKS vs On-Premise 차이점 이해
- Azure VNet, NSG, Load Balancer 통합
- Azure Monitor for Containers
- Managed Identity와 Key Vault 연동
- GitOps (ArgoCD/Flux) 파이프라인

**준비물**:
- Azure 구독 (무료 크레딧 가능)
- Azure CLI 설치
- Git 기본 지식

**[👉 AKS 학습 로드맵 보기](/aks/00-aks-learning-roadmap)**

<br>

### **🎓 Phase 3: CKA 시험 준비 (6주)**

**대상**: Kubernetes 공식 자격증을 취득하려는 사람

**학습 내용**:
- etcd 백업/복구 (스냅샷)
- 클러스터 업그레이드 실습
- Troubleshooting 30% 집중 학습
- 120분 실전 모의고사 (killer.sh)

**준비물**:
- CKA 시험 등록 ($395)
- killer.sh 모의고사 액세스
- On-Premise 클러스터 (실습용)

**[👉 CKA 준비 로드맵 보기](/cka/00-cka-certification-roadmap)**

<br>

## 🗓️ 주차별 학습 계획

### **Week 1-6: On-Premise Kubernetes**

| Week | 주제 | 핵심 실습 |
|------|------|----------|
| 1 | 컨테이너 기술의 심연 | Namespace/Cgroups 직접 생성, Multi-stage build |
| 2 | 클러스터 구축 | Kubeadm으로 3-Node 클러스터 구축 |
| 3 | Workload 설계 패턴 | Sidecar로 로그 수집, Init Container 활용 |
| 4 | 네트워킹 심화 | iptables 분석, Ingress 구성 |
| 5 | 스토리지 관리 | NFS PV 구성, StatefulSet 배포 |
| 6 | 고급 스케줄링 | Affinity/Taints 설정, PDB 구성 |

### **Week 7-13: Azure Kubernetes Service**

| Week | 주제 | 핵심 실습 |
|------|------|----------|
| 7 | AKS 기초 | Azure Portal에서 클러스터 생성, Azure AD 연동 |
| 8 | Azure 네트워킹 | AGIC 구성, Private AKS 클러스터 |
| 9 | 스토리지 & 데이터 관리 | Azure Disk/File CSI, Key Vault 연동 |
| 10 | Auto-scaling | Cluster Autoscaler, Spot VM 활용 |
| 11 | 모니터링 & 로깅 | Container Insights, Managed Prometheus |
| 12 | 보안 강화 | Workload Identity, Defender for Containers |
| 13 | CI/CD & GitOps | Azure Pipeline, ArgoCD 배포 |

### **Week 14-19: CKA 시험 준비**

| Week | 주제 | 핵심 실습 |
|------|------|----------|
| 14 | 클러스터 유지보수 | etcd 백업/복구, 클러스터 업그레이드 |
| 15 | 보안 & RBAC | Custom Role 생성, Network Policy |
| 16 | 장애 대응 | kubelet 복구, OOMKill 분석 |
| 17 | 로그 수집 | Fluent-bit 배포, Loki 연동 |
| 18 | Prometheus & Grafana | 메트릭 수집, PromQL 쿼리 작성 |
| 19 | CKA 실전 시뮬레이션 | killer.sh 모의고사 3회 풀이 |

<br>

## 💡 학습 팁

### **효율적인 학습 방법**

1. **실습 중심**: 이론 30% + 실습 70%
2. **문서화**: 학습한 내용을 블로그/노트에 정리
3. **커뮤니티**: Kubernetes Slack, Reddit 활용
4. **반복**: 같은 실습을 3번 이상 반복

### **자주 하는 실수**

❌ **이론만 공부**: Kubernetes는 실습 없이 이해 불가  
❌ **건너뛰기**: 기초를 건너뛰고 고급 주제로 진행  
❌ **시간 부족**: 하루 1시간 이상 투자 필요  
❌ **공식 문서 무시**: 시험/실무 모두 공식 문서 필수

<br>

## 📊 학습 체크리스트

### **On-Premise (6주 완료 시)**

- [ ] 컨테이너 런타임 구조 설명 가능
- [ ] Kubeadm으로 클러스터 구축 및 노드 추가
- [ ] Service, Ingress로 외부 노출
- [ ] PV/PVC로 데이터 영속성 보장
- [ ] RBAC로 권한 관리

### **AKS (13주 완료 시)**

- [ ] AKS 클러스터 생성 및 Azure AD 연동
- [ ] AGIC로 Ingress 구성
- [ ] Azure Monitor로 모니터링 대시보드 구축
- [ ] Workload Identity로 Key Vault 접근
- [ ] ArgoCD로 GitOps 파이프라인 구축

### **CKA (19주 완료 시)**

- [ ] etcd 스냅샷 백업 및 복원
- [ ] 클러스터 업그레이드 (1.28 → 1.29)
- [ ] kubelet 장애 해결
- [ ] Network Policy로 Pod 격리
- [ ] killer.sh 모의고사 66점 이상

<br>

## 🚀 시작하기

준비되셨나요? 아래 링크에서 학습을 시작하세요:

1. **[On-Premise Kubernetes 로드맵](/k8s-onprem/00-onprem-kubernetes-roadmap)** - 여기서 시작!
2. **[AKS 학습 로드맵](/aks/00-aks-learning-roadmap)** - On-Prem 완료 후
3. **[CKA 준비 로드맵](/cka/00-cka-certification-roadmap)** - 자격증 도전

<br>

## 📚 추천 자료

### **공식 문서**
- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [AKS 문서](https://docs.microsoft.com/azure/aks/)
- [CKA Curriculum](https://github.com/cncf/curriculum)

### **실습 환경**
- [Play with Kubernetes](https://labs.play-with-k8s.com/) - 무료 임시 클러스터
- [Katacoda](https://www.katacoda.com/courses/kubernetes) - 인터랙티브 실습
- [killer.sh](https://killer.sh/) - CKA 모의고사

### **커뮤니티**
- [Kubernetes Slack](https://slack.k8s.io/)
- [Reddit r/kubernetes](https://www.reddit.com/r/kubernetes/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/kubernetes)

---

> **💪 함께 시작합시다!** Kubernetes는 어렵지만, 체계적으로 학습하면 누구나 마스터할 수 있습니다.
