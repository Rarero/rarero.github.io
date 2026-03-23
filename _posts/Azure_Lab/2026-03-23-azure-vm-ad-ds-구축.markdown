---
layout: post
title: "Azure VM에 Active Directory Domain Services(AD DS) 구축하기"
date: 2026-03-23 09:00:00 +0900
tags: [Study, Azure, VM, Active Directory, AD DS, Domain Controller, DNS, Windows Server, Identity, PowerShell]
categories: Azure_Lab
---

이번 포스트에서는 **Azure VM 위에 Active Directory Domain Services(AD DS)**를 구축하는 전 과정을 정리합니다. 온프레미스에서 운영하던 AD DS를 클라우드로 확장하거나, Azure 환경에서 새로운 도메인을 구축해야 하는 시나리오를 다루며, 아키텍처 설계부터 실제 구성, 검증, 그리고 운영 모범 사례까지 단계별로 살펴보겠습니다.

> **이 실습의 모든 Azure 리소스 생성은 PowerShell(Az 모듈)로 진행합니다.** VM 내부 설정(AD DS 역할 설치, DC 승격 등)도 PowerShell로 수행하므로, 전 과정이 **스크립트 기반 자동화**에 적합합니다.

> **참고:** Azure에는 관리형 서비스인 **Microsoft Entra Domain Services**(구 Azure AD DS)도 있습니다. 하지만 **그룹 정책(GPO) 세밀한 제어**, **스키마 확장**, **온프레미스 AD와의 트러스트 관계**, **특정 서버 역할(CA, ADFS 등) 설치**가 필요한 경우에는 **Azure VM 위에 직접 AD DS를 구축**해야 합니다.

<br>

---

# 1. 아키텍처 개요

## 1.1 Azure에서 AD DS를 운영하는 이유

| 시나리오 | 설명 |
|---|---|
| **하이브리드 ID 확장** | 온프레미스 AD를 Azure VNet으로 확장하여 Azure VM들이 기존 도메인에 가입 |
| **재해 복구(DR)** | 온프레미스 DC 장애 시 Azure DC가 인증 서비스를 계속 제공 |
| **Azure 전용 도메인** | 클라우드 전용 환경에서 새로운 포리스트/도메인을 구축 |
| **레거시 앱 지원** | Kerberos/NTLM 인증이 필요한 레거시 애플리케이션을 Azure에서 운영 |

## 1.2 목표 아키텍처

이 포스트에서 구축하는 아키텍처는 다음과 같습니다.

```
┌──────────────────────────────────────────────────────────────┐
│                     Azure VNet (10.0.0.0/16)                 │
│                                                              │
│  ┌─────────────────────────┐  ┌────────────────────────────┐ │
│  │  AD Subnet (10.0.1.0/24)│  │ Workload Subnet            │ │
│  │                         │  │ (10.0.2.0/24)              │ │
│  │  ┌──────────────────┐   │  │                            │ │
│  │  │  DC01 (VM)       │   │  │  ┌──────────────────────┐  │ │
│  │  │  10.0.1.4        │   │  │  │  Client VM           │  │ │
│  │  │  ─────────────── │   │  │  │  (도메인 가입 대상)     │  │ │
│  │  │  • AD DS         │   │  │  └──────────────────────┘  │ │
│  │  │  • DNS Server    │   │  │                            │ │
│  │  │  • GC            │   │  └────────────────────────────┘ │
│  │  └──────────────────┘   │                                 │
│  │                         │  VNet DNS 서버: 10.0.1.4        │
│  └─────────────────────────┘                                 │
└──────────────────────────────────────────────────────────────┘
```

**핵심 설계 포인트:**

| 항목 | 설계 내용 | 이유 |
|---|---|---|
| **전용 서브넷** | DC를 별도 서브넷에 배치 | NSG를 서브넷 단위로 적용하여 DC 보안 강화 |
| **정적 Private IP** | DC VM에 고정 IP 할당 | DNS 서버 주소가 변경되면 전체 도메인 서비스 장애 |
| **VNet DNS 설정** | VNet의 DNS를 DC IP로 변경 | 도메인 가입 시 DC를 찾으려면 DC의 DNS가 필요 |
| **데이터 디스크 분리** | AD DB를 별도 데이터 디스크에 저장 | OS 디스크의 캐싱 정책(Read/Write)이 AD DB 무결성에 영향 |

