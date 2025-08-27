#!/bin/bash
cd /home/kavia/workspace/code-generation/weather-forecast-hub-164373-164382/weather_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

