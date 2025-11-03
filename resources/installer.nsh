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
  ; Note: Removed MULTIUSER_INSTALLMODE_INSTDIR override to let electron-builder
  ; use its default installation directory: $LOCALAPPDATA\Programs\${PRODUCT_FILENAME}
  !define MULTIUSER_EXECUTIONLEVEL Standard
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
  ; Note: electron-builder creates shortcuts automatically via createDesktopShortcut: true
  ; This custom shortcut is only created if the user explicitly chose to on the custom page
  ; Using productName from package.json: "OneMed SupplyChain"
  ; electron-builder uses this name for both folder and executable
  ${If} $CreateDesktopShortcut == "true"
    CreateShortCut "$DESKTOP\OneMed SupplyChain.lnk" "$INSTDIR\OneMed SupplyChain.exe" "" "$INSTDIR\OneMed SupplyChain.exe" 0
  ${EndIf}

  ; Create registry entries for easy uninstallation via PowerShell
  ; Note: electron-builder also creates registry entries automatically
  ; These are additional entries for PowerShell compatibility
  ; Using productName from package.json: "OneMed SupplyChain"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain" \
    "DisplayName" "OneMed SupplyChain"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain" \
    "UninstallString" "$INSTDIR\uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain" \
    "QuietUninstallString" "$INSTDIR\uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain" \
    "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain" \
    "Publisher" "OneMed"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain" \
    "Version" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain" \
    "DisplayVersion" "${VERSION}"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain" \
    "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain" \
    "NoRepair" 1
  
  ; Add application to startup (optional, uncomment if needed)
  ; WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "OneMed SupplyChain" "$INSTDIR\OneMed SupplyChain.exe"
!macroend

!macro customUnInstall
  ; Custom uninstall actions
  ; Delete registry entries
  ; Note: Using hardcoded productName "OneMed SupplyChain" from package.json
  ; electron-builder also handles uninstall registry cleanup automatically
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\OneMed SupplyChain"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "OneMed SupplyChain"
  
  ; Remove desktop shortcut if it exists
  ; Note: electron-builder also removes shortcuts automatically
  ; This is cleanup for the custom shortcut created in customInstall
  Delete "$DESKTOP\OneMed SupplyChain.lnk"
  
  ; If running silently, do not show any UI during uninstall
  ${If} ${Silent}
    SetDetailsPrint none
    SetAutoClose true
  ${EndIf}
!macroend 