# 🚀 Guida Railway.app per GPS Tracker

## 1. Setup Railway (5 minuti)

### Registrazione
1. Vai su [railway.app](https://railway.app)
2. Clicca "Login" → "GitHub" (o email)
3. Conferma account

### Deploy del server
1. Clicca "New Project"
2. Seleziona "Empty Project"
3. Clicca "Add Service" → "GitHub Repo"
4. Carica i file da `gps-tracker-system/railway-server/`

## 2. File necessari per Railway

Hai già questi file pronti:
- ✅ `package.json` - Dipendenze Node.js
- ✅ `server.js` - Server GPS ottimizzato

## 3. Configurazione Railway

### Variabili ambiente (opzionali)
Nel dashboard Railway:
1. Vai su "Variables"
2. Aggiungi se necessario:
   - `PORT` = 3000 (automatico)
   - `NODE_ENV` = production

### Deploy automatico
Railway fa deploy automatico quando carichi i file.

## 4. Ottenere l'URL del server

1. Nel dashboard Railway, vai su "Settings"
2. Sezione "Domains" 
3. Clicca "Generate Domain"
4. Copia l'URL (es: `https://kioskgps-production.railway.app`)

## 5. Aggiornare l'app Android

Sostituisci `https://your-app.railway.app` con il tuo URL Railway in:

**File**: `GpsTracker.kt`
**Linee da modificare**:
```kotlin
// Cambia questo:
"https://your-app.railway.app/api/position"

// Con il tuo URL Railway:
"https://kioskgps-production.railway.app/api/position"
```

## 6. Test del server

### Test browser
Vai su: `https://tuo-url.railway.app`
Dovresti vedere: `{"message": "GPS Tracker Server attivo"}`

### Test API
```bash
curl -X POST https://tuo-url.railway.app/api/position \
  -H "Content-Type: application/json" \
  -d '{"nome":"test","lat":45.0703,"lng":7.6869}'
```

## 7. Monitoraggio

### Logs Railway
1. Dashboard → "Deployments"
2. Clicca sull'ultimo deploy
3. Vedi logs in tempo reale

### Health check
URL: `https://tuo-url.railway.app/health`
Risposta: `{"status":"ok","tablets":0,"uptime":123}`

## 8. Costi Railway

- **Hobby Plan**: $5/mese
- **Starter**: Gratis con limiti
- Include: 500 ore/mese, 1GB RAM, 1GB storage

## 9. Vantaggi Railway vs Tunnel

| Caratteristica | Railway | Tunnel (ngrok/Cloudflare) |
|---|---|---|
| URL fisso | ✅ Permanente | ❌ Cambia ad ogni restart |
| Uptime | ✅ 99.9% | ❌ Dipende da connessione locale |
| Configurazione | ✅ Una volta | ❌ Ogni restart |
| Costo | 💰 $5/mese | 🆓 Gratis ma instabile |

## 10. Risoluzione problemi

### Server non risponde
1. Controlla logs Railway
2. Verifica URL corretto nell'app
3. Test con `curl` o browser

### App non si connette
1. Verifica connessione internet tablet
2. Controlla logs Android (`adb logcat`)
3. Test manuale API

### Tablet SIM non appare
1. Assicurati che usi l'URL Railway
2. Verifica che il tablet abbia connessione dati
3. Controlla che l'app usi il server pubblico per SIM

## 11. Prossimi passi

1. ✅ Deploy su Railway
2. ✅ Ottieni URL fisso
3. ✅ Aggiorna app Android
4. ✅ Test con tablet SIM
5. ✅ Monitoraggio e ottimizzazione

**Il tuo server GPS sarà sempre raggiungibile da qualsiasi rete!** 🎯