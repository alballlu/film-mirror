const APP_VERSION = 'p4.1.1';
const ANALYTICS_SCHEMA_VERSION = 2;
const memoryOnceKeys = new Set();
const queuedOnceKeys = new Set();
const eventQueue = [];
const MAX_QUEUE_SIZE = 250;
let flushTimer;
let lifecycleListenersRegistered = false;

function randomId(prefix) {
  try {
    return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
  } catch {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getSessionId() {
  if (typeof window === 'undefined') return 'server';
  try {
    const saved = sessionStorage.getItem('filmmirror_session_id');
    if (saved) return saved;
    const created = randomId('s');
    sessionStorage.setItem('filmmirror_session_id', created);
    return created;
  } catch {
    return randomId('s');
  }
}

export function getFlowInstanceId(flow) {
  if (typeof window === 'undefined' || !flow) return '';
  try {
    return sessionStorage.getItem(`filmmirror_flow_instance:${flow}`) || '';
  } catch {
    return '';
  }
}

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

function hasSentOnce(storageKey) {
  try {
    return sessionStorage.getItem(storageKey) === '1';
  } catch {
    return memoryOnceKeys.has(storageKey);
  }
}

function markSentOnce(storageKey) {
  if (!storageKey) return;
  try {
    sessionStorage.setItem(storageKey, '1');
  } catch {
    memoryOnceKeys.add(storageKey);
  }
  queuedOnceKeys.delete(storageKey);
}

function sendToUmami(event) {
  if (!window.umami?.track) return false;
  try {
    window.umami.track(event.name, event.payload);
    markSentOnce(event.onceKey);
    return true;
  } catch {
    return false;
  }
}

function scheduleFlush(delay = 800) {
  if (typeof window === 'undefined' || flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = undefined;
    flushQueue();
  }, delay);
}

function flushQueue() {
  if (typeof window === 'undefined' || eventQueue.length === 0) return;
  while (eventQueue.length > 0) {
    if (!sendToUmami(eventQueue[0])) {
      scheduleFlush();
      return;
    }
    eventQueue.shift();
  }
}

function registerLifecycleFlush() {
  if (typeof window === 'undefined' || lifecycleListenersRegistered) return;
  lifecycleListenersRegistered = true;
  window.addEventListener('load', flushQueue);
  window.addEventListener('online', flushQueue);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushQueue();
  });
}

function dispatch(name, payload, onceKey = '') {
  if (typeof window === 'undefined') return;
  registerLifecycleFlush();
  const event = { name, payload, onceKey };
  if (sendToUmami(event)) return;

  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    const dropped = eventQueue.shift();
    if (dropped?.onceKey) queuedOnceKeys.delete(dropped.onceKey);
  }
  eventQueue.push(event);
  scheduleFlush(250);
}

export function trackEvent(name, properties = {}, onceKey = '') {
  if (typeof window === 'undefined') return;
  const flowInstanceId = properties.flow ? getFlowInstanceId(properties.flow) : '';
  dispatch(name, normalizeProperties({
    app_version: APP_VERSION,
    analytics_schema: ANALYTICS_SCHEMA_VERSION,
    session_id: getSessionId(),
    flow_instance_id: flowInstanceId,
    path: window.location.pathname,
    ...campaignProperties(),
    ...properties,
  }), onceKey);
}

export function trackEventOnce(name, properties = {}, key = name) {
  // Namespace the marker by release so stale P4.0 markers cannot suppress
  // events after the delivery mechanism is fixed or an event is redefined.
  const storageKey = `filmmirror_event_once:${APP_VERSION}:${key}`;
  if (hasSentOnce(storageKey) || queuedOnceKeys.has(storageKey)) return;
  queuedOnceKeys.add(storageKey);
  trackEvent(name, properties, storageKey);
}

export function trackFlowStart(flow) {
  const flowInstanceId = randomId(`f${flow}`);
  try {
    sessionStorage.setItem(`filmmirror_flow_started_at:${flow}`, String(Date.now()));
    sessionStorage.setItem(`filmmirror_flow_instance:${flow}`, flowInstanceId);
  } catch {}
  trackEvent('flow_start', { flow, entry_path: window.location.pathname });
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

export function trackStepComplete(flow, step, properties = {}) {
  const instance = getFlowInstanceId(flow) || 'unknown';
  trackEventOnce('step_complete', {
    flow,
    step,
    elapsed_seconds: getFlowElapsedSeconds(flow),
    ...properties,
  }, `step_complete:${instance}:${step}`);
}

export function trackFlowComplete(flow, properties = {}) {
  const instance = getFlowInstanceId(flow) || 'unknown';
  trackEventOnce('flow_complete', {
    flow,
    elapsed_seconds: getFlowElapsedSeconds(flow),
    ...properties,
  }, `flow_complete:${instance}`);
}

export function trackRecommendationImpression(flow, movie, properties = {}) {
  if (!movie) return;
  const instance = getFlowInstanceId(flow) || 'unknown';
  const slot = properties.track || properties.rank || 'unknown';
  const reroll = properties.reroll_number || 0;
  trackEventOnce('recommendation_impression', {
    flow,
    movie_id: movie.id,
    movie_title: movie.title,
    match_score: movie.matchScore,
    ...properties,
  }, `recommendation_impression:${instance}:${slot}:${reroll}:${movie.id}`);
}

export function trackPosterError({ flow = '', movieId = 'unknown', source = 'unknown', reason = 'load_failed', surface = 'unknown' }) {
  trackEventOnce('poster_error', {
    flow,
    movie_id: movieId,
    poster_source: source,
    reason,
    surface,
  }, `poster_error:${movieId}:${source}:${reason}:${surface}`);
}

export function feedbackLengthBucket(text) {
  const length = String(text || '').trim().length;
  if (length === 0) return '0';
  if (length <= 20) return '1-20';
  if (length <= 60) return '21-60';
  if (length <= 150) return '61-150';
  return '151+';
}
