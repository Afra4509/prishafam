/**
 * ==============================================================================
 * FARMELLE SMART FARM — ENGINE, AUTH & SUPABASE CLIENT
 * File: app.js
 * Description: Authentication system, role-based access control,
 *              reactive state engine, Supabase integration,
 *              Canvas charts, CRUD operations, and UI management.
 * ==============================================================================
 */

/* ==============================================================================
 * SECTION 1: CONFIGURATION & CONSTANTS
 * ============================================================================== */

const SUPABASE_CONFIG = {
  URL:      localStorage.getItem('farmelle_supabase_url') || 'https://zsvubmocjiiklzefjczy.supabase.co',
  ANON_KEY: localStorage.getItem('farmelle_supabase_key') || 'sb_publishable__NI6-8Ww8lgRsWqhsk04-g_TgyBnBIt'
};

var supabaseClient = null;
if (SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY && typeof supabase !== 'undefined') {
  try {
    supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
  } catch (e) {
    console.warn('Supabase init failed:', e);
  }
}

const SESSION_KEY         = 'farmelle_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const DEMO_USERS_KEY      = 'farmelle_demo_users';
const APP_VERSION         = '2.0.0';

/* ==============================================================================
 * SECTION 2: PERMISSIONS & NAV CONFIG
 * ============================================================================== */

const PERMISSIONS = {
  ADMIN: [
    'dashboard', 'coops', 'feed', 'finances', 'analytics', 'alerts', 'users', 'settings',
    'add_coop', 'edit_coop', 'delete_coop',
    'add_feed',
    'add_transaction', 'delete_transaction',
    'add_monitoring',
    'manage_users', 'change_settings'
  ],
  USER: [
    'dashboard', 'coops', 'feed', 'analytics', 'alerts',
    'add_monitoring'
  ]
};

const NAV_CONFIG = {
  ADMIN: [
    { view: 'dashboard', icon: 'icon-dashboard', label: 'Dashboard' },
    { view: 'coops',     icon: 'icon-coop',      label: 'Kandang' },
    { view: 'feed',      icon: 'icon-feed',       label: 'Pakan & Logistik' },
    { view: 'finances',  icon: 'icon-finance',    label: 'Keuangan' },
    { view: 'analytics', icon: 'icon-analytics',  label: 'Analytics' },
    { view: 'alerts',    icon: 'icon-bell',       label: 'Smart Alerts', badge: 'sidebarAlertBadge' },
    { view: 'users',     icon: 'icon-users',      label: 'Kelola User' },
    { view: 'settings',  icon: 'icon-settings',   label: 'Pengaturan' }
  ],
  USER: [
    { view: 'dashboard', icon: 'icon-dashboard', label: 'Dashboard' },
    { view: 'coops',     icon: 'icon-coop',      label: 'Kandang' },
    { view: 'feed',      icon: 'icon-feed',       label: 'Pakan' },
    { view: 'analytics', icon: 'icon-analytics',  label: 'Analytics' },
    { view: 'alerts',    icon: 'icon-bell',       label: 'Smart Alerts', badge: 'sidebarAlertBadge' }
  ]
};

// Bottom nav shows first 5 items from ADMIN, or all USER items
const CATEGORIES = {
  INCOME:  ['Penjualan Ayam', 'Penjualan Bebek', 'Penjualan Telur', 'Penjualan Pupuk Kandang', 'Lainnya'],
  EXPENSE: ['Pembelian Pakan', 'Pembelian DOC/DOD', 'Pembelian Vaksin & Obat', 'Listrik & Air', 'Upah Kerja', 'Pemeliharaan Kandang', 'Transportasi & Logistik', 'Operasional Lainnya']
};

/* ==============================================================================
 * SECTION 3: APPLICATION STATE
 * ============================================================================== */

const state = {
  currentUser:   null,
  dashboard:     null,
  coops:         [],
  feed:          [],
  finances:      [],
  monitoring:    [],
  alerts:        [],
  demoUsers:     [],
  settings: {
    farm_name:                     'Farmelle Smart Farm',
    owner_name:                    'Administrator',
    mortality_warning_threshold:   '3.0',
    mortality_critical_threshold:  '7.0',
    feed_warning_days:             '7',
    feed_critical_days:            '3',
    fcr_good_threshold:            '1.6',
    fcr_monitor_threshold:         '1.9',
    auto_refresh_interval:         '30'
  },
  currentView:            'dashboard',
  activeTheme:            localStorage.getItem('farmelle_theme') || 'light',
  activeFilter:           'ALL',
  searchQuery:            '',
  loading:                false,
  isSubmitting:           false,
  isSupabaseConnected:    false,
  autoRefreshIntervalId:  null,
  lastUpdated:            null
};

/* ==============================================================================
 * SECTION 4: DEMO / SEED DATA
 * ============================================================================== */

const INITIAL_DEMO_DATA = {
  coops: [
    { id: 'KND-A01', nama_kandang: 'Pavilion Mawar (A01)',    jenis_unggas: 'Ayam Broiler',  jumlah_awal: 2000, jumlah_mati: 38,  umur_hari: 28,  target_panen_hari: 35,  fcr: 1.48, catatan: 'Pertumbuhan optimal, nafsu makan stabil ♡' },
    { id: 'KND-A02', nama_kandang: 'Pavilion Peony (A02)',    jenis_unggas: 'Ayam Broiler',  jumlah_awal: 2500, jumlah_mati: 135, umur_hari: 18,  target_panen_hari: 35,  fcr: 1.62, catatan: 'Fluktuasi suhu malam hari, mortality sedikit naik' },
    { id: 'KND-A03', nama_kandang: 'Pavilion Camellia (A03)', jenis_unggas: 'Ayam Petelur',  jumlah_awal: 1500, jumlah_mati: 14,  umur_hari: 120, target_panen_hari: 540, fcr: 1.85, catatan: 'Produksi telur 93.4% per hari, kondisi prima ♡' },
    { id: 'KND-B01', nama_kandang: 'Laguna Dahlia (B01)',     jenis_unggas: 'Bebek Pedaging', jumlah_awal: 1200, jumlah_mati: 22,  umur_hari: 35,  target_panen_hari: 45,  fcr: 1.72, catatan: 'Bebek hibrida sehat, konversi pakan sangat baik' },
    { id: 'KND-B02', nama_kandang: 'Laguna Iris (B02)',       jenis_unggas: 'Bebek Petelur',  jumlah_awal: 800,  jumlah_mati: 72,  umur_hari: 95,  target_panen_hari: 365, fcr: 2.10, catatan: 'Mortality 9.0%! Evaluasi kelembaban dan sirkulasi segera.' }
  ],
  feed: [
    { id: 'PKN-001', tanggal: '2026-09-10', jenis_pakan: 'Starter Broiler Crumble (BR-1)', stok_masuk: 1500, stok_keluar: 320, konsumsi_harian: 240, stok_sisa: 1180, harga_per_kg: 9200, supplier: 'PT Japfa Comfeed',      kandang_id: 'KND-A01' },
    { id: 'PKN-002', tanggal: '2026-09-12', jenis_pakan: 'Finisher Broiler Pellet (BR-2)', stok_masuk: 2000, stok_keluar: 410, konsumsi_harian: 310, stok_sisa: 1590, harga_per_kg: 8800, supplier: 'PT Japfa Comfeed',      kandang_id: 'KND-A02' },
    { id: 'PKN-003', tanggal: '2026-09-14', jenis_pakan: 'Layer Mash Concentrate (KL-36)', stok_masuk: 1000, stok_keluar: 180, konsumsi_harian: 165, stok_sisa: 820,  harga_per_kg: 9500, supplier: 'PT Charoen Pokphand',  kandang_id: 'KND-A03' },
    { id: 'PKN-004', tanggal: '2026-09-15', jenis_pakan: 'Duck Grower Pellet (DK-2)',      stok_masuk: 800,  stok_keluar: 220, konsumsi_harian: 190, stok_sisa: 580,  harga_per_kg: 8500, supplier: 'PT Malindo Feedmill',  kandang_id: 'KND-B01' },
    { id: 'PKN-005', tanggal: '2026-09-16', jenis_pakan: 'Duck Layer High Protein (DL-1)', stok_masuk: 500,  stok_keluar: 410, konsumsi_harian: 115, stok_sisa: 90,   harga_per_kg: 9100, supplier: 'PT Malindo Feedmill',  kandang_id: 'KND-B02' }
  ],
  finances: [
    { id: 'TRX-101', tanggal: '2026-09-02', tipe: 'EXPENSE', kategori: 'Pembelian Pakan',          deskripsi: 'Konsentrat Broiler Starter 50 sak',               nominal: 18500000, kandang_id: 'KND-A01', metode_pembayaran: 'Transfer Bank' },
    { id: 'TRX-102', tanggal: '2026-09-05', tipe: 'EXPENSE', kategori: 'Pembelian Vaksin & Obat',  deskripsi: 'Vaksin ND & Gumboro + Vitamin Enrofloxacin',      nominal: 2400000,  kandang_id: 'KND-A02', metode_pembayaran: 'Transfer Bank' },
    { id: 'TRX-103', tanggal: '2026-09-08', tipe: 'INCOME',  kategori: 'Penjualan Telur',          deskripsi: 'Telur Ayam Omega & Reguler 480 kg',               nominal: 12960000, kandang_id: 'KND-A03', metode_pembayaran: 'Tunai / Cash' },
    { id: 'TRX-104', tanggal: '2026-09-10', tipe: 'EXPENSE', kategori: 'Pembelian Pakan',          deskripsi: 'Pakan Bebek Petelur Layer 30 sak',                nominal: 11200000, kandang_id: 'KND-B02', metode_pembayaran: 'Transfer Bank' },
    { id: 'TRX-105', tanggal: '2026-09-12', tipe: 'INCOME',  kategori: 'Penjualan Bebek',          deskripsi: 'Panen Bebek Pedaging Batch 3 — 600 ekor',         nominal: 22800000, kandang_id: 'KND-B01', metode_pembayaran: 'Transfer Bank' },
    { id: 'TRX-106', tanggal: '2026-09-14', tipe: 'EXPENSE', kategori: 'Listrik & Air',            deskripsi: 'Tagihan listrik kandang & pompa otomatis',         nominal: 3150000,  kandang_id: 'ALL',     metode_pembayaran: 'Transfer Bank' },
    { id: 'TRX-107', tanggal: '2026-09-15', tipe: 'INCOME',  kategori: 'Penjualan Ayam',           deskripsi: 'Penjualan Afkir & Panen Parsial Broiler A01',     nominal: 38700000, kandang_id: 'KND-A01', metode_pembayaran: 'Transfer Bank' },
    { id: 'TRX-108', tanggal: '2026-09-16', tipe: 'EXPENSE', kategori: 'Upah Kerja',               deskripsi: 'Gaji mingguan tim pemelihara kandang',             nominal: 4500000,  kandang_id: 'ALL',     metode_pembayaran: 'Tunai / Cash' },
    { id: 'TRX-109', tanggal: '2026-09-17', tipe: 'INCOME',  kategori: 'Penjualan Telur',          deskripsi: 'Telur Bebek Asin & Segar 250 butir',              nominal: 6250000,  kandang_id: 'KND-B02', metode_pembayaran: 'Transfer Bank' },
    { id: 'TRX-110', tanggal: '2026-09-18', tipe: 'EXPENSE', kategori: 'Pemeliharaan Kandang',     deskripsi: 'Perbaikan nozzle drinker blower kandang B02',      nominal: 850000,   kandang_id: 'KND-B02', metode_pembayaran: 'Tunai / Cash' }
  ],
  monitoring: [
    { date: '09-05', mortality_rate: 1.1, feed_consumption: 200, temperature: 28.5 },
    { date: '09-07', mortality_rate: 1.4, feed_consumption: 207, temperature: 28.7 },
    { date: '09-09', mortality_rate: 1.9, feed_consumption: 214, temperature: 29.0 },
    { date: '09-11', mortality_rate: 2.2, feed_consumption: 221, temperature: 28.4 },
    { date: '09-13', mortality_rate: 2.8, feed_consumption: 228, temperature: 28.9 },
    { date: '09-15', mortality_rate: 3.1, feed_consumption: 235, temperature: 29.1 },
    { date: '09-18', mortality_rate: 3.5, feed_consumption: 242, temperature: 28.6 }
  ]
};

/* ==============================================================================
 * SECTION 5: AUTHENTICATION MODULE
 * ============================================================================== */

/**
 * SHA-256 hash using Web Crypto API (async, browser-native)
 */
async function hashPassword(password) {
  try {
    var encoder = new TextEncoder();
    var data = encoder.encode(String(password));
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  } catch (e) {
    // Fallback: simple hash if Web Crypto unavailable
    console.warn('Web Crypto unavailable, using fallback hash');
    var h = 0;
    for (var i = 0; i < password.length; i++) {
      h = Math.imul(31, h) + password.charCodeAt(i) | 0;
    }
    return 'fallback_' + Math.abs(h).toString(16);
  }
}

/**
 * Generate a secure random session token
 */
function generateToken() {
  try {
    var arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  } catch (e) {
    return Math.random().toString(36).substr(2) + Date.now().toString(36);
  }
}

/**
 * Store session in sessionStorage (cleared on browser close)
 */
function storeSession(user) {
  var session = {
    user: {
      user_id:  user.user_id,
      username: user.username,
      name:     user.name,
      role:     user.role
    },
    token:      generateToken(),
    created_at: Date.now(),
    expires_at: Date.now() + SESSION_DURATION_MS
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Session storage error:', e);
  }
}

/**
 * Get current session from sessionStorage
 */
