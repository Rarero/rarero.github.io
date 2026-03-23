GKE랑 NKS에 대한 문서를 각각 하나씩 만들려고해. 우선 GKE부터 만들거야.

내가 지금 주는 내용들을 활용해서 GKE에 대한 문서를 잘 만들어줘. 팀 내부 공유용으로 쓸거야.

1. GKE개요(https://docs.cloud.google.com/kubernetes-engine/docs/concepts/kubernetes-engine-overview?hl=ko)
   : GKE에 대한 간략한 설명들.
   : GKE를 사용해야하는 경우와 이점들
   : GKE의 클러스터 및 노드 업그레이드를 관리하기 위한 '출시 채널(https://docs.cloud.google.com/kubernetes-engine/docs/concepts/release-channels?hl=ko)' 기능
   : Fleet기반의 팀관리 (https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs?hl=ko)
   : Connect Gateway (https://docs.cloud.google.com/kubernetes-engine/enterprise/multicluster-management/gateway?hl=ko)
   : Fleet에서 연계된 개념.Connect Agent란(https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs/connect-agent?hl=ko) // Fleet은 클러스터 관리형의 서비스이고, Connect Agent는 외부 클러스터를 통합관리하기 위해서 사용. 감사로깅
   : GKE의 Google Cloud 통합 CI/CD 옵션(Cloud Build 및 Cloud Deploy 사용)
   : GKE 아키텍처(https://docs.cloud.google.com/kubernetes-engine/docs/concepts/cluster-architecture?hl=ko)의 사진 첨부 // GKE의 etcd의 api 호출에 대한 내용 정리| : 이미지 저장소의 변경 구 이미지 저장소 Container Registry(gcr.io // 25.03 종료)와 신규 이미지 저장소 Artifact Registry(pkg.dev)의 기능 차이 |
   | :------------------------------------------------------------------------------------------------------------------------------------------: |
