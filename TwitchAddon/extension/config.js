// Twitch-Extension Config-View: Broadcaster kann Rewards nur aktivieren/deaktivieren.

// Wird in der CI-Pipeline durch den echten EBS-Endpunkt ersetzt.
var EBS_BASE_URL = '__EBS_BASE_URL__';

var broadcasterJwt = null;
var allRewards = [];
var rewardsReloadInterval = null;

function ebsFetch(path, opts) {
  opts = opts || {};
  opts.headers = Object.assign({ 'ngrok-skip-browser-warning': '1' }, opts.headers || {});
  return window.fetch(EBS_BASE_URL.concat(path), opts);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n) {
  return Number(n).toLocaleString('de-DE');
}

function decodeJwtPayload(token) {
  try {
    var parts = token.split('.');
    if (parts.length !== 3) return null;
    var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch (e) {
    return null;
  }
}

function apiRewards(method, params, body) {
  var path = '/api/rewards' + (params ? '?' + params : '');
  var opts = {
    method: method,
    headers: { 'Content-Type': 'application/json', 'x-extension-jwt': broadcasterJwt }
  };

  if (body) opts.body = JSON.stringify(body);

  return ebsFetch(path, opts).then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) throw new Error(data.error || res.status);
      return data;
    });
  });
}

function loadRewards() {
  ebsFetch('/api/rewards')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      allRewards = data.sort(function(a, b) { return a.cost - b.cost; });
      renderList();
    })
    .catch(function() {
      document.getElementById('rewardList').innerHTML = '<div class="state-msg">❌ Rewards konnten nicht geladen werden.</div>';
    });
}

function renderList() {
  var el = document.getElementById('rewardList');

  if (!allRewards.length) {
    el.innerHTML = '<div class="state-msg">Noch keine Rewards. Gehe zum Admin-Panel, um welche hinzuzufügen.</div>';
    return;
  }

  el.innerHTML = allRewards.map(function(r) {
    var checked = r.is_enabled === false ? '' : ' checked';
    return '<div class="reward-item">' +
      '<label>' +
        '<input type="checkbox" data-reward-id="' + esc(String(r.id)) + '"' + checked + '>' +
        '<span class="reward-name">' + esc(r.name || 'Reward') + '</span>' +
        '<span class="reward-cost">' + fmt(r.cost) + ' P</span>' +
      '</label>' +
    '</div>';
  }).join('');

  el.querySelectorAll('input[data-reward-id]').forEach(function(input) {
    input.addEventListener('change', function() {
      toggleReward(input.getAttribute('data-reward-id'), input.checked);
    });
  });
}

function toggleReward(id, enabled) {
  apiRewards('PATCH', 'id=' + encodeURIComponent(id), { is_enabled: enabled })
    .then(function() {
      loadRewards();
    })
    .catch(function(e) {
      var listEl = document.getElementById('rewardList');
      listEl.insertAdjacentHTML('afterbegin', '<div class="state-msg">❌ Fehler: ' + esc(e.message) + '</div>');
      loadRewards();
    });
}

window.Twitch.ext.onAuthorized(function(auth) {
  var payload = decodeJwtPayload(auth.token);
  var role = payload && payload.role;

  var statusEl = document.getElementById('authStatus');
  if (role !== 'broadcaster') {
    statusEl.className = 'status-bar err';
    statusEl.textContent = '🔒 Nur der Broadcaster kann die Konfiguration öffnen.';
    return;
  }

  broadcasterJwt = auth.token;
  statusEl.className = 'status-bar ok';
  statusEl.textContent = '✔ Twitch-Verbindung hergestellt (Broadcaster)';

  document.getElementById('mainPanel').classList.remove('hidden');

  loadRewards();

  if (rewardsReloadInterval) clearInterval(rewardsReloadInterval);
  rewardsReloadInterval = setInterval(loadRewards, 30000);
});

window.addEventListener('beforeunload', function() {
  if (rewardsReloadInterval) clearInterval(rewardsReloadInterval);
});

document.getElementById('syncBtn').addEventListener('click', function() {
  window.open('https://hd1920x1080.de/admin/rewards', '_blank', 'noopener,noreferrer');
});
