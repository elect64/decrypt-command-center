/* ==========================================================
   DECRYPT COMMAND CENTER — admin.js
   Hosted on Vercel. All server calls go to the Apps Script
   public deployment via fetch() — same endpoints, same
   response shapes as the Apps Script version.
   ========================================================== */

/* ---------- CONFIG — paste your values here ---------- */
var API  = 'https://script.google.com/macros/s/AKfycbyHx0H6SbRvcvu7QWt5QJiLBVwl3kt2QSO0zxrBQJ0pPlbPdUNhiBRavtUylF0TiEI3aA/exec';
var VAPID_PUBLIC_KEY = 'BJ7O_Ouxqyi7qGw_7e41gAekZmpNAl066e8LUjd6Lr6ozdQebwuHFtfFXhM4Tn2d3ka7B3mubWr5lLrFRpVJ1YY';
var REGISTRATION_TARGET = 60;
/* ----------------------------------------------------- */

/* ==========================================================
   AUTH GATE
   Checks the password against ?action=admin_auth on the
   Apps Script backend. Token stored in sessionStorage —
   cleared when the tab closes.
   ========================================================== */
var Auth = (function () {
  var SESSION_KEY = 'dcmd_session';
  var _token = sessionStorage.getItem(SESSION_KEY) || '';

  function isAuthed() { return !!_token; }

  function getToken() { return _token; }

  function init() {
    if (isAuthed()) { showApp(); return; }

    var gate  = document.getElementById('auth-gate');
    var input = document.getElementById('auth-input');
    var btn   = document.getElementById('auth-btn');
    var label = document.getElementById('auth-btn-label');
    var err   = document.getElementById('auth-error');
    var field = document.getElementById('auth-field');

    function attempt() {
      var pw = input.value.trim();
      if (!pw) { input.focus(); return; }
      btn.disabled = true;
      label.textContent = 'Checking…';
      err.textContent = '';

      fetch(API + '?action=admin_auth&pw=' + encodeURIComponent(pw))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.ok) {
            _token = d.token;
            sessionStorage.setItem(SESSION_KEY, _token);
            gate.classList.add('hidden');
            showApp();
          } else {
            label.textContent = 'Unlock';
            btn.disabled = false;
            err.textContent = 'Incorrect password.';
            field.classList.add('shake');
            input.value = '';
            input.focus();
            setTimeout(function () { field.classList.remove('shake'); }, 400);
          }
        })
        .catch(function () {
          label.textContent = 'Unlock';
          btn.disabled = false;
          err.textContent = 'Could not reach the server. Try again.';
        });
    }

    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
    input.focus();
  }

  function showApp() {
    document.getElementById('app-shell').style.display = '';
    App.init();
  }

  return { init: init, isAuthed: isAuthed, getToken: getToken };
})();

/* ==========================================================
   SERVER CALLS
   Every fetch includes the session token so the Apps Script
   endpoint can reject unauthenticated requests.
   ========================================================== */
function apiFetch(params) {
  var url = API + '?' + Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&') + '&_token=' + encodeURIComponent(Auth.getToken());

  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

/* ==========================================================
   SMALL UTILITIES (identical to Phase 4 approved UI)
   ========================================================== */
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
}
function fmtDate(iso)     { if (!iso) return '—'; return new Date(iso).toLocaleDateString(undefined, { month:'short', day:'numeric' }); }
function fmtTime(iso)     { if (!iso) return '—'; return new Date(iso).toLocaleTimeString(undefined,  { hour:'2-digit', minute:'2-digit' }); }
function fmtDateTime(iso) { if (!iso) return '—'; return fmtDate(iso) + ', ' + fmtTime(iso); }

function toast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.classList.remove('show'); }, 2800);
}
function emptyState(icon, title, sub) {
  return '<div class="state-block"><svg class="state-icon"><use href="#' + icon + '"/></svg>' +
    '<div class="state-title">' + esc(title) + '</div>' +
    (sub ? '<div class="state-sub">' + esc(sub) + '</div>' : '') + '</div>';
}
function loadingState() {
  return '<div class="skel-row"><div class="skel skel-line" style="width:60%"></div><div class="skel skel-line" style="width:40%"></div></div>'.repeat(3);
}
function errorState(msg, view) {
  return '<div class="state-block err"><svg class="state-icon"><use href="#i-x"/></svg>' +
    '<div class="state-title">Unable to load this section</div>' +
    '<div class="state-sub">' + esc(msg || 'Something went wrong.') + '</div>' +
    '<button class="btn btn-outline btn-sm retry-btn" data-view="' + esc(view) + '" style="margin-top:8px;">Try again</button></div>';
}
function statusPill(s)    { return s === 'CHECKED_IN' ? '<span class="pill pill-good"><span class="dot"></span>Checked in</span>' : '<span class="pill pill-neutral"><span class="dot"></span>Registered</span>'; }
function scanResultPill(r){ return r === 'SUCCESS' ? '<span class="pill pill-good"><span class="dot"></span>Success</span>' : r === 'DUPLICATE' ? '<span class="pill pill-warn"><span class="dot"></span>Duplicate</span>' : '<span class="pill pill-bad"><span class="dot"></span>Invalid</span>'; }
function certStatusPill(s){ return s === 'Sent' ? '<span class="pill pill-good"><span class="dot"></span>Sent</span>' : s === 'Generated' ? '<span class="pill pill-warn"><span class="dot"></span>Generated</span>' : '<span class="pill pill-neutral"><span class="dot"></span>Eligible</span>'; }

