// ================= ROBUST SAFARI & IOS STORAGE COMPATIBILITY =================
(function initStoragePolyfill() {
  let isLocalStorageAvailable = false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
  } catch (e) {
    isLocalStorageAvailable = false;
  }

  if (!isLocalStorageAvailable) {
    const inMemoryStore = {};
    const mockStorage = {
      getItem: (key) => inMemoryStore[key] !== undefined ? inMemoryStore[key] : null,
      setItem: (key, val) => { inMemoryStore[key] = String(val); },
      removeItem: (key) => { delete inMemoryStore[key]; },
      clear: () => { Object.keys(inMemoryStore).forEach(k => delete inMemoryStore[k]); },
      get length() { return Object.keys(inMemoryStore).length; },
      key: (i) => Object.keys(inMemoryStore)[i] || null
    };
    try {
      Object.defineProperty(window, 'localStorage', { value: mockStorage });
    } catch (err) {}
  }

  let isSessionStorageAvailable = false;
  try {
    const testKey = '__session_test__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    isSessionStorageAvailable = true;
  } catch (e) {
    isSessionStorageAvailable = false;
  }

  if (!isSessionStorageAvailable) {
    const inMemorySessionStore = {};
    const mockSessionStorage = {
      getItem: (key) => inMemorySessionStore[key] !== undefined ? inMemorySessionStore[key] : null,
      setItem: (key, val) => { inMemorySessionStore[key] = String(val); },
      removeItem: (key) => { delete inMemorySessionStore[key]; },
      clear: () => { Object.keys(inMemorySessionStore).forEach(k => delete inMemorySessionStore[k]); },
      get length() { return Object.keys(inMemorySessionStore).length; },
      key: (i) => Object.keys(inMemorySessionStore)[i] || null
    };
    try {
      Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });
    } catch (err) {}
  }
})();

function safeStorageGet(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null && val !== undefined ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeStorageSet(key, val) {
  try {
    localStorage.setItem(key, String(val));
  } catch (e) {}
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

function safeSessionGet(key, fallback = null) {
  try {
    const val = sessionStorage.getItem(key);
    return val !== null && val !== undefined ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeSessionSet(key, val) {
  try {
    sessionStorage.setItem(key, String(val));
  } catch (e) {}
}

function safeSessionRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {}
}

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    const val = JSON.parse(str);
    return val !== undefined && val !== null ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeParseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ================= DATA & STATE =================
const DEFAULT_LISTS = ['Default', 'Personal', 'Shopping', 'Wishlist', 'Work'];
const INITIAL_TASKS = [];

// ================= USER & PROFILE MANAGEMENT =================
const USER_KEY_USERS = 'ios_reminders_users_list_v2';
const USER_KEY_CURRENT = 'ios_reminders_current_user_id_v2';

let userState = {
  users: [],
  currentUserId: null,
  selectedNewAvatarColor: '#6366f1'
};

function getUserStoragePrefix(uid) {
  const id = uid || userState.currentUserId || 'default';
  return `ios_reminders_u_${id}_`;
}

function initUsersSystem() {
  let storedUsers = [];
  try {
    storedUsers = JSON.parse(localStorage.getItem(USER_KEY_USERS)) || [];
  } catch (e) {
    storedUsers = [];
  }

  let currentId = localStorage.getItem(USER_KEY_CURRENT);

  // If no users exist, create initial Ben & Mahi profiles matching the design
  if (!storedUsers || storedUsers.length === 0) {
    const legacyTasks = localStorage.getItem('ios_reminders_tasks_v2');
    const legacyLists = localStorage.getItem('ios_reminders_lists_v2');
    const legacyHistory = localStorage.getItem('ios_reminders_history');
    const legacyPalette = localStorage.getItem('ios_reminders_palette');
    const legacySettings = localStorage.getItem('ios_reminders_settings');

    const userBen = {
      id: 'user_ben',
      username: 'Ben',
      avatarColor: '#0284c7',
      themeClass: 'theme-blue',
      pin: '',
      createdAt: Date.now() - 1000
    };
    const userMahi = {
      id: 'user_mahi',
      username: 'Mahi',
      avatarColor: '#9333ea',
      themeClass: 'theme-purple',
      pin: '',
      createdAt: Date.now()
    };

    storedUsers = [userBen, userMahi];
    currentId = userMahi.id;

    // Migrate any previous data into Mahi's account
    const prefix = `ios_reminders_u_${userMahi.id}_`;
    if (legacyTasks) localStorage.setItem(`${prefix}tasks_v2`, legacyTasks);
    if (legacyLists) localStorage.setItem(`${prefix}lists_v2`, legacyLists);
    if (legacyHistory) localStorage.setItem(`${prefix}history`, legacyHistory);
    if (legacyPalette) localStorage.setItem(`${prefix}palette`, legacyPalette);
    if (legacySettings) localStorage.setItem(`${prefix}settings`, legacySettings);

    // Initialize Ben's account cleanly as empty
    const benPrefix = `ios_reminders_u_${userBen.id}_`;
    localStorage.setItem(`${benPrefix}tasks_v2`, '[]');
    localStorage.setItem(`${benPrefix}lists_v2`, JSON.stringify(DEFAULT_LISTS));
    localStorage.setItem(`${benPrefix}history`, '[]');

    localStorage.setItem(USER_KEY_USERS, JSON.stringify(storedUsers));
    localStorage.setItem(USER_KEY_CURRENT, currentId);
  }

  // Ensure themeClass exists on all profiles
  const THEME_CYCLE = ['theme-blue', 'theme-purple', 'theme-emerald', 'theme-sunset', 'theme-amber'];
  storedUsers.forEach((u, idx) => {
    if (!u.themeClass) {
      u.themeClass = THEME_CYCLE[idx % THEME_CYCLE.length];
    }
  });

  // Ensure current user is valid
  let active = storedUsers.find(u => u.id === currentId);
  if (!active) {
    active = storedUsers[0];
    currentId = active.id;
    localStorage.setItem(USER_KEY_CURRENT, currentId);
  }

  userState.users = storedUsers;
  userState.currentUserId = currentId;
}

initUsersSystem();

function getActiveUser() {
  return userState.users.find(u => u.id === userState.currentUserId) || userState.users[0] || {
    id: 'guest',
    username: 'Guest',
    avatarColor: '#6366f1'
  };
}

const initialPrefix = getUserStoragePrefix();
let appState = {
  tasks: safeJsonParse(safeStorageGet(`${initialPrefix}tasks_v2`), []),
  lists: safeJsonParse(safeStorageGet(`${initialPrefix}lists_v2`), DEFAULT_LISTS),
  finishedHistory: safeJsonParse(safeStorageGet(`${initialPrefix}history`), []),
  currentList: 'All Lists',
  searchQuery: '',
  colorTheme: safeStorageGet(`${initialPrefix}palette`, 'theme-indigo'),
  audioEnabled: true
};

function saveStateForUser(uid) {
  const targetId = uid || userState.currentUserId;
  if (!targetId) return;

  const p = getUserStoragePrefix(targetId);
  const now = Date.now();
  localStorage.setItem(`${p}tasks_v2`, JSON.stringify(appState.tasks));
  localStorage.setItem(`${p}lists_v2`, JSON.stringify(appState.lists));
  localStorage.setItem(`${p}history`, JSON.stringify(appState.finishedHistory));
  localStorage.setItem(`${p}palette`, appState.colorTheme);
  localStorage.setItem(`${p}updated_at`, String(now));
  appState.lastUpdatedAt = now;
  if (appState.settings) {
    localStorage.setItem(`${p}settings`, JSON.stringify(appState.settings));
  }
  if (typeof syncScheduledNotifications === 'function') {
    syncScheduledNotifications();
  }
}

function saveState() {
  const activeId = userState.currentUserId;
  if (!activeId) return;
  saveStateForUser(activeId);
  scheduleCloudSyncPush(activeId);
}

// ================= CLOUDFLARE D1 CLOUD SYNC ENGINE =================
const CLOUD_API_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:') &&
  (window.location.hostname.includes('11121113.xyz') || window.location.hostname.includes('pages.dev'))
    ? ''
    : 'https://emiforyou.11121113.xyz';

let syncState = {
  status: 'idle', // 'idle' | 'syncing' | 'synced' | 'offline'
  lastSyncTime: null,
  isPulling: false,
  pushTimer: null
};

function setSyncStatus(status) {
  syncState.status = status;
  const statusBtn = document.getElementById('cloudSyncStatusBtn');
  const statusIcon = document.getElementById('syncStatusIcon');
  const drawerStatus = document.getElementById('drawerDbStatus');
  const settingsStatusBadge = document.getElementById('settingSyncBadge');

  if (status === 'syncing') {
    if (statusBtn) {
      statusBtn.className = 'icon-btn sync-indicator-btn syncing';
      statusBtn.title = 'Syncing with Cloudflare D1...';
    }
    if (statusIcon) {
      statusIcon.className = 'fa-solid fa-arrows-rotate fa-spin';
      statusIcon.style.color = '#38bdf8';
    }
    if (drawerStatus) {
      drawerStatus.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin" style="color: #38bdf8;"></i> Syncing...';
    }
  } else if (status === 'synced') {
    syncState.lastSyncTime = Date.now();
    if (statusBtn) {
      statusBtn.className = 'icon-btn sync-indicator-btn synced';
      statusBtn.title = 'Cloud DB Connected & Synced (Click to sync now)';
    }
    if (statusIcon) {
      statusIcon.className = 'fa-solid fa-cloud-check';
      statusIcon.style.color = '#10b981';
    }
    if (drawerStatus) {
      drawerStatus.innerHTML = '<i class="fa-solid fa-cloud-check" style="color: #10b981;"></i> D1 Connected';
    }
    if (settingsStatusBadge) {
      settingsStatusBadge.textContent = 'Connected & Synced';
      settingsStatusBadge.style.color = '#10b981';
    }
  } else if (status === 'offline') {
    if (statusBtn) {
      statusBtn.className = 'icon-btn sync-indicator-btn offline';
      statusBtn.title = 'Offline mode (Saved locally)';
    }
    if (statusIcon) {
      statusIcon.className = 'fa-solid fa-cloud-slash';
      statusIcon.style.color = '#f59e0b';
    }
    if (drawerStatus) {
      drawerStatus.innerHTML = '<i class="fa-solid fa-cloud-slash" style="color: #f59e0b;"></i> Offline (Local)';
    }
  }
}

function scheduleCloudSyncPush(targetUserId) {
  const uid = targetUserId || userState.currentUserId;
  if (!uid) return;

  if (syncState.pushTimer) {
    clearTimeout(syncState.pushTimer);
    syncState.pushTimer = null;
  }

  // Bind snapshot strictly to target user ID
  const p = getUserStoragePrefix(uid);
  const user = userState.users.find(u => u.id === uid);
  if (!user) return;

  const localTasks = JSON.parse(localStorage.getItem(`${p}tasks_v2`)) || [];
  // Safety guard: if local tasks array is empty, do NOT schedule push until confirmed by explicit user action
  // to prevent accidental overwrite of remote cloud database!
  if (!localTasks || localTasks.length === 0) {
    console.warn(`Prevented push for user ${uid}: local tasks array is empty`);
    return;
  }

  const payload = {
    userId: user.id,
    username: user.username,
    updatedAt: Number(localStorage.getItem(`${p}updated_at`)) || Date.now(),
    data: {
      tasks: JSON.parse(localStorage.getItem(`${p}tasks_v2`)) || [],
      lists: JSON.parse(localStorage.getItem(`${p}lists_v2`)) || DEFAULT_LISTS,
      finishedHistory: JSON.parse(localStorage.getItem(`${p}history`)) || [],
      colorTheme: localStorage.getItem(`${p}palette`) || user.themeClass || 'theme-indigo',
      settings: JSON.parse(localStorage.getItem(`${p}settings`)) || (typeof loadCurrentUserSettings === 'function' ? loadCurrentUserSettings() : null)
    }
  };

  syncState.pushTimer = setTimeout(() => {
    cloudSyncPushPayload(payload);
  }, 400);
}

async function cloudSyncPushPayload(payload) {
  if (!payload || !payload.userId) return;

  setSyncStatus('syncing');

  try {
    const resp = await fetch(`${CLOUD_API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.status === 409) {
      // Remote is strictly newer; pull remote changes for this user
      if (userState.currentUserId === payload.userId) {
        await cloudSyncPull(true, payload.userId);
      }
      return;
    }

    if (resp.ok) {
      setSyncStatus('synced');
    } else {
      setSyncStatus('offline');
    }
  } catch (err) {
    console.warn('Cloud sync push error (offline):', err);
    setSyncStatus('offline');
  }
}

async function cloudSyncPull(force = false, expectedUserId = null) {
  if (syncState.isPulling) return;
  const currentUid = expectedUserId || userState.currentUserId;
  if (!currentUid) return;

  const user = userState.users.find(u => u.id === currentUid);
  if (!user) return;

  syncState.isPulling = true;
  setSyncStatus('syncing');

  try {
    const resp = await fetch(`${CLOUD_API_BASE}/api/sync?userId=${encodeURIComponent(currentUid)}`, {
      cache: 'no-store'
    });

    // Guard: active user must not have changed during fetch
    if (userState.currentUserId !== currentUid) {
      syncState.isPulling = false;
      return;
    }

    if (!resp.ok) {
      setSyncStatus('offline');
      syncState.isPulling = false;
      return;
    }

    const result = await resp.json();
    if (!result || result.userId !== currentUid) {
      syncState.isPulling = false;
      return;
    }

    const p = getUserStoragePrefix(currentUid);

    if (!result.found) {
      // No remote record yet for this user: push strictly this user's local tasks if any
      const userLocalTasks = JSON.parse(localStorage.getItem(`${p}tasks_v2`)) || [];
      if (userLocalTasks.length > 0) {
        scheduleCloudSyncPush(currentUid);
      } else {
        setSyncStatus('synced');
      }
      syncState.isPulling = false;
      return;
    }

    const remoteData = result.data;
    const remoteUpdatedAt = Number(result.updatedAt) || 0;
    const localUpdatedAt = Number(localStorage.getItem(`${p}updated_at`)) || 0;
    const userLocalTasks = JSON.parse(localStorage.getItem(`${p}tasks_v2`)) || [];
    const hasRemoteTasks = remoteData && Array.isArray(remoteData.tasks) && remoteData.tasks.length > 0;
    const hasLocalTasks = userLocalTasks.length > 0;

    // Safety guard: if local has no tasks but remote has tasks, ALWAYS adopt remote tasks!
    if (force || remoteUpdatedAt >= localUpdatedAt || (!hasLocalTasks && hasRemoteTasks)) {
      if (remoteData) {
        const freshLocalTasks = userLocalTasks.filter(t => (t.createdAt || 0) > remoteUpdatedAt);
        const mergedTasks = [...(remoteData.tasks || [])];
        freshLocalTasks.forEach(lt => {
          if (!mergedTasks.some(mt => mt.id === lt.id)) {
            mergedTasks.unshift(lt);
          }
        });

        // Update active appState ONLY if this user is still the active user
        if (userState.currentUserId === currentUid) {
          appState.tasks = mergedTasks;
          if (Array.isArray(remoteData.lists) && remoteData.lists.length) {
            appState.lists = Array.from(new Set([...DEFAULT_LISTS, ...remoteData.lists]));
          }
          if (Array.isArray(remoteData.finishedHistory)) {
            appState.finishedHistory = remoteData.finishedHistory;
          }
          if (remoteData.colorTheme && remoteData.colorTheme !== appState.colorTheme) {
            appState.colorTheme = remoteData.colorTheme;
            applyTheme(appState.colorTheme, false);
          }
          if (remoteData.settings && typeof loadCurrentUserSettings === 'function') {
            appState.settings = { ...loadCurrentUserSettings(), ...remoteData.settings };
            if (typeof saveCurrentUserSettings === 'function') {
              saveCurrentUserSettings(appState.settings);
            }
            if (typeof updateSettingsUI === 'function') {
              updateSettingsUI();
            }
          }
        }

        const newLatest = Math.max(remoteUpdatedAt, Date.now());
        localStorage.setItem(`${p}tasks_v2`, JSON.stringify(mergedTasks));
        localStorage.setItem(`${p}lists_v2`, JSON.stringify(remoteData.lists || DEFAULT_LISTS));
        localStorage.setItem(`${p}history`, JSON.stringify(remoteData.finishedHistory || []));
        if (remoteData.colorTheme) localStorage.setItem(`${p}palette`, remoteData.colorTheme);
        localStorage.setItem(`${p}updated_at`, String(newLatest));
        if (userState.currentUserId === currentUid) {
          appState.lastUpdatedAt = newLatest;
          if (typeof renderTasks === 'function') renderTasks();
          if (typeof renderDrawerLists === 'function') renderDrawerLists();
          if (typeof syncScheduledNotifications === 'function') {
            syncScheduledNotifications();
          }
        }
      }
    } else if (localUpdatedAt > remoteUpdatedAt) {
      // NEVER overwrite remote tasks if local is empty and remote has tasks!
      if (!hasLocalTasks && hasRemoteTasks) {
        console.warn('Blocked cloud push: local is empty while remote has tasks. Pulling remote instead.');
        cloudSyncPull(true, currentUid);
        return;
      }
      scheduleCloudSyncPush(currentUid);
    }

    setSyncStatus('synced');
  } catch (err) {
    console.warn('Cloud sync pull error:', err);
    setSyncStatus('offline');
  } finally {
    syncState.isPulling = false;
  }
}

async function syncProfilesPull() {
  try {
    const resp = await fetch(`${CLOUD_API_BASE}/api/sync?userId=__profiles__`, { cache: 'no-store' });
    if (!resp.ok) return;
    const res = await resp.json();
    if (res && res.found && Array.isArray(res.data) && res.data.length > 0) {
      const remoteProfiles = res.data;
      let changed = false;
      remoteProfiles.forEach(rp => {
        const existing = userState.users.find(u => u.id === rp.id);
        if (!existing) {
          userState.users.push(rp);
          changed = true;
        } else {
          if (rp.username && rp.username !== existing.username) {
            existing.username = rp.username;
            changed = true;
          }
          if (rp.themeClass && rp.themeClass !== existing.themeClass) {
            existing.themeClass = rp.themeClass;
            changed = true;
          }
          if (rp.pin !== undefined && rp.pin !== existing.pin) {
            existing.pin = rp.pin;
            changed = true;
          }
        }
      });
      if (changed) {
        localStorage.setItem(USER_KEY_USERS, JSON.stringify(userState.users));
        if (typeof renderLoginProfiles === 'function') renderLoginProfiles();
        if (typeof renderDrawerAccountsList === 'function') renderDrawerAccountsList();
        if (typeof updateProfileSecurityUI === 'function') updateProfileSecurityUI();
        if (typeof renderAccountsListModal === 'function') renderAccountsListModal();
      }
    } else if (userState.users && userState.users.length > 0) {
      syncProfilesPush();
    }
  } catch (e) {}
}

async function syncProfilesPush() {
  try {
    await fetch(`${CLOUD_API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '__profiles__',
        username: 'Profiles Registry',
        updatedAt: Date.now(),
        data: userState.users
      })
    });
  } catch (e) {}
}

// ================= AUDIO SYNTHESIS & NOTIFICATION SOUNDS =================
let sharedAudioCtx = null;
function getSharedAudioContext() {
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

// Ensure audio context is ready on first user touch/tap
function unlockAudio() {
  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
window.addEventListener('touchstart', unlockAudio, { passive: true });
window.addEventListener('click', unlockAudio, { passive: true });

function playSound(type = 'check') {
  if (appState && appState.audioEnabled === false && type !== 'check' && type !== 'pop') return;
  try {
    const ctx = getSharedAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      if (type === 'check') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'reschedule') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'reminder') {
        // Crisp 3-note ascending chime: A5 (880Hz) -> C#6 (1108Hz) -> E6 (1318Hz)
        const playTone = (freq, offset, dur, vol) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + offset);
          gain.gain.setValueAtTime(vol, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + dur);
        };
        playTone(880.0, 0.00, 0.45, 0.6);
        playTone(1108.7, 0.16, 0.45, 0.65);
        playTone(1318.5, 0.32, 0.85, 0.75);
      }
    }
  } catch (e) {
    console.warn('playSound audio context error:', e);
  }

  // Dual playback: also trigger HTML5 audio for reminder chimes
  if (type === 'reminder') {
    try {
      const audio = new Audio('reminder_sound.wav');
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (_) {}
  }
}

