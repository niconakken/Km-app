/**
 * AutoKM - Main Application Logic
 * Foto-cache, werkbon-import, automatische matching en push notifications
 */

// ============================================================================
// STORAGE KEYS
// ============================================================================
const STORAGE_KEYS = {
  PHOTOS: 'autokm_photos_v1',
  PHOTO_METADATA: 'autokm_photo_metadata_v1',
  WERKBONNEN: 'autokm_werkbonnen_v1',
  RITTEN: 'autokm_ritten_v1',
  SETTINGS: 'autokm_settings_v1'
};

// ============================================================================
// GLOBAL STATE
// ============================================================================
let appState = {
  photos: [],
  werkbonnen: [],
  ritten: [],
  settings: {
    auto: '',
    kenteken: '',
    naam: '',
    thuis: ''
  },
  currentWerkbonFile: null,
  notificationTimes: [
    { hour: 8, minute: 0, title: 'Goedmorgen! Heb je aan de kilometers gedacht?' },
    { hour: 8, minute: 45, title: 'Herinnering: Heb je aan de kilometers gedacht?' },
    { hour: 13, minute: 15, title: 'Goedemiddag! Heb je aan de kilometers gedacht?' },
    { hour: 17, minute: 30, title: 'Goedenavond! Heb je aan de kilometers gedacht?' }
  ],
  expectedRides: [
    { time: '08:00', description: 'Naar klant 1' },
    { time: '12:30', description: 'Naar klant 2' },
    { time: '17:00', description: 'Naar huis' }
  ]
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  loadAllData();
  updateDashboard();
  setupPhotoUploadDragDrop();
  scheduleNotifications();
  checkServiceWorker();
  setDefaultFilterDate();
});

function loadAllData() {
  try {
    appState.photos = JSON.parse(localStorage.getItem(STORAGE_KEYS.PHOTOS)) || [];
    appState.werkbonnen = JSON.parse(localStorage.getItem(STORAGE_KEYS.WERKBONNEN)) || [];
    appState.ritten = JSON.parse(localStorage.getItem(STORAGE_KEYS.RITTEN)) || [];
    appState.settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || appState.settings;
    loadSettings();
  } catch (e) {
    console.error('Error loading data:', e);
  }
}

function saveAllData() {
  localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(appState.photos));
  localStorage.setItem(STORAGE_KEYS.WERKBONNEN, JSON.stringify(appState.werkbonnen));
  localStorage.setItem(STORAGE_KEYS.RITTEN, JSON.stringify(appState.ritten));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  
  // Add active class to clicked button
  event.target.classList.add('active');
  
  // Update content
  if (tabName === 'ritten') {
    updateRittenTable();
  }
}

// ============================================================================
// PHOTO UPLOAD & PROCESSING
// ============================================================================
function setupPhotoUploadDragDrop() {
  const uploadArea = document.querySelector('.photo-upload-area');
  
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.background = 'rgba(11, 45, 94, 0.1)';
    uploadArea.style.borderColor = '#20c997';
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.background = 'rgba(11, 45, 94, 0.05)';
    uploadArea.style.borderColor = '#0b2d5e';
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.background = 'rgba(11, 45, 94, 0.05)';
    uploadArea.style.borderColor = '#0b2d5e';
    
    const files = e.dataTransfer.files;
    handlePhotoUpload({ target: { files } });
  });
}

async function handlePhotoUpload(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  showLoadingUI(true);
  
  try {
    for (const file of files) {
      await processPhoto(file);
    }
    
    showAlert('photosAlert', `✓ ${files.length} foto(s) succesvol opgeslagen`, 'success');
    updatePhotosGallery();
    updateDashboard();
  } catch (error) {
    showAlert('photosAlert', `❌ Fout bij verwerking: ${error.message}`, 'danger');
  } finally {
    showLoadingUI(false);
    event.target.value = '';
  }
}