function renderStats(id, stats) {
  document.getElementById(id).innerHTML = stats.map(function (s) {
    var bar = s.progress !== undefined
      ? '<div style="margin-top:9px;height:4px;background:var(--surface-3);border-radius:2px;overflow:hidden;"><div style="height:100%;width:' + Math.min(100, s.progress) + '%;background:var(--accent);"></div></div>'
      : '';
    return '<div class="stat"><div class="stat-label">' + esc(s.label) + '</div>' +
      '<div class="stat-value">' + esc(s.value) + (s.suffix ? '<span class="stat-suffix">' + esc(s.suffix) + '</span>' : '') + '</div>' +
      (s.delta ? '<div class="stat-delta ' + (s.deltaType || 'up') + '">' + esc(s.delta) + '</div>' : '') + bar + '</div>';
  }).join('');
}
function renderBars(id, items) {
  var el = document.getElementById(id);
  if (!items || !items.length) { el.innerHTML = emptyState('i-check-circle', 'No data yet', ''); return; }
  var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
  el.innerHTML = '<div class="bars">' + items.map(function (i) {
    var h = Math.round((i.value / max) * 100);
    return '<div class="bar-col"><div class="bar-fill' + (i.isToday ? ' accent' : '') + '" style="height:' + Math.max(h, 3) + '%"></div><span class="bar-label">' + esc(i.label) + '</span></div>';
  }).join('') + '</div>';
}
function renderRows(id, items, emptyMsg) {
  var el = document.getElementById(id);
  if (!items.length) { el.innerHTML = emptyState('i-check-circle', emptyMsg || 'Nothing here yet', ''); return; }
  el.innerHTML = items.map(function (r) {
    return '<div class="row-item"><div class="row-main"><span class="r-name">' + esc(r.name) + '</span><span class="r-meta">' + esc(r.meta) + '</span></div>' +
      '<div class="row-side"><span class="row-time">' + esc(r.time) + '</span></div></div>';
  }).join('');
}

var PARTICIPANTS_CACHE = [];
var VIEW_CONTAINERS = {
  overview:      ['ov-stats','ov-trend','ov-recent-reg','ov-recent-checkin','ov-attention','ov-system'],
  registration:  ['reg-stats','reg-source'],
  attendance:    ['att-stats','att-arrivals','att-recent'],
  communication: ['comm-stats'],
  speakers:      ['spk-stats'],
  certificates:  ['cert-stats'],
  eventday:      ['ed-stats','ed-recent','ed-alerts'],
  eventinfo: []
};
function showViewLoading(view) {
  (VIEW_CONTAINERS[view] || []).forEach(function (id) {
    var el = document.getElementById(id); if (el) el.innerHTML = loadingState();
  });
}
function showViewError(view, msg) {
  var ids = VIEW_CONTAINERS[view] || [];
  if (ids.length) document.getElementById(ids[0]).innerHTML = errorState(msg, view);
  for (var i = 1; i < ids.length; i++) { var el = document.getElementById(ids[i]); if (el) el.innerHTML = ''; }
}
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.retry-btn');
  if (btn) VIEW_RENDERERS[btn.dataset.view]();
});

/* ---------- Participant modal ---------- */
function openParticipantModal(p) {
  document.getElementById('modal-title').textContent = p.name;
  var fields = [
    ['Email',p.email],['Phone',p.phone],['Location',p.location],['Identity',p.identity],
    ['Track',p.track],['Source',p.source],['Registered',fmtDateTime(p.registeredAt)],['Access code',p.code],
    ['QR status','Generated'],['Check-in status',p.status==='CHECKED_IN'?'Checked in':'Not yet arrived'],
    ['Check-in time',p.checkinTime?fmtDateTime(p.checkinTime):'—'],['Certificate',p.certStatus||'Not yet eligible']
  ];
  document.getElementById('modal-body').innerHTML = fields.map(function (f) {
    return '<div class="mfield"><span class="mf-label">' + esc(f[0]) + '</span><span class="mf-value">' + esc(f[1]) + '</span></div>';
  }).join('');
  document.getElementById('modal-veil').classList.add('open');
}
document.getElementById('modal-close').addEventListener('click', function () { document.getElementById('modal-veil').classList.remove('open'); });
document.getElementById('modal-veil').addEventListener('click', function (e) { if (e.target === this) this.classList.remove('open'); });

function renderEventInfo() {
  apiFetch({ action: 'get_event_info' })
    .then(function (d) {
      if (!d || !d.ok) return;
      document.getElementById('ei-link').value         = d.joiningLink  || '';
      document.getElementById('ei-schedule').value     = d.schedule     || '';
      document.getElementById('ei-announcement').value = d.announcement || '';
      document.getElementById('ei-doors').value        = d.doorsOpen    || '';
      if (d.lastUpdated) {
        document.getElementById('ei-last-updated').textContent =
          'Last published ' + new Date(d.lastUpdated).toLocaleString();
      }
    })
    .catch(function () {});
}

document.getElementById('eventinfo-save-btn').addEventListener('click', function () {
  var btn = this;
  btn.disabled = true;
  btn.textContent = 'Publishing…';
  apiFetch({
    action:       'saveEventInfo',
    joiningLink:  document.getElementById('ei-link').value.trim(),
    schedule:     document.getElementById('ei-schedule').value.trim(),
    announcement: document.getElementById('ei-announcement').value.trim(),
    doorsOpen:    document.getElementById('ei-doors').value.trim()
  })
  .then(function (d) {
    btn.disabled = false;
    btn.textContent = 'Save & publish';
    if (d && d.ok) {
      toast('Event info published to participant portal.');
      document.getElementById('ei-last-updated').textContent = 'Last published ' + new Date().toLocaleString();
    } else {
      toast('Could not save — try again.');
    }
  })
  .catch(function () {
    btn.disabled = false;
    btn.textContent = 'Save & publish';
    toast('Could not save — try again.');
  });
});

