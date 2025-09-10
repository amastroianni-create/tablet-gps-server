const express = require('express');
const cors = require('cors');
const session = require('express-session');
const https = require('https');

const app = express();
const PORT = 3000;

let tablets = {};
let offlineTablets = new Set();
let tabletMapping = {}; // Mappa Android ID -> nome rinominato

// Carica mappatura salvata
try {
    const fs = require('fs');
    if (fs.existsSync('tablet-mapping.json')) {
        tabletMapping = JSON.parse(fs.readFileSync('tablet-mapping.json', 'utf8'));
        console.log('📋 Mappatura tablet caricata:', Object.keys(tabletMapping).length, 'rinominate');
    }
} catch (e) {
    console.log('⚠️ Errore caricamento mappatura:', e.message);
}

// Salva mappatura
function saveMapping() {
    try {
        const fs = require('fs');
        fs.writeFileSync('tablet-mapping.json', JSON.stringify(tabletMapping, null, 2));
    } catch (e) {
        console.log('⚠️ Errore salvataggio mappatura:', e.message);
    }
}

const TELEGRAM_BOT_TOKEN = '8304269650:AAEos-0Kj7zeNd-aSK19KAQpJ5nDTh7bjD4';
const TELEGRAM_CHAT_ID = '8383534834';
const OFFLINE_TIMEOUT = 120 * 1000; // 2 minuti per connessioni mobili lente

let users = {
    'a.mastroianni': '#U5r69cW123'
};

function sendTelegramAlert(message) {
    if (!TELEGRAM_BOT_TOKEN) return;
    
    const data = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
    });
    
    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: '/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    
    const req = https.request(options, function(res) {
        console.log('Telegram inviato');
    });
    
    req.on('error', function(error) {
        console.error('Errore Telegram:', error);
    });
    
    req.write(data);
    req.end();
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Crea dashboard.html se non esiste
try {
    const fs = require('fs');
    if (!fs.existsSync('public')) {
        fs.mkdirSync('public');
    }
    if (!fs.existsSync('public/dashboard.html')) {
        const dashboardHtml = `<!DOCTYPE html>
<html><head><title>GPS Tracker Dashboard</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>body{margin:0;font-family:Arial,sans-serif}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:15px;text-align:center}.container{display:flex;height:calc(100vh - 70px)}#map{flex:1}.sidebar{width:400px;background:white;box-shadow:-2px 0 10px rgba(0,0,0,0.1);overflow-y:auto}.panel{padding:20px;border-bottom:1px solid #eee}.tablet-item{margin:10px 0;padding:15px;border-radius:8px;cursor:pointer;transition:all 0.3s}.online{background:linear-gradient(135deg,#28a745 0%,#20c997 100%);color:white}.offline{background:linear-gradient(135deg,#dc3545 0%,#fd7e14 100%);color:white}.tablet-name{font-weight:bold;font-size:1.1em}.tablet-address{font-size:0.9em;opacity:0.9;margin:5px 0}.tablet-coords{font-size:0.8em;opacity:0.8;font-family:monospace}.tablet-time{font-size:0.8em;opacity:0.8;margin-top:5px}.btn{background:#667eea;color:white;border:none;padding:10px 15px;border-radius:5px;cursor:pointer;margin:5px}.btn-danger{background:#dc3545}.btn-warning{background:#fd7e14}.search-box{width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;margin-bottom:15px;font-size:16px}.tablet-actions{display:flex;gap:5px;margin-top:10px}.tablet-actions button{padding:5px 10px;font-size:12px}.modal{display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.5)}.modal-content{background:white;margin:15% auto;padding:20px;border-radius:10px;width:300px}.modal input{width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:5px;box-sizing:border-box}.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px}.stat-card{background:#f8f9fa;padding:15px;border-radius:8px;text-align:center}.stat-number{font-size:1.5em;font-weight:bold;color:#667eea}.user-item{padding:10px;margin:5px 0;background:#f8f9fa;border-radius:5px;display:flex;justify-content:space-between;align-items:center}</style></head><body><div class="header"><h1>📱 GPS Tracker Dashboard</h1></div><div class="container"><div id="map"></div><div class="sidebar"><div class="panel"><h3>📊 Statistiche</h3><div class="stats"><div class="stat-card"><div class="stat-number" id="online-count">0</div><div>Online</div></div><div class="stat-card"><div class="stat-number" id="total-count">0</div><div>Totale</div></div></div></div><div class="panel"><h3>🔍 Ricerca Tablet</h3><input type="text" id="search-box" class="search-box" placeholder="Cerca tablet..." oninput="searchTablets()"></div><div class="panel"><h3>📱 Tablet</h3><div id="tablet-list"></div></div><div class="panel"><h3>👥 Gestione Utenti</h3><button class="btn" onclick="showUsersModal()">👥 Utenti</button> <button class="btn" onclick="showAddUserModal()">➕ Aggiungi</button></div><div class="panel"><button class="btn" onclick="updateMap()">🔄 Aggiorna</button> <button class="btn" onclick="centerMap()">🎯 Centra</button> <button class="btn" onclick="window.location.href='/login'">🚪 Logout</button></div></div></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="dashboard.js"></script></body></html>`;
        fs.writeFileSync('public/dashboard.html', dashboardHtml);
    }
} catch (e) {
    console.log('⚠️ Errore creazione dashboard:', e.message);
}
app.use(session({
    secret: 'tablet-tracker-secret',
    resave: false,
    saveUninitialized: false
}));

