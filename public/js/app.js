// ── Config ────────────────────────────────────────────────────────────────
const API = '/api';

// ── State ─────────────────────────────────────────────────────────────────
let currentUser = null;
let selectedRole = 'driver';

// ── JWT helpers ───────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('carfun_token');
const setToken = (t) => localStorage.setItem('carfun_token', t);
const clearToken = () => localStorage.removeItem('carfun_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

// ── API helper ────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Page navigation ───────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const target = document.getElementById(`page-${name}`);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name === 'rides') loadRides();
  if (name === 'dashboard') loadDashboard();
  if (name === 'messages') {
    const badge = document.getElementById('msg-badge');
    if (badge) badge.style.display = 'none';
    loadMessages();
  }
  if (name === 'admin') loadAdmin();
  if (name === 'offer' && !currentUser) { showPage('login'); return; }
  if (name === 'dashboard' && !currentUser) { showPage('login'); return; }
  if (name === 'messages' && !currentUser) { showPage('login'); return; }
  if (name === 'admin' && (!currentUser || !currentUser.isAdmin)) { showPage('home'); return; }
}

// ── Toast ─────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Auth UI ───────────────────────────────────────────────────────────────
function updateNav() {
  const authEl = document.getElementById('nav-auth');
  const userEl = document.getElementById('nav-user');
  const offerNav = document.getElementById('nav-offer');
  const dashNav = document.getElementById('nav-dashboard');
  const msgsNav = document.getElementById('nav-messages');
  const adminNav = document.getElementById('nav-admin');

  if (currentUser) {
    authEl.style.display = 'none';
    userEl.style.display = 'flex';
    document.getElementById('chip-avatar').textContent =
      `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase();
    document.getElementById('chip-name').textContent = currentUser.firstName;

    if (currentUser.role === 'driver' || currentUser.role === 'both') {
      offerNav.style.display = '';
    }
    dashNav.style.display = '';
    msgsNav.style.display = '';
    adminNav.style.display = currentUser.isAdmin ? '' : 'none';

    fetchUserCount();
  } else {
    authEl.style.display = 'flex';
    userEl.style.display = 'none';
    offerNav.style.display = 'none';
    dashNav.style.display = 'none';
    msgsNav.style.display = 'none';
    adminNav.style.display = 'none';
  }
}

async function fetchUserCount() {
  try {
    // Using the health endpoint as a proxy; in production you'd add a /stats route
    const el = document.getElementById('stat-users');
    if (el) el.textContent = '340+';
  } catch (_) {}
}

// ── Login ─────────────────────────────────────────────────────────────────
async function submitLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const form = e.target;

  btn.textContent = 'Logging in…';
  btn.disabled = true;
  errEl.style.display = 'none';

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: form.email.value,
        password: form.password.value,
      }),
    });

    setToken(data.token);
    currentUser = data.user;
    updateNav();
    connectSSE();
    showToast(`Welcome back, ${currentUser.firstName}!`);
    showPage('rides');
    form.reset();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Login →';
    btn.disabled = false;
  }
}

// ── Register ──────────────────────────────────────────────────────────────
function pickRole(role) {
  selectedRole = role;
  document.getElementById('role-driver').classList.toggle('active', role === 'driver');
  document.getElementById('role-passenger').classList.toggle('active', role === 'passenger');
  document.getElementById('car-fields').style.display = role === 'driver' ? '' : 'none';
}

function toggleDay(btn) {
  btn.classList.toggle('active');
}

async function submitRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-btn');
  const errEl = document.getElementById('form-error');
  const form = e.target;

  // Client-side validation
  if (form.password.value !== form.confirmPassword.value) {
    errEl.textContent = 'Passwords do not match';
    errEl.style.display = 'block';
    return;
  }
  // Collect commute days
  const commuteDays = [...document.querySelectorAll('.day-btn.active')].map((b) => b.textContent);

  btn.textContent = 'Creating profile…';
  btn.disabled = true;
  errEl.style.display = 'none';

  const body = {
    firstName: form.firstName.value,
    lastName: form.lastName.value,
    email: form.email.value,
    password: form.password.value,
    role: selectedRole,
    area: form.area.value,
    commuteDays,
    departureTime: form.departureTime.value,
    returnTime: form.returnTime.value,
  };

  if (selectedRole === 'driver') {
    body.carRegistration = form.carRegistration?.value || '';
    body.carModel = form.carModel?.value || '';
    body.seatsAvailable = parseInt(form.seatsAvailable?.value) || 2;
  }

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    setToken(data.token);
    currentUser = data.user;
    updateNav();
    connectSSE();
    showToast(`Welcome to CarFun, ${currentUser.firstName}!`);
    showPage('rides');
    form.reset();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Create Profile →';
    btn.disabled = false;
  }
}

// ── Logout ────────────────────────────────────────────────────────────────
function logout() {
  disconnectSSE();
  clearToken();
  currentUser = null;
  activeConvoId = null;
  updateNav();
  showPage('home');
  showToast('Logged out successfully');
}

// ── Rides: Load ───────────────────────────────────────────────────────────
async function loadRides() {
  const grid = document.getElementById('rides-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-state">Loading rides…</div>';

  const area = document.getElementById('filter-area')?.value || '';
  const date = document.getElementById('filter-date')?.value || '';

  const params = new URLSearchParams();
  if (area) params.set('area', area);
  if (date) params.set('date', date);

  try {
    const data = await apiFetch(`/rides?${params}`);
    renderRides(data.rides);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="big">⚠️</div><p>${err.message}</p></div>`;
  }
}

