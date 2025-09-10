# 📱 GUIDA SETUP DEVICE OWNER - KIOSK APP
## ⚠️ **DA FARE UNA SOLA VOLTA PER OGNI TABLET**

---

## 🔄 **STEP 1: RIPRISTINO TABLET**
1. **Spegni tablet** completamente
2. **Impostazioni → Sistema → Ripristino → Cancella tutto (Reset di fabbrica)**
3. **Conferma ripristino** e aspetta il riavvio completo
4. **IMPORTANTE**: Il tablet deve essere completamente pulito

---

## 🛠️ **STEP 2: SETUP INIZIALE (CRITICO!)**
1. **Lingua**: Scegli Italiano
2. **WiFi**: Connetti alla rete WiFi
3. **⚠️ ACCOUNT GOOGLE**: **SALTA ASSOLUTAMENTE!** 
   - Tocca "Salta" o "Non ora" 
   - **NON aggiungere nessun account Google**
4. **Nome dispositivo**: Inserisci nome qualsiasi
5. **PIN/Password schermata**: Imposta o salta (a tua scelta)
6. **Termina setup** senza account Google

---

## 🔧 **STEP 3: ABILITA DEBUG USB**
1. **Impostazioni → Info tablet** (o "Info dispositivo")
2. **Trova "Numero build"** e **toccalo 7 volte consecutive**
3. **Apparirà messaggio**: "Ora sei uno sviluppatore"
4. **Torna indietro → Sistema → Opzioni sviluppatore**
5. **Debug USB → Attiva (ON)**
6. **Mantieni attivo durante ricarica → Attiva (ON)**

---

## 🔌 **STEP 4: CONNESSIONE PC**
1. **Collega tablet al PC** con cavo USB
2. **Sul tablet apparirà popup**: "Autorizzare debug USB?"
3. **✅ Spunta**: "Autorizza sempre da questo computer"
4. **✅ Tocca**: "OK"
5. **Se non appare popup**: scollega e ricollega cavo

---

## 📲 **STEP 5: INSTALLA APP**
1. **Apri Android Studio** sul PC
2. **Apri progetto** KioskWebApp
3. **Click pulsante verde "Run"** ▶️
4. **Seleziona il tablet** dalla lista dispositivi
5. **Aspetta installazione** completa (circa 1-2 minuti)

---

## 💻 **STEP 6: VERIFICA CONNESSIONE**
1. **Apri Prompt dei comandi** come Amministratore
2. **Vai alla cartella ADB**:
   ```
   cd "C:\Program Files (x86)\Minimal ADB and Fastboot"
   ```
3. **Verifica dispositivo**:
   ```
   adb devices
   ```
4. **Deve mostrare**: `[CODICE]    device` (non "offline" o "unauthorized")

---

## 🎯 **STEP 7: COMANDO DEVICE OWNER**
1. **Esegui comando**:
   ```
   adb shell dpm set-device-owner com.abbmusei.kioskwebapp/.MyDeviceAdminReceiver
   ```

2. **Risultato SUCCESS**:
   ```
   Success: Device owner set to package ComponentInfo{...}
   Active admin set to component {...}
   ```

3. **Se errore**: Verifica che non ci siano account Google configurati

---

## ✅ **STEP 8: TEST FINALE**
1. **Apri l'app** sul tablet
2. **Verifica kiosk mode**:
   - ❌ Nessun messaggio "tieni premuto indietro"
   - ❌ Status bar nascosta
   - ❌ Tasti Android non funzionano
   - ✅ Solo 3 pulsanti navigazione visibili

3. **Test admin panel**:
   - **7 click rapidi** angolo alto-sinistra
   - **Password**: `admin_mobile`
   - **Deve aprirsi pannello** amministratore

---

## 🚨 **TROUBLESHOOTING**

### **Errore "Unknown admin"**
- App non installata correttamente
- Reinstalla da Android Studio

### **Errore "device unauthorized"**
- Popup autorizzazione non accettato
- Scollega/ricollega cavo USB
- Disattiva/riattiva Debug USB

### **Errore "device offline"**
- Cavo USB difettoso
- Porta USB PC problematica
- Riavvia tablet e riprova

### **Errore "Accounts present"**
- Account Google configurato durante setup
- **DEVI RIPRISTINARE** tablet da capo

---

---

## 📦 **INSTALLAZIONI FUTURE (SENZA ANDROID STUDIO)**

### **METODO 1 - Da PC con ADB:**
```bash
cd "C:\Program Files (x86)\Minimal ADB and Fastboot"
adb install "percorso\app-debug.apk"
```

### **METODO 2 - Installazione Manuale:**
1. **Copia file** `app-debug.apk` su tablet (USB/email)
2. **Abilita "Origini sconosciute"** nelle impostazioni
3. **Tocca file APK** e installa
4. **App si attiva automaticamente** in kiosk mode

### **METODO 3 - Distribuzione Cloud:**
1. **Carica APK** su server/Google Drive
2. **Download** su tablet
3. **Installa** manualmente
4. **Kiosk automatico**

---

## 🔄 **AGGIORNAMENTI APP**
- **Nuova versione APK**: Installa sopra la vecchia
- **Device Owner**: Rimane attivo (non serve rifare setup)
- **Configurazioni**: Mantenute automaticamente

---

## 🎉 **SETUP COMPLETATO!**
**Il tablet è ora configurato come Device Owner.**
**L'app funzionerà in modalità kiosk indistruttibile.**
**Ripeti questa procedura per ogni nuovo tablet.**

---
**📞 Supporto**: Se hai problemi, controlla che il tablet sia completamente resettato e senza account Google.