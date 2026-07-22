[Setup]
AppName=FinTrack
AppVersion=1.0.0
AppPublisher=FinTrack Finance Manager
DefaultDirName={autopf}\FinTrack
DefaultGroupName=FinTrack
OutputBaseFilename=FinTrack-Setup
OutputDir=release
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "pkg-build\node.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "pkg-build\server.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "pkg-build\dist\*"; DestDir: "{app}\dist"; Recurse: yes; Flags: ignoreversion
Source: "pkg-build\start.vbs"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\FinTrack"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\start.vbs"""; WorkingDir: "{app}"
Name: "{autodesktop}\FinTrack"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\start.vbs"""; WorkingDir: "{app}"

[Run]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\start.vbs"""; Description: "Launch FinTrack now"; Flags: nowait postinstall skipifsilent
