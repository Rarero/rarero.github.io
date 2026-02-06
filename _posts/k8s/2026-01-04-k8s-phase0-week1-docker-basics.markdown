---
layout: post
title: "[k8s-phase0] Week 1. Docker & Container 기초 ⓪-①"
date: 2026-01-04 09:00:00 +0900
tags: [Docker, Container, Image, Dockerfile, Volume, Network]
categories: k8s
---

Kubernetes를 제대로 이해하려면 먼저 컨테이너 기술의 기초를 탄탄히 다져야 합니다. 이번 주에는 Docker가 왜 등장했고, 어떻게 IT 인프라의 패러다임을 바꿨는지부터 시작하여 실전 활용법까지 학습합니다.

<br>

## 학습 목표

- 전통적인 IT 환경의 문제점과 Docker의 등장 배경 이해
- 물리 서버 → 가상 머신 → 컨테이너로의 진화 과정
- Docker 이미지와 컨테이너의 개념
- Dockerfile 작성 및 이미지 빌드 프로세스
- Docker 네트워킹과 볼륨 관리
- Docker Compose로 멀티 컨테이너 애플리케이션 구성

<br>

## 1. Docker의 등장 배경

### 전통적인 IT 환경의 문제점

**1. 물리 서버 시대 (2000년대 초반)**

한 대의 물리 서버에 하나의 애플리케이션을 배포하던 시절입니다.

```
┌─────────────────────────────────┐
│        Physical Server          │
│  ┌───────────────────────────┐  │
│  │   Operating System        │  │
│  │   ┌─────────────────────┐ │  │
│  │   │   Application       │ │  │
│  │   └─────────────────────┘ │  │
│  └───────────────────────────┘  │
│        CPU, Memory, Disk        │
└─────────────────────────────────┘
```

**문제점:**
- 리소스 낭비: 서버 자원의 평균 10-15%만 사용
- 확장성 부족: 새 서버 구매 및 설치에 수주 소요
- 운영 비용: 서버실 공간, 전력, 냉각 비용
- 환경 불일치: "내 컴퓨터에서는 되는데요?" 문제

실제 사례를 들어보겠습니다.

2005년, 당신이 웹 서비스를 운영하는 회사의 개발자라고 가정해봅시다.
- 개발 환경: Windows 10, PHP 7.2, MySQL 5.7
- 테스트 서버: CentOS 7, PHP 7.0, MySQL 5.6
- 운영 서버: RHEL 6, PHP 5.6, MySQL 5.5

개발에서 완벽히 동작하던 코드가 운영 서버에서 오류를 일으킵니다. PHP 버전 차이로 인한 함수 호환성 문제였습니다. 이를 해결하려면 운영 서버의 PHP를 업그레이드해야 하는데, 다른 레거시 시스템에 영향을 줄 수 있어 불가능합니다.

**2. 가상 머신 시대 (2000년대 중후반)**

VMware, Hyper-V 등으로 한 대의 물리 서버에 여러 가상 머신을 실행할 수 있게 되었습니다.

```
┌──────────────────────────────────────────────────┐
│            Physical Server                       │
│  ┌────────────────────────────────────────────┐  │
│  │         Hypervisor (ESXi, KVM)             │  │
│  ├──────────┬──────────┬──────────┬──────────┤  │
│  │   VM 1   │   VM 2   │   VM 3   │   VM 4   │  │
│  │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │  │
│  │ │Guest │ │ │Guest │ │ │Guest │ │ │Guest │ │  │
│  │ │  OS  │ │ │  OS  │ │ │  OS  │ │ │  OS  │ │  │
│  │ ├──────┤ │ ├──────┤ │ ├──────┤ │ ├──────┤ │  │
│  │ │ App  │ │ │ App  │ │ │ App  │ │ │ App  │ │  │
│  │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │  │
│  └──────────┴──────────┴──────────┴──────────┘  │
│              CPU, Memory, Disk                   │
└──────────────────────────────────────────────────┘
```

**개선점:**
- 리소스 활용률 향상: 하나의 물리 서버에 여러 VM
- 격리: 각 VM은 독립적인 환경
- 스냅샷: 특정 시점으로 복원 가능