function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.post('/api/position', function(req, res) {
    const nome = req.body.nome;
    const lat = req.body.lat;
    const lng = req.body.lng;
    const indirizzo = req.body.indirizzo;
    const batteria = req.body.batteria || 'N/A';
    const connessione = req.body.connessione || 'Unknown';
    
    const now = new Date();
    
    // Controlla se questo Android ID è stato rinominato
    const mappedName = tabletMapping[nome];
    const finalName = mappedName || nome;
    
    // Aggiorna il tablet (esistente o nuovo)
    tablets[finalName] = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        indirizzo: indirizzo || 'Posizione GPS',
        timestamp: now,
        online: true,
        batteria: batteria,
        connessione: connessione
    };
    
    if (offlineTablets.has(finalName)) {
        offlineTablets.delete(finalName);
        
        const message = '\n✅ TABLET ONLINE\n\n📱 ' + finalName + '\n📍 ' + (indirizzo || 'Posizione aggiornata') + '\n📊 ' + parseFloat(lat).toFixed(6) + ', ' + parseFloat(lng).toFixed(6) + '\n🔋 Batteria: ' + batteria + '%\n📶 ' + connessione + '\n⏰ ' + now.toLocaleString('it-IT') + '\n\n🗺️ https://maps.google.com/maps?q=' + parseFloat(lat) + ',' + parseFloat(lng);
        
        sendTelegramAlert(message);
    }
    
    console.log('📍 ' + finalName + ': ' + lat + ', ' + lng + ' | 🔋' + batteria + '% | 📶' + connessione);
    res.json({ success: true });
});

app.get('/api/positions', function(req, res) {
    const now = new Date();
    const positions = [];
    
    for (const nome in tablets) {
        const data = tablets[nome];
        positions.push({
            nome: nome,
            lat: data.lat,
            lng: data.lng,
            indirizzo: data.indirizzo,
            timestamp: data.timestamp,
            online: (now - new Date(data.timestamp)) <= OFFLINE_TIMEOUT,
            batteria: data.batteria || 'N/A',
            connessione: data.connessione || 'Unknown'
        });
    }
    
    res.json(positions);
});

app.post('/api/rename-tablet', function(req, res) {
    const oldName = req.body.oldName;
    const newName = req.body.newName;
    
    if (!oldName || !newName) {
        return res.status(400).json({ success: false, message: 'Nome vecchio e nuovo richiesti' });
    }
    
    if (!tablets[oldName]) {
        return res.status(404).json({ success: false, message: 'Tablet non trovato' });
    }
    
    if (tablets[newName]) {
        return res.status(400).json({ success: false, message: 'Nome già esistente' });
    }
    
    // Trova l'Android ID originale per questo tablet
    let originalAndroidId = null;
    for (const androidId in tabletMapping) {
        if (tabletMapping[androidId] === oldName) {
            originalAndroidId = androidId;
            break;
        }
    }
    
    // Se non trovato nella mappa, il nome attuale è l'Android ID originale
    if (!originalAndroidId) {
        originalAndroidId = oldName;
    }
    
    // Aggiorna la mappa di rinomina
    tabletMapping[originalAndroidId] = newName;
    saveMapping(); // Salva su file
    
    // Rinomina il tablet
    tablets[newName] = tablets[oldName];
    delete tablets[oldName];
    
    if (offlineTablets.has(oldName)) {
        offlineTablets.delete(oldName);
        offlineTablets.add(newName);
    }
    
    console.log('✏️ Tablet rinominato: ' + oldName + ' → ' + newName + ' (Android ID: ' + originalAndroidId + ')');
    res.json({ success: true, message: 'Tablet rinominato' });
});

