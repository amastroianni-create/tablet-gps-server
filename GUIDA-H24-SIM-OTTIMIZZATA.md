# GUIDA SETUP GPS H24 7/7 CON SIM DATI VODAFONE

## 🚀 CARATTERISTICHE OTTIMIZZATE

### ✅ FUNZIONAMENTO H24 7/7
- **Servizio background permanente** con protezione anti-kill
- **WakeLock ottimizzato** per GPS sempre attivo
- **Restart automatico** se il sistema termina il servizio
- **Modalità notturna** con intervalli ridotti (15 min 23:00-06:00)

### ⚡ RISPARMIO BATTERIA INTELLIGENTE
- **Intervalli adattivi** basati su livello batteria:
  - Normale: 2 minuti
  - Batteria bassa (25%): 5 minuti  
  - Batteria critica (10%): 10 minuti
  - Modalità notturna: 15 minuti
- **GPS ottimizzato** per SIM (preferisce rete mobile)
- **Timeout intelligenti** per connessioni lente

### 📱 SUPPORTO SIM DATI COMPLETO
- **Multi-server** con fallback automatico
- **Tunnel ngrok** per attraversare NAT carrier
- **Timeout estesi** per connessioni mobili (20s)
- **Retry automatico** con backoff esponenziale

## 📋 SETUP COMPLETO

### 1. CONFIGURAZIONE SERVER
```bash
# Server locale per WiFi
node server.js

# Server Vercel per SIM (deploy automatico da GitHub)
# URL: https://tablet-gps-server.vercel.app
```

### 2. CONFIGURAZIONE APP
Già configurata per:
```kotlin
private val GPS_SERVER_URLS = arrayOf(
    "https://tablet-gps-server.vercel.app/api/position", // SIM dati
    "http://10.169.33.149:3000/api/position"            // WiFi locale
)
```

### 3. INSTALLAZIONE TABLET
```bash
# Installa APK
adb install app-release.apk

# Configura Device Owner (OBBLIGATORIO per H24)
adb shell dpm set-device-owner com.abbmusei.kioskwebapp/.MyDeviceAdminReceiver

# Disabilita ottimizzazioni batteria
adb shell dumpsys deviceidle whitelist +com.abbmusei.kioskwebapp
```

### 4. CONFIGURAZIONE SIM DATI
1. **Inserisci SIM Vodafone** nel tablet
2. **Attiva connessione dati** nelle impostazioni
3. **Disabilita WiFi** se vuoi usare solo SIM
4. **Verifica APN** Vodafone: `mobile.vodafone.it`

### 5. TEST FUNZIONAMENTO
```bash
# Verifica GPS attivo
adb logcat | grep GPS_TRACKER

# Test connessione server
curl http://TUO_SERVER:3000/api/positions

# Verifica servizio background
adb shell dumpsys activity services | grep GpsBackgroundService
```

## 🔧 RISOLUZIONE PROBLEMI

### ❌ GPS non invia dati
```bash
# Verifica permessi
adb shell pm grant com.abbmusei.kioskwebapp android.permission.ACCESS_FINE_LOCATION

# Riavvia servizio
adb shell am stopservice com.abbmusei.kioskwebapp/.GpsBackgroundService
adb shell am startservice com.abbmusei.kioskwebapp/.GpsBackgroundService
```

### ❌ SIM non si connette
1. Verifica **credito SIM** e **piano dati attivo**
2. Controlla **APN Vodafone**: `mobile.vodafone.it`
3. Riavvia tablet per refresh rete
4. Testa con browser: `http://www.google.com`

### ❌ Server non raggiungibile da SIM
1. **Verifica Vercel online**: `https://tablet-gps-server.vercel.app`
2. **Controlla deploy GitHub**: push automatico su Vercel
3. **Testa da mobile**: apri URL Vercel da smartphone
4. **Fallback locale**: verifica server locale per WiFi

### ❌ Batteria si scarica troppo
- Intervalli già ottimizzati automaticamente
- Modalità notturna attiva 23:00-06:00
- WakeLock parziale (non tiene schermo acceso)
- GPS usa rete mobile quando possibile

## 📊 MONITORAGGIO

### Dashboard Web
Apri: `http://TUO_SERVER:3000/dashboard`
- **Mappa in tempo reale** con tutti i tablet
- **Stato batteria** e tipo connessione
- **Ultimo aggiornamento** per ogni device
- **Cronologia posizioni** degli ultimi giorni

### Log Android
```bash
# GPS tracking
adb logcat | grep GPS_TRACKER

# Servizio background  
adb logcat | grep GPS_SERVICE

# Connettività rete
adb logcat | grep CONNECTION
```

### Telegram Alerts
Il server invia notifiche automatiche:
- ✅ **Tablet online** dopo disconnessione
- 🔴 **Tablet offline** dopo 2 minuti
- 🔋 **Batteria bassa** sotto 15%
- 📍 **Posizione aggiornata** con indirizzo

## 🛡️ SICUREZZA

### Protezioni Attive
- **Device Owner** impedisce disinstallazione
- **Kiosk mode** blocca accesso impostazioni  
- **WakeLock** protetto da terminazione
- **Servizio foreground** sempre visibile
- **Restart automatico** dopo crash/reboot

### Accesso Admin
- **7 tap** angolo superiore destro
- **Password**: `admin_mobile` (modificabile)
- **Timeout**: 120 secondi auto-chiusura
- **Controlli**: WiFi, SIM, luminosità, kiosk on/off

## 📈 PRESTAZIONI OTTIMALI

### Impostazioni Consigliate
- **Luminosità**: 60% (risparmio batteria)
- **WiFi**: OFF se usi solo SIM
- **Bluetooth**: OFF se non necessario
- **Aggiornamenti automatici**: OFF
- **Sincronizzazione**: Solo account essenziali

### Manutenzione
- **Riavvio settimanale** per pulizia memoria
- **Pulizia cache** automatica ogni ora
- **Aggiornamento APK** quando disponibile
- **Controllo credito SIM** mensile

## 🎯 RISULTATI ATTESI

✅ **Tracking continuo H24 7/7**  
✅ **Batteria dura 8-12 ore** (dipende da tablet)  
✅ **Funziona con WiFi E SIM dati**  
✅ **Restart automatico** dopo spegnimento  
✅ **Notifiche Telegram** in tempo reale  
✅ **Dashboard web** sempre aggiornata  

Il sistema è ora completamente ottimizzato per funzionamento H24 7/7 con massimo risparmio batteria e supporto completo SIM dati Vodafone!