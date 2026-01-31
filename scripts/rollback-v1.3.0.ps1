# ==========================================================================
# Virtual IP Browser v1.3.0 Rollback Script (Windows PowerShell)
# ==========================================================================
# This script helps users rollback from v1.3.0 to v1.2.1
# 
# Usage: 
#   Right-click and "Run with PowerShell"
#   OR
#   powershell -ExecutionPolicy Bypass -File rollback-v1.3.0.ps1
#
# Requirements:
#   - PowerShell 5.1 or later
#   - Internet connection
#   - Administrator privileges recommended
# ==========================================================================

# Check for admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Virtual IP Browser v1.3.0 Rollback Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $isAdmin) {
    Write-Host "Note: Running without Administrator privileges." -ForegroundColor Yellow
    Write-Host "      Some operations may require elevation." -ForegroundColor Yellow
    Write-Host ""
}

# Configuration
$ReleaseUrl = "https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1"
$Version = "1.2.1"
$ConfigDir = "$env:APPDATA\virtual-ip-browser"
$BackupDir = "$ConfigDir\backup-v1.2.x"
$DownloadFile = "Virtual IP Browser Setup $Version.exe"
$AppName = "Virtual IP Browser"

Write-Host "Config Directory: $ConfigDir" -ForegroundColor Yellow
Write-Host ""

# ==========================================================================
# Step 1: Close application
# ==========================================================================
Write-Host "Step 1: Closing application..." -ForegroundColor Cyan

$processes = Get-Process -Name "Virtual IP Browser" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "  Found running process(es), stopping..." -ForegroundColor Yellow
    Stop-Process -Name "Virtual IP Browser" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Also try to stop by path pattern
Get-Process | Where-Object { $_.Path -like "*virtual-ip-browser*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "  Done" -ForegroundColor Green
Write-Host ""

# ==========================================================================
# Step 2: Check for backup
# ==========================================================================
Write-Host "Step 2: Checking for backup..." -ForegroundColor Cyan

if (Test-Path $BackupDir) {
    Write-Host "  Backup found at: $BackupDir" -ForegroundColor Green
    Write-Host ""
    
    $restoreBackup = Read-Host "Do you want to restore from backup? (y/n)"
    
    if ($restoreBackup -eq "y" -or $restoreBackup -eq "Y") {
        Write-Host "  Restoring backup..." -ForegroundColor Yellow
        
        # Create safety backup of current state
        $safetyBackup = "$ConfigDir\pre-rollback-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $safetyBackup -Force | Out-Null
        
        Copy-Item -Path "$ConfigDir\*.db" -Destination $safetyBackup -ErrorAction SilentlyContinue
        Copy-Item -Path "$ConfigDir\*.json" -Destination $safetyBackup -ErrorAction SilentlyContinue
        Write-Host "  Safety backup created: $safetyBackup" -ForegroundColor Yellow
        
        # Restore from v1.2.x backup
        Copy-Item -Path "$BackupDir\*" -Destination $ConfigDir -Recurse -Force
        Write-Host "  Backup restored" -ForegroundColor Green
    } else {
        Write-Host "  Skipping backup restore" -ForegroundColor Yellow
        Write-Host "  Note: Proxy credentials may need to be re-entered" -ForegroundColor Yellow
    }
} else {
    Write-Host "  No backup found at: $BackupDir" -ForegroundColor Yellow
    Write-Host "  Note: Proxy credentials may need to be re-entered after rollback" -ForegroundColor Yellow
}

Write-Host ""

# ==========================================================================
# Step 3: Download v1.2.1
# ==========================================================================
Write-Host "Step 3: Downloading v1.2.1..." -ForegroundColor Cyan

$downloadPath = "$env:TEMP\$DownloadFile"
$downloadUrl = "$ReleaseUrl/$DownloadFile"

Write-Host "  URL: $downloadUrl" -ForegroundColor Yellow
Write-Host "  Destination: $downloadPath" -ForegroundColor Yellow

try {
    # Use TLS 1.2
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    
    # Download with progress
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($downloadUrl, $downloadPath)
    
    if (Test-Path $downloadPath) {
        $fileSize = (Get-Item $downloadPath).Length / 1MB
        Write-Host "  Download complete ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
    } else {
        throw "Download failed - file not found"
    }
} catch {
    Write-Host "  Download failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download manually from:" -ForegroundColor Yellow
    Write-Host "  https://github.com/virtualipbrowser/virtual-ip-browser/releases/tag/v1.2.1" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# ==========================================================================
# Step 4: Installation
# ==========================================================================
Write-Host "Step 4: Starting installer..." -ForegroundColor Cyan

$runInstaller = Read-Host "Run the installer now? (y/n)"

if ($runInstaller -eq "y" -or $runInstaller -eq "Y") {
    Write-Host "  Launching installer..." -ForegroundColor Yellow
    Write-Host "  Please follow the installation prompts" -ForegroundColor Yellow
    
    Start-Process -FilePath $downloadPath -Wait
    
    Write-Host "  Installer completed" -ForegroundColor Green
} else {
    Write-Host "  Installer saved to: $downloadPath" -ForegroundColor Yellow
    Write-Host "  Run it manually to complete the rollback" -ForegroundColor Yellow
}

Write-Host ""

# ==========================================================================
# Step 5: Verification
# ==========================================================================
Write-Host "Step 5: Post-Rollback Verification" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please verify the following after launching the application:" -ForegroundColor Yellow
Write-Host "  [ ] Application starts without errors"
Write-Host "  [ ] All proxies are visible in the Proxy panel"
Write-Host "  [ ] Proxy credentials work (test connection)"
Write-Host "  [ ] Saved sessions are accessible"
Write-Host ""

# ==========================================================================
# Complete
# ==========================================================================
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Rollback preparation complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

Write-Host "If you encounter issues:" -ForegroundColor Yellow
Write-Host "  - GitHub Issues: https://github.com/virtualipbrowser/virtual-ip-browser/issues"
Write-Host "  - Rollback Guide: docs/ROLLBACK_PLAN_V1.3.0.md"
Write-Host ""

Read-Host "Press Enter to exit"