async function processPhoto(file) {
  // 1. Read file
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });

  // 2. Extract EXIF
  const exifData = extractExif(arrayBuffer);

  // 3. OCR km-teller
  const ocrData = await performOCR(blob);

  // 4. Convert to Data URL
  const dataUrl = await blobToDataUrl(blob);

  // 5. Create photo object
  const photo = {
    id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    filename: file.name,
    uploadedAt: new Date().toISOString(),
    exif: exifData,
    ocr: ocrData,
    dataUrl: dataUrl,
    matched: false,
    matchedTo: null
  };

  appState.photos.push(photo);
  localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(appState.photos));
  
  return photo;
}

function extractExif(arrayBuffer) {
  try {
    if (typeof PIEXIF === 'undefined') {
      return createDefaultExif();
    }

    const exifDict = PIEXIF.load(arrayBuffer);
    const ifd = exifDict["0th"] || {};
    const gps = exifDict["GPS"] || {};
    const exif = exifDict["Exif"] || {};

    // DateTime
    let datetime = ifd[PIEXIF.ImageIFD.DateTime] || exif[PIEXIF.ExifIFD.DateTimeOriginal];
    let dateObj = new Date();

    if (datetime) {
      const [datePart, timePart] = datetime.split(' ');
      const [year, month, day] = datePart.split(':');
      const [hours, minutes, seconds] = timePart.split(':');
      dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
    }

    // GPS
    let lat = null, lon = null;
    if (gps[PIEXIF.GPSIFD.GPSLatitude]) {
      lat = gpsToDecimal(gps[PIEXIF.GPSIFD.GPSLatitude]);
      const latRef = gps[PIEXIF.GPSIFD.GPSLatitudeRef];
      if (latRef === 'S') lat = -lat;

      lon = gpsToDecimal(gps[PIEXIF.GPSIFD.GPSLongitude]);
      const lonRef = gps[PIEXIF.GPSIFD.GPSLongitudeRef];
      if (lonRef === 'W') lon = -lon;
    }

    return {
      datetime: dateObj.toISOString(),
      date: dateObj.toISOString().split('T')[0],
      time: dateObj.toTimeString().split(' ')[0].slice(0, 5),
      latitude: lat,
      longitude: lon,
      hasGPS: lat !== null && lon !== null
    };
  } catch (error) {
    console.error('EXIF extraction error:', error);
    return createDefaultExif();
  }
}

function createDefaultExif() {
  const now = new Date();
  return {
    datetime: now.toISOString(),
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0].slice(0, 5),
    latitude: null,
    longitude: null,
    hasGPS: false
  };
}

function gpsToDecimal(gpsArray) {
  let result = 0;
  const multipliers = [1, 1/60, 1/3600];
  gpsArray.forEach((fraction, index) => {
    const value = fraction[0] / fraction[1];
    result += value * multipliers[index];
  });
  return result;
}

