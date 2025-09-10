// Configurazione ottimizzata per modalità kiosk con risparmio batteria
class KioskBatteryManager {
    constructor() {
        this.isKioskMode = false;
        this.batteryOptimizations = {
            screenBrightness: 0.7, // 70% luminosità
            gpsAccuracy: 'balanced', // Bilanciato tra precisione e consumo
            updateInterval: 60000, // 1 minuto
            wifiScanInterval: 300000, // 5 minuti
            backgroundSync: false
        };
        this.init();
    }

    init() {
        this.detectKioskMode();
        this.setupBatteryOptimizations();
        this.setupNetworkDetection();
        this.setupLocationServices();
    }

    detectKioskMode() {
        // Rileva se siamo in modalità kiosk
        this.isKioskMode = window.navigator.standalone || 
                          window.matchMedia('(display-mode: fullscreen)').matches ||
                          document.fullscreenElement !== null;
        
        if (this.isKioskMode) {
            this.enableKioskOptimizations();
        }
    }

    enableKioskOptimizations() {
        // Disabilita selezione testo
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        // Disabilita menu contestuale
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Disabilita zoom
        document.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });
        
        // Previeni refresh accidentale
        document.addEventListener('touchmove', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    setupBatteryOptimizations() {
        // Gestione luminosità schermo
        if ('screen' in navigator && 'brightness' in navigator.screen) {
            navigator.screen.brightness = this.batteryOptimizations.screenBrightness;
        }

        // Riduce animazioni CSS per risparmiare batteria
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);

        // Gestione visibilità pagina
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseNonEssentialServices();
            } else {
                this.resumeServices();
            }
        });
    }

    setupNetworkDetection() {
        // Rileva tipo di connessione
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            const updateConnectionInfo = () => {
                const connectionType = this.getConnectionType(connection);
                this.handleConnectionChange(connectionType);
            };

            connection.addEventListener('change', updateConnectionInfo);
            updateConnectionInfo(); // Chiamata iniziale
        }
    }

    getConnectionType(connection) {
        if (!connection) return 'unknown';
        
        const type = connection.type || connection.effectiveType;
        
        if (type === 'wifi') return 'wifi';
        if (type === 'cellular' || ['2g', '3g', '4g', '5g'].includes(type)) return 'cellular';
        if (type === 'ethernet') return 'ethernet';
        
        return 'unknown';
    }

    handleConnectionChange(connectionType) {
        // Adatta comportamento in base al tipo di connessione
        if (connectionType === 'cellular') {
            // Riduce frequenza aggiornamenti su rete cellulare
            this.batteryOptimizations.updateInterval = 120000; // 2 minuti
            this.batteryOptimizations.gpsAccuracy = 'coarse';
        } else if (connectionType === 'wifi') {
            // Frequenza normale su WiFi
            this.batteryOptimizations.updateInterval = 60000; // 1 minuto
            this.batteryOptimizations.gpsAccuracy = 'balanced';
        }

        // Invia info connessione al server
        this.sendConnectionInfo(connectionType);
    }

    setupLocationServices() {
        if ('geolocation' in navigator) {
            const options = {
                enableHighAccuracy: this.batteryOptimizations.gpsAccuracy === 'fine',
                timeout: 30000,
                maximumAge: 60000 // Cache posizione per 1 minuto
            };

            // Avvia tracking GPS ottimizzato
            this.startLocationTracking(options);
        }
    }

    startLocationTracking(options) {
        const trackLocation = () => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.handleLocationUpdate(position);
                },
                (error) => {
                    console.warn('Errore GPS:', error.message);
                    // Riprova con precisione ridotta in caso di errore
                    if (options.enableHighAccuracy) {
                        options.enableHighAccuracy = false;
                        setTimeout(trackLocation, 5000);
                    }
                },
                options
            );
        };

        // Prima lettura immediata
        trackLocation();
        
        // Aggiornamenti periodici
        setInterval(trackLocation, this.batteryOptimizations.updateInterval);
    }

    handleLocationUpdate(position) {
        const locationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            batteryLevel: this.getBatteryLevel(),
            connectionType: this.getCurrentConnectionType()
        };

        this.sendLocationUpdate(locationData);
    }

    getBatteryLevel() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                return Math.round(battery.level * 100);
            });
        }
        return null;
    }

    getCurrentConnectionType() {
        if ('connection' in navigator) {
            return this.getConnectionType(navigator.connection);
        }
        return 'unknown';
    }

    sendLocationUpdate(data) {
        // Invia aggiornamento posizione al server
        fetch('/api/update-position', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).catch(error => {
            console.warn('Errore invio posizione:', error);
        });
    }

    sendConnectionInfo(connectionType) {
        fetch('/api/update-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                connectionType: connectionType,
                timestamp: new Date().toISOString()
            })
        }).catch(error => {
            console.warn('Errore invio info connessione:', error);
        });
    }

    pauseNonEssentialServices() {
        // Pausa servizi non essenziali quando app non è visibile
        console.log('App nascosta - pausa servizi non essenziali');
    }

    resumeServices() {
        // Riprende tutti i servizi quando app torna visibile
        console.log('App visibile - ripresa servizi');
    }
}

// Inizializza il gestore batteria kiosk
document.addEventListener('DOMContentLoaded', () => {
    window.kioskBatteryManager = new KioskBatteryManager();
});

// Previeni comportamenti indesiderati in modalità kiosk
window.addEventListener('beforeunload', (e) => {
    // Previeni chiusura accidentale
    e.preventDefault();
    e.returnValue = '';
});

// Gestione errori globale
window.addEventListener('error', (e) => {
    console.error('Errore applicazione:', e.error);
    // Ricarica automatica in caso di errore critico
    if (e.error && e.error.message.includes('critical')) {
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    }
});