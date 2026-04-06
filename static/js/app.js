const API_BASE = '/api';
let currentUser = null;
let users = [];
let currentPage = 'index';

// DOM элементы
const appEl = document.getElementById('app');
const navEl = document.getElementById('main-nav');
const userInfoEl = document.getElementById('user-info');
let loaderEl = document.getElementById('loader');
let modalEl = document.getElementById('modal');

// Создаём элементы, если их нет (на всякий случай)
if (!loaderEl) {
    loaderEl = document.createElement('div');
    loaderEl.id = 'loader';
    loaderEl.className = 'hidden fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50';
    loaderEl.innerHTML = '<div class="loader"></div>';
    document.body.appendChild(loaderEl);
}
if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'modal';
    modalEl.className = 'hidden fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40';
    modalEl.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 id="modal-title" class="text-2xl font-bold text-gray-800 mb-4">Новая запись</h2>
            <form id="modal-form">
                <input type="hidden" id="record-id">
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 mb-1">Тип</label><select id="type" required class="w-full border border-gray-300 rounded-lg px-3 py-2"><option value="late">Опоздание</option><option value="absence">Отсутствие</option></select></div>
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 mb-1">Дата</label><input type="date" id="date" required class="w-full border border-gray-300 rounded-lg px-3 py-2"></div>
                <div class="mb-4"><label class="block text-sm font-medium text-gray-700 mb-1">Причина</label><textarea id="reason" required rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2"></textarea></div>
                <div class="flex justify-end space-x-3"><button type="button" id="modal-cancel" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Отмена</button><button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Сохранить</button></div>
            </form>
        </div>
    `;
    document.body.appendChild(modalEl);
}

const modalForm = document.getElementById('modal-form');
const modalTitle = document.getElementById('modal-title');
const recordIdInput = document.getElementById('record-id');
const typeInput = document.getElementById('type');
const dateInput = document.getElementById('date');
const reasonInput = document.getElementById('reason');
const modalCancel = document.getElementById('modal-cancel');

// ---------- Helpers ----------
async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const userId = localStorage.getItem('userId');
    if (userId) headers['X-User-Id'] = userId;
    try {
        const res = await fetch(url, { ...options, headers });
        let data;
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) data = await res.json();
        else data = await res.text();
        if (!res.ok) throw new Error(data.error || data || res.statusText);
        return data;
    } catch (err) { throw err; }
}

function showLoader() { loaderEl?.classList.remove('hidden'); }
function hideLoader() { loaderEl?.classList.add('hidden'); }
function showError(msg) { alert(msg); }

function validateRecordForm({ type, date, reason }) {
    if (!type || !date || !reason) return { valid: false, error: 'Все поля обязательны' };
    if (date > new Date().toISOString().split('T')[0]) return { valid: false, error: 'Дата не может быть в будущем' };
    return { valid: true };
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('ru-RU');
}

// ---------- Рендер страниц ----------
function renderIndex() {
    appEl.innerHTML = `
        <div class="bg-white rounded-xl shadow-md p-8 text-center mb-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-3">Добро пожаловать в Attendance Tracker</h1>
            <p class="text-gray-700 text-lg mb-6">Система учёта опозданий и отсутствий сотрудников</p>
            ${!currentUser ? '<button onclick="window.loginPage()" class="btn-primary text-white">Войти</button>' : ''}
        </div>
        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-3">О нас</h2>
            <p class="text-gray-800">Attendance Tracker — современная система для повышения дисциплины и прозрачности учёта рабочего времени.</p>
        </div>
        <div class="bg-white rounded-xl shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Контакты</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                    <i class="fas fa-envelope text-3xl text-primary mb-2"></i>
                    <p class="font-semibold text-gray-900">support@attendancetracker.ru</p>
                </div>
                <div>
                    <i class="fas fa-phone text-3xl text-primary mb-2"></i>
                    <p class="font-semibold text-gray-900">+7 (123) 456-78-90</p>
                </div>
                <div>
                    <i class="fas fa-map-marker-alt text-3xl text-primary mb-2"></i>
                    <p class="font-semibold text-gray-900">Москва, ул. Программистов</p>
                </div>
            </div>
        </div>
    `;
}

function renderLogin() {
    appEl.innerHTML = `
        <div class="max-w-md mx-auto bg-white rounded-xl shadow-md p-8">
            <h1 class="text-2xl font-bold text-center text-gray-800 mb-6">Вход в систему</h1>
            <p class="text-gray-600 text-center mb-6">Выберите сотрудника</p>
            <div id="user-list" class="space-y-3"></div>
        </div>
    `;
    const list = document.getElementById('user-list');
    list.innerHTML = '';
    users.forEach(user => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition flex items-center justify-between';
        btn.innerHTML = `<span class="font-medium">${user.name}</span><span class="text-xs text-gray-500">${user.role === 'admin' ? 'админ' : 'сотрудник'}</span>`;
        btn.onclick = () => login(user.id);
        list.appendChild(btn);
    });
}

async function renderMyRecords() {
    appEl.innerHTML = `
        <div>
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold text-gray-800">Мои записи</h1>
                <button id="create-record-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Новая запись
                </button>
            </div>
            <div id="records-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            <div id="empty-records" class="bg-white rounded-xl shadow-md p-12 text-center text-gray-500 hidden">На данный момент записей нет.</div>
        </div>
    `;
    document.getElementById('create-record-btn').onclick = () => renderRecordForm();
    await loadMyRecordsData();
}

async function loadMyRecordsData() {
    showLoader();
    const container = document.getElementById('records-container');
    const empty = document.getElementById('empty-records');
    if (!container || !empty) { hideLoader(); return; }
    try {
        const records = await apiFetch('/attendance-records/my');
        if (!Array.isArray(records) || records.length === 0) {
            empty.classList.remove('hidden');
            container.innerHTML = '';
            return;
        }
        empty.classList.add('hidden');
        container.innerHTML = records.map(record => `
            <div class="record-card bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition" data-type="${record.type}">
                <div class="flex items-center gap-2 mb-3">
                    <span class="type-icon ${record.type === 'late' ? 'late' : 'absence'}"></span>
                    <span class="font-bold text-lg ${record.type === 'late' ? 'text-amber-600' : 'text-indigo-600'}">
                        ${record.type === 'late' ? 'Опоздание' : 'Отсутствие'}
                    </span>
                </div>
                <div class="mb-2"><div class="text-xs text-gray-500 uppercase">Дата</div><p class="font-medium">${formatDate(record.date)}</p></div>
                <div class="mb-3"><div class="text-xs text-gray-500 uppercase">Причина</div><p class="text-gray-700">${escapeHtml(record.reason)}</p></div>
                <div class="mb-4"><div class="text-xs text-gray-500 uppercase">Статус</div><span class="badge-${record.status}">${record.status === 'pending' ? 'На рассмотрении' : record.status === 'approved' ? 'Подтверждено' : 'Отклонено'}</span></div>
                ${record.status === 'pending' ? `
                    <div class="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <button onclick="window.editRecord(${record.id})" class="text-gray-500 hover:text-indigo-600 transition" title="Редактировать">✎</button>
                        <button onclick="window.deleteRecord(${record.id})" class="text-gray-500 hover:text-red-600 transition" title="Удалить">🗑</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        showError('Ошибка загрузки записей: ' + err.message);
    } finally { hideLoader(); }
}

async function renderAdminRecords() {
    appEl.innerHTML = `
        <div>
            <h1 class="text-2xl font-bold text-gray-800 mb-6">Модерация записей</h1>
            <div class="bg-white rounded-xl shadow-md p-6 mb-8">
                <form id="filter-form" class="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Сотрудник</label><select id="filter-user" name="user_id" class="w-full border border-gray-300 rounded-lg px-3 py-2"></select></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Тип</label><select name="type" class="w-full border border-gray-300 rounded-lg px-3 py-2"><option value="">Все</option><option value="late">Опоздание</option><option value="absence">Отсутствие</option></select></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Статус</label><select name="status" class="w-full border border-gray-300 rounded-lg px-3 py-2"><option value="">Все</option><option value="pending">На рассмотрении</option><option value="approved">Подтверждено</option><option value="rejected">Отклонено</option></select></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Дата с</label><input type="date" name="from" class="w-full border border-gray-300 rounded-lg px-3 py-2"></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Дата по</label><input type="date" name="to" class="w-full border border-gray-300 rounded-lg px-3 py-2"></div>
                    <div class="md:col-span-5 flex justify-end gap-3">
                        <button type="button" id="reset-filters" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Сбросить</button>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Применить</button>
                    </div>
                </form>
            </div>
            <div id="admin-records-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            <div id="admin-empty-records" class="bg-white rounded-xl shadow-md p-12 text-center text-gray-500 hidden">Нет записей по заданным фильтрам.</div>
        </div>
    `;
    const userSelect = document.getElementById('filter-user');
    userSelect.innerHTML = '<option value="">Все</option>' + users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
    document.getElementById('filter-form').addEventListener('submit', async e => { e.preventDefault(); await loadAdminRecordsData(); });
    document.getElementById('reset-filters').addEventListener('click', () => { document.getElementById('filter-form').reset(); loadAdminRecordsData(); });
    await loadAdminRecordsData();
}

async function loadAdminRecordsData() {
    showLoader();
    try {
        const form = document.getElementById('filter-form');
        if (!form) return;
        const params = new URLSearchParams(new FormData(form)).toString();
        const records = await apiFetch('/attendance-records?' + params);
        const container = document.getElementById('admin-records-container');
        const empty = document.getElementById('admin-empty-records');
        if (!container || !empty) return;
        if (!Array.isArray(records) || records.length === 0) {
            empty.classList.remove('hidden');
            container.innerHTML = '';
            return;
        }
        empty.classList.add('hidden');
        const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
        container.innerHTML = records.map(record => `
            <div class="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-sm font-medium text-gray-500">${formatDate(record.date)}</span>
                    <span class="badge-${record.status}">${record.status === 'pending' ? 'На рассмотрении' : record.status === 'approved' ? 'Подтверждено' : 'Отклонено'}</span>
                </div>
                <div class="font-bold text-indigo-600 mb-2">${record.type === 'late' ? 'Опоздание' : 'Отсутствие'}</div>
                <p class="text-sm text-gray-600"><span class="font-medium">Сотрудник:</span> ${escapeHtml(userMap[record.user_id] || 'Неизвестно')}</p>
                <p class="text-sm text-gray-600 mt-1">${escapeHtml(record.reason)}</p>
                ${record.status === 'pending' ? `
                    <div class="flex justify-end gap-3 mt-3 pt-2 border-t border-gray-100">
                        <button onclick="window.approveRecord(${record.id})" class="text-green-600 hover:text-green-800 transition" title="Подтвердить">✓</button>
                        <button onclick="window.rejectRecord(${record.id})" class="text-red-600 hover:text-red-800 transition" title="Отклонить">✗</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        showError('Ошибка загрузки: ' + err.message);
    } finally { hideLoader(); }
}

async function renderAdminReports() {
    appEl.innerHTML = `
        <div>
            <h1 class="text-2xl font-bold text-gray-800 mb-6">Отчёты</h1>
            <div class="bg-white rounded-xl shadow-md p-6 mb-8">
                <form id="report-filter-form" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Сотрудник</label><select id="report-user" name="user_id" class="w-full border border-gray-300 rounded-lg px-3 py-2"><option value="">Все</option></select></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Период с</label><input type="date" name="from" class="w-full border border-gray-300 rounded-lg px-3 py-2"></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Период по</label><input type="date" name="to" class="w-full border border-gray-300 rounded-lg px-3 py-2"></div>
                    <div class="flex items-end"><button type="submit" class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Сформировать</button></div>
                </form>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white rounded-xl shadow-md p-6 text-center"><h3 class="text-gray-500 text-sm">Всего записей</h3><p id="total-count" class="text-3xl font-bold text-gray-800">0</p></div>
                <div class="bg-white rounded-xl shadow-md p-6 text-center"><h3 class="text-gray-500 text-sm">Опозданий</h3><p id="late-count" class="text-3xl font-bold text-amber-600">0</p></div>
                <div class="bg-white rounded-xl shadow-md p-6 text-center"><h3 class="text-gray-500 text-sm">Отсутствий</h3><p id="absence-count" class="text-3xl font-bold text-indigo-600">0</p></div>
            </div>
            <div id="report-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
    `;
    const userSelect = document.getElementById('report-user');
    userSelect.innerHTML = '<option value="">Все</option>' + users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('');
    document.getElementById('report-filter-form').addEventListener('submit', async e => { e.preventDefault(); await loadReportData(); });
    await loadReportData();
}

async function loadReportData() {
    showLoader();
    try {
        const form = document.getElementById('report-filter-form');
        if (!form) return;
        const params = new URLSearchParams(new FormData(form)).toString();
        const records = await apiFetch('/attendance-records?' + params);
        const total = Array.isArray(records) ? records.length : 0;
        const late = Array.isArray(records) ? records.filter(r => r.type === 'late').length : 0;
        const absence = total - late;
        document.getElementById('total-count').textContent = total;
        document.getElementById('late-count').textContent = late;
        document.getElementById('absence-count').textContent = absence;
        const container = document.getElementById('report-container');
        if (!Array.isArray(records) || records.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">Нет записей</div>';
            return;
        }
        const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
        container.innerHTML = records.map(record => `
            <div class="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-sm font-medium text-gray-500">${formatDate(record.date)}</span>
                    <span class="badge-${record.status}">${record.status === 'pending' ? 'На рассмотрении' : record.status === 'approved' ? 'Подтверждено' : 'Отклонено'}</span>
                </div>
                <div class="font-bold text-indigo-600 mb-2">${record.type === 'late' ? 'Опоздание' : 'Отсутствие'}</div>
                <p class="text-sm text-gray-600"><span class="font-medium">Сотрудник:</span> ${escapeHtml(userMap[record.user_id] || 'Неизвестно')}</p>
            </div>
        `).join('');
    } catch (err) {
        showError('Ошибка загрузки отчёта: ' + err.message);
    } finally { hideLoader(); }
}

// ---------- Модальное окно (без перекрашивания) ----------
function renderRecordForm(recordId = null) {
    modalTitle.textContent = recordId ? 'Редактировать запись' : 'Новая запись';
    recordIdInput.value = recordId || '';
    if (recordId) {
        showLoader();
        apiFetch('/attendance-records/my')
            .then(records => {
                const record = records.find(r => r.id == recordId);
                if (record) {
                    typeInput.value = record.type;
                    dateInput.value = record.date;
                    reasonInput.value = record.reason;
                }
            })
            .catch(err => showError('Ошибка загрузки записи: ' + err.message))
            .finally(() => hideLoader());
    } else {
        typeInput.value = 'late';
        dateInput.value = '';
        reasonInput.value = '';
        dateInput.max = new Date().toISOString().split('T')[0];
    }
    modalEl.classList.remove('hidden');
}

async function handleRecordSubmit(e) {
    e.preventDefault();
    const data = { type: typeInput.value, date: dateInput.value, reason: reasonInput.value };
    const validation = validateRecordForm(data);
    if (!validation.valid) { showError(validation.error); return; }
    const id = recordIdInput.value;
    showLoader();
    try {
        if (id) await apiFetch(`/attendance-records/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        else await apiFetch('/attendance-records', { method: 'POST', body: JSON.stringify(data) });
        closeModal();
        if (currentPage === 'my-records') await loadMyRecordsData();
        else if (currentPage === 'admin-records') await loadAdminRecordsData();
    } catch (err) { showError('Ошибка сохранения: ' + err.message); }
    finally { hideLoader(); }
}

