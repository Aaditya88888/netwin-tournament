# First, list all Firebase projects
Write-Host "Fetching Firebase projects..." -ForegroundColor Yellow
firebase projects:list

Write-Host "`nEnter the project ID from the list above:" -ForegroundColor Green
$projectId = Read-Host

# Verify project exists
$projectCheck = firebase projects:list | Select-String $projectId
if (-not $projectCheck) {
    Write-Error "Project $projectId not found"
    exit 1
}

# List all apps in the project
Write-Host "`nFetching apps for project $projectId..." -ForegroundColor Yellow
firebase apps:list --project $projectId

Write-Host "`nEnter the app ID from the list above:" -ForegroundColor Green
$appId = Read-Host

# Verify app exists
$appCheck = firebase apps:list --project $projectId | Select-String $appId
if (-not $appCheck) {
    Write-Error "App $appId not found in project $projectId"
    exit 1
}

Write-Host "`nWhat do you want to deploy?" -ForegroundColor Green
Write-Host "1. Hosting only"
Write-Host "2. Functions only"
Write-Host "3. Both hosting and functions"
$choice = Read-Host

# Determine app type and target
$appName = if ($appId -match "f691cb23a243cc77e4258e") {  # Admin app ID
    "admin-app"
} else {
    "client-app"
}

# Set up hosting targets if needed
if ($choice -eq "1" -or $choice -eq "3") {
    Write-Host "`nSetting up hosting targets..." -ForegroundColor Yellow
    Write-Host "Setting up target: $appName"
    
    # Remove existing target if it exists (to prevent conflicts)
    firebase target:clear hosting $appName 2>$null
    
    # Apply new target
    firebase target:apply hosting $appName $projectId
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to set up hosting target"
        exit 1
    }
}

# Build steps
Write-Host "`nBuilding application components..." -ForegroundColor Yellow
if ($choice -eq "1" -or $choice -eq "3") {
    Write-Host "Building client..."
    npm run build:client
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Client build failed"
        exit 1
    }
}

if ($choice -eq "2" -or $choice -eq "3") {
    Write-Host "Building functions..."
    Set-Location functions
    npm install
    npm run build
    Set-Location ..
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Functions build failed"
        exit 1
    }
}

# Prepare deployment command
$deployTargets = switch ($choice) {
    "1" { "hosting:$appName" }
    "2" { "functions" }
    "3" { "hosting:$appName,functions" }
    default {
        Write-Error "Invalid choice"
        exit 1
    }
}

# Deploy to Firebase
Write-Host "`nDeploying to Firebase..." -ForegroundColor Yellow
Write-Host "Project: $projectId"
Write-Host "App: $appId"
Write-Host "Components: $deployTargets"

# Execute deployment with proper quoting
$deployCommand = "firebase deploy --project `"$projectId`" --only `"$deployTargets`""
Write-Host "`nRunning: $deployCommand" -ForegroundColor Cyan
Invoke-Expression $deployCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
} else {
    Write-Error "Deployment failed"
    exit 1
} 