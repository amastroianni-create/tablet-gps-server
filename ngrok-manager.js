const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let ngrokProcess = null;
let currentUrl = null;

function startNgrok() {
    console.log('🚀 Avvio ngrok...');
    
    ngrokProcess = spawn('ngrok', ['http', '10.169.33.149:3000'], {
        stdio: 'pipe'
    });
    
    ngrokProcess.stdout.on('data', (data) => {
        console.log('ngrok:', data.toString());
    });
    
    ngrokProcess.stderr.on('data', (data) => {
        console.error('ngrok error:', data.toString());
    });
    
    ngrokProcess.on('close', (code) => {
        console.log('❌ ngrok chiuso, riavvio in 5 secondi...');
        setTimeout(startNgrok, 5000);
    });
    
    // Aspetta 3 secondi poi ottieni URL
    setTimeout(getNgrokUrl, 3000);
}

function getNgrokUrl() {
    const options = {
        hostname: 'localhost',
        port: 4040,
        path: '/api/tunnels',
        method: 'GET'
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const tunnels = JSON.parse(data);
                if (tunnels.tunnels && tunnels.tunnels.length > 0) {
                    const newUrl = tunnels.tunnels[0].public_url;
                    
                    if (newUrl !== currentUrl) {
                        currentUrl = newUrl;
                        console.log('✅ Nuovo URL ngrok:', currentUrl);
                        updateServerConfig(currentUrl);
                    }
                }
            } catch (e) {
                console.error('Errore parsing ngrok API:', e.message);
            }
        });
    });
    
    req.on('error', (err) => {
        console.error('Errore connessione ngrok API:', err.message);
        setTimeout(getNgrokUrl, 5000);
    });
    
    req.end();
}

function updateServerConfig(url) {
    // Salva URL in file per il server GPS
    const config = {
        ngrokUrl: url,
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('ngrok-config.json', JSON.stringify(config, null, 2));
    console.log('📝 Configurazione salvata in ngrok-config.json');
}

// Controlla URL ogni 30 secondi
setInterval(getNgrokUrl, 30000);

// Avvia ngrok
startNgrok();

console.log('🎯 Ngrok Manager avviato con PM2');
console.log('📊 Monitoraggio ogni 30 secondi');