**여전한 문제점:**
- 무거움: 각 VM마다 전체 OS 필요 (수 GB)
- 느린 시작: VM 부팅에 수 분 소요
- 리소스 오버헤드: Guest OS가 메모리 1-2GB 점유
- 이식성 부족: VM 이미지 이동이 느리고 복잡

실제 시나리오:
- 개발자가 로컬에서 Ubuntu VM 생성 (10분 소요, 4GB 메모리 할당)
- VM에 웹 서버 설치 및 설정 (30분)
- 같은 환경을 테스트 서버에 복제하려면 VM 이미지 전송 (수십 GB, 수 시간)
- 마이크로서비스 10개를 띄우려면 VM 10개 필요 (40GB 메모리 소모)

### Docker의 등장 (2013년)

Solomon Hykes가 PyCon에서 Docker를 발표했을 때, 그는 이렇게 말했습니다:
"Build once, run anywhere" (한 번 빌드하면 어디서든 실행)

**컨테이너 개념:**
```
┌──────────────────────────────────────────────────┐
│            Physical Server / VM                  │
│  ┌────────────────────────────────────────────┐  │
│  │         Host Operating System              │  │
│  ├────────────────────────────────────────────┤  │
│  │         Docker Engine                      │  │
│  ├────────┬────────┬────────┬────────┬────────┤  │
│  │ Cont 1 │ Cont 2 │ Cont 3 │ Cont 4 │ Cont 5 │  │
│  │ ┌────┐ │ ┌────┐ │ ┌────┐ │ ┌────┐ │ ┌────┐ │  │
│  │ │App │ │ │App │ │ │App │ │ │App │ │ │App │ │  │
│  │ │Libs│ │ │Libs│ │ │Libs│ │ │Libs│ │ │Libs│ │  │
│  │ └────┘ │ └────┘ │ └────┘ │ └────┘ │ └────┘ │  │
│  └────────┴────────┴────────┴────────┴────────┘  │
│              CPU, Memory, Disk                   │
└──────────────────────────────────────────────────┘
```

**핵심 차이:**
- OS 공유: 모든 컨테이너가 호스트 OS 커널 공유
- 경량: 컨테이너 이미지는 수십 MB (vs VM 수 GB)
- 빠른 시작: 수 초 이내 (vs VM 수 분)
- 이식성: 이미지 하나로 어디서든 동일하게 실행

### Docker가 가져온 변화

**1. 개발 환경 표준화**

기존:
```
개발자 A: Mac + PHP 7.2 + MySQL 5.7
개발자 B: Windows + PHP 7.4 + PostgreSQL 12
운영 서버: Linux + PHP 7.0 + MySQL 5.6
→ 환경 차이로 인한 버그 발생
```

Docker 사용 후:
```
Dockerfile:
FROM php:7.2-apache
RUN docker-php-ext-install mysqli
COPY . /var/www/html

→ 모든 환경에서 동일한 이미지 사용
```

**2. 마이크로서비스 아키텍처 가능**

기존 모놀리식:
```
┌────────────────────────────┐
│    거대한 단일 애플리케이션   │
│  - User Management         │
│  - Order Processing        │
│  - Payment                 │
│  - Inventory               │
└────────────────────────────┘
→ 하나 수정하면 전체 재배포
```

