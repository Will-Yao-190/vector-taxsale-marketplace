[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Email,
  [decimal]$Amount = 1,
  [string]$BudgetName = "Vector-Internal-Test-Monthly-Cost",
  [string]$Profile = "",
  [string]$AwsExe = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Resolve-AwsCli {
  param([string]$ExplicitPath)

  if ($ExplicitPath -and (Test-Path -LiteralPath $ExplicitPath)) {
    return $ExplicitPath
  }

  $command = Get-Command aws -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $defaultPath = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
  if (Test-Path -LiteralPath $defaultPath) {
    return $defaultPath
  }

  throw "AWS CLI is not installed."
}

function Convert-ToFileUri {
  param([string]$Path)
  return "file://$($Path -replace '\\', '/')"
}

function Write-JsonFileNoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Value,
    [int]$Depth = 8
  )

  $json = $Value | ConvertTo-Json -Depth $Depth
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($Path, $json, $utf8NoBom)
}

$script:Aws = Resolve-AwsCli $AwsExe
$script:AwsBase = @()
if ($Profile.Trim()) {
  $script:AwsBase += @("--profile", $Profile.Trim())
}

function Invoke-Aws {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  $base = $script:AwsBase
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $script:Aws @base @Arguments 2>&1
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($LASTEXITCODE -ne 0) {
    throw ($output | Out-String)
  }
  return $output
}

$identity = Invoke-Aws sts get-caller-identity --output json | Out-String | ConvertFrom-Json

$existing = & $script:Aws @script:AwsBase budgets describe-budget `
  --account-id $identity.Account `
  --budget-name $BudgetName 2>$null

if ($LASTEXITCODE -eq 0) {
  Write-Host "Budget already exists: $BudgetName" -ForegroundColor Yellow
  Write-Host "No changes made. Delete or update it in AWS Budgets if you need different thresholds."
  exit 0
}

$budgetPath = Join-Path $env:TEMP "vector-budget-$PID.json"
Write-JsonFileNoBom -Path $budgetPath -Depth 8 -Value @{
  BudgetName = $BudgetName
  BudgetLimit = @{
    Amount = "$Amount"
    Unit = "USD"
  }
  TimeUnit = "MONTHLY"
  BudgetType = "COST"
}

$notificationsPath = Join-Path $env:TEMP "vector-budget-notifications-$PID.json"
$subscriber = @{
  SubscriptionType = "EMAIL"
  Address = $Email
}

Write-JsonFileNoBom -Path $notificationsPath -Depth 10 -Value @(
  @{
    Notification = @{
      NotificationType = "ACTUAL"
      ComparisonOperator = "GREATER_THAN"
      Threshold = 80
      ThresholdType = "PERCENTAGE"
    }
    Subscribers = @($subscriber)
  },
  @{
    Notification = @{
      NotificationType = "ACTUAL"
      ComparisonOperator = "GREATER_THAN"
      Threshold = 100
      ThresholdType = "PERCENTAGE"
    }
    Subscribers = @($subscriber)
  },
  @{
    Notification = @{
      NotificationType = "FORECASTED"
      ComparisonOperator = "GREATER_THAN"
      Threshold = 100
      ThresholdType = "PERCENTAGE"
    }
    Subscribers = @($subscriber)
  }
)

Invoke-Aws budgets create-budget `
  --account-id $identity.Account `
  --budget (Convert-ToFileUri $budgetPath) `
  --notifications-with-subscribers (Convert-ToFileUri $notificationsPath) | Out-Null

Write-Host "Created monthly AWS budget: $BudgetName" -ForegroundColor Green
Write-Host "Amount: $Amount USD"
Write-Host "Notifications: 80% actual, 100% actual, 100% forecasted"
Write-Host "Email: $Email"
