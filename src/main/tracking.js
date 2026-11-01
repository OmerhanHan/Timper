'use strict';

/**
 * Takip izni altyapısı. İzin iki katmanlıdır:
 *   1. Uygulama içi onay (kullanıcının açık kararı; ayarlarda saklanır, geri alınabilir).
 *   2. İşletim sistemi izni (macOS'ta Erişilebilirlik; Windows/Linux'ta gerekmez).
 * Toplayıcı yalnızca ikisi de tamamsa çalışır. Şimdilik gerçek toplayıcı yoktur:
 * `collector` { start(), stop() } arayüzüne uyan bir nesne verildiğinde devreye girer.
 */
const POLICY_VERSION = 1;
const MAC_ACCESSIBILITY_URL = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';

function createTracking({ store, systemPreferences, shell, platform = process.platform, collector = null, now = Date.now }) {
  let collecting = false;

  function osPermission() {
    if (platform !== 'darwin') return 'not-required';
    return systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'missing';
  }

  function getState() {
    const { consent, policyVersion } = store.get('tracking');
    // İlke değiştiyse eski onay geçersizdir, yeniden sorulur.
    const effective = consent === 'granted' && policyVersion !== POLICY_VERSION ? 'unset' : consent;
    return { consent: effective, os: osPermission(), collecting, collectorAvailable: Boolean(collector) };
  }

  function sync() {
    const state = getState();
    const allowed = state.consent === 'granted' && state.os !== 'missing';
    if (allowed && collector && !collecting) {
      collector.start();
      collecting = true;
    } else if (!allowed && collecting) {
      collector.stop();
      collecting = false;
    }
    return getState();
  }

  function decide(consent) {
    store.set({ tracking: { consent, decidedAt: now(), policyVersion: POLICY_VERSION } });
    return sync();
  }

  /** Onayı kaydeder ve macOS'ta sistem iznini ister (sistem penceresini açar). */
  function grant() {
    decide('granted');
    if (platform === 'darwin') systemPreferences.isTrustedAccessibilityClient(true);
    return sync();
  }

  const deny = () => decide('denied');

  function openSystemSettings() {
    if (platform === 'darwin') return shell.openExternal(MAC_ACCESSIBILITY_URL);
    return Promise.resolve();
  }

  return { getState, sync, grant, deny, openSystemSettings };
}

module.exports = { createTracking, POLICY_VERSION };
