@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verificar.ps1" %*
