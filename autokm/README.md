# 📍 AutoKM - Kilometer Registratie App

Een progressive web app (PWA) voor het registreren van zakelijke kilometers met behulp van:
- 📸 **Automatische foto-analyse**: EXIF-metadata (datum, tijd, GPS) + OCR (kilometerstand)
- 📋 **Werkbon-import**: Excel/CSV met klant, adres, datum, tijd
- 🔄 **Intelligente matching**: Automatische koppeling foto's met werkbonnen
- 🔔 **Push notifications**: Herinneringen op vaste momenten
- 📱 **Installeerbare app**: Werkt offline, installeerbaar op telefoon/desktop

---

## 🚀 Snelle Start

### Voor Gebruikers
1. Ga naar: `https://autokm.jouw-domein.nl/`
2. Installeer app (zie "installatie instructies" in app)
3. Activeer push notifications
4. Upload foto's of importeer werkbonnen

### Voor Ontwikkelaars
```bash
# Clone repo
git clone https://github.com/[jouw-username]/autokm.git
cd autokm

# Start lokale server
python -m http.server 8000
# of
npx http-server

# Open in browser
open http://localhost:8000
```

---

## ✨ Features

### 📸 Foto-Upload
- **EXIF-extractie**: Automatische uitlezing van:
  - Datum & Tijd (wanneer foto genomen is)
  - GPS-coördinaten (waar foto genomen is)
- **OCR-herkenning**: Tesseract.js leest km-stand uit foto
- **Offline-first**: Alles opgeslagen in browser cache
- **Drag-and-drop**: Sleep foto's rechtstreeks naar upload-vak

### 📋 Werkbon-Import
Ondersteunde formaten: Excel (.xlsx) en CSV

Verwachte kolommen:
- **Klant**: Naam van de klant
- **Adres**: Adres van de werkbon
- **Datum**: Datum in formaat YYYY-MM-DD
- **Tijd**: Tijd in formaat HH:MM

Maximaal 3 ritten per dag:
- 08:00 → Klant 1
- 12:30 → Klant 2
- 17:00 → Huis

### 🔄 Automatische Matching
Koppelt foto's aan werkbonnen op basis van:
- **Tijd**: ±1.5 uur van verwachte rittime
- **Locatie**: GPS-coördinaten beschikbaar
- **OCR-confidence**: Betrouwbaarheid km-lezing

Score-systeem:
- Time match: 0-50 punten
- GPS match: 0-30 punten
- OCR confidence: 0-20 punten
- **Minimum**: 30 punten voor match

### 🔔 Push Notifications
Automatische herinneringen op:
- 08:00 - "Heb je aan de kilometers gedacht?"
- 08:45 - "Heb je aan de kilometers gedacht?"
- 13:15 - "Heb je aan de kilometers gedacht?"
- 17:30 - "Heb je aan de kilometers gedacht?"

Werkt op: iOS, Android, Windows, Mac

### 📊 Dashboard
Real-time statistieken:
- Aantal foto's in cache
- Aantal werkbonnen
- Ritten vandaag
- Totaal kilometers vandaag

### ⚙️ Instellingen
Opslaan van:
- Voertuig (merk/model)
- Kenteken
- Naam bestuurder
- Thuisadres (voor automatische matching)

---

## 🔧 Technische Stack

### Frontend
- **Vanilla JavaScript** (geen frameworks)
- **HTML5** met progressive enhancement
- **CSS3** met responsive design
- **Service Workers** voor offline support

### Libraries
- **piexif.js** (0.0.11) - EXIF-metadata extractie
- **Tesseract.js** (5.0.0) - OCR (OCR)
- **xlsx** (0.18.5) - Excel-import

### Storage
- **localStorage** (browser cache) - Alle data opgeslagen client-side
- **Service Worker** - Offline functionality
- **Progressive Web App** - Installeerbaar als native app

### Infrastructure
- **GitHub Pages** - Hosting
- **Cloudflare** - CDN + SSL + DNS
- **No backend** - Alles client-side!

---

## 📁 Project Structuur

```
autokm/
├── index.html                  # Main app UI
├── app.js                      # Main application logic
├── service-worker.js           # Offline + push notifications
├── service-worker-register.js  # SW registration
├── manifest.json               # PWA manifest
├── DEPLOYMENT.md               # Deploy instructies
├── README.md                   # Dit bestand
├── .gitignore                  # Git ignore rules
└── CNAME                       # Custom domain (optioneel)
```

---

## 🔐 Privacy & Beveiliging

### ✅ Client-side Only
- Alle data blijft in je browser
- Geen uploads naar servers
- Geen tracking of analytics
- Geen cookies (behalve auth)

### ✅ Data Persistence
- **localStorage** voor semi-permanente opslag
- **Session storage** voor sessie-data
- **IndexedDB** beschikbaar voor grote bestanden (toekomstig)

### ⚠️ Pas Op
- Verwijder data niet per ongeluk (geen backup op server!)
- Exporteer regelmatig je data
- Gebruik "Exporteer Data" feature voor backups

