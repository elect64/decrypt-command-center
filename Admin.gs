// ===========================================================================
// ADMIN.GS — VERCEL VERSION
// Two things are new vs the Phase 4 version:
//
// 1. doGet now routes admin actions (getOverviewData, performCheckIn, etc.)
//    so the Vercel frontend can call them via fetch() exactly like the
//    existing public endpoints. Every admin action requires a valid token.
//
// 2. admin_auth and savePushSubscription are new endpoints.
//
// Everything else (getAllParticipants, getOverviewData, getSpeakersData,
// getCertificatesData, getNotificationSnapshot, etc.) is IDENTICAL to the
// Phase 4 Admin.gs — copy those functions in below the routing section.
// ===========================================================================

// ---------------------------------------------------------------------------
// AUTH HELPERS
// Password lives in Script Properties — never in code.
// Set it once: Project Settings → Script Properties → add:
//   Key: ADMIN_PASSWORD   Value: dec26?
//   Key: ADMIN_TOKEN      Value: (leave blank — auto-generated on first login)
// ---------------------------------------------------------------------------

function getAdminPassword() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '';
}

function getOrCreateToken() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('ADMIN_TOKEN');
  if (!token) {
    token = Utilities.base64Encode(
      Utilities.computeHmacSha256Signature(
        new Date().toISOString() + Math.random(),
        getAdminPassword()
      )
    ).replace(/[^a-zA-Z0-9]/g, '').substring(0, 48);
    props.setProperty('ADMIN_TOKEN', token);
  }
  return token;
}

function isValidToken(token) {
  if (!token) return false;
  return token === getOrCreateToken();
}

// ---------------------------------------------------------------------------
// CORS HELPER — Apps Script fetch responses need these headers so the
// Vercel-hosted frontend can read them cross-origin.
// ---------------------------------------------------------------------------

function jsonResponse(obj) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ---------------------------------------------------------------------------
// ADMIN doGet ROUTER
// Add this block to your existing doGet in Code.gs, right after the
// existing "if (action === 'admin') { return renderAdminDashboard(); }" line.
// OR, if you prefer, keep this entire router in Admin.gs and call it from
// Code.gs doGet with: if (action.startsWith('get') || adminActions[action]) return routeAdminAction(e);
//
// The cleanest approach: replace your entire doGet with the one below,
// which handles both the existing public routes AND the new admin routes.
// ---------------------------------------------------------------------------

// List of actions that require a valid admin token
var ADMIN_ACTIONS = {
  'getOverviewData':         getOverviewData,
  'getRegistrationData':     getRegistrationData,
  'getParticipantsList':     function(e) { return getParticipantsList(e.parameter.query || ''); },
  'getAttendanceData':       getAttendanceData,
  'getEventDayData':         getEventDayData,
  'getCommunicationData':    getCommunicationData,
  'getSpeakersData':         getSpeakersData,
  'getCertificatesData':     getCertificatesData,
  'getNotificationSnapshot': getNotificationSnapshot,
  'updateSpeakerField':      function(e) { return updateSpeakerField(Number(e.parameter.row), e.parameter.field, e.parameter.value); },
  'updateCertificateStatus': function(e) { return updateCertificateStatus(Number(e.parameter.row), e.parameter.status); },
  'performCheckIn':          function(e) { return performCheckIn(e.parameter.code); },
  'savePushSubscription':    function(e) { return savePushSubscription(e.parameter.subscription); }
};

// ---------------------------------------------------------------------------
// REPLACE your existing doGet in Code.gs with this complete version.
// It handles all existing public routes unchanged, plus the new admin routes.
// ---------------------------------------------------------------------------

function doGet(e) {
  var action = e.parameter.action || '';

  // ---- Existing public routes (unchanged) ----
  if (action === 'get_campaigns') return getCampaignHistory();
  if (action === 'track')         return trackEmailOpen(e);
  if (action === 'click')         return trackEmailClick(e);
  if (action === 'search')        return handleSearch(e);

  // ---- Auth endpoint (no token needed — this is how you GET a token) ----
  if (action === 'admin_auth') {
    var pw = e.parameter.pw || '';
    if (pw === getAdminPassword() && pw !== '') {
      return jsonResponse({ ok: true, token: getOrCreateToken() });
    } else {
      return jsonResponse({ ok: false });
    }
  }

  // ---- Admin data endpoints (token required) ----
  if (ADMIN_ACTIONS[action]) {
    var token = e.parameter._token || '';
    if (!isValidToken(token)) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }
    try {
      var result = ADMIN_ACTIONS[action](e);
      // Functions that already return a plain object get wrapped;
      // functions that return a ContentService output are passed through.
      if (result && typeof result === 'object' && !result.getContent) {
        return jsonResponse(result);
      }
      return result;
    } catch (err) {
      return jsonResponse({ ok: false, error: err.toString() });
    }
  }

  // ---- Default: QR check-in scanner (existing public route) ----
  return handleCheckIn(e);
}

// ---------------------------------------------------------------------------
// PUSH SUBSCRIPTION STORAGE
// Stores the browser's push subscription object in Script Properties so
// the backend can send pushes to it. For a single-admin setup (your case)
// one subscription slot is enough — it gets overwritten if you re-subscribe
// from a different browser or after clearing site data.
// ---------------------------------------------------------------------------

function savePushSubscription(subscriptionJson) {
  if (!subscriptionJson) return { ok: false, error: 'No subscription data' };
  try {
    PropertiesService.getScriptProperties().setProperty('PUSH_SUBSCRIPTION', subscriptionJson);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function getPushSubscription() {
  var json = PropertiesService.getScriptProperties().getProperty('PUSH_SUBSCRIPTION');
  if (!json) return null;
  try { return JSON.parse(json); } catch (e) { return null; }
}

// ---------------------------------------------------------------------------
// REGISTRATION_TARGET constant used by Admin functions below
// ---------------------------------------------------------------------------

var REGISTRATION_TARGET = 60;

// ---------------------------------------------------------------------------
// COLUMN INDEX MAP — used by getAllParticipants and getNotificationSnapshot
// ---------------------------------------------------------------------------

var COL = {
  NAME: 1, EMAIL: 2, PHONE: 3, LOCATION: 4, IDENTITY: 5,
  SOURCE: 6, TRACK: 7, VOLUNTEER: 8, NOTES: 9, CODE: 10,
  STATUS: 11, CHECKIN_TIME: 12
};

// ===========================================================================
// PASTE YOUR PHASE 4 Admin.gs FUNCTIONS BELOW THIS LINE — unchanged.
// That means: getAllParticipants, getOverviewData, getRegistrationData,
// getParticipantsList, getAttendanceData, getEventDayData, performCheckIn,
// getCommunicationData, getSpeakersData (and helpers), getCertificatesData
// (and helpers), getNotificationSnapshot.
//
// The only function from Phase 4 Admin.gs that changes is renderAdminDashboard
// and include() — you can DELETE those two since the dashboard is now on Vercel.
// ===========================================================================
