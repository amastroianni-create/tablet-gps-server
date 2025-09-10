var map = L.map('map').setView([45.0703, 7.6869], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

var markers = {};
var tabletsData = [];
var filteredTablets = [];
var currentPage = 0;
var tabletsPerPage = 6;
var currentFilter = 'all';

// Ottimizzazione batteria - riduce frequenza aggiornamenti
var updateInterval = 60000; // 1 minuto invece di 30 secondi
var isPageVisible = true;

var onlineIcon = L.divIcon({
    html: '<div style="background:#28a745;width:16px;height:16px;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    className: ''
});

var offlineIcon = L.divIcon({
    html: '<div style="background:#dc3545;width:16px;height:16px;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    className: ''
});

// Gestione visibilità pagina per ottimizzare batteria
document.addEventListener('visibilitychange', function() {
    isPageVisible = !document.hidden;
    if (isPageVisible) {
        updateMap(); // Aggiorna immediatamente quando torna visibile
    }
});

function getConnectionIcon(connectionType) {
    switch(connectionType) {
        case 'wifi': return '📶';
        case 'cellular': return '📱';
        case 'ethernet': return '🌐';
        default: return '❓';
    }
}

function getBatteryIcon(batteryLevel) {
    if (batteryLevel >= 80) return '🔋';
    if (batteryLevel >= 50) return '🔋';
    if (batteryLevel >= 20) return '🪫';
    return '🪫';
}

function updateMap() {
    // Non aggiornare se la pagina non è visibile (risparmio batteria)
    if (!isPageVisible) return;
    
    fetch('/api/positions')
        .then(response => response.json())
        .then(tablets => {
            tabletsData = tablets;
            
            Object.values(markers).forEach(marker => map.removeLayer(marker));
            markers = {};
            
            var online = tablets.filter(t => t.online).length;
            document.getElementById('online-count').textContent = online;
            document.getElementById('total-count').textContent = tablets.length;
            
            tablets.forEach(tablet => {
                var icon = tablet.online ? onlineIcon : offlineIcon;
                var connectionIcon = getConnectionIcon(tablet.connectionType);
                var batteryIcon = getBatteryIcon(tablet.batteryLevel);
                
                var marker = L.marker([tablet.lat, tablet.lng], {icon: icon})
                    .addTo(map)
                    .bindPopup(`
                        <div>
                            <h3>${tablet.nome}</h3>
                            <div><strong>📍 ${tablet.indirizzo}</strong></div>
                            <div>📊 ${tablet.lat.toFixed(6)}, ${tablet.lng.toFixed(6)}</div>
                            <div>🕒 ${new Date(tablet.timestamp).toLocaleString('it-IT')}</div>
                            <div>${connectionIcon} ${tablet.connectionType || 'N/A'}</div>
                            <div>${batteryIcon} ${tablet.batteryLevel || 'N/A'}%</div>
                            <div><strong style="color:${tablet.online ? '#28a745' : '#dc3545'};">${tablet.online ? '🟢 Online' : '🔴 Offline'}</strong></div>
                        </div>
                    `);
                markers[tablet.nome] = marker;
            });
            
            filteredTablets = tablets;
            applyFilters();
            centerMap();
        })
        .catch(error => console.error('Errore:', error));
}

function displayTablets(tablets) {
    var tabletList = document.getElementById('tablet-list');
    tabletList.innerHTML = '';
    
    var startIndex = currentPage * tabletsPerPage;
    var endIndex = startIndex + tabletsPerPage;
    var pageTablets = tablets.slice(startIndex, endIndex);
    
    pageTablets.forEach(tablet => {
        var item = document.createElement('div');
        item.className = 'tablet-item ' + (tablet.online ? 'online' : 'offline');
        
        var connectionIcon = getConnectionIcon(tablet.connectionType);
        var batteryIcon = getBatteryIcon(tablet.batteryLevel);
        var batteryClass = (tablet.batteryLevel && tablet.batteryLevel < 20) ? 'battery-low' : 'battery-info';
        
        item.innerHTML = `
            <div>
                <strong>${tablet.nome}</strong> ${tablet.online ? '🟢' : '🔴'}
                <span class="connection-type ${tablet.connectionType || 'unknown'}">${connectionIcon}</span>
            </div>
            <div style="font-size:10px;margin:2px 0;">📍 ${tablet.indirizzo}</div>
            <div style="font-size:10px;">🕒 ${new Date(tablet.timestamp).toLocaleString('it-IT')}</div>
            <div class="${batteryClass}">${batteryIcon} ${tablet.batteryLevel || 'N/A'}%</div>
            <div class="tablet-actions">
                <button class="btn" onclick="focusTablet('${tablet.nome}')">🎯</button>
                <button class="btn btn-warning" onclick="quickRename('${tablet.nome}')">✏️</button>
                <button class="btn btn-danger" onclick="quickRemove('${tablet.nome}')">🗑️</button>
            </div>
        `;
        tabletList.appendChild(item);
    });
    
    updatePagination(tablets.length);
}

function updatePagination(totalTablets) {
    var totalPages = Math.ceil(totalTablets / tabletsPerPage);
    document.getElementById('pageInfo').textContent = `${currentPage + 1} / ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 0;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages - 1;
}

function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        displayTablets(filteredTablets);
    }
}

function nextPage() {
    var totalPages = Math.ceil(filteredTablets.length / tabletsPerPage);
    if (currentPage < totalPages - 1) {
        currentPage++;
        displayTablets(filteredTablets);
    }
}

function filterTablets(filter) {
    currentFilter = filter;
    currentPage = 0;
    
    document.getElementById('filter-all').style.background = filter === 'all' ? '#28a745' : '#007bff';
    document.getElementById('filter-online').style.background = filter === 'online' ? '#28a745' : '#007bff';
    document.getElementById('filter-offline').style.background = filter === 'offline' ? '#dc3545' : '#007bff';
    
    applyFilters();
}

function searchTablets() {
    applyFilters();
}

function applyFilters() {
    var searchText = document.getElementById('search-box').value.toLowerCase();
    
    var statusFiltered = tabletsData;
    if (currentFilter === 'online') {
        statusFiltered = tabletsData.filter(tablet => tablet.online);
    } else if (currentFilter === 'offline') {
        statusFiltered = tabletsData.filter(tablet => !tablet.online);
    }
    
    if (searchText === '') {
        filteredTablets = statusFiltered;
    } else {
        filteredTablets = statusFiltered.filter(tablet => 
            tablet.nome.toLowerCase().includes(searchText) || 
            tablet.indirizzo.toLowerCase().includes(searchText)
        );
    }
    
    currentPage = 0;
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
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
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
    var newName = document.getElementById('newName').value.trim();
    
    if (!oldName || !newName) {
        alert('❌ Inserisci il nuovo nome');
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
            alert('✅ Tablet rinominato con successo!');
            closeModal('renameModal');
            updateMap();
        } else {
            alert('❌ ' + result.message);
        }
    })
    .catch(error => alert('❌ Errore durante la rinomina'));
}

function removeTablet() {
    var tabletName = document.getElementById('removeName').value.trim();
    
    if (!tabletName) {
        alert('❌ Inserisci il nome del tablet');
        return;
    }
    
    if (!confirm(`Sei sicuro di voler rimuovere "${tabletName}"?`)) {
        return;
    }
    
    fetch('/api/remove-tablet/' + encodeURIComponent(tabletName), {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert('🗑️ Tablet rimosso con successo!');
            closeModal('removeModal');
            updateMap();
        } else {
            alert('❌ ' + result.message);
        }
    })
    .catch(error => alert('❌ Errore durante la rimozione'));
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
                
                userItem.innerHTML = `
                    <div>
                        <strong>${username}</strong> ${isAdmin ? '(Admin)' : ''}
                        <br><small>Password: ${password}</small>
                    </div>
                    ${!isAdmin ? `<button class="btn btn-danger" onclick="removeUser('${username}')">🗑️</button>` : ''}
                `;
                usersList.appendChild(userItem);
            });
        })
        .catch(error => alert('❌ Errore caricamento utenti'));
}

function addUser() {
    var username = document.getElementById('newUsername').value.trim();
    var password = document.getElementById('newPassword').value.trim();
    
    if (!username || !password) {
        alert('❌ Inserisci username e password');
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
            alert('✅ Utente aggiunto con successo!');
            closeModal('addUserModal');
        } else {
            alert('❌ ' + result.message);
        }
    })
    .catch(error => alert('❌ Errore aggiunta utente'));
}

function removeUser(username) {
    if (!confirm(`Sei sicuro di voler rimuovere l'utente "${username}"?`)) {
        return;
    }
    
    fetch('/api/users/' + username, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert('🗑️ Utente rimosso con successo!');
            loadUsers();
        } else {
            alert('❌ ' + result.message);
        }
    })
    .catch(error => alert('❌ Errore rimozione utente'));
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

// Inizializzazione ottimizzata
setTimeout(function() {
    map.invalidateSize();
    updateMap();
    filterTablets('all');
}, 500);

window.addEventListener('resize', function() {
    map.invalidateSize();
});

// Aggiornamento automatico ottimizzato per batteria
setInterval(function() {
    if (isPageVisible) {
        updateMap();
    }
}, updateInterval);