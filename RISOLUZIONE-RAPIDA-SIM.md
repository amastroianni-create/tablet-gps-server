# 🚨 RISOLUZIONE RAPIDA - TABLET SIM NON VISIBILE

## PROBLEMA
Il tablet con SIM non appare sulla mappa GPS perché non riesce a raggiungere il server locale.

## CAUSA
- **Server GPS**: IP locale `10.169.33.149:3000` 
- **Tablet WiFi**: Stesso network locale ✅
- **Tablet SIM**: Rete mobile diversa ❌

## SOLUZIONE IMMEDIATA (5 MINUTI)

### 1. Trova il tuo IP pubblico
```bash
# Da PC/server, apri terminale:
curl ifconfig.me
# Esempio output: 93.45.123.67
```

### 2. Configura Port Forwarding
**Router/Modem:**
- Accedi: `192.168.1.1` o `10.0.0.1`
- Vai a: **Port Forwarding** / **Virtual Server**
- Aggiungi regola:
  - **Porta esterna**: 3000
  - **IP interno**: 10.169.33.149  
  - **Porta interna**: 3000
  - **Protocollo**: TCP
- **Salva** e **Riavvia router**

### 3. Modifica codice Android
**File**: `GpsTracker.kt` (riga ~12)

**PRIMA:**
```kotlin
"http://TUO-IP-PUBBLICO:3000/api/position"
```

**DOPO:**
```kotlin
"http://93.45.123.67:3000/api/position"  // Usa il TUO IP
```

### 4. Ricompila app
```bash
# Android Studio
Build → Clean Project
Build → Rebuild Project
Run → Install APK
```

### 5. Test immediato
```bash
# Da PC esterno (non sulla stessa rete):
curl http://93.45.123.67:3000/api/tablets

# Dovrebbe rispondere con lista tablet
```

## VERIFICA FUNZIONAMENTO

### Dashboard GPS
- Apri: `http://[TUO-IP-PUBBLICO]:3000/dashboard`
- Login: `a.mastroianni` / `#U5r69cW123`
- **Risultato atteso**: Entrambi i tablet visibili

### Log Android
Cerca nei log:
```
GPS_TRACKER: 📱 Connessione SIM rilevata
GPS_TRACKER: ✓ Posizione inviata a http://[IP]:3000
```

## TROUBLESHOOTING RAPIDO

### ❌ "Server non raggiungibile"
1. **Port forwarding non attivo**
   - Ricontrolla configurazione router
   - Riavvia router
   
2. **IP pubblico cambiato**
   - Ricontrolla: `curl ifconfig.me`
   - Aggiorna codice se diverso

3. **Firewall blocca porta 3000**
   - Disabilita temporaneamente firewall
   - Aggiungi eccezione per porta 3000

### ❌ "Solo tablet WiFi visibile"
- Port forwarding non configurato correttamente
- IP pubblico errato nel codice
- Server GPS spento

### ❌ "Nessun tablet visibile"
- Server GPS non avviato
- Controllare: `node server.js`

## TEST RAPIDO CONNETTIVITA

### Script automatico:
```bash
# Esegui nella cartella progetto:
node test-connettivita.js
```

### Test manuale:
```bash
# Test server locale (da WiFi):
curl http://10.169.33.149:3000/api/tablets

# Test server pubblico (da SIM):
curl http://[TUO-IP-PUBBLICO]:3000/api/tablets
```

## CONFIGURAZIONE ROUTER COMUNI

### **TP-Link**
1. `192.168.1.1` → Advanced → NAT Forwarding → Virtual Servers
2. Add → Service Port: 3000, Internal Port: 3000, IP: 10.169.33.149

### **Netgear**  
1. `192.168.1.1` → Dynamic DNS → Port Forwarding
2. Add → External Port: 3000, Internal Port: 3000, IP: 10.169.33.149

### **Fritz!Box**
1. `192.168.178.1` → Internet → Freigaben → Portfreigaben
2. Neue Freigabe → Port: 3000, IP: 10.169.33.149

### **Vodafone Station**
1. `192.168.1.1` → Avanzate → Port Forwarding  
2. Aggiungi → Porta: 3000, IP: 10.169.33.149

## SICUREZZA

⚠️ **IMPORTANTE**: Port forwarding espone il server a internet

**Raccomandazioni:**
1. Cambia password admin nel `server.js`
2. Usa IP whitelist se possibile
3. Monitora log per accessi sospetti
4. Considera VPN come alternativa

## SUPPORTO

Se il problema persiste dopo questi passaggi:

1. **Verifica log completi** Android Studio
2. **Test da rete esterna** (hotspot mobile)
3. **Controlla ISP** (alcuni bloccano porte)
4. **Considera hosting cloud** per server GPS

---

**Tempo stimato risoluzione**: 5-10 minuti  
**Difficoltà**: Facile (configurazione router)  
**Risultato**: Entrambi i tablet visibili su mappa GPS