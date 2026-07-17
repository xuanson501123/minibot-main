/* ═══════════════════════════════════════════════════════════════
   UDID Manager Mini App — app.js
   Dành cho CTV & Admin duyệt UDID cho khách hàng
   ═══════════════════════════════════════════════════════════════ */

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.enableClosingConfirmation?.(); }

/* ── helpers ── */
const $ = id => document.getElementById(id);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];

/* ── state ── */
const S = {
    userId: null,
    role: 'guest',   // 'admin' | 'ctv' | 'guest'
    balance: 0,
    priceVip1: 0,
    priceVip2: 0,
};

/* ═══ API ═══ */
const _p = new URLSearchParams(location.search);
let API_BASE = (_p.get('api') || '').replace(/\/+$/, '');
if (API_BASE) { try { localStorage.setItem('_udid_api', API_BASE); } catch { } }
else { try { API_BASE = (localStorage.getItem('_udid_api') || '').replace(/\/+$/, ''); } catch { } }

const INIT_DATA = tg?.initData || '';
const API_READY = !!(API_BASE && INIT_DATA);

async function api(payload, silent = false) {
    if (!API_READY) {
        if (!silent) toast('⚠️ Chưa kết nối bot — gõ /start rồi mở lại', 'err');
        return null;
    }
    try {
        const r = await fetch(API_BASE + '/api/cmd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: INIT_DATA, ...payload }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) {
            if (!silent) toast('❌ ' + (j.error || 'Lỗi server'), 'err');
            return null;
        }
        return j;
    } catch (e) {
        if (!silent) toast('❌ Mất kết nối: ' + e.message, 'err');
        return null;
    }
}

/* ═══ USER INIT ═══ */
function getTgUser() {
    if (tg?.initDataUnsafe?.user) return tg.initDataUnsafe.user;
    try { const u = new URLSearchParams(tg?.initData || '').get('user'); if (u) return JSON.parse(u); } catch { }
    return null;
}

function initUser() {
    const u = getTgUser();
    if (!u) { showGate(); return; }

    S.userId = u.id;
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'User';
    $('userName').textContent = name;
    $('userId').textContent = 'ID: ' + u.id;
    $('myidDisp').textContent = u.id;
    if (u.photo_url) $('avatar').innerHTML = `<img src="${u.photo_url}" alt="">`;
    else $('avatar').textContent = (u.first_name || '?')[0].toUpperCase();

    // Role từ start_param: role:admin | role:ctv
    const sp = tg?.initDataUnsafe?.start_param || _p.get('s') || '';
    if (/role:admin/.test(sp)) { S.role = 'admin'; }
    else if (/role:ctv/.test(sp)) { S.role = 'ctv'; }
    else { S.role = 'guest'; }

    applyRole();
    loadUserInfo();
}

function applyRole() {
    const pill = $('rolePill');
    if (S.role === 'admin') {
        pill.textContent = '👑 Admin'; pill.className = 'role-pill admin';
        qsa('.admin-only').forEach(el => el.hidden = false);
        $('tabsBar').classList.add('with-admin');
    } else if (S.role === 'ctv') {
        pill.textContent = '🤝 CTV'; pill.className = 'role-pill ctv';
    } else {
        pill.textContent = 'Guest'; pill.className = 'role-pill';
    }
}

async function loadUserInfo() {
    showLoader();
    const j = await api({ type: 'userinfo' }, true);
    hideLoader();
    if (j?.data) {
        const d = j.data;
        if (d.role && d.role !== 'guest') S.role = d.role;
        S.balance = d.balance || 0;
        S.priceVip1 = d.price_v1 || 0;
        S.priceVip2 = d.price_v2 || 0;
        applyRole();
        updateStats();
    }
}

function updateStats() {
    $('stBalance').textContent = S.balance > 0 ? fmtVnd(S.balance) : (S.role === 'admin' ? '∞' : '—');
    $('stCanVip1').textContent = S.priceVip1 > 0 && S.balance > 0 ? Math.floor(S.balance / S.priceVip1) : (S.role === 'admin' ? '∞' : '—');
    $('stCanVip2').textContent = S.priceVip2 > 0 && S.balance > 0 ? Math.floor(S.balance / S.priceVip2) : (S.role === 'admin' ? '∞' : '—');
    $('balCardVal').textContent = S.balance > 0 ? fmtVnd(S.balance) : (S.role === 'admin' ? 'Admin — không giới hạn' : '—');
    $('priceVal').textContent = S.priceVip1 ? `Vip1: ${fmtVnd(S.priceVip1)} · Vip2: ${fmtVnd(S.priceVip2)}` : 'Đang tải...';
    $('quotaDisp').textContent = S.balance > 0 ? `${fmtVnd(S.balance)} · Vip1×${Math.floor(S.balance / (S.priceVip1 || 1))} Vip2×${Math.floor(S.balance / (S.priceVip2 || 1))}` : (S.role === 'admin' ? 'Admin — không giới hạn' : '—');
}

