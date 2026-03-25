const API_BASE = '/api';
let currentUser = null;
let users = [];
let currentPage = 'index';

// Элементы DOM
const appEl = document.getElementById('app');
const navEl = document.getElementById('main-nav');
const userInfoEl = document.getElementById('user-info');
let loaderEl = document.getElementById('loader');
let modalEl = document.getElementById('modal');

// Если элементов нет в base.html, создадим их
if (!loaderEl) {
    loaderEl = document.createElement('div');
    loaderEl.id = 'loader';
    loaderEl.className = 'hidden fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-50';
    loaderEl.innerHTML = '<div class="loader"></div>';
    document.body.appendChild(loaderEl);
}
if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'modal';
    modalEl.className = 'hidden fixed inset-0 bg-black/50 flex items-center justify-center z-40';
    modalEl.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 id="modal-title" class="text-2xl font-bold mb-4">Новая запись</h2>
            <form id="modal-form">
                <input type="hidden" id="record-id">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Тип</label>
                    <select id="type" required class="w-full border rounded px-3 py-2">
                        <option value="late">Опоздание</option>
                        <option value="absence">Отсутствие</option>
                    </select>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Дата</label>
                    <input type="date" id="date" required class="w-full border rounded px-3 py-2">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Причина</label>
                    <textarea id="reason" required rows="3" class="w-full border rounded px-3 py-2"></textarea>
                </div>
                <div class="flex justify-end space-x-2">
                    <button type="button" id="modal-cancel" class="px-4 py-2 bg-gray-300 rounded">Отмена</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Сохранить</button>
                </div>
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

// ---------- Вспомогательные функции ----------
async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    const userId = localStorage.getItem('userId');
    if (userId) {
        headers['X-User-Id'] = userId;
    }
    try {
        const res = await fetch(url, { ...options, headers });
        let data;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = await res.text();
        }
        if (!res.ok) {
            const message = data.error || data || res.statusText;
            throw new Error(message);
        }
        return data;
    } catch (err) {
        throw err;
    }
}

function showLoader() {
    loaderEl.classList.remove('hidden');
}
function hideLoader() {
    loaderEl.classList.add('hidden');
}

function showError(message) {
    alert(message);
}

function validateRecordForm({ type, date, reason }) {
    if (!type || !date || !reason) {
        return { valid: false, error: 'Все поля обязательны' };
    }
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
        return { valid: false, error: 'Дата не может быть в будущем' };
    }
    return { valid: true };
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU');
}

function getStatusBadge(status) {
    const colors = {
        pending: 'bg-yellow-500 text-white',
        approved: 'bg-green-500 text-white',
        rejected: 'bg-red-500 text-white',
    };
    const labels = {
        pending: 'На рассмотрении',
        approved: 'Подтверждено',
        rejected: 'Отклонено',
    };
    return `<span class="px-2 py-1 rounded-full text-xs ${colors[status] || 'bg-gray-500'}">${labels[status] || status}</span>`;
}

