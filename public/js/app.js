// base URL for all API calls
const API = '/api';

// keep track of who's logged in and what role they picked on the register form
let CURRENTuser = null;
let SELECTEDrole = 'driver';

// JWT token helpers — stored in localStorage
const GETtoken = () => localStorage.getItem('carfun_token');
const SETtoken = (T) => localStorage.setItem('carfun_token', T);
const CLEARtoken = () => localStorage.removeItem('carfun_token');

const AUTHheaders = () => ({
  'Content-Type': 'application/json',
  ...(GETtoken() ? { Authorization: `Bearer ${GETtoken()}` } : {}),
});

// wrapper around fetch — throws if the server returns an error
async function APIFetch(PATH, OPTIONS = {}) {
  const RES = await fetch(`${API}${PATH}`, {
    headers: AUTHheaders(),
    ...OPTIONS,
  });
  const DATA = await RES.json();
  if (!RES.ok) throw new Error(DATA.message || 'Request failed');
  return DATA;
}

// switches between pages and triggers any data loading that page needs
function SHOWpage(NAME) {
  document.querySelectorAll('.page').forEach((P) => P.classList.remove('active'));
  const TARGET = document.getElementById(`page-${NAME}`);
  if (TARGET) TARGET.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (NAME === 'rides') LOADrides();
  if (NAME === 'dashboard') LOADdashboard();
  if (NAME === 'messages') {
    const BADGE = document.getElementById('msg-badge');
    if (BADGE) BADGE.style.display = 'none';
    LOADmessages();
  }
  if (NAME === 'admin') LOADadmin();
  if (NAME === 'offer' && !CURRENTuser) { SHOWpage('login'); return; }
  if (NAME === 'dashboard' && !CURRENTuser) { SHOWpage('login'); return; }
  if (NAME === 'messages' && !CURRENTuser) { SHOWpage('login'); return; }
  if (NAME === 'admin' && (!CURRENTuser || !CURRENTuser.isAdmin)) { SHOWpage('home'); return; }
}

// toast notification — red for errors, normal for success
let TOASTtimer;
function SHOWtoast(MSG, ISERRor = false) {
  const T = document.getElementById('toast');
  T.textContent = MSG;
  T.className = `toast show${ISERRor ? ' error' : ''}`;
  clearTimeout(TOASTtimer);
  TOASTtimer = setTimeout(() => T.classList.remove('show'), 3500);
}

// updates the nav depending on whether someone is logged in or not
function UPDATEnav() {
  const AUTHel = document.getElementById('nav-auth');
  const USERel = document.getElementById('nav-user');
  const OFFERnav = document.getElementById('nav-offer');
  const DASHnav = document.getElementById('nav-dashboard');
  const MSGSnav = document.getElementById('nav-messages');
  const ADMINnav = document.getElementById('nav-admin');

  if (CURRENTuser) {
    AUTHel.style.display = 'none';
    USERel.style.display = 'flex';
    document.getElementById('chip-avatar').textContent =
      `${CURRENTuser.firstName[0]}${CURRENTuser.lastName[0]}`.toUpperCase();
    document.getElementById('chip-name').textContent = CURRENTuser.firstName;

    if (CURRENTuser.role === 'driver' || CURRENTuser.role === 'both') {
      OFFERnav.style.display = '';
    }
    DASHnav.style.display = '';
    MSGSnav.style.display = '';
    ADMINnav.style.display = CURRENTuser.isAdmin ? '' : 'none';

    FETCHusercount();
  } else {
    AUTHel.style.display = 'flex';
    USERel.style.display = 'none';
    OFFERnav.style.display = 'none';
    DASHnav.style.display = 'none';
    MSGSnav.style.display = 'none';
    ADMINnav.style.display = 'none';
  }
}

async function FETCHusercount() {
  try {
    // dhovie swap this out for a real /stats endpoint when you get a chance -Danish
    const EL = document.getElementById('stat-users');
    if (EL) EL.textContent = '340+';
  } catch (_) {}
}

// handles the login form submit
async function SUBMITlogin(E) {
  E.preventDefault();
  const BTN = document.getElementById('login-btn');
  const ERRel = document.getElementById('login-error');
  const FORM = E.target;

  BTN.textContent = 'Logging in…';
  BTN.disabled = true;
  ERRel.style.display = 'none';

  try {
    const DATA = await APIFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: FORM.email.value,
        password: FORM.password.value,
      }),
    });

    SETtoken(DATA.token);
    CURRENTuser = DATA.user;
    UPDATEnav();
    CONNECTsse();
    SHOWtoast(`Welcome back, ${CURRENTuser.firstName}!`);
    SHOWpage('rides');
    FORM.reset();
  } catch (ERR) {
    ERRel.textContent = ERR.message;
    ERRel.style.display = 'block';
  } finally {
    BTN.textContent = 'Login →';
    BTN.disabled = false;
  }
}

