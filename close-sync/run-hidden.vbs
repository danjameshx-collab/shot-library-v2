' Runs sync.mjs with no console window flashing up (Task Scheduler calls this every 5 minutes).
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run "node """ & here & "\sync.mjs""", 0, True