async function performOCR(imageBlob) {
  try {
    if (typeof Tesseract === 'undefined') {
      return { detected: false, kmValue: 0, confidence: 0, rawText: '' };
    }

    const { data } = await Tesseract.recognize(imageBlob, 'eng+nld');
    const allText = data.text;

    // Search for km pattern
    const kmPattern = /(\d{4,6})\s*km?/i;
    let kmValue = null;
    let confidence = 0;

    for (const line of allText.split('\n')) {
      const match = line.match(kmPattern);
      if (match) {
        kmValue = parseInt(match[1]);
        confidence = Math.round(data.confidence || 80);
        break;
      }
    }

    // Fallback
    if (!kmValue) {
      const numberMatch = allText.match(/(\d{5,6})/);
      if (numberMatch) {
        kmValue = parseInt(numberMatch[1]);
        confidence = 50;
      }
    }

    return {
      detected: kmValue !== null,
      kmValue: kmValue || 0,
      confidence: confidence,
      rawText: allText
    };
  } catch (error) {
    console.error('OCR error:', error);
    return { detected: false, kmValue: 0, confidence: 0, rawText: '' };
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function updatePhotosGallery() {
  const gallery = document.getElementById('photoGallery');
  
  if (appState.photos.length === 0) {
    gallery.style.display = 'none';
    return;
  }

  gallery.style.display = 'grid';
  gallery.innerHTML = '';

  appState.photos.forEach(photo => {
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    photoItem.onclick = () => showPhotoDetails(photo);

    const statusClass = photo.matched ? 'matched' : 'pending';
    const statusText = photo.matched ? '✓ Matched' : 'Pending';

    photoItem.innerHTML = `
      <img src="${photo.dataUrl}" alt="Dashboard photo">
      <div class="photo-badge ${statusClass}">${statusText}</div>
      <div class="photo-info">
        ${photo.ocr.kmValue} km (${photo.ocr.confidence}%)
      </div>
      <button class="photo-delete" onclick="deletePhoto('${photo.id}', event)">×</button>
    `;

    gallery.appendChild(photoItem);
  });
}

function showPhotoDetails(photo) {
  const modalContent = document.getElementById('photoModalContent');
  
  const matchInfo = photo.matched 
    ? `<p><strong>Gematched met werkbon:</strong> ${new Date(photo.matchedTo.matchedAt).toLocaleString('nl-NL')}</p>`
    : '<p style="color: var(--warning);"><strong>Status:</strong> Nog niet gematched</p>';

  const gpsInfo = photo.exif.hasGPS
    ? `<p><strong>GPS:</strong> ${photo.exif.latitude.toFixed(4)}°, ${photo.exif.longitude.toFixed(4)}°</p>`
    : '<p><strong>GPS:</strong> Geen GPS-gegevens</p>';

  modalContent.innerHTML = `
    <img src="${photo.dataUrl}" style="width: 100%; border-radius: 4px; margin-bottom: 15px;">
    <p><strong>Datum/Tijd:</strong> ${photo.exif.date} ${photo.exif.time}</p>
    <p><strong>Kilometerstand:</strong> ${photo.ocr.kmValue} km (betrouwbaarheid: ${photo.ocr.confidence}%)</p>
    ${gpsInfo}
    ${matchInfo}
    <div class="btn-group">
      <button class="btn-secondary" onclick="closeModal('photoModal')">Sluiten</button>
    </div>
  `;

  document.getElementById('photoModal').classList.add('show');
}

function deletePhoto(photoId, event) {
  event.stopPropagation();
  
  if (confirm('Weet je zeker dat je deze foto wilt verwijderen?')) {
    appState.photos = appState.photos.filter(p => p.id !== photoId);
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(appState.photos));
    updatePhotosGallery();
    updateDashboard();
    showToast('✓ Foto verwijderd');
  }
}

// ============================================================================
// WERKBON IMPORT
// ============================================================================
function handleWerkbonUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  appState.currentWerkbonFile = file;
  showToast('✓ Bestand geladen. Klik "Importeren" om door te gaan');
}

async function importWerkbonnen() {
  if (!appState.currentWerkbonFile) {
    showAlert('werkbonAlert', 'Selecteer eerst een bestand', 'danger');
    return;
  }

  try {
    showLoadingUI(true);
    
    const data = await parseWerkbonFile(appState.currentWerkbonFile);
    const werkbonnen = parseWerkbonData(data);

    // Match met foto's
    await matchPhotosWithWerkbonnen(werkbonnen);

    appState.werkbonnen = werkbonnen;
    localStorage.setItem(STORAGE_KEYS.WERKBONNEN, JSON.stringify(appState.werkbonnen));

    displayWerkbonTable(werkbonnen);
    showAlert('werkbonAlert', `✓ ${werkbonnen.length} werkbon(nen) geïmporteerd`, 'success');
    updateDashboard();

  } catch (error) {
    showAlert('werkbonAlert', `❌ Fout: ${error.message}`, 'danger');
  } finally {
    showLoadingUI(false);
  }
}

