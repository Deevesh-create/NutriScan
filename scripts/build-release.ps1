# Builds the signed release APKs with your own key (android/app/nutriscan-release.keystore, git-ignored).
# The first run creates the key. You type the password; it is only kept in memory for this build.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$jbr = 'C:\Program Files\Android\Android Studio\jbr'
$env:JAVA_HOME = $jbr
$keystore = Join-Path $root 'android\app\nutriscan-release.keystore'

if (-not (Test-Path $keystore)) {
  Write-Host ''
  Write-Host 'Creating your release key. Choose a password (6+ characters) and keep it safe:'
  Write-Host 'you need it for every future release, and a lost key cannot be recovered.'
  & "$jbr\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore $keystore -alias nutriscan -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Deevesh Rughoo, O=NutriScan, L=Mauritius, C=MU'
  if ($LASTEXITCODE -ne 0) { throw 'keytool failed' }
}

$secure = Read-Host 'Release key password' -AsSecureString
$env:NUTRISCAN_KEYSTORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
try {
  Push-Location (Join-Path $root 'android')
  .\gradlew.bat assembleRelease --no-daemon --console=plain "-Dorg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m" "-Pkotlin.compiler.execution.strategy=in-process"
  if ($LASTEXITCODE -ne 0) { throw 'Build failed (a wrong password shows as "Keystore was tampered with, or password was incorrect").' }
}
finally {
  Pop-Location
  Remove-Item Env:NUTRISCAN_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
}

Get-ChildItem (Join-Path $root 'android\app\build\outputs\apk\release') -Filter *.apk |
  ForEach-Object { '{0}  {1:N1} MB' -f $_.Name, ($_.Length / 1MB) }
Write-Host 'BUILD-RELEASE-DONE'
