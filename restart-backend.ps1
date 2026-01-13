# 重启后端服务脚本
Write-Host "正在重启后端服务..."

# 查找并停止后端 Node.js 进程
Get-Process | Where-Object {
    $_.Path -like "*node.exe" -and 
    (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*backend*"
} | Stop-Process -Force

Start-Sleep -Seconds 2

# 启动后端服务
Write-Host "启动后端服务..."
cd backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Minimized

Write-Host "后端服务已重启！"