---

## 📱 Browser Support

### Desktop
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

### Mobile
- ✅ iOS Safari 14+
- ✅ Android Chrome 90+
- ✅ Samsung Internet 14+

### Features per Browser

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| Photo Upload | ✅ | ✅ | ✅ |
| EXIF Reading | ✅ | ✅ | ⚠️ (Limited) |
| OCR (Tesseract) | ✅ | ✅ | ⚠️ (Slow) |
| Service Worker | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ⚠️ (Desktop only) |
| Installable | ✅ | ⚠️ (Limited) | ✅ |

---

## 🚀 Deployment

### Lokaal Testen
```bash
# Python
python -m http.server 8000

# Node
npx http-server

# Open
open http://localhost:8000
```

### Deploy naar GitHub + Cloudflare
Zie: [DEPLOYMENT.md](./DEPLOYMENT.md)

Stappen samengevat:
1. Push naar GitHub
2. Activeer GitHub Pages
3. Configure Cloudflare DNS
4. Set SSL/TLS to "Full (strict)"
5. Deploy! 🎉

---

## 🔄 Update & Maintenance

### Auto-Updates
App checkt voor updates via Service Worker:
- Service Worker voert cache-first strategy uit
- Controleert elke keer of nieuwe versie beschikbaar is
- Vernieuwe gedownload automatisch

### Manual Update
1. Schiet je wijzigingen naar GitHub
2. GitHub Pages deploy automatisch (< 1 min)
3. Users zien updates na hard-refresh (Ctrl+Shift+R)

### Version Bumping
Update `service-worker.js`:
```javascript
const CACHE_NAME = 'autokm-v2';  // Increment version
```

Dit forceert users om cache te vernieuwen.

---

## 🐛 Troubleshooting

### Service Worker laadt niet
```bash
# In browser console
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(r => r.unregister()))
```

Vernieuwen de pagina.

### Foto's uploaden niet
- Check bestandsformaat (JPG/PNG)
- Check bestandsgrootte (< 10MB)
- Check browser storage quota

### Push notifications werken niet
```javascript
// In console
Notification.requestPermission().then(perm => console.log(perm))

// Test notification
new Notification('Test', { body: 'Dit werkt!' })
```

### OCR is traag
- OCR is computationally intensive
- Eerste keer load je Tesseract model (~100MB)
- Daarna is het sneller (cache)
- Werkt beter op moderne devices

---

## 📊 Data Export

### Exporteer Alles
Settings → "Exporteer Data"

Export bevat:
```json
{
  "exported": "2024-01-15T10:30:00Z",
  "photos": 5,
  "werkbonnen": [{...}],
  "ritten": [{...}],
  "settings": {...}
}
```

### Backup Strategy
1. Exporteer elke week naar bestand
2. Sla op in cloud storage (Google Drive, OneDrive)
3. Keep lokale copy op device

---

## 🎯 Roadmap

### v1.0 (Current)
- ✅ Foto upload + EXIF/OCR
- ✅ Werkbon import
- ✅ Auto-matching
- ✅ Push notifications
- ✅ Offline support

### v1.1 (Planned)
- [ ] Batch upload (meerdere werkbonnen)
- [ ] Geavanceerde filters
- [ ] Export naar accountingsoftware
- [ ] Dark mode

### v2.0 (Future)
- [ ] Backend sync (optioneel)
- [ ] Multi-device sync
- [ ] Advanced analytics
- [ ] Integration met APIs (Google Maps, etc)

---

## 📞 Support

### Known Issues
- OCR werkt beter met goed belichte foto's
- GPS beschikbaarheid hangt af van telefoon-instellingen
- Push notifications vereisen notificatie-toestemming

### Tips & Tricks
- Fotografeer dashboard recht (niet schuin)
- Zorg voor goede belichting voor OCR
- Enable GPS op telefoon voor locatie-matching
- Activeer push notifications voor herinneringen

### Feedback & Feature Requests
Open een [GitHub Issue](https://github.com/[jouw-username]/autokm/issues)

---

## 📄 Licentie

MIT License - Vrij te gebruiken, aanpassen en distribueren

---

## 👨‍💻 Development

### Code Style
- Vanilla JavaScript (no transpilers)
- Single-file architecture
- Minimal dependencies
- Progressive enhancement

### Contributing
1. Fork de repo
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 🙏 Dankwoord

- **Tesseract.js** - Open-source OCR engine
- **piexif.js** - EXIF library
- **XLSX** - Excel parsing
- **Cloudflare** - DNS & CDN
- **GitHub** - Hosting & versioning

---

## 📮 Contact

- Issues: [GitHub Issues](https://github.com/[jouw-username]/autokm/issues)
- Discussions: [GitHub Discussions](https://github.com/[jouw-username]/autokm/discussions)
- Email: [jouw-email@domain.com]

---

**Happy kilometer tracking! 🚗📍**