// ================= DOM ELEMENTS & EDIT STATE =================
let editingTaskId = null;
let currentTaskDate = null;
let currentTaskTime = null;
let currentTaskRepeat = 'monthly';

const tasksScreen = document.getElementById('tasksScreen');
const newTaskScreen = document.getElementById('newTaskScreen');
const taskFormTitle = document.getElementById('taskFormTitle');
const editHeaderActions = document.getElementById('editHeaderActions');
const shareTaskBtn = document.getElementById('shareTaskBtn');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const batchModeRow = document.getElementById('batchModeRow');
const batchModeToggle = document.getElementById('batchModeToggle');
const taskFinishedRow = document.getElementById('taskFinishedRow');
const taskFinishedCheckbox = document.getElementById('taskFinishedCheckbox');
const tasksListArea = document.getElementById('tasksListArea');
const currentListSubtitle = document.getElementById('currentListSubtitle');
const openDrawerBtn = document.getElementById('openDrawerBtn');
const navDrawer = document.getElementById('navDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerListsContainer = document.getElementById('drawerListsContainer');
const openNewTaskBtn = document.getElementById('openNewTaskBtn');
const closeNewTaskBtn = document.getElementById('closeNewTaskBtn');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const taskTitleInput = document.getElementById('taskTitleInput');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const hiddenDateInput = document.getElementById('hiddenDateInput');
const hiddenTimeInput = document.getElementById('hiddenTimeInput');
const dateLabelCol = document.getElementById('dateLabelCol');
const dateDisplayText = document.getElementById('dateDisplayText');
const calendarPickerBtn = document.getElementById('calendarPickerBtn');
const clearDateBtn = document.getElementById('clearDateBtn');
const timeLabelCol = document.getElementById('timeLabelCol');
const timeDisplayText = document.getElementById('timeDisplayText');
const timePickerBtn = document.getElementById('timePickerBtn');
const clearTimeBtn = document.getElementById('clearTimeBtn');
const repeatToggle = document.getElementById('repeatToggle');
const repeatPillBtn = document.getElementById('repeatPillBtn');
const repeatModal = document.getElementById('repeatModal');
const cancelRepeatModalBtn = document.getElementById('cancelRepeatModalBtn');
const taskListSelect = document.getElementById('taskListSelect');
const addListInlineBtn = document.getElementById('addListInlineBtn');
const toggleSearchBtn = document.getElementById('toggleSearchBtn');
const searchContainer = document.getElementById('searchContainer');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const listModalBackdrop = document.getElementById('listModalBackdrop');
const editListsModalBtn = document.getElementById('editListsModalBtn');
const closeListModalBtn = document.getElementById('closeListModalBtn');
const newListNameInput = document.getElementById('newListNameInput');
const createNewListSubmitBtn = document.getElementById('createNewListSubmitBtn');
const modalListsItemList = document.getElementById('modalListsItemList');
const liveClock = document.getElementById('liveClock');
const viewToggleBtn = document.getElementById('viewToggleBtn');
const fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
const toastContainer = document.getElementById('toastContainer');

// ================= CLOCK =================
function updateClock() {
  if (!liveClock) return;
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  hours = hours % 12 || 12;
  liveClock.textContent = `${hours}:${minutes}`;
}
if (liveClock) {
  setInterval(updateClock, 1000);
  updateClock();
}

// ================= THEME & PALETTES =================
const PALETTES = ['theme-indigo', 'theme-emerald', 'theme-sunset', 'theme-light'];
function applyTheme(palette, shouldSave = false) {
  PALETTES.forEach(p => document.body.classList.remove(p));
  document.body.classList.add(palette);
  appState.colorTheme = palette;
  if (themeIcon) {
    themeIcon.className = palette === 'theme-light' ? 'fa-solid fa-moon' : 'fa-regular fa-sun';
  }
  if (userState.currentUserId) {
    const p = getUserStoragePrefix(userState.currentUserId);
    localStorage.setItem(`${p}palette`, palette);
  }
  if (shouldSave) {
    saveState();
  }
}

themeToggleBtn.addEventListener('click', () => {
  playSound('pop');
  const currentIdx = PALETTES.indexOf(appState.colorTheme);
  const nextIdx = (currentIdx + 1) % PALETTES.length;
  applyTheme(PALETTES[nextIdx], true);
  const names = {
    'theme-indigo': 'Electric Indigo',
    'theme-emerald': 'Cyber Emerald',
    'theme-sunset': 'Sunset Rose',
    'theme-light': 'Titanium Light'
  };
  showToast(`Theme: ${names[PALETTES[nextIdx]]}`, 'fa-palette');
});
applyTheme(appState.colorTheme);

// ================= TOASTS =================
function showToast(message, icon = 'fa-check') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}

