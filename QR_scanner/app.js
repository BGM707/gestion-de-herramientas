
// Estructura de estado global de la aplicación
const appState = {
    tools: [], // Almacena las herramientas
    activeCamera: null, // Cámara actualmente en uso
    scannerActive: false, // Estado del escáner QR
    videoStream: null, // Stream de vídeo actual
    availableCameras: [], // Cámaras disponibles
    darkMode: localStorage.getItem('darkMode') === 'true', // Preferencia de tema
    selectedTool: null, // Herramienta actualmente seleccionada
    qrContent: null, // Contenido del último QR escaneado
    rfidContent: null, // Contenido de la última etiqueta RFID
    searchFilter: '', // Filtro de búsqueda actual
    categoryFilter: '', // Filtro de categoría actual
    imageProcessor: null, // Worker para procesamiento de imagen
    rfidDevice: null, // Dispositivo RFID conectado
    rfidActive: false, // Estado del lector RFID
    sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true', // Estado de la barra lateral
    sidebarWidth: localStorage.getItem('sidebarWidth') || '250px' // Ancho de la barra lateral
};

// Inicialización de componentes cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', () => {
    initDatabase()
        .then(() => {
            console.log('Base de datos inicializada correctamente');
            return Promise.all([loadTools(), loadHistory()]);
        })
        .then(([tools]) => {
            appState.tools = tools;
            renderToolsList();
            console.log('Herramientas cargadas:', tools.length);
        })
        .catch(error => {
            console.error('Error durante la inicialización:', error);
            showNotification('Error al inicializar la aplicación', 'error');
        });

    initUI();
    if (appState.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    initQRScanner();
    initRFIDReader();
    initEventListeners();
    initServiceWorker();

    // Cargar estado inicial de la barra lateral
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    if (appState.sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('collapsed');
    }
    sidebar.style.width = appState.sidebarWidth;
    mainContent.style.marginLeft = appState.sidebarCollapsed ? '0' : appState.sidebarWidth;
});

// Inicialización de la base de datos IndexedDB
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ToolScanDB', 2);

        request.onerror = event => reject('Error al abrir la base de datos: ' + event.target.errorCode);

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('tools')) {
                const toolsStore = db.createObjectStore('tools', { keyPath: 'id', autoIncrement: true });
                toolsStore.createIndex('byName', 'name', { unique: false });
                toolsStore.createIndex('bySerial', 'serialNumber', { unique: true });
                toolsStore.createIndex('byCategory', 'category', { unique: false });
                toolsStore.createIndex('byStatus', 'status', { unique: false });
            }

            if (!db.objectStoreNames.contains('movements')) {
                db.createObjectStore('movements', { keyPath: 'id', autoIncrement: true });
            }

            console.log('Base de datos y almacenes creados correctamente');
        };

        request.onsuccess = event => {
            const db = event.target.result;
            db.onversionchange = () => {
                db.close();
                alert('La base de datos está desactualizada. Por favor, recargue la página.');
            };
            resolve(db);
        };
    });
}

// Cargar todas las herramientas de la base de datos
function loadTools() {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open('ToolScanDB', 2);

        openRequest.onsuccess = event => {
            const db = event.target.result;
            const transaction = db.transaction(['tools'], 'readonly');
            const toolsStore = transaction.objectStore('tools');
            const getAllRequest = toolsStore.getAll();

            getAllRequest.onsuccess = () => {
                resolve(getAllRequest.result);
            };

            getAllRequest.onerror = () => {
                reject('Error al obtener las herramientas');
            };

            transaction.oncomplete = () => {
                db.close();
            };
        };

        openRequest.onerror = event => {
            reject('Error al abrir la base de datos: ' + event.target.errorCode);
        };
    });
}

// Guardar una herramienta en la base de datos
function saveTool(tool) {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open('ToolScanDB', 2);

        openRequest.onsuccess = event => {
            const db = event.target.result;
            const transaction = db.transaction(['tools'], 'readwrite');
            const toolsStore = transaction.objectStore('tools');

            let request;
            if (tool.id) {
                request = toolsStore.put(tool);
            } else {
                tool.createdAt = new Date().toISOString();
                request = toolsStore.add(tool);
            }

            request.onsuccess = event => {
                resolve(event.target.result);
            };

            request.onerror = event => {
                reject('Error al guardar la herramienta: ' + event.target.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        };

        openRequest.onerror = event => {
            reject('Error al abrir la base de datos: ' + event.target.errorCode);
        };
    });
}

