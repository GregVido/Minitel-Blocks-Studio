!include "LogicLib.nsh"

Var MbsOldInstallDir

!macro MbsRemoveLongPath PATH
  nsExec::ExecToLog '"$SYSDIR\cmd.exe" /D /C if exist "${PATH}" rmdir /S /Q "\\?\${PATH}"'
  Pop $9
!macroend

!ifndef BUILD_UNINSTALLER
  Var MbsOriginalTemp
  Var MbsOriginalTmp
  Var MbsInstallDirToRemove

  !macro MbsSetProcessEnvironment NAME VALUE
    System::Call 'kernel32::SetEnvironmentVariable(t "${NAME}", t "${VALUE}") i.r9'
  !macroend

  !macro MbsRestoreInstallerTemp
    ${If} $MbsOriginalTemp != ""
      !insertmacro MbsSetProcessEnvironment "TEMP" "$MbsOriginalTemp"
    ${EndIf}
    ${If} $MbsOriginalTmp != ""
      !insertmacro MbsSetProcessEnvironment "TMP" "$MbsOriginalTmp"
    ${EndIf}
  !macroend

  !macro customInit
    ReadEnvStr $MbsOriginalTemp "TEMP"
    ReadEnvStr $MbsOriginalTmp "TMP"
    CreateDirectory "$WINDIR\Temp"
    !insertmacro MbsSetProcessEnvironment "TEMP" "$WINDIR\Temp"
    !insertmacro MbsSetProcessEnvironment "TMP" "$WINDIR\Temp"
  !macroend

  !macro customInstall
    !insertmacro MbsRestoreInstallerTemp
  !macroend

  ; Older releases contain ESP32 paths that become too long when NSIS moves them
  ; into its rollback directory. Free the install path as one directory if that
  ; legacy uninstaller returns an error, then let the normal install continue.
  !macro MbsRecoverLegacyUninstall ROOT_KEY LABEL_SUFFIX
    ${If} $R0 != 0
      DetailPrint "Nettoyage compatible avec les chemins longs..."
      Sleep 500
      ReadRegStr $MbsInstallDirToRemove ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" "InstallLocation"
      ${If} $MbsInstallDirToRemove == ""
        StrCpy $MbsInstallDirToRemove "$INSTDIR"
      ${EndIf}
      SetOutPath "$TEMP"
      GetFullPathName $MbsOldInstallDir "$MbsInstallDirToRemove\..\.mbs-update-old"
      !insertmacro MbsRemoveLongPath $MbsOldInstallDir

      ClearErrors
      Rename "$MbsInstallDirToRemove" "$MbsOldInstallDir"
      ${If} ${Errors}
        ClearErrors
        !insertmacro MbsRemoveLongPath $MbsInstallDirToRemove
      ${EndIf}

      IfFileExists "$MbsInstallDirToRemove\${APP_EXECUTABLE_FILENAME}" 0 mbs_legacy_cleaned_${LABEL_SUFFIX}
        !insertmacro MbsRestoreInstallerTemp
        MessageBox MB_OK|MB_ICONSTOP "Impossible de remplacer l ancienne version de Minitel Blocks Studio. Redemarrez Windows puis relancez cette mise a jour."
        SetErrorLevel 2
        Quit

      mbs_legacy_cleaned_${LABEL_SUFFIX}:
      !insertmacro MbsRemoveLongPath $MbsOldInstallDir
      StrCpy $R0 0
      ClearErrors
    ${EndIf}
  !macroend

  !macro customUnInstallCheck
    !insertmacro MbsRecoverLegacyUninstall SHELL_CONTEXT shell_context
  !macroend

  !macro customUnInstallCheckCurrentUser
    !insertmacro MbsRecoverLegacyUninstall HKEY_CURRENT_USER current_user
  !macroend
!endif

; New uninstallers avoid recursively moving every deep ESP32 file to an even
; longer temporary path. Renaming the top-level directory is atomic and keeps
; the destination free for the replacement version.
!macro customRemoveFiles
  SetOutPath "$TEMP"
  GetFullPathName $MbsOldInstallDir "$INSTDIR\..\.mbs-update-old"
  !insertmacro MbsRemoveLongPath $MbsOldInstallDir

  ClearErrors
  Rename "$INSTDIR" "$MbsOldInstallDir"
  ${If} ${Errors}
    ClearErrors
    !insertmacro MbsRemoveLongPath $INSTDIR
  ${EndIf}

  IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 mbs_remove_done
    Abort "Impossible de supprimer les fichiers de Minitel Blocks Studio."

  mbs_remove_done:
  !insertmacro MbsRemoveLongPath $MbsOldInstallDir
!macroend
