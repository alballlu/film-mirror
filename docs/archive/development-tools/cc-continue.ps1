# Claude Code 快速回溯上下文脚本
# 用法: 在 film-mirror 目录下运行此脚本，自动继续最近会话

$projectPath = "C:\Users\lllu\claude code file\film-mirror"
$sessionsPath = "$env:USERPROFILE\.claude\projects\C--Users-lllu-claude-code-file-film-mirror"

# 切换到项目目录
Set-Location $projectPath

# 找到最新的会话文件
$latestSession = Get-ChildItem -Path $sessionsPath -Filter "*.jsonl" | 
    Where-Object { $_.Name -notlike "agent-*" } |
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1

if ($latestSession) {
    $sessionId = $latestSession.BaseName
    Write-Host "📌 继续会话: $sessionId" -ForegroundColor Cyan
    Write-Host "📁 项目路径: $projectPath" -ForegroundColor Gray
    Write-Host ""
    
    # 启动 Claude 并继续会话
    & claude -c $sessionId
} else {
    Write-Host "⚠️  未找到历史会话，启动新会话..." -ForegroundColor Yellow
    & claude
}