!macro customCheckAppRunning
  DetailPrint "Fermeture de Minitel Blocks Studio et des outils ESP32..."

  nsExec::ExecToLog `"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0

  nsExec::ExecToLog `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$$root = [IO.Path]::GetFullPath('$INSTDIR').TrimEnd('\\') + '\\'; Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$root, [StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 600"`
  Pop $0
!macroend
