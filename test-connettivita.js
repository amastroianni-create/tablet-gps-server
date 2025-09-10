// TEST CONNETTIVITA SERVER GPS
// Esegui con: node test-connettivita.js

const http = require('http');
const https = require('https');

// CONFIGURAZIONE - Modifica questi IP
const SERVER_IPS = [
    '10.169.33.149',      // IP locale WiFi
    '192.168.1.100',      // IP alternativo locale  
    'TUO-IP-PUBBLICO'     // SOSTITUISCI con il tuo IP pubblico
];

const PORT = 3000;

console.log('🔍 TEST CONNETTIVITA SERVER GPS\n');

async function testServer(ip) {
    return new Promise((resolve) => {
        const url = `http://${ip}:${PORT}/api/tablets`;
        
        console.log(`📡 Testando: ${url}`);
        
        const req = http.get(url, { timeout: 5000 }, (res) => {
            console.log(`✅ ${ip}: RAGGIUNGIBILE (Status: ${res.statusCode})`);
            resolve({ ip, status: 'OK', code: res.statusCode });
        });
        
        req.on('timeout', () => {
            console.log(`⏰ ${ip}: TIMEOUT (5s)`);
            req.destroy();
            resolve({ ip, status: 'TIMEOUT' });
        });
        
        req.on('error', (err) => {
            console.log(`❌ ${ip}: ERRORE (${err.code || err.message})`);
            resolve({ ip, status: 'ERROR', error: err.code || err.message });
        });
    });
}

async function testAllServers() {
    console.log('Testando tutti i server...\n');
    
    const results = [];
    
    for (const ip of SERVER_IPS) {
        if (ip === 'TUO-IP-PUBBLICO') {
            console.log(`⚠️  ${ip}: CONFIGURAZIONE NECESSARIA - Sostituisci con IP pubblico reale`);
            continue;
        }
        
        const result = await testServer(ip);
        results.push(result);
        console.log(''); // Riga vuota
    }
    
    // Riepilogo
    console.log('📊 RIEPILOGO TEST:');
    console.log('==================');
    
    const working = results.filter(r => r.status === 'OK');
    const failed = results.filter(r => r.status !== 'OK');
    
    if (working.length > 0) {
        console.log('✅ SERVER FUNZIONANTI:');
        working.forEach(r => console.log(`   - ${r.ip}:${PORT}`));
    }
    
    if (failed.length > 0) {
        console.log('❌ SERVER NON RAGGIUNGIBILI:');
        failed.forEach(r => console.log(`   - ${r.ip}:${PORT} (${r.status})`));
    }
    
    console.log('\n🔧 RACCOMANDAZIONI:');
    
    if (working.length === 0) {
        console.log('❌ NESSUN SERVER RAGGIUNGIBILE!');
        console.log('   1. Verifica che il server GPS sia avviato');
        console.log('   2. Controlla firewall e port forwarding');
        console.log('   3. Verifica IP pubblico: curl ifconfig.me');
    } else if (working.some(r => r.ip.startsWith('10.') || r.ip.startsWith('192.'))) {
        console.log('📶 Server locale WiFi OK');
        console.log('📱 Per tablet SIM: configura port forwarding per IP pubblico');
    }
    
    console.log('\n📖 Leggi CONFIGURAZIONE-SERVER-GPS.md per istruzioni complete');
}

// Test connessione internet
async function testInternetConnection() {
    console.log('🌐 Testando connessione internet...');
    
    return new Promise((resolve) => {
        const req = https.get('https://www.google.com', { timeout: 3000 }, (res) => {
            console.log('✅ Connessione internet OK\n');
            resolve(true);
        });
        
        req.on('timeout', () => {
            console.log('❌ Connessione internet: TIMEOUT\n');
            req.destroy();
            resolve(false);
        });
        
        req.on('error', (err) => {
            console.log(`❌ Connessione internet: ${err.message}\n`);
            resolve(false);
        });
    });
}

// Esegui test
async function runTests() {
    const internetOK = await testInternetConnection();
    
    if (!internetOK) {
        console.log('⚠️  Problemi di connessione internet rilevati');
        console.log('   Verifica la connessione prima di continuare\n');
    }
    
    await testAllServers();
}

runTests().catch(console.error);