@echo off
echo Starting KisanMitra Project Services...

echo Starting Next.js Frontend (Port 3000/3001)...
start cmd /k "cd Frontend && npm run dev"

echo Starting Disease Prediction Backend (Port 8000)...
start cmd /k "cd Backend\Disease prediction && python main.py"

echo Starting AI Advisory Backend (Port 8080)...
start cmd /k "cd Backend\AI Advisory && python main.py"

echo Starting Crop Recommendation Backend (Port 8001)...
start cmd /k "cd Backend\Crop recommendation && python main.py"

echo All services are starting up in separate windows!
pause

