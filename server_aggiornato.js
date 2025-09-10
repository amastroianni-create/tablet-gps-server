const express = require('express');
const cors = require('cors');
const session = require('express-session');
const https = require('https');

const app = express();
const PORT = 3000;

let tablets = {};
let offlineTablets = new Set();
let tabletMapping = {};
let remoteControlRequests = {};


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

// API AGGIORNATA CON BATTERIA E CONNESSIONE
app.post('/api/position', function(req, res) {
    const nome = req.body.nome;
    const lat = req.body.lat;
    const lng = req.body.lng;
    const indirizzo = req.body.indirizzo;
    const batteria = req.body.batteria || 0;
    const connessione = req.body.connessione || 'Unknown';
    
    const now = new Date();
    
    const mappedName = tabletMapping[nome];
    const finalName = mappedName || nome;
    
    tablets[finalName] = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        indirizzo: indirizzo || 'Posizione GPS',
        timestamp: now,
        online: true,
        batteria: parseInt(batteria),
        connessione: connessione
    };
    
    if (offlineTablets.has(finalName)) {
        offlineTablets.delete(finalName);
        
        const message = '\\n✅ TABLET ONLINE\\n\\n📱 ' + finalName + '\\n📍 ' + (indirizzo || 'Posizione aggiornata') + '\\n🔋 ' + batteria + '% | ' + connessione + '\\n📊 ' + parseFloat(lat).toFixed(6) + ', ' + parseFloat(lng).toFixed(6) + '\\n⏰ ' + now.toLocaleString('it-IT') + '\\n\\n🗺️ https://maps.google.com/maps?q=' + parseFloat(lat) + ',' + parseFloat(lng);
        
        sendTelegramAlert(message);
    }
    
    console.log('📍 ' + finalName + ': ' + lat + ', ' + lng + ' | 🔋' + batteria + '% | ' + connessione);
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
            batteria: data.batteria || 0,
            connessione: data.connessione || 'Unknown'
        });
    }
    
    res.json(positions);
});

// API CONTROLLO REMOTO
app.post('/api/request-remote-control/:tabletId', function(req, res) {
    const tabletId = req.params.tabletId;
    
    remoteControlRequests[tabletId] = {
        timestamp: new Date(),
        status: 'pending'
    };
    
    console.log('🎮 Richiesta controllo remoto per: ' + tabletId);
    res.json({ success: true, message: 'Richiesta inviata' });
});

app.get('/api/remote-control/:tabletId', function(req, res) {
    const tabletId = req.params.tabletId;
    const request = remoteControlRequests[tabletId];
    
    if (request && request.status === 'pending') {
        res.json({ requestPending: true, timestamp: request.timestamp });
    } else {
        res.json({ requestPending: false });
    }
});

// API SUONO
app.post('/api/play-sound/:tabletId', function(req, res) {
    const tabletId = req.params.tabletId;
    
    console.log('🔊 Richiesta suono per tablet: ' + tabletId);
    res.json({ success: true, message: 'Comando suono inviato' });
});

// Resto delle API esistenti...
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
    
    let originalAndroidId = null;
    for (const androidId in tabletMapping) {
        if (tabletMapping[androidId] === oldName) {
            originalAndroidId = androidId;
            break;
        }
    }
    
    if (!originalAndroidId) {
        originalAndroidId = oldName;
    }
    
    tabletMapping[originalAndroidId] = newName;
    saveMapping();
    
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