/* ==========================================================
   SECTION RENDERERS — same logic as Phase 4, fetch() instead
   of google.script.run
   ========================================================== */

/* ---- Overview ---- */
function renderOverview() {
  showViewLoading('overview');
  apiFetch({ action: 'getOverviewData' })
    .then(populateOverview)
    .catch(function (e) { showViewError('overview', e.message); });
}
function populateOverview(d) {
  if (!d || d.ok === false) { showViewError('overview', d && d.error); return; }
  renderStats('ov-stats', [
    { label:'Total registered', value:d.stats.total },
    { label:'Confirmed', value:d.stats.total, delta:'= registered', deltaType:'up' },
    { label:'Checked in', value:d.stats.checkedIn },
    { label:'Attendance rate', value:d.stats.attendanceRate, suffix:'%' },
    { label:'Registration target', value:d.stats.total+' / '+d.stats.target, progress:(d.stats.total/d.stats.target)*100 },
    { label:'Certificates issued', value:d.stats.certsIssued }
  ]);
  renderBars('ov-trend', d.trend);
  renderRows('ov-recent-reg', d.recentRegistrations.map(function (p) { return { name:p.name, meta:p.track+' · '+p.source, time:fmtDate(p.registeredAt) }; }), 'No registrations yet.');
  renderRows('ov-recent-checkin', d.recentCheckins.map(function (p) { return { name:p.name, meta:p.track, time:fmtTime(p.checkinTime) }; }), 'No check-ins yet.');
  document.getElementById('ov-attention').innerHTML = d.attention.length
    ? d.attention.map(function (a) { return '<div class="attn-item'+(a.crit?' crit':'')+'"><span class="attn-dot"></span><div><div class="attn-text">'+esc(a.text)+'</div><div class="attn-sub">'+esc(a.sub)+'</div></div></div>'; }).join('')
    : emptyState('i-check-circle', 'Nothing needs attention right now.', '');
  document.getElementById('ov-system').innerHTML = d.systemStatus.map(function (s) {
    var cls = s.state==='good'?'pill-good':s.state==='warn'?'pill-warn':'pill-bad';
    var word = s.state==='good'?'Operational':s.state==='warn'?'Needs attention':'Offline';
    return '<span class="pill '+cls+'"><span class="dot"></span>'+esc(s.name)+' — '+word+'</span>';
  }).join('');
}

/* ---- Registration ---- */
var regSortState = 'date-desc';
var regDataCache = null;
function renderRegistration() {
  showViewLoading('registration');
  document.querySelector('#view-registration .table-wrap').innerHTML = loadingState();
  apiFetch({ action: 'getRegistrationData' })
    .then(function (d) {
      if (!d || d.ok === false) { showViewError('registration', d && d.error); return; }
      regDataCache = d;
      PARTICIPANTS_CACHE = d.participants;
      renderStats('reg-stats', [
        { label:'Total registered', value:d.stats.total },
        { label:'Confirmed', value:d.stats.total },
        { label:'This week', value:'+'+d.stats.thisWeek },
        { label:'Target', value:d.stats.total+' / '+d.stats.target, progress:(d.stats.total/d.stats.target)*100 }
      ]);
      var maxSrc = Math.max.apply(null, d.sourceBreakdown.map(function (i) { return i.value; }).concat([1]));
      document.getElementById('reg-source').innerHTML = d.sourceBreakdown.length
        ? '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px;">' + d.sourceBreakdown.map(function (i) {
            var pct = Math.round((i.value/maxSrc)*100);
            return '<div style="display:flex;align-items:center;gap:14px;"><span class="label" style="width:110px;flex-shrink:0;">'+esc(i.label)+'</span><div style="flex:1;height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden;"><div style="height:100%;width:'+pct+'%;background:var(--accent);"></div></div><span style="width:24px;text-align:right;font-family:var(--font-mono);font-size:0.78rem;">'+i.value+'</span></div>';
          }).join('') + '</div>'
        : emptyState('i-check-circle','No sources recorded yet.','');
      drawRegistrationTable();
    })
    .catch(function (e) { showViewError('registration', e.message); });
}
function drawRegistrationTable() {
  var wrap = document.querySelector('#view-registration .table-wrap');
  if (!regDataCache) return;
  var q = (document.getElementById('reg-search').value || '').toLowerCase();
  var rows = regDataCache.participants.filter(function (p) {
    return !q || p.name.toLowerCase().indexOf(q)>-1 || p.email.toLowerCase().indexOf(q)>-1 || p.code.toLowerCase().indexOf(q)>-1;
  }).slice().sort(function (a,b) {
    if (regSortState==='date-desc') return new Date(b.registeredAt)-new Date(a.registeredAt);
    if (regSortState==='date-asc')  return new Date(a.registeredAt)-new Date(b.registeredAt);
    return a.name.localeCompare(b.name);
  });
  if (!rows.length) { wrap.innerHTML = emptyState('i-search','No matching registrations','Try a different name, email or access code.'); return; }
  wrap.innerHTML = '<table class="dt" id="reg-table"><thead><tr><th>Name</th><th>Date</th><th>Source</th><th>Status</th><th>Access code</th></tr></thead><tbody>' +
    rows.map(function (p) { return '<tr data-code="'+esc(p.code)+'"><td>'+esc(p.name)+'</td><td>'+fmtDate(p.registeredAt)+'</td><td>'+esc(p.source)+'</td><td>'+statusPill(p.status)+'</td><td class="code-cell">'+esc(p.code)+'</td></tr>'; }).join('') + '</tbody></table>';
  bindRowClicks('reg-table', regDataCache.participants);
}
function bindRowClicks(tableId, src) {
  var t = document.getElementById(tableId); if (!t) return;
  t.querySelectorAll('tbody tr').forEach(function (tr) {
    tr.addEventListener('click', function () { var p = src.find(function (x) { return x.code===tr.dataset.code; }); if (p) openParticipantModal(p); });
  });
}
document.getElementById('reg-search').addEventListener('input', drawRegistrationTable);
document.getElementById('reg-sort').addEventListener('change', function () { regSortState=this.value; drawRegistrationTable(); });