Docker 기반 마이크로서비스:
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  User   │ │  Order  │ │ Payment │ │Inventory│
│ Service │ │ Service │ │ Service │ │ Service │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
→ 각 서비스 독립적으로 배포 및 확장
```

**3. CI/CD 파이프라인 혁신**

기존:
```
1. 코드 커밋
2. 빌드 서버에서 컴파일
3. 테스트 서버에 수동 배포
4. QA 테스트
5. 운영 서버에 수동 배포 (새벽 작업)
→ 배포 주기: 월 1회
```

Docker 기반:
```
1. 코드 커밋
2. Docker 이미지 빌드 (자동)
3. 이미지로 테스트 실행 (자동)
4. 이미지를 레지스트리에 푸시 (자동)
5. 운영 환경에 이미지 배포 (자동, 롤백 가능)
→ 배포 주기: 일 수십 회
```

**4. 인프라 비용 절감**

실제 사례: Netflix
- 기존: VM 기반, 수천 대의 서버
- Docker 도입 후: 동일 워크로드를 30% 적은 서버로 처리
- 결과: 연간 수백만 달러 절감

<br>

## 2. 컨테이너의 핵심 개념

## 2. 컨테이너의 핵심 개념

### 이미지 vs 컨테이너

이 둘의 관계를 이해하는 것이 Docker의 핵심입니다.

**비유:**
- 이미지 = 붕어빵 틀
- 컨테이너 = 틀로 만든 붕어빵

하나의 틀(이미지)로 여러 개의 붕어빵(컨테이너)을 만들 수 있습니다.

## 3. Docker의 동작 원리

### docker run 명령어가 실행될 때 무슨 일이 일어나는가?

```bash
docker run -d --name my-web -p 8080:80 nginx:latest
```

이 한 줄의 명령어 뒤에서 일어나는 일들:

**1단계: 이미지 확인**
```
Docker Client → Docker Daemon: "nginx:latest 이미지 있어?"
Docker Daemon → Local Image Store: 검색
→ 없으면 Docker Hub에서 다운로드
→ 있으면 다음 단계
```

**2단계: 이미지 Pull (필요 시)**
```
Docker Hub에서 레이어별로 다운로드:
[=====>    ] Layer 1/5 (77MB)
[=========>] Layer 2/5 (54MB) 완료
[=====>    ] Layer 3/5 (67MB)
```

**3단계: 컨테이너 생성**
```
1. 새로운 쓰기 가능 레이어 생성
2. 네트워크 설정 (포트 8080 → 80 매핑)
3. 파일시스템 마운트
4. 이름 할당 (my-web)
```

**4단계: 컨테이너 시작**
```
1. Linux Namespace 생성 (격리 환경)
2. Cgroups 설정 (리소스 제한)
3. nginx 프로세스 실행
4. 백그라운드로 실행 (-d 옵션)
```

실제로 확인해보기:

```bash
# 이미지 다운로드 과정 보기
docker pull nginx:latest
# latest: Pulling from library/nginx
# a1b2c3d4e5f6: Pull complete
# d7e8f9a0b1c2: Pull complete
# ...

# 컨테이너 상세 정보
docker inspect my-web

# 실제 프로세스 확인
docker top my-web
# PID    USER   COMMAND
# 1234   root   nginx: master process
# 5678   101    nginx: worker process
```

### Docker의 구성 요소

Docker는 클라이언트-서버 아키텍처입니다:

```
┌──────────────────────────────────────────────┐
│  Docker Client (CLI)                         │
│  $ docker run, docker build, docker push     │
└────────────────┬─────────────────────────────┘
                 │ REST API
                 ▼
┌──────────────────────────────────────────────┐
│  Docker Daemon (dockerd)                     │
│  - 이미지 관리                                │
│  - 컨테이너 생명주기 관리                      │
│  - 네트워크 관리                              │
│  - 볼륨 관리                                  │
└────────────────┬─────────────────────────────┘
                 │
     ┌───────────┴───────────┬──────────────┐
     ▼                       ▼              ▼
┌─────────┐           ┌──────────┐    ┌─────────┐
│ Images  │           │Containers│    │Volumes  │
└─────────┘           └──────────┘    └─────────┘
```

**Docker Client:**
- 사용자가 입력하는 명령어 (docker run, docker build 등)
- Daemon에 요청을 보냄

**Docker Daemon:**
- 백그라운드에서 실행되는 서비스
- 실제 작업을 수행

**Docker Registry (Docker Hub):**
- 이미지 저장소
- Public: hub.docker.com
- Private: 회사 내부 레지스트리

### 이미지의 이식성 - docker save/load

Docker의 가장 강력한 장점 중 하나는 이미지의 완벽한 이식성입니다. 네트워크가 없는 환경이나 레지스트리 접근이 불가능한 상황에서도 이미지를 파일로 저장하고 다른 시스템에 옮길 수 있습니다.

**실제 시나리오:**

회사에서 개발 서버는 인터넷이 되지만, 운영 서버는 보안 정책상 외부 네트워크가 차단되어 있습니다.

```
개발 서버 (인터넷 O)          운영 서버 (인터넷 X)
     │                              │
     │  Docker Hub에서             │  Docker Hub 접근 불가
     │  이미지 다운로드 가능         │
     │                              │
     └──> 어떻게 이미지 전달? <───────┘