// ================= ADVANCING RECURRING TASKS =================
function getNextDueDate(dateString, repeatFrequency = 'monthly') {
  const curDate = new Date(dateString);
  const nextDate = new Date(curDate);

  if (repeatFrequency === 'daily') {
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (repeatFrequency === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (repeatFrequency === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else if (repeatFrequency === 'yearly') {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  return nextDate.toISOString();
}

// ================= TASK COMPLETION LOGIC =================
function toggleTaskCompletion(taskId, cardElement) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (cardElement) {
    cardElement.classList.add('completing');
  }

  if (task.repeat && task.repeat !== 'none') {
    playSound('reschedule');
    const oldDueDate = new Date(task.dueDate);
    const oldMonthName = oldDueDate.toLocaleString('default', { month: 'short' });
    
    const nextDateISO = getNextDueDate(task.dueDate, task.repeat);
    const nextDueDate = new Date(nextDateISO);
    const nextMonthName = nextDueDate.toLocaleString('default', { month: 'long' });

    appState.finishedHistory.unshift({
      title: task.title,
      list: task.list,
      completedAt: new Date().toISOString(),
      previousPeriod: `${oldMonthName} ${oldDueDate.getDate()}`
    });

    task.dueDate = nextDateISO;
    task.completed = false;

    saveState();

    setTimeout(() => {
      renderTasks();
      showToast(`✓ Paid! Rescheduled for ${nextMonthName}`, 'fa-calendar-plus');
    }, 320);

  } else {
    task.completed = !task.completed;
    playSound(task.completed ? 'check' : 'pop');
    saveState();

    setTimeout(() => {
      renderTasks();
      showToast(task.completed ? 'Task completed!' : 'Task restored');
    }, 280);
  }
}

function isTaskTimeCrossed(task) {
  if (!task || !task.dueDate || task.completed) return false;
  const due = new Date(task.dueDate).getTime();
  return !isNaN(due) && due < Date.now();
}

// ================= FORMATTERS =================
function formatDisplayGroup(task) {
  if (task.completed) return 'Finished';
  if (!task.dueDate) return 'No Date';

  const date = safeParseDate(task.dueDate);
  if (!date) return 'No Date';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((taskDateOnly - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0 || date.getTime() < now.getTime()) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';

  try {
    return date.toLocaleString('default', { month: 'long' });
  } catch (e) {
    return 'Upcoming';
  }
}

function formatTaskMeta(task) {
  if (!task.dueDate) return 'Not set';
  const d = safeParseDate(task.dueDate);
  if (!d) return 'Not set';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((taskDateOnly - today) / (1000 * 60 * 60 * 24));

  const is24h = appState.settings && appState.settings.timeFormat === '24-hour';
  let timeStr = '';
  try {
    timeStr = d.toLocaleTimeString('en-US', {
      hour: is24h ? '2-digit' : 'numeric',
      minute: '2-digit',
      hour12: !is24h
    });
  } catch (e) {
    timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  try {
    if (diffDays === 1) return `Tomorrow, ${timeStr}`;
    if (diffDays === 0) return `Today, ${timeStr}`;
    return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch (e) {
    return timeStr || 'Due';
  }
}

// ================= RENDER TASKS =================
function renderTasks() {
  tasksListArea.innerHTML = '';
  currentListSubtitle.textContent = appState.currentList;

  let filtered = appState.tasks.filter(t => {
    if (appState.currentList === 'Finished') {
      return t.completed;
    } else if (appState.currentList !== 'All Lists') {
      if (t.list !== appState.currentList) return false;
      if (t.completed) return false;
    } else {
      if (t.completed) return false;
    }

    if (appState.searchQuery.trim()) {
      const q = appState.searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.list.toLowerCase().includes(q);
    }
    return true;
  });

  if (appState.currentList === 'Finished') {
    renderFinishedTab();
    renderDrawerLists();
    return;
  }

  if (filtered.length === 0) {
    tasksListArea.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-calendar-check"></i>
        <p>No active tasks in <strong>${appState.currentList}</strong></p>
      </div>
    `;
    renderDrawerLists();
    return;
  }

  const groups = {};
  const groupOrder = ['Overdue', 'Today', 'Tomorrow', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'Finished', 'No Date'];

  filtered.forEach(task => {
    const group = formatDisplayGroup(task);
    if (!groups[group]) groups[group] = [];
    groups[group].push(task);
  });

  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    const idxA = groupOrder.indexOf(a);
    const idxB = groupOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  sortedGroupKeys.forEach(groupName => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'task-group';

    const header = document.createElement('h3');
    header.className = `group-header group-${groupName.toLowerCase()}`;
    header.textContent = groupName;
    groupDiv.appendChild(header);

    const sortOrder = (appState.settings && appState.settings.sortOrder) || 'Due date + Alphabetically';
    groups[groupName].sort((a, b) => {
      if (sortOrder === 'Alphabetically') {
        return a.title.localeCompare(b.title);
      }
      if (sortOrder === 'Creation order') {
        return (a.id || '').localeCompare(b.id || '');
      }
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return a.title.localeCompare(b.title);
    });

    groups[groupName].forEach(task => {
      const card = document.createElement('div');
      const isCrossed = isTaskTimeCrossed(task);
      card.className = `task-card ${task.completed ? 'completed' : ''} ${isCrossed ? 'is-overdue' : ''}`;
      card.dataset.id = task.id;

      card.innerHTML = `
        <div class="task-checkbox-col">
          <div class="custom-checkbox" title="Click to pay / complete">
            <i class="fa-solid fa-check"></i>
          </div>
        </div>
        <div class="task-details-col">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta-line">
            <span class="${isCrossed ? 'meta-time-overdue' : ''}">${isCrossed ? '<i class="fa-solid fa-clock-rotate-left"></i> ' : ''}${formatTaskMeta(task)}</span>
            ${task.repeat && task.repeat !== 'none' ? `<span class="repeat-tag"><i class="fa-solid fa-arrows-rotate"></i> ${task.repeat}</span>` : ''}
          </div>
        </div>
        <span class="task-tag-badge">${escapeHtml(task.list)}</span>
      `;

      // Checkbox click to complete/reschedule
      const checkbox = card.querySelector('.custom-checkbox');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTaskCompletion(task.id, card);
      });

      // Card click to open and edit task
      card.addEventListener('click', (e) => {
        if (e.target.closest('.custom-checkbox')) return;
        openEditTaskView(task.id);
      });

      groupDiv.appendChild(card);
    });

    tasksListArea.appendChild(groupDiv);
  });

  renderDrawerLists();
}

function renderFinishedTab() {
  if (appState.finishedHistory.length === 0) {
    tasksListArea.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <p>No completed bill payments yet</p>
      </div>
    `;
    return;
  }

  const groupDiv = document.createElement('div');
  groupDiv.className = 'task-group';

  const header = document.createElement('h3');
  header.className = 'group-header group-finished';
  header.textContent = 'Payment & Completion Log';
  groupDiv.appendChild(header);

  appState.finishedHistory.forEach(item => {
    const card = document.createElement('div');
    card.className = 'task-card completed';
    card.innerHTML = `
      <div class="task-checkbox-col">
        <div class="custom-checkbox checked-static">
          <i class="fa-solid fa-check" style="display:block"></i>
        </div>
      </div>
      <div class="task-details-col">
        <div class="task-title">${escapeHtml(item.title)}</div>
        <div class="task-meta-line">
          <span>Paid for ${item.previousPeriod || 'Previous period'}</span>
        </div>
      </div>
      <span class="task-tag-badge">${escapeHtml(item.list)}</span>
    `;
    groupDiv.appendChild(card);
  });

  tasksListArea.appendChild(groupDiv);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ================= DRAWER NAVIGATION =================
function renderDrawerLists() {
  drawerListsContainer.innerHTML = '';

  const activeTasks = appState.tasks.filter(t => !t.completed);
  const finishedCount = appState.finishedHistory.length;

  // All Lists
  const allItem = createDrawerItem('All Lists', 'fa-house', activeTasks.length, appState.currentList === 'All Lists');
  drawerListsContainer.appendChild(allItem);

  // Custom User Lists
  appState.lists.forEach(listName => {
    const count = activeTasks.filter(t => t.list === listName).length;
    const item = createDrawerItem(listName, 'fa-list-ul', count, appState.currentList === listName);
    drawerListsContainer.appendChild(item);
  });

  // Finished list
  const finishedItem = createDrawerItem('Finished', 'fa-list-check', finishedCount, appState.currentList === 'Finished');
  drawerListsContainer.appendChild(finishedItem);
}

function createDrawerItem(name, icon, count, isActive) {
  const div = document.createElement('div');
  div.className = `drawer-item ${isActive ? 'active' : ''}`;
  div.innerHTML = `
    <div class="item-left">
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHtml(name)}</span>
    </div>
    ${count > 0 ? `<span class="badge-count">${count}</span>` : ''}
  `;
  div.addEventListener('click', () => {
    playSound('pop');
    appState.currentList = name;
    closeDrawer();
    renderTasks();
  });
  return div;
}

function openDrawer() {
  playSound('pop');
  navDrawer.classList.add('open');
  drawerOverlay.classList.add('open');
}

function closeDrawer() {
  navDrawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
}

openDrawerBtn.addEventListener('click', openDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

// ================= NEW & EDIT TASK VIEWS =================
function populateListSelect() {
  taskListSelect.innerHTML = '';
  appState.lists.forEach(list => {
    const opt = document.createElement('option');
    opt.value = list;
    opt.textContent = list;
    if (appState.currentList === list) opt.selected = true;
    taskListSelect.appendChild(opt);
  });
}

function formatRepeatLabel(repeat) {
  switch (repeat) {
    case 'daily': return 'Once a Day';
    case 'weekdays': return 'Once a Day (Mon-Fri)';
    case 'weekly': return 'Once a Week';
    case 'monthly': return 'Once a Month';
    case 'yearly': return 'Once a Year';
    default: return 'No Repeat';
  }
}

function updateNotificationDisplay() {
  if (currentTaskDate) {
    const today = new Date();
    const isToday = currentTaskDate.toDateString() === today.toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = currentTaskDate.toDateString() === tomorrow.toDateString();

    if (isToday) {
      dateDisplayText.textContent = 'Today';
    } else if (isTomorrow) {
      dateDisplayText.textContent = 'Tomorrow';
    } else {
      dateDisplayText.textContent = currentTaskDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    clearDateBtn.style.display = 'inline-flex';

    const y = currentTaskDate.getFullYear();
    const m = String(currentTaskDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentTaskDate.getDate()).padStart(2, '0');
    hiddenDateInput.value = `${y}-${m}-${d}`;
  } else {
    dateDisplayText.textContent = 'Date not set';
    clearDateBtn.style.display = 'none';
    hiddenDateInput.value = '';
  }

  if (currentTaskTime) {
    const [h, m] = currentTaskTime.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    timeDisplayText.textContent = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
    clearTimeBtn.style.display = 'inline-flex';
    hiddenTimeInput.value = currentTaskTime;
  } else {
    timeDisplayText.textContent = 'Time not set (all day)';
    clearTimeBtn.style.display = 'none';
    hiddenTimeInput.value = '';
  }
}

function openNewTaskView() {
  playSound('pop');
  editingTaskId = null;
  if (taskFormTitle) taskFormTitle.textContent = 'New Task';
  if (editHeaderActions) editHeaderActions.style.display = 'none';
  if (batchModeRow) batchModeRow.style.display = 'flex';
  if (taskFinishedRow) taskFinishedRow.style.display = 'none';

  taskTitleInput.value = '';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  currentTaskDate = tomorrow;
  currentTaskTime = '10:00';
  updateNotificationDisplay();

  currentTaskRepeat = 'monthly';
  repeatToggle.checked = true;
  repeatPillBtn.style.display = 'inline-block';
  repeatPillBtn.textContent = 'Once a Month';

  populateListSelect();
  if (appState.currentList && appState.currentList !== 'All Lists' && appState.currentList !== 'Finished') {
    taskListSelect.value = appState.currentList;
  }

  tasksScreen.classList.remove('active');
  newTaskScreen.classList.add('active');
  newTaskScreen.scrollTop = 0;
  setTimeout(() => taskTitleInput.focus(), 200);
}

function openEditTaskView(taskId) {
  const task = appState.tasks.find(t => String(t.id) === String(taskId));
  if (!task) return;
  playSound('pop');
  editingTaskId = taskId;

  if (taskFormTitle) taskFormTitle.textContent = 'Edit Task';
  if (editHeaderActions) editHeaderActions.style.display = 'flex';
  if (batchModeRow) batchModeRow.style.display = 'none';

  if (taskFinishedRow) {
    taskFinishedRow.style.display = 'flex';
    taskFinishedCheckbox.checked = !!task.completed;
  }

  taskTitleInput.value = task.title || '';

  currentTaskDate = null;
  currentTaskTime = null;
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    if (!isNaN(d.getTime())) {
      currentTaskDate = d;
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      currentTaskTime = `${hours}:${mins}`;
    }
  }
  updateNotificationDisplay();

  currentTaskRepeat = task.repeat || 'none';
  if (currentTaskRepeat && currentTaskRepeat !== 'none') {
    repeatToggle.checked = true;
    repeatPillBtn.style.display = 'inline-block';
    repeatPillBtn.textContent = formatRepeatLabel(currentTaskRepeat);
  } else {
    repeatToggle.checked = false;
    repeatPillBtn.style.display = 'none';
    repeatPillBtn.textContent = 'Once a Month';
  }

  populateListSelect();
  taskListSelect.value = task.list || 'Default';

  tasksScreen.classList.remove('active');
  newTaskScreen.classList.add('active');
  newTaskScreen.scrollTop = 0;
  setTimeout(() => taskTitleInput.focus(), 200);
}

function closeNewTaskView() {
  playSound('pop');
  editingTaskId = null;
  newTaskScreen.classList.remove('active');
  tasksScreen.classList.add('active');
}

openNewTaskBtn.addEventListener('click', openNewTaskView);
closeNewTaskBtn.addEventListener('click', closeNewTaskView);

// Date Picker Handlers (iOS Safari & Modern Browser Compatible)
function triggerDatePicker() {
  if (!hiddenDateInput) return;
  if (typeof hiddenDateInput.showPicker === 'function') {
    try { hiddenDateInput.showPicker(); } catch (e) { hiddenDateInput.focus(); }
  } else {
    try { hiddenDateInput.focus(); } catch (e) {}
  }
}
if (calendarPickerBtn) {
  calendarPickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerDatePicker();
  });
}
if (dateLabelCol) dateLabelCol.addEventListener('click', triggerDatePicker);

if (hiddenDateInput) {
  hiddenDateInput.addEventListener('change', () => {
    if (hiddenDateInput.value) {
      const parts = hiddenDateInput.value.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        currentTaskDate = new Date(parts[0], parts[1] - 1, parts[2]);
        updateNotificationDisplay();
      }
    }
  });
}
if (clearDateBtn) {
  clearDateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentTaskDate = null;
    if (hiddenDateInput) hiddenDateInput.value = '';
    updateNotificationDisplay();
  });
}

// Time Picker Handlers (iOS Safari & Modern Browser Compatible)
function triggerTimePicker() {
  if (!hiddenTimeInput) return;
  if (typeof hiddenTimeInput.showPicker === 'function') {
    try { hiddenTimeInput.showPicker(); } catch (e) { hiddenTimeInput.focus(); }
  } else {
    try { hiddenTimeInput.focus(); } catch (e) {}
  }
}
if (timePickerBtn) {
  timePickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerTimePicker();
  });
}
if (timeLabelCol) timeLabelCol.addEventListener('click', triggerTimePicker);

if (hiddenTimeInput) {
  hiddenTimeInput.addEventListener('change', () => {
    if (hiddenTimeInput.value) {
      currentTaskTime = hiddenTimeInput.value;
      updateNotificationDisplay();
    }
  });
}
if (clearTimeBtn) {
  clearTimeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentTaskTime = null;
    if (hiddenTimeInput) hiddenTimeInput.value = '';
    updateNotificationDisplay();
  });
}

