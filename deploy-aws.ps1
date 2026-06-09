[CmdletBinding()]
param(
  [string]$Region = "us-east-1",
  [string]$BucketName = "",
  [string]$Profile = "",
  [string]$AwsExe = "",
  [string[]]$AllowedCidrs = @(),
  [int]$ExpireAfterDays = 30,
  [switch]$PublicAccess,
  [switch]$OpenAfterDeploy
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Resolve-AwsCli {
  param([string]$ExplicitPath)

  if ($ExplicitPath) {
    if (Test-Path -LiteralPath $ExplicitPath) {
      return $ExplicitPath
    }
    throw "AWS CLI was not found at: $ExplicitPath"
  }

  $command = Get-Command aws -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $knownPaths = @(
    "C:\Program Files\Amazon\AWSCLIV2\aws.exe",
    "C:\Program Files (x86)\Amazon\AWSCLIV2\aws.exe"
  )

  foreach ($path in $knownPaths) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }

  throw "AWS CLI is not installed. Install it, then run this script again."
}

function Convert-ToFileUri {
  param([string]$Path)
  return "file://$($Path -replace '\\', '/')"
}

function Write-JsonFileNoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Value,
    [int]$Depth = 5
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

function Invoke-AwsNoThrow {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  $base = $script:AwsBase
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $script:Aws @base @Arguments 2>&1
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  return [PSCustomObject]@{
    ExitCode = $LASTEXITCODE
    Output = ($output | Out-String)
  }
}

try {
  $identity = Invoke-Aws sts get-caller-identity --output json | Out-String | ConvertFrom-Json
} catch {
  Write-Host "AWS CLI is installed, but this machine is not logged in to AWS yet." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Use one of these login options, then run this script again:" -ForegroundColor Yellow
  Write-Host "  aws configure sso"
  Write-Host "  aws configure"
  Write-Host ""
  Write-Host "Do not paste AWS secret keys into chat. Configure them locally only."
  exit 2
}

if (-not $BucketName.Trim()) {
  $BucketName = "vector-promo-$($identity.Account)-$Region".ToLowerInvariant()
}

if ($BucketName -notmatch "^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$") {
  throw "Invalid S3 bucket name: $BucketName"
}

if (-not $PublicAccess -and $AllowedCidrs.Count -eq 0) {
  try {
    $currentIp = (Invoke-RestMethod -Uri "https://checkip.amazonaws.com" -TimeoutSec 10).Trim()
    if ($currentIp -match "^\d{1,3}(\.\d{1,3}){3}$") {
      $AllowedCidrs = @("$currentIp/32")
    }
  } catch {
    throw "Could not detect your current public IP. Re-run with -AllowedCidrs 'x.x.x.x/32'."
  }
}

Write-Host "AWS account: $($identity.Account)"
Write-Host "Region: $Region"
Write-Host "Bucket: $BucketName"
if ($PublicAccess) {
  Write-Host "Access: public internet"
} else {
  Write-Host "Access: restricted to $($AllowedCidrs -join ', ')"
}
if ($ExpireAfterDays -gt 0) {
  Write-Host "Lifecycle: expire uploaded objects after $ExpireAfterDays days"
}
Write-Host ""

$head = Invoke-AwsNoThrow s3api head-bucket --bucket $BucketName
if ($head.ExitCode -ne 0) {
  Write-Host "Creating S3 bucket..."
  if ($Region -eq "us-east-1") {
    Invoke-Aws s3api create-bucket --bucket $BucketName --region $Region | Out-Null
  } else {
    Invoke-Aws s3api create-bucket `
      --bucket $BucketName `
      --region $Region `
      --create-bucket-configuration "LocationConstraint=$Region" | Out-Null
  }
  Invoke-Aws s3api wait bucket-exists --bucket $BucketName | Out-Null
} else {
  Write-Host "S3 bucket already exists."
}

Write-Host "Configuring static website hosting..."
$websiteConfigPath = Join-Path $env:TEMP "vector-s3-website-$PID.json"
Write-JsonFileNoBom -Path $websiteConfigPath -Depth 5 -Value @{
  IndexDocument = @{ Suffix = "index.html" }
  ErrorDocument = @{ Key = "index.html" }
}

Invoke-Aws s3api put-bucket-website `
  --bucket $BucketName `
  --website-configuration (Convert-ToFileUri $websiteConfigPath) | Out-Null

Write-Host "Configuring public access controls..."
Invoke-Aws s3api put-public-access-block `
  --bucket $BucketName `
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false" | Out-Null

Invoke-Aws s3api put-bucket-ownership-controls `
  --bucket $BucketName `
  --ownership-controls "Rules=[{ObjectOwnership=BucketOwnerEnforced}]" | Out-Null

$policyPath = Join-Path $env:TEMP "vector-s3-policy-$PID.json"
$readStatement = @{
  Sid = "ReadWebsiteObjects"
  Effect = "Allow"
  Principal = "*"
  Action = "s3:GetObject"
  Resource = "arn:aws:s3:::$BucketName/*"
}

if (-not $PublicAccess) {
  $readStatement.Condition = @{
    IpAddress = @{
      "aws:SourceIp" = @($AllowedCidrs)
    }
  }
}

Write-JsonFileNoBom -Path $policyPath -Depth 10 -Value @{
  Version = "2012-10-17"
  Statement = @($readStatement)
}

Invoke-Aws s3api put-bucket-policy `
  --bucket $BucketName `
  --policy (Convert-ToFileUri $policyPath) | Out-Null

if ($ExpireAfterDays -gt 0) {
  Write-Host "Configuring lifecycle expiration..."
  $lifecyclePath = Join-Path $env:TEMP "vector-s3-lifecycle-$PID.json"
  Write-JsonFileNoBom -Path $lifecyclePath -Depth 10 -Value @{
    Rules = @(
      @{
        ID = "ExpireInternalTestSiteObjects"
        Status = "Enabled"
        Filter = @{ Prefix = "" }
        Expiration = @{ Days = $ExpireAfterDays }
        AbortIncompleteMultipartUpload = @{ DaysAfterInitiation = 1 }
      }
    )
  }

  Invoke-Aws s3api put-bucket-lifecycle-configuration `
    --bucket $BucketName `
    --lifecycle-configuration (Convert-ToFileUri $lifecyclePath) | Out-Null
}

Write-Host "Uploading site files..."
Invoke-Aws s3 cp "index.html" "s3://$BucketName/index.html" `
  --content-type "text/html; charset=utf-8" `
  --cache-control "no-cache" | Out-Null

Invoke-Aws s3 sync "src" "s3://$BucketName/src" `
  --delete `
  --cache-control "no-cache" | Out-Null

Invoke-Aws s3 sync "public" "s3://$BucketName/public" `
  --delete `
  --cache-control "public,max-age=31536000,immutable" | Out-Null

$websiteUrl = "http://$BucketName.s3-website-$Region.amazonaws.com"

Write-Host ""
Write-Host "Deployment complete." -ForegroundColor Green
Write-Host "Public URL: $websiteUrl"
Write-Host ""
Write-Host "Note: S3 static website endpoints use HTTP. For HTTPS/custom domain, add CloudFront in front of this bucket."

if ($OpenAfterDeploy) {
  Start-Process $websiteUrl
}
