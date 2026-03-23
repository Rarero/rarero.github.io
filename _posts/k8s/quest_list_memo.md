**NKS와 GKE**

[As-Is 현황(GKE)에 대한 질문 List]

1. GKE 관리 모드 현황 (Autopilot인지, Standard인지)

**	**- 확인 사유1: Autopilot의 경우 사전 구성에 따라 GKS에 종속적인 Agent 및 관리형 서비스들이 다수 배포. 해당 서비스들의 종속성 확인

**	**- 확인 사유2: Autopliot의 경우 Fleet이 자동 구성되어있으며, 외부 Cluster와의 연동 여부 확인

**	**- 확인 사유3: Standard의 경우 개인 구성으로 어떻게 진행이 되어있는지. (Custom한 영역의 설정들이 많은 경우 해당 방법들은 모두 확인을 필요로 함. ex. network plugin=clium인 경우 등)

**	**- 확인 사유4: 비용 최적화관련 확인. Autopilot 모드에서는 실행 중인 포드에서 요청하는 컴퓨팅 리소스에 대한 요금만 부과 // GKE Standard 모드에서는 포드 요청에 관계없이 노드의 모든 리소스에 대한 요금이 청구

**	**- 확인 사유5: 관리 영역 확인: Autopliot의 경우 컨트롤 플레인, 노드, 모든 시스템 구성요소를 관리. Standard의 경우 GKE는 사용자가 노드를 직접 관리

**	**- 확인 방법: GCP Console에서 gke에 대한 모드 확인

1. GKE의 클러스터 및 노드 업그레이드 방안 확인

**	**- 확인 사유1: GKE에서 제공되는 '출시채널' 방식 사용하는지 또는 GKE에 탑재된 서비스의 검증을 위한 별도의 방식을 사용하는지 // 추가로 장기지원은 연장채널이라는 서비스로 존재

**	**- 확인 사유2: NKS의 버전과 문제없이 호환이 가능한지 확인

1. GKE의 상태 데이터베이스 관리 상황.

**	**-**  **상태관리에 대해서 어떻게 진행되고 있는지 / etcd api나 spanner에 key-value 형태로 저장.** **

1. Artifact Registry(구 Container Registry.25년 종료)의 사용 여부와 사용 중인 기능 확인

**	**- 이미지 저장 및 관리 방안에 대한 확인 필요

**	**- 지원 기능 중 로깅, 조직 정책 적용, 취약점 분석, image pull에 대한 cache 지원 여부 등 NKS에서 지원 여부 확인 필요

**	**- 전체 이미지에 대해서 백업 필요 유무 확인

**	**- 구 버전의 경우 지원하지 않는 기능들 다수 확인(cloud run 소스 배포, 이미지 스트리밍, 캐싱 등). 구 버전인지 아닌지 확인 필요

1. ㅁ

[GKE to NKS 마이그레이션시 주의점]

1. 상세 설정 확인

**	**- 확인 사유1: GKE는 최신 버전을 가장 빠르게 따라감. 하지만 NKS에서는 지원 버전이 제한적이고, 업데이트 속도가 느림 // 26.03.23 기준 동일한 메이저 버전으로 서비스 제공 확인

**	**	- 현재 버전표: GKE (1.32.12 / 1.33.08 / 1.34.4(default) / 1.35.1)**  **//**  **NKS (1.32.8 / 1.33.4 / 1.34.3(default))

**	**- 확인 사유2: CNI

**	**- CNI Plugin: GKE (

[내가 선행 확인 해야 하는 것들]

* GKE는 Connect Agent를 통해 외부 클러스터와 연결 가능. NKS에서는 대체가 가능한 서비스가 있는지 확인
* GKE는 Connect Gateway에 대한 내용이 서비스 전체에 대한 연결점을 가지고 pod가 구성. NKS에서 어떻게 구성되어있는지 확인
* GKE는 Google Cloud 통합 CI/CD 옵션(Cloud Build 및 Cloud Deploy 사용)이 존재. NKS에서도 유사한 서비스가 있는지 확인
* GKE에서 etcd api와 spanner를 통해 백업 관리가 되는지 확인
* GKE에서 Network CNI는 어떻게 구성되어있는가. // 지금 이해하기론 노드별로 구성이 가능하다는 점 + GCP에서 제공되는 default 값은 있지만** **
  * GKE Network: [https://docs.cloud.google.com/kubernetes-engine/docs/learn/learn-gke-net-fundamentals?hl=ko](https://docs.cloud.google.com/kubernetes-engine/docs/learn/learn-gke-net-fundamentals?hl=ko)
  * GKE CNI git: [https://github.com/containernetworking/cni](https://github.com/containernetworking/cni)
*