> 참고: [Microsoft Learn, "Deploy AD DS in an Azure virtual network"](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/identity/adds-extend-domain)


<br>

---

# 2. 사전 준비: Azure 인프라 구성

## 2.1 리소스 그룹 생성

모든 AD DS 관련 리소스를 하나의 리소스 그룹에서 관리합니다.

```powershell
# 변수 설정
$ResourceGroup = "rg-ad-lab"
$Location = "koreacentral"

# 리소스 그룹 생성
New-AzResourceGroup -Name $ResourceGroup -Location $Location
```

## 2.2 VNet 및 서브넷 생성

DC와 워크로드를 분리하는 서브넷 구조를 설계합니다.

```powershell
# 서브넷 구성 정의
$SubnetAD = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-ad" `
  -AddressPrefix "10.0.1.0/24"

$SubnetWorkload = New-AzVirtualNetworkSubnetConfig `
  -Name "snet-workload" `
  -AddressPrefix "10.0.2.0/24"

# VNet 생성 (서브넷 포함)
$VNet = New-AzVirtualNetwork `
  -ResourceGroupName $ResourceGroup `
  -Name "vnet-ad-lab" `
  -Location $Location `
  -AddressPrefix "10.0.0.0/16" `
  -Subnet $SubnetAD, $SubnetWorkload
```

## 2.3 NSG 생성 및 AD DS 포트 허용

AD DS가 정상적으로 동작하려면 다양한 포트가 필요합니다. 다음 표는 핵심 포트입니다.

| 포트 | 프로토콜 | 용도 |
|---|---|---|
| 53 | TCP/UDP | DNS |
| 88 | TCP/UDP | Kerberos 인증 |
| 135 | TCP | RPC Endpoint Mapper |
| 389 | TCP/UDP | LDAP |
| 445 | TCP | SMB (SYSVOL, NETLOGON 복제) |
| 636 | TCP | LDAPS (LDAP over SSL) |
| 3268-3269 | TCP | Global Catalog / GC SSL |
| 3389 | TCP | RDP (관리용) |
| 49152-65535 | TCP | RPC 동적 포트 |

```powershell
# NSG 생성
$Nsg = New-AzNetworkSecurityGroup `
  -ResourceGroupName $ResourceGroup `
  -Location $Location `
  -Name "nsg-ad"

# RDP 허용 (관리용 - IP 제한 권장)
$Nsg | Add-AzNetworkSecurityRuleConfig `
  -Name "Allow-RDP" `
  -Priority 1000 `
  -Direction Inbound `
  -Access Allow `
  -Protocol Tcp `
  -SourceAddressPrefix "<관리자-Public-IP>/32" `
  -SourcePortRange "*" `
  -DestinationAddressPrefix "*" `
  -DestinationPortRange 3389 | Set-AzNetworkSecurityGroup

# AD DS 핵심 포트 허용 (VNet 내부)
$Nsg | Add-AzNetworkSecurityRuleConfig `
  -Name "Allow-AD-Ports" `
  -Priority 1100 `
  -Direction Inbound `
  -Access Allow `
  -Protocol "*" `
  -SourceAddressPrefix "10.0.0.0/16" `
  -SourcePortRange "*" `
  -DestinationAddressPrefix "*" `
  -DestinationPortRange @(53, 88, 135, 389, 445, 636, 3268, 3269) | Set-AzNetworkSecurityGroup

# RPC 동적 포트 허용 (VNet 내부)
$Nsg | Add-AzNetworkSecurityRuleConfig `
  -Name "Allow-RPC-Dynamic" `
  -Priority 1200 `
  -Direction Inbound `
  -Access Allow `
  -Protocol Tcp `
  -SourceAddressPrefix "10.0.0.0/16" `
  -SourcePortRange "*" `
  -DestinationAddressPrefix "*" `
  -DestinationPortRange "49152-65535" | Set-AzNetworkSecurityGroup

# NSG를 AD 서브넷에 연결
$VNet = Get-AzVirtualNetwork -Name "vnet-ad-lab" -ResourceGroupName $ResourceGroup
$SubnetAD = Get-AzVirtualNetworkSubnetConfig -Name "snet-ad" -VirtualNetwork $VNet
$SubnetAD.NetworkSecurityGroup = $Nsg
$VNet | Set-AzVirtualNetwork
```

