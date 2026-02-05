---
layout: post
title: "Azure Kubernetes Service (AKS) 학습 로드맵"
date: 2026-02-05 10:00:00 +0900
tags: [AKS, Azure, Kubernetes, Managed Service, Azure Monitor, AGIC]
categories: aks
---

**Azure Kubernetes Service (AKS)** 시리즈에서는 Azure의 관리형 Kubernetes 서비스를 활용하여 프로덕션급 컨테이너 애플리케이션을 운영하는 방법을 학습합니다. On-Premise Kubernetes와의 차이점부터 시작하여 Azure 특화 기능까지 다룹니다.

<br>

## 학습 목표

이 시리즈를 통해 다음을 습득할 수 있습니다:

- **AKS vs On-Premise 차이점**: 관리형 서비스의 장단점 이해
- **Azure 통합 기능**: VNet, Load Balancer, Azure AD, Key Vault 연동
- **AKS 특화 기능**: Node Pools, Auto-scaling, Azure Monitor
- **실전 운영 노하우**: 비용 최적화, 보안 강화, 모니터링 전략

<br>

## On-Premise vs AKS 비교

### **핵심 차이점**

| 항목 | On-Premise Kubernetes | AKS (Managed) |
|------|----------------------|---------------|
| **Control Plane** | 직접 관리 필요 (etcd, API Server 등) | Azure가 자동 관리 (무료) |
| **업그레이드** | 수동 업그레이드 및 테스트 필요 | 클릭 한 번으로 자동 업그레이드 |
| **고가용성** | Master Node 이중화 직접 구성 | 기본으로 Multi-AZ 구성 |
| **모니터링** | Prometheus/Grafana 직접 설치 | Azure Monitor 통합 제공 |
| **네트워킹** | CNI 플러그인 직접 선택/설치 | Azure CNI 또는 Kubenet 선택 |
| **비용** | 인프라 비용 + 관리 인력 | 노드 비용만 (Control Plane 무료) |

### **언제 On-Premise를 선택해야 하나?**

- **데이터 주권**: 정부/금융권 규제로 온프레미스 필수
- **기존 인프라**: 이미 구축된 IDC 활용
- **완전한 제어**: 모든 설정을 세밀하게 커스터마이징

### **언제 AKS를 선택해야 하나?**

- **빠른 시작**: 클러스터를 5분 안에 프로비저닝
- **관리 부담 감소**: Control Plane 관리 불필요
- **Azure 생태계**: App Service, Cosmos DB 등과 긴밀한 통합

<br>

## 학습 로드맵

### **Phase 1: AKS 기초 (Week 1)**

**목표**: AKS 클러스터를 프로비저닝하고 기본 개념을 이해합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **AKS 아키텍처** | • Control Plane (Azure 관리) vs Node Pool (사용자 관리)<br>• Azure CNI vs Kubenet 네트워킹 모드<br>• System Node Pool vs User Node Pool |
| **클러스터 생성** | • Azure CLI/Portal/Terraform으로 클러스터 생성<br>• Node Pool 설계 (크기, 개수, 가용성 영역)<br>• Kubernetes 버전 선택 전략 |
| **인증 & 액세스** | • Azure AD 통합 (RBAC)<br>• Managed Identity 활용<br>• kubectl 연결 설정 |

**실습 과제**:
- Azure CNI와 Kubenet 성능 비교
- Azure AD 그룹과 Kubernetes RBAC 연동
- 다중 Node Pool 클러스터 구성

<br>

### **Phase 2: Azure 네트워킹 통합 (Week 2)**

**목표**: Azure VNet과의 통합 및 고급 네트워킹을 마스터합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **VNet 설계** | • Subnet 크기 계산 (Pod IP 대역 고려)<br>• NSG (Network Security Group) 규칙<br>• Service Endpoint vs Private Link |
| **Load Balancer** | • Azure Load Balancer vs Application Gateway<br>• Internal LoadBalancer 구성<br>• Public IP 관리 |
| **Ingress Controller** | • AGIC (Application Gateway Ingress Controller)<br>• Nginx Ingress vs AGIC 비교<br>• TLS/SSL 인증서 관리 (Key Vault 연동) |

**실습 과제**:
- AGIC로 Blue/Green 배포 구현
- Private AKS 클러스터 구성
- NSG로 마이크로서비스 간 트래픽 제어

<br>

### **Phase 3: 스토리지 & 데이터 관리 (Week 3)**