// Repeat Handlers
repeatToggle.addEventListener('change', () => {
  if (repeatToggle.checked) {
    repeatPillBtn.style.display = 'inline-block';
    if (!currentTaskRepeat || currentTaskRepeat === 'none') {
      currentTaskRepeat = 'monthly';
    }
    repeatPillBtn.textContent = formatRepeatLabel(currentTaskRepeat);
  } else {
    repeatPillBtn.style.display = 'none';
  }
});

repeatPillBtn.addEventListener('click', () => {
  repeatModal.style.display = 'flex';
});

cancelRepeatModalBtn.addEventListener('click', () => {
  repeatModal.style.display = 'none';
});

repeatModal.addEventListener('click', (e) => {
  if (e.target === repeatModal) repeatModal.style.display = 'none';
});

document.querySelectorAll('.repeat-dialog-item').forEach(item => {
  item.addEventListener('click', () => {
    const repeatVal = item.dataset.repeat;
    currentTaskRepeat = repeatVal;
    if (repeatVal === 'none') {
      repeatToggle.checked = false;
      repeatPillBtn.style.display = 'none';
    } else {
      repeatToggle.checked = true;
      repeatPillBtn.style.display = 'inline-block';
      repeatPillBtn.textContent = formatRepeatLabel(repeatVal);
    }
    repeatModal.style.display = 'none';
  });
});

// Save Task (Create or Update)
if (saveTaskBtn) {
  saveTaskBtn.addEventListener('click', () => {
    const title = taskTitleInput.value.trim();
    if (!title) {
      showToast('Please enter a task title', 'fa-triangle-exclamation');
      taskTitleInput.focus();
      return;
    }

    let dueDateISO = null;
    if (currentTaskDate) {
      const d = new Date(currentTaskDate);
      if (currentTaskTime) {
        const [h, m] = currentTaskTime.split(':').map(Number);
        d.setHours(h, m, 0, 0);
      } else {
        d.setHours(12, 0, 0, 0);
      }
      dueDateISO = d.toISOString();
    }

    const repeatVal = repeatToggle.checked ? (currentTaskRepeat || 'monthly') : 'none';
    const selectedList = taskListSelect.value || 'Default';

    if (editingTaskId) {
      const task = appState.tasks.find(t => String(t.id) === String(editingTaskId));
      if (task) {
        task.title = title;
        task.dueDate = dueDateISO;
        task.list = selectedList;
        task.repeat = repeatVal;
        if (taskFinishedCheckbox) {
          task.completed = taskFinishedCheckbox.checked;
        }
        saveState();
        playSound('check');
        showToast('Task updated!', 'fa-pen-to-square');
      }
      closeNewTaskView();
      renderTasks();
    } else {
      const newTask = {
        id: 't-' + Date.now(),
        title: title,
        dueDate: dueDateISO,
        list: selectedList,
        repeat: repeatVal,
        completed: false
      };

      appState.tasks.unshift(newTask);
      saveState();
      playSound('check');
      showToast('Reminder added!');

      if (batchModeToggle && batchModeToggle.checked) {
        taskTitleInput.value = '';
        taskTitleInput.focus();
      } else {
        closeNewTaskView();
        renderTasks();
      }
    }
  });
}

// Delete Task in Edit Mode
if (deleteTaskBtn) {
  deleteTaskBtn.addEventListener('click', () => {
    if (!editingTaskId) return;
    const taskIndex = appState.tasks.findIndex(t => String(t.id) === String(editingTaskId));
    if (taskIndex !== -1) {
      const removed = appState.tasks.splice(taskIndex, 1)[0];
      saveState();
      playSound('pop');
      showToast(`Deleted "${removed.title}"`, 'fa-trash');
      closeNewTaskView();
      renderTasks();
    }
  });
}

// Share Task
if (shareTaskBtn) {
  shareTaskBtn.addEventListener('click', () => {
    const title = taskTitleInput.value.trim();
    const dateStr = dateDisplayText ? dateDisplayText.textContent : '';
    const shareText = `Reminder: ${title} (${dateStr})`;
    if (navigator.share) {
      navigator.share({ title: title, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('Task copied to clipboard!', 'fa-copy');
      }).catch(() => {
        showToast(shareText, 'fa-share-nodes');
      });
    }
  });
}

// ================= SPEECH TO TEXT =================
let recognition = null;
try {
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognitionClass) {
    recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      if (voiceInputBtn) voiceInputBtn.classList.add('listening');
      showToast('Listening...', 'fa-microphone');
    };

    recognition.onresult = (event) => {
      if (event && event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        if (taskTitleInput) {
          taskTitleInput.value = (taskTitleInput.value ? taskTitleInput.value + ' ' : '') + transcript;
        }
      }
      if (voiceInputBtn) voiceInputBtn.classList.remove('listening');
    };

    recognition.onerror = () => {
      if (voiceInputBtn) voiceInputBtn.classList.remove('listening');
    };
    recognition.onend = () => {
      if (voiceInputBtn) voiceInputBtn.classList.remove('listening');
    };
  }
} catch (e) {
  recognition = null;
}

if (voiceInputBtn) {
  voiceInputBtn.addEventListener('click', () => {
    if (!recognition) {
      showToast('Voice input not supported in this browser', 'fa-triangle-exclamation');
      return;
    }
    try {
      recognition.start();
    } catch (e) {
      try { recognition.stop(); } catch (err) {}
    }
  });
}

// ================= SEARCH =================
toggleSearchBtn.addEventListener('click', () => {
  playSound('pop');
  searchContainer.classList.toggle('open');
  if (searchContainer.classList.contains('open')) {
    searchInput.focus();
  } else {
    searchInput.value = '';
    appState.searchQuery = '';
    renderTasks();
  }
});

searchInput.addEventListener('input', () => {
  appState.searchQuery = searchInput.value;
  renderTasks();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  appState.searchQuery = '';
  renderTasks();
  searchInput.focus();
});