function closeModal() {
    modalEl.classList.add('hidden');
    modalForm.reset();
    recordIdInput.value = '';
}

// ---------- Действия с записями ----------
async function deleteRecord(id) {
    if (!confirm('Удалить запись?')) return;
    showLoader();
    try {
        await apiFetch(`/attendance-records/${id}`, { method: 'DELETE' });
        await loadMyRecordsData();
    } catch (err) { showError('Ошибка удаления: ' + err.message); }
    finally { hideLoader(); }
}

async function approveRecord(id) {
    showLoader();
    try {
        await apiFetch(`/attendance-records/${id}/approve`, { method: 'POST' });
        await loadAdminRecordsData();
    } catch (err) { showError('Ошибка: ' + err.message); }
    finally { hideLoader(); }
}

async function rejectRecord(id) {
    showLoader();
    try {
        await apiFetch(`/attendance-records/${id}/reject`, { method: 'POST' });
        await loadAdminRecordsData();
    } catch (err) { showError('Ошибка: ' + err.message); }
    finally { hideLoader(); }
}

// ---------- Вход / выход ----------
async function login(userId) {
    localStorage.setItem('userId', userId);
    await loadUser();
    updateNavigation();
    updateUserInfo();
    changePage(currentUser?.role === 'admin' ? 'admin-records' : 'my-records');
}

