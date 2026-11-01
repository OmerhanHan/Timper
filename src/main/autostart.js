'use strict';

const HIDDEN_ARG = '--hidden';

/**
 * Bilgisayar açılışında başlatma. Geliştirme modunda kapalıdır, çünkü burada kayıt
 * uygulamayı değil çıplak Electron ikilisini açılış öğesi yapardı.
 */
function createAutostart(app, platform = process.platform) {
  const loginOptions = platform === 'win32' ? { args: [HIDDEN_ARG] } : {};

  function getState() {
    if (!app.isPackaged) return { supported: false, enabled: false, status: 'dev' };
    const item = app.getLoginItemSettings(loginOptions);
    // macOS 13+: kullanıcı Sistem Ayarları'ndan onay vermeden öğe etkin olmaz.
    return { supported: true, enabled: item.openAtLogin, status: item.status || (item.openAtLogin ? 'enabled' : 'not-registered') };
  }

  function setEnabled(enabled) {
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: Boolean(enabled), ...loginOptions });
    return getState();
  }

  /** Oturum açılışıyla başladıysa pencere açılmaz, uygulama sessizce tepside bekler. */
  function launchedAtLogin() {
    if (!app.isPackaged) return false;
    if (platform === 'win32') return process.argv.includes(HIDDEN_ARG);
    return Boolean(app.getLoginItemSettings().wasOpenedAtLogin);
  }

  return { getState, setEnabled, launchedAtLogin };
}

module.exports = { createAutostart };