function getCurrentSession() {
  try {
    var raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Validate session (check expiry and structure)
 */
function validateSession(session) {
  if (!session || !session.user || !session.expires_at || !session.token) return false;
  if (Date.now() > session.expires_at) {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    return false;
  }
  return true;
}

/**
 * Get demo users from localStorage
 */
function getDemoUsers() {
  try {
    var raw = localStorage.getItem(DEMO_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save demo users to localStorage
 */
function saveDemoUsers(users) {
  try {
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to save demo users:', e);
  }
}

/**
 * Initialize demo users if not existing (creates hashed passwords)
 */
async function ensureDemoUsersExist() {
  var existing = localStorage.getItem(DEMO_USERS_KEY);
  if (existing) {
    try {
      var parsed = JSON.parse(existing);
      if (parsed && parsed.length > 0) return; // already seeded
    } catch (e) {}
  }

  var adminHash = await hashPassword('Admin123!');
  var staffHash = await hashPassword('Staff123!');
  var now = new Date().toISOString();

  var users = [
    {
      user_id:       'USR-001',
      username:      'admin',
      password_hash: adminHash,
      name:          'Administrator',
      role:          'ADMIN',
      status:        'ACTIVE',
      created_at:    now,
      last_login:    null
    },
    {
      user_id:       'USR-002',
      username:      'staff',
      password_hash: staffHash,
      name:          'Farm Staff',
      role:          'USER',
      status:        'ACTIVE',
      created_at:    now,
      last_login:    null
    }
  ];

  saveDemoUsers(users);
}

/**
 * Core login function — checks credentials against Supabase or demo store
 */
async function login(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Username dan password wajib diisi.' };
  }

  var inputHash = await hashPassword(password.trim());
  var usernameClean = username.trim().toLowerCase();

  if (supabaseClient) {
    try {
      var result = await apiCall(function() {
        return supabaseClient
          .from('users')
          .select('*')
          .eq('username', usernameClean)
          .single();
      });

      if (!result || !result.data) {
        return { success: false, error: 'Username tidak ditemukan.' };
      }

      var userData = result.data;

      if (userData.status !== 'ACTIVE') {
        return { success: false, error: 'Akun Anda tidak aktif. Hubungi administrator.' };
      }

      if (userData.password_hash !== inputHash) {
        return { success: false, error: 'Password salah. Coba lagi.' };
      }

      // Update last_login
      try {
        await supabaseClient
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('user_id', userData.user_id);
      } catch (e) {}

      return {
        success: true,
        user: {
          user_id:  userData.user_id,
          username: userData.username,
          name:     userData.name,
          role:     userData.role
        }
      };
    } catch (err) {
      console.warn('Supabase login error:', err);
      // Fallback to demo if Supabase fails
    }
  }

  // Demo mode
  var users = getDemoUsers();
  var user = users.find(function(u) {
    return u.username.toLowerCase() === usernameClean;
  });

  if (!user) {
    return { success: false, error: 'Username tidak ditemukan.' };
  }

  if (user.status !== 'ACTIVE') {
    return { success: false, error: 'Akun Anda tidak aktif. Hubungi administrator ♡' };
  }

  if (user.password_hash !== inputHash) {
    return { success: false, error: 'Password salah. Silakan coba lagi.' };
  }

  // Update last_login in demo store
  user.last_login = new Date().toISOString();
  saveDemoUsers(users);

  return {
    success: true,
    user: {
      user_id:  user.user_id,
      username: user.username,
      name:     user.name,
      role:     user.role
    }
  };
}

/**
 * Handle login form submit
 */
async function handleLogin(e) {
  e.preventDefault();
  if (state.isSubmitting) return;

  var username = document.getElementById('loginUsername').value;
  var password = document.getElementById('loginPassword').value;

  hideLoginError();
  setLoginLoading(true);
  state.isSubmitting = true;

  try {
    var result = await login(username, password);

    if (result.success) {
      storeSession(result.user);
      state.currentUser = result.user;
      setLoginLoading(false);
      state.isSubmitting = false;
      showMainApp();
      await initializeApp();
    } else {
      setLoginLoading(false);
      state.isSubmitting = false;
      showLoginError(result.error);
    }
  } catch (err) {
    setLoginLoading(false);
    state.isSubmitting = false;
    showLoginError('Terjadi kesalahan. Silakan coba lagi.');
    console.error('Login error:', err);
  }
}

/**
 * Handle logout
 */
function handleLogout() {
  openConfirmModal({
    title:       'Keluar dari Farmelle?',
    message:     'Anda akan keluar dari sesi ini. Sesi akan berakhir dan Anda perlu login kembali.',
    confirmText: 'Ya, Keluar',
    iconType:    'warning',
    iconId:      'icon-logout',
    onConfirm: function() {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
      state.currentUser = null;
      stopAutoRefresh();
      closeAllDropdowns();
      showLoginScreen();
      showToast('Sampai jumpa! Anda telah keluar ♡', 'info');
    }
  });
}

/**
 * Show login screen, hide main app
 */
function showLoginScreen() {
  var ls = document.getElementById('loginScreen');
  var ma = document.getElementById('mainApp');
  var bn = document.getElementById('bottomNav');

  if (ls) { ls.style.display = 'flex'; ls.style.removeProperty('visibility'); }
  if (ma) ma.style.display = 'none';
  if (bn) bn.style.display = 'none';

  // Reset login form
  var form = document.getElementById('loginForm');
  if (form) form.reset();
  hideLoginError();
  resetPasswordVisibility();
}

/**
 * Show main app, hide login screen
 */
function showMainApp() {
  var ls = document.getElementById('loginScreen');
  var ma = document.getElementById('mainApp');
  var bn = document.getElementById('bottomNav');

  if (ls) ls.style.display = 'none';
  if (ma) ma.style.display = 'flex';
  if (bn) bn.style.display = ''; // Clear inline display so CSS media queries control visibility
}

/* Login UI helpers */
function setLoginLoading(loading) {
  var btn = document.getElementById('loginSubmitBtn');
  var content = document.getElementById('loginBtnContent');
  if (!btn || !content) return;

  if (loading) {
    btn.disabled = true;
    content.innerHTML = '<span class="login-loading"></span> Memverifikasi...';
  } else {
    btn.disabled = false;
    content.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-check"></use></svg> Sign In ♡';
  }
}

function showLoginError(message) {
  var errEl = document.getElementById('loginError');
  var errText = document.getElementById('loginErrorText');
  if (errEl && errText) {
    errText.textContent = message || 'Terjadi kesalahan.';
    errEl.style.display = 'flex';
  }
}

function hideLoginError() {
  var errEl = document.getElementById('loginError');
  if (errEl) errEl.style.display = 'none';
}

var passwordVisible = false;
function togglePasswordVisibility() {
  passwordVisible = !passwordVisible;
  var input = document.getElementById('loginPassword');
  var icon  = document.getElementById('eyeIconSvg');
  if (input) input.type = passwordVisible ? 'text' : 'password';
  if (icon) icon.innerHTML = passwordVisible
    ? '<use href="#icon-eye-off"></use>'
    : '<use href="#icon-eye"></use>';
}

function resetPasswordVisibility() {
  passwordVisible = false;
  var input = document.getElementById('loginPassword');
  var icon  = document.getElementById('eyeIconSvg');
  if (input) input.type = 'password';
  if (icon) icon.innerHTML = '<use href="#icon-eye"></use>';
}

/* ==============================================================================
 * SECTION 6: ROLE-BASED PERMISSIONS
 * ============================================================================== */

function hasPermission(action) {
  if (!state.currentUser) return false;
  var role = state.currentUser.role || 'USER';
  var perms = PERMISSIONS[role] || PERMISSIONS.USER;
  return perms.indexOf(action) !== -1;
}

function requirePermission(action) {
  if (!hasPermission(action)) {
    showToast('Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.', 'error');
    return false;
  }
  return true;
}

/**
 * Render sidebar nav and bottom nav based on current user role
 */
function renderNavigation() {
  var role = (state.currentUser && state.currentUser.role) || 'USER';
  var items = NAV_CONFIG[role] || NAV_CONFIG.USER;

  // Sidebar nav
  var sidebarNav = document.getElementById('sidebarNav');
  if (sidebarNav) {
    sidebarNav.innerHTML = items.map(function(item) {
      var isActive = state.currentView === item.view;
      return '<a class="nav-item' + (isActive ? ' active' : '') + '" data-view="' + item.view + '" onclick="switchView(\'' + item.view + '\')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')switchView(\'' + item.view + '\')">' +
        '<span class="icon-wrapper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#' + item.icon + '"></use></svg></span>' +
        '<span>' + item.label + '</span>' +
        (item.badge ? '<span class="nav-badge" id="' + item.badge + '" style="display:none;">0</span>' : '') +
        '</a>';
    }).join('');
  }

  // Bottom nav (max 5 items)
  var bottomNav = document.getElementById('bottomNav');
  if (bottomNav) {
    var labelMap = {
      dashboard: 'Dashboard',
      coops:     'Kandang',
      feed:      'Pakan',
      finances:  'Keuangan',
      analytics: 'Analytics',
      alerts:    'Alerts',
      users:     'User',
      settings:  'Setting'
    };
    var bottomItems = items.slice(0, 5);
    bottomNav.innerHTML = bottomItems.map(function(item) {
      var isActive = state.currentView === item.view;
      var shortLabel = labelMap[item.view] || item.label.split(' ')[0];
      return '<a class="bottom-nav-item' + (isActive ? ' active' : '') + '" data-view="' + item.view + '" onclick="switchView(\'' + item.view + '\')" role="button" tabindex="0">' +
        '<span class="icon-wrapper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#' + item.icon + '"></use></svg></span>' +
        '<span>' + shortLabel + '</span>' +
        '</a>';
    }).join('');
  }

  // Show/hide admin-only elements
  var adminEls = document.querySelectorAll('.admin-only');
  adminEls.forEach(function(el) {
    el.style.display = role === 'ADMIN' ? '' : 'none';
  });
}

/**
 * Update header with current user info
 */
function updateUserDisplay() {
  if (!state.currentUser) return;

  var user = state.currentUser;
  var initial = (user.name || user.username || 'U').charAt(0).toUpperCase();
  var farmName = state.settings.farm_name || 'Farmelle Smart Farm';

  // Header greeting
  var greeting = document.getElementById('headerGreeting');
  if (greeting) {
    greeting.innerHTML = 'Halo, ' + escHtml(user.name || user.username) + ' <span class="heart-accent">♡</span>';
  }

  // User avatar
  var avatar = document.getElementById('userAvatarDisplay');
  if (avatar) avatar.textContent = initial;

  // User name
  var nameEl = document.getElementById('userNameDisplay');
  if (nameEl) nameEl.textContent = user.name || user.username;

  // Dropdown name
  var dropName = document.getElementById('dropdownUserName');
  if (dropName) dropName.textContent = user.name || user.username;

  // Dropdown role badge
  var dropRole = document.getElementById('dropdownUserRole');
  if (dropRole) {
    dropRole.textContent = user.role || 'USER';
    dropRole.className = 'role-badge role-' + (user.role || 'user').toLowerCase();
  }

  // Sidebar user card
  var sidebarCard = document.getElementById('sidebarUserCard');
  // (health widget is in sidebar footer — handled elsewhere)

  // Page title
  document.title = farmName + ' — Smart Farm ♡';
}

/* ==============================================================================
 * SECTION 7: INITIALIZATION
 * ============================================================================== */

document.addEventListener('DOMContentLoaded', async function() {
  // Apply saved theme first
  applyTheme(state.activeTheme);

  // Seed demo users (async, must complete before login check)
  await ensureDemoUsersExist();

  // Check existing session
  var session = getCurrentSession();
  if (session && validateSession(session)) {
    state.currentUser = session.user;
    showMainApp();
    await initializeApp();
  } else {
    showLoginScreen();
  }

  // Global click handler to close dropdowns
  document.addEventListener('click', function(e) {
    var profileBtn  = document.getElementById('userProfileBtn');
    var dropdown    = document.getElementById('userDropdown');
    var container   = document.querySelector('.header-user-container');

    if (dropdown && dropdown.classList.contains('open')) {
      if (!container || !container.contains(e.target)) {
        closeAllDropdowns();
      }
    }
  });

  // Global keyboard: Escape closes modals
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var overlays = document.querySelectorAll('.modal-overlay.active');
      if (overlays.length > 0) {
        var lastOverlay = overlays[overlays.length - 1];
        lastOverlay.classList.remove('active');
      }
      closeMobileSidebar();
    }
  });

  // Resize: redraw charts
  window.addEventListener('resize', debounce(function() {
    if (state.dashboard && (state.currentView === 'dashboard' || state.currentView === 'analytics')) {
      renderCharts();
    }
  }, 300));
});

/**
 * Initialize app after successful auth
 */
async function initializeApp() {
  applyTheme(state.activeTheme);
  updateCurrentDateDisplay();
  updateCategoryOptions();
  renderNavigation();
  updateUserDisplay();
  await loadData();
  startAutoRefresh();
}

function applyTheme(theme) {
  state.activeTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('farmelle_theme', theme);

  var btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = theme === 'dark'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-sun"></use></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-moon"></use></svg>';
    btn.title = theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap';
  }
}

function toggleTheme() {
  var newTheme = state.activeTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  showToast(newTheme === 'dark' ? 'Mode Malam Velvet Aktif ♡' : 'Mode Siang Coquette Aktif ♡', 'info');
  if (state.dashboard) setTimeout(renderCharts, 100);
}

function updateCurrentDateDisplay() {
  var el = document.getElementById('currentDateDisplay');
  if (!el) return;
  var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = new Date().toLocaleDateString('id-ID', opts) + ' ♡';
}

/* ==============================================================================
 * SECTION 8: CENTRALIZED API CALL HELPER
 * ============================================================================== */

/**
 * Centralized Supabase API call with error wrapping
 * Usage: var result = await apiCall(() => supabaseClient.from('x').select('*'));
 */