// ================= LIST MODAL =================
function renderModalLists() {
  modalListsItemList.innerHTML = '';
  appState.lists.forEach((list, index) => {
    const li = document.createElement('li');
    li.className = 'modal-list-item';
    li.innerHTML = `
      <span>${escapeHtml(list)}</span>
      ${list !== 'Default' ? `<button class="modal-delete-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button>` : ''}
    `;
    modalListsItemList.appendChild(li);
  });

  modalListsItemList.querySelectorAll('.modal-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      const removed = appState.lists.splice(idx, 1)[0];
      if (appState.currentList === removed) appState.currentList = 'All Lists';
      saveState();
      renderModalLists();
      renderDrawerLists();
      populateListSelect();
      renderTasks();
      showToast(`Removed "${removed}"`);
    });
  });
}

function openListModal() {
  renderModalLists();
  listModalBackdrop.classList.add('open');
  newListNameInput.value = '';
  setTimeout(() => newListNameInput.focus(), 200);
}

function closeListModal() {
  listModalBackdrop.classList.remove('open');
}

editListsModalBtn.addEventListener('click', () => {
  closeDrawer();
  openListModal();
});
addListInlineBtn.addEventListener('click', openListModal);
closeListModalBtn.addEventListener('click', closeListModal);
listModalBackdrop.addEventListener('click', (e) => {
  if (e.target === listModalBackdrop) closeListModal();
});

createNewListSubmitBtn.addEventListener('click', () => {
  const name = newListNameInput.value.trim();
  if (!name) return;
  if (appState.lists.includes(name)) {
    showToast('List already exists');
    return;
  }
  appState.lists.push(name);
  saveState();
  renderModalLists();
  renderDrawerLists();
  populateListSelect();
  taskListSelect.value = name;
  newListNameInput.value = '';
  showToast(`Created "${name}"!`);
});

// ================= DESKTOP VIEW TOGGLES =================
viewToggleBtn.addEventListener('click', () => {
  document.body.classList.remove('mode-fullscreen');
  viewToggleBtn.classList.add('active');
  fullscreenToggleBtn.classList.remove('active');
});

fullscreenToggleBtn.addEventListener('click', () => {
  document.body.classList.add('mode-fullscreen');
  fullscreenToggleBtn.classList.add('active');
  viewToggleBtn.classList.remove('active');
});

// ================= USER INTERFACE & SWITCHING LOGIC =================
function updateUserUI() {
  const user = getActiveUser();
  const initial = (user.username || 'U').charAt(0).toUpperCase();

  // Top app bar
  const topUserAvatar = document.getElementById('topUserAvatar');
  const topUserInitial = document.getElementById('topUserInitial');
  const topUserName = document.getElementById('topUserName');

  if (topUserAvatar) topUserAvatar.style.background = user.avatarColor || '#6366f1';
  if (topUserInitial) topUserInitial.textContent = initial;
  if (topUserName) topUserName.textContent = user.username;

  // Drawer
  const drawerUserAvatar = document.getElementById('drawerUserAvatar');
  const drawerUserInitial = document.getElementById('drawerUserInitial');
  const drawerUserName = document.getElementById('drawerUserName');

  if (drawerUserAvatar) drawerUserAvatar.style.background = user.avatarColor || '#6366f1';
  if (drawerUserInitial) drawerUserInitial.textContent = initial;
  if (drawerUserName) drawerUserName.textContent = user.username;

  // Modal active banner
  const modalActiveAvatar = document.getElementById('modalActiveAvatar');
  const modalActiveName = document.getElementById('modalActiveName');
  if (modalActiveAvatar) {
    modalActiveAvatar.style.background = user.avatarColor || '#6366f1';
    modalActiveAvatar.textContent = initial;
  }
  if (modalActiveName) modalActiveName.textContent = user.username;
  updateProfileSecurityUI();
}

function updateProfileSecurityUI() {
  const user = getActiveUser();
  if (!user) return;
  const isProtected = !!(user.pin && user.pin.trim());

  const titleEl = document.getElementById('profileSecurityUserName');
  const badgeEl = document.getElementById('profileSecurityStatusBadge');
  const descEl = document.getElementById('profileSecurityDesc');
  const passInput = document.getElementById('profilePasswordInput');
  const settingTitle = document.getElementById('settingProfileSecurityTitle');
  const settingSub = document.getElementById('settingProfileSecuritySub');
  const settingPill = document.getElementById('settingProfileSecurityPill');

  if (titleEl) titleEl.textContent = `${user.username}'s Password`;
  if (badgeEl) {
    badgeEl.textContent = isProtected ? 'Protected 🔒' : 'No Password 🔓';
    badgeEl.style.background = isProtected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)';
    badgeEl.style.color = isProtected ? '#10b981' : '#f59e0b';
  }
  if (descEl) {
    descEl.textContent = isProtected 
      ? 'This profile is password protected. Enter a new password below to change it across devices.'
      : 'No password set. Add a password below to secure this profile across all devices.';
  }
  if (passInput) {
    passInput.value = '';
    passInput.placeholder = isProtected ? 'Enter new password to change...' : 'Set password for this profile...';
  }
  if (settingTitle) settingTitle.textContent = `Profile Password (${user.username})`;
  if (settingSub) settingSub.textContent = isProtected ? 'Password Protected • Tap to change' : 'No Password • Tap to add password';
  if (settingPill) {
    settingPill.textContent = isProtected ? 'Protected' : 'Set Password';
    settingPill.style.color = isProtected ? '#10b981' : '#f59e0b';
  }
}

function renderAccountsListModal() {
  const container = document.getElementById('accountsListContainer');
  if (!container) return;

  container.innerHTML = '';
  userState.users.forEach(u => {
    const p = getUserStoragePrefix(u.id);
    let uTasks = [];
    try {
      uTasks = JSON.parse(localStorage.getItem(`${p}tasks_v2`) || '[]');
    } catch(e) {
      uTasks = [];
    }
    const activeTasksCount = uTasks.filter(t => !t.completed).length;
    const isCurrent = (u.id === userState.currentUserId);
    const initial = (u.username || 'U').charAt(0).toUpperCase();

    const row = document.createElement('div');
    row.className = `account-item-row ${isCurrent ? 'active' : ''}`;
    row.innerHTML = `
      <div class="account-left">
        <div class="account-mini-avatar" style="background: ${u.avatarColor || '#6366f1'}">${initial}</div>
        <div class="account-name-meta">
          <div class="account-name-text">${escapeHtml(u.username)} ${u.pin ? '<i class="fa-solid fa-lock" style="font-size:0.7rem; color:var(--text-muted); margin-left:4px;" title="Password protected"></i>' : '<span style="font-size:0.65rem; color:#f59e0b; margin-left:4px;" title="No password set">🔓 No password</span>'}</div>
          <div class="account-task-count">${activeTasksCount} active task${activeTasksCount === 1 ? '' : 's'}</div>
        </div>
      </div>
      <div class="account-actions">
        ${isCurrent ? '<i class="fa-solid fa-circle-check account-active-badge"></i>' : ''}
        ${userState.users.length > 1 ? `<button class="account-delete-btn" data-uid="${u.id}" title="Delete account"><i class="fa-solid fa-trash-can"></i></button>` : ''}
      </div>
    `;

    row.addEventListener('click', (e) => {
      if (e.target.closest('.account-delete-btn')) return;
      if (isCurrent) {
        closeAuthModal();
        return;
      }
      switchUser(u.id);
    });

    const delBtn = row.querySelector('.account-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteUser(u.id);
      });
    }

    container.appendChild(row);
  });
}

let pendingPinUser = null;

function switchUser(targetUserId, inputPin = '') {
  const targetUser = userState.users.find(u => u.id === targetUserId);
  if (!targetUser) return;

  // If user is PIN protected and inputPin does not match
  if (targetUser.pin) {
    if (!inputPin || inputPin !== targetUser.pin) {
      pendingPinUser = targetUser;
      openPinModal(targetUser);
      return;
    }
  }

  // 1. Cancel pending push timer to prevent cross-account sync pollution
  if (syncState.pushTimer) {
    clearTimeout(syncState.pushTimer);
    syncState.pushTimer = null;
  }

  // 2. Save previous user state explicitly for previous user ONLY if tasks were loaded
  const prevId = userState.currentUserId;
  if (prevId && prevId !== targetUser.id && Array.isArray(appState.tasks) && appState.tasks.length > 0) {
    saveStateForUser(prevId);
  }

  // 3. Set new active user
  userState.currentUserId = targetUser.id;
  safeStorageSet(USER_KEY_CURRENT, targetUser.id);
  safeSessionSet('ios_reminders_session_user_id', targetUser.id);

  // 4. Load target user's data
  const p = getUserStoragePrefix(targetUser.id);
  appState.tasks = JSON.parse(localStorage.getItem(`${p}tasks_v2`)) || [];
  appState.lists = JSON.parse(localStorage.getItem(`${p}lists_v2`)) || DEFAULT_LISTS;
  appState.finishedHistory = JSON.parse(localStorage.getItem(`${p}history`)) || [];
  appState.colorTheme = localStorage.getItem(`${p}palette`) || targetUser.themeClass || 'theme-indigo';
  appState.settings = loadCurrentUserSettings();
  appState.currentList = 'All Lists';
  appState.searchQuery = '';

  // 5. Update UI components
  applyTheme(appState.colorTheme, false);
  if (typeof updateSettingsUI === 'function') updateSettingsUI();
  updateUserUI();
  renderDrawerLists();
  renderTasks();
  closeAuthModal();
  closePinModal();

  if (typeof syncScheduledNotifications === 'function') {
    syncScheduledNotifications();
  }

  showToast(`Switched to ${targetUser.username}`);

  // 6. Instantly pull latest tasks from Cloudflare D1 strictly for the target user
  cloudSyncPull(true, targetUser.id);
}

function createNewUser(username, pin = '', avatarColor = '#6366f1') {
  const cleanName = (username || '').trim();
  const cleanPin = (pin || '').trim();
  if (!cleanName) {
    showToast('Please enter a username');
    return;
  }
  if (!cleanPin) {
    showToast('Password is required for new profile creation', 'fa-triangle-exclamation');
    const pinInput = document.getElementById('newUserPinInput');
    if (pinInput) pinInput.focus();
    return;
  }
  if (userState.users.some(u => u.username.toLowerCase() === cleanName.toLowerCase())) {
    showToast('A user with this name already exists');
    return;
  }

  const newUser = {
    id: 'user_' + Date.now(),
    username: cleanName,
    avatarColor: avatarColor || '#6366f1',
    pin: cleanPin,
    createdAt: Date.now()
  };

  saveState();

  // Initialize new user storage with default clean list
  const p = `ios_reminders_u_${newUser.id}_`;
  localStorage.setItem(`${p}tasks_v2`, '[]');
  localStorage.setItem(`${p}lists_v2`, JSON.stringify(DEFAULT_LISTS));
  localStorage.setItem(`${p}history`, '[]');
  localStorage.setItem(`${p}palette`, 'theme-indigo');

  userState.users.push(newUser);
  localStorage.setItem(USER_KEY_USERS, JSON.stringify(userState.users));
  syncProfilesPush();

  switchUser(newUser.id, newUser.pin);

  const nameInput = document.getElementById('newUsernameInput');
  const pinInput = document.getElementById('newUserPinInput');
  if (nameInput) nameInput.value = '';
  if (pinInput) pinInput.value = '';
}

function deleteUser(userId) {
  if (userState.users.length <= 1) {
    showToast('Cannot delete the only account');
    return;
  }
  const u = userState.users.find(x => x.id === userId);
  if (!u) return;

  if (!confirm(`Delete user "${u.username}" and all associated data?`)) {
    return;
  }

  const p = getUserStoragePrefix(userId);
  localStorage.removeItem(`${p}tasks_v2`);
  localStorage.removeItem(`${p}lists_v2`);
  localStorage.removeItem(`${p}history`);
  localStorage.removeItem(`${p}palette`);
  localStorage.removeItem(`${p}settings`);

  userState.users = userState.users.filter(x => x.id !== userId);
  localStorage.setItem(USER_KEY_USERS, JSON.stringify(userState.users));
  syncProfilesPush();

  if (userState.currentUserId === userId) {
    switchUser(userState.users[0].id, userState.users[0].pin);
  } else {
    renderAccountsListModal();
    updateUserUI();
  }
  showToast(`Deleted ${u.username}`);
}

function openAuthModal() {
  const modal = document.getElementById('authModalBackdrop');
  if (!modal) return;
  updateUserUI();
  renderAccountsListModal();
  modal.style.display = 'flex';
}

function closeAuthModal() {
  const modal = document.getElementById('authModalBackdrop');
  if (modal) modal.style.display = 'none';
}

function openPinModal(targetUser) {
  const modal = document.getElementById('pinModalBackdrop');
  const title = document.getElementById('pinModalTitle');
  const prompt = document.getElementById('pinPromptText');
  const input = document.getElementById('pinVerifyInput');
  const errorMsg = document.getElementById('pinErrorMsg');

  if (!modal) return;
  if (title) title.textContent = `Unlock ${targetUser.username}`;
  if (prompt) prompt.textContent = `Enter the password for "${targetUser.username}" to access reminders.`;
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }
  if (errorMsg) errorMsg.style.display = 'none';
  modal.style.display = 'flex';
}

function closePinModal() {
  const modal = document.getElementById('pinModalBackdrop');
  if (modal) modal.style.display = 'none';
  pendingPinUser = null;
}

// Attach User Events
const topUserBtn = document.getElementById('topUserBtn');
if (topUserBtn) {
  topUserBtn.addEventListener('click', openAuthModal);
}

const drawerSwitchUserBtn = document.getElementById('drawerSwitchUserBtn');
if (drawerSwitchUserBtn) {
  drawerSwitchUserBtn.addEventListener('click', () => {
    closeDrawer();
    openAuthModal();
  });
}

const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
if (closeAuthModalBtn) {
  closeAuthModalBtn.addEventListener('click', closeAuthModal);
}

const authModalBackdrop = document.getElementById('authModalBackdrop');
if (authModalBackdrop) {
  authModalBackdrop.addEventListener('click', (e) => {
    if (e.target === authModalBackdrop) closeAuthModal();
  });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    openAuthModal();
  });
}

const createUserSubmitBtn = document.getElementById('createUserSubmitBtn');
if (createUserSubmitBtn) {
  createUserSubmitBtn.addEventListener('click', () => {
    const nameInput = document.getElementById('newUsernameInput');
    const pinInput = document.getElementById('newUserPinInput');
    const name = nameInput ? nameInput.value : '';
    const pin = pinInput ? pinInput.value : '';
    createNewUser(name, pin, userState.selectedNewAvatarColor);
  });
}

const newUsernameInput = document.getElementById('newUsernameInput');
if (newUsernameInput) {
  newUsernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const pinInput = document.getElementById('newUserPinInput');
      if (pinInput) pinInput.focus();
    }
  });
}