async function logout() {
    localStorage.removeItem('userId');
    currentUser = null;
    updateNavigation();
    updateUserInfo();
    changePage('index');
}

function loginPage() { changePage('login'); }

// ---------- Навигация ----------
async function changePage(page) {
    currentPage = page;
    switch (page) {
        case 'index': renderIndex(); break;
        case 'login': renderLogin(); break;
        case 'my-records': await renderMyRecords(); break;
        case 'admin-records': await renderAdminRecords(); break;
        case 'admin-reports': await renderAdminReports(); break;
        default: currentUser ? changePage(currentUser.role === 'admin' ? 'admin-records' : 'my-records') : renderIndex();
    }
    updateActiveNavLink(page);
}

function updateNavigation() {
    if (!navEl) return;
    if (!currentUser) { navEl.innerHTML = ''; return; }
    navEl.innerHTML = currentUser.role === 'admin'
        ? `<button class="nav-link text-gray-600 hover:text-indigo-600 transition" data-page="admin-records">Модерация</button>
           <button class="nav-link text-gray-600 hover:text-indigo-600 transition" data-page="admin-reports">Отчёты</button>`
        : `<button class="nav-link text-gray-600 hover:text-indigo-600 transition" data-page="my-records">Мои записи</button>`;
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', (e) => changePage(e.target.dataset.page));
    });
}