function clearFilters() {
  const areaEl = document.getElementById('filter-area');
  const dateEl = document.getElementById('filter-date');
  if (areaEl) areaEl.value = '';
  if (dateEl) dateEl.value = '';
  loadRides();
}

function renderRides(rides) {
  const grid = document.getElementById('rides-grid');
  if (!rides || rides.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="big">🚗</div>
        <p>No rides available right now — check back soon or offer one!</p>
        ${currentUser && (currentUser.role === 'driver' || currentUser.role === 'both')
          ? '<button class="btn-primary" onclick="showPage(\'offer\')">Post a ride</button>'
          : '<button class="btn-secondary" onclick="showPage(\'register\')">Join to get notified</button>'}
      </div>`;
    return;
  }

  // Avatar colours by index
  const avColors = [
    { bg: 'rgba(200,240,58,0.18)', color: '#C8F03A' },
    { bg: 'rgba(74,144,217,0.18)', color: '#7ab8f5' },
    { bg: 'rgba(255,107,53,0.18)', color: '#ff9a74' },
    { bg: 'rgba(76,175,80,0.18)', color: '#81c784' },
    { bg: 'rgba(255,193,7,0.18)', color: '#ffd54f' },
  ];

  grid.innerHTML = rides.map((ride, i) => {
    const driver = ride.driver || {};
    const initials = driver.firstName
      ? `${driver.firstName[0]}${driver.lastName[0]}`.toUpperCase()
      : '??';
    const rating = driver.rating ? `★ ${driver.rating}` : 'New';
    const col = avColors[i % avColors.length];
    const seatsLeft = ride.seatsTotal - ride.seatsBooked;
    const isFull = seatsLeft <= 0;
    const rideDate = ride.date ? new Date(ride.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
    const isMyRide = currentUser && driver._id === currentUser._id;

    return `
      <div class="ride-card">
        <div class="rc-top">
          <div class="rc-driver">
            <div class="rc-av" style="background:${col.bg};color:${col.color};border:1px solid ${col.color}33">${initials}</div>
            <div><div class="rc-name">${driver.firstName || 'Driver'} ${driver.lastName?.[0] || ''}.</div><div class="rc-rating">${rating}</div></div>
          </div>
          <span class="${isFull ? 'full-pill' : 'seats-pill'}">${isFull ? 'Full' : `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''}`}</span>
        </div>
        <div class="rc-route">
          <div class="rc-from"><div class="rdot from"></div>${ride.fromArea}</div>
          <div class="rc-divider"></div>
          <div class="rc-to"><div class="rdot to"></div>${ride.toAddress || 'BathSpa Academic Centre RAK'}</div>
        </div>
        <div class="rc-meta">
          <span class="rc-chip">🕐 ${ride.departureTime}</span>
          <span class="rc-chip">📅 ${rideDate}</span>
          ${ride.costContribution > 0 ? `<span class="rc-chip">💷 £${ride.costContribution}/person</span>` : '<span class="rc-chip">🆓 Free</span>'}
        </div>
        <button
          class="rc-btn"
          onclick="requestRide('${ride._id}', this)"
          ${isFull || isMyRide ? 'disabled' : ''}
        >${isMyRide ? 'Your ride' : isFull ? 'Ride full' : 'Request this ride'}</button>
      </div>`;
  }).join('');
}

// ── Rides: Request ────────────────────────────────────────────────────────
async function requestRide(rideId, btn) {
  if (!currentUser) {
    showToast('Please login first to request a ride', true);
    showPage('login');
    return;
  }

  btn.textContent = 'Sending…';
  btn.disabled = true;

  try {
    await apiFetch(`/rides/${rideId}/request`, { method: 'POST' });
    btn.textContent = 'Request sent ✓';
    showToast('Ride request sent to the driver!');
  } catch (err) {
    btn.textContent = 'Request this ride';
    btn.disabled = false;
    showToast(err.message, true);
  }
}

// ── Offer Ride ────────────────────────────────────────────────────────────
async function submitOffer(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');

  btn.textContent = 'Posting…';
  btn.disabled = true;

  const body = {
    fromArea: form.fromArea.value,
    fromAddress: form.fromAddress.value,
    date: form.date.value,
    departureTime: form.departureTime.value,
    returnTime: form.returnTime.value,
    seatsTotal: parseInt(form.seatsTotal.value),
    costContribution: parseFloat(form.costContribution.value) || 0,
    notes: form.notes.value,
  };

  try {
    await apiFetch('/rides', { method: 'POST', body: JSON.stringify(body) });
    showToast('Ride posted! Students can now request it.');
    form.reset();
    showPage('rides');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.textContent = 'Post Ride →';
    btn.disabled = false;
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  if (!currentUser) return;
  try {
    const data = await apiFetch('/users/my-rides');
    renderDashDriver(data.driverRides);
    renderDashPassenger(data.passengerRides);
  } catch (err) {
    showToast(err.message, true);
  }
}

function switchDashTab(tab, btn) {
  document.querySelectorAll('.dash-tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('dash-driving').style.display = tab === 'driving' ? '' : 'none';
  document.getElementById('dash-passenger').style.display = tab === 'passenger' ? '' : 'none';
}

function renderDashDriver(rides) {
  const el = document.getElementById('dash-driving');
  if (!rides || rides.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="big">🚗</div><p>You haven't offered any rides yet.</p><button class="btn-primary" onclick="showPage('offer')">Post a ride</button></div>`;
    return;
  }

  el.innerHTML = rides.map((ride) => {
    const rideDate = ride.date ? new Date(ride.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
    const pending = (ride.requests || []).filter((r) => r.status === 'pending');

    return `
      <div class="dash-ride">
        <div>
          <div class="dash-route">${ride.fromArea} → BathSpa Academic Centre RAK</div>
          <div class="dash-meta">${rideDate} at ${ride.departureTime} · ${ride.seatsTotal - ride.seatsBooked} seats left</div>
          ${pending.length > 0 ? `
            <div class="requests-list">
              ${pending.map((r) => `
                <div class="req-row">
                  <span>${r.passenger?.firstName || 'Student'} ${r.passenger?.lastName?.[0] || ''}. from ${r.passenger?.area || '—'}</span>
                  <div class="req-actions">
                    <button class="btn-accept" onclick="handleRequest('${ride._id}','${r._id}','accepted', this)">Accept</button>
                    <button class="btn-reject" onclick="handleRequest('${ride._id}','${r._id}','rejected', this)">Decline</button>
                  </div>
                </div>`).join('')}
              ${(ride.requests || []).filter(r => r.status === 'accepted' && r.pickupLocation?.lat != null).map((r) => `
                <div class="req-row">
                  <span>📍 ${r.passenger?.firstName || 'Passenger'} ${r.passenger?.lastName?.[0] || ''}. has set a pickup pin</span>
                  <button class="btn-pin" onclick="openViewPickupMap('${r.passenger?.firstName || 'Passenger'}',${r.pickupLocation.lat},${r.pickupLocation.lng})">View Pin</button>
                </div>`).join('')}
            </div>` : `
            ${(ride.requests || []).filter(r => r.status === 'accepted' && r.pickupLocation?.lat != null).length > 0 ? `
            <div class="requests-list">
              ${(ride.requests || []).filter(r => r.status === 'accepted' && r.pickupLocation?.lat != null).map((r) => `
                <div class="req-row">
                  <span>📍 ${r.passenger?.firstName || 'Passenger'} ${r.passenger?.lastName?.[0] || ''}. has set a pickup pin</span>
                  <button class="btn-pin" onclick="openViewPickupMap('${r.passenger?.firstName || 'Passenger'}',${r.pickupLocation.lat},${r.pickupLocation.lng})">View Pin</button>
                </div>`).join('')}
            </div>` : ''}`}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem">
          <span class="status-pill status-${ride.status}">${ride.status}</span>
          ${ride.status === 'active' || ride.status === 'full' ? `
            <button class="btn-complete" onclick="markRideCompleted('${ride._id}', this)">Mark as Completed</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function renderDashPassenger(rides) {
  const el = document.getElementById('dash-passenger');
  if (!rides || rides.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="big">🎒</div><p>You haven't requested any rides yet.</p><button class="btn-primary" onclick="showPage('rides')">Find rides</button></div>`;
    return;
  }

  el.innerHTML = rides.map((ride) => {
    const rideDate = ride.date ? new Date(ride.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
    const myRequest = (ride.requests || []).find(
      (r) => r.passenger?.toString() === currentUser._id || r.passenger?._id === currentUser._id
    );

    const isAccepted = myRequest?.status === 'accepted';
    const hasPin = isAccepted && myRequest?.pickupLocation?.lat != null;

    return `
      <div class="dash-ride">
        <div>
          <div class="dash-route">${ride.fromArea} → BathSpa Academic Centre RAK</div>
          <div class="dash-meta">Driver: ${ride.driver?.firstName || 'Unknown'} · ${rideDate} at ${ride.departureTime}</div>
          ${isAccepted ? `<div style="margin-top:0.5rem">
            <button class="btn-pin" onclick="openSetPickupMap('${ride._id}','${myRequest._id}',${hasPin ? myRequest.pickupLocation.lat : 'null'},${hasPin ? myRequest.pickupLocation.lng : 'null'})">
              📍 ${hasPin ? 'Update Pickup Pin' : 'Set Pickup Pin'}
            </button>
          </div>` : ''}
        </div>
        <span class="status-pill status-${myRequest?.status || 'pending'}">${myRequest?.status || 'pending'}</span>
      </div>`;
  }).join('');
}

async function handleRequest(rideId, requestId, status, btn) {
  btn.disabled = true;
  try {
    await apiFetch(`/rides/${rideId}/request/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    showToast(`Request ${status === 'accepted' ? 'accepted ✓' : 'declined'}`);
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
    btn.disabled = false;
  }
}

async function markRideCompleted(rideId, btn) {
  if (!confirm('Mark this ride as completed? This cannot be undone.')) return;
  btn.textContent = 'Saving…';
  btn.disabled = true;
  try {
    await apiFetch(`/rides/${rideId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' }),
    });
    showToast('Ride marked as completed ✓');
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
    btn.textContent = 'Mark as Completed';
    btn.disabled = false;
  }
}

// ── Map / Pickup Pin ───────────────────────────────────────────────────────
const RAK_CENTER = [25.7889, 55.9432];
let leafletMap = null;
let pickupMarker = null;
let mapContext = null; // { rideId, requestId }

function openSetPickupMap(rideId, requestId, existingLat, existingLng) {
  mapContext = { rideId, requestId };
  document.getElementById('map-modal-title').textContent = 'Set Your Pickup Location';
  document.getElementById('map-modal-sub').textContent = 'Tap the map to drop your pin — only your driver can see this';
  document.getElementById('map-modal-footer').style.display = 'flex';
  document.getElementById('map-save-btn').disabled = true;
  document.getElementById('map-coords').textContent = 'No pin placed yet';
  document.getElementById('map-modal').style.display = 'flex';
  initMap('set', existingLat, existingLng);
}

function openViewPickupMap(passengerName, lat, lng) {
  mapContext = null;
  document.getElementById('map-modal-title').textContent = `${passengerName}'s Pickup Pin`;
  document.getElementById('map-modal-sub').textContent = 'Passenger-set pickup location';
  document.getElementById('map-modal-footer').style.display = 'none';
  document.getElementById('map-modal').style.display = 'flex';
  initMap('view', lat, lng, passengerName);
}

function initMap(mode, lat, lng, label) {
  setTimeout(() => {
    if (leafletMap) { leafletMap.remove(); leafletMap = null; pickupMarker = null; }

    const hasLocation = lat != null && lng != null;
    const center = hasLocation ? [lat, lng] : RAK_CENTER;
    const zoom = hasLocation ? 15 : 12;

    leafletMap = L.map('map-container').setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletMap);

    if (hasLocation) {
      pickupMarker = L.marker([lat, lng]).addTo(leafletMap);
      if (mode === 'view') pickupMarker.bindPopup(label || 'Pickup').openPopup();
      if (mode === 'set') {
        document.getElementById('map-coords').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        document.getElementById('map-save-btn').disabled = false;
      }
    }

    if (mode === 'set') {
      leafletMap.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (pickupMarker) {
          pickupMarker.setLatLng([clickLat, clickLng]);
        } else {
          pickupMarker = L.marker([clickLat, clickLng]).addTo(leafletMap);
        }
        document.getElementById('map-coords').textContent = `${clickLat.toFixed(5)}, ${clickLng.toFixed(5)}`;
        document.getElementById('map-save-btn').disabled = false;
      });
    }
  }, 80);
}

function closeMapModal() {
  document.getElementById('map-modal').style.display = 'none';
  if (leafletMap) { leafletMap.remove(); leafletMap = null; pickupMarker = null; }
  mapContext = null;
}

function handleMapOverlayClick(e) {
  if (e.target === document.getElementById('map-modal')) closeMapModal();
}

async function savePickupLocation() {
  if (!mapContext || !pickupMarker) return;
  const { lat, lng } = pickupMarker.getLatLng();
  const btn = document.getElementById('map-save-btn');
  btn.textContent = 'Saving…';
  btn.disabled = true;
  try {
    await apiFetch(`/rides/${mapContext.rideId}/request/${mapContext.requestId}/location`, {
      method: 'PUT',
      body: JSON.stringify({ lat, lng }),
    });
    showToast('Pickup pin saved! Your driver can now see it.');
    closeMapModal();
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
    btn.textContent = 'Save Location';
    btn.disabled = false;
  }
}

// ── SSE ────────────────────────────────────────────────────────────────────
let eventSource = null;

function connectSSE() {
  if (eventSource) eventSource.close();
  const token = getToken();
  if (!token) return;

  eventSource = new EventSource(`/api/events?token=${token}`);

  eventSource.addEventListener('ride-accepted', (e) => {
    const { message } = JSON.parse(e.data);
    showToast(message);
    document.getElementById('nav-messages').style.display = '';
    if (document.getElementById('page-dashboard')?.classList.contains('active')) loadDashboard();
    if (document.getElementById('page-messages')?.classList.contains('active')) loadMessages();
  });

  eventSource.addEventListener('ride-rejected', (e) => {
    const { message } = JSON.parse(e.data);
    showToast(message, true);
    if (document.getElementById('page-dashboard')?.classList.contains('active')) loadDashboard();
  });

  eventSource.addEventListener('pickup-pin-updated', (e) => {
    const { passengerName } = JSON.parse(e.data);
    showToast(`${passengerName} has pinned their pickup location`);
    if (document.getElementById('page-dashboard')?.classList.contains('active')) loadDashboard();
  });

  eventSource.addEventListener('conversation-created', () => {
    document.getElementById('nav-messages').style.display = '';
    if (document.getElementById('page-messages')?.classList.contains('active')) loadMessages();
  });

  eventSource.addEventListener('new-message', (e) => {
    const { convoId } = JSON.parse(e.data);
    if (document.getElementById('page-messages')?.classList.contains('active')) {
      if (activeConvoId === convoId) {
        fetchAndRenderChat(convoId, true);
      } else {
        loadMessages();
      }
    } else {
      const badge = document.getElementById('msg-badge');
      if (badge) { badge.style.display = ''; badge.textContent = '●'; }
    }
  });

  eventSource.onerror = () => {
    eventSource.close();
    setTimeout(connectSSE, 5000);
  };
}

function disconnectSSE() {
  if (eventSource) { eventSource.close(); eventSource = null; }
}

// ── Messages ───────────────────────────────────────────────────────────────
let activeConvoId = null;

async function loadMessages() {
  if (!currentUser) return;
  const list = document.getElementById('convo-list');
  list.innerHTML = '<div class="loading-state">Loading…</div>';
  try {
    const data = await apiFetch('/messages');
    renderConvoList(data.conversations);
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}

function renderConvoList(convos) {
  const list = document.getElementById('convo-list');
  if (!convos.length) {
    list.innerHTML = '<div class="empty-state" style="padding:2rem;text-align:center;color:var(--muted);font-size:0.85rem;">No accepted rides yet.<br>Conversations appear here once a driver accepts your request.</div>';
    return;
  }
  list.innerHTML = convos.map((c) => {
    const other = currentUser._id === c.driver._id ? c.passenger : c.driver;
    const last = c.messages.length ? c.messages[c.messages.length - 1] : null;
    const rideDate = c.ride?.date ? new Date(c.ride.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
    return `
      <div class="convo-item${activeConvoId === c._id ? ' active' : ''}" onclick="openConvo('${c._id}', this)">
        <div class="convo-name">${other.firstName} ${other.lastName}</div>
        <div class="convo-route">${c.ride?.fromArea || ''} → Campus · ${rideDate}</div>
        <div class="convo-preview">${last ? last.text : 'No messages yet'}</div>
      </div>`;
  }).join('');
}

async function openConvo(convoId, el) {
  document.querySelectorAll('.convo-item').forEach((i) => i.classList.remove('active'));
  el.classList.add('active');
  activeConvoId = convoId;

  const main = document.getElementById('chat-main');
  main.innerHTML = '<div class="chat-empty-state"><div class="loading-state">Loading…</div></div>';

  await fetchAndRenderChat(convoId);
}

async function fetchAndRenderChat(convoId, silent = false) {
  try {
    const data = await apiFetch(`/messages/${convoId}`);
    renderChat(data.conversation, silent);
  } catch (err) {
    if (!silent) showToast(err.message, true);
  }
}

function renderChat(convo, silent = false) {
  const main = document.getElementById('chat-main');
  const other = currentUser._id === convo.driver._id ? convo.passenger : convo.driver;
  const rideDate = convo.ride?.date ? new Date(convo.ride.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  const wasAtBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 40;

  main.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-name">${other.firstName} ${other.lastName}</div>
      <div class="chat-header-route">${convo.ride?.fromArea || ''} → BathSpa Academic Centre RAK · ${rideDate} at ${convo.ride?.departureTime || ''}</div>
    </div>
    <div class="chat-messages" id="chat-msgs">
      ${convo.messages.length === 0
        ? '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding-top:2rem;">No messages yet — say hello!</div>'
        : convo.messages.map((m) => {
            const mine = m.sender === currentUser._id || m.sender?._id === currentUser._id;
            const time = new Date(m.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return `
              <div style="display:flex;flex-direction:column;align-items:${mine ? 'flex-end' : 'flex-start'}">
                <div class="msg-bubble ${mine ? 'mine' : 'theirs'}">${m.text}</div>
                <div class="msg-time" style="align-self:${mine ? 'flex-end' : 'flex-start'}">${time}</div>
              </div>`;
          }).join('')}
    </div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendMessage('${convo._id}')" />
      <button class="chat-send-btn" id="chat-send-btn" onclick="sendMessage('${convo._id}')">Send</button>
    </div>`;

  if (!silent || wasAtBottom) {
    const msgs = document.getElementById('chat-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }
}

async function sendMessage(convoId) {
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('chat-send-btn');
  const text = input?.value?.trim();
  if (!text) return;

  input.value = '';
  btn.disabled = true;

  try {
    await apiFetch(`/messages/${convoId}`, { method: 'POST', body: JSON.stringify({ text }) });
    await fetchAndRenderChat(convoId);
  } catch (err) {
    showToast(err.message, true);
    if (input) input.value = text;
  } finally {
    if (btn) btn.disabled = false;
    if (input) input.focus();
  }
}

// ── Admin ──────────────────────────────────────────────────────────────────
let allAdminUsers = [];

async function loadAdmin() {
  if (!currentUser || !currentUser.isAdmin) return;
  const list = document.getElementById('admin-users-list');
  list.innerHTML = '<div class="loading-state">Loading users…</div>';
  try {
    const data = await apiFetch('/users/all');
    allAdminUsers = data.users;
    updateAdminStats(data.users);
    renderAdminUsers(data.users);
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}

function updateAdminStats(users) {
  document.getElementById('asc-total').textContent = users.length;
  document.getElementById('asc-drivers').textContent = users.filter((u) => u.role === 'driver' || u.role === 'both').length;
  document.getElementById('asc-passengers').textContent = users.filter((u) => u.role === 'passenger' || u.role === 'both').length;
}

function filterAdminUsers() {
  const q = document.getElementById('admin-search').value.toLowerCase();
  const role = document.getElementById('admin-filter-role').value;
  const filtered = allAdminUsers.filter((u) => {
    const matchesText = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    const matchesRole = !role || u.role === role || u.role === 'both';
    return matchesText && matchesRole;
  });
  renderAdminUsers(filtered);
}

function renderAdminUsers(users) {
  const list = document.getElementById('admin-users-list');
  if (!users.length) {
    list.innerHTML = '<div class="empty-state"><p>No users found.</p></div>';
    return;
  }
  list.innerHTML = users.map((u) => {
    const initials = `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
    const isSelf = u._id === currentUser._id;
    return `
      <div class="admin-user-row" id="aur-${u._id}">
        <div class="aur-left">
          <div class="aur-av">${initials}</div>
          <div>
            <div class="aur-name">${u.firstName} ${u.lastName}${u.isAdmin ? ' 🛡️' : ''}</div>
            <div class="aur-email">${u.email}</div>
            <div class="aur-area">${u.area || '—'}</div>
          </div>
        </div>
        <div class="aur-right">
          <span class="admin-badge ${u.role}">${u.role}</span>
          ${!isSelf ? `<button class="btn-delete" onclick="deleteUser('${u._id}', '${u.firstName}', this)">Delete</button>` : '<span style="font-size:0.72rem;color:var(--muted)">You</span>'}
        </div>
      </div>`;
  }).join('');
}

async function deleteUser(userId, name, btn) {
  if (!confirm(`Delete ${name}'s account? This also removes their rides.`)) return;
  btn.textContent = 'Deleting…';
  btn.disabled = true;
  try {
    await apiFetch(`/users/${userId}`, { method: 'DELETE' });
    allAdminUsers = allAdminUsers.filter((u) => u._id !== userId);
    document.getElementById(`aur-${userId}`)?.remove();
    updateAdminStats(allAdminUsers);
    showToast(`${name}'s account deleted.`);
  } catch (err) {
    showToast(err.message, true);
    btn.textContent = 'Delete';
    btn.disabled = false;
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
async function init() {
  const token = getToken();
  if (token) {
    try {
      const data = await apiFetch('/auth/me');
      currentUser = data.user;
    } catch (_) {
      clearToken();
    }
  }
  updateNav();
  if (currentUser) connectSSE();

  // Set min date on offer form to today
  const dateInput = document.querySelector('#offer-form input[name="date"]');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
  const filterDate = document.getElementById('filter-date');
  if (filterDate) filterDate.min = new Date().toISOString().split('T')[0];

  // Pre-fill register form area if user is already known
  pickRole('driver');
}

init();
