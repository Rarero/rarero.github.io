---
layout: post
title: "[k8s-phase0] Week 2. Container 격리 기술 심화 ⓪-②"
date: 2025-01-05 09:00:00 +0900
tags: [Container, Namespace, Cgroups, containerd, CRI-O, OCI, Runtime]
categories: k8s
---

컨테이너가 실제로 어떻게 프로세스를 격리하고 리소스를 제한하는지 Linux 커널 레벨에서 이해합니다. Docker 뒤에 숨겨진 핵심 기술을 직접 다뤄봅니다.

<br>

## 학습 목표

- Linux Namespace 7가지 타입과 격리 메커니즘
- Cgroups v1/v2를 이용한 리소스 제한
- Container Runtime의 계층 구조 (Docker → containerd → runc)
- OCI (Open Container Initiative) 표준
- containerd와 CRI-O 비교

<br>

## 1. Linux Namespace

### Namespace란?

프로세스가 시스템 리소스를 격리된 뷰로 보게 만드는 커널 기능입니다.

### 7가지 Namespace 타입

| Namespace | 격리 대상 | 생성 Flag |
|-----------|----------|-----------|
| PID | 프로세스 ID | CLONE_NEWPID |
| NET | 네트워크 인터페이스, 라우팅 테이블 | CLONE_NEWNET |
| MNT | 파일시스템 마운트 포인트 | CLONE_NEWNS |
| UTS | 호스트명, 도메인명 | CLONE_NEWUTS |
| IPC | 프로세스 간 통신 (메시지 큐, 세마포어) | CLONE_NEWIPC |
| USER | 사용자/그룹 ID | CLONE_NEWUSER |
| CGROUP | Cgroup 루트 디렉토리 | CLONE_NEWCGROUP |

### 실습: Namespace 직접 생성

**1. PID Namespace**

```bash
# PID Namespace 생성
sudo unshare --pid --fork --mount-proc /bin/bash

# 프로세스 확인 (PID 1부터 시작)
ps aux
# 격리된 환경에서는 자신만의 PID 테이블을 가짐
```

**2. Network Namespace**

```bash
# 네트워크 네임스페이스 생성
sudo ip netns add container1

# 네임스페이스 내에서 명령 실행
sudo ip netns exec container1 ip addr
# lo 인터페이스만 존재

# veth pair 생성 (가상 이더넷 케이블)
sudo ip link add veth0 type veth peer name veth1

# veth1을 네임스페이스에 할당
sudo ip link set veth1 netns container1

# IP 할당 및 활성화
sudo ip addr add 10.0.0.1/24 dev veth0
sudo ip link set veth0 up

sudo ip netns exec container1 ip addr add 10.0.0.2/24 dev veth1
sudo ip netns exec container1 ip link set veth1 up

# 통신 확인
ping 10.0.0.2
```

**3. Mount Namespace**

```bash
# 마운트 네임스페이스 생성
sudo unshare --mount /bin/bash

# 새로운 루트 파일시스템 준비
mkdir -p /tmp/newroot
cp -r /bin /lib /lib64 /tmp/newroot/

# chroot로 루트 변경
chroot /tmp/newroot /bin/bash

# 컨테이너처럼 격리된 파일시스템 환경
ls /
```

### Docker가 Namespace를 사용하는 방법

```bash
# 컨테이너 실행
docker run -d --name test nginx

# 컨테이너의 PID 확인
docker inspect test | grep Pid
# "Pid": 12345

# 호스트에서 네임스페이스 확인
ls -l /proc/12345/ns/
# lrwxrwxrwx 1 root root 0 ... pid -> pid:[4026532...]
# lrwxrwxrwx 1 root root 0 ... net -> net:[4026532...]
```

<br>

## 2. Cgroups (Control Groups)

### Cgroups란?

프로세스 그룹의 리소스 사용량을 제한, 격리, 측정하는 Linux 커널 기능입니다.

### 제어 가능한 리소스

- **CPU**: CPU 시간 할당
- **Memory**: 메모리 사용량 제한
- **Disk I/O**: 디스크 읽기/쓰기 속도 제한
- **Network**: 네트워크 대역폭 제어

### Cgroups v1 vs v2

| 특징 | v1 | v2 |
|------|----|----|
| 계층 구조 | 컨트롤러별 독립적 계층 | 단일 통합 계층 |
| 메모리 관리 | memory.limit_in_bytes | memory.max |
| CPU 관리 | cpu.shares, cpu.cfs_quota_us | cpu.max, cpu.weight |
| 통합성 | 복잡 | 단순화 |

### 실습: Cgroups 직접 사용

**1. CPU 제한**

```bash
# Cgroups v2 확인
mount | grep cgroup

# CPU 제한 그룹 생성
sudo mkdir -p /sys/fs/cgroup/user.slice/test-cpu

# CPU 사용량을 50%로 제한 (100ms 중 50ms만 사용)
echo "50000 100000" | sudo tee /sys/fs/cgroup/user.slice/test-cpu/cpu.max

# 프로세스를 그룹에 할당
echo $$ | sudo tee /sys/fs/cgroup/user.slice/test-cpu/cgroup.procs

# CPU 집약적 작업 실행
yes > /dev/null &
PID=$!

# CPU 사용률 확인 (약 50%로 제한됨)
top -p $PID

# 정리
kill $PID
```

**2. Memory 제한**

```bash
# 메모리 제한 그룹 생성
sudo mkdir -p /sys/fs/cgroup/user.slice/test-mem

# 메모리 100MB로 제한
echo "100M" | sudo tee /sys/fs/cgroup/user.slice/test-mem/memory.max

# 프로세스 할당
echo $$ | sudo tee /sys/fs/cgroup/user.slice/test-mem/cgroup.procs

# 메모리 초과 시도 (OOM Killer 발동)
python3 -c "a = [0] * (200 * 1024 * 1024)"
# Killed
```

