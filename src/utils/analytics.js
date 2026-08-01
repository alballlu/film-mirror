const APP_VERSION = 'p3.2';
const pendingTimers = new Set();
const memoryOnceKeys = new Set();

function campaignProperties() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const fromUrl = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
  };
  try {
    if (fromUrl.utm_source) {
      sessionStorage.setItem('filmmirror_campaign', JSON.stringify(fromUrl));
      return fromUrl;
    }
    const saved = JSON.parse(sessionStorage.getItem('filmmirror_campaign') || 'null');
    if (saved?.utm_source) return saved;
  } catch {}
  return { ...fromUrl, utm_source: 'direct' };
}

function normalizeProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        if (Array.isArray(value)) return [key, value.join('|').slice(0, 200)];
        if (typeof value === 'string') return [key, value.slice(0, 200)];
        return [key, value];
      })
  );
}

function dispatch(name, payload, retriesLeft = 3) {
  if (typeof window === 'undefined') return;
  if (window.umami?.track) {
    window.umami.track(name, payload);
    return;
  }
  if (retriesLeft <= 0) return;
  const timer = window.setTimeout(() => {
    pendingTimers.delete(timer);
    dispatch(name, payload, retriesLeft - 1);
  }, 700);
  pendingTimers.add(timer);
}

export function trackEvent(name, properties = {}) {
  if (typeof window === 'undefined') return;
  dispatch(name, normalizeProperties({
    app_version: APP_VERSION,
    path: window.location.pathname,
    ...campaignProperties(),
    ...properties,
  }));
}

export function trackEventOnce(name, properties = {}, key = name) {
  const storageKey = `filmmirror_event_once:${key}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');
  } catch {
    if (memoryOnceKeys.has(storageKey)) return;
    memoryOnceKeys.add(storageKey);
  }
  trackEvent(name, properties);
}

export function trackFlowStart(flow) {
  try {
    sessionStorage.setItem(`filmmirror_flow_started_at:${flow}`, String(Date.now()));
  } catch {}
  trackEvent('flow_start', { flow });
}

export function getFlowElapsedSeconds(flow) {
  try {
    const startedAt = Number(sessionStorage.getItem(`filmmirror_flow_started_at:${flow}`));
    if (startedAt > 0) return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  } catch {}
  return undefined;
}

export function trackApiError(endpoint, status, fallback = true) {
  trackEventOnce('api_error', {
    endpoint,
    status: String(status || 'unknown'),
    fallback,
  }, `api_error:${endpoint}:${status || 'unknown'}`);
}