```

**해결 방법: docker save와 docker load**

```bash
# 개발 서버에서 작업
# 1. 이미지 빌드 또는 다운로드
docker pull nginx:1.25
docker images
# REPOSITORY   TAG    IMAGE ID       SIZE
# nginx        1.25   abc123...      140MB

# 2. 이미지를 tar 파일로 저장
docker save nginx:1.25 -o nginx-1.25.tar
ls -lh nginx-1.25.tar
# -rw-r--r-- 1 user user 140M Feb 6 10:00 nginx-1.25.tar

# 3. tar 파일을 USB나 내부 네트워크로 운영 서버에 전송
scp nginx-1.25.tar production-server:/tmp/

# 운영 서버에서 작업
# 4. tar 파일에서 이미지 로드
docker load -i /tmp/nginx-1.25.tar
# Loaded image: nginx:1.25

# 5. 이미지 확인
docker images
# REPOSITORY   TAG    IMAGE ID       SIZE
# nginx        1.25   abc123...      140MB

# 6. 바로 실행 가능
docker run -d -p 80:80 nginx:1.25
```

**여러 이미지를 한 번에 전달:**

```bash
# 개발 서버에서 전체 스택 이미지 저장
docker save nginx:1.25 postgres:15 redis:7 -o my-app-stack.tar

# 파일 크기 확인
ls -lh my-app-stack.tar
# -rw-r--r-- 1 user user 520M Feb 6 10:00 my-app-stack.tar

# 운영 서버에서 로드
docker load -i my-app-stack.tar
# Loaded image: nginx:1.25
# Loaded image: postgres:15
# Loaded image: redis:7
```

**압축하여 전송 용량 줄이기:**

```bash
# gzip으로 압축하며 저장
docker save nginx:1.25 | gzip > nginx-1.25.tar.gz
ls -lh nginx-1.25.tar.gz
# -rw-r--r-- 1 user user 52M Feb 6 10:00 nginx-1.25.tar.gz
# → 원본 140MB에서 52MB로 63% 감소!

# 압축 해제하며 로드
gunzip -c nginx-1.25.tar.gz | docker load
```

**실전 활용 사례:**

1. **폐쇄망 배포**
   - 국방, 금융 등 보안이 중요한 환경
   - 외부 네트워크 차단된 시스템에 배포

2. **백업 및 아카이브**
   - 특정 버전 이미지 백업
   - 규정 준수를 위한 이미지 보관

3. **엣지 디바이스 배포**
   - IoT 디바이스에 사전 빌드된 이미지 전송
   - 네트워크 대역폭 제한된 환경

4. **재현 가능한 환경**
   - 고객사에 동일한 환경 제공
   - 버그 재현을 위한 정확한 환경 복제

**docker save vs docker export 차이:**

```bash
# docker save: 이미지 저장 (레이어 구조 유지)
docker save nginx:1.25 -o nginx-image.tar
# → 모든 레이어 히스토리 보존
# → docker load로 복원

# docker export: 컨테이너 파일시스템만 저장
docker run -d --name temp nginx:1.25
docker export temp -o nginx-container.tar
# → 단순 파일시스템만 (레이어 정보 손실)
# → docker import로 복원 (새 이미지 생성)

# 차이점 비교
docker load -i nginx-image.tar
docker images nginx:1.25
# REPOSITORY   TAG    IMAGE ID    CREATED
# nginx        1.25   abc123...   2 weeks ago  ← 원본 메타데이터 유지

cat nginx-container.tar | docker import - nginx:custom
docker images nginx:custom
# REPOSITORY   TAG      IMAGE ID    CREATED
# nginx        custom   xyz789...   Just now    ← 새로 생성된 것처럼 보임
```

**권장 사항:**
- 배포 목적: `docker save` 사용 (완전한 재현성)
- 단순 백업: `docker save` 사용
- 커스텀 베이스 이미지 생성: `docker export` 후 `import` 고려

이제 Docker 이미지를 파일로 저장하고, USB나 내부 네트워크를 통해 어디든 옮겨서 실행할 수 있습니다. 이것이 바로 "Build once, run anywhere"의 진정한 의미입니다.

<br>

### 컨테이너 생명주기

컨테이너는 여러 상태를 거칩니다:

```
                docker run
     Created ──────────────> Running
        │                       │
        │                       │ docker stop
        │                       ▼
        │                    Stopped
        │                       │
        │                       │ docker start
        │                       │
        └───────────────────────┘
                                │
                                │ docker rm
                                ▼
                             Removed