**목표**: Azure Disk/File을 Kubernetes와 통합합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **Azure Disk/File** | • Azure Disk CSI Driver<br>• Azure File (SMB/NFS) 성능 비교<br>• Storage Class 파라미터 튜닝 |
| **Backup & DR** | • Azure Backup for AKS<br>• Velero를 이용한 클러스터 백업<br>• 지역 간 DR 전략 |
| **Secret 관리** | • Azure Key Vault CSI Driver<br>• Pod Identity vs Workload Identity<br>• Secret 자동 회전 |

**실습 과제**:
- Azure File로 다중 Pod 공유 스토리지 구성
- Key Vault에서 DB 비밀번호 자동 주입
- Velero로 전체 클러스터 백업/복원

<br>

### **Phase 4: Auto-scaling & 리소스 최적화 (Week 4)**

**목표**: 자동 확장과 비용 최적화를 구현합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **Cluster Autoscaler** | • Node Pool 자동 확장 전략<br>• Scale-down 안전 정책<br>• 비용 최적화 (Spot VM 활용) |
| **HPA & VPA** | • Horizontal Pod Autoscaler 설정<br>• Vertical Pod Autoscaler (VPA)<br>• KEDA (Event-driven Autoscaling) |
| **비용 관리** | • Azure Cost Management 연동<br>• Node Pool 크기 최적화<br>• Reserved Instances 전략 |

**실습 과제**:
- 트래픽 증가 시 자동 노드 추가
- Spot VM Node Pool로 비용 50% 절감
- KEDA로 큐 메시지 기반 스케일링

<br>

### **Phase 5: 모니터링 & 로깅 (Week 5)**

**목표**: Azure Monitor를 활용한 관찰성(Observability)을 구축합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **Azure Monitor** | • Container Insights 활성화<br>• Log Analytics Workspace 설계<br>• KQL 쿼리로 로그 분석 |
| **Prometheus & Grafana** | • Azure Managed Prometheus<br>• Azure Managed Grafana<br>• 커스텀 대시보드 구축 |
| **알람 & 대응** | • Azure Monitor Alerts<br>• Action Groups (Email, Webhook, Logic App)<br>• Incident Response 자동화 |

**실습 과제**:
- Container Insights로 성능 병목 지점 식별
- KQL로 5xx 에러 급증 알림 생성
- Grafana에 멀티 클러스터 대시보드 구성

<br>

### **Phase 6: 보안 강화 (Week 6)**

**목표**: AKS 보안 모범 사례를 적용합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **네트워크 보안** | • Azure Firewall 통합<br>• Private Endpoint 활성화<br>• Network Policy (Calico) |
| **Identity & Access** | • Workload Identity (OIDC 기반)<br>• Azure RBAC for Kubernetes<br>• Just-In-Time Access |
| **컨테이너 보안** | • Azure Defender for Containers<br>• Image scanning (ACR 통합)<br>• Pod Security Admission |

**실습 과제**:
- Workload Identity로 Key Vault 접근
- Azure Firewall로 아웃바운드 트래픽 제어
- Defender로 취약점 스캔 자동화

<br>

### **Phase 7: CI/CD & GitOps (Week 7)**

**목표**: Azure DevOps와 AKS를 통합하여 자동화된 배포 파이프라인을 구축합니다.

| 주제 | 핵심 내용 |
|------|----------|
| **Azure DevOps** | • Pipeline으로 이미지 빌드<br>• ACR (Azure Container Registry) 푸시<br>• Helm Chart 배포 |
| **GitOps** | • Flux/ArgoCD on AKS<br>• Git 저장소와 클러스터 동기화<br>• 멀티 환경 관리 (Dev/Staging/Prod) |
| **Progressive Delivery** | • Canary 배포 (Flagger)<br>• Blue/Green with AGIC<br>• Feature Flag 연동 |

**실습 과제**:
- Azure Pipeline으로 전체 CI/CD 구축
- ArgoCD로 GitOps 워크플로 구현
- Flagger로 트래픽 점진적 전환

<br>

## 다음 단계

AKS를 마스터한 후에는:

1. **[CKA 시험 준비](/cka)**: Kubernetes 공식 자격증 취득
2. **실전 프로젝트**: 프로덕션 환경에 AKS 적용

<br>

## 참고 자료

- [AKS 공식 문서](https://docs.microsoft.com/azure/aks/)
- [Azure Architecture Center](https://docs.microsoft.com/azure/architecture/)
- [AKS Best Practices](https://docs.microsoft.com/azure/aks/best-practices)
- [Azure Updates - AKS](https://azure.microsoft.com/updates/?product=kubernetes-service)

---

> **💡 Tip**: AKS는 빠르게 발전하고 있습니다. 최신 기능과 베스트 프랙티스를 주기적으로 확인하세요!
