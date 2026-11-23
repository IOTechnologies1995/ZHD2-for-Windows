; ZHD2 Media Player — Windows NSIS Custom Installer Macro
; Creates local asset cache directories, initializes %APPDATA%\ZHD2\config.json,
; and registers Windows Explorer file associations for audio and video files.

!macro customInstall
  ; Create user config and local asset cache folders
  CreateDirectory "$APPDATA\ZHD2"
  CreateDirectory "$LOCALAPPDATA\ZHD2\Assets"
  CreateDirectory "$LOCALAPPDATA\ZHD2\ArtworkCache"

  ; Write default user configuration if not already present
  IfFileExists "$APPDATA\ZHD2\config.json" skip_default_cfg 0
    FileOpen $0 "$APPDATA\ZHD2\config.json" w
    FileWrite $0 '{"colorSchemeId":"zune-magenta","surfaceMode":"dark","screensaverMode":"album-mosaic","screensaverTimeoutSec":20,"eqEnabled":true,"eqPresetId":"zune-signature"}'
    FileClose $0
  skip_default_cfg:

  ; Register ZHD2 ProgID for Windows media file associations
  WriteRegStr HKCU "Software\Classes\ZHD2.MediaFile" "" "ZHD2 Media File"
  WriteRegStr HKCU "Software\Classes\ZHD2.MediaFile\DefaultIcon" "" "$INSTDIR\ZHD2 Media Player.exe,0"
  WriteRegStr HKCU "Software\Classes\ZHD2.MediaFile\shell\open\command" "" '"$INSTDIR\ZHD2 Media Player.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\.mp3\OpenWithProgids" "ZHD2.MediaFile" ""
  WriteRegStr HKCU "Software\Classes\.flac\OpenWithProgids" "ZHD2.MediaFile" ""
  WriteRegStr HKCU "Software\Classes\.wav\OpenWithProgids" "ZHD2.MediaFile" ""
  WriteRegStr HKCU "Software\Classes\.ogg\OpenWithProgids" "ZHD2.MediaFile" ""
  WriteRegStr HKCU "Software\Classes\.mp4\OpenWithProgids" "ZHD2.MediaFile" ""
  WriteRegStr HKCU "Software\Classes\.webm\OpenWithProgids" "ZHD2.MediaFile" ""
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\ZHD2.MediaFile"
!macroend