/* ---- Participants ---- */
var partTimer = null;
function renderParticipants() {
  document.querySelector('#view-participants .table-wrap').innerHTML = loadingState();
  fetchParticipants('');
}
function fetchParticipants(query) {
  apiFetch({ action:'getParticipantsList', query: query })
    .then(function (d) {
      if (!d || d.ok===false) { document.querySelector('#view-participants .table-wrap').innerHTML = errorState(d&&d.error,'participants'); return; }
      PARTICIPANTS_CACHE = d.participants;
      var wrap = document.querySelector('#view-participants .table-wrap');
      if (!d.participants.length) { wrap.innerHTML = emptyState('i-search','No matching participants','Search by name, email, or access code.'); return; }
      wrap.innerHTML = '<table class="dt" id="part-table"><thead><tr><th>Name</th><th>Email</th><th>Track</th><th>Status</th><th>Access code</th></tr></thead><tbody>' +
        d.participants.map(function (p) { return '<tr data-code="'+esc(p.code)+'"><td>'+esc(p.name)+'</td><td>'+esc(p.email)+'</td><td>'+esc(p.track)+'</td><td>'+statusPill(p.status)+'</td><td class="code-cell">'+esc(p.code)+'</td></tr>'; }).join('') + '</tbody></table>';
      bindRowClicks('part-table', d.participants);
    })
    .catch(function (e) { document.querySelector('#view-participants .table-wrap').innerHTML = errorState(e.message,'participants'); });
}
document.getElementById('part-search').addEventListener('input', function () {
  clearTimeout(partTimer); var q = this.value;
  partTimer = setTimeout(function () { fetchParticipants(q); }, 300);
});

/* ---- Attendance ---- */
function renderAttendance() {
  showViewLoading('attendance');
  document.getElementById('att-scanlog').innerHTML = loadingState();
  apiFetch({ action:'getAttendanceData' })
    .then(function (d) {
      if (!d || d.ok===false) { showViewError('attendance', d&&d.error); return; }
      renderStats('att-stats', [
        { label:'Checked in', value:d.stats.checkedIn },
        { label:'Yet to arrive', value:d.stats.yetToArrive },
        { label:'Attendance rate', value:d.stats.attendanceRate, suffix:'%' },
        { label:'Duplicate attempts', value:d.stats.duplicates, deltaType:d.stats.duplicates?'warn':'up' },
        { label:'Invalid attempts', value:d.stats.invalid, deltaType:d.stats.invalid?'warn':'up' }
      ]);
      renderBars('att-arrivals', d.arrivals);
      renderRows('att-recent', d.recentCheckins.map(function (p) { return { name:p.name, meta:p.track, time:fmtTime(p.checkinTime) }; }), 'No check-ins yet.');
      document.getElementById('att-scanlog').innerHTML = d.scanLog.length
        ? '<thead><tr><th>Time</th><th>Access code</th><th>Name</th><th>Result</th></tr></thead><tbody>' + d.scanLog.map(function (s) { return '<tr><td>'+fmtDateTime(s.time)+'</td><td class="code-cell">'+esc(s.code)+'</td><td>'+esc(s.name||'—')+'</td><td>'+scanResultPill(s.result)+'</td></tr>'; }).join('') + '</tbody>'
        : emptyState('i-check-circle','No scans logged yet.','');
    })
    .catch(function (e) { showViewError('attendance', e.message); });
}

/* ---- Communication ---- */
function renderCommunication() {
  showViewLoading('communication');
  document.getElementById('comm-table').innerHTML = loadingState();
  apiFetch({ action:'getCommunicationData' })
    .then(function (d) {
      if (!d || d.ok===false) { showViewError('communication', d&&d.error); return; }
      renderStats('comm-stats', [
        { label:'Emails sent', value:d.stats.sent },
        { label:'Opened', value:d.stats.opens },
        { label:'Open rate', value:d.stats.openRate, suffix:'%' },
        { label:'Clicks', value:d.stats.clicks },
        { label:'CTR', value:d.stats.ctr, suffix:'%' },
        { label:'Failed', value:d.stats.failed, deltaType:d.stats.failed?'warn':'up' }
      ]);
      document.getElementById('comm-table').innerHTML = d.campaigns.length
        ? '<thead><tr><th>Date</th><th>Subject</th><th>Target</th><th>Sent</th><th>Opens</th><th>Open rate</th><th>Clicks</th><th>CTR</th></tr></thead><tbody>' +
          d.campaigns.map(function (c) { return '<tr><td>'+esc(c.date)+'</td><td>'+esc(c.subject)+'</td><td>'+esc(c.target)+'</td><td>'+c.sent+'</td><td>'+c.opens+'</td><td>'+esc(c.openRate)+'</td><td>'+c.clicks+'</td><td>'+esc(c.ctr)+'</td></tr>'; }).join('') + '</tbody>'
        : emptyState('i-communication','No campaigns sent yet.','Head to the Dispatch Console to send your first one.');
    })
    .catch(function (e) { showViewError('communication', e.message); });
}