```

실습:

```bash
# 컨테이너 생성 및 시작
docker run -d --name lifecycle-test nginx
# 상태: Running

# 컨테이너 일시 정지
docker pause lifecycle-test
# 상태: Paused (프로세스 freeze)

# 재개
docker unpause lifecycle-test
# 상태: Running

# 중지 (프로세스 종료)
docker stop lifecycle-test
# 상태: Stopped

# 재시작
docker start lifecycle-test
# 상태: Running

# 강제 종료
docker kill lifecycle-test
# 상태: Stopped

# 삭제
docker rm lifecycle-test
# 상태: Removed
```

상태 전환 시 내부에서 일어나는 일:

**docker stop:**
```
1. SIGTERM 신호 전송 (프로세스에게 "정리하고 종료해" 요청)
2. 10초 대기 (graceful shutdown)
3. 여전히 실행 중이면 SIGKILL 전송 (강제 종료)
```

**docker pause:**
```
1. Cgroups freezer 사용
2. 프로세스 실행 중단 (메모리 상태 유지)
3. CPU 사용 0%
```

<br>

## 4. 실전 Docker 사용법

```bash
# 이미지 확인 (설계도 목록)
docker images
# REPOSITORY    TAG       IMAGE ID       SIZE
# nginx         latest    a1b2c3d4e5f6   140MB

# 같은 이미지로 여러 컨테이너 실행
docker run -d --name web1 -p 8001:80 nginx
docker run -d --name web2 -p 8002:80 nginx
docker run -d --name web3 -p 8003:80 nginx

# 컨테이너 확인 (실행 중인 인스턴스)
docker ps
# CONTAINER ID   IMAGE   COMMAND   PORTS
# a1a1a1a1a1a1   nginx   ...       0.0.0.0:8001->80/tcp
# b2b2b2b2b2b2   nginx   ...       0.0.0.0:8002->80/tcp
# c3c3c3c3c3c3   nginx   ...       0.0.0.0:8003->80/tcp
```

**이미지의 특징:**
- 읽기 전용 (Read-Only)
- 레이어로 구성 (Layer-based)
- 불변 (Immutable): 한 번 만들면 변경 불가
- 공유 가능: Docker Hub, 회사 내부 레지스트리

**컨테이너의 특징:**
- 읽기-쓰기 가능 (Read-Write)
- 이미지 위에 쓰기 가능 레이어 추가
- 휘발성: 삭제하면 변경사항 소실
- 격리된 실행 환경

### 왜 레이어 구조인가?

이미지가 레이어로 구성된 이유를 이해하려면 실제 상황을 봐야 합니다.

**레이어 없이 이미지를 만든다면:**

```
이미지 A: Ubuntu + Java + Tomcat (1.5GB)
이미지 B: Ubuntu + Java + Spring Boot (1.4GB)
이미지 C: Ubuntu + Python + Flask (1.2GB)

→ 총 4.1GB 저장 공간 필요
→ 각 이미지를 네트워크로 전송 시 4.1GB 다운로드
```

**레이어 구조를 사용하면:**

```
Layer 1: Ubuntu (500MB)       ← 모든 이미지가 공유
Layer 2: Java (300MB)         ← A, B가 공유
Layer 3: Tomcat (700MB)       ← A만 사용
Layer 3: Spring Boot (600MB)  ← B만 사용
Layer 2: Python (200MB)       ← C만 사용
Layer 3: Flask (500MB)        ← C만 사용

→ 총 2.8GB 저장 공간 (32% 절감)
→ 첫 번째 이미지만 전부 다운로드, 나머지는 차분만
```

실제 예시로 확인:

```bash
# nginx 이미지 레이어 확인
docker history nginx:latest

