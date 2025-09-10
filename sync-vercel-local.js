// Sincronizza dati da Vercel al server locale
const fetch = require('node-fetch');

const VERCEL_URL = 'https://tablet-gps-server.vercel.app/api/tablets';
const LOCAL_URL = 'http://10.169.33.149:3000/api/position';

async function syncData() {
    try {
        // Ottieni dati da Vercel
        const response = await fetch(VERCEL_URL);
        const tablets = await response.json();
        
        // Invia ogni tablet al server locale
        for (const [nome, data] of Object.entries(tablets)) {
            if (data.isOnline) {
                await fetch(LOCAL_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nome: nome,
                        lat: data.lat,
                        lng: data.lng,
                        indirizzo: data.indirizzo,
                        batteria: data.batteria
                    })
                });
                console.log(`✓ Sincronizzato ${nome}`);
            }
        }
    } catch (error) {
        console.error('Errore sync:', error.message);
    }
}

// Sincronizza ogni 30 secondi
setInterval(syncData, 30000);
console.log('🔄 Sync Vercel→Locale avviato');