---
layout: post
title: "Container와 Kubernetes 개요 및 학습 로드맵"
date: 2026-01-14 09:00:00 +0900
tags: [Study, Container, Kubernetes, Docker, AKS]
categories: k8s
---

이번 카테고리에서는 클라우드 네이티브 애플리케이션의 핵심인 **Container**와 **Kubernetes**에 대해 학습합니다.
최종적으로는 Azure의 관리형 Kubernetes 서비스인 **AKS (Azure Kubernetes Service)** 활용까지 목표로 합니다.

<br>

## 1. 학습 목표

1.  **Container 기초**: Docker의 개념, 이미지 빌드, 컨테이너 실행 및 관리
2.  **Kubernetes 핵심 개념**: Pod, Deployment, Service, ConfigMap 등 기본 오브젝트 이해
3.  **Kubernetes 아키텍처**: Control Plane, Node, 동작 원리 파악
4.  **AKS (Azure Kubernetes Service)**: Azure 환경에서의 Kubernetes 배포 및 운영

<br>

## 2. Container란 무엇인가?

### **기본 개념**
컨테이너는 애플리케이션과 그 실행에 필요한 모든 환경(라이브러리, 설정 파일 등)을 하나의 패키지로 묶은 것입니다. 이를 통해 어떠한 환경(개발, 테스트, 운영)에서도 동일하게 애플리케이션이 실행되도록 보장합니다.

*   **가상머신(VM) vs 컨테이너**:
    *   **VM**: 하드웨어 가상화, Guest OS 포함 (무겁고 느림)
    *   **컨테이너**: OS 레벨 가상화, 호스트 OS 커널 공유 (가볍고 빠름)

<br>

## 3. Kubernetes란 무엇인가?

### **컨테이너 오케스트레이션**
수십, 수백 개의 컨테이너를 수동으로 관리하는 것은 불가능합니다. Kubernetes는 이러한 컨테이너들의 배포, 확장, 관리를 자동화해주는 툴입니다.

*   **주요 기능**:
    *   **자동화된 배포 및 롤백**
    *   **서비스 디스커버리 및 로드 밸런싱**
    *   **스토리지 오케스트레이션**
    *   **자동화된 빈 패킹 (Bin packing)**
    *   **자가 치유 (Self-healing)**

<br>

## 4. 앞으로의 계획

이 카테고리에서는 다음과 같은 순서로 포스팅을 진행할 예정입니다.

1.  Docker 설치 및 기본 명령 실습
2.  Dockerfile 작성 및 이미지 빌드 최적화
3.  Kubernetes 클러스터 아키텍처 이해
4.  Minikube 또는 Kind를 이용한 로컬 Kubernetes 실습
5.  Pod, ReplicaSet, Deployment 실습
6.  Service와 Ingress를 통한 네트워크 구성
7.  PV/PVC를 활용한 스토리지 관리
8.  **AKS 클러스터 생성 및 배포 실습**

앞으로의 여정에 많은 관심 부탁드립니다!