async function apiCall(fn) {
  try {
    var result = await fn();
    if (result.error) throw result.error;
    return result;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

/* ==============================================================================
 * SECTION 9: DATA ENGINE (Supabase vs Local Demo Store)
 * ============================================================================== */

async function loadData() {
  state.loading = true;
  renderLoadingSkeletons();

  if (supabaseClient) {
    try {
      var [coopsRes, feedRes, finRes, monRes, settRes] = await Promise.all([
        apiCall(function() { return supabaseClient.from('kandang').select('*').order('created_at', { ascending: true }); }),
        apiCall(function() { return supabaseClient.from('pakan').select('*').order('created_at', { ascending: true }); }),
        apiCall(function() { return supabaseClient.from('keuangan').select('*').order('tanggal', { ascending: false }); }),
        apiCall(function() { return supabaseClient.from('monitoring').select('*').order('timestamp', { ascending: true }); }),
        apiCall(function() { return supabaseClient.from('settings').select('*'); })
      ]);

      state.coops    = coopsRes.data || [];
      state.feed     = feedRes.data  || [];
      state.finances = finRes.data   || [];

      state.monitoring = (monRes.data || []).map(function(m) {
        return {
          date:              m.timestamp ? String(m.timestamp).substring(5, 10) : '—',
          mortality_rate:    Number(m.mortality_rate)    || 0,
          feed_consumption:  Number(m.feed_consumption)  || 0,
          temperature:       Number(m.temperature)       || 28
        };
      });

      if (settRes.data) {
        settRes.data.forEach(function(s) {
          if (s.key) state.settings[s.key] = s.value;
        });
      }

      state.isSupabaseConnected = true;
      updateSupabaseStatusBadge(true);
    } catch (err) {
      console.warn('Supabase load failed, falling back to demo:', err.message || err);
      loadFromLocalStorageOrDemo();
      state.isSupabaseConnected = false;
      updateSupabaseStatusBadge(false);
    }
  } else {
    loadFromLocalStorageOrDemo();
    state.isSupabaseConnected = false;
    updateSupabaseStatusBadge(false);
  }

  // Load settings from localStorage (if demo)
  if (!state.isSupabaseConnected) {
    try {
      var savedSettings = localStorage.getItem('farmelle_settings');
      if (savedSettings) {
        var parsed = JSON.parse(savedSettings);
        Object.assign(state.settings, parsed);
      }
    } catch (e) {}
  }

  computeDashboardData();
  state.loading = false;
  populateSelectOptions();
  renderActiveView();
  updateAlertBadge();
  updateUserDisplay();
}

function loadFromLocalStorageOrDemo() {
  try {
    var localCoops = localStorage.getItem('farmelle_demo_coops');
    var localFeed  = localStorage.getItem('farmelle_demo_feed');
    var localFin   = localStorage.getItem('farmelle_demo_fin');
    var localMon   = localStorage.getItem('farmelle_demo_mon');

    state.coops    = localCoops ? JSON.parse(localCoops) : INITIAL_DEMO_DATA.coops.map(function(c) { return Object.assign({}, c); });
    state.feed     = localFeed  ? JSON.parse(localFeed)  : INITIAL_DEMO_DATA.feed.map(function(f) { return Object.assign({}, f); });
    state.finances = localFin   ? JSON.parse(localFin)   : INITIAL_DEMO_DATA.finances.map(function(t) { return Object.assign({}, t); });
    state.monitoring = localMon ? JSON.parse(localMon)   : INITIAL_DEMO_DATA.monitoring.map(function(m) { return Object.assign({}, m); });
  } catch (e) {
    console.warn('Failed to load from localStorage, using defaults');
    state.coops    = INITIAL_DEMO_DATA.coops.map(function(c) { return Object.assign({}, c); });
    state.feed     = INITIAL_DEMO_DATA.feed.map(function(f) { return Object.assign({}, f); });
    state.finances = INITIAL_DEMO_DATA.finances.map(function(t) { return Object.assign({}, t); });
    state.monitoring = INITIAL_DEMO_DATA.monitoring.map(function(m) { return Object.assign({}, m); });
  }
}

function saveLocalDemoData() {
  try {
    localStorage.setItem('farmelle_demo_coops', JSON.stringify(state.coops));
    localStorage.setItem('farmelle_demo_feed',  JSON.stringify(state.feed));
    localStorage.setItem('farmelle_demo_fin',   JSON.stringify(state.finances));
    localStorage.setItem('farmelle_demo_mon',   JSON.stringify(state.monitoring));
  } catch (e) {
    console.warn('Failed to persist demo data:', e);
  }
}

function updateSupabaseStatusBadge(isConnected) {
  var pill     = document.getElementById('supabaseStatusPill');
  var dot      = document.getElementById('statusDot');
  var pillText = document.getElementById('statusPillText');

  if (!pill) return;

  if (isConnected) {
    if (dot) { dot.className = 'status-dot'; }
    if (pillText) pillText.textContent = 'Supabase Connected ♡';
    pill.title = 'Terhubung ke Supabase PostgreSQL';
  } else {
    if (dot) { dot.className = 'status-dot demo'; }
    if (pillText) pillText.textContent = 'Mode Demo ♡';
    pill.title = 'Berjalan di Mode Demo. Klik untuk sambungkan Supabase.';
  }
}

/* ==============================================================================
 * SECTION 10: BUSINESS LOGIC & METRICS
 * ============================================================================== */

function computeDashboardData() {
  var mortWarnThresh = parseFloat(state.settings.mortality_warning_threshold) || 3.0;
  var mortCritThresh = parseFloat(state.settings.mortality_critical_threshold) || 7.0;

  var totalAyam  = 0, totalBebek = 0;
  var totalAwal  = 0, totalMati  = 0, totalHidup = 0;
  var kandangStatusCounts = { AMAN: 0, WASPADA: 0, KRITIS: 0 };
  var popDistribution = {};

  var processedCoops = state.coops.map(function(c) {
    var awal      = Number(c.jumlah_awal) || 0;
    var mati      = Number(c.jumlah_mati) || 0;
    var hidup     = Math.max(0, awal - mati);
    var mortRate  = awal > 0 ? parseFloat(((mati / awal) * 100).toFixed(2)) : 0;

    var status = 'AMAN';
    if (mortRate >= mortCritThresh) status = 'KRITIS';
    else if (mortRate >= mortWarnThresh) status = 'WASPADA';

    kandangStatusCounts[status] = (kandangStatusCounts[status] || 0) + 1;

    var isBebek = (c.jenis_unggas || '').toLowerCase().includes('bebek');
    if (isBebek) totalBebek += hidup;
    else         totalAyam  += hidup;

    totalAwal  += awal;
    totalMati  += mati;
    totalHidup += hidup;

    var jenis = c.jenis_unggas || 'Lainnya';
    popDistribution[jenis] = (popDistribution[jenis] || 0) + hidup;

    var umur        = Number(c.umur_hari) || 1;
    var target      = Number(c.target_panen_hari) || (isBebek ? 45 : 35);
    var sisaPanen   = Math.max(0, target - umur);
    var panenDate   = new Date();
    panenDate.setDate(panenDate.getDate() + sisaPanen);
    var panenDateStr = panenDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    var fcrVal    = parseFloat(c.fcr) || 1.5;
    var fcrStatus = fcrVal > 1.9 ? 'Attention' : (fcrVal > 1.6 ? 'Monitor' : 'Good');

    return Object.assign({}, c, {
      jumlah_hidup:          hidup,
      mortality_rate:        mortRate,
      sisa_hari_panen:       sisaPanen,
      tanggal_panen_estimasi:panenDateStr,
      fcr_status:            fcrStatus,
      status:                status
    });
  });

  var overallMortality = totalAwal > 0 ? parseFloat(((totalMati / totalAwal) * 100).toFixed(2)) : 0;

  // Finance totals
  var totalIncome = 0, totalExpense = 0;
  state.finances.forEach(function(trx) {
    var nom  = Number(trx.nominal) || 0;
    var tipe = String(trx.tipe || '').toUpperCase();
    if (tipe === 'INCOME')  totalIncome  += nom;
    if (tipe === 'EXPENSE') totalExpense += nom;
  });
  var runningProfit = totalIncome - totalExpense;
  var profitMargin  = totalIncome > 0 ? ((runningProfit / totalIncome) * 100).toFixed(1) : '0';

  // Feed totals
  var totalStokPakan = 0, totalKonsumsi = 0;
  var processedFeed = state.feed.map(function(f) {
    var sisa  = Number(f.stok_sisa)         || 0;
    var kons  = Number(f.konsumsi_harian)   || 1;
    var hari  = kons > 0 ? parseFloat((sisa / kons).toFixed(1)) : 999;
    totalStokPakan += sisa;
    totalKonsumsi  += kons;

    var fStatus = 'SAFE';
    if (hari < 3)       fStatus = 'CRITICAL';
    else if (hari <= 7) fStatus = 'WARNING';

    return Object.assign({}, f, { hari_bertahan: hari, status: fStatus });
  });

  var feedDaysRemaining = totalKonsumsi > 0 ? parseFloat((totalStokPakan / totalKonsumsi).toFixed(1)) : 999;

  // Farm Health Score
  var scoreMortality = Math.max(0, Math.min(100, 100 - (overallMortality * 9)));
  var scoreFeed      = Math.min(100, Math.max(0, (feedDaysRemaining / 7) * 100));
  var scoreEnv       = 92;
  var scoreData      = Math.min(100, processedCoops.length * 20);

  var farmHealthScore = Math.round(
    (scoreMortality * 0.40) +
    (scoreFeed      * 0.25) +
    (scoreEnv       * 0.20) +
    (scoreData      * 0.15)
  );
  if (!farmHealthScore || isNaN(farmHealthScore)) farmHealthScore = 85;

  // Generate alerts
  var alerts = [];
  processedFeed.forEach(function(f) {
    if (f.status === 'CRITICAL') {
      alerts.push({
        id: 'ALT-FD-' + f.id, severity: 'critical',
        title: '🚨 Stok Pakan Kritis!',
        message: 'Pakan "' + f.jenis_pakan + '" sisa ' + f.hari_bertahan + ' hari (' + f.stok_sisa + ' kg). Segera reorder!',
        timestamp: new Date().toISOString()
      });
    } else if (f.status === 'WARNING') {
      alerts.push({
        id: 'ALT-FW-' + f.id, severity: 'warning',
        title: '⚠️ Pakan Perlu Dimonitor',
        message: 'Pakan "' + f.jenis_pakan + '" sisa ' + f.hari_bertahan + ' hari. Rencanakan pembelian.',
        timestamp: new Date().toISOString()
      });
    }
  });

  processedCoops.forEach(function(c) {
    if (c.status === 'KRITIS') {
      alerts.push({
        id: 'ALT-MORT-' + c.id, severity: 'critical',
        title: 'Mortalitas Kritis: ' + c.nama_kandang,
        message: 'Mortality ' + c.mortality_rate + '% (>batas ' + mortCritThresh + '%). Periksa ventilasi & kesehatan segera!',
        timestamp: new Date().toISOString()
      });
    } else if (c.status === 'WASPADA') {
      alerts.push({
        id: 'ALT-WARN-' + c.id, severity: 'warning',
        title: 'Waspada Mortalitas: ' + c.nama_kandang,
        message: 'Mortality ' + c.mortality_rate + '%. Pantau kondisi air minum dan sirkulasi udara.',
        timestamp: new Date().toISOString()
      });
    }
    if (c.sisa_hari_panen <= 7 && c.sisa_hari_panen > 0) {
      alerts.push({
        id: 'ALT-HARV-' + c.id, severity: 'info',
        title: '🌸 Panen Mendekati: ' + c.nama_kandang,
        message: 'Estimasi panen dalam ' + c.sisa_hari_panen + ' hari (' + c.tanggal_panen_estimasi + '). Siapkan logistik.',
        timestamp: new Date().toISOString()
      });
    }
  });

  if (runningProfit > 0) {
    alerts.push({
      id: 'ALT-FIN-01', severity: 'success',
      title: 'Performa Finansial Surplus ♡',
      message: 'Running profit bersih: ' + formatRupiah(runningProfit) + ' dengan margin ' + profitMargin + '%.',
      timestamp: new Date().toISOString()
    });
  }

  // Commit to state
  state.coops    = processedCoops;
  state.feed     = processedFeed;
  state.alerts   = alerts;

  state.dashboard = {
    summary: {
      total_populasi:       totalHidup,
      total_ayam:           totalAyam,
      total_bebek:          totalBebek,
      total_awal:           totalAwal,
      total_mati:           totalMati,
      overall_mortality:    overallMortality,
      kandang_aktif:        processedCoops.length,
      kandang_status_counts:kandangStatusCounts,
      total_stok_pakan:     totalStokPakan,
      feed_days_remaining:  feedDaysRemaining,
      total_income:         totalIncome,
      total_expense:        totalExpense,
      running_profit:       runningProfit,
      profit_margin:        profitMargin,
      farm_health_score:    farmHealthScore
    },
    charts: {
      population_distribution: popDistribution,
      monitoring_trends:       state.monitoring
    }
  };
}

/* ==============================================================================
 * SECTION 11: AUTO-REFRESH SYSTEM
 * ============================================================================== */

function startAutoRefresh() {
  stopAutoRefresh();
  var sec = parseInt(state.settings.auto_refresh_interval || 30, 10);
  if (isNaN(sec) || sec < 10) sec = 30;

  state.autoRefreshIntervalId = setInterval(function() {
    // Don't refresh if user is interacting with a modal or form
    if (state.isSubmitting) return;
    var activeModals = document.querySelectorAll('.modal-overlay.active');
    if (activeModals.length > 0) return;
    loadData();
  }, sec * 1000);
}

function stopAutoRefresh() {
  if (state.autoRefreshIntervalId) {
    clearInterval(state.autoRefreshIntervalId);
    state.autoRefreshIntervalId = null;
  }
}

function restartAutoRefresh() {
  stopAutoRefresh();
  startAutoRefresh();
}

function manualRefresh() {
  if (state.loading) return;
  loadData();
  showToast('Data sedang disegarkan ♡', 'info');
}

/* ==============================================================================
 * SECTION 12: NAVIGATION / VIEW ROUTING
 * ============================================================================== */

function switchView(viewName) {
  // Guard: check permission for restricted views
  if (viewName === 'users' && !hasPermission('manage_users')) {
    showToast('Akses ditolak. Halaman ini hanya untuk Admin.', 'error');
    return;
  }
  if (viewName === 'settings' && !hasPermission('change_settings')) {
    showToast('Akses ditolak. Pengaturan hanya untuk Admin.', 'error');
    return;
  }
  if (viewName === 'finances' && !hasPermission('finances')) {
    showToast('Akses ditolak.', 'error');
    return;
  }

  state.currentView = viewName;
  closeMobileSidebar();

  // Toggle view sections
  document.querySelectorAll('.view-section').forEach(function(sec) {
    sec.classList.remove('active');
  });
  var target = document.getElementById('view-' + viewName);
  if (target) target.classList.add('active');

  // Update nav active states
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) item.classList.add('active');
  });
  document.querySelectorAll('.bottom-nav-item').forEach(function(item) {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) item.classList.add('active');
  });

  renderActiveView();
}

