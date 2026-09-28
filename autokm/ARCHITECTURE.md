# 🏗️ AutoKM Architecture

Technische documentatie van AutoKM's ontwerp.

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (CLIENT-SIDE)                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │              UI Layer (HTML/CSS)                 │   │
│  │  - Tabs (Dashboard, Photos, Werkbonnen, etc)    │   │
│  │  - Cards & Tables                               │   │
│  │  - Photo Gallery                                │   │
│  │  - Forms (Settings, Upload)                     │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↕                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Application Logic (app.js)            │   │
│  │  - Photo processing (EXIF, OCR)                 │   │
│  │  - Werkbon parsing & import                     │   │
│  │  - Automatic matching algorithm                 │   │
│  │  - Push notifications scheduling                │   │
│  │  - Data management                              │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↕                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │             Storage Layer                        │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │ localStorage (5-10MB quota)              │   │   │
│  │  │ - STORAGE_KEYS.PHOTOS                   │   │   │
│  │  │ - STORAGE_KEYS.WERKBONNEN               │   │   │
│  │  │ - STORAGE_KEYS.RITTEN                   │   │   │
│  │  │ - STORAGE_KEYS.SETTINGS                 │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↕                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Service Worker & PWA                   │   │
│  │  - Offline support (cache-first)                │   │
│  │  - Push notifications                           │   │
│  │  - Background sync                              │   │
│  │  - App installation                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Photo Upload Flow

```
User selects photo
        ↓
handlePhotoUpload()
        ↓
  ┌─────────────────────────────────────┐
  │  processPhoto()                     │
  │  ├── Read ArrayBuffer               │
  │  ├── extractExif()                  │
  │  │   ├── piexif.load()              │
  │  │   ├── DateTime                   │
  │  │   ├── GPS (lat/lon)              │
  │  │   └── return: { date, time, gps }│
  │  ├── performOCR()                   │
  │  │   ├── Tesseract.recognize()      │
  │  │   ├── Regex: \d{4,6}km?          │
  │  │   └── return: { kmValue, conf }  │
  │  ├── blobToDataUrl()                │
  │  └── Create photo object            │
  └─────────────────────────────────────┘
        ↓
Save to localStorage
        ↓
updatePhotosGallery()
        ↓
Photo shows in gallery with badges
```

### Werkbon Import Flow

```
User uploads Excel/CSV
        ↓
handleWerkbonUpload()
        ├── Save to appState.currentWerkbonFile
        └── Show ready message
        ↓
User clicks "Importeren"
        ↓
importWerkbonnen()
        ├── parseWerkbonFile()
        │   ├── Check file type
        │   ├── If Excel: XLSX.read()
        │   └── If CSV: parseCSV()
        ├── parseWerkbonData()
        │   ├── Map columns flexibly
        │   ├── Create werkbon objects
        │   └── return: array of werkbonnen
        ├── matchPhotosWithWerkbonnen()
        │   ├── For each werkbon:
        │   │   ├── findPhotoMatches()
        │   │   ├── Score each photo
        │   │   ├── Pick best match
        │   │   └── Mark photo as matched
        │   └── Save to appState.photos
        └── Save to localStorage
        ↓
displayWerkbonTable()
        ↓
Table shows werkbonnen with matched status
```

### Automatic Matching Flow

```
werkbonTime = werkbon.datum + werkbon.tijd

For each unmatched photo:
  score = 0
  
  ✓ Time Matching (0-50 points)
    - expectedRideTimes = [08:00, 12:30, 17:00]
    - Find minimum diff to expected time
    - If diff <= 1.5 hours:
      - score += 50 * (1 - diff/1.5hrs)
  
  ✓ GPS Matching (0-30 points)
    - If photo has GPS coordinates:
      - score += 30
  
  ✓ OCR Confidence (0-20 points)
    - If OCR detected AND confidence > 50%:
      - score += confidence / 5
  
  if score >= 30:
    Add to matches list

Sort matches by score (descending)
Return best match
```

---

## 📦 Storage Schema