/* ---- Speakers ---- */
function renderSpeakers() {
  showViewLoading('speakers');
  document.getElementById('spk-table').innerHTML = loadingState();
  apiFetch({ action:'getSpeakersData' })
    .then(function (d) {
      if (!d || d.ok===false) { showViewError('speakers', d&&d.error); return; }
      renderStats('spk-stats', [
        { label:'Confirmed', value:d.stats.confirmed },
        { label:'Pending', value:d.stats.pending, deltaType:d.stats.pending?'warn':'up' },
        { label:'Fully ready', value:d.stats.ready+' / '+d.stats.total }
      ]);
      if (!d.speakers.length) { document.getElementById('spk-table').innerHTML = emptyState('i-speakers','No speakers added yet','Add a row in the Speakers sheet.'); return; }
      document.getElementById('spk-table').innerHTML = '<thead><tr><th>Speaker</th><th>Topic / session</th><th>Confirmation</th><th>Bio</th><th>Headshot</th><th>Arrival</th></tr></thead><tbody>' +
        d.speakers.map(function (s) {
          return '<tr><td>'+esc(s.name)+'</td><td>'+esc(s.topic)+'</td>' +
            '<td>'+selHtml(s.row,'confirmation',['Confirmed','Pending','Declined'],s.confirmation)+'</td>' +
            '<td>'+selHtml(s.row,'bio',['Received','Missing'],s.bio)+'</td>' +
            '<td>'+selHtml(s.row,'headshot',['Received','Missing'],s.headshot)+'</td>' +
            '<td>'+selHtml(s.row,'arrival',['Not arrived','Arrived'],s.arrival)+'</td></tr>';
        }).join('') + '</tbody>';
      document.querySelectorAll('#spk-table select').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var row=Number(this.dataset.row), field=this.dataset.field, value=this.value;
          this.disabled = true;
          apiFetch({ action:'updateSpeakerField', row:row, field:field, value:value })
            .then(function () { toast('Speaker updated'); renderSpeakers(); })
            .catch(function () { toast("Couldn't save — try again"); sel.disabled=false; });
        });
      });
    })
    .catch(function (e) { showViewError('speakers', e.message); });
}
function selHtml(row, field, opts, current) {
  return '<select class="inline-select" data-row="'+row+'" data-field="'+field+'">' +
    opts.map(function (o) { return '<option'+(o===current?' selected':'')+'>'+esc(o)+'</option>'; }).join('') + '</select>';
}

/* ---- Certificates ---- */
function renderCertificates() {
  showViewLoading('certificates');
  document.getElementById('cert-table').innerHTML = loadingState();
  apiFetch({ action:'getCertificatesData' })
    .then(function (d) {
      if (!d || d.ok===false) { showViewError('certificates', d&&d.error); return; }
      renderStats('cert-stats', [
        { label:'Eligible', value:d.stats.eligible },
        { label:'Generated', value:d.stats.generated },
        { label:'Sent', value:d.stats.sent },
        { label:'Pending', value:d.stats.eligible }
      ]);
      if (!d.certificates.length) { document.getElementById('cert-table').innerHTML = emptyState('i-certificates','No one eligible yet','Certificates appear here once participants check in.'); return; }
      document.getElementById('cert-table').innerHTML = '<thead><tr><th>Access code</th><th>Name</th><th>Email</th><th>Status</th><th></th></tr></thead><tbody>' +
        d.certificates.map(function (c) {
          var action = c.status==='Eligible' ? '<button class="btn btn-outline btn-sm cert-action" data-row="'+c.row+'" data-next="Generated">Mark generated</button>'
            : c.status==='Generated' ? '<button class="btn btn-outline btn-sm cert-action" data-row="'+c.row+'" data-next="Sent">Mark sent</button>'
            : '<span class="label">Done</span>';
          return '<tr><td class="code-cell">'+esc(c.code)+'</td><td>'+esc(c.name)+'</td><td>'+esc(c.email)+'</td><td>'+certStatusPill(c.status)+'</td><td>'+action+'</td></tr>';
        }).join('') + '</tbody>';
      document.querySelectorAll('.cert-action').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var row=Number(this.dataset.row), next=this.dataset.next;
          this.disabled = true;
          apiFetch({ action:'updateCertificateStatus', row:row, status:next })
            .then(function () { toast('Certificate marked '+next.toLowerCase()); renderCertificates(); })
            .catch(function () { toast("Couldn't save — try again"); });
        });
      });
    })
    .catch(function (e) { showViewError('certificates', e.message); });
}