const newUserPinInput = document.getElementById('newUserPinInput');
if (newUserPinInput) {
  newUserPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && createUserSubmitBtn) createUserSubmitBtn.click();
  });
}

// Active Profile Password Setting & Update
const saveProfilePasswordBtn = document.getElementById('saveProfilePasswordBtn');
const profilePasswordInput = document.getElementById('profilePasswordInput');
if (saveProfilePasswordBtn) {
  saveProfilePasswordBtn.addEventListener('click', async () => {
    const user = getActiveUser();
    if (!user) return;
    const newPass = profilePasswordInput ? profilePasswordInput.value.trim() : '';
    if (!newPass) {
      showToast('Please enter a password', 'fa-triangle-exclamation');
      if (profilePasswordInput) profilePasswordInput.focus();
      return;
    }

    user.pin = newPass;
    const idx = userState.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      userState.users[idx].pin = newPass;
    }

    localStorage.setItem(USER_KEY_USERS, JSON.stringify(userState.users));
    updateProfileSecurityUI();
    renderAccountsListModal();
    if (typeof renderLoginProfiles === 'function') renderLoginProfiles();

    showToast('Saving password to Cloudflare...', 'fa-cloud-arrow-up');
    try {
      await syncProfilesPush();
      showToast('Password updated & synced to Cloudflare!', 'fa-circle-check');
    } catch (e) {
      console.error('Error syncing profile password:', e);
      showToast('Password saved locally', 'fa-circle-check');
    }
  });
}

if (profilePasswordInput) {
  profilePasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && saveProfilePasswordBtn) {
      saveProfilePasswordBtn.click();
    }
  });
}

const settingProfileSecurityRow = document.getElementById('settingProfileSecurityRow');
if (settingProfileSecurityRow) {
  settingProfileSecurityRow.addEventListener('click', () => {
    openAuthModal();
    const passInput = document.getElementById('profilePasswordInput');
    if (passInput) {
      setTimeout(() => passInput.focus(), 250);
    }
  });
}

// Avatar color options
const avatarColorPicker = document.getElementById('avatarColorPicker');
if (avatarColorPicker) {
  avatarColorPicker.addEventListener('click', (e) => {
    const dot = e.target.closest('.color-dot-opt');
    if (!dot) return;
    avatarColorPicker.querySelectorAll('.color-dot-opt').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
    userState.selectedNewAvatarColor = dot.getAttribute('data-color') || '#6366f1';
  });
}

// PIN Modal buttons
const closePinModalBtn = document.getElementById('closePinModalBtn');
if (closePinModalBtn) closePinModalBtn.addEventListener('click', closePinModal);

const cancelPinVerifyBtn = document.getElementById('cancelPinVerifyBtn');
if (cancelPinVerifyBtn) cancelPinVerifyBtn.addEventListener('click', closePinModal);

const submitPinVerifyBtn = document.getElementById('submitPinVerifyBtn');
const pinVerifyInput = document.getElementById('pinVerifyInput');

function handlePinSubmit() {
  if (!pendingPinUser) return;
  const pin = pinVerifyInput ? pinVerifyInput.value : '';
  if (pin === pendingPinUser.pin) {
    switchUser(pendingPinUser.id, pin);
  } else {
    const err = document.getElementById('pinErrorMsg');
    if (err) err.style.display = 'block';
    if (pinVerifyInput) {
      pinVerifyInput.value = '';
      pinVerifyInput.focus();
    }
  }
}

if (submitPinVerifyBtn) submitPinVerifyBtn.addEventListener('click', handlePinSubmit);
if (pinVerifyInput) {
  pinVerifyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handlePinSubmit();
  });
}

// ================= LOGIN GATE SCREEN CONTROLLER =================
const SESSION_AUTH_KEY = 'ios_reminders_session_user_id';

const loginScreen = document.getElementById('loginScreen');
const loginProfilesContainer = document.getElementById('loginProfilesContainer');
const openCreateProfileBtn = document.getElementById('openCreateProfileBtn');
const createProfileOverlay = document.getElementById('createProfileOverlay');
const closeCreateProfileBtn = document.getElementById('closeCreateProfileBtn');
const signupUsernameInput = document.getElementById('signupUsernameInput');
const signupPinInput = document.getElementById('signupPinInput');
const signupColorPicker = document.getElementById('signupColorPicker');
const signupErrorText = document.getElementById('signupErrorText');
const submitSignUpBtn = document.getElementById('submitSignUpBtn');

// PIN Prompt Modal Elements
const loginPinPromptOverlay = document.getElementById('loginPinPromptOverlay');
const pinPromptTitle = document.getElementById('pinPromptTitle');
const pinPromptSubtitle = document.getElementById('pinPromptSubtitle');
const cardPinInput = document.getElementById('cardPinInput');
const cardPinErrorText = document.getElementById('cardPinErrorText');
const submitCardPinBtn = document.getElementById('submitCardPinBtn');
const closePinPromptBtn = document.getElementById('closePinPromptBtn');

const drawerLogoutBtn = document.getElementById('drawerLogoutBtn');

let selectedSignupColor = '#0284c7';
let selectedSignupTheme = 'theme-blue';
let targetPinProfile = null;

function showLoginGateScreen() {
  if (tasksScreen) tasksScreen.classList.remove('active');
  const newTaskScreen = document.getElementById('newTaskScreen');
  if (newTaskScreen) newTaskScreen.classList.remove('active');
  const settingsScreen = document.getElementById('settingsScreen');
  if (settingsScreen) settingsScreen.classList.remove('active');
  if (loginScreen) loginScreen.classList.add('active');

  if (syncState.pushTimer) {
    clearTimeout(syncState.pushTimer);
    syncState.pushTimer = null;
  }
  appState.tasks = [];
  userState.currentUserId = null;

  renderLoginProfiles();
}

function showMainAppScreen(userId) {
  if (loginScreen) loginScreen.classList.remove('active');
  if (tasksScreen) tasksScreen.classList.add('active');
  safeSessionSet(SESSION_AUTH_KEY, userId);

  updateUserUI();
  renderDrawerLists();
  renderTasks();
}