// ---------- Рендеринг страниц ----------
function renderIndex() {
    appEl.innerHTML = `
        <section class="section-card bg-primary-light text-white mb-8 hover-shadow-xl">
            <div class="text-center py-12">
                <h1 class="text-5xl font-bold mb-4">Добро пожаловать в Attendance Tracker</h1>
                <p class="text-2xl mb-8">Система учёта опозданий и отсутствий сотрудников</p>
                ${!currentUser ? '<button onclick="window.loginPage()" class="btn-gradient text-white text-xl">Войти</button>' : ''}
            </div>
        </section>
        <section id="about" class="section-card bg-primary-light text-white mb-8 hover-shadow-xl">
            <div class="py-12 px-6">
                <h2 class="text-4xl font-bold mb-6 text-center">О нас</h2>
                <p class="text-xl leading-relaxed max-w-3xl mx-auto text-center">
                    Attendance Tracker — это система для учёта опозданий и отсутствий сотрудников, разработанная для повышения дисциплины и прозрачности в коллективе. Мы стремимся сделать процесс учёта простым и удобным как для сотрудников, так и для администраторов.
                </p>
            </div>
        </section>
        <section id="contacts" class="section-card bg-primary-light text-white mb-8 hover-shadow-xl">
            <div class="py-12 px-6">
                <h2 class="text-4xl font-bold mb-8 text-center">Контакты</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
                    <div>
                        <i class="fas fa-envelope text-5xl mb-4"></i>
                        <h3 class="text-2xl font-bold mb-2">Email</h3>
                        <p class="text-xl"><a href="mailto:support@attendancetracker.ru" class="hover:underline">support@attendancetracker.ru</a></p>
                    </div>
                    <div>
                        <i class="fas fa-phone text-5xl mb-4"></i>
                        <h3 class="text-2xl font-bold mb-2">Телефон</h3>
                        <p class="text-xl">+7 (123) 456-78-90</p>
                    </div>
                    <div>
                        <i class="fas fa-map-marker-alt text-5xl mb-4"></i>
                        <h3 class="text-2xl font-bold mb-2">Адрес</h3>
                        <p class="text-xl">г. Москва, ул. Программистов, д. 1</p>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderLogin() {
    appEl.innerHTML = `
        <div class="max-w-md mx-auto bg-primary-hover p-10 rounded-2xl shadow-2xl hover-shadow-xl transition-all duration-300">
            <h1 class="text-4xl font-bold mb-8 text-center text-white">Вход в систему</h1>
            <p class="text-white text-xl mb-6 text-center">Выберите ваше имя из списка:</p>
            <div class="space-y-3" id="user-list"></div>
            <div class="mt-8 text-center text-sm text-white">
                Демо-режим: выберите пользователя для входа
            </div>
        </div>
    `;
    const userList = document.getElementById('user-list');
    users.forEach(user => {
        const btn = document.createElement('button');
        btn.className = 'user-btn text-white text-xl py-3 px-4';
        btn.textContent = user.name;
        btn.onclick = () => login(user.id);
        userList.appendChild(btn);
    });
}

async function renderMyRecords() {
    appEl.innerHTML = `
        <section>
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-primary">Мои записи</h1>
                <button id="create-record-btn" class="btn-gradient-alt text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-xl" style="text-shadow: 0 0 8px rgba(255,255,255,0.5);">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                    Новая запись
                </button>
            </div>

            <div id="records-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            <div id="empty-records" class="bg-gradient-to-r from-primary-light to-primary text-white p-12 rounded-2xl text-center text-2xl font-bold shadow-xl hidden">На данный момент записей нет.</div>
        </section>
    `;
    document.getElementById('create-record-btn').onclick = () => renderRecordForm();
    await loadMyRecordsData();
}

async function loadMyRecordsData() {
    showLoader();
    const container = document.getElementById('records-container');
    const empty = document.getElementById('empty-records');
    if (!container || !empty) {
        showError('Ошибка интерфейса');
        hideLoader();
        return;
    }
    try {
        const records = await apiFetch('/attendance-records/my');
        if (!Array.isArray(records)) {
            console.warn('Ответ сервера не массив, считаем пустым результатом:', records);
            empty.classList.remove('hidden');
            container.innerHTML = '';
            return;
        }
        if (!records.length) {
            empty.classList.remove('hidden');
            container.innerHTML = '';
            return;
        }
        empty.classList.add('hidden');
        container.innerHTML = records.map(record => `
            <div class="record-card rounded-xl p-6 bg-primary-dark shadow-custom hover:shadow-2xl transition-all duration-300 flex flex-col relative overflow-hidden border-2 border-transparent hover:border-primary/20" data-type="${record.type}">
                <!-- Цветная полоса сверху -->
                <div class="absolute top-0 left-0 w-full h-2" style="background: ${record.type === 'late' ? 'linear-gradient(90deg, #F59E0B, #EF4444)' : 'linear-gradient(90deg, #3B82F6, #1E40AF)'};"></div>

                <!-- Иконка и тип записи -->
                <div class="flex items-center mb-4 mt-2">
                    <span class="type-icon ${record.type === 'late' ? 'late' : 'absence'} mr-3"></span>
                    <span class="text-2xl font-bold ${record.type === 'late' ? 'text-orange-500' : 'text-blue-600'}">
                        ${record.type === 'late' ? 'Опоздание' : 'Отсутствие'}
                    </span>
                </div>

                <!-- Дата -->
                <div class="mb-3">
                    <span class="text-sm uppercase tracking-wider text-secondary font-semibold">Дата</span>
                    <p class="text-xl font-medium text-text-primary">${formatDate(record.date)}</p>
                </div>

                <!-- Причина -->
                <div class="mb-3">
                    <span class="text-sm uppercase tracking-wider text-secondary font-semibold">Причина</span>
                    <p class="text-lg text-text-primary">${record.reason}</p>
                </div>

                <!-- Статус -->
                <div class="mb-4">
                    <span class="text-sm uppercase tracking-wider text-primary font-semibold">Статус</span>
                    <div class="mt-1">
                        <span class="px-4 py-2 rounded-full text-sm font-bold inline-block shadow-md
                            ${record.status === 'pending' ? 'bg-warning text-primary' : record.status === 'approved' ? 'bg-success text-primary' : 'bg-danger text-primary'}">
                            ${record.status === 'pending' ? 'На рассмотрении' : record.status === 'approved' ? 'Подтверждено' : 'Отклонено'}
                        </span>
                    </div>
                </div>

                <!-- Действия -->
                ${record.status === 'pending' ? `
                    <div class="mt-auto pt-4 flex justify-end space-x-3 border-t border-gray-200">
                        <button onclick="window.editRecord(${record.id})" class="text-accent hover:text-accent/80 text-2xl transition transform hover:scale-110" title="Редактировать">✎</button>
                        <button onclick="window.deleteRecord(${record.id})" class="text-danger hover:text-danger/80 text-2xl transition transform hover:scale-110" title="Удалить">🗑</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        showError('Ошибка загрузки записей: ' + err.message);
    } finally {
        hideLoader();
    }
}

async function renderAdminRecords() {
    appEl.innerHTML = `
        <div class="record-card border-2 border-primary rounded-xl p-12 bg-primary-dark shadow-custom hover-shadow-xl">
            <section>
                <h1 class="text-3xl font-bold mb-8">Модерация записей</h1>

                <!-- Форма фильтрации -->
                <div class="bg-surface p-6 rounded-xl shadow-custom mb-8">
                    <form id="filter-form" class="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <div>
                            <label for="filter-user" class="block text-lg font-medium text-secondary mb-2">Сотрудник</label>
                            <select id="filter-user" name="user_id" class="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/30 transition">
                                <option value="">Все</option>
                            </select>
                        </div>
                        <div>
                            <label for="filter-type" class="block text-lg font-medium text-secondary mb-2">Тип</label>
                            <select name="type" class="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/30 transition">
                                <option value="">Все</option>
                                <option value="late">Опоздание</option>
                                <option value="absence">Отсутствие</option>
                            </select>
                        </div>
                        <div>
                            <label for="filter-status" class="block text-lg font-medium text-secondary mb-2">Статус</label>
                            <select name="status" class="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/30 transition">
                                <option value="">Все</option>
                                <option value="pending">На рассмотрении</option>
                                <option value="approved">Подтверждено</option>
                                <option value="rejected">Отклонено</option>
                            </select>
                        </div>
                        <div>
                            <label for="filter-from" class="block text-lg font-medium text-secondary mb-2">Дата с</label>
                            <input type="date" name="from" class="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/30 transition">
                        </div>
                        <div>
                            <label for="filter-to" class="block text-lg font-medium text-secondary mb-2">Дата по</label>
                            <input type="date" name="to" class="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/30 transition">
                        </div>
                        <div class="md:col-span-5 flex justify-end space-x-4">
                            <button type="button" id="reset-filters" class="btn-gradient-alt">Сбросить</button>
                            <button type="submit" class="btn-gradient">Применить</button>
                        </div>
                    </form>
                </div>

                <!-- Сетка карточек -->
                <div id="admin-records-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                <div id="admin-empty-records" class="col-span-full bg-primary-light text-white text-center py-12 rounded-xl shadow-custom hidden">
                    <p class="text-2xl">Нет записей по заданным фильтрам.</p>
                </div>
            </section>
        </div>
    `;
    const userSelect = document.getElementById('filter-user');
    userSelect.innerHTML = '<option value="">Все</option>' + users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    document.getElementById('filter-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await loadAdminRecordsData();
    });
    document.getElementById('reset-filters').addEventListener('click', () => {
        document.getElementById('filter-form').reset();
        loadAdminRecordsData();
    });
    await loadAdminRecordsData();
}

async function loadAdminRecordsData() {
    showLoader();
    try {
        const form = document.getElementById('filter-form');
        if (!form) {
            showError('Форма фильтрации не найдена');
            return;
        }
        const formData = new FormData(form);
        const params = new URLSearchParams(formData).toString();
        const records = await apiFetch('/attendance-records?' + params);
        const container = document.getElementById('admin-records-container');
        const empty = document.getElementById('admin-empty-records');
        
        if (!container || !empty) {
            showError('Ошибка интерфейса');
            return;
        }

        if (!Array.isArray(records)) {
            console.warn('Ответ сервера не массив, считаем пустым результатом:', records);
            empty.classList.remove('hidden');
            container.innerHTML = '';
            return;
        }

        if (!records.length) {
            empty.classList.remove('hidden');
            container.innerHTML = '';
            return;
        }
        empty.classList.add('hidden');
        const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
        container.innerHTML = records.map(record => `
            <div class="record-card border-2 border-primary rounded-xl p-5 bg-primary-dark shadow-custom hover-shadow-xl">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-sm font-semibold text-text-primary">${formatDate(record.date)}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold 
                        ${record.status === 'pending' ? 'badge-pending' : record.status === 'approved' ? 'badge-approved' : 'badge-rejected'}">
                        ${record.status === 'pending' ? 'На рассмотрении' : record.status === 'approved' ? 'Подтверждено' : 'Отклонено'}
                    </span>
                </div>
                <div class="mb-2">
                    <span class="text-lg font-bold text-primary">${record.type === 'late' ? 'Опоздание' : 'Отсутствие'}</span>
                </div>
                <div class="mb-3">
                    <p class="text-text-primary"><span class="font-semibold">Сотрудник:</span> ${userMap[record.user_id] || 'Неизвестно'}</p>
                    <p class="text-text-primary mt-1"><span class="font-semibold">Причина:</span> ${record.reason}</p>
                </div>
                ${record.status === 'pending' ? `
                    <div class="flex justify-end space-x-3 mt-2 pt-2 border-t border-border">
                        <button onclick="window.approveRecord(${record.id})" class="text-success hover:text-success/80 text-2xl transition" title="Подтвердить">✓</button>
                        <button onclick="window.rejectRecord(${record.id})" class="text-danger hover:text-danger/80 text-2xl transition" title="Отклонить">✗</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        showError('Ошибка загрузки: ' + err.message);
    } finally {
        hideLoader();
    }
}

async function renderAdminReports() {
    appEl.innerHTML = `
        <section>
            <h1 class="text-3xl font-bold mb-8">Отчёты</h1>

            <!-- Форма фильтров -->
            <div class="bg-surface p-6 rounded-xl shadow-custom mb-8">
                <form id="report-filter-form" class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label for="report-user" class="block text-lg font-medium text-secondary mb-2">Сотрудник</label>
                        <select id="report-user" name="user_id" class="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/30 transition">
                            <option value="">Все</option>
                        </select>
                    </div>
                    <div>
                        <label for="report-from" class="block text-lg font-medium text-secondary mb-2">Период с</label>
                        <input type="date" name="from" class="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/30 transition">
                    </div>
                    <div>
                        <label for="report-to" class="block text-lg font-medium text-secondary mb-2">Период по</label>
                        <input type="date" name="to" class="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/30 transition">
                    </div>
                    <div class="flex items-end">
                        <button type="submit" class="btn-gradient w-full">Сформировать</button>
                    </div>
                </form>
            </div>

            <!-- Сводка -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="record-card border-2 border-primary rounded-xl p-6 bg-primary-dark shadow-custom hover-shadow-xl">
                    <h3 class="text-lg text-secondary mb-2">Всего записей</h3>
                    <p id="total-count" class="text-4xl font-bold">0</p>
                </div>
                <div class="record-card border-2 border-primary rounded-xl p-6 bg-primary-dark shadow-custom hover-shadow-xl">
                    <h3 class="text-lg text-secondary mb-2">Опозданий</h3>
                    <p id="late-count" class="text-4xl font-bold text-accent">0</p>
                </div>
                <div class="record-card border-2 border-primary rounded-xl p-6 bg-primary-dark shadow-custom hover-shadow-xl">
                    <h3 class="text-lg text-secondary mb-2">Отсутствий</h3>
                    <p id="absence-count" class="text-4xl font-bold text-primary">0</p>
                </div>
            </div>

            <!-- Детальный список -->
            <div id="report-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </section>
    `;
    const userSelect = document.getElementById('report-user');
    userSelect.innerHTML = '<option value="">Все</option>' + users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    document.getElementById('report-filter-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await loadReportData();
    });
    await loadReportData();
}

async function loadReportData() {
    showLoader();
    try {
        const form = document.getElementById('report-filter-form');
        const formData = new FormData(form);
        const params = new URLSearchParams(formData).toString();
        const records = await apiFetch('/attendance-records?' + params);
        
        if (!Array.isArray(records)) {
            console.warn('Ответ сервера не массив, считаем пустым результатом:', records);
            document.getElementById('total-count').textContent = '0';
            document.getElementById('late-count').textContent = '0';
            document.getElementById('absence-count').textContent = '0';
            const container = document.getElementById('report-container');
            container.innerHTML = '<p class="text-center text-gray-500">Нет записей</p>';
            return;
        }

        const total = records.length;
        const late = records.filter(r => r.type === 'late').length;
        const absence = records.filter(r => r.type === 'absence').length;
        document.getElementById('total-count').textContent = total;
        document.getElementById('late-count').textContent = late;
        document.getElementById('absence-count').textContent = absence;

        const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
        const container = document.getElementById('report-container');
        if (!records.length) {
            container.innerHTML = '<p class="text-center text-gray-500">Нет записей</p>';
            return;
        }
        container.innerHTML = records.map(record => `
            <div class="record-card border-2 border-primary rounded-xl p-5 bg-primary-dark shadow-custom hover-shadow-xl">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-sm font-semibold text-text-primary">${formatDate(record.date)}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold 
                        ${record.status === 'pending' ? 'badge-pending' : record.status === 'approved' ? 'badge-approved' : 'badge-rejected'}">
                        ${record.status === 'pending' ? 'На рассмотрении' : record.status === 'approved' ? 'Подтверждено' : 'Отклонено'}
                    </span>
                </div>
                <div class="mb-2">
                    <span class="text-lg font-bold text-primary">${record.type === 'late' ? 'Опоздание' : 'Отсутствие'}</span>
                </div>
                <div class="mb-1">
                    <p class="text-text-primary"><span class="font-semibold">Сотрудник:</span> ${userMap[record.user_id] || 'Неизвестно'}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        showError('Ошибка загрузки отчёта: ' + err.message);
    } finally {
        hideLoader();
    }
}

// ---------- Модальное окно для создания/редактирования записи ----------
function renderRecordForm(recordId = null) {
    modalTitle.textContent = recordId ? 'Редактировать запись' : 'Новая запись';
    recordIdInput.value = recordId || '';
    // Стилизуем модальное окно под старую форму
    modalEl.querySelector('.bg-white').className = 'bg-primary-hover p-8 rounded-lg shadow-custom hover:shadow-2xl transition-all duration-300';
    modalEl.querySelector('h2').className = 'text-2xl font-bold mb-6 text-white';
    modalEl.querySelectorAll('label').forEach(l => l.className = 'block text-sm font-medium text-white mb-1');
    modalEl.querySelectorAll('input, select, textarea').forEach(el => {
        el.className = 'w-full bg-white border border-surface rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary';
    });
    modalEl.querySelector('#modal-cancel').className = 'btn-gradient-alt text-white px-6 py-3 rounded-lg transition-all duration-300 hover:scale-105';
    modalEl.querySelector('button[type="submit"]').className = 'btn-gradient text-white px-6 py-3 rounded-lg transition-all duration-300';

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
        const today = new Date().toISOString().split('T')[0];
        dateInput.max = today;
    }
    modalEl.classList.remove('hidden');
}

