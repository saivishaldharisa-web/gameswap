// GameSwap demo: everything is stored in localStorage (this browser only).
// Swap the `db` helpers for real API calls when you add the Node.js backend.

const KEYS = { users: 'gs_users', listings: 'gs_listings', requests: 'gs_requests', session: 'gs_session' };

const db = {
    get(key) { return JSON.parse(localStorage.getItem(key) || '[]'); },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Demo-only hashing so plain passwords never sit in localStorage.
async function hash(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function esc(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- seed data ----------
async function seed() {
    if (localStorage.getItem('gs_seeded')) return;
    const demoUsers = [
        { id: 'u1', name: 'Arjun', email: 'arjun@demo.com', city: 'Bengaluru' },
        { id: 'u2', name: 'Meera', email: 'meera@demo.com', city: 'Hyderabad' },
        { id: 'u3', name: 'Rohan', email: 'rohan@demo.com', city: 'Bengaluru' },
    ];
    // demo password for every seeded user: demo123
    const h = await hash('demo123');
    db.set(KEYS.users, demoUsers.map(u => ({ ...u, password: h })));
    db.set(KEYS.listings, [
        { id: 'l1', ownerId: 'u1', title: 'Cyberpunk 2077', platform: 'PS5', condition: 'Like new',
          description: 'No scratches, box included.', wants: 'The Witcher 3 (PS5)', image: '', createdAt: 1 },
        { id: 'l2', ownerId: 'u2', title: 'Zelda: Tears of the Kingdom', platform: 'Nintendo Switch', condition: 'Good',
          description: 'Cartridge works great. Finished the main story.', wants: 'Super Mario Bros. Wonder', image: '', createdAt: 2 },
        { id: 'l3', ownerId: 'u3', title: 'Elden Ring', platform: 'Xbox Series X', condition: 'Good',
          description: 'Too hard for me, looking for something chill.', wants: 'Forza Horizon 5', image: '', createdAt: 3 },
        { id: 'l4', ownerId: 'u1', title: 'God of War Ragnarök', platform: 'PS5', condition: 'Like new',
          description: 'Played once, case and manual included.', wants: 'Uncharted: Legacy of Thieves Collection', image: '', createdAt: 4 },
    ]);
    db.set(KEYS.requests, []);
    localStorage.setItem('gs_seeded', '1');
}

// ---------- auth ----------
const currentUser = () => {
    const id = localStorage.getItem(KEYS.session);
    return db.get(KEYS.users).find(u => u.id === id) || null;
};
const userById = id => db.get(KEYS.users).find(u => u.id === id);

async function signup({ name, email, city, password }) {
    const users = db.get(KEYS.users);
    email = email.trim().toLowerCase();
    if (users.some(u => u.email === email)) throw new Error('An account with this email already exists.');
    const user = { id: uid(), name: name.trim(), email, city: city.trim(), password: await hash(password) };
    users.push(user);
    db.set(KEYS.users, users);
    localStorage.setItem(KEYS.session, user.id);
}

async function login({ email, password }) {
    const h = await hash(password);
    const user = db.get(KEYS.users).find(u => u.email === email.trim().toLowerCase() && u.password === h);
    if (!user) throw new Error('Wrong email or password.');
    localStorage.setItem(KEYS.session, user.id);
}

function logout() {
    localStorage.removeItem(KEYS.session);
    showView('browse');
    render();
    toast('Logged out.');
}

// ---------- UI helpers ----------
const $ = sel => document.querySelector(sel);
const modal = id => bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
let currentView = 'browse';

function toast(msg) {
    $('#toastBody').textContent = msg;
    bootstrap.Toast.getOrCreateInstance($('#toast'), { delay: 2500 }).show();
}

function requireLogin() {
    if (currentUser()) return true;
    modal('authModal').show();
    return false;
}

function platformBadge(p) {
    const cls = p.startsWith('PS') ? 'badge-ps' : p.startsWith('Xbox') ? 'badge-xbox' : 'badge-switch';
    return `<span class="badge ${cls}">${esc(p)}</span>`;
}

const COLORS = ['#f39c12', '#2ecc71', '#e74c3c', '#9b59b6', '#3498db', '#16a085'];
function coverHtml(l) {
    if (l.image) return `<div class="image-box p-0" style="background:#444"><img src="${esc(l.image)}" alt="${esc(l.title)} cover" onerror="this.style.display='none'"></div>`;
    const color = COLORS[[...l.title].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
    return `<div class="image-box" style="background:${color}">${esc(l.title)}</div>`;
}

function cardHtml(l, { mine = false } = {}) {
    const owner = userById(l.ownerId);
    const me = currentUser();
    let actions = '';
    if (mine) {
        actions = `<button class="btn btn-sm btn-outline-light me-2" data-edit="${l.id}">Edit</button>
                   <button class="btn btn-sm btn-outline-danger" data-delete="${l.id}">Delete</button>`;
    } else if (!me || me.id !== l.ownerId) {
        actions = `<button class="btn btn-sm btn-info fw-bold w-100" data-request="${l.id}">⇄ Request Swap</button>`;
    } else {
        actions = `<span class="text-secondary small">Your listing</span>`;
    }
    return `
    <div class="col-md-6 col-lg-4">
        <div class="card game-card">
            ${coverHtml(l)}
            <div class="card-body d-flex flex-column">
                <h4 class="card-title text-warning">${esc(l.title)}</h4>
                <div class="mb-2">${platformBadge(l.platform)} <span class="badge bg-secondary">${esc(l.condition)}</span></div>
                <p class="mb-2">${esc(l.description) || '<span class="text-secondary">No description.</span>'}</p>
                <div class="wants-box mb-3">
                    <span class="text-info fw-bold small">⇄ WANTS TO SWAP FOR</span>
                    <p class="m-0">${esc(l.wants)}</p>
                </div>
                <p class="small text-secondary mt-auto mb-2">👤 ${esc(owner?.name || 'Unknown')} · 📍 ${esc(owner?.city || '')}</p>
                <div>${actions}</div>
            </div>
        </div>
    </div>`;
}

// ---------- render ----------
function render() {
    const me = currentUser();
    document.querySelectorAll('.auth-only').forEach(el => el.classList.toggle('d-none', !me));
    document.querySelectorAll('.guest-only').forEach(el => el.classList.toggle('d-none', !!me));
    if (me) $('#userMenu').textContent = me.name;

    const listings = db.get(KEYS.listings).sort((a, b) => b.createdAt - a.createdAt);

    // browse
    const q = $('#searchInput').value.trim().toLowerCase();
    const plat = $('#platformFilter').value;
    const filtered = listings.filter(l => {
        const owner = userById(l.ownerId);
        const text = `${l.title} ${l.wants} ${owner?.city || ''}`.toLowerCase();
        return (!q || text.includes(q)) && (!plat || l.platform === plat);
    });
    $('#browseGrid').innerHTML = filtered.map(l => cardHtml(l)).join('');
    $('#browseEmpty').classList.toggle('d-none', filtered.length > 0);

    if (!me) return;

    // mine
    const mine = listings.filter(l => l.ownerId === me.id);
    $('#mineGrid').innerHTML = mine.map(l => cardHtml(l, { mine: true })).join('');
    $('#mineEmpty').classList.toggle('d-none', mine.length > 0);

    // requests
    const reqs = db.get(KEYS.requests);
    const byId = id => listings.find(l => l.id === id);
    const reqRow = (r, incoming) => {
        const target = byId(r.listingId), offer = byId(r.offerId);
        const other = userById(incoming ? r.fromId : target?.ownerId);
        const statusCls = { pending: 'bg-warning text-dark', accepted: 'bg-success', declined: 'bg-danger' }[r.status];
        const buttons = incoming && r.status === 'pending'
            ? `<button class="btn btn-sm btn-success me-2" data-accept="${r.id}">Accept</button>
               <button class="btn btn-sm btn-outline-danger" data-decline="${r.id}">Decline</button>` : '';
        const contact = r.status === 'accepted'
            ? `<p class="small text-info mb-0 mt-2">Contact ${esc(other?.name)} at ${esc(other?.email)} to arrange the swap.</p>` : '';
        return `<div class="req-card">
            <div class="d-flex flex-wrap align-items-center gap-2">
                <div class="me-auto">
                    <strong>${esc(other?.name || 'Someone')}</strong> ${incoming ? 'offers' : '— you offered'}
                    <span class="text-warning">${esc(offer?.title || 'a removed game')}</span>
                    for <span class="text-warning">${esc(target?.title || 'a removed game')}</span>
                </div>
                <span class="badge ${statusCls}">${r.status}</span>
                ${buttons}
            </div>
            ${r.message ? `<p class="small text-secondary mb-0 mt-2">“${esc(r.message)}”</p>` : ''}
            ${contact}
        </div>`;
    };
    const incoming = reqs.filter(r => byId(r.listingId)?.ownerId === me.id);
    const outgoing = reqs.filter(r => r.fromId === me.id);
    $('#reqIn').innerHTML = incoming.map(r => reqRow(r, true)).join('') || '<p class="text-secondary">No requests yet.</p>';
    $('#reqOut').innerHTML = outgoing.map(r => reqRow(r, false)).join('') || '<p class="text-secondary">You haven\'t sent any requests.</p>';
    const pending = incoming.filter(r => r.status === 'pending').length;
    $('#reqBadge').textContent = pending;
    $('#reqBadge').classList.toggle('d-none', pending === 0);
}

function showView(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('d-none'));
    $(`#view-${view}`).classList.remove('d-none');
    document.querySelectorAll('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === view && a.classList.contains('nav-link')));
}

// ---------- listing actions ----------
function openListForm(listing = null) {
    if (!requireLogin()) return;
    const f = $('#listForm');
    f.reset();
    f.elements.id.value = listing?.id || '';
    if (listing) ['title', 'platform', 'condition', 'description', 'wants', 'image'].forEach(k => f.elements[k].value = listing[k] || '');
    $('#listModalTitle').textContent = listing ? 'Edit Listing' : 'List a Game';
    modal('listModal').show();
}

function saveListing(e) {
    e.preventDefault();
    const f = e.target, me = currentUser();
    const data = Object.fromEntries(new FormData(f));
    const listings = db.get(KEYS.listings);
    if (data.id) {
        const l = listings.find(x => x.id === data.id && x.ownerId === me.id);
        if (l) Object.assign(l, data);
    } else {
        listings.push({ ...data, id: uid(), ownerId: me.id, createdAt: Date.now() });
    }
    db.set(KEYS.listings, listings);
    modal('listModal').hide();
    toast(data.id ? 'Listing updated.' : 'Game listed!');
    render();
}

function deleteListing(id) {
    if (!confirm('Delete this listing?')) return;
    db.set(KEYS.listings, db.get(KEYS.listings).filter(l => l.id !== id));
    db.set(KEYS.requests, db.get(KEYS.requests).filter(r => r.listingId !== id && r.offerId !== id));
    toast('Listing deleted.');
    render();
}

function openRequest(listingId) {
    if (!requireLogin()) return;
    const me = currentUser();
    const target = db.get(KEYS.listings).find(l => l.id === listingId);
    const mine = db.get(KEYS.listings).filter(l => l.ownerId === me.id);
    if (!mine.length) {
        toast('List a game first so you have something to offer.');
        openListForm();
        return;
    }
    const f = $('#reqForm');
    f.reset();
    f.elements.listingId.value = listingId;
    $('#reqTarget').innerHTML = `You want <strong class="text-warning">${esc(target.title)}</strong> (${esc(target.platform)}). They're after <em>${esc(target.wants)}</em>.`;
    f.elements.offerId.innerHTML = mine.map(l => `<option value="${l.id}">${esc(l.title)} (${esc(l.platform)})</option>`).join('');
    modal('reqModal').show();
}

function sendRequest(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const reqs = db.get(KEYS.requests);
    const me = currentUser();
    if (reqs.some(r => r.fromId === me.id && r.listingId === data.listingId && r.status === 'pending')) {
        toast('You already have a pending request for this game.');
        return;
    }
    reqs.push({ id: uid(), fromId: me.id, listingId: data.listingId, offerId: data.offerId,
                message: data.message.trim(), status: 'pending', createdAt: Date.now() });
    db.set(KEYS.requests, reqs);
    modal('reqModal').hide();
    toast('Swap request sent!');
    render();
}

function setRequestStatus(id, status) {
    const reqs = db.get(KEYS.requests);
    const r = reqs.find(x => x.id === id);
    if (r) r.status = status;
    db.set(KEYS.requests, reqs);
    toast(status === 'accepted' ? 'Swap accepted! Contact details are shown.' : 'Request declined.');
    render();
}

// ---------- wire up ----------
document.addEventListener('DOMContentLoaded', async () => {
    await seed();
    render();

    document.querySelectorAll('[data-view]').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        if (a.dataset.view !== 'browse' && !requireLogin()) return;
        showView(a.dataset.view);
    }));

    document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.toggle('active', b === btn));
        $('#loginForm').classList.toggle('d-none', btn.dataset.authTab !== 'login');
        $('#signupForm').classList.toggle('d-none', btn.dataset.authTab !== 'signup');
        $('#authError').textContent = '';
    }));

    const authHandler = fn => async e => {
        e.preventDefault();
        try {
            await fn(Object.fromEntries(new FormData(e.target)));
            modal('authModal').hide();
            e.target.reset();
            $('#authError').textContent = '';
            toast(`Welcome, ${currentUser().name}!`);
            render();
        } catch (err) {
            $('#authError').textContent = err.message;
        }
    };
    $('#loginForm').addEventListener('submit', authHandler(login));
    $('#signupForm').addEventListener('submit', authHandler(signup));
    $('#logoutBtn').addEventListener('click', e => { e.preventDefault(); logout(); });

    $('#heroListBtn').addEventListener('click', () => openListForm());
    $('#mineListBtn').addEventListener('click', () => openListForm());
    $('#listForm').addEventListener('submit', saveListing);
    $('#reqForm').addEventListener('submit', sendRequest);
    $('#searchInput').addEventListener('input', render);
    $('#platformFilter').addEventListener('change', render);

    document.body.addEventListener('click', e => {
        const t = e.target.closest('[data-edit],[data-delete],[data-request],[data-accept],[data-decline]');
        if (!t) return;
        if (t.dataset.edit) openListForm(db.get(KEYS.listings).find(l => l.id === t.dataset.edit));
        if (t.dataset.delete) deleteListing(t.dataset.delete);
        if (t.dataset.request) openRequest(t.dataset.request);
        if (t.dataset.accept) setRequestStatus(t.dataset.accept, 'accepted');
        if (t.dataset.decline) setRequestStatus(t.dataset.decline, 'declined');
    });
});
