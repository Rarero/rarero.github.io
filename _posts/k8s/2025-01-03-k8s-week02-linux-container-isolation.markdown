---
layout: post
title: "[k8s] Week 2. Container 핵심 격리 기술 - Linux Kernel 심화"
date: 2025-01-03 09:00:00 +0900
tags: [Container, Linux, Namespace, Cgroups, OverlayFS, containerd, runc, OCI, CRI-O, Runtime]
categories: k8s
---

컨테이너가 실제로 어떻게 프로세스를 격리하고 리소스를 제한하는지 **Linux 커널 레벨**에서 이해합니다. Docker 뒤에 숨겨진 핵심 기술을 직접 시연하고, Container Runtime의 전체 계층 구조를 파악합니다.

> 참고: [roadmap.sh/docker](https://roadmap.sh/docker)의 "Underlying Technologies: Namespaces, cgroups, Union Filesystems" 항목을 심화 커버합니다.

<br>

## 학습 목표

- Linux Namespace 7가지 타입과 격리 메커니즘 이해 및 직접 생성
- Cgroups v1/v2를 이용한 CPU/Memory 리소스 제한 실습
- Union Filesystem (OverlayFS)의 레이어 동작 원리
- Container Runtime의 계층 구조 (Docker → containerd → runc)
- OCI (Open Container Initiative) 표준의 의미
- containerd와 CRI-O 비교
- runc로 Docker 없이 컨테이너 실행

<br>

## 1. 왜 커널 레벨 이해가 중요한가?

Week 1에서 Docker의 기본 사용법을 배웠습니다. `docker run`을 실행하면 컨테이너가 생성되고, 격리된 환경에서 프로세스가 동작합니다.

하지만 이 "격리"는 마법이 아닙니다. Linux 커널이 제공하는 **세 가지 핵심 기술**의 조합입니다:

```
컨테이너 = Namespace (격리) + Cgroups (리소스제한) + Union FS (파일시스템)
```

| &nbsp;기술&nbsp; | &nbsp;역할&nbsp; | &nbsp;비유&nbsp; |
|---|---|---|
| Namespace | 프로세스가 보는 세상을 격리 | 각자 독립된 방 (PID, 네트워크, 파일시스템) |
| Cgroups | 리소스 사용량 제한/측정 | 각 방의 전기/수도 사용량 한도 |
| Union FS | 레이어 기반 파일시스템 | 투명 필름을 겹쳐놓은 레이어 구조 |

이 세 가지를 이해하면:
- Docker 컨테이너의 **장애 원인**을 커널 레벨에서 진단할 수 있습니다
- **보안 취약점**의 본질을 파악할 수 있습니다 (컨테이너 탈출 등)
- Kubernetes의 리소스 관리(Requests/Limits, QoS)가 **어떤 메커니즘** 위에서 동작하는지 이해합니다

> 참고: [Linux man pages - namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)

<br>

## 2. Linux Namespace

### 2.1 Namespace란?

Namespace는 프로세스가 시스템 리소스를 **격리된 뷰(view)**로 보게 만드는 Linux 커널 기능입니다.

같은 호스트에서 실행되는 두 컨테이너가 각각 PID 1을 가질 수 있는 이유가 바로 PID Namespace 때문입니다.

---

### 2.2 7가지 Namespace 타입

| &nbsp;Namespace&nbsp; | &nbsp;격리 대상&nbsp; | &nbsp;커널 플래그&nbsp; | &nbsp;도입 버전&nbsp; |
|---|---|---|---|
| **PID** | 프로세스 ID 공간 | CLONE_NEWPID | Linux 2.6.24 |
| **NET** | 네트워크 인터페이스, IP, 라우팅, 포트 | CLONE_NEWNET | Linux 2.6.29 |
| **MNT** | 파일시스템 마운트 포인트 | CLONE_NEWNS | Linux 2.4.19 |
| **UTS** | 호스트명, 도메인명 | CLONE_NEWUTS | Linux 2.6.19 |
| **IPC** | 프로세스 간 통신 (메시지 큐, 세마포어, 공유 메모리) | CLONE_NEWIPC | Linux 2.6.19 |
| **USER** | 사용자/그룹 ID 매핑 | CLONE_NEWUSER | Linux 3.8 |
| **CGROUP** | Cgroup 루트 디렉토리 | CLONE_NEWCGROUP | Linux 4.6 |

---

### 2.3 PID Namespace 실습

PID Namespace를 생성하면, 새 네임스페이스 안의 프로세스는 **PID 1**부터 시작하는 독립된 프로세스 트리를 갖습니다.

```bash
# PID Namespace 생성 후 새 셸 실행
sudo unshare --pid --fork --mount-proc /bin/bash

# 프로세스 확인 - 격리된 PID 공간!
ps aux
# USER  PID  %CPU %MEM   COMMAND
# root    1   0.0  0.0   /bin/bash    ← PID 1부터 시작
# root    8   0.0  0.0   ps aux

# 호스트의 다른 프로세스는 보이지 않음
ps aux | wc -l
# 2  (자기 자신의 bash + ps 명령만)

# 나가기
exit
```

**호스트에서 확인:**

```bash
# 격리 Namespace 실행 전에 먼저 호스트에서 확인
ps aux | wc -l
# 200+  (모든 호스트 프로세스가 보임)

# 즉, 같은 호스트에서 PID Namespace만 달리하면
# 컨테이너 프로세스는 자신만의 PID 공간을 가짐
```

**핵심 포인트:**
- 컨테이너 내부의 PID 1 = 해당 컨테이너의 init 프로세스
- 컨테이너 내부의 PID 1이 죽으면 → 컨테이너 종료
- Kubernetes의 `SIGTERM` 시그널은 PID 1에 전달됨 → graceful shutdown의 기반

---

### 2.4 Network Namespace 실습

Network Namespace를 생성하면, 독립된 네트워크 스택(인터페이스, IP, 라우팅 테이블, 포트)을 갖습니다.

```bash
# 1. 네트워크 네임스페이스 생성
sudo ip netns add container1
sudo ip netns add container2

# 네임스페이스 목록 확인
ip netns list
# container2
# container1

# 2. 네임스페이스 내부 확인 - lo만 존재
sudo ip netns exec container1 ip addr
# 1: lo: <LOOPBACK> ...    ← loopback만 있고, eth0 없음

# 3. veth pair 생성 (가상 이더넷 케이블의 양끝)
sudo ip link add veth-host type veth peer name veth-c1

# 4. veth-c1을 container1 네임스페이스에 할당
sudo ip link set veth-c1 netns container1

# 5. IP 주소 할당 및 활성화
# 호스트 측
sudo ip addr add 10.0.0.1/24 dev veth-host
sudo ip link set veth-host up

# container1 측
sudo ip netns exec container1 ip addr add 10.0.0.2/24 dev veth-c1
sudo ip netns exec container1 ip link set veth-c1 up
sudo ip netns exec container1 ip link set lo up

# 6. 통신 확인!
ping -c 3 10.0.0.2
# PING 10.0.0.2 (10.0.0.2) 56(84) bytes of data.
# 64 bytes from 10.0.0.2: icmp_seq=1 ttl=64 time=0.050 ms

# container1에서 호스트로 ping
sudo ip netns exec container1 ping -c 3 10.0.0.1
# 64 bytes from 10.0.0.1: icmp_seq=1 ttl=64 time=0.050 ms

# 7. 정리
sudo ip netns del container1
sudo ip netns del container2
sudo ip link del veth-host 2>/dev/null
```

**Docker의 네트워크 구조와의 관계:**

```
┌────────────────────────────────────────────────────────┐
│  Host (Default Network Namespace)                      │
│                                                        │
│  docker0 (Linux Bridge)                                │
│     │         │         │                              │
│  veth-a    veth-b    veth-c                            │
│     │         │         │                              │
│  ┌──┴──┐  ┌──┴──┐  ┌──┴──┐                           │
│  │NET  │  │NET  │  │NET  │   ← 각각 독립된             │
│  │ NS  │  │ NS  │  │ NS  │     Network Namespace       │
│  │     │  │     │  │     │                             │
│  │eth0 │  │eth0 │  │eth0 │   ← 각 컨테이너는          │
│  │.2   │  │.3   │  │.4   │     자신만의 eth0을 가짐    │
│  └─────┘  └─────┘  └─────┘                            │
│  Cont A   Cont B   Cont C                             │
└────────────────────────────────────────────────────────┘
```

Docker가 `docker run`을 실행할 때 정확히 이 과정(Network Namespace 생성 → veth pair → bridge 연결)을 자동으로 수행합니다.

---

### 2.5 Mount Namespace 실습

Mount Namespace를 생성하면, 격리된 파일시스템 마운트 포인트를 갖습니다.

```bash
# Mount Namespace 생성
sudo unshare --mount /bin/bash

# 임시 디렉토리를 새로운 마운트로 추가
mkdir -p /tmp/isolated-mount
mount -t tmpfs tmpfs /tmp/isolated-mount
echo "격리된 파일" > /tmp/isolated-mount/test.txt
cat /tmp/isolated-mount/test.txt
# 격리된 파일

# ⚠ 이 마운트는 호스트에서는 보이지 않음!
# 다른 터미널에서 확인:
# ls /tmp/isolated-mount/
# (비어 있음 또는 존재하지 않음)

exit
```

---

### 2.6 UTS Namespace

```bash
# UTS Namespace 생성 - 독립된 호스트명
sudo unshare --uts /bin/bash
hostname my-container
hostname
# my-container

# 호스트의 실제 호스트명은 변경되지 않음!
# 다른 터미널에서: hostname → 원래 호스트명
exit
```

---

### 2.7 User Namespace (Rootless Container의 기반)

User Namespace를 이용하면, 컨테이너 내부에서는 root(UID 0)로 보이지만 호스트에서는 일반 사용자로 실행됩니다.

```bash
# User Namespace 생성 (일반 사용자로 실행 가능)
unshare --user --map-root-user /bin/bash

# 네임스페이스 내부에서는 root!
whoami
# root
id
# uid=0(root) gid=0(root)

# 하지만 호스트에서는 여전히 일반 사용자
# 다른 터미널에서 ps로 확인하면 원래 UID로 실행 중

exit
```

**보안 의미:** Rootless 컨테이너는 User Namespace를 활용하여, 컨테이너 내부에서는 root 권한으로 동작하면서도 호스트에서는 일반 사용자 권한만 갖습니다. 컨테이너 탈출(escape) 공격의 피해를 최소화합니다.

---

### 2.8 Docker가 Namespace를 사용하는 방법

Docker 컨테이너를 실행하면, 위의 Namespace가 자동으로 생성됩니다:

```bash
# 컨테이너 실행
docker run -d --name ns-test nginx

# 컨테이너의 PID 확인
CONTAINER_PID=$(docker inspect --format='{{.State.Pid}}' ns-test)
echo $CONTAINER_PID
# 12345

# 호스트에서 해당 프로세스의 Namespace 확인 (Linux)
sudo ls -la /proc/$CONTAINER_PID/ns/
# lrwxrwxrwx 1 root root 0 ... cgroup -> cgroup:[4026532xxx]
# lrwxrwxrwx 1 root root 0 ... ipc -> ipc:[4026532xxx]
# lrwxrwxrwx 1 root root 0 ... mnt -> mnt:[4026532xxx]
# lrwxrwxrwx 1 root root 0 ... net -> net:[4026532xxx]
# lrwxrwxrwx 1 root root 0 ... pid -> pid:[4026532xxx]
# lrwxrwxrwx 1 root root 0 ... user -> user:[4026531837]
# lrwxrwxrwx 1 root root 0 ... uts -> uts:[4026532xxx]

# 호스트의 Namespace와 비교
sudo ls -la /proc/1/ns/
# → 번호가 다름 = 서로 격리된 Namespace

# nsenter로 컨테이너 Namespace에 진입 (docker exec의 원리)
sudo nsenter --target $CONTAINER_PID --pid --net --mount -- /bin/bash
hostname
ps aux
exit

# 정리
docker rm -f ns-test
```

> **💡 핵심**: `docker exec`는 내부적으로 `nsenter`와 동일한 시스템 콜(setns)을 사용하여 기존 컨테이너의 Namespace에 새 프로세스를 진입시킵니다.

<br>

## 3. Cgroups (Control Groups)

### 3.1 Cgroups란?

Cgroups는 프로세스 그룹의 **리소스 사용량을 제한, 격리, 측정**하는 Linux 커널 기능입니다.

Namespace가 "무엇을 볼 수 있는가"를 제어한다면, Cgroups는 "**얼마나 쓸 수 있는가**"를 제어합니다.

### 3.2 제어 가능한 리소스

| &nbsp;리소스&nbsp; | &nbsp;Cgroups 컨트롤러&nbsp; | &nbsp;제어 내용&nbsp; |
|---|---|---|
| CPU | cpu, cpuset | CPU 시간 할당, 사용 가능한 CPU 코어 지정 |
| Memory | memory | 메모리 사용량 제한, OOM Killer 동작 |
| Disk I/O | io (v2), blkio (v1) | 디스크 읽기/쓰기 속도 제한 |
| Network | net_cls, net_prio (v1) | 네트워크 대역폭 제어 |
| PIDs | pids | 프로세스 수 제한 (Fork Bomb 방지) |

> 참고: [Linux Kernel Documentation - cgroups v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)

---

### 3.3 Cgroups v1 vs v2

| &nbsp;특징&nbsp; | &nbsp;v1&nbsp; | &nbsp;v2&nbsp; |
|---|---|---|
| 계층 구조 | 컨트롤러별 독립적 계층 | **단일 통합 계층** |
| 메모리 관리 | memory.limit_in_bytes | memory.max |
| CPU 관리 | cpu.shares, cpu.cfs_quota_us | cpu.max, cpu.weight |
| 통합성 | 복잡 (각 컨트롤러 개별 관리) | 단순화 (통합 관리) |
| 도입 | Linux 2.6.24 | Linux 4.5 |

```bash
# 현재 시스템의 Cgroups 버전 확인
mount | grep cgroup
# cgroup2 on /sys/fs/cgroup type cgroup2 ...  ← v2
# 또는
# tmpfs on /sys/fs/cgroup type tmpfs ...       ← v1

# v2 확인 방법
stat -fc %T /sys/fs/cgroup/
# cgroup2fs  ← v2
# tmpfs      ← v1
```

---

### 3.4 실습: CPU 제한 (Cgroups v2)

```bash
# 1. CPU 제한 그룹 생성
sudo mkdir -p /sys/fs/cgroup/cpu-test

# 2. CPU 사용량을 50%로 제한
# 형식: "quota period" (마이크로초 단위)
# 100ms(100000μs) 중 50ms(50000μs)만 사용 → 50%
echo "50000 100000" | sudo tee /sys/fs/cgroup/cpu-test/cpu.max
cat /sys/fs/cgroup/cpu-test/cpu.max
# 50000 100000

# 3. CPU를 100% 사용하는 프로세스 시작
yes > /dev/null &
YES_PID=$!
echo "stress PID: $YES_PID"

# 4. 프로세스를 제한 그룹에 할당
echo $YES_PID | sudo tee /sys/fs/cgroup/cpu-test/cgroup.procs

# 5. CPU 사용률 확인 - 약 50%로 제한됨!
top -p $YES_PID -n 3 -b | grep $YES_PID
# PID    USER   PR  NI  VIRT  RES  SHR  S  %CPU  %MEM  TIME+  COMMAND
# xxxxx  user   20  0   xxxx  xxx  xxx  R  50.0  0.0   x:xx   yes

# 6. 정리
kill $YES_PID
sudo rmdir /sys/fs/cgroup/cpu-test
```

**핵심 관찰:** CPU 집약적 프로세스가 Cgroups 제한 없이는 CPU 100%를 사용하지만, 제한 그룹에 넣으면 정확히 50%로 제한됩니다.

---

### 3.5 실습: Memory 제한 (Cgroups v2)

```bash
# 1. 메모리 제한 그룹 생성
sudo mkdir -p /sys/fs/cgroup/mem-test

# 2. 메모리 100MB로 제한
echo "104857600" | sudo tee /sys/fs/cgroup/mem-test/memory.max
# 104857600 bytes = 100MB

# swap도 제한 (메모리 제한이 swap으로 우회되는 것 방지)
echo "0" | sudo tee /sys/fs/cgroup/mem-test/memory.swap.max

# 3. 현재 셸을 제한 그룹에 할당
echo $$ | sudo tee /sys/fs/cgroup/mem-test/cgroup.procs

# 4. 메모리 사용량 확인
cat /sys/fs/cgroup/mem-test/memory.current
# 현재 사용중인 메모리 (bytes)

# 5. 100MB 초과 시도 → OOM Killer 발동!
python3 -c "
data = []
while True:
    data.append(b'x' * 1024 * 1024)  # 1MB씩 할당
    print(f'Allocated: {len(data)} MB')
"
# Allocated: 1 MB
# Allocated: 2 MB
# ...
# Allocated: 95 MB
# Killed   ← OOM Killer가 프로세스를 종료함!

# 6. OOM 이벤트 확인
cat /sys/fs/cgroup/mem-test/memory.events
# oom 1         ← OOM 발생 횟수
# oom_kill 1    ← OOM Kill 발생 횟수

# 7. 정리 (새 셸에서)
sudo rmdir /sys/fs/cgroup/mem-test
```

**핵심 관찰:** Cgroups가 메모리 제한을 초과하려는 프로세스를 OOM Killer로 종료합니다. 이것이 Kubernetes에서 Pod의 메모리 Limit을 초과할 때 `OOMKilled` 상태가 되는 **정확한 메커니즘**입니다.

---

### 3.6 Docker의 Cgroups 사용

Docker의 `--cpus`, `--memory` 옵션은 내부적으로 Cgroups를 설정합니다:

```bash
# CPU 0.5 core, Memory 512MB 제한 컨테이너 실행
docker run -d --name cg-test --cpus="0.5" --memory="512m" nginx

# Docker가 설정한 Cgroups 경로 확인
CONTAINER_ID=$(docker inspect --format='{{.Id}}' cg-test)

# Cgroups v2에서 Docker 컨테이너의 CPU 제한 확인
cat /sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/cpu.max
# 50000 100000  ← 0.5 CPU = 50ms / 100ms

# Memory 제한 확인
cat /sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/memory.max
# 536870912  ← 512MB = 512 × 1024 × 1024

# docker stats로 확인 (간편한 방법)
docker stats cg-test --no-stream
# NAME     CPU %   MEM USAGE / LIMIT   ...
# cg-test  0.00%   3.5MiB / 512MiB     ...

# 정리
docker rm -f cg-test
```

**Kubernetes와의 연결:**
```yaml
# Kubernetes의 Resource Limits가 Cgroups로 변환됨
resources:
  requests:
    cpu: "250m"      # → Scheduler의 배치 기준
    memory: "128Mi"  # → Scheduler의 배치 기준
  limits:
    cpu: "500m"      # → Cgroups cpu.max: 50000 100000
    memory: "512Mi"  # → Cgroups memory.max: 536870912
```

<br>

## 4. Union Filesystem (OverlayFS)

### 4.1 OverlayFS란?

OverlayFS는 여러 디렉토리(레이어)를 **투명하게 겹쳐서** 하나의 통합된 파일시스템으로 보여주는 기술입니다.

```
┌─────────────────────────────────────────┐
│            merged (통합 뷰)             │  ← 사용자에게 보이는 파일시스템
├─────────────────────────────────────────┤
│  upperdir (쓰기 가능한 최상위 레이어)    │  ← 컨테이너에서 생성/수정된 파일
├─────────────────────────────────────────┤
│  lowerdir (읽기 전용 레이어들)           │  ← 이미지 레이어들
│  ├── Layer 3: CMD ["nginx"]             │
│  ├── Layer 2: COPY html files           │
│  └── Layer 1: FROM ubuntu:22.04         │
├─────────────────────────────────────────┤
│  workdir (내부 작업용)                   │  ← OverlayFS 내부 처리용
└─────────────────────────────────────────┘
```

---

### 4.2 OverlayFS 직접 체험

```bash
# 1. 디렉토리 구조 생성
mkdir -p /tmp/overlay-demo/{lower1,lower2,upper,work,merged}

# 2. 하위 레이어에 파일 생성 (읽기 전용 이미지 레이어에 해당)
echo "base file from layer 1" > /tmp/overlay-demo/lower1/base.txt
echo "config from layer 1" > /tmp/overlay-demo/lower1/config.txt

echo "app from layer 2" > /tmp/overlay-demo/lower2/app.txt
echo "config from layer 2 (override)" > /tmp/overlay-demo/lower2/config.txt

# 3. OverlayFS 마운트
sudo mount -t overlay overlay \
  -o lowerdir=/tmp/overlay-demo/lower2:/tmp/overlay-demo/lower1,\
upperdir=/tmp/overlay-demo/upper,\
workdir=/tmp/overlay-demo/work \
  /tmp/overlay-demo/merged

# 4. merged 디렉토리 확인 - 모든 레이어가 통합!
ls /tmp/overlay-demo/merged/
# app.txt  base.txt  config.txt

# lower2의 config.txt가 lower1을 오버라이드
cat /tmp/overlay-demo/merged/config.txt
# config from layer 2 (override)

# 5. merged에서 새 파일 생성 → upper 레이어에만 기록
echo "runtime data" > /tmp/overlay-demo/merged/runtime.txt
ls /tmp/overlay-demo/upper/
# runtime.txt  ← 새 파일은 upper에만 존재

# 6. merged에서 lower 파일 수정 → Copy-on-Write!
echo "modified base" > /tmp/overlay-demo/merged/base.txt
cat /tmp/overlay-demo/upper/base.txt
# modified base  ← upper 레이어에 복사 후 수정됨
cat /tmp/overlay-demo/lower1/base.txt
# base file from layer 1  ← 원본은 변경되지 않음!

# 7. 정리
sudo umount /tmp/overlay-demo/merged
rm -rf /tmp/overlay-demo
```

**Copy-on-Write (CoW) 핵심:**
- 읽기: lower 레이어에서 직접 읽음 (빠름)
- 쓰기: lower 파일을 upper로 복사한 후 수정 (첫 쓰기만 느림)
- 삭제: upper 레이어에 "whiteout" 파일 생성 (실제 삭제 아님)

---

### 4.3 Docker에서 OverlayFS 확인

```bash
# Docker의 스토리지 드라이버 확인
docker info | grep "Storage Driver"
# Storage Driver: overlay2

# 컨테이너 실행
docker run -d --name overlay-test nginx

# 레이어 구조 확인
docker inspect overlay-test --format='{{json .GraphDriver.Data}}' | python3 -m json.tool
# {
#   "LowerDir": "/var/lib/docker/overlay2/.../diff:...",  ← 이미지 레이어들
#   "MergedDir": "/var/lib/docker/overlay2/.../merged",   ← 통합 뷰
#   "UpperDir": "/var/lib/docker/overlay2/.../diff",      ← 컨테이너 쓰기 레이어
#   "WorkDir": "/var/lib/docker/overlay2/.../work"        ← 작업 디렉토리
# }

# 이미지 레이어 수
docker history nginx --no-trunc --format='{{.CreatedBy}}' | wc -l

# 정리
docker rm -f overlay-test
```

> 참고: [Docker 공식 문서 - OverlayFS storage driver](https://docs.docker.com/storage/storagedriver/overlayfs-driver/)

<br>

## 5. Container Runtime 계층 구조

### 5.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────┐
│           Docker CLI / kubectl / nerdctl             │
│           (사용자 인터페이스)                          │
└───────────────────────┬─────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌───────────────────┐      ┌───────────────────┐
│  Docker Daemon    │      │    kubelet        │
│  (dockerd)        │      │  (Kubernetes)     │
└────────┬──────────┘      └────────┬──────────┘
         │                          │
         │    CRI (Container        │
         │    Runtime Interface)    │
         ▼                          ▼
┌─────────────────────────────────────────────┐
│            고수준 Runtime                    │
│  ┌──────────────┐    ┌──────────────┐       │
│  │  containerd   │    │   CRI-O     │       │
│  │ (Docker 출신) │    │ (K8s 전용)  │       │
│  └──────┬───────┘    └──────┬───────┘       │
│         │                    │               │
│         │   OCI Runtime      │               │
│         │   Specification    │               │
│         ▼                    ▼               │
│  ┌─────────────────────────────────┐        │
│  │        저수준 Runtime           │        │
│  │          runc                   │        │
│  │  (Namespace + Cgroups + rootfs) │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

### 5.2 각 컴포넌트의 역할

**Docker Daemon (dockerd):**
- Docker CLI의 요청을 받아 처리
- 이미지 빌드, 네트워크/볼륨 관리
- containerd에 컨테이너 실행 위임

**containerd:**
- Docker에서 분리된 CNCF 졸업 프로젝트
- 이미지 pull/push, 스냅샷 관리
- 컨테이너 실행 요청을 runc에 전달
- shim 프로세스: 컨테이너가 containerd 재시작에도 영향 없이 동작하도록 보장

**runc:**
- OCI Runtime Spec을 구현한 저수준 런타임
- 실제로 Namespace/Cgroups를 생성하고 프로세스를 실행
- Go 언어로 작성, OCI 표준 레퍼런스 구현체

**shim 프로세스의 역할:**

```
containerd
    │
    ├── containerd-shim → runc → Container A (PID 1234)
    ├── containerd-shim → runc → Container B (PID 5678)
    └── containerd-shim → runc → Container C (PID 9012)
```

- 컨테이너와 containerd 사이의 중간자
- containerd가 재시작되어도 컨테이너는 계속 실행
- 컨테이너의 stdin/stdout 관리
- 컨테이너 종료 시 exit status 보고

---

### 5.3 Kubernetes에서 Docker가 제거된 이유

Kubernetes v1.24부터 dockershim이 제거되었습니다:

```
Kubernetes ≤ v1.23:
kubelet → dockershim → dockerd → containerd → runc

Kubernetes ≥ v1.24:
kubelet → containerd → runc   (Docker 중간 계층 제거!)
         또는
kubelet → CRI-O → runc
```

**이유:**
- Docker Daemon은 이미지 빌드, CLI, Swarm 등 Kubernetes에 불필요한 기능 포함
- containerd/CRI-O가 CRI 표준을 직접 구현하므로 dockershim 불필요
- 성능 오버헤드 감소

**영향:**
- Docker로 빌드한 이미지는 여전히 사용 가능 (OCI Image Spec 준수)
- `docker build`는 여전히 이미지 빌드 도구로 사용
- 런타임만 containerd/CRI-O로 변경

<br>

## 6. OCI (Open Container Initiative) 표준

### 6.1 OCI란?

Linux Foundation 산하 프로젝트로, 컨테이너 기술의 **업계 표준**을 정의합니다.

```
OCI 표준
├── Runtime Specification  ← 컨테이너 런타임이 따라야 할 규격
│   └── config.json: 컨테이너 설정 (Namespace, Cgroups, rootfs 등)
│
└── Image Specification    ← 컨테이너 이미지 형식 규격
    ├── manifest: 이미지 메타데이터
    ├── config: 이미지 설정 (환경변수, CMD 등)
    └── layers: 파일시스템 레이어 (tar.gz)
```

**OCI 표준이 중요한 이유:**
- Docker가 빌드한 이미지를 containerd, CRI-O, Podman 등 어디서든 실행 가능
- 런타임을 자유롭게 교체 가능 (runc ↔ crun ↔ kata-containers)
- 벤더 락인 방지

### 6.2 OCI Runtime Spec 구조 (config.json)

```json
{
  "ociVersion": "1.0.2",
  "process": {
    "terminal": true,
    "user": { "uid": 0, "gid": 0 },
    "args": ["sh"],
    "cwd": "/"
  },
  "root": {
    "path": "rootfs",
    "readonly": true
  },
  "linux": {
    "namespaces": [
      { "type": "pid" },
      { "type": "network" },
      { "type": "mount" },
      { "type": "uts" },
      { "type": "ipc" }
    ],
    "resources": {
      "memory": { "limit": 536870912 },
      "cpu": { "quota": 50000, "period": 100000 }
    }
  }
}
```

> 참고: [OCI Runtime Specification](https://github.com/opencontainers/runtime-spec)

<br>

## 7. containerd vs CRI-O

### 7.1 비교표

| &nbsp;특징&nbsp; | &nbsp;containerd&nbsp; | &nbsp;CRI-O&nbsp; |
|---|---|---|
| 출신 | Docker에서 분리 | Kubernetes 전용으로 설계 |
| 관리 주체 | CNCF (졸업) | CNCF (인큐베이팅) |
| 용도 | 범용 (독립 실행 + K8s) | Kubernetes 전용 |
| CLI 도구 | ctr (저수준), nerdctl (Docker 호환) | crictl (CRI 표준) |
| 이미지 빌드 | nerdctl로 가능 | 불가 (BuildKit/Podman 별도) |
| Kubernetes CRI | 지원 (built-in CRI plugin) | 지원 (네이티브) |
| 복잡도 | 중간 | 낮음 (더 경량) |
| 사용 사례 | AKS, EKS, GKE, Docker Desktop | Red Hat OpenShift, Fedora CoreOS |

### 7.2 containerd CLI 사용

```bash
# ctr: containerd 저수준 CLI
sudo ctr images pull docker.io/library/alpine:latest
sudo ctr images ls
sudo ctr run -d docker.io/library/alpine:latest test1 sh
sudo ctr task ls
sudo ctr task kill test1
sudo ctr containers rm test1

# nerdctl: Docker 호환 CLI (Docker 명령어와 동일!)
sudo nerdctl run -d --name web -p 8080:80 nginx
sudo nerdctl ps
sudo nerdctl logs web
sudo nerdctl rm -f web
```

### 7.3 crictl 사용 (Kubernetes 노드에서)

```bash
# crictl: CRI 표준 CLI (containerd, CRI-O 공통)
sudo crictl images
sudo crictl ps
sudo crictl pods
sudo crictl logs <container-id>
sudo crictl inspect <container-id>
```

<br>

## 8. runc로 Docker 없이 컨테이너 실행

### 8.1 Docker 없이 컨테이너 만들기

이 실습을 통해 Docker가 내부적으로 하는 일을 **직접 체험**합니다.

```bash
# 1. 작업 디렉토리 생성
mkdir -p ~/runc-demo/rootfs
cd ~/runc-demo

# 2. Alpine Linux rootfs 준비
# Docker를 이용해 rootfs 파일시스템 추출
docker export $(docker create alpine:latest) | tar -C rootfs -xvf -

# rootfs 내용 확인
ls rootfs/
# bin  dev  etc  home  lib  media  mnt  opt  proc  root  run
# sbin  srv  sys  tmp  usr  var

# 3. OCI Runtime Spec (config.json) 생성
runc spec

# config.json이 생성됨 - 기본 OCI Runtime Spec
cat config.json | python3 -m json.tool | head -30

# 4. config.json 수정: terminal을 true로 유지하거나
# process.args를 원하는 명령으로 변경
# 기본값: ["sh"] — Alpine에서 shell 실행

# 5. 컨테이너 실행!
sudo runc run my-first-container
# / # ← 컨테이너 내부 셸!

# 6. 컨테이너 내부에서 확인
hostname
# my-first-container  ← UTS Namespace로 격리된 호스트명

ps aux
# PID   USER    COMMAND
#   1   root    sh      ← PID 1부터 시작 (PID Namespace)

ip addr
# lo 인터페이스만 존재 (Network Namespace로 격리)

cat /proc/1/cgroup
# Cgroups 정보 확인

exit
```

```bash
# [다른 터미널에서] 실행 중인 runc 컨테이너 확인
sudo runc list
# ID                    PID    STATUS    BUNDLE                        CREATED
# my-first-container    xxxxx  running   /home/user/runc-demo          2025-01-...

# 컨테이너 상태 확인
sudo runc state my-first-container

# 컨테이너 삭제
sudo runc delete my-first-container
```

### 8.2 전체 과정 요약

```
1. rootfs 준비    → 컨테이너의 파일시스템 (Mini Linux 환경)
2. config.json    → Namespace, Cgroups, 마운트 설정 (OCI Runtime Spec)
3. runc run       → Namespace 생성 + Cgroups 설정 + rootfs 마운트 + 프로세스 시작

= 이것이 Docker가 내부적으로 하는 일의 전부!
```

<br>

## 9. Docker의 격리 기술 종합 — 전체 그림

Docker 컨테이너 하나를 실행할 때 일어나는 일을 모든 커널 기술과 연결해서 봅니다.

```bash
docker run -d --name full-demo -p 8080:80 --cpus="0.5" --memory="256m" nginx
```

```
1. docker CLI → REST API → dockerd
2. dockerd → containerd에 요청 전달
3. containerd:
   - nginx:latest 이미지 레이어 확인/pull
   - OverlayFS로 레이어 병합 (merged 디렉토리 생성)
   - config.json (OCI Spec) 생성
   - containerd-shim 프로세스 생성
4. containerd-shim → runc 호출
5. runc:
   ┌─ PID Namespace 생성 (격리된 프로세스 공간)
   ├─ Network Namespace 생성 + veth pair + docker0 bridge 연결
   ├─ Mount Namespace 생성 + OverlayFS 마운트
   ├─ UTS Namespace 생성 (컨테이너 호스트명)
   ├─ IPC Namespace 생성
   ├─ Cgroups 설정:
   │    ├─ cpu.max: 50000 100000 (0.5 CPU)
   │    └─ memory.max: 268435456 (256MB)
   └─ nginx 프로세스 시작 (PID 1)
6. 포트 매핑: iptables NAT 규칙 추가 (8080 → 컨테이너 80)
7. 컨테이너 실행 중!
```

```
호스트 관점에서 보면:

┌────────────────────────────────────────────────────────┐
│  Host Kernel                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Namespace 격리                                   │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐               │  │
│  │  │PID NS  │ │NET NS  │ │MNT NS │ ...            │  │
│  │  │PID 1:  │ │eth0:   │ │rootfs:│               │  │
│  │  │nginx   │ │172.17. │ │overlay│               │  │
│  │  │        │ │0.2     │ │2      │               │  │
│  │  └────────┘ └────────┘ └────────┘               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Cgroups 리소스 제한                              │  │
│  │  cpu.max: 50000/100000   memory.max: 256MB       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  OverlayFS 파일시스템                             │  │
│  │  lower: nginx image layers (RO)                  │  │
│  │  upper: container writes (RW)                    │  │
│  │  merged: unified view                            │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

<br>

## 실습 과제

### 과제 1: Namespace 직접 격리 환경 구성

다음 격리 환경을 직접 구성하세요:
1. PID Namespace: 격리된 프로세스 트리를 생성하고 `ps aux`로 격리 확인
2. Network Namespace: 두 개의 네트워크 네임스페이스를 만들고 veth pair로 서로 통신
3. UTS Namespace: 호스트명이 격리된 환경을 생성하고 호스트와 비교

### 과제 2: Cgroups 리소스 제한 실험

1. Cgroups로 CPU를 25%로 제한한 후 `stress` 또는 `yes` 명령으로 검증
2. Cgroups로 메모리를 200MB로 제한한 후 Python으로 메모리 할당하여 OOM Kill 관찰
3. Docker 컨테이너를 `--cpus=0.25 --memory=200m`으로 실행한 후, /sys/fs/cgroup에서 Cgroups 설정값 직접 확인

### 과제 3: runc로 컨테이너 실행

1. Alpine rootfs를 준비하고 runc spec으로 config.json 생성
2. config.json에서 메모리 제한을 128MB로 설정
3. runc run으로 컨테이너를 실행하고 Namespace/Cgroups가 적용되었는지 확인
4. 다른 터미널에서 runc list, runc state로 상태 확인

### 과제 4: OverlayFS Copy-on-Write 관찰

1. lower/upper/work/merged 디렉토리를 생성하고 OverlayFS 마운트
2. merged에서 lower 레이어의 파일을 수정 → upper에 복사되는 것 확인
3. merged에서 파일 삭제 → upper에 whiteout 파일 생성 확인
4. Docker 컨테이너의 overlay2 디렉토리에서 동일한 구조 확인

<br>

## 학습 체크리스트

- [ ] Linux Namespace 7가지의 역할을 각각 설명할 수 있다
- [ ] unshare 명령으로 PID/NET/MNT Namespace를 직접 생성할 수 있다
- [ ] ip netns로 네트워크 네임스페이스를 만들고 veth pair로 통신할 수 있다
- [ ] Cgroups v2에서 CPU/Memory 제한을 직접 설정할 수 있다
- [ ] Docker의 --cpus/--memory가 Cgroups의 어떤 파일과 매핑되는지 안다
- [ ] OverlayFS의 lowerdir/upperdir/merged/workdir 역할을 설명할 수 있다
- [ ] Copy-on-Write의 동작 방식을 설명할 수 있다
- [ ] Docker → containerd → runc 계층 구조를 설명할 수 있다
- [ ] OCI Runtime Spec의 역할을 설명할 수 있다
- [ ] containerd와 CRI-O의 차이를 설명할 수 있다
- [ ] runc로 Docker 없이 컨테이너를 실행할 수 있다
- [ ] "컨테이너 = Namespace + Cgroups + Union FS"를 구체적으로 설명할 수 있다

<br>

## 다음 주 예고

Week 3에서는 프로덕션 수준의 **Docker 이미지 빌드**를 학습합니다. Dockerfile 명령어 전체, Multi-stage Build를 통한 이미지 최적화, Volume/Bind Mount를 통한 데이터 영속성 관리, 그리고 Container Registry 활용법을 다룹니다.

<br>

## 참고 자료

- [Linux man pages - namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)
- [Linux Kernel Documentation - cgroups v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)
- [Docker 공식 문서 - OverlayFS storage driver](https://docs.docker.com/storage/storagedriver/overlayfs-driver/)
- [OCI Runtime Specification](https://github.com/opencontainers/runtime-spec)
- [OCI Image Specification](https://github.com/opencontainers/image-spec)
- [containerd 공식 문서](https://containerd.io/)
- [CRI-O 공식 문서](https://cri-o.io/)
- [runc GitHub](https://github.com/opencontainers/runc)
