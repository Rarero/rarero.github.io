---
layout: post
title: "Azure Function App을 활용한 비용 알림 자동화 실전 가이드"
image: azure-cost-bot.png
date: 2025-06-23 11:30:00 +0900
tags: [azure, function-app, automation, cost]
categories: azure
---

## 1. Azure Function App 개요

Azure Function App은 서버리스(Serverless) 환경에서 이벤트 기반으로 코드를 실행할 수 있는 Azure의 대표적인 FaaS(Function as a Service) 서비스입니다. 트리거(HTTP, Timer 등) 기반으로 자동 실행되며, 인프라 관리 부담 없이 확장성과 비용 효율성을 제공합니다.

## 2. 비용 알림 자동화 시나리오

Azure Cost Management API와 Dooray Webhook을 연동하여, 구독별 비용을 정기적으로 집계하고 팀 메신저로 자동 알림을 전송하는 자동화 시스템을 구축합니다. (월~금 오전 9시 비용 알림, 오전 8:50/8:55 Hello World 알림)

## 3. Function App 생성 및 환경설정
- Azure Portal, Azure CLI, VS Code(Functions Extension)로 Python v2 Function App 생성
- `function_app.py`에 모든 트리거(비용, 헬로월드, HTTP) 통합 구현
- `requirements.txt`, `host.json` 등 기본 파일 구조 준비
- 환경 변수 등록: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SUBSCRIPTION_ID`, `DOORAY_WEBHOOK_URL`

## 4. Hello World 테스트 코드 (Timer Trigger)
```python
@app.function_name(name="Awake_HelloWorld")
@app.schedule(
    schedule="0 50,55 23 * * 0-4",  # 매주 월~금 오전 8:50, 8:55 (KST, UTC 23:50, 23:55)
    arg_name="myTimer",
    run_on_startup=False,
    use_monitor=False
)
def timer_trigger1(myTimer: func.TimerRequest) -> None:
    if myTimer.past_due:
        logging.warning('The timer is past due!')
    KST = datetime.timezone(datetime.timedelta(hours=9))
    now_kst = datetime.datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')
    webhook_url = os.getenv("DOORAY_WEBHOOK_URL")
    payload = {"text": f"hello world. ({now_kst} KST)"}
    try:
        resp = requests.post(webhook_url, json=payload)
        resp.raise_for_status()
        logging.info(f"Sent message to Dooray (status {resp.status_code})")
    except Exception as e:
        logging.error(f"Failed to send message to Dooray: {e}")
```

## 5. 비용 알림 코드 및 Service Principal 인증
- Service Principal 환경 변수 기반 인증
- Cost Management API로 구독별 비용 집계
- Dooray Webhook으로 메시지 전송
```python
def get_azure_access_token() -> str:
    tenant_id = os.getenv("AZURE_TENANT_ID")
    client_id = os.getenv("AZURE_CLIENT_ID")
    client_secret = os.getenv("AZURE_CLIENT_SECRET")
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://management.azure.com/.default"
    }
    resp = requests.post(url, data=data)
    resp.raise_for_status()
    return resp.json()["access_token"]
# ...비용 집계 및 메시지 전송 전체 코드는 function_app.py 참고
```

## 6. 로컬 배포 및 테스트
- VS Code에서 `func host start`로 로컬 실행
- 환경 변수(.env) 또는 시스템 환경 변수로 설정
- Dooray 메시지 수신 및 로그 확인

## 7. 배포 센터 자동화 활용
- Azure Portal > Function App > 배포 센터에서 GitHub, Azure DevOps 등 연동
- 코드 변경 시 자동 배포 파이프라인 구성

## 8. Azure DevOps CI/CD 파이프라인 작성
- `azure-pipelines.yml`에서 Python 의존성 설치, 아카이브, 아티팩트 publish 단계 작성
```yaml
trigger:
- main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: UsePythonVersion@0
  inputs:
    versionSpec: '3.11'
- script: |
    python -m pip install --upgrade pip
    pip install -r requirements.txt --target=".python_packages/lib/site-packages"
  displayName: 'Install dependencies'
- task: ArchiveFiles@2
  inputs:
    rootFolderOrFile: '$(System.DefaultWorkingDirectory)'
    includeRootFolder: false
    archiveType: 'zip'
    archiveFile: '$(Build.ArtifactStagingDirectory)/functionapp.zip'
    replaceExistingArchive: true
  displayName: 'Create functionapp.zip'
- task: PublishBuildArtifacts@1
  inputs:
    pathToPublish: '$(Build.ArtifactStagingDirectory)'
    artifactName: 'drop'
  displayName: 'Publish artifact to pipeline'
```

## 9. 코드 테스트 및 실제 결과
- 실제 Dooray 메시지 수신 결과, Azure Portal 로그 스크린샷 등 첨부
- 비용 집계 메시지, Hello World 메시지 등 정상 동작 확인

---

> 전체 예제 코드는 Dooray_Cost_Function_App 레포의 function_app.py, azure-pipelines.yml 등에서 확인할 수 있습니다. 추가 문의는 댓글 또는 메일로 주세요.