> ⚠️ **보안 주의:** RDP 소스 IP는 반드시 관리자의 Public IP로 제한하세요. 프로덕션 환경에서는 **Azure Bastion**을 사용하여 RDP를 Public IP 없이 접속하는 것을 권장합니다.

<br>

---

# 3. Domain Controller VM 생성

## 3.1 VM 생성

DC용 VM은 **Windows Server 2022 Datacenter**를 사용합니다.

```powershell
# 자격 증명 생성
$AdminCredential = Get-Credential -UserName "azureadmin" -Message "DC VM 관리자 비밀번호를 입력하세요"

# VNet 및 서브넷 참조
$VNet = Get-AzVirtualNetwork -Name "vnet-ad-lab" -ResourceGroupName $ResourceGroup
$SubnetAD = Get-AzVirtualNetworkSubnetConfig -Name "snet-ad" -VirtualNetwork $VNet

# Public IP 생성
$Pip = New-AzPublicIpAddress `
  -ResourceGroupName $ResourceGroup `
  -Name "dc01-pip" `
  -Location $Location `
  -AllocationMethod Static `
  -Sku Standard

# NIC 생성 (정적 Private IP 지정)
$Nic = New-AzNetworkInterface `
  -ResourceGroupName $ResourceGroup `
  -Name "dc01-nic" `
  -Location $Location `
  -SubnetId $SubnetAD.Id `
  -PublicIpAddressId $Pip.Id `
  -PrivateIpAddress "10.0.1.4"

# VM 구성
$VmConfig = New-AzVMConfig -VMName "dc01" -VMSize "Standard_B2ms" |
  Set-AzVMOperatingSystem `
    -Windows `
    -ComputerName "dc01" `
    -Credential $AdminCredential |
  Set-AzVMSourceImage `
    -PublisherName "MicrosoftWindowsServer" `
    -Offer "WindowsServer" `
    -Skus "2022-datacenter-azure-edition" `
    -Version "latest" |
  Set-AzVMOSDisk `
    -Name "dc01-osdisk" `
    -DiskSizeInGB 128 `
    -CreateOption FromImage `
    -Caching ReadWrite |
  Add-AzVMNetworkInterface -Id $Nic.Id

# VM 생성
New-AzVM `
  -ResourceGroupName $ResourceGroup `
  -Location $Location `
  -VM $VmConfig
```

> **VM 크기 선택 가이드:**
>
> | 환경 | 권장 크기 | vCPU / RAM |
> |---|---|---|
> | 학습/테스트 | Standard_B2ms | 2 vCPU / 8 GB |
> | 소규모 프로덕션 (~500 사용자) | Standard_D2s_v5 | 2 vCPU / 8 GB |
> | 중규모 프로덕션 (~5,000 사용자) | Standard_D4s_v5 | 4 vCPU / 16 GB |

## 3.2 정적 Private IP 확인

NIC 생성 시 `-PrivateIpAddress`를 지정했으므로 자동으로 **정적(Static)** 할당이 됩니다. 확인합니다:

```powershell
$Nic = Get-AzNetworkInterface -Name "dc01-nic" -ResourceGroupName $ResourceGroup
$Nic.IpConfigurations[0] | Select-Object PrivateIpAddress, PrivateIpAllocationMethod
```

출력 예시:
```
PrivateIpAddress PrivateIpAllocationMethod
---------------- -------------------------
10.0.1.4         Static
```

> **왜 정적 IP가 필수인가?**
> - DC는 DNS 서버 역할을 겸하며, VNet의 모든 리소스가 이 IP를 DNS 서버로 참조합니다.
> - IP가 변경되면 도메인 가입된 모든 VM이 DNS를 찾지 못해 인증 실패가 발생합니다.

## 3.3 데이터 디스크 추가 (AD DB 전용)

AD DS 데이터베이스(NTDS.dit), 로그, SYSVOL은 **별도 데이터 디스크**에 저장해야 합니다.

```powershell
# 데이터 디스크 생성 (32GB, Premium SSD)
$DiskConfig = New-AzDiskConfig `
  -Location $Location `
  -DiskSizeGB 32 `
  -SkuName Premium_LRS `
  -CreateOption Empty