// Eliminar una herramienta de la base de datos
function deleteTool(id) {
    return new Promise((resolve, personally, reject) => {
        const openRequest = indexedDB.open('ToolScanDB', 2);

        openRequest.onsuccess = event => {
            const db = event.target.result;
            const transaction = db.transaction(['tools'], 'readwrite');
            const toolsStore = transaction.objectStore('tools');

            const request = toolsStore.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = event => {
                reject('Error al eliminar la herramienta: ' + event.target.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        };

        openRequest.onerror = event => {
            reject('Error al abrir la base de datos: ' + event.target.errorCode);
        };
    });
}

// Buscar una herramienta por su número de serie
function findToolBySerial(serialNumber) {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open('ToolScanDB', 2);

        openRequest.onsuccess = event => {
            const db = event.target.result;
            const transaction = db.transaction(['tools'], 'readonly');
            const toolsStore = transaction.objectStore('tools');
            const serialIndex = toolsStore.index('bySerial');

            const request = serialIndex.get(serialNumber);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = event => {
                reject('Error al buscar la herramienta: ' + event.target.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        };

        openRequest.onerror = event => {
            reject('Error al abrir la base de datos: ' + event.target.errorCode);
        };
    });
}

// Inicializar la interfaz de usuario
function initUI() {
    const toolsContainer = document.getElementById('tools-container');
    const searchInput = document.getElementById('search-tools');
    const categoryFilter = document.getElementById('category-filter');

    searchInput.addEventListener('input', () => {
        appState.searchFilter = searchInput.value.toLowerCase();
        renderToolsList();
    });

    categoryFilter.addEventListener('change', () => {
        appState.categoryFilter = categoryFilter.value;
        renderToolsList();
    });

    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', toggleDarkMode);
}

// Cambiar entre modo claro y oscuro
function toggleDarkMode() {
    appState.darkMode = !appState.darkMode;
    localStorage.setItem('darkMode', appState.darkMode);

    if (appState.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

// Renderizar la lista de herramientas con filtros aplicados
function renderToolsList() {
    const toolsContainer = document.getElementById('tools-container');
    toolsContainer.innerHTML = '';

    const filteredTools = appState.tools.filter(tool => {
        const matchesSearch = appState.searchFilter === '' ||
            tool.name.toLowerCase().includes(appState.searchFilter) ||
            (tool.serialNumber && tool.serialNumber.toLowerCase().includes(appState.searchFilter)) ||
            (tool.location && tool.location.toLowerCase().includes(appState.searchFilter));
        const matchesCategory = appState.categoryFilter === '' || tool.category === appState.categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (filteredTools.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No se encontraron herramientas con los filtros actuales.';
        toolsContainer.appendChild(emptyMessage);
        return;
    }

    filteredTools.forEach(tool => {
        const toolCard = document.createElement('div');
        toolCard.className = `tool-card ${tool.status}`;
        toolCard.dataset.id = tool.id;

        let categoryIcon = '';
        switch (tool.category) {
            case 'manual':
                categoryIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m14 5 7 7-7 7"></path><path d="M19 12H3"></path></svg>';
                break;
            case 'electric':
                categoryIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path></svg>';
                break;
            case 'measurement':
                categoryIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="16.24 7.76 12 12"></polyline></svg>';
                break;
            default:
                categoryIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
        }

        toolCard.innerHTML = `
            <div class="tool-icon">${categoryIcon}</div>
            <div class="tool-info">
                <h3>${tool.name}</h3>
                <div class="tool-details">
                    ${tool.serialNumber ? `<span class="serial-number">Serial: ${tool.serialNumber}</span>` : ''}
                    ${tool.location ? `<span class="location">Ubicación: ${tool.location}</span>` : ''}
                </div>
                <div class="tool-status-badge">${getStatusLabel(tool.status)}</div>
            </div>
            <div class="tool-actions">
                <button class="edit-tool btn btn-outline-primary btn-sm rounded-circle" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="delete-tool btn btn-outline-danger btn-sm rounded-circle" title="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
                <button class="generate-tool-qr btn btn-outline-info btn-sm rounded-circle" title="Generar QR">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                </button>
            </div>
        `;

        toolsContainer.appendChild(toolCard);

        toolCard.querySelector('.edit-tool').addEventListener('click', () => openToolModal(tool));
        toolCard.querySelector('.delete-tool').addEventListener('click', () => confirmDeleteTool(tool));
        toolCard.querySelector('.generate-tool-qr').addEventListener('click', () => generateToolQR(tool));
    });
}

// Obtener etiqueta legible para el estado de la herramienta
function getStatusLabel(status) {
    const statusLabels = {
        'available': 'Disponible',
        'in-use': 'En uso',
        'maintenance': 'En mantenimiento',
        'lost': 'Perdida'
    };
    return statusLabels[status] || 'Desconocido';
}

// Inicializar el escáner de QR
function initQRScanner() {
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const cameraSelect = document.getElementById('camera-select');
    const video = document.getElementById('qr-video');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Tu navegador no soporta acceso a la cámara', 'error');
        startButton.disabled = true;
        return;
    }

    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            appState.availableCameras = videoDevices;

            if (videoDevices.length === 0) {
                showNotification('No se detectaron cámaras', 'warning');
                startButton.disabled = true;
                return;
            }

            cameraSelect.innerHTML = '<option value="">Seleccionar cámara...</option>';
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Cámara ${index + 1}`;
                cameraSelect.appendChild(option);
            });

            const rearCamera = videoDevices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear')) || videoDevices[0];
            if (rearCamera) {
                cameraSelect.value = rearCamera.deviceId;
            }
        })
        .catch(error => {
            console.error('Error al enumerar dispositivos:', error);
            showNotification('Error al acceder a las cámaras', 'error');
        });

    startButton.addEventListener('click', () => {
        if (appState.rfidActive) {
            showNotification('Detén el escáner RFID antes de iniciar el QR', 'warning');
            return;
        }
        startQRScanner();
    });

    stopButton.addEventListener('click', stopQRScanner);

    cameraSelect.addEventListener('change', () => {
        if (appState.scannerActive) {
            stopQRScanner().then(startQRScanner);
        }
    });

    if (window.Worker) {
        try {
            const workerCode = `
                self.onmessage = function(e) {
                    const { imageData, width, height } = e.data;
                    const result = new Uint8ClampedArray(width * height * 4);
                    const threshold = 128;
                    for (let i = 0; i < imageData.length; i += 4) {
                        const r = imageData[i];
                        const g = imageData[i + 1];
                        const b = imageData[i + 2];
                        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                        const value = luminance < threshold ? 0 : 255;
                        result[i] = result[i + 1] = result[i + 2] = value;
                        result[i + 3] = 255;
                    }
                    self.postMessage({ result });
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            appState.imageProcessor = new Worker(workerUrl);
            URL.revokeObjectURL(workerUrl);
        } catch (error) {
            console.error('Error al crear Worker:', error);
        }
    }
}

// Iniciar el escáner de QR
function startQRScanner() {
    if (appState.scannerActive) return;

    const cameraSelect = document.getElementById('camera-select');
    const video = document.getElementById('qr-video');
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const scanStatus = document.getElementById('scan-status');

    startButton.classList.add('disabled');
    scanStatus.textContent = 'Iniciando cámara...';
    scanStatus.className = 'alert alert-info';

    const constraints = {
        video: {
            deviceId: cameraSelect.value ? { exact: cameraSelect.value } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: { ideal: 'environment' }
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            appState.videoStream = stream;
            video.srcObject = stream;
            video.play();

            appState.scannerActive = true;
            startButton.disabled = true;
            stopButton.disabled = false;
            scanStatus.textContent = 'Escaneando código QR...';
            scanStatus.className = 'alert alert-info';

            scanQRCode();
        })
        .catch(error => {
            console.error('Error al acceder a la cámara:', error);
            startButton.classList.remove('disabled');
            if (error.name === 'NotAllowedError') {
                showNotification('Permiso de cámara denegado. Habilita el acceso en la configuración del navegador.', 'error');
                scanStatus.textContent = 'Permiso de cámara denegado';
                scanStatus.className = 'alert alert-danger';
            } else if (error.name === 'NotFoundError') {
                showNotification('No se encontró ninguna cámara compatible.', 'error');
                scanStatus.textContent = 'No se encontró cámara';
                scanStatus.className = 'alert alert-danger';
            } else {
                showNotification('Error al acceder a la cámara: ' + error.message, 'error');
                scanStatus.textContent = 'Error al iniciar cámara';
                scanStatus.className = 'alert alert-danger';
            }
        });
}

// Detener el escáner de QR
function stopQRScanner() {
    return new Promise((resolve) => {
        if (!appState.scannerActive) {
            resolve();
            return;
        }

        const video = document.getElementById('qr-video');
        const startButton = document.getElementById('start-button');
        const stopButton = document.getElementById('stop-button');
        const scanStatus = document.getElementById('scan-status');

        if (appState.videoStream) {
            appState.videoStream.getTracks().forEach(track => track.stop());
            appState.videoStream = null;
        }

        video.srcObject = null;

        appState.scannerActive = false;
        startButton.disabled = false;
        startButton.classList.remove('disabled');
        stopButton.disabled = true;
        scanStatus.textContent = 'Escáner QR detenido';
        scanStatus.className = 'alert alert-secondary';

        resolve();
    });
}

// Escanear códigos QR en tiempo real
function scanQRCode() {
    if (!appState.scannerActive) return;

    const video = document.getElementById('qr-video');
    const scanStatus = document.getElementById('scan-status');

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(scanQRCode);
        return;
    }

    const canvas = document.createElement('canvas');
    const canvasContext = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);

    try {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
        });

        if (code) {
            console.log('QR detectado:', code.data);
            const successSound = new Audio('data:audio/mp3;base64,SUQzAwAAAAAAElRJVDIAAAAAAABkYXRhALGOSQwA//uSwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAUAAAU4AABDR0dHR0dLS0tLS0tPT09PT09TU1NTU1NXV1dXV1dbW1tbW1tfX19fX19jY2NjY2NnZ2dnZ2dra2tra2tvb29vb29zc3Nzc3N3d3d3d3d7e3t7e3t/f39/f39//8AAAA5TEFNRTMuMTAwAZYAAAAALgkAABRGJAN3TQABzAAAFOD7dy+NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSwAAABLQ/fBmJgAC2jG/nPeAARwIAAPp3v//Pc+zzOf9JkmUkiZ//9bmeTh+Z53J5P//8eZzJ7vj/z//p7/p93//f/JP5J6hL///+pLKX//KcKnQ9KQqRVMGF0lCQVXSUaiOSShiQ/AyZpIxJpMGJD8gY0JpJJJpk0mEDIBkDUhLKEssZAwaBjQQMDLpL+QIWUDBAhUKZ4AX8gQVCpyTdJJJEgYKEDJA2JvlNkyRoJlSfUqkmkkkm+s4XOYqLhRUXP5zl//z/dh/lMFDxQqKiouf///O+XOXKfxQUFBUVFRcuX///jUt/4oKCoqKixcUFD6lf///9cuXPnAqYKioxcXFy5////lz5c4FDhQVFRUWLFyh9S////LnzhcAYrKEpMUMopP//SkxBTUUzLjk4LjRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
            successSound.play();

            scanStatus.textContent = `QR detectado: ${code.data}`;
            scanStatus.className = 'alert alert-success';

            processQRContent(code.data);
            stopQRScanner();
            return;
        }
    } catch (error) {
        console.error('Error al decodificar QR:', error);
    }

    requestAnimationFrame(scanQRCode);
}

// Inicializar el lector RFID
function initRFIDReader() {
    const startRFIDButton = document.getElementById('start-rfid');
    const stopRFIDButton = document.getElementById('stop-rfid');
    const scanStatus = document.getElementById('scan-status');

    if (!navigator.usb) {
        showNotification('Tu navegador no soporta WebUSB. No se puede usar RFID.', 'error');
        startRFIDButton.disabled = true;
        startRFIDButton.classList.add('disabled');
        return;
    }

    startRFIDButton.addEventListener('click', () => {
        if (appState.scannerActive) {
            showNotification('Detén el escáner QR antes de iniciar el RFID', 'warning');
            return;
        }
        startRFIDScanner();
    });

    stopRFIDButton.addEventListener('click', stopRFIDScanner);
}

// Iniciar el lector RFID
async function startRFIDScanner() {
    if (appState.rfidActive) return;

    const scanStatus = document.getElementById('scan-status');
    const startRFIDButton = document.getElementById('start-rfid');
    const stopRFIDButton = document.getElementById('stop-rfid');

    startRFIDButton.classList.add('disabled');
    scanStatus.textContent = 'Conectando lector RFID...';
    scanStatus.className = 'alert alert-info';

    try {
        const device = await navigator.usb.requestDevice({
            filters: [{ vendorId: 0x1234 }] // Reemplaza con el vendorId de tu lector RFID
        });

        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);

        appState.rfidDevice = device;
        appState.rfidActive = true;
        startRFIDButton.disabled = true;
        stopRFIDButton.disabled = false;
        scanStatus.textContent = 'Escaneando etiqueta RFID...';
        scanStatus.className = 'alert alert-info';

        readRFIDData();
    } catch (error) {
        console.error('Error al iniciar RFID:', error);
        startRFIDButton.classList.remove('disabled');
        showNotification('Error al conectar con el lector RFID: ' + error.message, 'error');
        scanStatus.textContent = 'Error al conectar RFID';
        scanStatus.className = 'alert alert-danger';
    }
}