function updateUserInfo() {
    if (!userInfoEl) return;
    if (currentUser) {
        userInfoEl.innerHTML = `
            <span class="text-gray-700">${escapeHtml(currentUser.name)} (${currentUser.role === 'admin' ? 'админ' : 'сотрудник'})</span>
            <button onclick="window.logout()" class="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">Выйти</button>
        `;
    } else {
        userInfoEl.innerHTML = `<button onclick="window.loginPage()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Войти</button>`;
    }
}

function updateActiveNavLink(page) {
    document.querySelectorAll('.nav-link').forEach(btn => {
        if (btn.dataset.page === page) btn.classList.add('text-indigo-600', 'font-medium');
        else btn.classList.remove('text-indigo-600', 'font-medium');
    });
}

// ---------- Загрузка пользователей ----------
async function fetchUsers() {
    try { users = await apiFetch('/users'); }
    catch (err) { showError('Не удалось загрузить список пользователей'); }
}

async function loadUser() {
    const userId = localStorage.getItem('userId');
    if (!userId) return null;
    if (users.length === 0) await fetchUsers();
    currentUser = users.find(u => u.id == userId);
    return currentUser;
}

// ---------- Экранирование HTML ----------
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ---------- Инициализация ----------
async function initApp() {
    await fetchUsers();
    await loadUser();
    updateUserInfo();
    const logoLink = document.querySelector('header a[href="/"]');
    if (logoLink) logoLink.addEventListener('click', (e) => { e.preventDefault(); changePage('index'); });
    updateNavigation();
    if (!currentUser) await changePage('index');
    else await changePage(currentUser.role === 'admin' ? 'admin-records' : 'my-records');
    modalForm.addEventListener('submit', handleRecordSubmit);
    modalCancel.addEventListener('click', closeModal);
}

// Глобальные функции для onclick
window.login = login;
window.logout = logout;
window.loginPage = loginPage;
window.editRecord = renderRecordForm;
window.deleteRecord = deleteRecord;
window.approveRecord = approveRecord;
window.rejectRecord = rejectRecord;

document.addEventListener('DOMContentLoaded', initApp);