async function handleRecordSubmit(e) {
    e.preventDefault();
    const data = {
        type: typeInput.value,
        date: dateInput.value,
        reason: reasonInput.value,
    };
    const validation = validateRecordForm(data);
    if (!validation.valid) {
        showError(validation.error);
        return;
    }
    const id = recordIdInput.value;
    showLoader();
    try {
        if (id) {
            await apiFetch(`/attendance-records/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        } else {
            await apiFetch('/attendance-records', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        }
        closeModal();
        if (currentPage === 'my-records') {
            await loadMyRecordsData();
        } else if (currentPage === 'admin-records') {
            await loadAdminRecordsData();
        }
    } catch (err) {
        showError('Ошибка сохранения: ' + err.message);
    } finally {
        hideLoader();
    }
}

function closeModal() {
    modalEl.classList.add('hidden');
    // Сбрасываем стили модалки на исходные (чтобы не мешать другим страницам)
    modalEl.querySelector('.bg-primary-hover').className = 'bg-white rounded-lg p-6 max-w-md w-full';
    modalEl.querySelector('h2').className = 'text-2xl font-bold mb-4';
    modalEl.querySelectorAll('label').forEach(l => l.className = 'block text-sm font-medium mb-1');
    modalEl.querySelectorAll('input, select, textarea').forEach(el => {
        el.className = 'w-full border rounded px-3 py-2';
    });
    modalEl.querySelector('#modal-cancel').className = 'px-4 py-2 bg-gray-300 rounded';
    modalEl.querySelector('button[type="submit"]').className = 'px-4 py-2 bg-blue-600 text-white rounded';
}

// ---------- Действия с записями ----------
async function deleteRecord(id) {
    if (!confirm('Удалить запись?')) return;
    showLoader();
    try {
        await apiFetch(`/attendance-records/${id}`, { method: 'DELETE' });
        await loadMyRecordsData();
    } catch (err) {
        showError('Ошибка удаления: ' + err.message);
    } finally {
        hideLoader();
    }
}

async function approveRecord(id) {
    showLoader();
    try {
        await apiFetch(`/attendance-records/${id}/approve`, { method: 'POST' });
        await loadAdminRecordsData();
    } catch (err) {
        showError('Ошибка: ' + err.message);
    } finally {
        hideLoader();
    }
}

async function rejectRecord(id) {
    showLoader();
    try {
        await apiFetch(`/attendance-records/${id}/reject`, { method: 'POST' });
        await loadAdminRecordsData();
    } catch (err) {
        showError('Ошибка: ' + err.message);
    } finally {
        hideLoader();
    }
}

// ---------- Вход и выход ----------
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

function loginPage() {
    changePage('login');
}

// ---------- Навигация ----------
async function changePage(page) {
    currentPage = page;
    switch (page) {
        case 'index':
            renderIndex();
            break;
        case 'login':
            renderLogin();
            break;
        case 'my-records':
            await renderMyRecords();
            break;
        case 'admin-records':
            await renderAdminRecords();
            break;
        case 'admin-reports':
            await renderAdminReports();
            break;
        default:
            if (!currentUser) {
                renderIndex();
            } else {
                changePage(currentUser.role === 'admin' ? 'admin-records' : 'my-records');
            }
    }
    updateActiveNavLink(page);
}

function updateNavigation() {
    if (!navEl) return;
    if (!currentUser) {
        navEl.innerHTML = '';
        return;
    }
    let menuHtml = '';
    if (currentUser.role === 'admin') {
        menuHtml = `
            <button class="nav-link hover:text-accent transition" data-page="admin-records">Модерация</button>
            <button class="nav-link hover:text-accent transition" data-page="admin-reports">Отчёты</button>
        `;
    } else {
        menuHtml = `
            <button class="nav-link hover:text-accent transition" data-page="my-records">Мои записи</button>
        `;
    }
    navEl.innerHTML = menuHtml;
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            changePage(page);
        });
    });
}

function updateUserInfo() {
    if (!userInfoEl) return;
    if (currentUser) {
        userInfoEl.innerHTML = `
            <span class="text-white">${currentUser.name} (${currentUser.role === 'admin' ? 'админ' : 'сотрудник'})</span>
            <button onclick="window.logout()" class="ml-4 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white">Выйти</button>
        `;
    } else {
        userInfoEl.innerHTML = `
            <button onclick="window.loginPage()" class="btn-primary-hover hover:bg-blue-700 px-4 py-2 rounded text-white">Войти</button>
        `;
    }
}

function updateActiveNavLink(page) {
    document.querySelectorAll('.nav-link').forEach(btn => {
        if (btn.dataset.page === page) {
            btn.classList.add('text-accent');
        } else {
            btn.classList.remove('text-accent');
        }
    });
}

// ---------- Загрузка пользователя ----------
async function fetchUsers() {
    try {
        users = await apiFetch('/users');
    } catch (err) {
        showError('Не удалось загрузить список пользователей');
    }
}

async function loadUser() {
    const userId = localStorage.getItem('userId');
    if (!userId) return null;
    if (users.length === 0) await fetchUsers();
    currentUser = users.find(u => u.id == userId);
    return currentUser;
}

// ---------- Инициализация приложения ----------
async function initApp() {
    await fetchUsers();
    await loadUser();

    // Обновляем информацию о пользователе в шапке
    updateUserInfo();

    // Обработчик для логотипа (без перезагрузки)
    const logoLink = document.querySelector('header a[href="/"]');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            changePage('index');
        });
    }

    updateNavigation();

    if (!currentUser) {
        await changePage('index');
    } else {
        await changePage(currentUser.role === 'admin' ? 'admin-records' : 'my-records');
    }

    modalForm.addEventListener('submit', handleRecordSubmit);
    modalCancel.addEventListener('click', closeModal);
}

// Экспортируем функции в window для доступа из onclick
window.login = login;
window.logout = logout;
window.loginPage = loginPage;
window.editRecord = renderRecordForm;
window.deleteRecord = deleteRecord;
window.approveRecord = approveRecord;
window.rejectRecord = rejectRecord;

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