// Detener el lector RFID
async function stopRFIDScanner() {
    if (!appState.rfidActive) return;

    const scanStatus = document.getElementById('scan-status');
    const startRFIDButton = document.getElementById('start-rfid');
    const stopRFIDButton = document.getElementById('stop-rfid');

    if (appState.rfidDevice) {
        try {
            await appState.rfidDevice.releaseInterface(0);
            await appState.rfidDevice.close();
        } catch (error) {
            console.error('Error al detener RFID:', error);
        }
        appState.rfidDevice = null;
    }

    appState.rfidActive = false;
    startRFIDButton.disabled = false;
    startRFIDButton.classList.remove('disabled');
    stopRFIDButton.disabled = true;
    scanStatus.textContent = 'Escáner RFID detenido';
    scanStatus.className = 'alert alert-secondary';
}

// Leer datos RFID
async function readRFIDData() {
    if (!appState.rfidActive) return;

    try {
        const result = await appState.rfidDevice.transferIn(1, 64); // Ajusta endpoint y tamaño según tu lector
        const decoder = new TextDecoder();
        const rfidTag = decoder.decode(result.data).trim();

        if (rfidTag) {
            console.log('RFID detectado:', rfidTag);
            const successSound = new Audio('data:audio/mp3;base64,SUQzAwAAAAAAElRJVDIAAAAAAABkYXRhALGOSQwA//uSwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAUAAAU4AABDR0dHR0dLS0tLS0tPT09PT09TU1NTU1NXV1dXV1dbW1tbW1tfX19fX19jY2NjY2NnZ2dnZ2dra2tra2tvb29vb29zc3Nzc3N3d3d3d3d7e3t7e3t/f39/f39//8AAAA5TEFNRTMuMTAwAZYAAAAALgkAABRGJAN3TQABzAAAFOD7dy+NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uSwAAABLQ/fBmJgAC2jG/nPeAARwIAAPp3v//Pc+zzOf9JkmUkiZ//9bmeTh+Z53J5P//8eZzJ7vj/z//p7/p93//f/JP5J6hL///+pLKX//KcKnQ9KQqRVMGF0lCQVXSUaiOSShiQ/AyZpIxJpMGJD8gY0JpJJJpk0mEDIBkDUhLKEssZAwaBjQQMDLpL+QIWUDBAhUKZ4AX8gQVCpyTdJJJEgYKEDJA2JvlNkyRoJlSfUqkmkkkm+s4XOYqLhRUXP5zl//z/dh/lMFDxQqKiouf///O+XOXKfxQUFBUVFRcuX///jUt/4oKCoqKixcUFD6lf///9cuXPnAqYKioxcXFy5////lz5c4FDhQVFRUWLFyh9S////LnzhcAYrKEpMUMopP//SkxBTUUzLjk4LjRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
            successSound.play();

            const scanStatus = document.getElementById('scan-status');
            scanStatus.textContent = `RFID detectado: ${rfidTag}`;
            scanStatus.className = 'alert alert-success';

            processRFIDContent(rfidTag);
            stopRFIDScanner();
            return;
        }

        setTimeout(readRFIDData, 100);
    } catch (error) {
        console.error('Error al leer RFID:', error);
        stopRFIDScanner();
        showNotification('Error al leer etiqueta RFID', 'error');
        scanStatus.textContent = 'Error al leer RFID';
        scanStatus.className = 'alert alert-danger';
    }
}

// Procesar contenido de un código QR
function processQRContent(content) {
    console.log('Procesando contenido QR:', content);
    appState.qrContent = content;

    try {
        const data = JSON.parse(content);
        if (data.type === 'tool' && data.serialNumber) {
            findToolBySerial(data.serialNumber)
                .then(tool => {
                    if (tool) {
                        const movementType = tool.status === 'in-use' ? 'entry' : 'exit';
                        registerToolMovement(tool, movementType, 'QR')
                            .then(movement => {
                                showNotification(`Herramienta ${movementType === 'entry' ? 'ingresada' : 'retirada'}: ${tool.name} (QR)`, 'success');
                                renderToolsList();
                                updateHistoryTable(movement);
                            })
                            .catch(error => {
                                console.error('Error al registrar movimiento:', error);
                                showNotification('Error al registrar el movimiento', 'error');
                            });
                    } else {
                        const newTool = {
                            name: data.name || 'Nueva Herramienta',
                            serialNumber: data.serialNumber,
                            category: data.category || 'other',
                            status: 'available',
                            location: 'Bodega',
                            notes: data.notes || ''
                        };
                        showNotification('Nueva herramienta detectada (QR), completa la información', 'info');
                        openToolModal(newTool);
                    }
                })
                .catch(error => {
                    console.error('Error al buscar herramienta:', error);
                    showNotification('Error al procesar QR', 'error');
                });
        } else {
            showNotification('QR detectado, pero no es una herramienta válida', 'warning');
        }
    } catch (error) {
        console.error('Error al parsear QR JSON:', error);
        findToolBySerial(content)
            .then(tool => {
                if (tool) {
                    const movementType = tool.status === 'in-use' ? 'entry' : 'exit';
                    registerToolMovement(tool, movementType, 'QR')
                        .then(movement => {
                            showNotification(`Herramienta ${movementType === 'entry' ? 'ingresada' : 'retirada'}: ${tool.name} (QR)`, 'success');
                            renderToolsList();
                            updateHistoryTable(movement);
                        })
                        .catch(error => {
                            console.error('Error al registrar movimiento:', error);
                            showNotification('Error al registrar el movimiento', 'error');
                        });
                } else {
                    const newTool = {
                        name: 'Nueva Herramienta',
                        serialNumber: content,
                        category: 'other',
                        status: 'available',
                        location: 'Bodega',
                        notes: ''
                    };
                    showNotification('Herramienta no encontrada (QR), completa la información', 'warning');
                    openToolModal(newTool);
                }
            })
            .catch(error => {
                console.error('Error al buscar herramienta:', error);
                showNotification('Error al procesar el código QR', 'error');
            });
    }
}

// Procesar contenido de una etiqueta RFID
function processRFIDContent(rfidTag) {
    console.log('Procesando contenido RFID:', rfidTag);
    appState.rfidContent = rfidTag;

    findToolBySerial(rfidTag)
        .then(tool => {
            if (tool) {
                const movementType = tool.status === 'in-use' ? 'entry' : 'exit';
                registerToolMovement(tool, movementType, 'RFID')
                    .then(movement => {
                        showNotification(`Herramienta ${movementType === 'entry' ? 'ingresada' : 'retirada'}: ${tool.name} (RFID)`, 'success');
                        renderToolsList();
                        updateHistoryTable(movement);
                    })
                    .catch(error => {
                        console.error('Error al registrar movimiento:', error);
                        showNotification('Error al registrar el movimiento', 'error');
                    });
            } else {
                const newTool = {
                    name: 'Nueva Herramienta RFID',
                    serialNumber: rfidTag,
                    category: 'other',
                    status: 'available',
                    location: 'Bodega',
                    notes: 'Registrada vía RFID'
                };
                showNotification('Herramienta RFID no encontrada, completa la información', 'warning');
                openToolModal(newTool);
            }
        })
        .catch(error => {
            console.error('Error al buscar herramienta:', error);
            showNotification('Error al procesar la etiqueta RFID', 'error');
        });
}

// Registrar movimiento de entrada/salida
function registerToolMovement(tool, movementType, scanType) {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open('ToolScanDB', 2);

        openRequest.onsuccess = event => {
            const db = event.target.result;
            const transaction = db.transaction(['tools', 'movements'], 'readwrite');
            const toolsStore = transaction.objectStore('tools');
            const movementsStore = transaction.objectStore('movements');

            if (movementType === 'entry') {
                tool.status = 'available';
                tool.location = 'Bodega';
            } else if (movementType === 'exit') {
                tool.status = 'in-use';
                tool.location = 'Fuera de bodega';
            }

            const movement = {
                toolId: tool.id,
                type: movementType,
                scanType: scanType, // QR o RFID
                timestamp: new Date().toISOString(),
                toolName: tool.name,
                serialNumber: tool.serialNumber
            };

            movementsStore.add(movement);
            toolsStore.put(tool);

            transaction.oncomplete = () => {
                db.close();
                resolve(movement);
            };

            transaction.onerror = event => {
                reject('Error al registrar movimiento: ' + event.target.error);
            };
        };

        openRequest.onerror = event => {
            reject('Error al abrir la base de datos: ' + event.target.errorCode);
        };
    });
}