/* ---- Event Day ---- */
function renderEventDay() {
  showViewLoading('eventday');
  apiFetch({ action:'getEventDayData' })
    .then(function (d) {
      if (!d || d.ok===false) { showViewError('eventday', d&&d.error); return; }
      document.getElementById('ed-stats').innerHTML = [
        { label:'Registered', value:d.stats.total },
        { label:'Checked in', value:d.stats.checkedIn },
        { label:'Attendance', value:d.stats.rate+'%' },
        { label:'Yet to arrive', value:d.stats.yetToArrive }
      ].map(function (s) { return '<div class="ed-stat"><div class="ed-label">'+esc(s.label)+'</div><div class="ed-value">'+esc(s.value)+'</div></div>'; }).join('');
      renderRows('ed-recent', d.recentCheckins.map(function (p) { return { name:p.name, meta:p.track, time:fmtTime(p.checkinTime) }; }), 'No check-ins yet.');
      document.getElementById('ed-alerts').innerHTML = d.alerts.length
        ? d.alerts.map(function (a) { return '<div class="attn-item'+(a.result==='INVALID'?' crit':'')+'"><span class="attn-dot"></span><div><div class="attn-text">'+(a.result==='INVALID'?'Invalid code scanned':'Duplicate scan — '+esc(a.name))+'</div><div class="attn-sub">'+esc(a.code)+' · '+fmtTime(a.time)+'</div></div></div>'; }).join('')
        : emptyState('i-check-circle','No alerts.','');
    })
    .catch(function (e) { showViewError('eventday', e.message); });
}
function performManualCheckIn() {
  var input = document.getElementById('ed-code-input');
  var code  = input.value.trim().toUpperCase();
  var flash = document.getElementById('ed-flash');
  var btn   = document.getElementById('ed-checkin-btn');
  if (!code) { input.focus(); return; }
  btn.disabled = true;
  apiFetch({ action:'performCheckIn', code:code })
    .then(function (res) {
      btn.disabled = false;
      if (!res.ok) { toast("Couldn't check in — try again"); return; }
      var r = res.result;
      if (r.status==='not_found')         flash.innerHTML = '<div class="scan-flash bad"><div><strong>Not found</strong><div class="label" style="margin-top:4px;">'+esc(r.code)+'</div></div>'+scanResultPill('INVALID')+'</div>';
      else if (r.status==='already_checked_in') flash.innerHTML = '<div class="scan-flash dup"><div><strong>'+esc(r.name)+'</strong><div class="label" style="margin-top:4px;">Already checked in at '+esc(r.time)+'</div></div>'+scanResultPill('DUPLICATE')+'</div>';
      else if (r.status==='success')      { flash.innerHTML = '<div class="scan-flash ok"><div><strong>'+esc(r.name)+'</strong><div class="label" style="margin-top:4px;">'+esc(r.track)+'</div></div>'+scanResultPill('SUCCESS')+'</div>'; toast('Checked in '+r.name); }
      else flash.innerHTML = '<div class="scan-flash bad"><div><strong>Error</strong><div class="label" style="margin-top:4px;">'+esc(r.message||'')+'</div></div></div>';
      input.value = '';
      renderEventDay();
    })
    .catch(function () { btn.disabled=false; toast("Couldn't check in — try again"); });
}
document.getElementById('ed-checkin-btn').addEventListener('click', performManualCheckIn);
document.getElementById('ed-code-input').addEventListener('keydown', function (e) { if (e.key==='Enter') performManualCheckIn(); });

/* ==========================================================
   NAV / VIEW SWITCHING
   ========================================================== */
var VIEW_TITLES = { overview:'Overview', registration:'Registration', participants:'Participants', attendance:'Attendance', communication:'Communication', speakers:'Speakers', certificates:'Certificates', eventday:'Event day', eventinfo: 'Event info' };
var VIEW_RENDERERS = { overview:renderOverview, registration:renderRegistration, participants:renderParticipants, attendance:renderAttendance, communication:renderCommunication, speakers:renderSpeakers, certificates:renderCertificates, eventday:renderEventDay, eventinfo: renderEventInfo};

function switchView(name) {
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.rail-item').forEach(function (b) { b.classList.toggle('active', b.dataset.view===name); });
  document.getElementById('topbar-title').textContent = VIEW_TITLES[name];
  VIEW_RENDERERS[name]();
  closeDrawer();
  window.scrollTo(0,0);
}
document.querySelectorAll('.rail-item').forEach(function (btn) { btn.addEventListener('click', function () { switchView(this.dataset.view); }); });

function openDrawer()  { document.getElementById('rail').classList.add('open');    document.getElementById('drawer-veil').classList.add('open'); }
function closeDrawer() { document.getElementById('rail').classList.remove('open'); document.getElementById('drawer-veil').classList.remove('open'); }
document.getElementById('menu-btn').addEventListener('click', openDrawer);
document.getElementById('drawer-veil').addEventListener('click', closeDrawer);

/* ---------- Global search ---------- */
var gsInput = document.getElementById('gsearch-input');
var gsPanel = document.getElementById('gsearch-results');
var gsTimer = null;
function runGsearch(q) {
  if (PARTICIPANTS_CACHE.length) { renderGsearchResults(q); return; }
  apiFetch({ action:'getParticipantsList', query:'' }).then(function (d) { PARTICIPANTS_CACHE = d.participants || []; renderGsearchResults(q); }).catch(function(){});
}
function renderGsearchResults(q) {
  var ql = q.toLowerCase();
  var matches = PARTICIPANTS_CACHE.filter(function (p) { return p.name.toLowerCase().indexOf(ql)>-1||p.email.toLowerCase().indexOf(ql)>-1||p.code.toLowerCase().indexOf(ql)>-1; }).slice(0,6);
  gsPanel.innerHTML = matches.length
    ? matches.map(function (p) { return '<div class="gsearch-result" data-code="'+esc(p.code)+'"><span class="gr-name">'+esc(p.name)+'</span><span class="gr-meta">'+esc(p.code)+' · '+(p.status==='CHECKED_IN'?'Checked in':'Registered')+'</span></div>'; }).join('')
    : '<div class="gsearch-empty">No matches for "'+esc(q)+'"</div>';
  gsPanel.classList.add('open');
  gsPanel.querySelectorAll('.gsearch-result').forEach(function (row) {
    row.addEventListener('click', function () {
      var p = PARTICIPANTS_CACHE.find(function (x) { return x.code===row.dataset.code; });
      gsPanel.classList.remove('open'); gsInput.value = ''; if (p) openParticipantModal(p);
    });
  });
}
gsInput.addEventListener('input', function () {
  var q = this.value.trim(); clearTimeout(gsTimer);
  if (!q) { gsPanel.classList.remove('open'); return; }
  gsTimer = setTimeout(function () { runGsearch(q); }, 250);
});
document.addEventListener('click', function (e) { if (!e.target.closest('.gsearch')) gsPanel.classList.remove('open'); });

