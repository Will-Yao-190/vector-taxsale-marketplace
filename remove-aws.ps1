[CmdletBinding()]
param(
  [string]$Region = "us-east-1",
  [string]$BucketName = "vector-promo-319627300158-us-east-1",
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

Write-Host "Deleting all files from s3://$BucketName ..."
Invoke-Aws s3 rm "s3://$BucketName" --recursive --region $Region | Out-Null

Write-Host "Removing bucket configuration..."
try { Invoke-Aws s3api delete-bucket-policy --bucket $BucketName --region $Region | Out-Null } catch {}
try { Invoke-Aws s3api delete-bucket-website --bucket $BucketName --region $Region | Out-Null } catch {}
try { Invoke-Aws s3api delete-bucket-lifecycle --bucket $BucketName --region $Region | Out-Null } catch {}

Write-Host "Deleting bucket..."
Invoke-Aws s3api delete-bucket --bucket $BucketName --region $Region | Out-Null

Write-Host "Deleted bucket: $BucketName" -ForegroundColor Green