function renderActiveView() {
  if (!state.dashboard) return;

  switch (state.currentView) {
    case 'dashboard': renderSummaryCards(); renderCoopCards(); renderAlerts(); renderCharts(); break;
    case 'coops':     renderCoopsFullView();    break;
    case 'feed':      renderFeedFullView();     break;
    case 'finances':  renderFinancesFullView(); break;
    case 'analytics': renderAnalyticsFullView();break;
    case 'alerts':    renderAlertsFullView();   break;
    case 'users':     renderUsersView();        break;
    case 'settings':  renderSettingsFullView(); break;
  }
}

/* ==============================================================================
 * SECTION 13: RENDERERS — DASHBOARD
 * ============================================================================== */

function renderSummaryCards() {
  var s         = state.dashboard.summary;
  var container = document.getElementById('summaryKpiGrid');
  if (!container) return;

  container.innerHTML = [
    // 1. Total Populasi
    kpiCard(
      'icon-ribbon', 'neutral', 'Populasi Total',
      'Total Unggas Farm',
      formatNumber(s.total_populasi) + ' <span class="kpi-value-unit">ekor</span>',
      '🐔 ' + formatNumber(s.total_ayam) + ' Ayam &nbsp;•&nbsp; 🦆 ' + formatNumber(s.total_bebek) + ' Bebek'
    ),
    // 2. Kandang
    kpiCard(
      'icon-coop', 'trend-up', (s.kandang_status_counts.AMAN || 0) + ' Aman',
      'Kandang Beroperasi',
      s.kandang_aktif + ' <span class="kpi-value-unit">Unit</span>',
      '<span style="color:var(--color-warning);">⚠ ' + (s.kandang_status_counts.WASPADA || 0) + ' Waspada</span> &nbsp;•&nbsp; <span style="color:var(--color-danger);">🚨 ' + (s.kandang_status_counts.KRITIS || 0) + ' Kritis</span>'
    ),
    // 3. Mortalitas
    kpiCard(
      'icon-heart',
      s.overall_mortality > 7 ? 'trend-down' : (s.overall_mortality > 3 ? 'neutral' : 'trend-up'),
      s.overall_mortality <= 3 ? 'Optimal ♡' : (s.overall_mortality <= 7 ? 'Waspada' : 'Tinggi!'),
      'Rata-rata Mortality',
      s.overall_mortality + '%',
      'Total mati: <b>' + formatNumber(s.total_mati) + '</b> dari ' + formatNumber(s.total_awal) + ' ekor'
    ),
    // 4. Pakan
    kpiCard(
      'icon-feed',
      s.feed_days_remaining < 3 ? 'trend-down' : (s.feed_days_remaining <= 7 ? 'neutral' : 'trend-up'),
      s.feed_days_remaining < 3 ? '🚨 Kritis' : (s.feed_days_remaining <= 7 ? '⚠ Perlu Order' : '✓ Cukup'),
      'Ketahanan Stok Pakan',
      s.feed_days_remaining + ' <span class="kpi-value-unit">Hari</span>',
      'Stok gudang: <b>' + formatNumber(s.total_stok_pakan) + ' kg</b>'
    ),
    // 5. Omset
    kpiCard(
      'icon-finance', 'trend-up', 'Omset',
      'Total Penerimaan',
      formatRupiah(s.total_income),
      'Biaya operasional: ' + formatRupiah(s.total_expense)
    ),
    // 6. Profit
    kpiCard(
      'icon-analytics',
      s.running_profit >= 0 ? 'trend-up' : 'trend-down',
      s.running_profit >= 0 ? 'Surplus ♡' : 'Defisit',
      'Running Profit Bersih',
      '<span style="color:' + (s.running_profit >= 0 ? 'var(--color-secondary)' : 'var(--color-danger)') + ';">' + formatRupiah(s.running_profit) + '</span>',
      'Margin: <b>' + s.profit_margin + '%</b>'
    )
  ].join('');

  // Update sidebar health radial
  var healthVal    = document.getElementById('sidebarHealthScore');
  var healthRadial = document.getElementById('sidebarHealthRadial');
  var healthLabel  = document.getElementById('sidebarHealthLabel');
  if (healthVal)    healthVal.textContent = s.farm_health_score;
  if (healthRadial) healthRadial.style.background =
    'conic-gradient(var(--color-primary) 0% ' + s.farm_health_score + '%, var(--color-border) ' + s.farm_health_score + '% 100%)';
  if (healthLabel)  healthLabel.textContent = s.farm_health_score >= 85 ? 'Kondisi Prima ♡' : 'Perlu Pengawasan';
}

/** Helper: generate a KPI card HTML */
function kpiCard(iconId, badgeClass, badgeText, label, value, subtext) {
  return '<div class="kpi-card">' +
    '<div class="kpi-top">' +
    '<div class="kpi-icon-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#' + iconId + '"></use></svg></div>' +
    '<span class="kpi-badge ' + badgeClass + '">' + badgeText + '</span>' +
    '</div>' +
    '<div class="kpi-label">' + label + '</div>' +
    '<div class="kpi-value">' + value + '</div>' +
    '<div class="kpi-subtext">' + subtext + '</div>' +
    '</div>';
}

function renderCoopCards() {
  var container = document.getElementById('todayCoopGrid');
  if (!container) return;

  var filtered = filterCoopsList();

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">' +
      '<div class="heart-icon">♡</div>' +
      '<h4>Belum Ada Kandang</h4>' +
      '<p>Tidak ada kandang sesuai filter. Tambahkan kandang baru atau ubah kriteria filter.</p>' +
      (hasPermission('add_coop') ? '<button class="btn-primary" onclick="openAddCoopModal()">+ Tambah Kandang ♡</button>' : '') +
      '</div>';
    return;
  }

  container.innerHTML = filtered.map(function(coop) {
    var statusClass = coop.status === 'KRITIS' ? 'status-kritis' : (coop.status === 'WASPADA' ? 'status-waspada' : 'status-aman');
    var fillClass   = coop.status === 'KRITIS' ? 'fill-crit' : (coop.status === 'WASPADA' ? 'fill-warn' : 'fill-safe');
    var mortColor   = coop.mortality_rate > 7 ? 'var(--color-danger)' : (coop.mortality_rate > 3 ? 'var(--color-warning)' : 'var(--color-success)');
    var progress    = Math.min(100, Math.round((coop.umur_hari / (coop.target_panen_hari || 35)) * 100));
    var catatan     = escHtml(coop.catatan || 'Kondisi kandang terpantau teratur.');
    var isAdmin     = hasPermission('edit_coop');

    return '<div class="coop-card" role="listitem">' +
      '<div class="coop-card-header">' +
      '<div class="coop-badge-id"><span class="heart">♡</span>' + escHtml(coop.id) + '</div>' +
      '<div class="status-pill ' + statusClass + '">' + escHtml(coop.status) + '</div>' +
      '</div>' +
      '<div class="coop-name">' + escHtml(coop.nama_kandang) + '</div>' +
      '<div class="coop-type">' + escHtml(coop.jenis_unggas) + ' • Umur ' + coop.umur_hari + ' Hari</div>' +
      '<div class="coop-metrics-row">' +
      '<div class="coop-metric-item"><div class="label">Populasi Hidup</div><div class="val">' + formatNumber(coop.jumlah_hidup) + '</div><div class="sub">dari ' + formatNumber(coop.jumlah_awal) + ' ekor</div></div>' +
      '<div class="coop-metric-item"><div class="label">Mortality Rate</div><div class="val" style="color:' + mortColor + ';">' + coop.mortality_rate + '%</div><div class="sub">' + coop.jumlah_mati + ' ekor mati</div></div>' +
      '</div>' +
      '<div class="progress-bar-wrapper">' +
      '<div class="progress-header"><span>Estimasi Panen (' + coop.sisa_hari_panen + ' hari)</span><span>' + escHtml(coop.tanggal_panen_estimasi) + '</span></div>' +
      '<div class="progress-track"><div class="progress-fill ' + fillClass + '" style="width:' + progress + '%"></div></div>' +
      '</div>' +
      '<div class="coop-card-note">"' + catatan + '"</div>' +
      '<div class="coop-card-footer">' +
      '<span>FCR: <b>' + coop.fcr + '</b> (' + escHtml(coop.fcr_status) + ')</span>' +
      (isAdmin
        ? '<div class="coop-actions">' +
          '<button type="button" class="btn-action edit" onclick="openEditCoopModal(\'' + coop.id + '\')"><svg viewBox="0 0 24 24"><use href="#icon-edit"></use></svg><span>Edit</span></button>' +
          '<button type="button" class="btn-action danger" onclick="confirmDeleteCoop(\'' + coop.id + '\', \'' + escHtml(coop.nama_kandang) + '\')"><svg viewBox="0 0 24 24"><use href="#icon-trash"></use></svg><span>Hapus</span></button>' +
          '</div>'
        : '') +
      '</div>' +
      '</div>';
  }).join('');
}

function filterCoopsList() {
  return state.coops.filter(function(c) {
    var q = state.searchQuery.toLowerCase().trim();
    if (q) {
      var matchName  = (c.nama_kandang || '').toLowerCase().includes(q);
      var matchId    = (c.id || '').toLowerCase().includes(q);
      var matchJenis = (c.jenis_unggas || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchJenis) return false;
    }
    if (state.activeFilter === 'ALL')     return true;
    if (state.activeFilter === 'AYAM')    return (c.jenis_unggas || '').toLowerCase().includes('ayam');
    if (state.activeFilter === 'BEBEK')   return (c.jenis_unggas || '').toLowerCase().includes('bebek');
    if (state.activeFilter === 'AMAN')    return c.status === 'AMAN';
    if (state.activeFilter === 'WASPADA') return c.status === 'WASPADA';
    if (state.activeFilter === 'KRITIS')  return c.status === 'KRITIS';
    return true;
  });
}

function handleSearchCoop(e) {
  state.searchQuery = e.target.value;
  renderCoopCards();
  if (state.currentView === 'coops') renderCoopsFullView();
}

function setCoopFilter(filterKey) {
  state.activeFilter = filterKey;
  document.querySelectorAll('.filter-pill').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('data-filter') === filterKey) btn.classList.add('active');
  });
  renderCoopCards();
  if (state.currentView === 'coops') renderCoopsFullView();
}

function renderAlerts() {
  var container = document.getElementById('dashboardAlertFeed');
  if (!container) return;

  if (state.alerts.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--color-muted);font-size:13px;">Semua kandang dan stok pakan dalam kondisi prima ♡</div>';
    return;
  }

  container.innerHTML = state.alerts.slice(0, 5).map(function(alt) {
    return '<div class="alert-item severity-' + alt.severity + '" role="listitem">' +
      '<div class="alert-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-bell"></use></svg></div>' +
      '<div class="alert-content"><h5>' + escHtml(alt.title) + '</h5><p>' + escHtml(alt.message) + '</p></div>' +
      '</div>';
  }).join('');
}

function renderLoadingSkeletons() {
  var container = document.getElementById('summaryKpiGrid');
  if (!container) return;
  var html = '';
  for (var i = 0; i < 6; i++) {
    html += '<div class="kpi-card"><div class="skeleton" style="height:40px;width:40px;border-radius:12px;margin-bottom:14px;"></div><div class="skeleton" style="height:12px;width:60%;margin-bottom:10px;"></div><div class="skeleton" style="height:26px;width:80%;margin-bottom:8px;"></div><div class="skeleton" style="height:10px;width:50%;"></div></div>';
  }
  container.innerHTML = html;
}

/* ==============================================================================
 * SECTION 14: CANVAS CHARTS
 * ============================================================================== */

function renderCharts() {
  if (!state.dashboard) return;
  renderMonitoringLineChart();
  renderDistributionDonutChart();
  renderFinanceBarChart();
}

function getCanvasCtx(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  var ctx = canvas.getContext('2d');
  var dpr  = window.devicePixelRatio || 1;
  var rect  = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  return { ctx: ctx, w: rect.width, h: rect.height };
}