function renderLoginProfiles() {
  if (!loginProfilesContainer) return;
  loginProfilesContainer.innerHTML = '';

  const THEME_CYCLE = ['theme-blue', 'theme-purple', 'theme-emerald', 'theme-sunset', 'theme-amber'];

  userState.users.forEach((u, idx) => {
    const themeClass = u.themeClass || THEME_CYCLE[idx % THEME_CYCLE.length];
    const initial = (u.username || 'U').charAt(0).toUpperCase();

    const card = document.createElement('div');
    card.className = `profile-card ${themeClass}`;
    card.setAttribute('data-uid', u.id);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <div class="profile-avatar-wrap">
        <span>${initial}</span>
      </div>
      <div class="profile-card-name">${escapeHtml(u.username)} ${u.pin ? '<i class="fa-solid fa-lock" style="font-size:0.75rem; opacity:0.75; margin-left:4px;" title="Password protected"></i>' : ''}</div>
      <div class="profile-arrow-btn" title="Enter profile">
        <i class="fa-solid fa-arrow-right"></i>
      </div>
    `;

    const handleCardSelection = (e) => {
      if (e) e.preventDefault();
      if (u.pin) {
        openCardPinPrompt(u);
      } else {
        // Instant lag-free entry
        switchUser(u.id, '');
        showMainAppScreen(u.id);
        showToast(`Welcome back, ${u.username}!`);
      }
    };

    card.addEventListener('click', handleCardSelection);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleCardSelection(e);
      }
    });

    loginProfilesContainer.appendChild(card);
  });
}

// PIN Prompt Handlers
function openCardPinPrompt(user) {
  targetPinProfile = user;
  if (!loginPinPromptOverlay) return;
  if (pinPromptTitle) pinPromptTitle.textContent = user.username;
  if (pinPromptSubtitle) pinPromptSubtitle.textContent = `Enter password for ${user.username}`;
  if (cardPinInput) {
    cardPinInput.value = '';
    setTimeout(() => cardPinInput.focus(), 120);
  }
  if (cardPinErrorText) cardPinErrorText.style.display = 'none';
  loginPinPromptOverlay.style.display = 'flex';
}

function closeCardPinPrompt() {
  if (loginPinPromptOverlay) loginPinPromptOverlay.style.display = 'none';
  targetPinProfile = null;
}

if (closePinPromptBtn) closePinPromptBtn.addEventListener('click', closeCardPinPrompt);

function handleCardPinSubmit() {
  if (!targetPinProfile) return;
  const pin = cardPinInput ? cardPinInput.value.trim() : '';
  if (pin === targetPinProfile.pin) {
    const uid = targetPinProfile.id;
    const name = targetPinProfile.username;
    closeCardPinPrompt();
    switchUser(uid, pin);
    showMainAppScreen(uid);
    showToast(`Welcome back, ${name}!`);
  } else {
    if (cardPinErrorText) cardPinErrorText.style.display = 'block';
    if (cardPinInput) {
      cardPinInput.value = '';
      cardPinInput.focus();
    }
  }
}

if (submitCardPinBtn) submitCardPinBtn.addEventListener('click', handleCardPinSubmit);
if (cardPinInput) {
  cardPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCardPinSubmit();
  });
}

// Create Profile Handlers
if (openCreateProfileBtn) {
  openCreateProfileBtn.addEventListener('click', () => {
    if (createProfileOverlay) {
      if (signupUsernameInput) {
        signupUsernameInput.value = '';
        setTimeout(() => signupUsernameInput.focus(), 120);
      }
      if (signupPinInput) signupPinInput.value = '';
      if (signupErrorText) signupErrorText.style.display = 'none';
      createProfileOverlay.style.display = 'flex';
    }
  });
}

if (closeCreateProfileBtn) {
  closeCreateProfileBtn.addEventListener('click', () => {
    if (createProfileOverlay) createProfileOverlay.style.display = 'none';
  });
}

// Color Picker selection
if (signupColorPicker) {
  signupColorPicker.addEventListener('click', (e) => {
    const dot = e.target.closest('.color-dot-opt');
    if (!dot) return;
    signupColorPicker.querySelectorAll('.color-dot-opt').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
    selectedSignupColor = dot.getAttribute('data-color') || '#0284c7';
    selectedSignupTheme = dot.getAttribute('data-theme') || 'theme-blue';
  });
}

// Submit Create User
if (submitSignUpBtn) {
  submitSignUpBtn.addEventListener('click', () => {
    const name = signupUsernameInput ? signupUsernameInput.value.trim() : '';
    const pin = signupPinInput ? signupPinInput.value.trim() : '';

    if (!name) {
      if (signupErrorText) {
        signupErrorText.textContent = 'Please enter a name';
        signupErrorText.style.display = 'block';
      }
      if (signupUsernameInput) signupUsernameInput.focus();
      return;
    }

    if (!pin) {
      if (signupErrorText) {
        signupErrorText.textContent = 'Password is required to create a new profile';
        signupErrorText.style.display = 'block';
      }
      if (signupPinInput) signupPinInput.focus();
      return;
    }

    if (userState.users.some(u => u.username.toLowerCase() === name.toLowerCase())) {
      if (signupErrorText) {
        signupErrorText.textContent = 'A profile with this name already exists';
        signupErrorText.style.display = 'block';
      }
      return;
    }

    if (signupErrorText) signupErrorText.style.display = 'none';

    // Create user with selected theme
    const newUser = {
      id: 'user_' + Date.now(),
      username: name,
      avatarColor: selectedSignupColor,
      themeClass: selectedSignupTheme,
      pin: pin,
      createdAt: Date.now()
    };

    saveState();

    const p = `ios_reminders_u_${newUser.id}_`;
    localStorage.setItem(`${p}tasks_v2`, '[]');
    localStorage.setItem(`${p}lists_v2`, JSON.stringify(DEFAULT_LISTS));
    localStorage.setItem(`${p}history`, '[]');
    localStorage.setItem(`${p}palette`, 'theme-indigo');

    userState.users.push(newUser);
    localStorage.setItem(USER_KEY_USERS, JSON.stringify(userState.users));
    syncProfilesPush();

    if (createProfileOverlay) createProfileOverlay.style.display = 'none';

    switchUser(newUser.id, newUser.pin);
    showMainAppScreen(newUser.id);
    showToast(`Welcome, ${name}!`);
  });
}

if (signupUsernameInput) {
  signupUsernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (signupPinInput) signupPinInput.focus();
    }
  });
}

if (signupPinInput) {
  signupPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && submitSignUpBtn) submitSignUpBtn.click();
  });
}

// Global Log Out function
function logoutUser() {
  if (syncState.pushTimer) {
    clearTimeout(syncState.pushTimer);
    syncState.pushTimer = null;
  }
  if (userState.currentUserId) {
    saveStateForUser(userState.currentUserId);
  }
  safeSessionRemove(SESSION_AUTH_KEY);
  safeStorageRemove(USER_KEY_CURRENT);
  userState.currentUserId = null;
  appState.tasks = [];
  appState.lists = DEFAULT_LISTS;
  appState.finishedHistory = [];
  if (typeof closeDrawer === 'function') closeDrawer();
  closeAuthModal();
  showLoginGateScreen();
  showToast('Logged out');
}

if (drawerLogoutBtn) {
  drawerLogoutBtn.addEventListener('click', logoutUser);
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', logoutUser);
}

// ================= INITIAL RENDER =================
syncProfilesPull();

const existingSessionUser = safeSessionGet(SESSION_AUTH_KEY);
if (existingSessionUser && userState.users.some(u => u.id === existingSessionUser)) {
  showMainAppScreen(existingSessionUser);
} else {
  // Always require login first when opening website!
  showLoginGateScreen();
}

// Register Service Worker for offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// ================= SETTINGS SCREEN LOGIC (matching user screenshot 2) =================
const settingsBtn = document.getElementById('settingsBtn');
const settingsScreen = document.getElementById('settingsScreen');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

// Subtitle elements
const settingThemeSubtitle = document.getElementById('settingThemeSubtitle');
const settingTimeFormatSubtitle = document.getElementById('settingTimeFormatSubtitle');
const settingFirstDaySubtitle = document.getElementById('settingFirstDaySubtitle');
const settingSortOrderSubtitle = document.getElementById('settingSortOrderSubtitle');
const settingSoundSubtitle = document.getElementById('settingSoundSubtitle');

// Toggles & Controls
const voiceToggle = document.getElementById('voiceToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const vibrationLevelsRow = document.getElementById('vibrationLevelsRow');
const daySummaryToggle = document.getElementById('daySummaryToggle');
const summaryTimePill = document.getElementById('summaryTimePill');
const hiddenSummaryTimeInput = document.getElementById('hiddenSummaryTimeInput');

// Choice Selection Modal
const settingChoiceModal = document.getElementById('settingChoiceModal');
const settingChoiceTitle = document.getElementById('settingChoiceTitle');
const settingChoiceList = document.getElementById('settingChoiceList');
const cancelSettingChoiceBtn = document.getElementById('cancelSettingChoiceBtn');

// Backup Rows
const settingExportRow = document.getElementById('settingExportRow');
const settingImportFileInput = document.getElementById('settingImportFileInput');
const settingClearLogRow = document.getElementById('settingClearLogRow');
const settingClearAllTasksRow = document.getElementById('settingClearAllTasksRow');

// Load settings preferences from storage or defaults
function loadCurrentUserSettings() {
  const p = getUserStoragePrefix();
  return JSON.parse(localStorage.getItem(`${p}settings`)) || JSON.parse(localStorage.getItem('ios_reminders_settings')) || {
    timeFormat: '12-hour',
    firstDayOfWeek: 'Sunday',
    sortOrder: 'Due date + Alphabetically',
    soundRingtone: 'Default ringtone (Bubble)',
    voiceEnabled: false,
    vibrationEnabled: true,
    vibrationLevel: 1,
    daySummaryEnabled: false,
    daySummaryTime: '8:00 AM'
  };
}

if (!appState.settings) {
  appState.settings = loadCurrentUserSettings();
}

function saveSettings() {
  const p = getUserStoragePrefix();
  localStorage.setItem(`${p}settings`, JSON.stringify(appState.settings));
}

const THEME_NAMES = {
  'theme-indigo': 'Electric Indigo',
  'theme-emerald': 'Cyber Emerald',
  'theme-sunset': 'Sunset Rose',
  'theme-light': 'Titanium Light'
};

function updateSettingsUI() {
  if (settingThemeSubtitle) {
    settingThemeSubtitle.textContent = THEME_NAMES[appState.colorTheme] || 'Electric Indigo';
  }
  if (settingTimeFormatSubtitle) {
    settingTimeFormatSubtitle.textContent = appState.settings.timeFormat;
  }
  if (settingFirstDaySubtitle) {
    settingFirstDaySubtitle.textContent = appState.settings.firstDayOfWeek;
  }
  if (settingSortOrderSubtitle) {
    settingSortOrderSubtitle.textContent = appState.settings.sortOrder;
  }
  if (settingSoundSubtitle) {
    settingSoundSubtitle.textContent = appState.settings.soundRingtone;
  }
  if (voiceToggle) {
    voiceToggle.checked = !!appState.settings.voiceEnabled;
  }
  if (vibrationToggle) {
    vibrationToggle.checked = !!appState.settings.vibrationEnabled;
  }
  if (vibrationLevelsRow) {
    vibrationLevelsRow.querySelectorAll('.vibe-num-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.vibe == appState.settings.vibrationLevel);
    });
  }
  if (daySummaryToggle) {
    daySummaryToggle.checked = !!appState.settings.daySummaryEnabled;
  }
  if (summaryTimePill) {
    summaryTimePill.textContent = appState.settings.daySummaryTime || '8:00 AM';
  }
}

// Open / Close Settings View Screen
function openSettingsView() {
  playSound('pop');
  closeDrawer();
  updateSettingsUI();
  tasksScreen.classList.remove('active');
  newTaskScreen.classList.remove('active');
  if (settingsScreen) {
    settingsScreen.classList.add('active');
    settingsScreen.scrollTop = 0;
  }
}

function closeSettingsView() {
  playSound('pop');
  if (settingsScreen) {
    settingsScreen.classList.remove('active');
  }
  tasksScreen.classList.add('active');
}

if (settingsBtn) settingsBtn.addEventListener('click', openSettingsView);
if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsView);

// Generic Choice Picker Modal
function openChoiceModal(title, options, currentValue, onSelect) {
  if (!settingChoiceModal) return;
  settingChoiceTitle.textContent = title;
  settingChoiceList.innerHTML = '';

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'repeat-dialog-item';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'space-between';
    btn.innerHTML = `
      <span>${opt.label || opt}</span>
      ${(opt.value || opt) === currentValue ? '<i class="fa-solid fa-check" style="color: var(--accent-cyan);"></i>' : ''}
    `;
    btn.addEventListener('click', () => {
      onSelect(opt.value || opt, opt.label || opt);
      settingChoiceModal.style.display = 'none';
      playSound('pop');
    });
    settingChoiceList.appendChild(btn);
  });

  settingChoiceModal.style.display = 'flex';
}

if (cancelSettingChoiceBtn) {
  cancelSettingChoiceBtn.addEventListener('click', () => {
    settingChoiceModal.style.display = 'none';
  });
}

if (settingChoiceModal) {
  settingChoiceModal.addEventListener('click', (e) => {
    if (e.target === settingChoiceModal) settingChoiceModal.style.display = 'none';
  });
}

// 0. Remove Ads Action
const settingRemoveAdsRow = document.getElementById('settingRemoveAdsRow');
if (settingRemoveAdsRow) {
  settingRemoveAdsRow.addEventListener('click', () => {
    playSound('check');
    showToast('Pro version active — 100% ad-free forever!', 'fa-circle-check');
  });
}

// 1. Theme Selection
const settingThemeRow = document.getElementById('settingThemeRow');
if (settingThemeRow) {
  settingThemeRow.addEventListener('click', () => {
    const themeOptions = [
      { value: 'theme-indigo', label: 'Electric Indigo' },
      { value: 'theme-emerald', label: 'Cyber Emerald' },
      { value: 'theme-sunset', label: 'Sunset Rose' },
      { value: 'theme-light', label: 'Titanium Light' }
    ];
    openChoiceModal('Theme', themeOptions, appState.colorTheme, (val, label) => {
      applyTheme(val);
      settingThemeSubtitle.textContent = label;
      showToast(`Theme: ${label}`, 'fa-palette');
    });
  });
}

// 2. Time Format Selection
const settingTimeFormatRow = document.getElementById('settingTimeFormatRow');
if (settingTimeFormatRow) {
  settingTimeFormatRow.addEventListener('click', () => {
    const timeOptions = ['12-hour', '24-hour'];
    openChoiceModal('Time format', timeOptions, appState.settings.timeFormat, (val) => {
      appState.settings.timeFormat = val;
      saveSettings();
      settingTimeFormatSubtitle.textContent = val;
      renderTasks();
      showToast(`Time format: ${val}`, 'fa-clock');
    });
  });
}

// 3. First Day of Week Selection
const settingFirstDayRow = document.getElementById('settingFirstDayRow');
if (settingFirstDayRow) {
  settingFirstDayRow.addEventListener('click', () => {
    const dayOptions = ['Sunday', 'Monday', 'Saturday'];
    openChoiceModal('First day of week', dayOptions, appState.settings.firstDayOfWeek, (val) => {
      appState.settings.firstDayOfWeek = val;
      saveSettings();
      settingFirstDaySubtitle.textContent = val;
      showToast(`First day: ${val}`, 'fa-calendar-days');
    });
  });
}

// 4. Sort Order Selection
const settingSortOrderRow = document.getElementById('settingSortOrderRow');
if (settingSortOrderRow) {
  settingSortOrderRow.addEventListener('click', () => {
    const sortOptions = [
      'Due date + Alphabetically',
      'Due date only',
      'Alphabetically',
      'Creation order'
    ];
    openChoiceModal('Sort order', sortOptions, appState.settings.sortOrder, (val) => {
      appState.settings.sortOrder = val;
      saveSettings();
      settingSortOrderSubtitle.textContent = val;
      renderTasks();
      showToast(`Sort order: ${val}`, 'fa-bars-staggered');
    });
  });
}

// 5. Sound Selection
const settingSoundRow = document.getElementById('settingSoundRow');
if (settingSoundRow) {
  settingSoundRow.addEventListener('click', () => {
    const soundOptions = [
      'Default ringtone (Bubble)',
      'Chime',
      'Pop',
      'Silent'
    ];
    openChoiceModal('Sound', soundOptions, appState.settings.soundRingtone, (val) => {
      appState.settings.soundRingtone = val;
      appState.audioEnabled = val !== 'Silent';
      saveSettings();
      saveState();
      settingSoundSubtitle.textContent = val;
      if (val !== 'Silent') playSound('check');
      showToast(`Sound: ${val}`, 'fa-music');
    });
  });
}

// 6. Voice Toggle
if (voiceToggle) {
  voiceToggle.addEventListener('change', () => {
    appState.settings.voiceEnabled = voiceToggle.checked;
    saveSettings();
    showToast(voiceToggle.checked ? 'TTS Voice enabled' : 'TTS Voice disabled', 'fa-head-side-cough');
  });
}

// 7. Vibration Toggle & Levels
if (vibrationToggle) {
  vibrationToggle.addEventListener('change', () => {
    appState.settings.vibrationEnabled = vibrationToggle.checked;
    saveSettings();
    if (vibrationToggle.checked && navigator.vibrate) {
      navigator.vibrate(100);
    }
    showToast(vibrationToggle.checked ? 'Vibration enabled' : 'Vibration disabled', 'fa-mobile-screen-button');
  });
}

if (vibrationLevelsRow) {
  vibrationLevelsRow.querySelectorAll('.vibe-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = Number(btn.dataset.vibe);
      appState.settings.vibrationLevel = level;
      saveSettings();
      vibrationLevelsRow.querySelectorAll('.vibe-num-btn').forEach(b => b.classList.toggle('active', b === btn));
      if (appState.settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(level * 40);
      }
      playSound('pop');
    });
  });
}

// 8. Day Summary Toggle & Time
if (daySummaryToggle) {
  daySummaryToggle.addEventListener('change', () => {
    appState.settings.daySummaryEnabled = daySummaryToggle.checked;
    saveSettings();
    showToast(daySummaryToggle.checked ? 'Day summary active' : 'Day summary disabled', 'fa-calendar-check');
  });
}

if (summaryTimePill && hiddenSummaryTimeInput) {
  summaryTimePill.addEventListener('click', () => {
    if (hiddenSummaryTimeInput.showPicker) {
      try { hiddenSummaryTimeInput.showPicker(); } catch (e) { hiddenSummaryTimeInput.focus(); }
    } else {
      hiddenSummaryTimeInput.focus();
      hiddenSummaryTimeInput.click();
    }
  });

  hiddenSummaryTimeInput.addEventListener('change', () => {
    if (hiddenSummaryTimeInput.value) {
      const [h, m] = hiddenSummaryTimeInput.value.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const formatted = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
      appState.settings.daySummaryTime = formatted;
      summaryTimePill.textContent = formatted;
      saveSettings();
      showToast(`Summary set to ${formatted}`, 'fa-clock');
    }
  });
}

// 9. Data & Backup Actions
if (settingExportRow) {
  settingExportRow.addEventListener('click', () => {
    const exportObj = {
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      tasks: appState.tasks,
      lists: appState.lists,
      finishedHistory: appState.finishedHistory,
      colorTheme: appState.colorTheme,
      settings: appState.settings
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `reminders_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    playSound('pop');
    showToast('Backup downloaded!', 'fa-file-export');
  });
}

