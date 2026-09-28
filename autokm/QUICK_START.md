# 🚀 Quick Start Guide - AutoKM Development

Aan de slag in 5 minuten!

---

## 📥 Installatie

### 1. Repository klonen
```bash
git clone https://github.com/[jouw-username]/autokm.git
cd autokm
```

### 2. Lokale server starten

**Optie A: Python (Aanbevolen)**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Optie B: Node.js**
```bash
# Installeer http-server (eenmalig)
npm install -g http-server

# Start server
http-server -p 8000 -c-1
```

**Optie C: VS Code**
- Installeer extension "Live Server"
- Rechtsklik op `index.html`
- Kies "Open with Live Server"

### 3. Öffnen in Browser
```
http://localhost:8000
```

✅ **Done!** App is nu beschikbaar

---

## 🧪 Testen

### Test Foto-Upload
1. Ga naar "📸 Foto's" tab
2. Upload een foto (JPG of PNG)
3. Check DevTools (F12) Console voor EXIF/OCR logs
4. Foto verschijnt in gallery

### Test Werkbon-Import
1. Maak test Excel bestand:

```csv
Klant,Adres,Datum,Tijd
Acme Corp,Amsterdam,2024-01-15,08:00
Tech Inc,Rotterdam,2024-01-15,12:30
Home,Amsterdam,2024-01-15,17:00
```

2. Ga naar "📋 Werkbonnen" tab
3. Upload bestand
4. Klik "Importeren"
5. Check tabel voor werkbonnen

### Test Push Notifications
```javascript
// In browser console
new Notification('Test', { 
  body: 'Dit is een test notificatie' 
})
```

### Test Service Worker
```javascript
// In console
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log('SW Registrations:', regs))

// Test offline
DevTools > Application > Service Workers
Toggle "Offline" mode aan
Pagina refreshen → Moet nog laden!
```

---

## 🛠️ Development Tips

### Browser DevTools

**Chrome/Edge/Firefox - F12**

Belangrijke secties:
- **Console**: Errors en logs
- **Application**: localStorage, Service Workers, Cache
- **Network**: API calls (local file serving)

### Debugging

**LocalStorage inspecteren**
```javascript
// Console
appDebug.getPhotos()      // Alle foto's
appDebug.getWerkbonnen()  // Alle werkbonnen
appDebug.getRitten()      // Alle ritten
appDebug.getSettings()    // Instellingen
appDebug.getState()       // Volledige app state
```

**Service Worker debug**
```javascript
// In Service Worker scope
self.skipWaiting()        // Force update
```

**Clear All Data**
```javascript
// Console
localStorage.clear()
location.reload()
```

---

## 📱 Mobile Testing

### Lokaal op Telefoon

**Android:**
```bash
# Start server met 0.0.0.0
python -m http.server 8000 --bind 0.0.0.0

# In telefoon browser
http://[laptop-ip]:8000
```

**iPhone:**
- Zelfde als Android
- iOS Safari ondersteunt Service Workers

### Chrome DevTools Mobile Emulation

1. DevTools openen (F12)
2. Klik device toggle (📱 icoon)
3. Selecteer device (iPhone 12, Pixel 5, etc)
4. Test responsive design

---

## 🔧 Aanpassingen Maken

### Bestanden Bewerken
```
index.html    → UI/HTML
app.js        → App logica
manifest.json → PWA instellingen
```

### Hot Reload
Gebruik Live Server of server die auto-refresh ondersteunt:
```bash
# VS Code Live Server doet dit automatisch
# Python server: refresh browser na wijziging
# Node http-server: refresh browser na wijziging
```

### CSS Aanpassen
CSS staat inline in `index.html` in `<style>` tag:
- `:root` → Kleur variabelen
- `.card` → Card styling
- `.btn-primary` → Button styling

Wijzig en refresh browser.

### JavaScript Logica
Logica staat in `app.js`:
- `handlePhotoUpload()` → Foto upload
- `importWerkbonnen()` → Werkbon import
- `findPhotoMatches()` → Matching algoritme
- `updateDashboard()` → Dashboard updates

---

## 🚀 Deployen

### Naar GitHub

```bash
# Wijzigingen opslaan
git add .
git commit -m "Beschrijving van wijzigingen"

# Push naar remote
git push origin main
```

GitHub Pages deploy automatisch!

Beschikbaar op:
- `https://[username].github.io/autokm/`
- `https://autokm.jouw-domein.nl/` (als Cloudflare geconfigureerd)

---

## 🐛 Veelgestelde Problemen

### "Service Worker laadt niet"
```bash
# Clear cache en retry
Ctrl+Shift+Delete → Clear browsing data
Refresh pagina
```

### "OCR is traag"
- Eerste keer laadt Tesseract model (~100MB)
- Daarna werkt het sneller
- Normale tijd: 2-5 seconden per foto

### "Push notifications werken niet"
```javascript
// Check permission
console.log(Notification.permission)
// Moet 'granted' zijn

// Request permission
Notification.requestPermission()
```

### "localStorage vol"
- Browsers hebben limiet (~5-10MB per domain)
- Verwijder oude foto's of exporteer data
- Of gebruik IndexedDB (toekomstige versie)

### "EXIF/GPS werkt niet"
- EXIF werkt alleen op foto's van device camera
- Downloaded foto's hebben geen EXIF
- GPS werkt alleen als device GPS ingeschakeld was

---

## 📊 Testen met Test Data

### Fake Photo's genereren
```python
# generate_test_photos.py
from PIL import Image, PngImagePlugin
import datetime

# Maak test foto
img = Image.new('RGB', (1920, 1080), color='red')
img.save('test.jpg')
```

### Fake Werkbonnen genereren
```python
import csv
import random

with open('test_werkbonnen.csv', 'w') as f:
    writer = csv.writer(f)
    writer.writerow(['Klant', 'Adres', 'Datum', 'Tijd'])
    writer.writerow(['Klant 1', 'Amsterdam', '2024-01-15', '08:00'])
    writer.writerow(['Klant 2', 'Rotterdam', '2024-01-15', '12:30'])
    writer.writerow(['Home', 'Amsterdam', '2024-01-15', '17:00'])
```

---

## 📚 Nuttige Links

- **JavaScript Console API**: https://developer.mozilla.org/en-US/docs/Web/API/console
- **LocalStorage**: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- **Service Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Push Notifications**: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- **Web Storage**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API

---

## 🆘 Hulp Nodig?

### Debug Logs in App

```javascript
// In app.js, voeg toe:
console.log = (...args) => {
  // Stuur naar server of file
  fetch('/logs', { method: 'POST', body: JSON.stringify(args) })
}
```

### Check Errors
```javascript
// In console
window.addEventListener('error', (e) => {
  console.error('Error:', e)
})
```

### Network Requests
- DevTools Network tab
- Filter op XHR requests
- Check status codes (200, 404, 500)

---

## ✅ Checklist voor Production

- [ ] Service Worker werkt offline
- [ ] Push notifications ingeschakeld
- [ ] Foto upload werkt
- [ ] Werkbon import werkt
- [ ] Matching algoritme functioneel
- [ ] localStorage persistence werkt
- [ ] Mobile responsive
- [ ] HTTPS geconfigureerd
- [ ] DNS correct
- [ ] All assets cached

---

## 🎉 Je bent klaar!

Succes met development! 🚀

Vragen? Check [README.md](./README.md) of open [GitHub Issues](https://github.com/[username]/autokm/issues)

Happy coding! 💻
