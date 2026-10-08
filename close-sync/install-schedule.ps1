# Runs the Close sync every 5 minutes while you are logged in. Run again to update it; remove it with:
#   Unregister-ScheduledTask -TaskName 'Close to Daily Tasks' -Confirm:$false
$vbs = Join-Path $PSScriptRoot 'run-hidden.vbs'
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$vbs`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName 'Close to Daily Tasks' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host 'Scheduled: Close to Daily Tasks, every 5 minutes.'
