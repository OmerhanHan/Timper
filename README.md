# Pixel Timer

Arka planda çalışan, piksel art temalı çalışma sayacı (Electron).

```bash
npm install
npm start          # geliştirme
npm test           # birim testleri
npm run test:e2e   # gerçek uygulamayı sürer (SHOTS=/klasör ile ekran görüntüsü alır)
npm run pack       # dist/ altına paketler, kurulum dosyası üretmez
npm run dist       # kurulum dosyası (dmg/nsis/AppImage)
```

VS Code uzantılarının içinden çalıştırırken `ELECTRON_RUN_AS_NODE` tanımlı olabilir; varsa
`npm start` hata verir, `env -u ELECTRON_RUN_AS_NODE npm start` kullanın.

## Yapı

- `src/main/timer.js`: sayaç motoru; duvar saatine göre çalışır, pencereye bağlı değildir
- `src/main/autostart.js`: açılışta başlatma (yalnızca paketlenmiş uygulamada etkin)
- `src/main/tracking.js`: takip izni altyapısı; gerçek toplayıcı henüz yok, `collector` arayüzüyle eklenir
- `src/main/overlay.js`, `src/renderer/overlay.*`: süre dolunca masaüstünde beliren tema figürü
- `src/shared/themes.js`: temalar ve sprite'lar; yeni tema için buraya ve `pixel.js` içindeki `SCENERY`ye ekleyin; `herd` verilirse figür sürü olur

Fontlar (Press Start 2P, Jersey 15) SIL OFL lisanslıdır, lisans metinleri `src/renderer/fonts/` içindedir.