### STORAGE_KEYS.PHOTOS
```javascript
[
  {
    id: "photo_1705318000123_abc123",
    filename: "IMG_1234.jpg",
    uploadedAt: "2024-01-15T10:00:00Z",
    exif: {
      datetime: "2024-01-15T10:00:00Z",
      date: "2024-01-15",
      time: "10:00",
      latitude: 52.3676,
      longitude: 4.9041,
      hasGPS: true
    },
    ocr: {
      detected: true,
      kmValue: 75680,
      confidence: 92,
      rawText: "..."
    },
    dataUrl: "data:image/jpeg;base64,...",
    matched: true,
    matchedTo: {
      werkbonIndex: 0,
      matchedAt: "2024-01-15T10:05:00Z"
    }
  }
]
```

### STORAGE_KEYS.WERKBONNEN
```javascript
[
  {
    id: "wb_1705318000123_0",
    klant: "Acme Corp",
    adres: "Prinsengracht 100, Amsterdam",
    datum: "2024-01-15",
    tijd: "08:00",
    photoMatch: "photo_1705318000123_abc123",
    photoKmValue: 75680,
    photoConfidence: 92,
    status: "matched"  // or "pending"
  }
]
```

### STORAGE_KEYS.RITTEN
```javascript
[
  {
    id: "rit_1705318000123_0",
    datum: "2024-01-15",
    time: "08:00",
    van: "Thuis",
    naar: "Acme Corp",
    kmBegin: 75680,
    kmEind: 75750,
    type: "zakelijk",  // or "privé"
    werkbonId: "wb_1705318000123_0"
  }
]
```

### STORAGE_KEYS.SETTINGS
```javascript
{
  auto: "Volkswagen Golf",
  kenteken: "AB-CD-EF",
  naam: "Jan Jansen",
  thuis: "Amsterdam"
}
```

---

## 🔀 Matching Algorithm

### Score Calculation

```javascript
function scorePhotoForWerkbon(photo, werkbon) {
  let score = 0;
  
  // 1. TIME MATCH (0-50 pts)
  const expectedTimes = [
    new Date(year, month, day, 8, 0),    // 08:00
    new Date(year, month, day, 12, 30),  // 12:30
    new Date(year, month, day, 17, 0)    // 17:00
  ];
  
  const photoTime = new Date(photo.exif.datetime);
  const minDiff = Math.min(
    ...expectedTimes.map(t => Math.abs(t - photoTime))
  );
  
  const maxWindow = 1.5 * 60 * 60 * 1000; // 1.5 hours
  
  if (minDiff <= maxWindow) {
    score += 50 * (1 - minDiff / maxWindow);
  }
  
  // 2. GPS MATCH (0-30 pts)
  if (photo.exif.hasGPS) {
    score += 30;  // Bonus for GPS availability
  }
  
  // 3. OCR CONFIDENCE (0-20 pts)
  if (photo.ocr.detected && photo.ocr.confidence > 50) {
    score += photo.ocr.confidence / 5;  // 10-20 points
  }
  
  return score;
}
```

### Match Threshold
- **Minimum score**: 30 points
- **Auto-match**: Score >= 30
- **Quality indicator**: Higher score = better match

### Edge Cases
- Multiple matches for one werkbon → Pick highest score
- No matches → Mark as pending
- Photo already matched → Skip

---

## 🔔 Push Notification System

### Scheduling

```javascript
// Every minute check:
notificationTimes = [
  { hour: 8, minute: 0 },
  { hour: 8, minute: 45 },
  { hour: 13, minute: 15 },
  { hour: 17, minute: 30 }
];

setInterval(() => {
  const now = new Date();
  for (let time of notificationTimes) {
    if (now.hour === time.hour && now.minute === time.minute) {
      sendNotification("Heb je aan de kilometers gedacht?");
    }
  }
}, 60000);
```

### Service Worker Integration

```javascript
// service-worker.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    tag: 'autokm-reminder'
  });
});
```

### Browser Support
- Chrome: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ⚠️ Desktop only (Web Push API not on iOS)
- Edge: ✅ Full support

---

## 💾 Storage Limits & Strategies

### LocalStorage Quota
```
Desktop: ~5-10MB per domain
Mobile: ~2-5MB per domain
Varies by browser
```

### Space Calculation
```
1 Photo = ~100-500KB (data URL)
  - JPEG: ~300KB
  - PNG: ~400KB
  
Typical storage:
- 10 photos = 3-5MB
- 100 werkbonnen = <100KB
- Settings = <1KB

Total: ~3-5MB for normal usage
```

