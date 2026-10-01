; Remove the duplicate uninstall entry and submenu left by earlier installers.
; electron-builder owns the current shortcuts and uninstall registration.
!macro customInstall
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Pulse"
  Delete "$SMPROGRAMS\Pulse\Pulse.lnk"
  Delete "$SMPROGRAMS\Pulse\Uninstall Pulse.lnk"
  RMDir "$SMPROGRAMS\Pulse"
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Pulse"
!macroend
