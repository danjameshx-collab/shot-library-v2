# Runs the Close sync every 15 minutes while you are logged in. Run again to update it; remove it with:
#   Unregister-ScheduledTask -TaskName 'Close to Daily Tasks' -Confirm:$false
$vbs = Join-Path $PSScriptRoot 'run-hidden.vbs'
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$vbs`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
Register-ScheduledTask -TaskName 'Close to Daily Tasks' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host 'Scheduled: Close to Daily Tasks, every 15 minutes.'