async function parseWerkbonFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  
  // Detecteer file type
  if (file.name.endsWith('.csv')) {
    return parseCSV(new TextDecoder().decode(arrayBuffer));
  } else {
    return XLSX.read(arrayBuffer, { type: 'array' });
  }
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const rows = [];
  
  lines.forEach((line, index) => {
    if (index === 0) return; // Skip header
    const cols = line.split(',').map(c => c.trim());
    if (cols.length >= 4) {
      rows.push(cols);
    }
  });
  
  return rows;
}

function parseWerkbonData(data) {
  let rows = [];

  // Check if it's XLSX object or CSV array
  if (data.SheetNames) {
    // Excel
    const sheet = XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]]);
    rows = sheet;
  } else {
    // CSV
    rows = data;
  }

  // Map columns - flexible matching
  const werkbonnen = rows.map((row, index) => {
    const klant = row.Klant || row.klant || row.KLANT || Object.values(row)[0] || '';
    const adres = row.Adres || row.adres || row.ADRES || Object.values(row)[1] || '';
    const datum = row.Datum || row.datum || row.DATUM || Object.values(row)[2] || '';
    const tijd = row.Tijd || row.tijd || row.TIJD || Object.values(row)[3] || '';

    return {
      id: 'wb_' + Date.now() + '_' + index,
      klant: String(klant).trim(),
      adres: String(adres).trim(),
      datum: String(datum).trim(),
      tijd: String(tijd).trim(),
      photoMatch: null,
      photoKmValue: null,
      photoConfidence: null,
      status: 'pending'
    };
  });

  return werkbonnen;
}

async function matchPhotosWithWerkbonnen(werkbonnen) {
  for (const werkbon of werkbonnen) {
    const matches = findPhotoMatches(werkbon);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      werkbon.photoMatch = bestMatch.photo.id;
      werkbon.photoKmValue = bestMatch.photo.ocr.kmValue;
      werkbon.photoConfidence = bestMatch.photo.ocr.confidence;
      werkbon.status = 'matched';
      
      // Mark photo as matched
      bestMatch.photo.matched = true;
      bestMatch.photo.matchedTo = {
        werkbonIndex: werkbonnen.indexOf(werkbon),
        matchedAt: new Date().toISOString()
      };
    }
  }

  localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(appState.photos));
}