app.delete('/api/remove-tablet/:name', function(req, res) {
    const tabletName = decodeURIComponent(req.params.name);
    
    if (!tablets[tabletName]) {
        return res.status(404).json({ success: false, message: 'Tablet non trovato' });
    }
    
    delete tablets[tabletName];
    offlineTablets.delete(tabletName);
    
    console.log('🗑️ Tablet rimosso: ' + tabletName);
    res.json({ success: true, message: 'Tablet rimosso' });
});

app.get('/api/users', requireAuth, function(req, res) {
    res.json(users);
});

app.post('/api/users', requireAuth, function(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username e password richiesti' });
    }
    
    if (users[username]) {
        return res.status(400).json({ success: false, message: 'Utente già esistente' });
    }
    
    users[username] = password;
    console.log('👥 Nuovo utente aggiunto: ' + username);
    res.json({ success: true, message: 'Utente aggiunto' });
});

app.delete('/api/users/:username', requireAuth, function(req, res) {
    const username = req.params.username;
    
    if (username === 'a.mastroianni') {
        return res.status(400).json({ success: false, message: 'Non puoi rimuovere l\'admin' });
    }
    
    if (!users[username]) {
        return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }
    
    delete users[username];
    console.log('🗑️ Utente rimosso: ' + username);
    res.json({ success: true, message: 'Utente rimosso' });
});

app.get('/login', function(req, res) {
    res.send('<!DOCTYPE html><html><head><title>GPS Tracker - Login</title><meta charset="utf-8"><style>body{margin:0;font-family:Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);height:100vh;display:flex;align-items:center;justify-content:center}.login{background:white;padding:40px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);width:100%;max-width:400px}.login h1{text-align:center;color:#333;margin:0 0 30px 0}.form-group{margin-bottom:20px}.form-group label{display:block;margin-bottom:5px;color:#333;font-weight:bold}.form-group input{width:100%;padding:12px;border:2px solid #ddd;border-radius:5px;font-size:16px;box-sizing:border-box}.login-btn{width:100%;padding:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:5px;font-size:16px;cursor:pointer}.error{color:#e74c3c;text-align:center;margin-top:15px;display:none}</style></head><body><div class="login"><h1>🔐 GPS Tracker</h1><form id="loginForm"><div class="form-group"><label>Username:</label><input type="text" id="username" required></div><div class="form-group"><label>Password:</label><input type="password" id="password" required></div><button type="submit" class="login-btn">Accedi</button></form><div id="error" class="error">❌ Credenziali non valide</div></div><script>document.getElementById("loginForm").addEventListener("submit",function(e){e.preventDefault();var username=document.getElementById("username").value;var password=document.getElementById("password").value;fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:username,password:password})}).then(function(response){if(response.ok){window.location.href="/dashboard"}else{document.getElementById("error").style.display="block"}}).catch(function(error){document.getElementById("error").style.display="block"})})</script></body></html>');
});

app.post('/api/login', function(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    
    if (users[username] && users[username] === password) {
        req.session.authenticated = true;
        req.session.username = username;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/dashboard', requireAuth, function(req, res) {
    res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/', function(req, res) {
    if (req.session.authenticated) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/admin', requireAuth, function(req, res) {
    res.redirect('/dashboard');
});

setInterval(function() {
    const now = new Date();
    
    for (const nome in tablets) {
        const data = tablets[nome];
        const lastSeen = new Date(data.timestamp);
        const timeDiff = now - lastSeen;
        
        if (timeDiff > OFFLINE_TIMEOUT && !offlineTablets.has(nome)) {
            offlineTablets.add(nome);
            tablets[nome].online = false;
            
            const message = '\n🔴 TABLET OFFLINE\n\n📱 ' + nome + '\n📍 Ultima posizione: ' + data.indirizzo + '\n📊 ' + data.lat.toFixed(6) + ', ' + data.lng.toFixed(6) + '\n⏰ Ultimo aggiornamento: ' + lastSeen.toLocaleString('it-IT') + '\n\n🗺️ https://maps.google.com/maps?q=' + data.lat + ',' + data.lng;
            
            sendTelegramAlert(message);
        }
    }
}, 60000); // Check ogni minuto per risparmiare risorse



app.listen(PORT, '0.0.0.0', function() {
    console.log('🚀 GPS Tracker Server: http://0.0.0.0:' + PORT);
    console.log('🔐 Login: a.mastroianni / #U5r69cW123');

});