function fmtVnd(n) { return n.toLocaleString('vi-VN') + 'đ'; }

/* ═══ TABS ═══ */
qsa('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        qsa('.tab').forEach(b => b.classList.toggle('active', b === btn));
        qsa('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + tab));
        haptic('light');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

/* ═══ HOME ═══ */
$('refreshBtn').addEventListener('click', () => { loadUserInfo(); toast('🔄 Đang làm mới...'); });

qsa('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.go;
        const focus = btn.dataset.focus;
        // chuyển sang tab duyệt
        qsa('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        qsa('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + tab));
        haptic('medium');
        // focus vào đúng input nếu cần
        if (focus === 'replace') $('udidNewInput').scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => $('udidInput').focus(), 300);
    });
});

/* ═══ DUYỆT PAGE ═══ */
async function pasteToInput(inputId) {
    const el = $(inputId);
    try {
        const t = await navigator.clipboard.readText();
        if (t) { el.value = t.trim(); toast('✓ Đã dán', 'ok'); }
        else toast('Clipboard trống', 'err');
    } catch { el.focus(); toast('Hãy dán bằng tay (giữ → Dán)', 'err'); }
}

$('pasteBtn').addEventListener('click', () => pasteToInput('udidInput'));
$('pasteNewBtn').addEventListener('click', () => pasteToInput('udidNewInput'));

function getUdid() { return $('udidInput').value.trim(); }
function getUdidNew() { return $('udidNewInput').value.trim(); }

async function doApprove(type) {
    const udid = getUdid();
    if (!udid) { toast('⚠️ Nhập UDID trước', 'err'); haptic('error'); return; }
    haptic('medium');
    showLoader();
    const j = await api({ type, udid });
    hideLoader();
    if (!j) return;
    showModal('✅', 'Thành công', j.message || '');
    $('udidInput').value = '';
    loadUserInfo(); // refresh số dư
}

async function doDelete() {
    const udid = getUdid();
    if (!udid) { toast('⚠️ Nhập UDID trước', 'err'); haptic('error'); return; }
    if (!confirm(`Xóa UDID:\n${udid}?`)) return;
    haptic('medium');
    showLoader();
    const j = await api({ type: 'delete', udid });
    hideLoader();
    if (!j) return;
    showModal('🗑️', 'Đã xóa', j.message || '');
    $('udidInput').value = '';
}

async function doNangvip() {
    const udid = getUdid();
    if (!udid) { toast('⚠️ Nhập UDID trước', 'err'); haptic('error'); return; }
    haptic('medium');
    showLoader();
    const j = await api({ type: 'nangvip', udid });
    hideLoader();
    if (!j) return;
    showModal('⬆️', 'Đã nâng Vip', j.message || '');
    $('udidInput').value = '';
    loadUserInfo();
}

async function doReplace() {
    const udid = getUdid();
    const udidNew = getUdidNew();
    if (!udid) { toast('⚠️ Nhập UDID cũ', 'err'); return; }
    if (!udidNew) { toast('⚠️ Nhập UDID mới', 'err'); return; }
    haptic('medium');
    showLoader();
    const j = await api({ type: 'replace', udid, new_udid: udidNew });
    hideLoader();
    if (!j) return;
    showModal('♻️', 'Đã replace', j.message || '');
    $('udidInput').value = '';
    $('udidNewInput').value = '';
}

$('btnVip1').addEventListener('click', () => doApprove('vip1'));
$('btnVip2').addEventListener('click', () => doApprove('vip2'));
$('btnDelete').addEventListener('click', () => doDelete());
$('btnNangvip').addEventListener('click', () => doNangvip());
$('btnReplace').addEventListener('click', () => doReplace());

/* ═══ KHÁC PAGE ═══ */
qsa('.list-card').forEach(card => {
    card.addEventListener('click', () => {
        haptic('medium');
        onMoreAction(card.dataset.action);
    });
});

function onMoreAction(action) {
    switch (action) {
        case 'myid':
            if (S.userId) {
                try { navigator.clipboard.writeText(String(S.userId)); toast('✓ Đã copy ID: ' + S.userId, 'ok'); }
                catch { toast('ID: ' + S.userId); }
            }
            break;
        case 'myquota':
            toast(S.role === 'admin' ? '👑 Admin — không giới hạn' : `💰 Số dư: ${fmtVnd(S.balance)}`);
            break;
        case 'nap':
            // Mở bot chat để dùng /nap
            sendBotCmd('/nap');
            break;
        case 'napusdt':
            sendBotCmd('/napusdt');
            break;
        case 'contact':
            toast('💬 Liên hệ admin qua bot Telegram');
            break;
    }
}

