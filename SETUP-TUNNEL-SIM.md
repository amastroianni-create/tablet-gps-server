# CONFIGURAZIONE TUNNEL NGROK PER SIM DATI H24 7/7

## 1. INSTALLA NGROK
```bash
# Scarica da https://ngrok.com/download
# Registrati e ottieni authtoken
ngrok authtoken YOUR_AUTH_TOKEN
```

## 2. CONFIGURA TUNNEL PERMANENTE
```bash
# Crea tunnel HTTP per server GPS
ngrok http 3000 --region=eu --hostname=your-server.ngrok.io
```

## 3. CONFIGURAZIONE AUTOMATICA (Windows)
Crea file `start-tunnel.bat`:
```batch
@echo off
echo Avvio tunnel ngrok per GPS H24...
cd /d "C:\ngrok"
ngrok http 3000 --region=eu --log=stdout > tunnel.log 2>&1
```

## 4. SERVIZIO WINDOWS (Opzionale)
Per avvio automatico all'accensione:
```batch
# Installa NSSM (Non-Sucking Service Manager)
nssm install "GPS-Tunnel" "C:\ngrok\ngrok.exe"
nssm set "GPS-Tunnel" Arguments "http 3000 --region=eu"
nssm set "GPS-Tunnel" Start SERVICE_AUTO_START
nssm start "GPS-Tunnel"
```

## 5. VERIFICA TUNNEL
```bash
# Controlla status
curl https://your-server.ngrok.io/api/positions

# Log tunnel
tail -f tunnel.log
```

## 6. CONFIGURAZIONE ROUTER (Alternativa)
Se hai IP pubblico statico:
```
Port Forward: 3000 -> IP_SERVER:3000
Firewall: Apri porta 3000 TCP
```

## 7. MONITORAGGIO H24
Script PowerShell per restart automatico:
```powershell
# monitor-tunnel.ps1
while ($true) {
    $process = Get-Process "ngrok" -ErrorAction SilentlyContinue
    if (-not $process) {
        Write-Host "Riavvio tunnel ngrok..."
        Start-Process "C:\ngrok\ngrok.exe" -ArgumentList "http 3000 --region=eu"
    }
    Start-Sleep 60
}
```

## 8. URL FINALI DA USARE NELL'APP
- WiFi: http://10.169.33.149:3000/api/position
- SIM: https://your-server.ngrok.io/api/position
- Backup: https://tablet-gps-server.vercel.app/api/position