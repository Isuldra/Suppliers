; Custom NSIS script for silent installation options
; This script provides silent installation capabilities for PowerShell deployment
; Includes language support and desktop shortcut options

!macro customHeader
  !system "echo '' > ${BUILD_RESOURCES_DIR}/customHeader"
!macroend

; Language selection and desktop shortcut options
!macro customInstallOptions
  ; Add desktop shortcut option page
  Page custom DesktopShortcutPage DesktopShortcutPageLeave
  
  ; Set default language based on system locale
  !define MULTIUSER_EXECUTIONLEVEL Standard
  !define MULTIUSER_INSTALLMODE_INSTDIR "${APP_NAME}"
!macroend

; Desktop shortcut selection page
!macro DesktopShortcutPage
  !insertmacro MUI_HEADER_TEXT "Desktop Shortcut" "Choose whether to create a desktop shortcut"
  
  nsDialogs::Create 1018
  Pop $0
  
  ${NSD_CreateCheckbox} 10 20 100% 10u "Create desktop shortcut"
  Pop $1
  ${NSD_SetState} $1 1  ; Checked by default
  
  nsDialogs::Show
!macroend

!macro DesktopShortcutPageLeave
  ${NSD_GetState} $1 $2
  ${If} $2 == 1
    StrCpy $CreateDesktopShortcut "true"
  ${Else}
    StrCpy $CreateDesktopShortcut "false"
  ${EndIf}
!macroend

!macro customInstall
  ; Add custom flags for silent install capabilities
  ; These can be used with /S for silent install and /D for installation directory
  
  ; If running silently, do not show any UI
  ${If} ${Silent}
    SetDetailsPrint none
    SetAutoClose true
  ${EndIf}

  ; Create desktop shortcut if user chose to
  ${If} $CreateDesktopShortcut == "true"
    CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_NAME}.exe" "" "$INSTDIR\${APP_NAME}.exe" 0
  ${EndIf}

  ; Create registry entries for easy uninstallation via PowerShell
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "UninstallString" "$INSTDIR\uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "QuietUninstallString" "$INSTDIR\uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "Publisher" "OneMed"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "Version" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "DisplayVersion" "${VERSION}"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
    "NoRepair" 1
  
  ; Add application to startup (optional, uncomment if needed)
  ; WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}" "$INSTDIR\${APP_NAME}.exe"
!macroend

!macro customUnInstall
  ; Custom uninstall actions
  ; Delete registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}"
  
  ; Remove desktop shortcut if it exists
  Delete "$DESKTOP\${APP_NAME}.lnk"
  
  ; If running silently, do not show any UI during uninstall
  ${If} ${Silent}
    SetDetailsPrint none
    SetAutoClose true
  ${EndIf}
!macroend 