function sendBotCmd(cmd) {
    // Gửi lệnh qua sendData → bot nhận và xử lý
    try {
        if (tg?.sendData) tg.sendData(JSON.stringify({ type: 'chat', text: cmd }));
        else toast('Gõ ' + cmd + ' trong bot', 'ok');
    } catch { toast('Gõ ' + cmd + ' trong bot', 'ok'); }
}

/* ═══ ADMIN PAGE ═══ */
$('napBtn').addEventListener('click', () => {
    qsa('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'more'));
    qsa('.page').forEach(p => p.classList.toggle('active', p.id === 'page-more'));
});

qsa('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => { haptic('medium'); onAdminAct(btn.dataset.act); });
});

async function onAdminAct(act) {
    let payload = { type: act };
    let ok = true;

    switch (act) {
        case 'addctv':
            payload.ctv_id = $('adm_ctv_id').value.trim();
            payload.name = $('adm_ctv_name').value.trim();
            if (!payload.ctv_id || !payload.name) { toast('Nhập ID và tên CTV', 'err'); ok = false; }
            break;
        case 'removectv':
            payload.ctv_id = $('adm_ctv_del').value.trim();
            if (!payload.ctv_id) { toast('Nhập Telegram ID CTV', 'err'); ok = false; }
            break;
        case 'nap_ctv':
            payload.ctv_id = $('adm_nap_id').value.trim();
            payload.amount = $('adm_nap_amount').value.trim();
            if (!payload.ctv_id || !payload.amount) { toast('Nhập ID và số tiền', 'err'); ok = false; }
            break;
        case 'broadcast':
            payload.text = $('adm_broadcast').value.trim();
            if (!payload.text) { toast('Nhập nội dung', 'err'); ok = false; }
            break;
        case 'thongke':
            break;
        case 'setprice_v1':
            payload.type = 'setprice'; payload.tier = 'vip1';
            payload.price = $('adm_price_v1').value.trim();
            if (!payload.price) { toast('Nhập giá Vip1', 'err'); ok = false; }
            break;
        case 'setprice_v2':
            payload.type = 'setprice'; payload.tier = 'vip2';
            payload.price = $('adm_price_v2').value.trim();
            if (!payload.price) { toast('Nhập giá Vip2', 'err'); ok = false; }
            break;
    }

    if (!ok) return;
    showLoader();
    const j = await api(payload);
    hideLoader();
    if (!j) return;
    toast('✅ ' + (j.message || 'Thành công'), 'ok');
    if (j.detail) showModal('📊', 'Kết quả', j.detail);
    loadUserInfo();
}

/* ═══ MODAL ═══ */
function showModal(ico, title, body) {
    $('modalIco').textContent = ico;
    $('modalTitle').textContent = title;
    $('modalBody').textContent = body;
    $('modal').hidden = false;
    haptic('success');
}
$('modalClose').addEventListener('click', () => { $('modal').hidden = true; });

/* ═══ TOAST ═══ */
let _tt = null;
function toast(msg, type) {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(_tt);
    _tt = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ═══ HAPTIC ═══ */
function haptic(s) {
    try { tg?.HapticFeedback?.impactOccurred?.(s === 'success' ? 'medium' : s === 'error' ? 'rigid' : 'light'); } catch { }
}

/* ═══ LOADER ═══ */
function showLoader() { $('loader').hidden = false; }
function hideLoader() { $('loader').hidden = true; }

/* ═══ LOGIN GATE (nếu mở ngoài Telegram) ═══ */
function showGate() {
    const g = document.createElement('div');
    g.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(7,8,13,.95);backdrop-filter:blur(20px);padding:24px';
    g.innerHTML = `<div style="background:rgba(30,32,48,.95);border:1px solid rgba(255,255,255,.15);border-radius:24px;padding:32px 22px;max-width:300px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6)">
    <div style="font-size:44px;margin-bottom:12px">🔐</div>
    <h2 style="margin:0 0 8px;font-size:19px;font-weight:800;color:#e8ecf6">UDID Manager</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#8b93a8;line-height:1.5">Mini App này dành cho <b>CTV & Admin</b>.<br>Vui lòng mở trong Telegram.</p>
    <a href="https://t.me/" style="display:block;padding:13px;border-radius:13px;background:linear-gradient(135deg,#7b93e8,#a67ae0);color:#f2f4fa;font-size:14px;font-weight:700;text-decoration:none">🤖 Mở Bot Telegram</a>
    <p style="margin-top:14px;font-size:11.5px;color:#8b93a8">Gõ <b>/start</b> trong bot rồi nhấn nút <b>Mini App</b></p>
  </div>`;
    document.body.appendChild(g);
}

/* ═══ BOOT ═══ */
initUser();
