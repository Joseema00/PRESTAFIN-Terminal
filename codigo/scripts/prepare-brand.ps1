Add-Type -AssemblyName System.Drawing
$brandSource = [System.IO.Path]::GetFullPath($env:PRESTAFIN_BRAND_SOURCE)
$brandTarget = [System.IO.Path]::GetFullPath($env:PRESTAFIN_BRAND_ICON)
$brandImage = [System.Drawing.Image]::FromFile($brandSource)
$brandBitmap = New-Object System.Drawing.Bitmap 256,256
$brandGraphics = [System.Drawing.Graphics]::FromImage($brandBitmap)
$brandStream = New-Object System.IO.MemoryStream
try {
  $brandGraphics.Clear([System.Drawing.Color]::Transparent)
  $brandGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $brandGraphics.DrawImage($brandImage,0,0,256,256)
  $brandBitmap.Save($brandStream,[System.Drawing.Imaging.ImageFormat]::Png)
  $brandPng = $brandStream.ToArray()
  $brandFile = [System.IO.File]::Create($brandTarget)
  $brandWriter = New-Object System.IO.BinaryWriter($brandFile)
  try {
    $brandWriter.Write([UInt16]0); $brandWriter.Write([UInt16]1); $brandWriter.Write([UInt16]1)
    $brandWriter.Write([byte]0); $brandWriter.Write([byte]0); $brandWriter.Write([byte]0); $brandWriter.Write([byte]0)
    $brandWriter.Write([UInt16]1); $brandWriter.Write([UInt16]32)
    $brandWriter.Write([UInt32]$brandPng.Length); $brandWriter.Write([UInt32]22); $brandWriter.Write($brandPng)
  } finally { $brandWriter.Dispose(); $brandFile.Dispose() }
} finally { $brandStream.Dispose(); $brandGraphics.Dispose(); $brandBitmap.Dispose(); $brandImage.Dispose() }
