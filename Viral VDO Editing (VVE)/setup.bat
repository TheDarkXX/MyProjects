@echo off
echo Creating directories...
mkdir scripts 2>nul
mkdir assets 2>nul
mkdir .agents\skills\hypercut 2>nul

echo Creating virtual environment...
python -m venv venv

echo Upgrading pip...
venv\Scripts\python.exe -m pip install --upgrade pip

echo Installing dependencies...
venv\Scripts\python.exe -m pip install torch torchaudio numpy ffmpeg-python soundfile openai-whisper

echo Done!