$DataDisk = New-AzDisk `
  -ResourceGroupName $ResourceGroup `
  -DiskName "dc01-data-disk" `
  -Disk $DiskConfig

# VM에 데이터 디스크 연결 (캐싱 None)
$VM = Get-AzVM -ResourceGroupName $ResourceGroup -Name "dc01"
$VM = Add-AzVMDataDisk `
  -VM $VM `
  -Name "dc01-data-disk" `
  -ManagedDiskId $DataDisk.Id `
  -Lun 0 `
  -Caching None `
  -CreateOption Attach

Update-AzVM -ResourceGroupName $ResourceGroup -VM $VM
```

> **⚠️ 캐싱을 None으로 설정하는 이유:**
> - OS 디스크의 기본 캐싱은 **ReadWrite**입니다.
> - AD DS의 데이터베이스(NTDS.dit)는 **Write-Ahead Logging(WAL)**을 사용하여 트랜잭션 무결성을 보장합니다.
> - 호스트 캐싱이 활성화되어 있으면 캐시된 쓰기가 실제 디스크에 플러시되기 전에 VM이 재부팅될 경우 **데이터 손실** 위험이 있습니다.
> - 참고: [Microsoft Learn, "Deploy AD DS in Azure - disk caching"](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/identity/adds-extend-domain#vm-recommendations)

<br>

---

# 4. AD DS 역할 설치 및 DC 승격

VM에 RDP로 접속한 후, PowerShell을 **관리자 권한**으로 실행합니다.

## 4.1 데이터 디스크 초기화 및 포맷

먼저 추가한 데이터 디스크를 사용 가능한 상태로 만듭니다.

```powershell
# 초기화되지 않은 디스크 확인
Get-Disk | Where-Object PartitionStyle -eq 'RAW'

# 디스크 초기화 → 파티션 생성 → 포맷 (F: 드라이브)
Initialize-Disk -Number 2 -PartitionStyle GPT
New-Partition -DiskNumber 2 -UseMaximumSize -DriveLetter F
Format-Volume -DriveLetter F -FileSystem NTFS -NewFileSystemLabel "AD-Data" -Confirm:$false
```

## 4.2 AD DS 역할 설치

```powershell
# AD DS 역할 및 관리 도구 설치
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools
```

출력 예시:
```
Success Restart Needed Exit Code      Feature Result
------- -------------- ---------      --------------
True    No             Success        {Active Directory Domain Services}
```

## 4.3 새 포리스트 생성 (DC 승격)

새로운 포리스트와 도메인을 생성하면서 DC로 승격합니다.

```powershell
# AD DS 배포 모듈 임포트
Import-Module ADDSDeployment

# 새 포리스트 생성 (DC 승격)
Install-ADDSForest `
  -DomainName "corp.contoso.com" `
  -DomainNetbiosName "CORP" `
  -ForestMode "WinThreshold" `
  -DomainMode "WinThreshold" `
  -InstallDns:$true `
  -DatabasePath "F:\NTDS" `
  -LogPath "F:\NTDS" `
  -SysvolPath "F:\SYSVOL" `
  -NoRebootOnCompletion:$false `
  -Force:$true
```

> **매개변수 설명:**
>
> | 매개변수 | 값 | 설명 |
> |---|---|---|
> | `-DomainName` | corp.contoso.com | FQDN 형태의 도메인 이름 |
> | `-DomainNetbiosName` | CORP | 레거시 호환용 NetBIOS 이름 |
> | `-ForestMode` / `-DomainMode` | WinThreshold | Windows Server 2016 기능 수준 (최신 기능 사용) |
> | `-InstallDns` | $true | DC에 DNS 서버 역할도 함께 설치 |
> | `-DatabasePath` / `-LogPath` | F:\NTDS | AD DB를 데이터 디스크에 저장 |
> | `-SysvolPath` | F:\SYSVOL | 그룹 정책 및 로그온 스크립트 저장 경로 |

실행 시 **DSRM(Directory Services Restore Mode) 비밀번호**를 입력하라는 프롬프트가 나타납니다. 이 비밀번호는 AD DS 복구 시 필요하므로 안전하게 보관하세요.

설치가 완료되면 **자동으로 재부팅**됩니다.

## 4.4 기존 도메인에 DC를 추가하는 경우 (참고)

이미 온프레미스에 도메인이 있고, Azure VM을 **추가 DC**로 구성하려면:

```powershell
# 기존 도메인에 DC 추가
Install-ADDSDomainController `
  -DomainName "corp.contoso.com" `
  -InstallDns:$true `
  -DatabasePath "F:\NTDS" `
  -LogPath "F:\NTDS" `
  -SysvolPath "F:\SYSVOL" `
  -NoRebootOnCompletion:$false `
  -Credential (Get-Credential) `
  -Force:$true
```

> 이 경우 온프레미스와 Azure 간 **Site-to-Site VPN** 또는 **ExpressRoute**가 사전에 구성되어 있어야 하며, 온프레미스 DNS를 통해 기존 도메인을 찾을 수 있어야 합니다.


<br>

---

# 5. 설치 후 VNet DNS 설정 변경

DC 승격이 완료되면, VNet에 연결된 모든 VM이 **DC를 DNS 서버로 사용**하도록 설정해야 합니다. 이 설정이 없으면 다른 VM들은 도메인을 찾지 못해 **도메인 가입이 불가능**합니다.

## 5.1 VNet DNS 서버 변경

```powershell
# VNet의 DNS 서버를 DC의 Private IP로 설정
$VNet = Get-AzVirtualNetwork -Name "vnet-ad-lab" -ResourceGroupName $ResourceGroup
$VNet.DhcpOptions.DnsServers = @("10.0.1.4")
$VNet | Set-AzVirtualNetwork
```

> **중요:** DNS 변경 후 기존 VM들은 **DHCP 리스 갱신** 또는 **재부팅**이 필요합니다. 새로 만드는 VM은 자동으로 새 DNS 설정을 받습니다.

## 5.2 DNS 전달자(Forwarder) 설정

DC의 DNS 서버는 도메인 관련 쿼리만 직접 응답하고, **외부 도메인(인터넷) 쿼리**는 Azure의 기본 DNS(168.63.129.16)로 전달해야 합니다.

DC에 RDP로 접속한 후:

```powershell
# DNS 전달자를 Azure DNS로 설정
Set-DnsServerForwarder -IPAddress "168.63.129.16" -PassThru
```

> **168.63.129.16**은 Azure 플랫폼이 제공하는 가상 Public IP로, Azure 내부 DNS 확인(VM 이름 확인, Azure 서비스 FQDN 등)과 외부 DNS 확인을 모두 처리합니다.
> 참고: [Microsoft Learn, "What is IP address 168.63.129.16?"](https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16)

## 5.3 DNS 동작 흐름

```
클라이언트 VM (도메인 가입)
    │
    │  DNS 쿼리: "dc01.corp.contoso.com"
    ▼
DC01 DNS 서버 (10.0.1.4)
    │
    ├── 도메인 내부 쿼리 → AD 통합 DNS 영역에서 직접 응답
    │   (corp.contoso.com, _msdcs.corp.contoso.com 등)
    │
    └── 외부 쿼리 (예: www.google.com)
        │
        ▼
      Azure DNS (168.63.129.16) → 인터넷 DNS로 전달
```

<br>

---

# 6. 클라이언트 VM 도메인 가입

## 6.1 클라이언트 VM 생성

워크로드 서브넷에 도메인 가입 대상 VM을 생성합니다.

```powershell
# 자격 증명 생성
$ClientCredential = Get-Credential -UserName "azureadmin" -Message "Client VM 관리자 비밀번호를 입력하세요"

# VNet/서브넷 참조
$VNet = Get-AzVirtualNetwork -Name "vnet-ad-lab" -ResourceGroupName $ResourceGroup
$SubnetWorkload = Get-AzVirtualNetworkSubnetConfig -Name "snet-workload" -VirtualNetwork $VNet

# Public IP 생성
$ClientPip = New-AzPublicIpAddress `
  -ResourceGroupName $ResourceGroup `
  -Name "client01-pip" `
  -Location $Location `
  -AllocationMethod Static `
  -Sku Standard

# NIC 생성
$ClientNic = New-AzNetworkInterface `
  -ResourceGroupName $ResourceGroup `
  -Name "client01-nic" `
  -Location $Location `
  -SubnetId $SubnetWorkload.Id `
  -PublicIpAddressId $ClientPip.Id

# VM 구성 및 생성
$ClientVmConfig = New-AzVMConfig -VMName "client01" -VMSize "Standard_B2ms" |
  Set-AzVMOperatingSystem `
    -Windows `
    -ComputerName "client01" `
    -Credential $ClientCredential |
  Set-AzVMSourceImage `
    -PublisherName "MicrosoftWindowsServer" `
    -Offer "WindowsServer" `
    -Skus "2022-datacenter-azure-edition" `
    -Version "latest" |
  Add-AzVMNetworkInterface -Id $ClientNic.Id

New-AzVM `
  -ResourceGroupName $ResourceGroup `
  -Location $Location `
  -VM $ClientVmConfig
```

## 6.2 도메인 가입 (PowerShell)

클라이언트 VM에 RDP로 접속 후:

```powershell
# DNS가 DC를 가리키는지 확인
nslookup corp.contoso.com

# 도메인 가입
Add-Computer -DomainName "corp.contoso.com" -Credential (Get-Credential) -Restart -Force
```

> `Get-Credential` 프롬프트에서 **CORP\azureadmin** (또는 도메인 관리자 계정)의 자격 증명을 입력합니다.

## 6.3 도메인 가입 확인

재부팅 후 다시 RDP로 접속하여:

```powershell
# 도메인 가입 상태 확인
(Get-WmiObject -Class Win32_ComputerSystem).Domain
# 출력: corp.contoso.com

# 도메인 컨트롤러 확인
nltest /dsgetdc:corp.contoso.com
```

DC에서도 확인:

```powershell
# AD에 등록된 컴퓨터 목록 조회
Get-ADComputer -Filter * | Select-Object Name, DNSHostName, Enabled
```

<br>

---

# 7. AD DS 설치 검증

DC 승격 후 AD DS가 정상적으로 동작하는지 종합적으로 검증합니다.

## 7.1 핵심 서비스 상태 확인

DC에 RDP로 접속 후:

```powershell
# AD DS 관련 서비스 상태 확인
Get-Service -Name NTDS, ADWS, DNS, KDC, Netlogon | 
  Select-Object Name, Status, DisplayName |
  Format-Table -AutoSize
```

출력 예시:
```
Name     Status DisplayName
----     ------ -----------
NTDS    Running Active Directory Domain Services
ADWS    Running Active Directory Web Services
DNS     Running DNS Server
KDC     Running Kerberos Key Distribution Center
Netlogon Running Netlogon
```

## 7.2 DCDiag (도메인 컨트롤러 진단)

```powershell
# 전체 진단 실행
dcdiag /v

# 주요 테스트만 실행
dcdiag /test:dns /test:replications /test:services /test:advertising
```

모든 테스트가 **"passed"**로 표시되어야 합니다.

## 7.3 DNS 레코드 확인

```powershell
# SRV 레코드 확인 (DC 위치 검색에 사용)
Resolve-DnsName -Name "_ldap._tcp.dc._msdcs.corp.contoso.com" -Type SRV

# A 레코드 확인
Resolve-DnsName -Name "dc01.corp.contoso.com" -Type A
```

## 7.4 SYSVOL 및 NETLOGON 공유 확인

```powershell
# SYSVOL 공유 확인
Get-SmbShare | Where-Object { $_.Name -match "SYSVOL|NETLOGON" }

# 접근 테스트
dir \\dc01\SYSVOL
dir \\dc01\NETLOGON
```

<br>

---

# 8. 운영 모범 사례

## 8.1 고가용성 (두 번째 DC 추가)

프로덕션 환경에서는 반드시 **최소 2대의 DC**를 서로 다른 **가용성 영역(Availability Zone)**에 배치합니다.

```
┌──────────────────────────────────────────────────────┐
│                Azure VNet (10.0.0.0/16)              │
│                                                      │
│  ┌──────────────┐          ┌──────────────┐          │
│  │     AZ 1     │          │     AZ 2     │          │
│  │              │          │              │          │
│  │  DC01        │◄────────▶│  DC02        │          │
│  │  10.0.1.4    │  AD 복제  │  10.0.1.5    │          │
│  └──────────────┘          └──────────────┘          │
│                                                      │
│  VNet DNS: 10.0.1.4, 10.0.1.5                       │
└──────────────────────────────────────────────────────┘
```

```powershell
# VNet DNS에 두 번째 DC 추가
$VNet = Get-AzVirtualNetwork -Name "vnet-ad-lab" -ResourceGroupName $ResourceGroup
$VNet.DhcpOptions.DnsServers = @("10.0.1.4", "10.0.1.5")
$VNet | Set-AzVirtualNetwork
```

## 8.2 백업 전략

| 방법 | 설명 | RPO |
|---|---|---|
| **Azure Backup** | VM 전체를 Azure Recovery Services Vault에 백업 | 일 1회 (최소) |
| **Windows Server Backup** | System State 백업 (AD DB, SYSVOL, 레지스트리 포함) | 스케줄 설정 가능 |
| **ASR (Azure Site Recovery)** | DC VM을 다른 리전으로 복제 (DR 시나리오) | 거의 실시간 |

> ⚠️ **주의:** DC는 **스냅샷 복원**으로 복구하면 안 됩니다. USN(Update Sequence Number) 롤백이 발생하여 복제 불일치 문제가 생깁니다. 반드시 **System State 복원** 또는 **Authoritative Restore**를 사용하세요.

## 8.3 보안 강화

| 항목 | 권장 사항 |
|---|---|
| **RDP 접근** | Azure Bastion 사용, Public IP 제거, JIT VM Access 활성화 |
| **관리자 계정** | 기본 Administrator 계정 비활성화, 별도 관리자 계정 사용 |
| **그룹 정책(GPO)** | 비밀번호 정책, 계정 잠금 정책, 감사 정책 구성 |
| **패치 관리** | Azure Update Management로 자동 패치 적용 |
| **모니터링** | Azure Monitor Agent로 보안 이벤트 수집 → Log Analytics |
| **LDAPS** | 인증서 기반 LDAP over SSL(636) 활성화, 평문 LDAP(389) 제한 |

## 8.4 Azure AD(Entra ID)와의 하이브리드 연동

온프레미스/Azure VM AD DS와 **Microsoft Entra ID**를 연동하면 클라우드 서비스(M365, Azure Portal 등)에 SSO를 제공할 수 있습니다.

```
┌─────────────┐     Microsoft Entra     ┌──────────────────┐
│  Azure VM   │     Connect Sync        │  Microsoft       │
│  AD DS      │────────────────────────▶│  Entra ID        │
│  (DC01)     │     또는 Cloud Sync      │  (클라우드 ID)    │
└─────────────┘                         └──────────────────┘
                                              │
                                              ▼
                                        M365, Azure Portal,
                                        SaaS 앱 SSO 등
```

> 하이브리드 ID 설정은 별도 포스트에서 다룰 예정입니다.

<br>

---

# 9. 전체 구축 과정 요약

| 단계 | 작업 | 핵심 명령 / 설정 |
|---|---|---|
| **① 인프라 준비** | 리소스 그룹, VNet, 서브넷, NSG 생성 | `New-AzVirtualNetwork`, `New-AzNetworkSecurityGroup` |
| **② VM 생성** | Windows Server VM + 정적 IP + 데이터 디스크 | `New-AzVM`, `New-AzNetworkInterface -PrivateIpAddress` |
| **③ AD DS 설치** | AD DS 역할 설치 | `Install-WindowsFeature AD-Domain-Services` |
| **④ DC 승격** | 새 포리스트/도메인 생성 | `Install-ADDSForest` |
| **⑤ DNS 설정** | VNet DNS → DC IP, 전달자 → 168.63.129.16 | `Set-AzVirtualNetwork` (DhcpOptions), `Set-DnsServerForwarder` |
| **⑥ 검증** | 서비스 상태, DCDiag, DNS 레코드, 도메인 가입 테스트 | `dcdiag`, `nltest`, `Add-Computer` |
| **⑦ 운영** | HA(2nd DC), 백업, 보안 강화, 하이브리드 연동 | 가용성 영역 분산, Azure Backup |

<br>

---

# 참고 자료

| 주제 | 링크 |
|---|---|
| Azure VM에 AD DS 배포 참조 아키텍처 | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/identity/adds-extend-domain) |
| Install-ADDSForest 매개변수 | [Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/addsdeployment/install-addsforest) |
| Azure VM의 DC 디스크 캐싱 권장 사항 | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/identity/adds-extend-domain#vm-recommendations) |
| Azure 네트워크에서의 AD DS 포트 요구사항 | [Microsoft Learn](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/config-firewall-for-ad-domains-and-trusts) |
| Microsoft Entra Connect (하이브리드 ID) | [Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-azure-ad-connect) |
| Azure Bastion | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview) |
| 168.63.129.16 가상 IP | [Microsoft Learn](https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16) |
