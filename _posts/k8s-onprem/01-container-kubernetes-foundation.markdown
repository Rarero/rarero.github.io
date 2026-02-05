---
layout: post
title: "01. 컨테이너 기술의 심연 - Linux 격리 기술의 본질"
date: 2026-02-05 09:00:00 +0900
tags: [Kubernetes, Container, Namespace, Cgroups, OCI, containerd]
categories: k8s-onprem
---

**컨테이너 기술**은 현대 클라우드 네이티브 애플리케이션의 핵심입니다. 이번 포스트에서는 컨테이너가 어떻게 프로세스를 격리하고, 리소스를 제한하며, 이미지를 효율적으로 관리하는지 심층적으로 다룹니다.

<br>

## 학습 목표

- **Linux Namespaces**: 7가지 격리 메커니즘 이해
- **Cgroups**: 리소스 제한 및 v1 vs v2 차이점
- **Overlay FS**: 컨테이너 이미지의 계층 구조
- **OCI 표준**: containerd와 CRI 통신 규약

1.  Docker 설치 및 기본 명령 실습
2.  Dockerfile 작성 및 이미지 빌드 최적화
3.  Kubernetes 클러스터 아키텍처 이해
4.  Minikube 또는 Kind를 이용한 로컬 Kubernetes 실습
5.  Pod, ReplicaSet, Deployment 실습
6.  Service와 Ingress를 통한 네트워크 구성
7.  PV/PVC를 활용한 스토리지 관리
8.  **AKS 클러스터 생성 및 배포 실습**

앞으로의 여정에 많은 관심 부탁드립니다!
