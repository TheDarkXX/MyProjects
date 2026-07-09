param(
    [string]$ProjectName = ""
)

if ($ProjectName) {
    Write-Host "Running pipeline for project: $ProjectName"
} else {
    Write-Host "Running pipeline for active project (from registry)"
}

python scripts\04b-apply-editorial-cuts.py $ProjectName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python scripts\05-word-segment.py $ProjectName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python scripts\06-generate-srt.py $ProjectName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
