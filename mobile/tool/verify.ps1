$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    dart format --output=none --set-exit-if-changed lib test tool
    if ($LASTEXITCODE -ne 0) { throw 'Run dart format lib test tool.' }
    dart run tool/check_file_lengths.dart
    if ($LASTEXITCODE -ne 0) { throw 'A Dart file exceeds 300 lines.' }
    flutter analyze --no-pub
    if ($LASTEXITCODE -ne 0) { throw 'Flutter analysis failed.' }
    flutter test --no-pub
    if ($LASTEXITCODE -ne 0) { throw 'Flutter tests failed.' }
} finally {
    Pop-Location
}
