# Read-only diagnostics for the fixed installation. Never closes processes,
# changes permissions, writes archives or requests elevation.
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$source = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class PrestafinUpdateDiagnostic {
 [StructLayout(LayoutKind.Sequential)] public struct UniqueProcess { public uint Id; public System.Runtime.InteropServices.ComTypes.FILETIME StartTime; }
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct ProcessInfo {
  public UniqueProcess Process;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=256)] public string AppName;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=64)] public string Service;
  public uint Type; public uint Status; public uint Session;
  [MarshalAs(UnmanagedType.Bool)] public bool Restartable;
 }
 [DllImport("rstrtmgr.dll",CharSet=CharSet.Unicode)] public static extern int RmStartSession(out uint handle,int flags,StringBuilder key);
 [DllImport("rstrtmgr.dll",CharSet=CharSet.Unicode)] public static extern int RmRegisterResources(uint handle,uint count,string[] files,uint apps,IntPtr processes,uint services,IntPtr names);
 [DllImport("rstrtmgr.dll")] public static extern int RmGetList(uint handle,out uint needed,ref uint count,[In,Out] ProcessInfo[] processes,out uint reason);
 [DllImport("rstrtmgr.dll")] public static extern int RmEndSession(uint handle);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFile(string name,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 // OPEN_EXISTING, no writes and no DELETE_ON_CLOSE: only checks whether
 // Windows grants the requested access, then immediately releases the handle.
 public static int CheckAccess(string name,uint access,bool directory) {
  IntPtr handle=CreateFile(name,access,7,IntPtr.Zero,3,directory?0x02000000u:0u,IntPtr.Zero);
  if(handle==new IntPtr(-1))return Marshal.GetLastWin32Error();
  CloseHandle(handle);return 0;
 }
}
'@
Add-Type -TypeDefinition $source
$target = $env:PRESTAFIN_UPDATE_TARGET
if (-not $target -or -not [IO.Path]::IsPathRooted($target)) { throw 'Falta la ruta absoluta de la instalacion.' }
$folder = Join-Path $target 'resources'
$files = @((Join-Path $folder 'app.asar'), (Join-Path $folder 'app.asar.next'))
$principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
$report = [ordered]@{
  administrator = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  folderAccess = [ordered]@{
    addFile = [PrestafinUpdateDiagnostic]::CheckAccess($folder,2,$true)
    deleteChild = [PrestafinUpdateDiagnostic]::CheckAccess($folder,64,$true)
  }
  files = @()
  processes = @()
  lockQuery = $null
  errorCodes = '0=permiso disponible; 5=acceso denegado; 32=archivo compartido/bloqueado; 2=archivo inexistente'
}
foreach ($file in $files) {
  $item = Get-Item -LiteralPath $file -ErrorAction SilentlyContinue
  $report.files += [ordered]@{
    name = [IO.Path]::GetFileName($file)
    exists = [bool]$item
    attributes = $(if ($item) { $item.Attributes.ToString() } else { $null })
    deleteAccess = [PrestafinUpdateDiagnostic]::CheckAccess($file,65536,$false)
  }
}
$report.processes = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match '^(Prestafin Terminal|electron)$' } | Select-Object Id,ProcessName,Path,MainWindowTitle)
[uint32]$handle = 0
$key = [Text.StringBuilder]::new(33)
$result = [PrestafinUpdateDiagnostic]::RmStartSession([ref]$handle,0,$key)
if ($result -ne 0) {
  $report.lockQuery = [ordered]@{ stage='start'; error=$result; message='No se pudo consultar quien mantiene abierto el archivo. Esto no confirma que este libre.' }
} else {
  try {
    $existing = @($files | Where-Object { Test-Path -LiteralPath $_ })
    $registered = [PrestafinUpdateDiagnostic]::RmRegisterResources($handle,$existing.Count,$existing,0,[IntPtr]::Zero,0,[IntPtr]::Zero)
    if ($registered -ne 0) {
      $report.lockQuery = [ordered]@{ stage='register'; error=$registered }
    } else {
      [uint32]$needed=0; [uint32]$count=0; [uint32]$reason=0
      $listed=[PrestafinUpdateDiagnostic]::RmGetList($handle,[ref]$needed,[ref]$count,$null,[ref]$reason)
      $items=$null
      for ($attempt=0; $listed -eq 234 -and $attempt -lt 3; $attempt++) {
        $count=$needed
        $items=[PrestafinUpdateDiagnostic+ProcessInfo[]]::new($count)
        $listed=[PrestafinUpdateDiagnostic]::RmGetList($handle,[ref]$needed,[ref]$count,$items,[ref]$reason)
      }
      $locks=@()
      if ($listed -eq 0 -and $count -gt 0) {
        $locks=@($items | Select-Object -First $count | Select-Object @{Name='processId';Expression={$_.Process.Id}},AppName,Service)
      }
      $report.lockQuery=[ordered]@{ stage='list'; error=$listed; restartReason=$reason; locks=$locks }
    }
  } finally { [void][PrestafinUpdateDiagnostic]::RmEndSession($handle) }
}
$report | ConvertTo-Json -Depth 6