### Future: IndexedDB
```javascript
// Planned for v2.0
// IndexedDB: No quota limit (async)
// Fallback to localStorage for now
```

---

## 🎯 Performance Optimization

### Bottlenecks

| Task | Time | Optimization |
|------|------|--------------|
| EXIF Extraction | ~50ms | Native piexif.js |
| OCR Recognition | 2-5s | Cached Tesseract model |
| Photo Upload | Variable | Async processing |
| Gallery Render | ~100ms | Virtual scrolling (future) |
| Matching Algorithm | ~100ms | Precomputed scores |

### Caching Strategy

```javascript
// Service Worker Cache
CACHE_NAME = 'autokm-v1';

Strategy: Cache-first, network fallback
1. Check cache
2. If miss → fetch from network
3. Update cache
4. Return response
```

### Memory Management

```javascript
// Prevent memory leaks
- Clear event listeners on modal close
- Unsubscribe from intervals
- Delete large objects when done
- Reload full page after delete all
```

---

## 🔐 Security Considerations

### Client-Side Only
- ✅ No sensitive data sent to server
- ✅ No authentication needed
- ✅ All data stays in browser
- ⚠️ Data vulnerable if device compromised

### Best Practices
- ✅ Export and backup regularly
- ✅ Use HTTPS only (Cloudflare)
- ✅ Clear browser data periodically
- ⚠️ Don't share browser/device with others

### Privacy
- ✅ No tracking or analytics
- ✅ No cookies (except session)
- ✅ No external API calls
- ✅ No data sharing

---

## 📱 PWA Features

### Installability
```json
manifest.json provides:
- app name & icons
- display mode (standalone)
- theme colors
- shortcuts
- screenshot previews
```

### Service Worker
```javascript
- Offline support (cache-first)
- Push notifications
- Background sync (future)
- App shell caching
```

### Installation
- iOS: Share → Add to Home Screen
- Android: Menu → Install app
- Desktop: Address bar install button

---

## 🔄 Update Strategy

### Version Management
```javascript
// service-worker.js
const CACHE_NAME = 'autokm-v1';  // Increment on update
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  // etc
];
```

### User Update Flow
1. User visits site
2. Service Worker checks for new version
3. If new version found:
   - Download silently
   - Show "Update Available" message
   - User clicks refresh
   - New version activated

---

## 🧪 Testing Strategy

### Unit Testing
```javascript
// Test individual functions
- extractExif()
- performOCR()
- findPhotoMatches()
- parseWerkbonData()
```

### Integration Testing
```javascript
- Photo → Werkbon matching
- localStorage persistence
- Service Worker activation
- Push notification scheduling
```

### Manual Testing
```javascript
- Browser: Chrome, Firefox, Safari
- Mobile: iOS, Android
- Offline: Toggle offline mode
- Storage: Check localStorage quota
```

---

## 📊 Monitoring & Debugging

### Debug Interface
```javascript
// In browser console:
appDebug.getState()          // Full state
appDebug.getPhotos()         // Photos
appDebug.getWerkbonnen()     // Werkbonnen
appDebug.getRitten()         // Ritten
appDebug.getSettings()       // Settings
```

### Error Handling
```javascript
try-catch blocks on:
- Photo processing
- EXIF extraction
- OCR recognition
- Werkbon parsing
- localStorage access
```

---

## 🚀 Deployment Architecture

```
┌──────────────┐
│  GitHub Repo │
└──────┬───────┘
       │ (git push)
       ↓
┌──────────────────┐
│  GitHub Pages    │
│  (Host HTML/CSS) │
└──────┬───────────┘
       │ (DNS)
       ↓
┌──────────────────┐
│  Cloudflare CDN  │
│  + DNS + SSL     │
└──────┬───────────┘
       │ (HTTPS)
       ↓
┌──────────────────┐
│  Browser Cache   │
│  + Service Worker│
│  + localStorage  │
└──────────────────┘
```

---

## 📈 Scalability

### Current Limits
- Max ~1000 werkbonnen (localStorage)
- Max ~100 photos (storage quota)
- All data processed client-side

### Future Scaling
- IndexedDB for unlimited storage
- Background sync to cloud (optional)
- Separate storage for large datasets
- Web Workers for heavy processing

---

**AutoKM is a proof-of-concept for a fully client-side business application.**

No backend required, infinite scalability potential! 🚀
