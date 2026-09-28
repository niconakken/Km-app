# AutoKM - Deployment Instructies

## Stap 1: GitHub Setup

### 1.1 Repository aanmaken
```bash
# Clone de repository template
git clone https://github.com/[jouw-username]/autokm.git
cd autokm
```

### 1.2 Bestanden toevoegen
Kopieer deze bestanden naar je repository root:
- `index.html`
- `app.js`
- `service-worker.js`
- `service-worker-register.js`
- `manifest.json`
- `README.md` (optioneel)
- `.gitignore` (optioneel)

### 1.3 .gitignore (optioneel)
```
node_modules/
.DS_Store
*.log
dist/
.env
```

### 1.4 Push naar GitHub
```bash
git add .
git commit -m "Initial commit: AutoKM app"
git branch -M main
git remote add origin https://github.com/[jouw-username]/autokm.git
git push -u origin main
```

---

## Stap 2: GitHub Pages Activeren

1. Ga naar je repository op GitHub
2. Ga naar **Settings** → **Pages**
3. Kies onder "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** en **/root** folder
4. Klik "Save"
5. GitHub Pages bouwt nu je site automatisch

Je site wordt beschikbaar op: `https://[jouw-username].github.io/autokm/`

---

## Stap 3: Cloudflare Setup

### 3.1 Cloudflare Account
1. Maak een account op [cloudflare.com](https://www.cloudflare.com)
2. Voeg je domein toe (bijv: `autokm.jouw-domein.nl`)

### 3.2 Nameservers
Je domeinregistrar (bijv GoDaddy, OVH):
1. Ga naar je domein instellingen
2. Wijzig nameservers naar Cloudflare's nameservers:
   - `cathy.ns.cloudflare.com`
   - `louis.ns.cloudflare.com`

Wacht 24 uur tot de DNS zich propageert.

### 3.3 Cloudflare Configuration

#### DNS Records
Voeg deze DNS records toe in Cloudflare:

```
Type: CNAME
Name: @
Content: [jouw-username].github.io
Proxy status: Proxied (oranje cloud)
TTL: Auto

Type: CNAME
Name: www
Content: [jouw-username].github.io
Proxy status: Proxied
TTL: Auto
```

#### SSL/TLS
1. Ga naar SSL/TLS in Cloudflare
2. Kies: **Full (strict)** encryption
3. Always use HTTPS: **On**

#### Page Rules (optioneel)
1. Voeg deze rule toe:
   - URL: `https://autokm.jouw-domein.nl/service-worker.js`
   - Cache Level: **Cache Everything**

---

## Stap 4: GitHub Actions (Auto Deploy)

Maak `.github/workflows/deploy.yml` in je repo:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to GitHub Pages
        run: |
          echo "Site deployed to GitHub Pages"
```

---

## Stap 5: HTTPS en Certificaten

Cloudflare genereert automatisch HTTPS certificaten.

Je app is nu beschikbaar op:
- `https://[jouw-username].github.io/autokm/` (GitHub Pages)
- `https://autokm.jouw-domein.nl/` (Cloudflare custom domain)

---

## Stap 6: Push Notifications Setup

Voor push notifications werken:

1. **Zelf-ondertekend certificaat** (dev):
   - App werkt al, maar browsers vragen toestemming
   
2. **Productie** (aanbevolen):
   - Cloudflare biedt gratis SSL certificaten
   - Service Worker werkt automatisch

Gebruikers kunnen nu push notifications inschakelen in Settings → Dashboard.

---

## Stap 7: App Installatie

Gebruikers kunnen de app installeren als PWA:

### iOS (Safari)
1. Open app in Safari
2. Tap het share icoon
3. "Add to Home Screen"

### Android (Chrome)
1. Open app in Chrome
2. Menu → "Install app"
3. Of: "Add to Home Screen"

### Desktop (Chrome/Edge)
1. Klik het install icoon in adressbalk
2. Of: Menu → "Install AutoKM"

---

## Stap 8: Testing

### Lokaal testen
```bash
# Python server
python -m http.server 8000

# Node http-server
npx http-server -p 8000 -c-1
```

Open: `http://localhost:8000`

### Test Service Worker
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs))
```

### Test Push Notifications
1. Klik "Activeer Push Notifications"
2. Geeft popup toestemming
3. Dashboard toont status "✓ Actief"

---

## Stap 9: Maintenance

### Updates deployen
```bash
git add .
git commit -m "Update: feature beschrijving"
git push origin main
```

GitHub Pages deployt automatisch.

### Monitoring
- Check Cloudflare Analytics
- Monitor error logs in browser console
- Test op reguliere basis

---

## Troubleshooting

### Service Worker laadt niet
- Controleer: `https://autokm.jouw-domein.nl/service-worker.js`
- Zet in Cloudflare: "Cache Level" → "Cache Everything"

### HTTPS fouten
- Wacht 24 uur voor DNS propagatie
- Clear browser cache
- Probeer incognito window

### App verschijnt niet correct
- Hard refresh: `Ctrl+Shift+R` (Windows) of `Cmd+Shift+R` (Mac)
- Clear Service Worker: DevTools → Application → Service Workers → Unregister

### Push Notifications werken niet
- Controleer notificatie toestemming in browser
- Probeer direct notification in console:
  ```javascript
  new Notification('Test', { body: 'Dit werkt!' })
  ```

---

## Bonus: Custom Domain + Auto-Commit

### GitHub Actions met Custom Domain
Voeg `CNAME` bestand toe in repo root:
```
autokm.jouw-domein.nl
```

GitHub Pages respecteert dit bestand automatisch.

### Automatische Backups
Add to `.github/workflows/backup.yml`:
```yaml
name: Auto Backup
on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Create backup
        run: |
          mkdir -p backups
          cp -r . backups/backup-$(date +%Y%m%d).tar.gz
      - uses: actions/upload-artifact@v2
        with:
          name: backup
          path: backups/
```

---

## Status Check

Verificeer je setup:

```bash
# Check DNS
nslookup autokm.jouw-domein.nl

# Check GitHub Pages
curl -I https://[jouw-username].github.io/autokm/

# Check Service Worker
curl -I https://autokm.jouw-domein.nl/service-worker.js

# Check manifest
curl https://autokm.jouw-domein.nl/manifest.json | jq
```

---

## Vragen?

Zie:
- GitHub Pages docs: https://pages.github.com
- Cloudflare docs: https://developers.cloudflare.com
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- PWA: https://web.dev/progressive-web-apps/
