# CONFIGURAZIONE SERVER GPS - RISOLUZIONE PROBLEMA SIM

## PROBLEMA IDENTIFICATO
Il tablet con SIM non appare sulla mappa perché:
1. **IP Server Locale**: Il server GPS usa IP locale `10.169.33.149:3000` 
2. **Rete Diversa**: WiFi e SIM usano reti diverse
3. **Accesso Negato**: Tablet con SIM non può raggiungere IP locale

## SOLUZIONI IMPLEMENTATE

### 1. Multi-Server Fallback
Il codice ora prova automaticamente diversi server in ordine di priorità:

**Per connessione SIM:**
1. Server pubblico (da configurare)
2. Server locale WiFi (fallback)

**Per connessione WiFi:**
1. Server locale WiFi
2. Server pubblico (fallback)

### 2. Rilevamento Automatico Connessione
L'app rileva automaticamente se usa WiFi o SIM e sceglie il server appropriato.

## CONFIGURAZIONE NECESSARIA

### OPZIONE A: Server Pubblico (CONSIGLIATA)
1. **Configura Port Forwarding sul Router:**
   - Porta: 3000
   - IP interno: 10.169.33.149
   - IP pubblico: [il tuo IP pubblico]

2. **Modifica il codice:**
   ```kotlin
   // In GpsTracker.kt, sostituisci "TUO-IP-PUBBLICO" con il tuo IP pubblico
   "http://123.456.789.012:3000/api/position" // Esempio
   ```

3. **Verifica IP pubblico:**
   - Vai su https://whatismyipaddress.com/
   - Annota l'IP pubblico
   - Sostituisci nel codice

### OPZIONE B: Server Cloud (ALTERNATIVA)
1. **Sposta il server su cloud:**
   - AWS, Google Cloud, DigitalOcean
   - Usa sempre lo stesso IP pubblico
   - Più affidabile per tablet con SIM

### OPZIONE C: VPN (TEMPORANEA)
1. **Configura VPN sul tablet con SIM:**
   - Connetti alla stessa rete del server
   - Soluzione temporanea

## VERIFICA FUNZIONAMENTO

### Test Connessione Server
```bash
# Da tablet WiFi
curl http://10.169.33.149:3000/api/tablets

# Da tablet SIM (dopo configurazione)
curl http://TUO-IP-PUBBLICO:3000/api/tablets
```

### Log da Controllare
Cerca nei log Android:
```
GPS_TRACKER: 📶 Connessione WiFi rilevata
GPS_TRACKER: 📱 Connessione SIM rilevata  
GPS_TRACKER: ✓ Posizione inviata a [server]
GPS_TRACKER: ❌ TUTTI I SERVER NON RAGGIUNGIBILI
```

## CONFIGURAZIONE RAPIDA

### 1. Trova il tuo IP pubblico
```bash
curl ifconfig.me
```

### 2. Configura Port Forwarding
- Router → Impostazioni → Port Forwarding
- Porta esterna: 3000
- IP interno: 10.169.33.149
- Porta interna: 3000

### 3. Modifica il codice
Nel file `GpsTracker.kt`, sostituisci:
```kotlin
"http://TUO-IP-PUBBLICO:3000/api/position"
```
con:
```kotlin
"http://[IL-TUO-IP-PUBBLICO]:3000/api/position"
```

### 4. Ricompila e installa l'app

## TROUBLESHOOTING

### Problema: "Server non raggiungibile"
- Verifica port forwarding attivo
- Controlla firewall router
- Testa con `curl` da esterno

### Problema: "Timeout connessione"
- IP pubblico cambiato (ricontrollare)
- Server GPS spento
- Porta 3000 bloccata da ISP

### Problema: "Solo WiFi funziona"
- Port forwarding non configurato
- IP pubblico errato nel codice
- Firewall blocca connessioni esterne

## MONITORAGGIO

### Dashboard GPS
- URL: http://[IP-PUBBLICO]:3000/dashboard
- Login: a.mastroianni / #U5r69cW123
- Controlla se entrambi i tablet appaiono

### Log Telegram
Il sistema invia notifiche Telegram quando:
- Tablet va offline
- Tablet torna online
- Verifica se ricevi notifiche per entrambi

## SICUREZZA

### Raccomandazioni:
1. **Cambia password admin** nel server.js
2. **Usa HTTPS** se possibile (certificato SSL)
3. **Limita accesso** solo agli IP necessari
4. **Monitora log** per accessi sospetti

## SUPPORTO

Se il problema persiste:
1. Controlla log completi Android
2. Verifica connettività rete
3. Testa server da browser esterno
4. Considera soluzione cloud