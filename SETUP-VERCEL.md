# SETUP VERCEL PER GPS H24 7/7

## 🚀 DEPLOY SU VERCEL

### 1. Prepara il codice per Vercel
```bash
# Crea vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

### 2. Deploy automatico
```bash
# Collega GitHub a Vercel
# Push su GitHub -> Deploy automatico su Vercel
git add .
git commit -m "GPS H24 7/7 ottimizzato"
git push origin main
```

### 3. URL finali
- **SIM dati**: `https://tablet-gps-server.vercel.app/api/position`
- **WiFi locale**: `http://10.169.33.149:3000/api/position`

## ✅ VANTAGGI VERCEL
- **Sempre online** H24 7/7
- **HTTPS nativo** per SIM dati
- **Deploy automatico** da GitHub
- **Scalabilità automatica**
- **Nessun tunnel** da mantenere

L'app è già configurata per usare Vercel come server primario per SIM dati!