/* ==========================================================
   NOTIFICATION ENGINE — Web Push via service worker
   ========================================================== */
var Notif = (function () {
  var _swReg       = null;
  var _permitted   = false;
  var _pollTimer   = null;
  var _items       = [];
  var _intervalSec = 60;
  var STORE_KEY_SEEN  = 'dcmd_notif_seen';
  var STORE_KEY_ITEMS = 'dcmd_notif_items';

  var TYPE = {
    checkin: { dot:'checkin', title:'Check-in'     },
    reg:     { dot:'reg',     title:'Registration'  },
    dup:     { dot:'dup',     title:'Duplicate scan' },
    invalid: { dot:'invalid', title:'Invalid scan'   },
    email:   { dot:'email',   title:'Email campaign' }
  };

  function loadSeen()  { try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY_SEEN)||'[]')); } catch(e) { return new Set(); } }
  function saveSeen(s) { try { localStorage.setItem(STORE_KEY_SEEN, JSON.stringify(Array.from(s))); } catch(e) {} }
  function loadItems() { try { return JSON.parse(localStorage.getItem(STORE_KEY_ITEMS)||'[]'); } catch(e) { return []; } }
  function saveItems() { try { localStorage.setItem(STORE_KEY_ITEMS, JSON.stringify(_items.slice(0,80))); } catch(e) {} }
  function el(id) { return document.getElementById(id); }

  /* ---- service worker + push subscription ---- */
  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return Promise.reject('No service worker support');
    return navigator.serviceWorker.register('sw.js')
      .then(function (reg) { _swReg = reg; return reg; });
  }

  function subscribePush(swReg) {
    return swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }).then(function (sub) {
      // Send subscription to Apps Script to store it
      return apiFetch({ action:'savePushSubscription', subscription: JSON.stringify(sub) })
        .then(function () { return sub; });
    });
  }

  /* ---- permission + full setup ---- */
  function requestPermission() {
    if (!('Notification' in window)) { toast('Your browser does not support notifications.'); return; }
    Notification.requestPermission().then(function (result) {
      _permitted = result === 'granted';
      el('notif-permission-row').classList.toggle('hidden', _permitted);
      if (_permitted) {
        registerSW()
          .then(subscribePush)
          .then(function () { toast('Push notifications enabled.'); startPolling(); })
          .catch(function () {
            // Push subscription failed but Notification API works —
            // fall back to in-tab Notification API only (no background push)
            toast('Notifications enabled (in-tab only).');
            startPolling();
          });
      } else {
        toast('Permission denied — notifications are off.');
      }
      updatePollStatus();
    });
  }

  function checkPermission() {
    if (!('Notification' in window)) return;
    _permitted = Notification.permission === 'granted';
    el('notif-permission-row').classList.toggle('hidden', _permitted);
    updatePollStatus();
  }

  /* ---- polling ---- */
  function startPolling() {
    if (_pollTimer) clearInterval(_pollTimer);
    if (!_permitted) return;
    poll();
    _pollTimer = setInterval(poll, _intervalSec * 1000);
    updatePollStatus();
  }
  function stopPolling() { if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; } updatePollStatus(); }

  function poll() {
    apiFetch({ action:'getNotificationSnapshot' })
      .then(onSnapshot)
      .catch(function () {}); // silent
  }

  /* ---- diff snapshot ---- */
  function onSnapshot(snap) {
    if (!snap) return;
    var seen = loadSeen();
    var newItems = [];

    (snap.recentCheckins||[]).forEach(function (c) {
      var id = 'ci_'+c.code+'_'+(c.checkinTime||'');
      if (!seen.has(id)) { seen.add(id); newItems.push({ id:id, type:'checkin', msg:c.name+' checked in — '+c.track, time:c.checkinTime||new Date().toISOString() }); }
    });
    (snap.recentRegistrations||[]).forEach(function (r) {
      var id = 'reg_'+r.code;
      if (!seen.has(id)) { seen.add(id); newItems.push({ id:id, type:'reg', msg:r.name+' registered — '+r.track, time:r.registeredAt||new Date().toISOString() }); }
    });
    (snap.recentDuplicates||[]).forEach(function (d) {
      var id = 'dup_'+d.code+'_'+(d.time||'');
      if (!seen.has(id)) { seen.add(id); newItems.push({ id:id, type:'dup', msg:'Duplicate scan — '+(d.name||d.code), time:d.time||new Date().toISOString() }); }
    });
    (snap.recentInvalid||[]).forEach(function (v) {
      var id = 'inv_'+v.code+'_'+(v.time||'');
      if (!seen.has(id)) { seen.add(id); newItems.push({ id:id, type:'invalid', msg:'Invalid QR scan — code: '+v.code, time:v.time||new Date().toISOString() }); }
    });
    (snap.recentCampaigns||[]).forEach(function (c) {
      var id = 'camp_'+c.id;
      if (!seen.has(id)) { seen.add(id); newItems.push({ id:id, type:'email', msg:'Campaign sent — "'+c.subject+'" ('+c.sent+' emails)', time:c.rawDate||new Date().toISOString() }); }
    });

    saveSeen(seen);
    if (newItems.length) {
      newItems.forEach(function (item) {
        item.read = false;
        _items.unshift(item);
        fireBrowserNotif(item);
      });
      _items = _items.slice(0,80);
      saveItems();
      renderList();
      updateBadge();
    }
  }

  /* ---- fire browser notification ---- */
  function fireBrowserNotif(item) {
    if (!_permitted) return;
    var cfg = TYPE[item.type] || TYPE.checkin;
    var icon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#07220C"/><text x="50" y="68" font-size="50" font-weight="700" fill="#9CF0B0" text-anchor="middle" font-family="system-ui">D</text></svg>');
    // Try via service worker first (works in background), fall back to direct API
    if (_swReg && _swReg.showNotification) {
      _swReg.showNotification('DECRYPT — ' + cfg.title, { body: item.msg, icon: icon, tag: item.id, silent: false })
        .catch(function () { directNotif(cfg.title, item.msg, icon, item.id); });
    } else {
      directNotif(cfg.title, item.msg, icon, item.id);
    }
  }
  function directNotif(title, body, icon, tag) {
    try { var n = new Notification('DECRYPT — '+title, { body:body, icon:icon, tag:tag }); n.onclick = function () { window.focus(); n.close(); }; } catch(e) {}
  }

  /* ---- render list ---- */
  function renderList() {
    var list = el('notif-list'); if (!list) return;
    if (!_items.length) { list.innerHTML = '<div class="notif-item"><span class="notif-dot read"></span><div class="notif-text"><div class="notif-msg">No notifications yet.</div></div></div>'; return; }
    list.innerHTML = _items.map(function (item) {
      var cfg = TYPE[item.type] || { dot:'read' };
      return '<div class="notif-item'+(item.read?'':' unread')+'" data-id="'+esc(item.id)+'"><span class="notif-dot '+(item.read?'read':cfg.dot)+'"></span><div class="notif-text"><div class="notif-msg">'+esc(item.msg)+'</div><div class="notif-time">'+esc(timeAgo(item.time))+'</div></div></div>';
    }).join('');
    list.querySelectorAll('.notif-item[data-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        var id = this.dataset.id;
        _items.forEach(function (it) { if (it.id===id) it.read=true; });
        saveItems(); renderList(); updateBadge();
      });
    });
  }

  function updateBadge() {
    var unread = _items.filter(function (i) { return !i.read; }).length;
    var b = el('notif-badge'); if (b) b.classList.toggle('visible', unread>0);
  }
  function updatePollStatus() {
    var dot = el('notif-poll-dot'), lbl = el('notif-poll-label'); if (!dot||!lbl) return;
    if (!_permitted)    { dot.className='notif-poll-dot paused'; lbl.textContent='Waiting for permission'; }
    else if (_pollTimer){ dot.className='notif-poll-dot active'; lbl.textContent='Polling every '+_intervalSec+'s'; }
    else                { dot.className='notif-poll-dot paused'; lbl.textContent='Polling paused'; }
  }
  function timeAgo(iso) {
    if (!iso) return '';
    var diff = Math.floor((Date.now()-new Date(iso).getTime())/1000);
    if (diff<60) return diff+'s ago'; if (diff<3600) return Math.floor(diff/60)+'m ago';
    if (diff<86400) return Math.floor(diff/3600)+'h ago'; return Math.floor(diff/86400)+'d ago';
  }



  
  function init() {
    _items = loadItems(); renderList(); updateBadge(); checkPermission();
    if (_permitted) { registerSW().then(startPolling).catch(startPolling); }

    var btn = el('notif-btn'), panel = el('notif-panel');
    if (btn && panel) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = panel.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
        if (open) setTimeout(function () { _items.forEach(function (it) { it.read=true; }); saveItems(); renderList(); updateBadge(); }, 1400);
      });
    }
    document.addEventListener('click', function (e) {
      if (panel && !e.target.closest('#notif-wrap')) { panel.classList.remove('open'); if (btn) btn.setAttribute('aria-expanded','false'); }
    });
    el('notif-enable-btn').addEventListener('click', requestPermission);
    el('notif-interval').addEventListener('change', function () {
      _intervalSec = parseInt(this.value, 10);
      if (_permitted) startPolling(); updatePollStatus();
    });
    el('notif-mark-all').addEventListener('click', function () { _items.forEach(function (it) { it.read=true; }); saveItems(); renderList(); updateBadge(); });
    el('notif-clear-all').addEventListener('click', function () { _items=[]; saveItems(); renderList(); updateBadge(); toast('Notifications cleared.'); });
    document.addEventListener('visibilitychange', function () {
      if (!_permitted) return;
      document.hidden ? stopPolling() : startPolling();
    });
  }

  return { init: init };
})();

/* ==========================================================
   APP — initialised after auth passes
   ========================================================== */
var App = {
  init: function () {
    Notif.init();
    renderOverview();
  }
};

/* ==========================================================
   BOOT
   ========================================================== */
Auth.init();
