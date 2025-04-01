---
layout: post
title: [개념] terraform module화
image: terraform.png
date: 2025-04-01 09:00:00 +0900
tags: [terraform, architecture]
categories: terraform
---
Terraform 모듈화는 인프라스트럭처 코드를 더 체계적이고 재사용 가능하게 만들기 위한 설계 패턴입니다. 이는 반복적인 코드를 줄이고, 유지보수성을 높이며, 일관된 인프라를 구성할 수 있도록 돕습니다.

## Terraform 모듈화란?

모듈(Module)은 관련된 Terraform 리소스들의 집합으로, 하나의 논리 단위로 묶여 별도로 관리되고 재사용될 수 있습니다. 마치 프로그래밍 언어의 함수처럼 동작하여, 입력값(variables)을 받아 출력값(outputs)을 제공합니다.

## 왜 Terraform 모듈화가 필요한가?

- **재사용성**: 동일한 인프라 구성을 여러 환경(dev, stage, prod)에서 재사용 가능
- **유지보수성**: 하나의 모듈만 수정하면 이를 사용하는 모든 곳에 변경사항 반영
- **구조화**: 코드베이스를 기능별로 분리하여 가독성과 관리성 향상
- **협업 효율성**: 팀 단위로 역할을 나누어 개발 가능

## 구성 방법

1. **루트 모듈(Root Module)**: Terraform 명령어를 실행하는 최상위 디렉토리
2. **서브 모듈(Submodule)**: 별도의 디렉토리에서 정의된 모듈로, `module` 블록을 통해 호출

예시 디렉토리 구조:
```
.
├── main.tf
└── modules/
    └── vnet/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

호출 방법:
```hcl
module "vnet" {
  source = "./modules/vnet"
  name   = "example-vnet"
  cidr   = "10.0.0.0/16"
}
```

## 환경별(dev, stage, prod) 구성 예시

Terraform 모듈은 환경별로 디렉토리를 나누어 각 환경에서 동일한 모듈을 다르게 구성할 수 있습니다. 이 방식은 환경 간 설정 차이는 유지하면서도 일관된 리소스를 쉽게 배포할 수 있게 합니다.

예시 디렉토리 구조:
```
.
├── envs/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   ├── stage/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       └── terraform.tfvars
└── modules/
    └── vnet/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### modules/vnet/variables.tf 예시:
```
variable "name" {
  description = "Virtual Network name"
  type        = string
}

variable "cidr" {
  description = "CIDR block for the Virtual Network"
  type        = string
}
```

환경별 main.tf 내용 예시 (`envs/dev/main.tf`):
```hcl
module "vnet" {
  source = "../../modules/vnet"
  name   = var.name
  cidr   = var.cidr
}
```

환경별 변수 파일 (`envs/dev/terraform.tfvars`):
```hcl
name = "dev-vnet"
cidr = "10.0.0.0/16"
```

이런 구조를 사용하면 환경별로 모듈을 독립적으로 관리하면서도, 공통된 구조와 로직은 유지할 수 있어 코드의 일관성과 유지보수성을 높일 수 있습니다.

## tfvars 파일이란?

`terraform.tfvars` 파일은 Terraform에서 변수 값을 정의하는 파일로, `variables.tf` 파일에 선언된 변수들에 실제 값을 할당하는 데 사용됩니다. 이를 통해 코드와 설정 값을 분리하여 환경에 따라 유연하게 구성을 변경할 수 있습니다.

예시:
**variables.tf**
```hcl
variable "name" {}
variable "cidr" {}
```

**terraform.tfvars**
```hcl
name = "dev-vnet"
cidr = "10.0.0.0/16"
```

**main.tf**
```hcl
module "vnet" {
  source = "../../modules/vnet"
  name   = var.name
  cidr   = var.cidr
}
```

### tfvars 파일의 장점

- **환경별 구성 분리**: dev, stage, prod 등 환경에 따라 서로 다른 값을 적용할 수 있음
- **자동 로드**: `terraform.tfvars` 또는 `*.auto.tfvars` 파일은 명시적 지정 없이 자동으로 로드됨
- **명확한 설정 관리**: 코드와 설정 값이 분리되어 가독성과 관리성이 높아짐

### 여러 환경 구성 시 활용

파일 이름을 환경별로 나누어 사용하는 것도 일반적입니다:
- `dev.tfvars`
- `stage.tfvars`
- `prod.tfvars`

이 경우 Terraform 명령 실행 시 명시적으로 파일을 지정해야 합니다:
```bash
terraform apply -var-file="dev.tfvars"
```

이처럼 tfvars 파일을 활용하면 모듈은 그대로 유지하면서도 각 환경에 맞는 설정을 쉽게 주입할 수 있어 인프라 관리가 효율적이고 일관성 있게 됩니다.

필요에 따라 location, tags, subnet 목록 등의 값을 추가 변수로 받아 모듈을 더욱 확장할 수 있습니다.

예:
```hcl
variable "location" {
  description = "Azure region"
  type        = string
  default     = "koreacentral"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
```

## 마무리

Terraform 모듈화는 인프라 자동화의 확장성과 효율성을 높이는 핵심적인 기법입니다. 이를 통해 안정적이고 일관된 인프라 운영이 가능해집니다.