if (settingImportFileInput) {
  settingImportFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported.tasks)) {
          appState.tasks = imported.tasks;
          if (Array.isArray(imported.lists)) appState.lists = imported.lists;
          if (Array.isArray(imported.finishedHistory)) appState.finishedHistory = imported.finishedHistory;
          if (imported.colorTheme) applyTheme(imported.colorTheme);
          if (imported.settings) {
            appState.settings = imported.settings;
            saveSettings();
          }

          saveState();
          renderTasks();
          renderDrawerLists();
          populateListSelect();
          updateSettingsUI();
          playSound('check');
          showToast('Backup restored successfully!', 'fa-circle-check');
        } else {
          showToast('Invalid backup file format', 'fa-triangle-exclamation');
        }
      } catch (err) {
        showToast('Error reading backup file', 'fa-triangle-exclamation');
      }
      settingImportFileInput.value = '';
    };
    reader.readAsText(file);
  });
}

if (settingClearLogRow) {
  settingClearLogRow.addEventListener('click', () => {
    if (confirm('Clear completed payment log history?')) {
      appState.finishedHistory = [];
      saveState();
      playSound('pop');
      showToast('Payment log cleared', 'fa-clock-rotate-left');
      if (appState.currentList === 'Finished') renderTasks();
    }
  });
}

if (settingClearAllTasksRow) {
  settingClearAllTasksRow.addEventListener('click', () => {
    if (confirm('Delete all tasks and reminders?')) {
      appState.tasks = [];
      appState.finishedHistory = [];
      saveState();
      renderTasks();
      renderDrawerLists();
      playSound('pop');
      showToast('All tasks cleared!', 'fa-trash-can');
    }
  });
}

// Initialize settings on page load
updateSettingsUI();

// ================= REMINDER NOTIFICATION SYSTEM =================
const REMINDER_CHANNEL_ID = 'emi_reminders_v2';
const notifiedTaskIds = new Set(JSON.parse(localStorage.getItem('ios_reminders_notified_v1') || '[]'));

function saveNotifiedTaskIds() {
  localStorage.setItem('ios_reminders_notified_v1', JSON.stringify([...notifiedTaskIds]));
}

function getLocalNotificationsPlugin() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    return window.Capacitor.Plugins.LocalNotifications;
  }
  return null;
}

async function initNotificationChannel() {
  const ln = getLocalNotificationsPlugin();
  if (!ln) return;
  try {
    // Delete older silent/cached channel
    try {
      await ln.deleteChannel({ id: 'emi_reminders_channel_v1' });
    } catch (_) {}

    // High-importance channel ensures sound, vibration, and heads-up banner on Android 8 - 16
    await ln.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'EMI Task Reminders',
      description: 'Alerts when EMI bill and task time is reached',
      importance: 5, // IMPORTANCE_HIGH
      visibility: 1, // VISIBILITY_PUBLIC
      sound: 'reminder_sound.wav', // In android/app/src/main/res/raw/reminder_sound.wav
      vibration: true,
      lights: true,
      lightColor: '#ff334b'
    });
  } catch (e) {
    console.warn('Channel creation error:', e);
  }
}

async function requestNotificationPermissions() {
  const ln = getLocalNotificationsPlugin();
  if (ln) {
    try {
      await initNotificationChannel();
      const status = await ln.requestPermissions();
      if (status && status.display === 'granted') {
        return true;
      }
    } catch (e) {
      console.warn('Capacitor notification permission error:', e);
    }
  }

  // Web Notification API (safely compatible with iOS Safari & modern browsers)
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;

      return await new Promise((resolve) => {
        try {
          const res = Notification.requestPermission((p) => {
            resolve(p === 'granted');
          });
          if (res && typeof res.then === 'function') {
            res.then((p) => resolve(p === 'granted')).catch(() => resolve(false));
          }
        } catch (err) {
          resolve(false);
        }
      });
    } catch (e) {
      return false;
    }
  }
  return false;
}

// Generate stable positive integer hash for task ID
function getNotificationId(idStr) {
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

async function syncScheduledNotifications() {
  const ln = getLocalNotificationsPlugin();
  if (!ln) return;

  try {
    await initNotificationChannel();
    const pending = await ln.getPending();
    if (pending && pending.notifications && pending.notifications.length > 0) {
      await ln.cancel({ notifications: pending.notifications });
    }

    const futureTasks = appState.tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      const due = new Date(t.dueDate).getTime();
      return due > Date.now();
    });

    if (futureTasks.length === 0) return;

    const notificationsToSchedule = futureTasks.slice(0, 50).map(t => {
      const due = new Date(t.dueDate);
      return {
        id: getNotificationId(String(t.id)),
        title: `⏰ EMI Reminder: ${t.title}`,
        body: `${t.list ? `List: ${t.list} • ` : ''}Due now: ${formatTaskMeta(t)}`,
        schedule: {
          at: due,
          allowWhileIdle: true
        },
        channelId: REMINDER_CHANNEL_ID,
        sound: 'reminder_sound.wav',
        extra: { taskId: t.id },
        iconColor: '#ff334b'
      };
    });

    await ln.schedule({ notifications: notificationsToSchedule });
  } catch (err) {
    console.warn('Error scheduling local notifications:', err);
  }
}

// Fire an immediate reminder notification for a task
function fireReminderNotification(task, isTest = false) {
  if (!task) return;
  const title = isTest ? `⏰ Test Reminder: ${task.title}` : `⏰ EMI Reminder: ${task.title}`;
  const body = isTest ? `Notification is working! (${task.list})` : `Task time is hit! ${formatTaskMeta(task)}`;

  // 1. Native Capacitor Local Notification
  const ln = getLocalNotificationsPlugin();
  if (ln) {
    initNotificationChannel().then(() => {
      ln.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 1000000),
          title: title,
          body: body,
          schedule: {
            at: new Date(Date.now() + 100),
            allowWhileIdle: true
          },
          channelId: REMINDER_CHANNEL_ID,
          sound: 'reminder_sound.wav',
          extra: { taskId: task.id },
          iconColor: '#ff334b'
        }]
      }).catch((e) => console.warn('Capacitor schedule immediate error:', e));
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    // 2. Web Notification API
    try {
      new Notification(title, {
        body: body,
        icon: '/icon-192.png',
        tag: `reminder-${task.id}`
      });
    } catch (e) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body: body,
            icon: '/icon-192.png',
            tag: `reminder-${task.id}`
          });
        }).catch(() => {});
      }
    }
  }

  // 3. Audio chime
  if (appState.audioEnabled) {
    playSound('reminder');
  }

  // 4. Haptic vibration
  if (appState.settings?.vibrationEnabled && navigator.vibrate) {
    const level = appState.settings.vibrationLevel || 1;
    navigator.vibrate([120 * level, 80, 180 * level]);
  }

  // 5. TTS Voice if enabled in settings
  if (appState.settings?.voiceEnabled && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`Reminder: ${task.title}`);
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }

  // 6. In-App Notification Toast
  showToast(isTest ? `🔔 Notification sent!` : `⏰ Time reached: "${task.title}"`, 'fa-bell');
}

// Background / in-app checker for crossed tasks
function checkTasksForCrossedReminders() {
  const now = Date.now();
  let newlyCrossed = false;

  appState.tasks.forEach(task => {
    if (!task.dueDate || task.completed) return;
    const due = new Date(task.dueDate).getTime();
    if (isNaN(due)) return;

    // If time reached / crossed within the past 2 hours and hasn't notified yet
    if (due <= now && (now - due) < 1000 * 60 * 60 * 2) {
      if (!notifiedTaskIds.has(task.id)) {
        notifiedTaskIds.add(task.id);
        newlyCrossed = true;
        fireReminderNotification(task);
      }
    }
  });

  if (newlyCrossed) {
    saveNotifiedTaskIds();
  }

  // Always re-render so crossed times dynamically update to red without manual refresh
  renderTasks();
}

// Test Notification button in Settings
const settingTestNotifRow = document.getElementById('settingTestNotifRow');
if (settingTestNotifRow) {
  settingTestNotifRow.addEventListener('click', async () => {
    await requestNotificationPermissions();
    const sampleTask = appState.tasks.find(t => !t.completed) || {
      id: 'test-reminder',
      title: 'Home Current Bill',
      list: 'Personal',
      dueDate: new Date().toISOString()
    };
    fireReminderNotification(sampleTask, true);
  });
}

// Initialize notification system
setTimeout(() => {
  // Sync scheduled native notifications without triggering unprompted browser permission prompt
  if (typeof syncScheduledNotifications === 'function') {
    syncScheduledNotifications();
  }
}, 1000);

// Check for newly crossed task times every 5 seconds for instant notification when time hits
setInterval(checkTasksForCrossedReminders, 5000);

// Allow clicking a notification to open the app or task
const localNotificationsPlugin = getLocalNotificationsPlugin();
if (localNotificationsPlugin) {
  localNotificationsPlugin.addListener('localNotificationActionPerformed', (notification) => {
    const taskId = notification.notification?.extra?.taskId;
    if (taskId) {
      openEditTaskView(taskId);
    }
  });
}

// ================= CLOUD SYNC EVENT TRIGGERS =================
// 1. Sync on window / tab focus (e.g. switching between mobile and laptop)
window.addEventListener('focus', () => {
  cloudSyncPull();
});

// 2. Sync on visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    cloudSyncPull();
  }
});

// 3. Sync when device regains network connectivity
window.addEventListener('online', () => {
  cloudSyncPull(true);
});

// 4. Periodic background sync every 10 seconds when visible
setInterval(() => {
  if (document.visibilityState === 'visible') {
    cloudSyncPull();
  }
}, 10000);

// 5. Header Sync Button Click
const cloudSyncStatusBtn = document.getElementById('cloudSyncStatusBtn');
if (cloudSyncStatusBtn) {
  cloudSyncStatusBtn.addEventListener('click', async () => {
    showToast('☁️ Syncing with Cloudflare D1...', 'fa-arrows-rotate');
    await cloudSyncPull(true);
    showToast('✅ Cloud Database Synced!', 'fa-cloud-check');
  });
}

// 6. Settings Cloud Sync & Diagnostics Row Listeners
const settingSyncNowRow = document.getElementById('settingSyncNowRow');
if (settingSyncNowRow) {
  settingSyncNowRow.addEventListener('click', async () => {
    showToast('☁️ Syncing with Cloudflare D1...', 'fa-arrows-rotate');
    await cloudSyncPull(true);
    showToast('✅ Cloud Database Synced!', 'fa-cloud-check');
  });
}

const settingDbDiagRow = document.getElementById('settingDbDiagRow');
if (settingDbDiagRow) {
  settingDbDiagRow.addEventListener('click', async () => {
    const t0 = performance.now();
    try {
      showToast('Testing database latency...', 'fa-server');
      const resp = await fetch(`${CLOUD_API_BASE}/api/health`, { cache: 'no-store' });
      const lat = Math.round(performance.now() - t0);
      if (resp.ok) {
        const data = await resp.json();
        const diagSub = document.getElementById('settingDbDiagSub');
        if (diagSub) {
          diagSub.textContent = `Latency: ${lat}ms • D1: emi-reminder-db • Records: ${data.recordsCount}`;
        }
        showToast(`⚡ DB Online: ${lat}ms (${data.recordsCount} records)`, 'fa-check');
      } else {
        showToast('⚠️ DB responded with error', 'fa-triangle-exclamation');
      }
    } catch (err) {
      showToast('❌ DB connection failed', 'fa-triangle-exclamation');
    }
  });
}