function renderMonitoringLineChart() {
  var c = getCanvasCtx('canvasTrend');
  if (!c) return;
  var ctx = c.ctx, w = c.w, h = c.h;
  ctx.clearRect(0, 0, w, h);

  var trends = (state.dashboard.charts && state.dashboard.charts.monitoring_trends) || [];
  if (trends.length < 2) return;

  var isDark = state.activeTheme === 'dark';
  var gridColor = isDark ? '#3D2631' : '#FAD5DF';
  var lineColor = isDark ? '#F48FB1' : '#E4728F';
  var dotColor  = isDark ? '#F48FB1' : '#5E192D';
  var textColor = '#846B75';

  var padL = 46, padR = 16, padT = 24, padB = 28;
  var chartW = w - padL - padR;
  var chartH = h - padT - padB;
  var maxVal = 10;
  var stepX  = chartW / (trends.length - 1);

  // Grid & Y-axis labels
  ctx.strokeStyle = gridColor;
  ctx.lineWidth   = 0.8;
  ctx.fillStyle   = textColor;
  ctx.font        = '10px Plus Jakarta Sans';
  ctx.textAlign   = 'right';
  ctx.textBaseline = 'middle';

  for (var i = 0; i <= 5; i++) {
    var yVal = (maxVal / 5) * i;
    var yPos = padT + chartH - ((yVal / maxVal) * chartH);
    ctx.beginPath();
    ctx.moveTo(padL, yPos);
    ctx.lineTo(w - padR, yPos);
    ctx.stroke();
    ctx.fillText(yVal.toFixed(0) + '%', padL - 6, yPos);
  }

  // Gradient fill
  var grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0, isDark ? 'rgba(244,143,177,0.22)' : 'rgba(228,114,143,0.2)');
  grad.addColorStop(1, 'rgba(228,114,143,0)');

  ctx.beginPath();
  trends.forEach(function(item, idx) {
    var x = padL + idx * stepX;
    var y = padT + chartH - ((item.mortality_rate / maxVal) * chartH);
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(padL + chartW, padT + chartH);
  ctx.lineTo(padL, padT + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  trends.forEach(function(item, idx) {
    var x = padL + idx * stepX;
    var y = padT + chartH - ((item.mortality_rate / maxVal) * chartH);
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  // Dots & X-axis labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  trends.forEach(function(item, idx) {
    var x = padL + idx * stepX;
    var y = padT + chartH - ((item.mortality_rate / maxVal) * chartH);

    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();

    if (idx === 0 || idx === trends.length - 1 || idx % 2 === 0) {
      ctx.fillStyle = textColor;
      ctx.fillText(String(item.date || ''), x, h - padB + 6);
    }
  });
}

function renderDistributionDonutChart() {
  var c = getCanvasCtx('canvasDonut');
  if (!c) return;
  var ctx = c.ctx, w = c.w, h = c.h;
  ctx.clearRect(0, 0, w, h);

  var dist   = (state.dashboard.charts && state.dashboard.charts.population_distribution) || {};
  var keys   = Object.keys(dist);
  var total  = 0;
  keys.forEach(function(k) { total += dist[k]; });
  if (total === 0) return;

  var isDark    = state.activeTheme === 'dark';
  var colors    = ['#E4728F', '#5E192D', '#E5A43D', '#2E7D52', '#846B75', '#3B82F6'];
  var cx        = w / 2;
  var cy        = h / 2 - 10;
  var radius    = Math.min(cx, cy) - 10;
  var innerRad  = radius * 0.6;
  var startAngle = -Math.PI / 2;

  keys.forEach(function(k, idx) {
    var sliceAngle = (dist[k] / total) * (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(cx, cy, radius,   startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerRad, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[idx % colors.length];
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Center text
  ctx.fillStyle = isDark ? '#FFF0F4' : '#5E192D';
  ctx.font      = 'bold 14px Playfair Display, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatNumber(total), cx, cy - 4);
  ctx.font      = '9px Plus Jakarta Sans, sans-serif';
  ctx.fillStyle = '#846B75';
  ctx.fillText('Ekor', cx, cy + 12);
}

function renderFinanceBarChart() {
  var c = getCanvasCtx('canvasFinance');
  if (!c) return;
  var ctx = c.ctx, w = c.w, h = c.h;
  ctx.clearRect(0, 0, w, h);

  var income  = Math.max(state.dashboard.summary.total_income,  1);
  var expense = Math.max(state.dashboard.summary.total_expense, 1);
  var maxVal  = Math.max(income, expense) * 1.18;

  var barW   = Math.min(50, (w - 60) / 3);
  var gap    = barW * 0.8;
  var totalW = barW * 2 + gap;
  var startX = (w - totalW) / 2;
  var bottomY = h - 28;
  var chartH  = bottomY - 20;

  // Bars with rounded top
  var incH = (income / maxVal) * chartH;
  ctx.fillStyle = '#2E7D52';
  drawRoundRect(ctx, startX, bottomY - incH, barW, incH, 5);

  var expH = (expense / maxVal) * chartH;
  ctx.fillStyle = '#E11D48';
  drawRoundRect(ctx, startX + barW + gap, bottomY - expH, barW, expH, 5);

  // Labels
  ctx.fillStyle   = '#846B75';
  ctx.font        = '10px Plus Jakarta Sans, sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Income',  startX + barW / 2,          h - 8);
  ctx.fillText('Expense', startX + barW + gap + barW / 2, h - 8);

  // Values above bars
  var isDark = state.activeTheme === 'dark';
  ctx.fillStyle = isDark ? '#FFF0F4' : '#5E192D';
  ctx.font      = 'bold 9px Plus Jakarta Sans, sans-serif';
  ctx.fillText(shortRupiah(income),  startX + barW / 2,           bottomY - incH - 5);
  ctx.fillText(shortRupiah(expense), startX + barW + gap + barW/2, bottomY - expH - 5);
}

function drawRoundRect(ctx, x, y, w, h, r) {
  if (h <= 0) return;
  if (h < r * 2) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function shortRupiah(val) {
  if (val >= 1000000000) return 'Rp' + (val / 1000000000).toFixed(1) + 'M';
  if (val >= 1000000)    return 'Rp' + (val / 1000000).toFixed(1) + 'jt';
  if (val >= 1000)       return 'Rp' + (val / 1000).toFixed(0) + 'rb';
  return 'Rp' + val;
}

/* ==============================================================================
 * SECTION 15: FULL VIEW RENDERERS
 * ============================================================================== */

function renderCoopsFullView() {
  var container = document.getElementById('coopsFullContainer');
  if (!container) return;

  var isAdmin = hasPermission('add_coop');

  container.innerHTML =
    '<div class="section-header">' +
    '<div><h2 class="section-title">Manajemen Seluruh Kandang ♡</h2>' +
    '<p class="section-subtitle">Daftar lengkap kandang ayam & bebek dengan kalkulator panen dan status kesehatan.</p></div>' +
    (isAdmin ? '<button class="btn-primary" onclick="openAddCoopModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><use href="#icon-plus"></use></svg> Tambah Kandang ♡</button>' : '') +
    '</div>' +
    '<div class="filter-search-bar">' +
    '<div class="search-input-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-search"></use></svg>' +
    '<input type="text" id="coopSearchInputFull" placeholder="Cari kandang..." oninput="handleSearchCoop(event)" value="' + escAttr(state.searchQuery) + '" /></div>' +
    '<div class="filter-pills">' +
    ['ALL','AYAM','BEBEK','AMAN','WASPADA','KRITIS'].map(function(f) {
      var labels = { ALL:'Semua', AYAM:'Ayam', BEBEK:'Bebek', AMAN:'Aman', WASPADA:'Waspada', KRITIS:'Kritis' };
      return '<button type="button" class="filter-pill' + (state.activeFilter === f ? ' active' : '') + '" data-filter="' + f + '" onclick="setCoopFilter(\'' + f + '\')">' + labels[f] + '</button>';
    }).join('') +
    '</div></div>' +
    '<div class="coop-grid" id="fullCoopGrid"></div>';

  // Render cards into the grid
  setTimeout(function() {
    var grid = document.getElementById('fullCoopGrid');
    if (grid) {
      // Re-render coop cards into this grid using the existing filtered data
      var originalContainer = document.getElementById('todayCoopGrid');
      if (originalContainer && originalContainer.innerHTML) {
        grid.innerHTML = originalContainer.innerHTML;
      } else {
        // Fallback: re-render directly
        var tmpEl = document.createElement('div');
        tmpEl.id = 'tmpCoopRender';
        document.body.appendChild(tmpEl);
        var saved = document.getElementById('todayCoopGrid');
        var filtered = filterCoopsList();
        grid.innerHTML = filtered.map(function(coop) {
          var statusClass = coop.status === 'KRITIS' ? 'status-kritis' : (coop.status === 'WASPADA' ? 'status-waspada' : 'status-aman');
          var fillClass   = coop.status === 'KRITIS' ? 'fill-crit' : (coop.status === 'WASPADA' ? 'fill-warn' : 'fill-safe');
          var mortColor   = coop.mortality_rate > 7 ? 'var(--color-danger)' : (coop.mortality_rate > 3 ? 'var(--color-warning)' : 'var(--color-success)');
          var progress    = Math.min(100, Math.round((coop.umur_hari / (coop.target_panen_hari || 35)) * 100));
          return '<div class="coop-card">' +
            '<div class="coop-card-header"><div class="coop-badge-id"><span class="heart">♡</span>' + escHtml(coop.id) + '</div><div class="status-pill ' + statusClass + '">' + escHtml(coop.status) + '</div></div>' +
            '<div class="coop-name">' + escHtml(coop.nama_kandang) + '</div>' +
            '<div class="coop-type">' + escHtml(coop.jenis_unggas) + ' • Umur ' + coop.umur_hari + ' Hari</div>' +
            '<div class="coop-metrics-row"><div class="coop-metric-item"><div class="label">Populasi Hidup</div><div class="val">' + formatNumber(coop.jumlah_hidup) + '</div><div class="sub">dari ' + formatNumber(coop.jumlah_awal) + ' ekor</div></div>' +
            '<div class="coop-metric-item"><div class="label">Mortality Rate</div><div class="val" style="color:' + mortColor + ';">' + coop.mortality_rate + '%</div><div class="sub">' + coop.jumlah_mati + ' mati</div></div></div>' +
            '<div class="progress-bar-wrapper"><div class="progress-header"><span>' + coop.sisa_hari_panen + ' hari lagi</span><span>' + escHtml(coop.tanggal_panen_estimasi) + '</span></div><div class="progress-track"><div class="progress-fill ' + fillClass + '" style="width:' + progress + '%"></div></div></div>' +
            '<div class="coop-card-note">"' + escHtml(coop.catatan || 'Terpantau normal.') + '"</div>' +
            '<div class="coop-card-footer"><span>FCR: <b>' + coop.fcr + '</b> (' + escHtml(coop.fcr_status) + ')</span>' +
            (hasPermission('edit_coop') ? '<div class="coop-actions"><button type="button" class="btn-action edit" onclick="openEditCoopModal(\'' + coop.id + '\')"><svg viewBox="0 0 24 24"><use href="#icon-edit"></use></svg><span>Edit</span></button><button type="button" class="btn-action danger" onclick="confirmDeleteCoop(\'' + coop.id + '\',\'' + escHtml(coop.nama_kandang) + '\')"><svg viewBox="0 0 24 24"><use href="#icon-trash"></use></svg><span>Hapus</span></button></div>' : '') +
            '</div></div>';
        }).join('') || '<div class="empty-state"><div class="heart-icon">♡</div><h4>Belum Ada Data Kandang</h4><p>Tambahkan kandang pertama Anda.</p></div>';
        document.body.removeChild(tmpEl);
      }
    }
  }, 0);
}

function renderFeedFullView() {
  var container = document.getElementById('feedFullContainer');
  if (!container) return;

  var isAdmin = hasPermission('add_feed');
  var html = '<div class="section-header"><div><h2 class="section-title">Pakan & Logistik Gudang ♡</h2>' +
    '<p class="section-subtitle">Prediksi ketahanan stok pakan otomatis berdasarkan rata-rata konsumsi harian.</p></div>' +
    (isAdmin ? '<button class="btn-primary" onclick="openAddFeedModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><use href="#icon-plus"></use></svg> Catat Pakan ♡</button>' : '') +
    '</div>';

  if (state.feed.length === 0) {
    html += '<div class="empty-state"><div class="heart-icon">♡</div><h4>Belum Ada Data Pakan</h4><p>Tambahkan catatan pakan pertama.</p></div>';
  } else {
    html += '<div class="table-responsive"><table class="custom-table"><thead><tr>' +
      '<th>ID Pakan</th><th>Jenis Pakan</th><th>Kandang</th><th>Stok Sisa (Kg)</th><th>Konsumsi/Hari</th><th>Hari Bertahan</th><th>Status</th><th>Supplier</th>' +
      '</tr></thead><tbody>' +
      state.feed.map(function(f) {
        var statusPill = f.status === 'CRITICAL'
          ? '<span class="status-pill status-kritis">Kritis</span>'
          : (f.status === 'WARNING'
            ? '<span class="status-pill status-waspada">Waspada</span>'
            : '<span class="status-pill status-aman">Aman</span>');
        return '<tr><td><b>' + escHtml(f.id) + '</b></td>' +
          '<td><b>' + escHtml(f.jenis_pakan) + '</b></td>' +
          '<td>' + escHtml(f.kandang_id || 'Semua') + '</td>' +
          '<td><b>' + formatNumber(f.stok_sisa) + ' kg</b></td>' +
          '<td>' + f.konsumsi_harian + ' kg/hari</td>' +
          '<td><b style="color:' + (f.hari_bertahan < 3 ? 'var(--color-danger)' : 'var(--color-secondary)') + ';">' + f.hari_bertahan + ' Hari</b></td>' +
          '<td>' + statusPill + '</td>' +
          '<td>' + escHtml(f.supplier || '—') + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  container.innerHTML = html;
}

function renderFinancesFullView() {
  var container = document.getElementById('financesFullContainer');
  if (!container) return;

  var isAdmin = hasPermission('add_transaction');
  var s       = state.dashboard ? state.dashboard.summary : {};
  var html = '<div class="section-header"><div><h2 class="section-title">Catatan Keuangan & Arus Kas ♡</h2>' +
    '<p class="section-subtitle">Pencatatan mutasi transaksi operasional, penjualan panen ayam/bebek/telur.</p></div>' +
    (isAdmin ? '<button class="btn-primary" onclick="openAddTransactionModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><use href="#icon-plus"></use></svg> Tambah Transaksi ♡</button>' : '') +
    '</div>';

  // Finance summary cards
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">' +
    '<div class="card-panel" style="padding:18px;"><div class="kpi-label">Total Pemasukan</div><div class="kpi-value" style="font-size:22px;color:var(--color-success);">' + formatRupiah(s.total_income || 0) + '</div></div>' +
    '<div class="card-panel" style="padding:18px;"><div class="kpi-label">Total Pengeluaran</div><div class="kpi-value" style="font-size:22px;color:var(--color-danger);">' + formatRupiah(s.total_expense || 0) + '</div></div>' +
    '<div class="card-panel" style="padding:18px;"><div class="kpi-label">Profit Bersih</div><div class="kpi-value" style="font-size:22px;color:' + ((s.running_profit || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + formatRupiah(s.running_profit || 0) + '</div></div>' +
    '</div>';

  if (state.finances.length === 0) {
    html += '<div class="empty-state"><div class="heart-icon">♡</div><h4>Belum Ada Transaksi</h4><p>Catat transaksi pertama Anda.</p></div>';
  } else {
    html += '<div class="table-responsive"><table class="custom-table"><thead><tr>' +
      '<th>ID</th><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Deskripsi</th><th>Nominal</th><th>Metode</th><th>Kandang</th>' +
      (isAdmin ? '<th class="th-actions">Aksi</th>' : '') +
      '</tr></thead><tbody>' +
      state.finances.map(function(trx) {
        var isIncome = String(trx.tipe || '').toUpperCase() === 'INCOME';
        return '<tr>' +
          '<td><b>' + escHtml(trx.id) + '</b></td>' +
          '<td>' + (trx.tanggal ? String(trx.tanggal).substring(0, 10) : '—') + '</td>' +
          '<td><span class="badge-trx ' + (isIncome ? 'badge-income' : 'badge-expense') + '">' + (isIncome ? 'Pemasukan' : 'Pengeluaran') + '</span></td>' +
          '<td><b>' + escHtml(trx.kategori || '—') + '</b></td>' +
          '<td>' + escHtml(trx.deskripsi || '—') + '</td>' +
          '<td style="font-weight:700;color:' + (isIncome ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + (isIncome ? '+' : '−') + ' ' + formatRupiah(trx.nominal) + '</td>' +
          '<td>' + escHtml(trx.metode_pembayaran || '—') + '</td>' +
          '<td>' + escHtml(trx.kandang_id || '—') + '</td>' +
          (isAdmin ? '<td class="td-actions"><div class="action-buttons"><button type="button" class="btn-action danger" onclick="confirmDeleteTransaction(\'' + trx.id + '\')" title="Hapus Transaksi"><svg viewBox="0 0 24 24"><use href="#icon-trash"></use></svg><span>Hapus</span></button></div></td>' : '') +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  container.innerHTML = html;
}

function renderAnalyticsFullView() {
  var container = document.getElementById('analyticsFullContainer');
  if (!container) return;

  var s = state.dashboard.summary;
  var statusLabel = s.farm_health_score >= 85 ? 'Sangat Prima ♡' : (s.farm_health_score >= 60 ? 'Cukup Baik' : 'Perlu Perhatian');

  container.innerHTML =
    '<div class="section-header"><div><h2 class="section-title">Smart Analytics & Health Score ♡</h2>' +
    '<p class="section-subtitle">Evaluasi performa peternakan holistik, FCR, mortalitas, dan indeks kesehatan kandang.</p></div></div>' +

    '<div class="dashboard-grid-2col" style="margin-bottom:24px;">' +
    // Health Score Card
    '<div class="card-panel">' +
    '<div class="panel-header"><h3 class="panel-title"><span class="icon-wrapper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-heart"></use></svg></span> Farm Health Score</h3></div>' +
    '<div style="display:flex;align-items:center;gap:28px;padding:8px 0;flex-wrap:wrap;">' +
    '<div class="analytics-score-ring" style="background:conic-gradient(var(--color-primary) 0% ' + s.farm_health_score + '%, var(--color-border) ' + s.farm_health_score + '% 100%);">' +
    '<div class="analytics-score-inner"><span class="score-num">' + s.farm_health_score + '</span><span class="score-label">/ 100</span></div>' +
    '</div>' +
    '<div style="flex:1;min-width:150px;">' +
    '<h4 style="font-family:var(--font-serif);font-size:18px;color:var(--color-secondary);margin-bottom:8px;">' + statusLabel + '</h4>' +
    '<p style="font-size:12px;color:var(--color-muted);line-height:1.6;">Dihitung dari 4 parameter: Rasio Mortalitas (40%), Ketahanan Stok Pakan (25%), Kondisi Lingkungan (20%), dan Konsistensi Log Harian (15%).</p>' +
    '</div></div></div>' +

    // Finance Summary
    '<div class="card-panel">' +
    '<div class="panel-header"><h3 class="panel-title"><span class="icon-wrapper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-finance"></use></svg></span> Ringkasan Finansial</h3></div>' +
    '<div style="padding:4px 0;">' +
    '<div class="finance-summary-row"><span class="label">Omset Penjualan:</span><span class="value" style="color:var(--color-success);">' + formatRupiah(s.total_income) + '</span></div>' +
    '<div class="finance-summary-row"><span class="label">Biaya Operasional:</span><span class="value" style="color:var(--color-danger);">' + formatRupiah(s.total_expense) + '</span></div>' +
    '<div class="finance-summary-row" style="padding-top:12px;border-top:1px solid var(--color-border);margin-top:4px;"><span class="label"><b>Profit Bersih:</b></span><span class="value" style="font-size:16px;color:' + (s.running_profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)') + ';">' + formatRupiah(s.running_profit) + '</span></div>' +
    '<div class="finance-summary-row"><span class="label">Margin Keuntungan:</span><span class="value">' + s.profit_margin + '%</span></div>' +
    '</div></div>' +
    '</div>' + // end dashboard-grid-2col

    // Coop performance table
    '<div class="card-panel">' +
    '<div class="panel-header"><h3 class="panel-title"><span class="icon-wrapper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-coop"></use></svg></span> Performa per Kandang</h3></div>' +
    '<div class="table-responsive"><table class="custom-table"><thead><tr><th>Nama Kandang</th><th>Jenis</th><th>Populasi Hidup</th><th>Mortalitas</th><th>FCR</th><th>Sisa Panen</th><th>Status</th></tr></thead><tbody>' +
    state.coops.map(function(c) {
      return '<tr><td><b>' + escHtml(c.nama_kandang) + '</b></td>' +
        '<td>' + escHtml(c.jenis_unggas) + '</td>' +
        '<td>' + formatNumber(c.jumlah_hidup) + ' ekor</td>' +
        '<td style="color:' + (c.mortality_rate > 7 ? 'var(--color-danger)' : (c.mortality_rate > 3 ? 'var(--color-warning)' : 'var(--color-success)')) + ';font-weight:700;">' + c.mortality_rate + '%</td>' +
        '<td>' + c.fcr + ' (' + escHtml(c.fcr_status) + ')</td>' +
        '<td>' + c.sisa_hari_panen + ' hari</td>' +
        '<td><span class="status-pill ' + (c.status === 'KRITIS' ? 'status-kritis' : (c.status === 'WASPADA' ? 'status-waspada' : 'status-aman')) + '">' + escHtml(c.status) + '</span></td>' +
        '</tr>';
    }).join('') +
    '</tbody></table></div></div>';
}

function renderAlertsFullView() {
  var container = document.getElementById('alertsFullContainer');
  if (!container) return;

  container.innerHTML =
    '<div class="section-header"><div><h2 class="section-title">Pusat Peringatan Cerdas ♡</h2>' +
    '<p class="section-subtitle">Notifikasi otomatis: lonjakan mortalitas, stok pakan kritis, dan estimasi panen.</p></div></div>' +
    '<div class="alert-feed">' +
    (state.alerts.length === 0
      ? '<div class="empty-state"><div class="heart-icon">♡</div><h4>Tidak Ada Peringatan</h4><p>Semua kandang dan stok pakan dalam kondisi prima. Tetap pantau secara rutin!</p></div>'
      : state.alerts.map(function(alt) {
        return '<div class="alert-item severity-' + alt.severity + '">' +
          '<div class="alert-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-bell"></use></svg></div>' +
          '<div class="alert-content"><h5>' + escHtml(alt.title) + '</h5><p>' + escHtml(alt.message) + '</p>' +
          '<div class="time">Dicatat: ' + formatDateTime(alt.timestamp) + '</div></div>' +
          '</div>';
      }).join('')
    ) +
    '</div>';
}

function renderSettingsFullView() {
  if (!requirePermission('change_settings')) {
    document.getElementById('settingsFullContainer').innerHTML =
      '<div class="empty-state"><div class="heart-icon">🔒</div><h4>Akses Terbatas</h4><p>Pengaturan hanya dapat diakses oleh Administrator.</p></div>';
    return;
  }

  var st = state.settings;
  document.getElementById('settingsFullContainer').innerHTML =
    '<div class="section-header"><div><h2 class="section-title">Pengaturan Farm & Ambang Batas ♡</h2>' +
    '<p class="section-subtitle">Konfigurasi parameter peringatan pakan, batas mortalitas, dan interval sinkronisasi.</p></div></div>' +
    '<div class="settings-section">' +
    '<div class="settings-card">' +
    '<div class="settings-card-title"><svg viewBox="0 0 24 24"><use href="#icon-settings"></use></svg> Identitas Peternakan</div>' +
    '<form onsubmit="handleSaveSettings(event)" id="settingsForm">' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Nama Peternakan</label><input type="text" id="setFarmName" class="form-control" value="' + escAttr(st.farm_name || 'Farmelle Smart Farm') + '" required /></div>' +
    '<div class="form-group"><label class="form-label">Nama Pemilik / Manajer</label><input type="text" id="setOwnerName" class="form-control" value="' + escAttr(st.owner_name || 'Administrator') + '" required /></div>' +
    '</div>' +
    '<div class="settings-card-title" style="margin-top:20px;"><svg viewBox="0 0 24 24"><use href="#icon-alert"></use></svg> Ambang Batas Peringatan</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Batas Mortalitas Waspada (%)</label><input type="number" step="0.1" id="setMortWarn" class="form-control" value="' + escAttr(st.mortality_warning_threshold || '3.0') + '" required /></div>' +
    '<div class="form-group"><label class="form-label">Batas Mortalitas Kritis (%)</label><input type="number" step="0.1" id="setMortCrit" class="form-control" value="' + escAttr(st.mortality_critical_threshold || '7.0') + '" required /></div>' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Pakan Waspada (Hari)</label><input type="number" id="setFeedWarn" class="form-control" value="' + escAttr(st.feed_warning_days || '7') + '" required /></div>' +
    '<div class="form-group"><label class="form-label">Pakan Kritis (Hari)</label><input type="number" id="setFeedCrit" class="form-control" value="' + escAttr(st.feed_critical_days || '3') + '" required /></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Interval Auto-Refresh (Detik, min 10)</label><input type="number" id="setAutoRefresh" class="form-control" value="' + escAttr(st.auto_refresh_interval || '30') + '" min="10" required /></div>' +
    '<div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;">' +
    '<button type="submit" class="btn-primary">Simpan Pengaturan ♡</button>' +
    '<button type="button" class="btn-secondary" onclick="openConnectSupabaseModal()">Konfigurasi Supabase</button>' +
    '<button type="button" class="btn-secondary" onclick="confirmResetDemo()">Reset Data Demo</button>' +
    '</div>' +
    '</form></div></div>';
}

/* ==============================================================================
 * SECTION 16: USER MANAGEMENT (Admin only)
 * ============================================================================== */

function renderUsersView() {
  if (!requirePermission('manage_users')) {
    document.getElementById('usersFullContainer').innerHTML =
      '<div class="empty-state"><div class="heart-icon">🔒</div><h4>Akses Terbatas</h4><p>Halaman ini hanya dapat diakses oleh Administrator.</p></div>';
    return;
  }

  var container = document.getElementById('usersFullContainer');
  if (!container) return;

  var users = getDemoUsers();

  container.innerHTML =
    '<div class="section-header"><div><h2 class="section-title">Kelola Pengguna ♡</h2>' +
    '<p class="section-subtitle">Manajemen akun pengguna, peran (ADMIN/USER), dan status akses sistem Farmelle.</p></div>' +
    '<button class="btn-primary" onclick="openAddUserModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><use href="#icon-plus"></use></svg> Tambah Pengguna ♡</button>' +
    '</div>' +
    '<div class="card-panel">' +
    '<div class="table-responsive"><table class="custom-table"><thead><tr>' +
    '<th>Pengguna</th><th>Peran</th><th>Status</th><th>Login Terakhir</th><th class="th-actions">Aksi</th>' +
    '</tr></thead><tbody>' +
    (users.length === 0
      ? '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--color-muted);">Belum ada data pengguna.</td></tr>'
      : users.map(function(u) {
        var isSelf        = state.currentUser && u.user_id === state.currentUser.user_id;
        var roleClass     = u.role === 'ADMIN' ? 'role-admin' : 'role-user';
        var statusBtnText = u.status === 'ACTIVE' ? 'Nonaktifkan Akun' : 'Aktifkan Akun';
        var statusIcon    = u.status === 'ACTIVE' ? 'icon-lock' : 'icon-check';
        var initial       = escHtml((u.name || u.username || 'U').charAt(0).toUpperCase());
        return '<tr' + (isSelf ? ' class="user-row-self"' : '') + '>' +
          '<td>' +
          '<div class="user-cell">' +
          '<div class="user-avatar-sm ' + roleClass + '">' + initial + '</div>' +
          '<div class="user-cell-info">' +
          '<div class="user-cell-name">' + escHtml(u.name) + (isSelf ? ' <span class="badge-self">Anda ♡</span>' : '') + '</div>' +
          '<div class="user-cell-sub">@' + escHtml(u.username) + (u.created_at ? ' • Dibuat ' + formatDate(u.created_at) : '') + '</div>' +
          '</div></div>' +
          '</td>' +
          '<td><span class="role-badge ' + roleClass + '">' + escHtml(u.role) + '</span></td>' +
          '<td><span class="status-pill ' + (u.status === 'ACTIVE' ? 'status-aman' : 'status-kritis') + '">' + escHtml(u.status) + '</span></td>' +
          '<td>' + (u.last_login ? formatDate(u.last_login) : '<span style="color:var(--color-muted);">Belum pernah</span>') + '</td>' +
          '<td class="td-actions"><div class="action-btn-group">' +
          '<button type="button" class="btn-action-icon edit" onclick="openEditUserModal(\'' + u.user_id + '\')" title="Edit Data Pengguna" aria-label="Edit Pengguna"><svg viewBox="0 0 24 24"><use href="#icon-edit"></use></svg></button>' +
          (isSelf ? '' : '<button type="button" class="btn-action-icon ' + (u.status === 'ACTIVE' ? 'status-btn' : 'status-active') + '" onclick="handleToggleUserStatus(\'' + u.user_id + '\')" title="' + statusBtnText + '" aria-label="' + statusBtnText + '"><svg viewBox="0 0 24 24"><use href="#' + statusIcon + '"></use></svg></button>') +
          '<button type="button" class="btn-action-icon key" onclick="handleResetPassword(\'' + u.user_id + '\')" title="Reset Password Pengguna" aria-label="Reset Password"><svg viewBox="0 0 24 24"><use href="#icon-key"></use></svg></button>' +
          (isSelf ? '' : '<button type="button" class="btn-action-icon danger" onclick="confirmDeleteUser(\'' + u.user_id + '\', \'' + escHtml(u.name) + '\')" title="Hapus Pengguna" aria-label="Hapus Pengguna"><svg viewBox="0 0 24 24"><use href="#icon-trash"></use></svg></button>') +
          '</div></td></tr>';
      }).join('')
    ) +
    '</tbody></table></div></div>';
}

function openAddUserModal() {
  var form = document.getElementById('formUser');
  if (form) form.reset();
  document.getElementById('userEditId').value = '';
  document.getElementById('modalUserTitle').textContent = 'Tambah Pengguna Baru ♡';
  document.getElementById('userPasswordHint').textContent = 'Masukkan password baru untuk pengguna ini.';
  document.getElementById('userPassword').required = true;
  openModal('modalUser');
}

function openEditUserModal(userId) {
  var users = getDemoUsers();
  var user  = users.find(function(u) { return u.user_id === userId; });
  if (!user) return;

  document.getElementById('userEditId').value     = user.user_id;
  document.getElementById('userName').value       = user.name;
  document.getElementById('userUsername').value   = user.username;
  document.getElementById('userRole').value       = user.role;
  document.getElementById('userStatus').value     = user.status;
  document.getElementById('userPassword').value   = '';
  document.getElementById('userPassword').required = false;
  document.getElementById('userPasswordHint').textContent = 'Kosongkan jika tidak ingin mengubah password.';
  document.getElementById('modalUserTitle').textContent = 'Edit Pengguna: ' + user.name;
  openModal('modalUser');
}

async function handleUserSubmit(e) {
  e.preventDefault();
  if (!requirePermission('manage_users')) return;

  state.isSubmitting = true;
  var editId   = document.getElementById('userEditId').value;
  var name     = document.getElementById('userName').value.trim();
  var username = document.getElementById('userUsername').value.trim().toLowerCase();
  var role     = document.getElementById('userRole').value;
  var status   = document.getElementById('userStatus').value;
  var password = document.getElementById('userPassword').value;

  if (!name || !username) {
    showToast('Nama dan username wajib diisi.', 'error');
    state.isSubmitting = false;
    return;
  }

  var users = getDemoUsers();

  // Check username uniqueness
  var dupUser = users.find(function(u) {
    return u.username === username && u.user_id !== editId;
  });
  if (dupUser) {
    showToast('Username "' + username + '" sudah digunakan.', 'error');
    state.isSubmitting = false;
    return;
  }

  if (editId) {
    // Edit
    var idx = users.findIndex(function(u) { return u.user_id === editId; });
    if (idx === -1) { state.isSubmitting = false; return; }

    users[idx].name     = name;
    users[idx].username = username;
    users[idx].role     = role;
    users[idx].status   = status;

    if (password && password.length >= 8) {
      users[idx].password_hash = await hashPassword(password);
    } else if (password && password.length > 0 && password.length < 8) {
      showToast('Password minimal 8 karakter.', 'error');
      state.isSubmitting = false;
      return;
    }

    saveDemoUsers(users);
    showToast('Data pengguna berhasil diperbarui ♡', 'success');
  } else {
    // Add
    if (!password || password.length < 8) {
      showToast('Password baru minimal 8 karakter.', 'error');
      state.isSubmitting = false;
      return;
    }

    var newUser = {
      user_id:       'USR-' + Date.now().toString(36).toUpperCase(),
      username:      username,
      password_hash: await hashPassword(password),
      name:          name,
      role:          role,
      status:        status,
      created_at:    new Date().toISOString(),
      last_login:    null
    };
    users.push(newUser);
    saveDemoUsers(users);
    showToast('Pengguna baru berhasil ditambahkan ♡', 'success');
  }

  state.isSubmitting = false;
  closeModal('modalUser');
  renderUsersView();
}

function confirmDeleteUser(userId, userName) {
  openConfirmModal({
    title:       'Hapus Pengguna?',
    message:     'Akun "' + userName + '" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.',
    confirmText: 'Ya, Hapus',
    iconType:    'danger',
    iconId:      'icon-trash',
    onConfirm: function() {
      var users = getDemoUsers().filter(function(u) { return u.user_id !== userId; });
      saveDemoUsers(users);
      showToast('Pengguna berhasil dihapus ♡', 'success');
      renderUsersView();
    }
  });
}

function handleToggleUserStatus(userId) {
  var users = getDemoUsers();
  var user  = users.find(function(u) { return u.user_id === userId; });
  if (!user) return;

  var newStatus   = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  var actionLabel = newStatus === 'ACTIVE' ? 'mengaktifkan' : 'menonaktifkan';

  openConfirmModal({
    title:       (newStatus === 'ACTIVE' ? 'Aktifkan' : 'Nonaktifkan') + ' Pengguna?',
    message:     'Anda akan ' + actionLabel + ' akun "' + user.name + '".',
    confirmText: newStatus === 'ACTIVE' ? 'Aktifkan' : 'Nonaktifkan',
    iconType:    newStatus === 'ACTIVE' ? 'warning' : 'danger',
    iconId:      'icon-shield',
    onConfirm: function() {
      user.status = newStatus;
      saveDemoUsers(users);
      showToast('Status pengguna diperbarui menjadi ' + newStatus + ' ♡', 'success');
      renderUsersView();
    }
  });
}

async function handleResetPassword(userId) {
  openConfirmModal({
    title:       'Reset Password?',
    message:     'Password akan direset. Masukkan password baru setelah konfirmasi.',
    confirmText: 'Reset Password',
    iconType:    'warning',
    iconId:      'icon-key',
    onConfirm: async function() {
      var newPass = prompt('Masukkan password baru (min. 8 karakter):');
      if (!newPass || newPass.length < 8) {
        showToast('Reset dibatalkan. Password minimal 8 karakter.', 'warning');
        return;
      }
      var users = getDemoUsers();
      var user  = users.find(function(u) { return u.user_id === userId; });
      if (user) {
        user.password_hash = await hashPassword(newPass);
        saveDemoUsers(users);
        showToast('Password berhasil direset ♡', 'success');
      }
    }
  });
}

/* ==============================================================================
 * SECTION 17: CRUD MUTATIONS (with permission guards)
 * ============================================================================== */

async function handleCoopSubmit(e) {
  e.preventDefault();
  if (!requirePermission('add_coop')) return;
  if (state.isSubmitting) return;
  state.isSubmitting = true;

  var editId = document.getElementById('coopEditId').value;
  var awal   = parseInt(document.getElementById('coopAwal').value, 10)  || 0;
  var mati   = parseInt(document.getElementById('coopMati').value, 10)  || 0;
  var mort   = awal > 0 ? (mati / awal) * 100 : 0;
  var status = mort > 7 ? 'KRITIS' : (mort > 3 ? 'WASPADA' : 'AMAN');

  var coopObj = {
    id:               editId || ('KND-' + Math.random().toString(36).substring(2, 6).toUpperCase()),
    nama_kandang:     document.getElementById('coopNama').value.trim(),
    jenis_unggas:     document.getElementById('coopJenis').value,
    jumlah_awal:      awal,
    jumlah_mati:      mati,
    umur_hari:        parseInt(document.getElementById('coopUmur').value, 10)        || 1,
    target_panen_hari:parseInt(document.getElementById('coopTargetPanen').value, 10) || 35,
    fcr:              parseFloat(document.getElementById('coopFcr').value)            || 1.5,
    status:           status,
    catatan:          document.getElementById('coopCatatan').value.trim()
  };

  if (supabaseClient) {
    try {
      if (editId) {
        await apiCall(function() { return supabaseClient.from('kandang').update(coopObj).eq('id', editId); });
      } else {
        await apiCall(function() { return supabaseClient.from('kandang').insert([coopObj]); });
      }
    } catch (err) {
      showToast('Gagal menyimpan ke Supabase. Data disimpan lokal.', 'warning');
    }
  }

  // Local sync
  var existingIdx = state.coops.findIndex(function(c) { return c.id === (editId || coopObj.id); });
  if (editId && existingIdx !== -1) {
    state.coops[existingIdx] = Object.assign({}, state.coops[existingIdx], coopObj);
  } else {
    state.coops.push(coopObj);
  }
  saveLocalDemoData();

  state.isSubmitting = false;
  closeModal('modalCoop');
  showToast(editId ? 'Kandang berhasil diperbarui ♡' : 'Kandang baru berhasil ditambahkan ♡', 'success');
  await loadData();
}

function confirmDeleteCoop(idKandang, namaKandang) {
  if (!requirePermission('delete_coop')) return;
  openConfirmModal({
    title:       'Hapus Kandang?',
    message:     'Kandang "' + namaKandang + '" akan dihapus permanen beserta seluruh datanya.',
    confirmText: 'Ya, Hapus',
    iconType:    'danger',
    iconId:      'icon-trash',
    onConfirm: function() { deleteCoop(idKandang); }
  });
}

async function deleteCoop(idKandang) {
  if (supabaseClient) {
    try {
      await apiCall(function() { return supabaseClient.from('kandang').delete().eq('id', idKandang); });
    } catch (err) {
      showToast('Gagal menghapus dari Supabase.', 'error');
    }
  }
  state.coops = state.coops.filter(function(c) { return c.id !== idKandang; });
  saveLocalDemoData();
  showToast('Kandang berhasil dihapus ♡', 'success');
  await loadData();
}

async function handleFeedSubmit(e) {
  e.preventDefault();
  if (!requirePermission('add_feed')) return;
  if (state.isSubmitting) return;
  state.isSubmitting = true;

  var feedObj = {
    id:              'PKN-' + Date.now().toString(36).toUpperCase(),
    tanggal:         new Date().toISOString().substring(0, 10),
    jenis_pakan:     document.getElementById('feedJenis').value.trim(),
    stok_masuk:      parseFloat(document.getElementById('feedMasuk').value)    || 0,
    stok_sisa:       parseFloat(document.getElementById('feedSisa').value)     || 0,
    konsumsi_harian: parseFloat(document.getElementById('feedKonsumsi').value) || 100,
    harga_per_kg:    parseFloat(document.getElementById('feedHarga').value)    || 9000,
    supplier:        document.getElementById('feedSupplier').value.trim(),
    kandang_id:      document.getElementById('feedKandangId').value
  };

  if (supabaseClient) {
    try {
      await apiCall(function() { return supabaseClient.from('pakan').insert([feedObj]); });
    } catch (err) {
      showToast('Gagal menyimpan pakan ke Supabase. Data disimpan lokal.', 'warning');
    }
  }

  state.feed.push(feedObj);
  saveLocalDemoData();
  state.isSubmitting = false;
  closeModal('modalFeed');
  showToast('Data pakan berhasil disimpan ♡', 'success');
  await loadData();
}

async function handleTransactionSubmit(e) {
  e.preventDefault();
  if (!requirePermission('add_transaction')) return;
  if (state.isSubmitting) return;
  state.isSubmitting = true;

  var trxObj = {
    id:                'TRX-' + Date.now().toString(36).toUpperCase(),
    tipe:              document.getElementById('trxTipe').value,
    kategori:          document.getElementById('trxKategori').value,
    deskripsi:         document.getElementById('trxDeskripsi').value.trim(),
    nominal:           parseFloat(document.getElementById('trxNominal').value) || 0,
    metode_pembayaran: document.getElementById('trxMetode').value,
    tanggal:           document.getElementById('trxTanggal').value,
    kandang_id:        document.getElementById('trxKandangId').value
  };

  if (supabaseClient) {
    try {
      await apiCall(function() { return supabaseClient.from('keuangan').insert([trxObj]); });
    } catch (err) {
      showToast('Gagal menyimpan transaksi ke Supabase. Data disimpan lokal.', 'warning');
    }
  }

  state.finances.unshift(trxObj);
  saveLocalDemoData();
  state.isSubmitting = false;
  closeModal('modalTransaction');
  showToast('Transaksi berhasil dicatat ♡', 'success');
  await loadData();
}

function confirmDeleteTransaction(idTrx) {
  if (!requirePermission('delete_transaction')) return;
  openConfirmModal({
    title:       'Hapus Transaksi?',
    message:     'Transaksi ID ' + idTrx + ' akan dihapus permanen.',
    confirmText: 'Ya, Hapus',
    iconType:    'danger',
    iconId:      'icon-trash',
    onConfirm: function() { deleteTransaction(idTrx); }
  });
}

async function deleteTransaction(idTrx) {
  if (supabaseClient) {
    try {
      await apiCall(function() { return supabaseClient.from('keuangan').delete().eq('id', idTrx); });
    } catch (err) {
      showToast('Gagal menghapus dari Supabase.', 'error');
    }
  }
  state.finances = state.finances.filter(function(t) { return t.id !== idTrx; });
  saveLocalDemoData();
  showToast('Transaksi berhasil dihapus ♡', 'success');
  await loadData();
}

async function handleMonitoringSubmit(e) {
  e.preventDefault();
  if (!requirePermission('add_monitoring')) return;
  if (state.isSubmitting) return;
  state.isSubmitting = true;

  var kandangId = document.getElementById('monKandangId').value;
  var mati      = parseInt(document.getElementById('monMati').value,  10) || 0;
  var hidup     = parseInt(document.getElementById('monHidup').value, 10) || 0;
  var total     = hidup + mati;
  var mortRate  = total > 0 ? parseFloat(((mati / total) * 100).toFixed(2)) : 0;
  var status    = mortRate > 7 ? 'KRITIS' : (mortRate > 3 ? 'WASPADA' : 'AMAN');

  var monObj = {
    kandang_id:       kandangId,
    jumlah_hidup:     hidup,
    jumlah_mati:      mati,
    mortality_rate:   mortRate,
    feed_consumption: parseFloat(document.getElementById('monFeed').value)   || 0,
    temperature:      parseFloat(document.getElementById('monTemp').value)   || 28.5,
    humidity:         parseFloat(document.getElementById('monHum').value)    || 65.0,
    health_score:     parseInt(document.getElementById('monHealth').value, 10) || 95,
    status:           status,
    timestamp:        new Date().toISOString()
  };

  if (supabaseClient) {
    try {
      await apiCall(function() { return supabaseClient.from('monitoring').insert([monObj]); });
      await apiCall(function() { return supabaseClient.from('kandang').update({ jumlah_mati: mati, status: status }).eq('id', kandangId); });
    } catch (err) {
      showToast('Gagal menyimpan monitoring ke Supabase. Data disimpan lokal.', 'warning');
    }
  }

  // Update local coop
  var coopIdx = state.coops.findIndex(function(c) { return c.id === kandangId; });
  if (coopIdx !== -1) {
    state.coops[coopIdx].jumlah_mati = mati;
    state.coops[coopIdx].status      = status;
  }

  state.monitoring.push({
    date:             new Date().toLocaleDateString('id-ID', { month: '2-digit', day: '2-digit' }),
    mortality_rate:   mortRate,
    feed_consumption: monObj.feed_consumption,
    temperature:      monObj.temperature
  });

  saveLocalDemoData();
  state.isSubmitting = false;
  closeModal('modalMonitoring');
  showToast('Log monitoring harian berhasil dicatat ♡', 'success');
  await loadData();
}

function handleSaveSettings(e) {
  e.preventDefault();
  if (!requirePermission('change_settings')) return;

  state.settings.farm_name                    = document.getElementById('setFarmName').value.trim();
  state.settings.owner_name                   = document.getElementById('setOwnerName').value.trim();
  state.settings.mortality_warning_threshold  = document.getElementById('setMortWarn').value;
  state.settings.mortality_critical_threshold = document.getElementById('setMortCrit').value;
  state.settings.feed_warning_days            = document.getElementById('setFeedWarn').value;
  state.settings.feed_critical_days           = document.getElementById('setFeedCrit').value;
  state.settings.auto_refresh_interval        = document.getElementById('setAutoRefresh').value;

  try {
    localStorage.setItem('farmelle_settings', JSON.stringify(state.settings));
  } catch (e) {}

  showToast('Pengaturan farm berhasil diperbarui ♡', 'success');
  restartAutoRefresh();
  updateUserDisplay();
  loadData();
}

/* ==============================================================================
 * SECTION 18: MODAL & SUPABASE HELPERS
 * ============================================================================== */

function openConnectSupabaseModal() {
  var urlEl = document.getElementById('supaUrlInput');
  var keyEl = document.getElementById('supaKeyInput');
  if (urlEl) urlEl.value = localStorage.getItem('farmelle_supabase_url') || SUPABASE_CONFIG.URL;
  if (keyEl) keyEl.value = localStorage.getItem('farmelle_supabase_key') || SUPABASE_CONFIG.ANON_KEY;
  openModal('modalSupabaseConnect');
}

function handleSaveSupabaseConfig(e) {
  e.preventDefault();
  var url = document.getElementById('supaUrlInput').value.trim();
  var key = document.getElementById('supaKeyInput').value.trim();

  if (url && key) {
    localStorage.setItem('farmelle_supabase_url', url);
    localStorage.setItem('farmelle_supabase_key', key);
    SUPABASE_CONFIG.URL      = url;
    SUPABASE_CONFIG.ANON_KEY = key;
    try {
      supabaseClient = supabase.createClient(url, key);
      showToast('Mencoba menyambungkan ke Supabase... ♡', 'info');
    } catch (err) {
      showToast('Gagal menyambung: ' + err.message, 'error');
    }
  } else {
    localStorage.removeItem('farmelle_supabase_url');
    localStorage.removeItem('farmelle_supabase_key');
    supabaseClient = null;
    showToast('Beralih ke Mode Demo ♡', 'info');
  }

  closeModal('modalSupabaseConnect');
  loadData();
}

function confirmResetDemo() {
  openConfirmModal({
    title:       'Reset Semua Data Demo?',
    message:     'Seluruh data demo (kandang, pakan, keuangan) akan direset ke kondisi awal. Tidak dapat dibatalkan.',
    confirmText: 'Reset Data',
    iconType:    'danger',
    iconId:      'icon-refresh',
    onConfirm: function() {
      localStorage.removeItem('farmelle_demo_coops');
      localStorage.removeItem('farmelle_demo_feed');
      localStorage.removeItem('farmelle_demo_fin');
      localStorage.removeItem('farmelle_demo_mon');
      showToast('Data demo berhasil direset ♡', 'success');
      loadData();
    }
  });
}

function openModal(modalId) {
  var el = document.getElementById(modalId);
  if (el) el.classList.add('active');
  stopAutoRefresh(); // pause refresh while modal is open
}

function closeModal(modalId) {
  var el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
  // Restart refresh if no other modals open
  var anyOpen = document.querySelectorAll('.modal-overlay.active');
  if (anyOpen.length === 0) restartAutoRefresh();
}

function openAddCoopModal() {
  if (!requirePermission('add_coop')) return;
  var form = document.getElementById('formCoop');
  if (form) form.reset();
  document.getElementById('coopEditId').value = '';
  document.getElementById('modalCoopTitle').textContent = 'Tambah Kandang Baru ♡';
  openModal('modalCoop');
}

function openEditCoopModal(idKandang) {
  if (!requirePermission('edit_coop')) return;
  var coop = state.coops.find(function(c) { return c.id === idKandang; });
  if (!coop) return;

  document.getElementById('coopEditId').value          = coop.id;
  document.getElementById('coopNama').value            = coop.nama_kandang || '';
  document.getElementById('coopJenis').value           = coop.jenis_unggas || 'Ayam Broiler';
  document.getElementById('coopAwal').value            = coop.jumlah_awal  || 0;
  document.getElementById('coopMati').value            = coop.jumlah_mati  || 0;
  document.getElementById('coopUmur').value            = coop.umur_hari    || 1;
  document.getElementById('coopTargetPanen').value     = coop.target_panen_hari || 35;
  document.getElementById('coopFcr').value             = coop.fcr           || 1.5;
  document.getElementById('coopCatatan').value         = coop.catatan       || '';
  document.getElementById('modalCoopTitle').textContent = 'Edit Kandang ' + coop.id + ' ♡';
  openModal('modalCoop');
}

function openAddFeedModal() {
  if (!requirePermission('add_feed')) return;
  var form = document.getElementById('formFeed');
  if (form) form.reset();
  populateSelectOptions();
  openModal('modalFeed');
}

function openAddTransactionModal() {
  if (!requirePermission('add_transaction')) return;
  var form = document.getElementById('formTransaction');
  if (form) form.reset();
  var dateEl = document.getElementById('trxTanggal');
  if (dateEl) dateEl.value = new Date().toISOString().substring(0, 10);
  updateCategoryOptions();
  populateSelectOptions();
  openModal('modalTransaction');
}

function openAddMonitoringModal() {
  if (!requirePermission('add_monitoring')) return;
  var form = document.getElementById('formMonitoring');
  if (form) form.reset();
  populateSelectOptions();
  populateCurrentCoopStats();
  openModal('modalMonitoring');
}

function updateCategoryOptions() {
  var typeEl = document.getElementById('trxTipe');
  var catEl  = document.getElementById('trxKategori');
  if (!typeEl || !catEl) return;
  var type = typeEl.value || 'INCOME';
  var list = CATEGORIES[type] || [];
  catEl.innerHTML = list.map(function(c) { return '<option value="' + escAttr(c) + '">' + escHtml(c) + '</option>'; }).join('');
}

function populateCurrentCoopStats() {
  var sel = document.getElementById('monKandangId');
  if (!sel || !sel.value) return;
  var coop = state.coops.find(function(c) { return c.id === sel.value; });
  if (coop) {
    var hiduEl = document.getElementById('monHidup');
    if (hiduEl) hiduEl.value = coop.jumlah_hidup || 0;
  }
}

function populateSelectOptions() {
  var coopOptions = state.coops.map(function(c) {
    return '<option value="' + escAttr(c.id) + '">' + escHtml(c.nama_kandang) + ' (' + escHtml(c.id) + ')</option>';
  }).join('');

  var monSel  = document.getElementById('monKandangId');
  var feedSel = document.getElementById('feedKandangId');
  var trxSel  = document.getElementById('trxKandangId');

  if (monSel)  monSel.innerHTML  = coopOptions;
  if (feedSel) feedSel.innerHTML = '<option value="ALL">Semua Kandang</option>' + coopOptions;
  if (trxSel)  trxSel.innerHTML  = '<option value="ALL">Umum / Semua Kandang</option>' + coopOptions;
}

function updateAlertBadge() {
  var badge = document.getElementById('sidebarAlertBadge');
  if (!badge) return;
  var count = state.alerts.length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

/* ==============================================================================
 * SECTION 19: CONFIRMATION MODAL SYSTEM
 * ============================================================================== */

var _pendingConfirmCallback = null;

function openConfirmModal(opts) {
  opts = opts || {};
  var title       = opts.title       || 'Konfirmasi';
  var message     = opts.message     || 'Apakah Anda yakin?';
  var confirmText = opts.confirmText || 'Konfirmasi';
  var iconType    = opts.iconType    || 'danger';
  var iconId      = opts.iconId      || 'icon-alert';
  var onConfirm   = opts.onConfirm   || function() {};

  document.getElementById('confirmModalTitle').textContent   = title;
  document.getElementById('confirmModalMessage').textContent = message;

  var confirmBtn = document.getElementById('confirmModalBtn');
  if (confirmBtn) {
    confirmBtn.textContent = confirmText;
    confirmBtn.className   = iconType === 'danger' ? 'btn-danger' : 'btn-primary';
  }

  var iconBox = document.getElementById('confirmIconBox');
  if (iconBox) {
    iconBox.className = 'confirm-icon ' + iconType;
    iconBox.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#' + iconId + '"></use></svg>';
  }

  _pendingConfirmCallback = onConfirm;
  openModal('modalConfirm');
}

function handleConfirmAction() {
  closeModal('modalConfirm');
  if (typeof _pendingConfirmCallback === 'function') {
    try { _pendingConfirmCallback(); } catch (e) { console.error('Confirm callback error:', e); }
    _pendingConfirmCallback = null;
  }
}

/* ==============================================================================
 * SECTION 20: UI HELPERS
 * ============================================================================== */

function showToast(message, type) {
  var container = document.getElementById('toastContainer');
  if (!container) return;

  var icons = {
    success: '♡',
    error:   '✗',
    warning: '⚠',
    info:    'ℹ'
  };

  var borderColors = {
    success: 'var(--color-success)',
    error:   'var(--color-danger)',
    warning: 'var(--color-warning)',
    info:    'var(--color-primary)'
  };

  var toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.style.borderLeftColor = borderColors[type] || borderColors.info;
  toast.innerHTML =
    '<span class="toast-icon">' + (icons[type] || '♡') + '</span>' +
    '<span class="toast-text">' + escHtml(String(message || 'Operasi berhasil.')) + '</span>';

  container.appendChild(toast);

  // Auto-dismiss after 3.5s
  setTimeout(function() {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(110%)';
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 320);
  }, 3500);
}

function toggleUserDropdown() {
  var dropdown = document.getElementById('userDropdown');
  var profileBtn = document.getElementById('userProfileBtn');
  if (!dropdown) return;

  var isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();

  if (!isOpen) {
    dropdown.classList.add('open');
    if (profileBtn) profileBtn.classList.add('open');
  }
}

function closeAllDropdowns() {
  var dropdown   = document.getElementById('userDropdown');
  var profileBtn = document.getElementById('userProfileBtn');
  if (dropdown)   dropdown.classList.remove('open');
  if (profileBtn) profileBtn.classList.remove('open');
}

function toggleMobileSidebar() {
  var sidebar = document.getElementById('appSidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  var isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  } else {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
  }
}

function closeMobileSidebar() {
  var sidebar = document.getElementById('appSidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

/* ==============================================================================
 * SECTION 21: FORMATTERS & UTILITIES
 * ============================================================================== */

function formatNumber(num) {
  var n = Number(num);
  if (num === null || num === undefined || isNaN(n)) return '—';
  return n.toLocaleString('id-ID');
}

function formatRupiah(num) {
  var n = Number(num);
  if (num === null || num === undefined || isNaN(n)) return '—';
  return 'Rp\u00a0' + n.toLocaleString('id-ID');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(dateStr).substring(0, 10);
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'Baru saja';
  try {
    return new Date(dateStr).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(dateStr).replace('T', ' ').substring(0, 19);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape HTML attribute value
 */
function escAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function debounce(func, wait) {
  var timeout;
  return function() {
    var ctx  = this;
    var args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() { func.apply(ctx, args); }, wait);
  };
}