### Docker의 Cgroups 사용

```bash
# CPU 제한 (0.5 core)
docker run -d --cpus="0.5" --name cpu-limited nginx

# 메모리 제한 (512MB)
docker run -d --memory="512m" --name mem-limited nginx

# 확인
docker stats cpu-limited mem-limited

# Cgroups 경로 확인
docker inspect cpu-limited | grep CgroupPath
```

<br>

## 3. Container Runtime 계층 구조

### 전체 구조

```
┌─────────────────────────────────────┐
│         Docker CLI / kubectl        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      containerd / CRI-O (고수준)     │
│  - 이미지 관리                        │
│  - 네트워크 설정                      │
│  - 볼륨 마운트                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         runc (저수준 런타임)          │
│  - Namespace 생성                    │
│  - Cgroups 설정                      │
│  - 실제 컨테이너 프로세스 생성         │
└─────────────────────────────────────┘
```

### OCI (Open Container Initiative) 표준

**OCI Runtime Spec**
- 컨테이너 런타임이 따라야 할 표준
- config.json: 컨테이너 설정
- runtime.json: 런타임 설정

**OCI Image Spec**
- 컨테이너 이미지 형식 표준
- manifest, layers, config

### runc 직접 사용하기

```bash
# runc 설치 확인
runc --version

# 컨테이너 번들 생성
mkdir -p mycontainer/rootfs
cd mycontainer

# Alpine rootfs 다운로드
docker export $(docker create alpine) | tar -C rootfs -xvf -

# config.json 생성
runc spec

# config.json 수정 (프로세스 변경)
# "args": ["sh"]

# 컨테이너 실행
sudo runc run mycontainer

# 다른 터미널에서 확인
sudo runc list
```

<br>

## 4. containerd vs CRI-O

### containerd

Docker에서 분리된 고수준 컨테이너 런타임

**특징:**
- Docker의 핵심 런타임
- CNCF 졸업 프로젝트
- ctr, nerdctl 클라이언트 제공

**설치 및 사용:**

```bash
# containerd 설치 (Ubuntu)
sudo apt-get install containerd

# ctr로 이미지 pull
sudo ctr image pull docker.io/library/nginx:latest

# 컨테이너 실행
sudo ctr run -d docker.io/library/nginx:latest nginx1

# 컨테이너 확인
sudo ctr task list

# nerdctl 사용 (Docker CLI와 유사)
sudo nerdctl run -d -p 8080:80 nginx
```

### CRI-O

Kubernetes를 위한 경량 런타임

**특징:**
- Kubernetes에 최적화
- OCI 표준 준수
- Red Hat 주도 개발

**비교:**

| 특징 | containerd | CRI-O |
|------|-----------|-------|
| 용도 | 범용 | Kubernetes 전용 |
| CLI | ctr, nerdctl | crictl |
| 이미지 빌드 | 가능 (nerdctl) | 불가 |
| 복잡도 | 중간 | 낮음 |
| 성능 | 약간 높음 | 경량 |

<br>

## 5. 컨테이너 이미지 레이어 구조

### Overlay FS

```bash
# Docker가 사용하는 스토리지 드라이버 확인
docker info | grep "Storage Driver"

# 이미지 레이어 확인
docker history nginx:latest

# 실제 레이어 위치
sudo ls -l /var/lib/docker/overlay2/

# 특정 컨테이너의 레이어 구조
docker inspect nginx | grep -A 20 GraphDriver
```

### 레이어 병합 과정

```
┌─────────────────────────┐
│  Container Layer (RW)   │  ← 컨테이너에서 생성된 파일
├─────────────────────────┤
│  Image Layer 3 (RO)     │  ← CMD ["nginx"]
├─────────────────────────┤
│  Image Layer 2 (RO)     │  ← COPY html /usr/share/nginx/
├─────────────────────────┤
│  Image Layer 1 (RO)     │  ← RUN apt-get install nginx
├─────────────────────────┤
│  Base Layer (RO)        │  ← FROM ubuntu:22.04
└─────────────────────────┘
```

<br>

## 실습 과제

### 과제 1: Namespace 직접 생성

다음 격리 환경을 직접 구성하세요:
- PID Namespace: 격리된 프로세스 트리
- Network Namespace: 독립된 네트워크 스택
- Mount Namespace: 격리된 파일시스템

### 과제 2: Cgroups 리소스 제한

Python 스크립트로 메모리를 계속 할당하는 프로그램을 작성하고:
- Cgroups로 메모리를 200MB로 제한
- OOM Killer가 발동하는 시점 관찰
- /sys/fs/cgroup/에서 메모리 사용량 모니터링

### 과제 3: runc로 컨테이너 실행

runc를 사용하여:
- Alpine Linux rootfs 준비
- config.json 작성 (네트워크, 마운트 설정)
- 컨테이너 실행 및 격리 확인

<br>

## 다음 주 예고

Week 3에서는 Kubernetes의 핵심 컴포넌트들 (kube-apiserver, etcd, kube-scheduler, kube-proxy 등)의 동작 원리를 상세히 분석합니다.

<br>

## 참고 자료

- [Linux Namespaces man page](https://man7.org/linux/man-pages/man7/namespaces.7.html)
- [Cgroups v2 문서](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)
- [OCI Runtime Spec](https://github.com/opencontainers/runtime-spec)
- [containerd 공식 문서](https://containerd.io/)
- [CRI-O 공식 문서](https://cri-o.io/)
