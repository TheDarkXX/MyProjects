python scripts\04b-apply-editorial-cuts.py "Test Auto"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python scripts\05-word-segment.py "Test Auto"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python scripts\06-generate-srt.py "Test Auto"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