# IMAGE          CREATED       SIZE
# abc123...      2 weeks ago   67MB    ← nginx 설정
# def456...      2 weeks ago   0B      ← EXPOSE 80
# ghi789...      2 weeks ago   54MB    ← nginx 바이너리
# jkl012...      3 weeks ago   0B      ← WORKDIR /
# mno345...      3 weeks ago   77MB    ← 기본 패키지들
# pqr678...      3 weeks ago   0B      ← 환경 변수
```

각 레이어는 변경사항만 저장합니다:
- Layer 1: 기본 OS 파일들
- Layer 2: apt-get update 결과
- Layer 3: nginx 설치 파일
- Layer 4: nginx 설정 파일

<br>

## 3. Docker의 동작 원리로 운송
- 배, 트럭, 기차에 모두 실을 수 있음
- 안의 내용물은 격리되어 보호됨

**소프트웨어 컨테이너:**
- 표준화된 형식 (OCI 표준)
- 애플리케이션과 무관하게 동일한 방식으로 실행
- 개발 PC, 테스트 서버, 운영 서버에 모두 배포 가능
- 애플리케이션은 격리되어 다른 프로세스에 영향 없음

### 컨테이너 vs 프로세스 vs VM

일반 프로세스를 실행할 때:
```bash
# 그냥 Python 실행
python app.py
→ 호스트의 Python 버전에 의존
→ 호스트의 라이브러리에 의존
→ 다른 프로세스와 리소스 공유
```

컨테이너로 실행할 때:
```bash
# Docker로 실행
docker run -d python:3.9 python app.py
→ Python 3.9 보장
→ 필요한 모든 라이브러리 포함
→ 격리된 환경에서 실행
```

비교표:

| 특징 | 일반 프로세스 | 컨테이너 | VM |
|------|-------------|---------|-----|
| 격리 수준 | 낮음 | 중간 | 높음 |
| 시작 시간 | 즉시 | 1-2초 | 수 분 |
| 메모리 사용 | 최소 | 수십 MB | 수 GB |
| 이식성 | 낮음 | 높음 | 중간 |
| OS 공유 | Yes | Yes | No |
| 보안 격리 | 약함 | 중간 | 강함 |

### 이미지 vs 컨테이너

**이미지 (Image)**
- 컨테이너를 실행하기 위한 읽기 전용 템플릿
- 레이어 구조로 구성 (각 레이어는 변경사항을 담음)
- Dockerfile에 정의된 명령어를 순차 실행하여 생성

**컨테이너 (Container)**
- 이미지를 실행한 인스턴스
- 격리된 프로세스 환경
- 쓰기 가능한 최상위 레이어 추가

```bash
# 이미지 확인
docker images

# 컨테이너 실행
docker run -d --name my-nginx nginx:latest

# 실행 중인 컨테이너 확인
docker ps

# 모든 컨테이너 확인 (중지된 것 포함)
docker ps -a
```

<br>

## 2. Dockerfile 작성

### 기본 구조

```dockerfile
# 베이스 이미지 지정
FROM ubuntu:22.04

# 메타데이터
LABEL maintainer="your-email@example.com"
LABEL description="Example Dockerfile"

# 환경 변수 설정
ENV APP_HOME=/app \
    NODE_ENV=production

# 작업 디렉토리 설정
WORKDIR $APP_HOME