function findPhotoMatches(werkbon) {
  const matches = [];

  // Parse werkbon time
  const [wb_year, wb_month, wb_day] = werkbon.datum.split('-').length === 3 
    ? werkbon.datum.split('-') 
    : werkbon.datum.split('/');
  const [wb_hour, wb_min] = werkbon.tijd.split(':');
  
  const werkbonTime = new Date(wb_year, wb_month - 1, wb_day, wb_hour, wb_min);

  for (const photo of appState.photos) {
    if (photo.matched) continue; // Skip already matched

    let score = 0;
    const details = {};

    // 1. Time matching (0-50 points)
    // Match within 1.5 hours (5400 seconds) of expected ride times
    const expectedRideTimes = [
      new Date(wb_year, wb_month - 1, wb_day, 8, 0),  // 08:00
      new Date(wb_year, wb_month - 1, wb_day, 12, 30), // 12:30
      new Date(wb_year, wb_month - 1, wb_day, 17, 0)   // 17:00
    ];

    const photoTime = new Date(photo.exif.datetime);
    const minTimeDiff = Math.min(...expectedRideTimes.map(t => Math.abs(t - photoTime)));
    const maxTimeDiff = 1.5 * 60 * 60 * 1000; // 1.5 hours in ms

    if (minTimeDiff <= maxTimeDiff) {
      score += 50 * (1 - minTimeDiff / maxTimeDiff);
      details.timeMatch = true;
      details.timeDiff = Math.round(minTimeDiff / 1000 / 60); // minutes
    }

    // 2. GPS matching (0-30 points)
    if (photo.exif.hasGPS) {
      // Simple distance check: if GPS exists, give points
      score += 30;
      details.gpsMatch = true;
      details.gps = {
        lat: photo.exif.latitude,
        lon: photo.exif.longitude
      };
    }

    // 3. OCR confidence (0-20 points)
    if (photo.ocr.detected && photo.ocr.confidence > 50) {
      score += photo.ocr.confidence / 5; // 10-20 points
      details.ocrMatch = true;
      details.kmValue = photo.ocr.kmValue;
      details.confidence = photo.ocr.confidence;
    }

    if (score >= 30) { // Minimum score threshold
      matches.push({
        photo: photo,
        score: Math.round(score),
        details: details
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

function displayWerkbonTable(werkbonnen) {
  const tableContainer = document.getElementById('werkbonTable');
  const tableBody = document.getElementById('werkbonTableBody');

  if (werkbonnen.length === 0) {
    tableContainer.style.display = 'none';
    return;
  }

  tableContainer.style.display = 'block';
  tableBody.innerHTML = '';

  werkbonnen.forEach(wb => {
    const statusBadge = wb.status === 'matched'
      ? '<span class="status-badge status-success">✓ Matched</span>'
      : '<span class="status-badge status-warning">Pending</span>';

    const kmDisplay = wb.photoKmValue 
      ? `${wb.photoKmValue} km (${wb.photoConfidence}%)`
      : '-';

    const row = `
      <tr>
        <td>${wb.klant}</td>
        <td>${wb.adres}</td>
        <td>${wb.datum}</td>
        <td>${wb.tijd}</td>
        <td>${statusBadge}</td>
        <td>${kmDisplay}</td>
      </tr>
    `;

    tableBody.innerHTML += row;
  });
}

// ============================================================================
// RITTEN MANAGEMENT
// ============================================================================
function updateRittenTable() {
  const filterDate = document.getElementById('filterDate').value;
  const table = document.getElementById('rittenTable');
  const tableBody = document.getElementById('rittenTableBody');
  const noRittenMsg = document.getElementById('noRitten');

  // Filter ritten
  let filteredRitten = appState.ritten;
  if (filterDate) {
    filteredRitten = filteredRitten.filter(r => r.datum === filterDate);
  }

  if (filteredRitten.length === 0) {
    table.style.display = 'none';
    noRittenMsg.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  noRittenMsg.style.display = 'none';
  tableBody.innerHTML = '';

  filteredRitten.forEach(rit => {
    const afstand = rit.kmEind - rit.kmBegin;
    const typeBadge = `<span class="status-badge status-${rit.type === 'zakelijk' ? 'success' : 'warning'}">${rit.type}</span>`;

    const row = `
      <tr>
        <td>${rit.datum}</td>
        <td>${rit.time}</td>
        <td>${rit.van}</td>
        <td>${rit.naar}</td>
        <td>${rit.kmBegin}</td>
        <td>${rit.kmEind}</td>
        <td>${afstand}</td>
        <td>${typeBadge}</td>
      </tr>
    `;

    tableBody.innerHTML += row;
  });
}

function setDefaultFilterDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('filterDate').value = today;
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showAlert('notification-status', 'Push notifications worden niet ondersteund in je browser', 'warning');
    return;
  }

  if (Notification.permission === 'granted') {
    showAlert('notification-status', '✓ Push notifications zijn al ingeschakeld', 'success');
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    showAlert('notification-status', '✓ Push notifications ingeschakeld!', 'success');
    scheduleNotifications();
    
    // Test notification
    new Notification('AutoKM', {
      body: 'Push notifications zijn nu actief',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%230b2d5e" width="180" height="180"/><text x="90" y="120" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">KM</text></svg>'
    });
  } else {
    showAlert('notification-status', '❌ Notifications-toestemming geweigerd', 'danger');
  }
}

function scheduleNotifications() {
  // Check notifications every minute
  setInterval(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    appState.notificationTimes.forEach(notifTime => {
      if (currentHour === notifTime.hour && currentMinute === notifTime.minute) {
        sendNotification(notifTime.title);
      }
    });
  }, 60000); // Every minute
}

function sendNotification(title) {
  if (Notification.permission === 'granted') {
    new Notification('AutoKM', {
      body: title,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%230b2d5e" width="180" height="180"/><text x="90" y="120" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">KM</text></svg>',
      tag: 'autokm-reminder',
      requireInteraction: false
    });
  }
}

// ============================================================================
// SETTINGS
// ============================================================================
function loadSettings() {
  document.getElementById('settingsAuto').value = appState.settings.auto;
  document.getElementById('settingsKenteken').value = appState.settings.kenteken;
  document.getElementById('settingsNaam').value = appState.settings.naam;
  document.getElementById('settingsThuis').value = appState.settings.thuis;
}

function saveSettings() {
  appState.settings.auto = document.getElementById('settingsAuto').value;
  appState.settings.kenteken = document.getElementById('settingsKenteken').value;
  appState.settings.naam = document.getElementById('settingsNaam').value;
  appState.settings.thuis = document.getElementById('settingsThuis').value;

  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
  showToast('✓ Instellingen opgeslagen');
}

function exportData() {
  const data = {
    exported: new Date().toISOString(),
    photos: appState.photos.length,
    werkbonnen: appState.werkbonnen,
    ritten: appState.ritten,
    settings: appState.settings
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `autokm_export_${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  URL.revokeObjectURL(url);
  showToast('✓ Data geëxporteerd');
}

function clearAllData() {
  if (confirm('⚠️ Dit verwijdert ALLES. Dit kan niet ongedaan gemaakt worden. Ben je zeker?')) {
    if (confirm('Echt helemaal alles?')) {
      localStorage.clear();
      location.reload();
    }
  }
}

// ============================================================================
// DASHBOARD
// ============================================================================
function updateDashboard() {
  // Count photos
  document.getElementById('stat-photos').textContent = appState.photos.length;

  // Count werkbonnen
  document.getElementById('stat-werkbonnen').textContent = appState.werkbonnen.length;

  // Count ritten today
  const today = new Date().toISOString().split('T')[0];
  const rittenToday = appState.ritten.filter(r => r.datum === today);
  document.getElementById('stat-ritten').textContent = rittenToday.length;

  // Sum km today
  const kmToday = rittenToday.reduce((sum, r) => sum + (r.kmEind - r.kmBegin), 0);
  document.getElementById('stat-km').textContent = kmToday;

  // Update notification status
  if ('Notification' in window) {
    const status = Notification.permission === 'granted' ? '✓ Actief' : 'Inactief';
    document.getElementById('notification-status').innerHTML = `<strong>Push Notifications:</strong> ${status}`;
  }
}

// ============================================================================
// UI HELPERS
// ============================================================================
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';

  clearTimeout(toast.__timeout);
  toast.__timeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function showAlert(elementId, message, type = 'info') {
  const element = document.getElementById(elementId);
  element.className = `alert alert-${type}`;
  element.innerHTML = message;
  element.style.display = 'block';
}

function showLoadingUI(show) {
  const loading = document.getElementById('photosLoading');
  if (show) {
    loading.style.display = 'block';
  } else {
    loading.style.display = 'none';
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

function checkServiceWorker() {
  if ('serviceWorker' in navigator) {
    document.getElementById('swStatus').textContent = '✓ Ingeschakeld';
  } else {
    document.getElementById('swStatus').textContent = '❌ Niet ondersteund';
  }
}

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================
window.appDebug = {
  getState: () => appState,
  getPhotos: () => appState.photos,
  getWerkbonnen: () => appState.werkbonnen,
  getRitten: () => appState.ritten,
  getSettings: () => appState.settings
};
