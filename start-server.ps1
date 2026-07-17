param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)

& py -3 -m http.server $Port --directory $PSScriptRoot