// toggles which role is selected on the register form
function PICKrole(ROLE) {
  SELECTEDrole = ROLE;
  document.getElementById('role-driver').classList.toggle('active', ROLE === 'driver');
  document.getElementById('role-passenger').classList.toggle('active', ROLE === 'passenger');
  document.getElementById('car-fields').style.display = ROLE === 'driver' ? '' : 'none';
}

function TOGGLEday(BTN) {
  BTN.classList.toggle('active');
}

// handles the register form submit
async function SUBMITregister(E) {
  E.preventDefault();
  const BTN = document.getElementById('reg-btn');
  const ERRel = document.getElementById('form-error');
  const FORM = E.target;

  // basic password match check before hitting the server
  if (FORM.password.value !== FORM.confirmPassword.value) {
    ERRel.textContent = 'Passwords do not match';
    ERRel.style.display = 'block';
    return;
  }
  // grab whichever commute days are toggled on
  const COMMUTEdays = [...document.querySelectorAll('.day-btn.active')].map((B) => B.textContent);

  BTN.textContent = 'Creating profile…';
  BTN.disabled = true;
  ERRel.style.display = 'none';

  const BODY = {
    firstName: FORM.firstName.value,
    lastName: FORM.lastName.value,
    email: FORM.email.value,
    password: FORM.password.value,
    role: SELECTEDrole,
    area: FORM.area.value,
    commuteDays: COMMUTEdays,
    departureTime: FORM.departureTime.value,
    returnTime: FORM.returnTime.value,
  };

  if (SELECTEDrole === 'driver') {
    BODY.carRegistration = FORM.carRegistration?.value || '';
    BODY.carModel = FORM.carModel?.value || '';
    BODY.seatsAvailable = parseInt(FORM.seatsAvailable?.value) || 2;
  }

  try {
    const DATA = await APIFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(BODY),
    });

    SETtoken(DATA.token);
    CURRENTuser = DATA.user;
    UPDATEnav();
    CONNECTsse();
    SHOWtoast(`Welcome to CarFun, ${CURRENTuser.firstName}!`);
    SHOWpage('rides');
    FORM.reset();
  } catch (ERR) {
    ERRel.textContent = ERR.message;
    ERRel.style.display = 'block';
  } finally {
    BTN.textContent = 'Create Profile →';
    BTN.disabled = false;
  }
}

// logs the user out and wipes local state
function LOGOUT() {
  DISCONNECTsse();
  CLEARtoken();
  CURRENTuser = null;
  ACTIVEconvoid = null;
  UPDATEnav();
  SHOWpage('home');
  SHOWtoast('Logged out successfully');
}

// loads the rides list, applying any active filters
// dhovie add pagination here when there are more rides — the grid is gonna get huge -Danish
async function LOADrides() {
  const GRID = document.getElementById('rides-grid');
  if (!GRID) return;

  GRID.innerHTML = '<div class="loading-state">Loading rides…</div>';

  const AREA = document.getElementById('filter-area')?.value || '';
  const DATE = document.getElementById('filter-date')?.value || '';

  const PARAMS = new URLSearchParams();
  if (AREA) PARAMS.set('area', AREA);
  if (DATE) PARAMS.set('date', DATE);

  try {
    const DATA = await APIFetch(`/rides?${PARAMS}`);
    RENDERrides(DATA.rides);
  } catch (ERR) {
    GRID.innerHTML = `<div class="empty-state"><div class="big">⚠️</div><p>${ERR.message}</p></div>`;
  }
}

function CLEARfilters() {
  const AREAel = document.getElementById('filter-area');
  const DATEel = document.getElementById('filter-date');
  if (AREAel) AREAel.value = '';
  if (DATEel) DATEel.value = '';
  LOADrides();
}

