const express = require('express');
const cors = require('cors');
const session = require('express-session');
const https = require('https');

const app = express();
const PORT = 3000;

let tablets = {};
let offlineTablets = new Set();

const TELEGRAM_BOT_TOKEN = '8304269650:AAEos-0Kj7zeNd-aSK19KAQpJ5nDTh7bjD4';
const TELEGRAM_CHAT_ID = '8383534834';
const OFFLINE_TIMEOUT = 30 * 1000;

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
    
    const now = new Date();
    
    for (const existingName in tablets) {
        const existing = tablets[existingName];
        const latDiff = Math.abs(existing.lat - parseFloat(lat));
        const lngDiff = Math.abs(existing.lng - parseFloat(lng));
        
        if (latDiff < 0.0001 && lngDiff < 0.0001 && existingName !== nome) {
            tablets[existingName] = {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                indirizzo: indirizzo || 'Posizione GPS',
                timestamp: now,
                online: true
            };
            console.log('📍 Aggiornato ' + existingName + ': ' + lat + ', ' + lng);
            return res.json({ success: true });
        }
    }
    
    tablets[nome] = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        indirizzo: indirizzo || 'Posizione GPS',
        timestamp: now,
        online: true
    };
    
    if (offlineTablets.has(nome)) {
        offlineTablets.delete(nome);
        
        const message = '\n✅ TABLET ONLINE\n\n📱 ' + nome + '\n📍 ' + (indirizzo || 'Posizione aggiornata') + '\n📊 ' + parseFloat(lat).toFixed(6) + ', ' + parseFloat(lng).toFixed(6) + '\n⏰ ' + now.toLocaleString('it-IT') + '\n\n🗺️ https://maps.google.com/maps?q=' + parseFloat(lat) + ',' + parseFloat(lng);
        
        sendTelegramAlert(message);
    }
    
    console.log('📍 ' + nome + ': ' + lat + ', ' + lng);
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
            online: (now - new Date(data.timestamp)) <= OFFLINE_TIMEOUT
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
    
    tablets[newName] = tablets[oldName];
    delete tablets[oldName];
    
    if (offlineTablets.has(oldName)) {
        offlineTablets.delete(oldName);
        offlineTablets.add(newName);
    }
    
    console.log('✏️ Tablet rinominato: ' + oldName + ' → ' + newName);
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
}, 30000);

app.listen(PORT, '0.0.0.0', function() {
    console.log('🚀 GPS Tracker Server: http://0.0.0.0:' + PORT);
    console.log('🔐 Login: a.mastroianni / #U5r69cW123');
});