// DASHBOARD AGGIORNATA CON BATTERIA E CONTROLLI
app.get('/dashboard', requireAuth, function(req, res) {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>GPS Tracker Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <style>
        body{margin:0;font-family:Arial,sans-serif}
        .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:15px;text-align:center}
        .container{display:flex;height:calc(100vh - 70px)}
        #map{flex:1}
        .sidebar{width:400px;background:white;box-shadow:-2px 0 10px rgba(0,0,0,0.1);overflow-y:auto}
        .panel{padding:20px;border-bottom:1px solid #eee}
        .tablet-item{margin:10px 0;padding:15px;border-radius:8px;cursor:pointer;transition:all 0.3s}
        .online{background:linear-gradient(135deg,#28a745 0%,#20c997 100%);color:white}
        .offline{background:linear-gradient(135deg,#dc3545 0%,#fd7e14 100%);color:white}
        .tablet-name{font-weight:bold;font-size:1.1em}
        .tablet-address{font-size:0.9em;opacity:0.9;margin:5px 0}
        .tablet-coords{font-size:0.8em;opacity:0.8;font-family:monospace}
        .tablet-time{font-size:0.8em;opacity:0.8;margin-top:5px}
        .btn{background:#667eea;color:white;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;margin:2px;font-size:11px}
        .btn-danger{background:#dc3545}
        .btn-warning{background:#fd7e14}
        .btn-success{background:#28a745}
        .btn-info{background:#17a2b8}
        .search-box{width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;margin-bottom:15px;font-size:16px}
        .tablet-actions{display:flex;gap:3px;margin-top:10px;flex-wrap:wrap}
        .modal{display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.5)}
        .modal-content{background:white;margin:15% auto;padding:20px;border-radius:10px;width:300px}
        .modal input{width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:5px;box-sizing:border-box}
        .stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px}
        .stat-card{background:#f8f9fa;padding:15px;border-radius:8px;text-align:center}
        .stat-number{font-size:1.5em;font-weight:bold;color:#667eea}
        .user-item{padding:10px;margin:5px 0;background:#f8f9fa;border-radius:5px;display:flex;justify-content:space-between;align-items:center}
    </style>
</head>
<body>
    <div class="header">
        <h1>📱 GPS Tracker Dashboard - Controllo Avanzato</h1>
    </div>
    <div class="container">
        <div id="map"></div>
        <div class="sidebar">
            <div class="panel">
                <h3>📊 Statistiche</h3>
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-number" id="online-count">0</div>
                        <div>Online</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="total-count">0</div>
                        <div>Totale</div>
                    </div>
                </div>
            </div>
            <div class="panel">
                <h3>🔍 Ricerca Tablet</h3>
                <input type="text" id="search-box" class="search-box" placeholder="Cerca tablet..." oninput="searchTablets()">
            </div>
            <div class="panel">
                <h3>📱 Tablet</h3>
                <div id="tablet-list"></div>
            </div>
            <div class="panel">
                <h3>👥 Gestione Utenti</h3>
                <button class="btn" onclick="showUsersModal()">👥 Utenti</button>
                <button class="btn" onclick="showAddUserModal()">➕ Aggiungi</button>
            </div>
            <div class="panel">
                <button class="btn" onclick="updateMap()">🔄 Aggiorna</button>
                <button class="btn" onclick="centerMap()">🎯 Centra</button>
                <button class="btn" onclick="window.location.href='/login'">🚪 Logout</button>
            </div>
        </div>
    </div>

    <!-- Modali esistenti -->
    <div id="renameModal" class="modal">
        <div class="modal-content">
            <h3>✏️ Rinomina Tablet</h3>
            <input type="text" id="oldName" placeholder="Nome attuale" readonly style="background:#f5f5f5;color:#666;">
            <input type="text" id="newName" placeholder="Nuovo nome">
            <button class="btn" onclick="renameTablet()">Rinomina</button>
            <button class="btn" onclick="closeModal('renameModal')">Annulla</button>
        </div>
    </div>

    <div id="removeModal" class="modal">
        <div class="modal-content">
            <h3>🗑️ Rimuovi Tablet</h3>
            <input type="text" id="removeName" placeholder="Nome tablet da rimuovere">
            <button class="btn btn-danger" onclick="removeTablet()">Rimuovi</button>
            <button class="btn" onclick="closeModal('removeModal')">Annulla</button>
        </div>
    </div>

    <div id="usersModal" class="modal">
        <div class="modal-content">
            <h3>👥 Utenti Sistema</h3>
            <div id="usersList"></div>
            <button class="btn" onclick="closeModal('usersModal')">Chiudi</button>
        </div>
    </div>

    <div id="addUserModal" class="modal">
        <div class="modal-content">
            <h3>➕ Aggiungi Utente</h3>
            <input type="text" id="newUsername" placeholder="Nome utente">
            <input type="password" id="newPassword" placeholder="Password">
            <button class="btn" onclick="addUser()">Aggiungi</button>
            <button class="btn" onclick="closeModal('addUserModal')">Annulla</button>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var map = L.map('map').setView([45.0703, 7.6869], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        var markers = {};
        var tabletsData = [];
        var filteredTablets = [];
        
        var onlineIcon = L.divIcon({
            html: '<div style="background:#28a745;width:24px;height:24px;border-radius:50%;border:4px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">📱</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        
        var offlineIcon = L.divIcon({
            html: '<div style="background:#dc3545;width:24px;height:24px;border-radius:50%;border:4px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">❌</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        function updateMap() {
            fetch('/api/positions')
                .then(response => response.json())
                .then(tablets => {
                    tabletsData = tablets;
                    
                    // Rimuovi marker esistenti
                    Object.values(markers).forEach(marker => map.removeLayer(marker));
                    markers = {};
                    
                    // Aggiorna statistiche
                    var online = tablets.filter(t => t.online).length;
                    document.getElementById('online-count').textContent = online;
                    document.getElementById('total-count').textContent = tablets.length;
                    
                    // Aggiungi marker con info batteria
                    tablets.forEach(tablet => {
                        var icon = tablet.online ? onlineIcon : offlineIcon;
                        var batteryColor = tablet.batteria > 50 ? '#22c55e' : tablet.batteria > 20 ? '#f59e0b' : '#ef4444';
                        var connectionIcon = tablet.connessione === 'WiFi' ? '📶' : tablet.connessione === 'SIM' ? '📱' : '❓';
                        
                        var popupContent = 
                            '<div><h3>' + tablet.nome + '</h3>' +
                            '<div><strong>📍 ' + tablet.indirizzo + '</strong></div>' +
                            '<div>📊 ' + tablet.lat.toFixed(6) + ', ' + tablet.lng.toFixed(6) + '</div>' +
                            '<div>🔋 <span style="color:' + batteryColor + '">' + tablet.batteria + '%</span> | ' + connectionIcon + ' ' + tablet.connessione + '</div>' +
                            '<div>🕒 ' + new Date(tablet.timestamp).toLocaleString('it-IT') + '</div>' +
                            '<div><strong style="color:' + (tablet.online ? '#28a745' : '#dc3545') + '">' + (tablet.online ? '🟢 Online' : '🔴 Offline') + '</strong></div>' +
                            '<div style="margin-top:10px">' +
                            '<button onclick="playSound(\'' + tablet.nome + '\')" style="background:#3b82f6;color:white;border:none;padding:5px 10px;margin:2px;border-radius:3px;cursor:pointer">🔊 Suona</button>' +
                            '<button onclick="requestRemoteControl(\'' + tablet.nome + '\')" style="background:#8b5cf6;color:white;border:none;padding:5px 10px;margin:2px;border-radius:3px;cursor:pointer">🎮 Controllo</button>' +
                            '</div></div>';
                        
                        var marker = L.marker([tablet.lat, tablet.lng], {icon: icon})
                            .addTo(map)
                            .bindPopup(popupContent);
                        
                        markers[tablet.nome] = marker;
                    });
                    
                    filteredTablets = tablets;
                    displayTablets(filteredTablets);
                    
                    var searchText = document.getElementById('search-box').value;
                    if (searchText) {
                        searchTablets();
                    }
                    
                    centerMap();
                })
                .catch(error => console.error('Errore:', error));
        }

        function displayTablets(tablets) {
            var tabletList = document.getElementById('tablet-list');
            tabletList.innerHTML = '';
            
            tablets.forEach(tablet => {
                var item = document.createElement('div');
                item.className = 'tablet-item ' + (tablet.online ? 'online' : 'offline');
                
                var batteryColor = tablet.batteria > 50 ? '#22c55e' : tablet.batteria > 20 ? '#f59e0b' : '#ef4444';
                var connectionIcon = tablet.connessione === 'WiFi' ? '📶' : tablet.connessione === 'SIM' ? '📱' : '❓';
                
                item.innerHTML = 
                    '<div class="tablet-name">' + tablet.nome + '</div>' +
                    '<div class="tablet-address">📍 ' + tablet.indirizzo + '</div>' +
                    '<div class="tablet-coords">📊 ' + tablet.lat.toFixed(6) + ', ' + tablet.lng.toFixed(6) + '</div>' +
                    '<div style="color:' + batteryColor + '">🔋 ' + tablet.batteria + '% | ' + connectionIcon + ' ' + tablet.connessione + '</div>' +
                    '<div class="tablet-time">🕒 ' + new Date(tablet.timestamp).toLocaleString('it-IT') + '</div>' +
                    '<div class="tablet-actions">' +
                    '<button class="btn" onclick="focusTablet(\'' + tablet.nome + '\')">🎯 Vai</button>' +
                    '<button class="btn btn-info" onclick="playSound(\'' + tablet.nome + '\')">🔊 Suona</button>' +
                    '<button class="btn btn-success" onclick="requestRemoteControl(\'' + tablet.nome + '\')">🎮 Controllo</button>' +
                    '<button class="btn btn-warning" onclick="quickRename(\'' + tablet.nome + '\')">✏️</button>' +
                    '<button class="btn btn-danger" onclick="quickRemove(\'' + tablet.nome + '\')">🗑️</button>' +
                    '</div>';
                
                tabletList.appendChild(item);
            });
        }

        // NUOVE FUNZIONI CONTROLLO REMOTO
        function playSound(tabletName) {
            fetch('/api/play-sound/' + encodeURIComponent(tabletName), {
                method: 'POST'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('🔊 Comando suono inviato a ' + tabletName);
                } else {
                    alert('❌ Errore invio comando');
                }
            })
            .catch(error => {
                alert('❌ Errore connessione');
            });
        }

        function requestRemoteControl(tabletName) {
            if (!confirm('Richiedere controllo remoto di "' + tabletName + '"?')) {
                return;
            }
            
            fetch('/api/request-remote-control/' + encodeURIComponent(tabletName), {
                method: 'POST'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('🎮 Richiesta controllo remoto inviata a ' + tabletName + '\\n\\nAttendi che l\\'utente accetti la richiesta.');
                } else {
                    alert('❌ Errore invio richiesta');
                }
            })
            .catch(error => {
                alert('❌ Errore connessione');
            });
        }

        // Funzioni esistenti...
        function searchTablets() {
            var searchText = document.getElementById('search-box').value.toLowerCase();
            if (searchText === '') {
                filteredTablets = tabletsData;
            } else {
                filteredTablets = tabletsData.filter(tablet => 
                    tablet.nome.toLowerCase().includes(searchText) || 
                    tablet.indirizzo.toLowerCase().includes(searchText)
                );
            }
            displayTablets(filteredTablets);
        }

        function focusTablet(nome) {
            var tablet = tabletsData.find(t => t.nome === nome);
            if (tablet && markers[nome]) {
                map.setView([tablet.lat, tablet.lng], 16);
                markers[nome].openPopup();
            }
        }

        function showUsersModal() {
            loadUsers();
            document.getElementById('usersModal').style.display = 'block';
        }

        function showAddUserModal() {
            document.getElementById('addUserModal').style.display = 'block';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        function quickRename(nome) {
            document.getElementById('oldName').value = nome;
            document.getElementById('newName').value = '';
            document.getElementById('renameModal').style.display = 'block';
        }

        function quickRemove(nome) {
            document.getElementById('removeName').value = nome;
            document.getElementById('removeModal').style.display = 'block';
        }

        function renameTablet() {
            var oldName = document.getElementById('oldName').value;
            var newName = document.getElementById('newName').value;
            
            if (!oldName || !newName) {
                alert('Inserisci entrambi i nomi');
                return;
            }
            
            fetch('/api/rename-tablet', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({oldName: oldName, newName: newName})
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('✅ Tablet rinominato!');
                    closeModal('renameModal');
                    updateMap();
                } else {
                    alert('❌ ' + result.message);
                }
            })
            .catch(error => {
                alert('❌ Errore rinomina');
            });
        }

        function removeTablet() {
            var tabletName = document.getElementById('removeName').value;
            
            if (!tabletName) {
                alert('Inserisci il nome del tablet');
                return;
            }
            
            if (!confirm('Sei sicuro di voler rimuovere "' + tabletName + '"?')) {
                return;
            }
            
            fetch('/api/remove-tablet/' + encodeURIComponent(tabletName), {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('🗑️ Tablet rimosso!');
                    closeModal('removeModal');
                    updateMap();
                } else {
                    alert('❌ ' + result.message);
                }
            })
            .catch(error => {
                alert('❌ Errore rimozione');
            });
        }

        function loadUsers() {
            fetch('/api/users')
                .then(response => response.json())
                .then(users => {
                    var usersList = document.getElementById('usersList');
                    usersList.innerHTML = '';
                    
                    Object.entries(users).forEach(([username, password]) => {
                        var userItem = document.createElement('div');
                        userItem.className = 'user-item';
                        var isAdmin = username === 'a.mastroianni';
                        
                        userItem.innerHTML = 
                            '<div><strong>' + username + '</strong> ' + (isAdmin ? '(Admin)' : '') + 
                            '<br><small>Password: ' + password + '</small></div>' +
                            (!isAdmin ? '<button class="btn btn-danger" onclick="removeUser(\'' + username + '\')">🗑️</button>' : '');
                        
                        usersList.appendChild(userItem);
                    });
                })
                .catch(error => {
                    alert('❌ Errore caricamento utenti');
                });
        }

        function addUser() {
            var username = document.getElementById('newUsername').value;
            var password = document.getElementById('newPassword').value;
            
            if (!username || !password) {
                alert('Inserisci username e password');
                return;
            }
            
            fetch('/api/users', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: username, password: password})
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('✅ Utente aggiunto!');
                    closeModal('addUserModal');
                    document.getElementById('newUsername').value = '';
                    document.getElementById('newPassword').value = '';
                } else {
                    alert('❌ ' + result.message);
                }
            })
            .catch(error => {
                alert('❌ Errore aggiunta utente');
            });
        }

        function removeUser(username) {
            if (!confirm('Sei sicuro di voler rimuovere l\\'utente "' + username + '"?')) {
                return;
            }
            
            fetch('/api/users/' + username, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('🗑️ Utente rimosso!');
                    loadUsers();
                } else {
                    alert('❌ ' + result.message);
                }
            })
            .catch(error => {
                alert('❌ Errore rimozione utente');
            });
        }

        function centerMap() {
            if (tabletsData.length > 0) {
                var group = new L.featureGroup(Object.values(markers));
                if (tabletsData.length === 1) {
                    map.setView([tabletsData[0].lat, tabletsData[0].lng], 15);
                } else {
                    map.fitBounds(group.getBounds().pad(0.1));
                }
            }
        }

        // Avvia aggiornamento automatico
        updateMap();
        setInterval(updateMap, 30000);
    </script>
</body>
</html>`);
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
            
            const message = '\\n🔴 TABLET OFFLINE\\n\\n📱 ' + nome + '\\n📍 Ultima posizione: ' + data.indirizzo + '\\n🔋 ' + (data.batteria || 0) + '% | ' + (data.connessione || 'Unknown') + '\\n📊 ' + data.lat.toFixed(6) + ', ' + data.lng.toFixed(6) + '\\n⏰ Ultimo aggiornamento: ' + lastSeen.toLocaleString('it-IT') + '\\n\\n🗺️ https://maps.google.com/maps?q=' + data.lat + ',' + data.lng;
            
            sendTelegramAlert(message);
        }
    }
}, 30000);

app.listen(PORT, '0.0.0.0', function() {
    console.log('🚀 GPS Tracker Server AGGIORNATO: http://0.0.0.0:' + PORT);
    console.log('🔐 Login: a.mastroianni / #U5r69cW123');
    console.log('✨ Nuove funzioni: 🔋 Batteria | 🔊 Suono | 🎮 Controllo Remoto');
});