# 패키지 설치
RUN apt-get update && \
    apt-get install -y curl vim && \
    rm -rf /var/lib/apt/lists/*

# 파일 복사
COPY package.json .
COPY src/ ./src/

# 포트 노출
EXPOSE 8080

# 컨테이너 시작 시 실행할 명령어
CMD ["node", "src/app.js"]
```

### Dockerfile 최적화 팁

1. **레이어 캐싱 활용**
   - 자주 변경되지 않는 명령어를 먼저 배치
   - COPY package.json을 먼저 하고 npm install 실행

2. **.dockerignore 사용**
   ```
   node_modules
   npm-debug.log
   .git
   .env
   ```

3. **멀티 스테이지 빌드**
   ```dockerfile
   # 빌드 스테이지
   FROM node:18 AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   # 실행 스테이지
   FROM node:18-alpine
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   COPY package*.json ./
   RUN npm install --only=production
   CMD ["node", "dist/app.js"]
   ```

<br>

## 3. Docker 네트워킹

### 네트워크 모드

**1. Bridge (기본 모드)**
```bash
# 네트워크 생성
docker network create my-bridge

# 컨테이너 실행 시 네트워크 지정
docker run -d --name web --network my-bridge nginx
docker run -d --name api --network my-bridge node:18

# 같은 네트워크 내에서 컨테이너 이름으로 통신 가능
# web 컨테이너에서 http://api:3000 접근 가능
```

**2. Host 모드**
```bash
# 호스트의 네트워크를 직접 사용
docker run -d --network host nginx

# 포트 매핑 불필요 (nginx가 호스트의 80 포트 직접 사용)
```

**3. None 모드**
```bash
# 네트워크 없이 실행 (완전 격리)
docker run -d --network none alpine sleep 3600
```

### 포트 포워딩

```bash
# 호스트 8080 → 컨테이너 80
docker run -d -p 8080:80 nginx

# 모든 인터페이스에서 접근 가능
docker run -d -p 0.0.0.0:8080:80 nginx

# localhost에서만 접근 가능
docker run -d -p 127.0.0.1:8080:80 nginx
```

<br>

## 4. Docker 볼륨 관리

### 볼륨 타입

**1. Named Volume (권장)**
```bash
# 볼륨 생성
docker volume create my-data

# 볼륨 사용
docker run -d -v my-data:/app/data nginx

# 볼륨 확인
docker volume ls
docker volume inspect my-data
```

**2. Bind Mount**
```bash
# 호스트의 특정 디렉토리를 마운트
docker run -d -v /host/path:/container/path nginx

# 현재 디렉토리 마운트
docker run -d -v $(pwd):/app node:18
```

**3. tmpfs (메모리 기반, 휘발성)**
```bash
docker run -d --tmpfs /tmp nginx
```

### 볼륨 백업 및 복원

```bash
# 백업
docker run --rm -v my-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/data-backup.tar.gz -C /data .

# 복원
docker run --rm -v my-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/data-backup.tar.gz -C /data
```

<br>

## 5. Docker Compose

### docker-compose.yml 작성

```yaml
version: '3.8'

services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    networks:
      - frontend
    depends_on:
      - api

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DB_HOST=db
    networks:
      - frontend
      - backend
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend

networks:
  frontend:
  backend:

volumes:
  db-data:
```

### Compose 명령어

```bash
# 서비스 시작 (백그라운드)
docker-compose up -d

# 로그 확인
docker-compose logs -f api

# 서비스 중지
docker-compose stop

# 서비스 삭제 (볼륨 유지)
docker-compose down

# 서비스 삭제 (볼륨도 삭제)
docker-compose down -v

# 특정 서비스만 재시작
docker-compose restart api
```

<br>

## 실습 과제

### 과제 1: 간단한 웹 애플리케이션 컨테이너화

Node.js Express 애플리케이션을 Docker 이미지로 빌드하고 실행하세요.

**app.js**
```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Docker!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**Dockerfile 작성 요구사항:**
- Node.js 18 alpine 이미지 사용
- 멀티 스테이지 빌드 적용
- 최종 이미지 크기 최소화
- 포트 3000 노출

### 과제 2: 멀티 컨테이너 애플리케이션

Docker Compose를 사용하여 다음 구조를 구현하세요:
- Nginx (리버스 프록시)
- Node.js API 서버 2개 (로드 밸런싱)
- Redis (세션 저장소)
- PostgreSQL (데이터베이스)

**요구사항:**
- Nginx가 API 서버로 요청 분산
- API 서버는 Redis에 세션 저장
- 데이터는 Named Volume에 영속화
- 네트워크 분리 (frontend, backend)

### 과제 3: 볼륨을 이용한 데이터 공유

두 개의 컨테이너가 같은 볼륨을 공유하여:
- Container A: 1초마다 현재 시간을 파일에 기록
- Container B: 파일을 실시간으로 읽어서 출력

<br>

## 다음 주 예고

Week 2에서는 컨테이너 격리 기술의 핵심인 Linux Namespace와 Cgroups를 직접 다뤄보고, containerd/CRI-O 같은 Container Runtime의 동작 원리를 분석합니다.

<br>

## 참고 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Play with Docker](https://labs.play-with-docker.com/) - 무료 실습 환경