function RENDERrides(RIDES) {
  const GRID = document.getElementById('rides-grid');
  if (!RIDES || RIDES.length === 0) {
    GRID.innerHTML = `
      <div class="empty-state">
        <div class="big">🚗</div>
        <p>No rides available right now — check back soon or offer one!</p>
        ${CURRENTuser && (CURRENTuser.role === 'driver' || CURRENTuser.role === 'both')
          ? '<button class="btn-primary" onclick="SHOWpage(\'offer\')">Post a ride</button>'
          : '<button class="btn-secondary" onclick="SHOWpage(\'register\')">Join to get notified</button>'}
      </div>`;
    return;
  }

  // rotate through these colors for the driver avatar chips
  const AVcolors = [
    { bg: 'rgba(200,240,58,0.18)', color: '#C8F03A' },
    { bg: 'rgba(74,144,217,0.18)', color: '#7ab8f5' },
    { bg: 'rgba(255,107,53,0.18)', color: '#ff9a74' },
    { bg: 'rgba(76,175,80,0.18)', color: '#81c784' },
    { bg: 'rgba(255,193,7,0.18)', color: '#ffd54f' },
  ];

  GRID.innerHTML = RIDES.map((RIDE, I) => {
    const DRIVER = RIDE.driver || {};
    const INITIALS = DRIVER.firstName
      ? `${DRIVER.firstName[0]}${DRIVER.lastName[0]}`.toUpperCase()
      : '??';
    const RATING = DRIVER.rating ? `★ ${DRIVER.rating}` : 'New';
    const COL = AVcolors[I % AVcolors.length];
    const SEATSleft = RIDE.seatsTotal - RIDE.seatsBooked;
    const ISfull = SEATSleft <= 0;
    const RIDEdate = RIDE.date ? new Date(RIDE.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
    const ISMyride = CURRENTuser && DRIVER._id === CURRENTuser._id;

    return `
      <div class="ride-card">
        <div class="rc-top">
          <div class="rc-driver">
            <div class="rc-av" style="background:${COL.bg};color:${COL.color};border:1px solid ${COL.color}33">${INITIALS}</div>
            <div><div class="rc-name">${DRIVER.firstName || 'Driver'} ${DRIVER.lastName?.[0] || ''}.</div><div class="rc-rating">${RATING}</div></div>
          </div>
          <span class="${ISfull ? 'full-pill' : 'seats-pill'}">${ISfull ? 'Full' : `${SEATSleft} seat${SEATSleft !== 1 ? 's' : ''}`}</span>
        </div>
        <div class="rc-route">
          <div class="rc-from"><div class="rdot from"></div>${RIDE.fromArea}</div>
          <div class="rc-divider"></div>
          <div class="rc-to"><div class="rdot to"></div>${RIDE.toAddress || 'BathSpa Academic Centre RAK'}</div>
        </div>
        <div class="rc-meta">
          <span class="rc-chip">🕐 ${RIDE.departureTime}</span>
          <span class="rc-chip">📅 ${RIDEdate}</span>
          ${RIDE.costContribution > 0 ? `<span class="rc-chip">💰 AED ${RIDE.costContribution}/person</span>` : '<span class="rc-chip">🆓 Free</span>'}
        </div>
        <button
          class="rc-btn"
          onclick="REQUESTride('${RIDE._id}', this)"
          ${ISfull || ISMyride ? 'disabled' : ''}
        >${ISMyride ? 'Your ride' : ISfull ? 'Ride full' : 'Request this ride'}</button>
      </div>`;
  }).join('');
}

// sends a ride request — prompts login if they're not logged in
async function REQUESTride(RIDEid, BTN) {
  if (!CURRENTuser) {
    SHOWtoast('Please login first to request a ride', true);
    SHOWpage('login');
    return;
  }

  BTN.textContent = 'Sending…';
  BTN.disabled = true;

  try {
    await APIFetch(`/rides/${RIDEid}/request`, { method: 'POST' });
    BTN.textContent = 'Request sent ✓';
    SHOWtoast('Ride request sent to the driver!');
  } catch (ERR) {
    BTN.textContent = 'Request this ride';
    BTN.disabled = false;
    SHOWtoast(ERR.message, true);
  }
}

// posts a new ride offer
async function SUBMIToffer(E) {
  E.preventDefault();
  const FORM = E.target;
  const BTN = FORM.querySelector('button[type="submit"]');

  BTN.textContent = 'Posting…';
  BTN.disabled = true;

  const BODY = {
    fromArea: FORM.fromArea.value,
    fromAddress: FORM.fromAddress.value,
    date: FORM.date.value,
    departureTime: FORM.departureTime.value,
    returnTime: FORM.returnTime.value,
    seatsTotal: parseInt(FORM.seatsTotal.value),
    costContribution: parseFloat(FORM.costContribution.value) || 0,
    notes: FORM.notes.value,
  };

  try {
    await APIFetch('/rides', { method: 'POST', body: JSON.stringify(BODY) });
    SHOWtoast('Ride posted! Students can now request it.');
    FORM.reset();
    SHOWpage('rides');
  } catch (ERR) {
    SHOWtoast(ERR.message, true);
  } finally {
    BTN.textContent = 'Post Ride →';
    BTN.disabled = false;
  }
}

// loads dashboard data for both driver and passenger views
async function LOADdashboard() {
  if (!CURRENTuser) return;
  try {
    const DATA = await APIFetch('/users/my-rides');
    RENDERdashdriver(DATA.driverRides);
    RENDERdashpassenger(DATA.passengerRides);
  } catch (ERR) {
    SHOWtoast(ERR.message, true);
  }
}

function SWITCHdashtab(TAB, BTN) {
  document.querySelectorAll('.dash-tab').forEach((T) => T.classList.remove('active'));
  BTN.classList.add('active');
  document.getElementById('dash-driving').style.display = TAB === 'driving' ? '' : 'none';
  document.getElementById('dash-passenger').style.display = TAB === 'passenger' ? '' : 'none';
}

function RENDERdashdriver(RIDES) {
  const EL = document.getElementById('dash-driving');
  if (!RIDES || RIDES.length === 0) {
    EL.innerHTML = `<div class="empty-state"><div class="big">🚗</div><p>You haven't offered any rides yet.</p><button class="btn-primary" onclick="SHOWpage('offer')">Post a ride</button></div>`;
    return;
  }

  EL.innerHTML = RIDES.map((RIDE) => {
    const RIDEdate = RIDE.date ? new Date(RIDE.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
    const PENDING = (RIDE.requests || []).filter((R) => R.status === 'pending');

    return `
      <div class="dash-ride">
        <div>
          <div class="dash-route">${RIDE.fromArea} → BathSpa Academic Centre RAK</div>
          <div class="dash-meta">${RIDEdate} at ${RIDE.departureTime} · ${RIDE.seatsTotal - RIDE.seatsBooked} seats left</div>
          ${PENDING.length > 0 ? `
            <div class="requests-list">
              ${PENDING.map((R) => `
                <div class="req-row">
                  <span>${R.passenger?.firstName || 'Student'} ${R.passenger?.lastName?.[0] || ''}. from ${R.passenger?.area || '—'}</span>
                  <div class="req-actions">
                    <button class="btn-accept" onclick="HANDLErequest('${RIDE._id}','${R._id}','accepted', this)">Accept</button>
                    <button class="btn-reject" onclick="HANDLErequest('${RIDE._id}','${R._id}','rejected', this)">Decline</button>
                  </div>
                </div>`).join('')}
              ${(RIDE.requests || []).filter(R => R.status === 'accepted' && R.pickupLocation?.lat != null).map((R) => `
                <div class="req-row">
                  <span>📍 ${R.passenger?.firstName || 'Passenger'} ${R.passenger?.lastName?.[0] || ''}. has set a pickup pin</span>
                  <button class="btn-pin" onclick="OPENviewpickupmap('${R.passenger?.firstName || 'Passenger'}',${R.pickupLocation.lat},${R.pickupLocation.lng})">View Pin</button>
                </div>`).join('')}
            </div>` : `
            ${(RIDE.requests || []).filter(R => R.status === 'accepted' && R.pickupLocation?.lat != null).length > 0 ? `
            <div class="requests-list">
              ${(RIDE.requests || []).filter(R => R.status === 'accepted' && R.pickupLocation?.lat != null).map((R) => `
                <div class="req-row">
                  <span>📍 ${R.passenger?.firstName || 'Passenger'} ${R.passenger?.lastName?.[0] || ''}. has set a pickup pin</span>
                  <button class="btn-pin" onclick="OPENviewpickupmap('${R.passenger?.firstName || 'Passenger'}',${R.pickupLocation.lat},${R.pickupLocation.lng})">View Pin</button>
                </div>`).join('')}
            </div>` : ''}`}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem">
          <span class="status-pill status-${RIDE.status}">${RIDE.status}</span>
          ${RIDE.status === 'active' || RIDE.status === 'full' ? `
            <button class="btn-complete" onclick="MARKridecompleted('${RIDE._id}', this)">Mark as Completed</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function RENDERdashpassenger(RIDES) {
  const EL = document.getElementById('dash-passenger');
  if (!RIDES || RIDES.length === 0) {
    EL.innerHTML = `<div class="empty-state"><div class="big">🎒</div><p>You haven't requested any rides yet.</p><button class="btn-primary" onclick="SHOWpage('rides')">Find rides</button></div>`;
    return;
  }

  EL.innerHTML = RIDES.map((RIDE) => {
    const RIDEdate = RIDE.date ? new Date(RIDE.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
    const MYrequest = (RIDE.requests || []).find(
      (R) => R.passenger?.toString() === CURRENTuser._id || R.passenger?._id === CURRENTuser._id
    );

    const ISaccepted = MYrequest?.status === 'accepted';
    const HASpin = ISaccepted && MYrequest?.pickupLocation?.lat != null;

    return `
      <div class="dash-ride">
        <div>
          <div class="dash-route">${RIDE.fromArea} → BathSpa Academic Centre RAK</div>
          <div class="dash-meta">Driver: ${RIDE.driver?.firstName || 'Unknown'} · ${RIDEdate} at ${RIDE.departureTime}</div>
          ${ISaccepted ? `<div style="margin-top:0.5rem">
            <button class="btn-pin" onclick="OPENsetpickupmap('${RIDE._id}','${MYrequest._id}',${HASpin ? MYrequest.pickupLocation.lat : 'null'},${HASpin ? MYrequest.pickupLocation.lng : 'null'})">
              📍 ${HASpin ? 'Update Pickup Pin' : 'Set Pickup Pin'}
            </button>
          </div>` : ''}
        </div>
        <span class="status-pill status-${MYrequest?.status || 'pending'}">${MYrequest?.status || 'pending'}</span>
      </div>`;
  }).join('');
}

async function HANDLErequest(RIDEid, REQUESTid, STATUS, BTN) {
  BTN.disabled = true;
  try {
    await APIFetch(`/rides/${RIDEid}/request/${REQUESTid}`, {
      method: 'PUT',
      body: JSON.stringify({ status: STATUS }),
    });
    SHOWtoast(`Request ${STATUS === 'accepted' ? 'accepted ✓' : 'declined'}`);
    LOADdashboard();
  } catch (ERR) {
    SHOWtoast(ERR.message, true);
    BTN.disabled = false;
  }
}

async function MARKridecompleted(RIDEid, BTN) {
  if (!confirm('Mark this ride as completed? This cannot be undone.')) return;
  BTN.textContent = 'Saving…';
  BTN.disabled = true;
  try {
    await APIFetch(`/rides/${RIDEid}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' }),
    });
    SHOWtoast('Ride marked as completed ✓');
    LOADdashboard();
  } catch (ERR) {
    SHOWtoast(ERR.message, true);
    BTN.textContent = 'Mark as Completed';
    BTN.disabled = false;
  }
}

// map stuff — RAK city center as the default starting view
const RAKcenter = [25.7889, 55.9432];
let LEAFLETmap = null;
let PICKUPmarker = null;
let MAPcontext = null; // { rideId, requestId }

function OPENsetpickupmap(RIDEid, REQUESTid, EXISTINGlat, EXISTINGlng) {
  MAPcontext = { rideId: RIDEid, requestId: REQUESTid };
  document.getElementById('map-modal-title').textContent = 'Set Your Pickup Location';
  document.getElementById('map-modal-sub').textContent = 'Tap the map to drop your pin — only your driver can see this';
  document.getElementById('map-modal-footer').style.display = 'flex';
  document.getElementById('map-save-btn').disabled = true;
  document.getElementById('map-coords').textContent = 'No pin placed yet';
  document.getElementById('map-modal').style.display = 'flex';
  INITmap('set', EXISTINGlat, EXISTINGlng);
}

function OPENviewpickupmap(PASSENGERname, LAT, LNG) {
  MAPcontext = null;
  document.getElementById('map-modal-title').textContent = `${PASSENGERname}'s Pickup Pin`;
  document.getElementById('map-modal-sub').textContent = 'Passenger-set pickup location';
  document.getElementById('map-modal-footer').style.display = 'none';
  document.getElementById('map-modal').style.display = 'flex';
  INITmap('view', LAT, LNG, PASSENGERname);
}

function INITmap(MODE, LAT, LNG, LABEL) {
  setTimeout(() => {
    if (LEAFLETmap) { LEAFLETmap.remove(); LEAFLETmap = null; PICKUPmarker = null; }

    const HASlocation = LAT != null && LNG != null;
    const CENTER = HASlocation ? [LAT, LNG] : RAKcenter;
    const ZOOM = HASlocation ? 15 : 12;

    LEAFLETmap = L.map('map-container').setView(CENTER, ZOOM);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(LEAFLETmap);
    LEAFLETmap.invalidateSize();

    if (HASlocation) {
      PICKUPmarker = L.marker([LAT, LNG]).addTo(LEAFLETmap);
      if (MODE === 'view') PICKUPmarker.bindPopup(LABEL || 'Pickup').openPopup();
      if (MODE === 'set') {
        document.getElementById('map-coords').textContent = `${LAT.toFixed(5)}, ${LNG.toFixed(5)}`;
        document.getElementById('map-save-btn').disabled = false;
      }
    }

    if (MODE === 'set') {
      LEAFLETmap.on('click', (E) => {
        const { lat: CLICKlat, lng: CLICKlng } = E.latlng;
        if (PICKUPmarker) {
          PICKUPmarker.setLatLng([CLICKlat, CLICKlng]);
        } else {
          PICKUPmarker = L.marker([CLICKlat, CLICKlng]).addTo(LEAFLETmap);
        }
        document.getElementById('map-coords').textContent = `${CLICKlat.toFixed(5)}, ${CLICKlng.toFixed(5)}`;
        document.getElementById('map-save-btn').disabled = false;
      });
    }
  }, 80);
}

function CLOSEmapmodal() {
  document.getElementById('map-modal').style.display = 'none';
  if (LEAFLETmap) { LEAFLETmap.remove(); LEAFLETmap = null; PICKUPmarker = null; }
  MAPcontext = null;
}

function HANDLEmapoverlayclick(E) {
  if (E.target === document.getElementById('map-modal')) CLOSEmapmodal();
}

async function SAVEpickuplocation() {
  if (!MAPcontext || !PICKUPmarker) return;
  const { lat: LAT, lng: LNG } = PICKUPmarker.getLatLng();
  const BTN = document.getElementById('map-save-btn');
  BTN.textContent = 'Saving…';
  BTN.disabled = true;
  try {
    await APIFetch(`/rides/${MAPcontext.rideId}/request/${MAPcontext.requestId}/location`, {
      method: 'PUT',
      body: JSON.stringify({ lat: LAT, lng: LNG }),
    });
    SHOWtoast('Pickup pin saved! Your driver can now see it.');
    CLOSEmapmodal();
    LOADdashboard();
  } catch (ERR) {
    SHOWtoast(ERR.message, true);
    BTN.textContent = 'Save Location';
    BTN.disabled = false;
  }
}

// SSE connection for real-time updates
// dhovie add a reconnect counter so we don't spam the server if it keeps dropping -Danish
let EVENTsource = null;

function CONNECTsse() {
  if (EVENTsource) EVENTsource.close();
  const TOKEN = GETtoken();
  if (!TOKEN) return;

  EVENTsource = new EventSource(`/api/events?token=${TOKEN}`);

  EVENTsource.addEventListener('ride-accepted', (E) => {
    const { message: MESSAGE } = JSON.parse(E.data);
    SHOWtoast(MESSAGE);
    document.getElementById('nav-messages').style.display = '';
    if (document.getElementById('page-dashboard')?.classList.contains('active')) LOADdashboard();
    if (document.getElementById('page-messages')?.classList.contains('active')) LOADmessages();
  });

  EVENTsource.addEventListener('ride-rejected', (E) => {
    const { message: MESSAGE } = JSON.parse(E.data);
    SHOWtoast(MESSAGE, true);
    if (document.getElementById('page-dashboard')?.classList.contains('active')) LOADdashboard();
  });

  EVENTsource.addEventListener('pickup-pin-updated', (E) => {
    const { passengerName: PASSENGERname } = JSON.parse(E.data);
    SHOWtoast(`${PASSENGERname} has pinned their pickup location`);
    if (document.getElementById('page-dashboard')?.classList.contains('active')) LOADdashboard();
  });

  EVENTsource.addEventListener('conversation-created', () => {
    document.getElementById('nav-messages').style.display = '';
    if (document.getElementById('page-messages')?.classList.contains('active')) LOADmessages();
  });

  EVENTsource.addEventListener('new-message', (E) => {
    const { convoId: CONVOid } = JSON.parse(E.data);
    if (document.getElementById('page-messages')?.classList.contains('active')) {
      if (ACTIVEconvoid === CONVOid) {
        FETCHandrenderchat(CONVOid, true);
      } else {
        LOADmessages();
      }
    } else {
      const BADGE = document.getElementById('msg-badge');
      if (BADGE) { BADGE.style.display = ''; BADGE.textContent = '●'; }
    }
  });

  EVENTsource.onerror = () => {
    EVENTsource.close();
    setTimeout(CONNECTsse, 5000);
  };
}

function DISCONNECTsse() {
  if (EVENTsource) { EVENTsource.close(); EVENTsource = null; }
}

// messages / conversations
let ACTIVEconvoid = null;

async function LOADmessages() {
  if (!CURRENTuser) return;
  const LIST = document.getElementById('convo-list');
  LIST.innerHTML = '<div class="loading-state">Loading…</div>';
  try {
    const DATA = await APIFetch('/messages');
    RENDERconvolist(DATA.conversations);
  } catch (ERR) {
    LIST.innerHTML = `<div class="empty-state"><p>${ERR.message}</p></div>`;
  }
}

function RENDERconvolist(CONVOS) {
  const LIST = document.getElementById('convo-list');
  if (!CONVOS.length) {
    LIST.innerHTML = '<div class="empty-state" style="padding:2rem;text-align:center;color:var(--muted);font-size:0.85rem;">No accepted rides yet.<br>Conversations appear here once a driver accepts your request.</div>';
    return;
  }
  LIST.innerHTML = CONVOS.map((C) => {
    const OTHER = CURRENTuser._id === C.driver._id ? C.passenger : C.driver;
    const LAST = C.messages.length ? C.messages[C.messages.length - 1] : null;
    const RIDEdate = C.ride?.date ? new Date(C.ride.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
    return `
      <div class="convo-item${ACTIVEconvoid === C._id ? ' active' : ''}" onclick="OPENconvo('${C._id}', this)">
        <div class="convo-name">${OTHER.firstName} ${OTHER.lastName}</div>
        <div class="convo-route">${C.ride?.fromArea || ''} → Campus · ${RIDEdate}</div>
        <div class="convo-preview">${LAST ? LAST.text : 'No messages yet'}</div>
      </div>`;
  }).join('');
}

async function OPENconvo(CONVOid, EL) {
  document.querySelectorAll('.convo-item').forEach((I) => I.classList.remove('active'));
  EL.classList.add('active');
  ACTIVEconvoid = CONVOid;

  const MAIN = document.getElementById('chat-main');
  MAIN.innerHTML = '<div class="chat-empty-state"><div class="loading-state">Loading…</div></div>';

  await FETCHandrenderchat(CONVOid);
}

async function FETCHandrenderchat(CONVOid, SILENT = false) {
  try {
    const DATA = await APIFetch(`/messages/${CONVOid}`);
    RENDERchat(DATA.conversation, SILENT);
  } catch (ERR) {
    if (!SILENT) SHOWtoast(ERR.message, true);
  }
}

function RENDERchat(CONVO, SILENT = false) {
  const MAIN = document.getElementById('chat-main');
  const OTHER = CURRENTuser._id === CONVO.driver._id ? CONVO.passenger : CONVO.driver;
  const RIDEdate = CONVO.ride?.date ? new Date(CONVO.ride.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  const WASatbottom = MAIN.scrollTop + MAIN.clientHeight >= MAIN.scrollHeight - 40;

  MAIN.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-name">${OTHER.firstName} ${OTHER.lastName}</div>
      <div class="chat-header-route">${CONVO.ride?.fromArea || ''} → BathSpa Academic Centre RAK · ${RIDEdate} at ${CONVO.ride?.departureTime || ''}</div>
    </div>
    <div class="chat-messages" id="chat-msgs">
      ${CONVO.messages.length === 0
        ? '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding-top:2rem;">No messages yet — say hello!</div>'
        : CONVO.messages.map((M) => {
            const MINE = M.sender === CURRENTuser._id || M.sender?._id === CURRENTuser._id;
            const TIME = new Date(M.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return `
              <div style="display:flex;flex-direction:column;align-items:${MINE ? 'flex-end' : 'flex-start'}">
                <div class="msg-bubble ${MINE ? 'mine' : 'theirs'}">${M.text}</div>
                <div class="msg-time" style="align-self:${MINE ? 'flex-end' : 'flex-start'}">${TIME}</div>
              </div>`;
          }).join('')}
    </div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="Type a message…" onkeydown="if(event.key==='Enter')SENDmessage('${CONVO._id}')" />
      <button class="chat-send-btn" id="chat-send-btn" onclick="SENDmessage('${CONVO._id}')">Send</button>
    </div>`;

  if (!SILENT || WASatbottom) {
    const MSGS = document.getElementById('chat-msgs');
    if (MSGS) MSGS.scrollTop = MSGS.scrollHeight;
  }
}

async function SENDmessage(CONVOid) {
  const INPUT = document.getElementById('chat-input');
  const BTN = document.getElementById('chat-send-btn');
  const TEXT = INPUT?.value?.trim();
  if (!TEXT) return;

  INPUT.value = '';
  BTN.disabled = true;

  try {
    await APIFetch(`/messages/${CONVOid}`, { method: 'POST', body: JSON.stringify({ text: TEXT }) });
    await FETCHandrenderchat(CONVOid);
  } catch (ERR) {
    SHOWtoast(ERR.message, true);
    if (INPUT) INPUT.value = TEXT;
  } finally {
    if (BTN) BTN.disabled = false;
    if (INPUT) INPUT.focus();
  }
}

// admin panel
let ALLadminusers = [];

async function LOADadmin() {
  if (!CURRENTuser || !CURRENTuser.isAdmin) return;
  const LIST = document.getElementById('admin-users-list');
  LIST.innerHTML = '<div class="loading-state">Loading users…</div>';
  try {
    const DATA = await APIFetch('/users/all');
    ALLadminusers = DATA.users;
    UPDATEadminstats(DATA.users);
    RENDERadminusers(DATA.users);
  } catch (ERR) {
    LIST.innerHTML = `<div class="empty-state"><p>${ERR.message}</p></div>`;
  }
}

function UPDATEadminstats(USERS) {
  document.getElementById('asc-total').textContent = USERS.length;
  document.getElementById('asc-drivers').textContent = USERS.filter((U) => U.role === 'driver' || U.role === 'both').length;
  document.getElementById('asc-passengers').textContent = USERS.filter((U) => U.role === 'passenger' || U.role === 'both').length;
}

function FILTERadminusers() {
  const Q = document.getElementById('admin-search').value.toLowerCase();
  const ROLE = document.getElementById('admin-filter-role').value;
  const FILTERED = ALLadminusers.filter((U) => {
    const MATCHEStext = `${U.firstName} ${U.lastName} ${U.email}`.toLowerCase().includes(Q);
    const MATCHESrole = !ROLE || U.role === ROLE || U.role === 'both';
    return MATCHEStext && MATCHESrole;
  });
  RENDERadminusers(FILTERED);
}

function RENDERadminusers(USERS) {
  const LIST = document.getElementById('admin-users-list');
  if (!USERS.length) {
    LIST.innerHTML = '<div class="empty-state"><p>No users found.</p></div>';
    return;
  }
  LIST.innerHTML = USERS.map((U) => {
    const INITIALS = `${U.firstName[0]}${U.lastName[0]}`.toUpperCase();
    const ISself = U._id === CURRENTuser._id;
    return `
      <div class="admin-user-row" id="aur-${U._id}">
        <div class="aur-left">
          <div class="aur-av">${INITIALS}</div>
          <div>
            <div class="aur-name">${U.firstName} ${U.lastName}${U.isAdmin ? ' 🛡️' : ''}</div>
            <div class="aur-email">${U.email}</div>
            <div class="aur-area">${U.area || '—'}</div>
          </div>
        </div>
        <div class="aur-right">
          <span class="admin-badge ${U.role}">${U.role}</span>
          ${!ISself ? `<button class="btn-delete" onclick="DELETEuser('${U._id}', '${U.firstName}', this)">Delete</button>` : '<span style="font-size:0.72rem;color:var(--muted)">You</span>'}
        </div>
      </div>`;
  }).join('');
}

async function DELETEuser(USERid, NAME, BTN) {
  if (!confirm(`Delete ${NAME}'s account? This also removes their rides.`)) return;
  BTN.textContent = 'Deleting…';
  BTN.disabled = true;
  try {
    await APIFetch(`/users/${USERid}`, { method: 'DELETE' });
    ALLadminusers = ALLadminusers.filter((U) => U._id !== USERid);
    document.getElementById(`aur-${USERid}`)?.remove();
    UPDATEadminstats(ALLadminusers);
    SHOWtoast(`${NAME}'s account deleted.`);
  } catch (ERR) {
    SHOWtoast(ERR.message, true);
    BTN.textContent = 'Delete';
    BTN.disabled = false;
  }
}

// runs on page load — checks if there's already a token and restores the session
async function INIT() {
  const TOKEN = GETtoken();
  if (TOKEN) {
    try {
      const DATA = await APIFetch('/auth/me');
      CURRENTuser = DATA.user;
    } catch (_) {
      CLEARtoken();
    }
  }
  UPDATEnav();
  if (CURRENTuser) CONNECTsse();

  // set min date on the offer form so past dates can't be picked
  const DATEinput = document.querySelector('#offer-form input[name="date"]');
  if (DATEinput) DATEinput.min = new Date().toISOString().split('T')[0];
  const FILTERdate = document.getElementById('filter-date');
  if (FILTERdate) FILTERdate.min = new Date().toISOString().split('T')[0];

  PICKrole('driver');
}

INIT();

// Aliases so HTML onclick attributes (camelCase) resolve to the actual functions above
const showPage         = SHOWpage;
const logout           = LOGOUT;
const loadRides        = LOADrides;
const clearFilters     = CLEARfilters;
const submitOffer      = SUBMIToffer;
const switchDashTab    = SWITCHdashtab;
const submitRegister   = SUBMITregister;
const pickRole         = PICKrole;
const toggleDay        = TOGGLEday;
const submitLogin      = SUBMITlogin;
const handleMapOverlayClick = HANDLEmapoverlayclick;
const closeMapModal    = CLOSEmapmodal;
const savePickupLocation = SAVEpickuplocation;
const filterAdminUsers = FILTERadminusers;

function toggleNotifPanel() {
  const P = document.getElementById('notif-panel');
  if (P) P.style.display = P.style.display === 'none' ? 'block' : 'none';
}

function clearNotifs() {
  const LIST = document.getElementById('notif-list');
  if (LIST) LIST.innerHTML = '<div class="notif-empty">No notifications yet</div>';
  const BADGE = document.getElementById('notif-badge');
  if (BADGE) BADGE.style.display = 'none';
  const P = document.getElementById('notif-panel');
  if (P) P.style.display = 'none';
}

function handlePhotoSelect(INPUT) {
  if (!INPUT.files || !INPUT.files[0]) return;
  const READER = new FileReader();
  READER.onload = (E) => {
    const AV = document.getElementById('profile-photo-av');
    if (AV) { AV.style.backgroundImage = `url(${E.target.result})`; AV.textContent = ''; }
  };
  READER.readAsDataURL(INPUT.files[0]);
}
