const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Storage
let tablets = {};
let offlineTablets = new Set();
let knownTablets = new Set();
let tabletHistory = {};

// Configurazione
const OFFLINE_TIMEOUT = 2 * 60 * 1000; // 2 minuti
const HISTORY_LIMIT = 50;

let users = {
    'a.mastroianni': '#U5r69cW123'
};

app.use(cors());
app.use(express.json());
app.use(session({
    secret: 'tablet-tracker-secret',
    resave: false,
    saveUninitialized: false
}));

function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Non autorizzato' });
    }
}

// API: Ricevi posizione
app.post('/api/position', (req, res) => {
    const { nome, lat, lng, indirizzo, batteria } = req.body;
    
    const displayName = nome;
    const now = new Date();
    
    tablets[displayName] = {
        originalName: nome,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        indirizzo: indirizzo || 'Posizione non disponibile',
        batteria: batteria || null,
        timestamp: now,
        online: true
    };
    
    // Storico
    if (!tabletHistory[displayName]) {
        tabletHistory[displayName] = [];
    }
    
    tabletHistory[displayName].push({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        indirizzo: indirizzo,
        batteria: batteria,
        timestamp: now
    });
    
    if (tabletHistory[displayName].length > HISTORY_LIMIT) {
        tabletHistory[displayName].shift();
    }
    
    knownTablets.add(displayName);
    
    if (offlineTablets.has(displayName)) {
        offlineTablets.delete(displayName);
        console.log(`✅ ${displayName} tornato online`);
    }
    
    console.log(`📍 ${displayName} → ${indirizzo || `${lat}, ${lng}`} (${batteria || 'N/A'}%)`);
    res.json({ success: true });
});

// API: Lista tablet
app.get('/api/tablets', (req, res) => {
    const now = new Date();
    const tabletsWithStatus = {};
    
    Object.entries(tablets).forEach(([nome, pos]) => {
        const timeDiff = now - new Date(pos.timestamp);
        const isOnline = timeDiff <= OFFLINE_TIMEOUT;
        
        tabletsWithStatus[nome] = {
            ...pos,
            isOnline,
            timeDiff
        };
    });
    
    res.json(tabletsWithStatus);
});

// API: Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        req.session.authenticated = true;
        req.session.username = username;
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Credenziali non valide' });
    }
});

// API: Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Controllo offline
setInterval(() => {
    const now = new Date();
    
    Object.entries(tablets).forEach(([nome, data]) => {
        const lastSeen = new Date(data.timestamp);
        const timeDiff = now - lastSeen;
        
        if (timeDiff > OFFLINE_TIMEOUT && !offlineTablets.has(nome)) {
            offlineTablets.add(nome);
            tablets[nome].online = false;
            console.log(`🔴 ${nome} offline da ${Math.round(timeDiff/1000)}s`);
        }
    });
}, 30000);

// Health check per Railway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        tablets: Object.keys(tablets).length,
        uptime: process.uptime()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'GPS Tracker Server attivo',
        tablets: Object.keys(tablets).length,
        version: '1.0.0'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server GPS attivo su porta ${PORT}`);
    console.log(`📡 Railway URL: https://[your-app].railway.app`);
});