// Abrir el modal para crear/editar herramientas
function openToolModal(tool = null) {
    const modal = document.getElementById('tool-modal');
    const form = document.getElementById('tool-form');
    const title = document.getElementById('modal-title');

    appState.selectedTool = tool;

    title.textContent = tool && tool.id ? 'Editar Herramienta' : 'Nueva Herramienta';

    document.getElementById('tool-id').value = tool?.id || '';
    document.getElementById('tool-name').value = tool?.name || '';
    document.getElementById('tool-serial').value = tool?.serialNumber || '';
    document.getElementById('tool-category').value = tool?.category || 'other';
    document.getElementById('tool-location').value = tool?.location || '';
    document.getElementById('tool-status').value = tool?.status || 'available';
    document.getElementById('tool-notes').value = tool?.notes || '';

    modal.style.display = 'block';
    document.getElementById('tool-name').focus();
}

// Cerrar un modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';

    if (modalId === 'tool-modal') {
        document.getElementById('tool-form').reset();
        appState.selectedTool = null;
    }
}

// Generar código QR para una herramienta
function generateToolQR(tool) {
    const qrModal = document.getElementById('qr-modal');
    const qrContainer = document.getElementById('qr-container');

    const qrData = {
        type: 'tool',
        serialNumber: tool.serialNumber,
        name: tool.name,
        category: tool.category,
        status: tool.status,
        location: tool.location,
        notes: tool.notes
    };

    const qrString = JSON.stringify(qrData);
    qrContainer.innerHTML = '';

    const qr = new QRious({
        element: qrContainer.appendChild(document.createElement('canvas')),
        value: qrString,
        size: 250,
        background: '#ffffff',
        foreground: '#000000'
    });

    qrModal.style.display = 'block';

    document.getElementById('download-qr').onclick = () => {
        const link = document.createElement('a');
        link.href = qr.toDataURL('image/png');
        link.download = `QR_${tool.serialNumber || tool.name}.png`;
        link.click();
    };

    document.getElementById('print-qr').onclick = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <body onload="window.print(); window.close()">
                    <img src="${qr.toDataURL('image/png')}" style="max-width:100%;">
                </body>
            </html>
        `);
        printWindow.document.close();
    };
}

// Confirmar eliminación de una herramienta
function confirmDeleteTool(tool) {
    if (confirm(`¿Estás seguro de que quieres eliminar "${tool.name}"?`)) {
        deleteTool(tool.id)
            .then(() => {
                appState.tools = appState.tools.filter(t => t.id !== tool.id);
                renderToolsList();
                showNotification('Herramienta eliminada correctamente', 'success');
            })
            .catch(error => {
                console.error('Error al eliminar herramienta:', error);
                showNotification('Error al eliminar la herramienta', 'error');
            });
    }
}

// Mostrar notificaciones usando SweetAlert2
function showNotification(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            text: message,
            icon: type,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Actualizar tabla de historial
function updateHistoryTable(movement) {
    const historyTableBody = document.getElementById('history-table-body');
    const row = document.createElement('tr');

    const date = new Date(movement.timestamp);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();
    const action = movement.type === 'entry' ? 'Entrada' : 'Salida';
    const scanType = movement.scanType || 'QR';

    row.innerHTML = `
        <td>${dateStr}</td>
        <td>${timeStr}</td>
        <td>${movement.serialNumber}</td>
        <td>${action}</td>
        <td>${scanType}</td>
    `;

    historyTableBody.insertBefore(row, historyTableBody.firstChild);
}

// Cargar historial desde IndexedDB
function loadHistory() {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open('ToolScanDB', 2);

        openRequest.onsuccess = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('movements')) {
                resolve([]);
                return;
            }

            const transaction = db.transaction(['movements'], 'readonly');
            const movementsStore = transaction.objectStore('movements');
            const getAllRequest = movementsStore.getAll();

            getAllRequest.onsuccess = () => {
                const movements = getAllRequest.result;
                movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                const historyTableBody = document.getElementById('history-table-body');
                historyTableBody.innerHTML = '';
                movements.forEach(movement => updateHistoryTable(movement));
                resolve(movements);
            };

            getAllRequest.onerror = () => {
                reject('Error al obtener el historial');
            };

            transaction.oncomplete = () => {
                db.close();
            };
        };

        openRequest.onerror = event => {
            reject('Error al abrir la base de datos: ' + event.target.errorCode);
        };
    });
}

// Inicializar event listeners adicionales
function initEventListeners() {
    const toolForm = document.getElementById('tool-form');
    toolForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const tool = {
            id: parseInt(document.getElementById('tool-id').value) || undefined,
            name: document.getElementById('tool-name').value,
            serialNumber: document.getElementById('tool-serial').value,
            category: document.getElementById('tool-category').value,
            location: document.getElementById('tool-location').value,
            status: document.getElementById('tool-status').value,
            notes: document.getElementById('tool-notes').value
        };

        try {
            const toolId = await saveTool(tool);
            if (!tool.id) {
                tool.id = toolId;
                appState.tools.push(tool);
            } else {
                const index = appState.tools.findIndex(t => t.id === tool.id);
                appState.tools[index] = tool;
            }

            renderToolsList();
            closeModal('tool-modal');
            showNotification('Herramienta guardada correctamente', 'success');
        } catch (error) {
            console.error('Error al guardar herramienta:', error);
            showNotification('Error al guardar la herramienta', 'error');
        }
    });

    document.getElementById('close-modal').addEventListener('click', () => closeModal('tool-modal'));
    document.getElementById('close-qr-modal').addEventListener('click', () => closeModal('qr-modal'));
    document.getElementById('cancel-button').addEventListener('click', () => closeModal('tool-modal'));

    document.getElementById('generate-qr').addEventListener('click', () => {
        if (appState.selectedTool) {
            generateToolQR(appState.selectedTool);
        } else {
            const tempTool = {
                name: document.getElementById('tool-name').value || 'Nueva Herramienta',
                serialNumber: document.getElementById('tool-serial').value || `S/N_${Date.now()}`,
                category: document.getElementById('tool-category').value,
                status: document.getElementById('tool-status').value,
                location: document.getElementById('tool-location').value,
                notes: document.getElementById('tool-notes').value
            };
            generateToolQR(tempTool);
        }
    });

    document.getElementById('clear-history').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar el historial?')) {
            const openRequest = indexedDB.open('ToolScanDB', 2);
            openRequest.onsuccess = event => {
                const db = event.target.result;
                const transaction = db.transaction(['movements'], 'readwrite');
                const movementsStore = transaction.objectStore('movements');
                movementsStore.clear();
                transaction.oncomplete = () => {
                    document.getElementById('history-table-body').innerHTML = '';
                    showNotification('Historial limpiado', 'success');
                    db.close();
                };
            };
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });

    document.getElementById('add-tool').addEventListener('click', () => openToolModal());

    // Inicializar tooltips de Bootstrap
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Inicializar funcionalidad de la barra lateral
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('sidebar-toggle');
    const mainContent = document.querySelector('.main-content');
    const resizer = document.querySelector('.sidebar-resizer');
    let isResizing = false;

    // Evento para alternar la visibilidad de la barra lateral
    toggleButton.addEventListener('click', () => {
        appState.sidebarCollapsed = !appState.sidebarCollapsed;
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', appState.sidebarCollapsed);
        if (!appState.sidebarCollapsed) {
            mainContent.style.marginLeft = appState.sidebarWidth;
        } else {
            mainContent.style.marginLeft = '0';
        }
    });

    // Eventos para redimensionar la barra lateral
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.addEventListener('mousemove', resizeSidebar);
        document.addEventListener('mouseup', stopResizing);
    });

    function resizeSidebar(e) {
        if (isResizing) {
            const newWidth = e.clientX;
            if (newWidth >= 150 && newWidth <= 400) { // Límites de ancho
                appState.sidebarWidth = `${newWidth}px`;
                sidebar.style.width = appState.sidebarWidth;
                if (!appState.sidebarCollapsed) {
                    mainContent.style.marginLeft = appState.sidebarWidth;
                }
                localStorage.setItem('sidebarWidth', appState.sidebarWidth);
            }
        }
    }

    function stopResizing() {
        isResizing = false;
        document.removeEventListener('mousemove', resizeSidebar);
        document.removeEventListener('mouseup', stopResizing);
    }
}

// Inicializar Service Worker
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration);
            })
            .catch(error => {
                console.error('Error al registrar Service Worker:', error);
            });
    }
}