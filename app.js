/**
 * Mentfx Dashboard - Main Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize State & Data
    const S = window.MentfxState;
    const U = window.MentfxUtils;
    const UI = window.MentfxUI;
    const T = window.MentfxTracker;
    const M = window.MentfxMastery;
    const A = window.MentfxAdmin;

    function init() {
        // Load data from LocalStorage
        const savedWebinars = localStorage.getItem('mentfxData');
        if (savedWebinars) {
            S.appData = JSON.parse(savedWebinars);
            if (S.appData.length === 0 && typeof window.webinarData !== 'undefined') {
                S.appData = [...window.webinarData];
            }
        } else if (typeof window.webinarData !== 'undefined') {
            S.appData = [...window.webinarData];
        }

        const savedApp = localStorage.getItem('mentfxApplication');
        if (savedApp) {
            S.appApplicationData = JSON.parse(savedApp);
            if (S.appApplicationData.length === 0 && typeof window.applicationData !== 'undefined') {
                S.appApplicationData = [...window.applicationData];
            }
        } else if (typeof window.applicationData !== 'undefined') {
            S.appApplicationData = [...window.applicationData];
        }

        const savedMastery = localStorage.getItem('mentfxMastery');
        if (savedMastery) {
            S.masteryProgress = JSON.parse(savedMastery);
        } else if (window.masteryProgress) {
            S.masteryProgress = window.masteryProgress;
        }

        const savedLog = localStorage.getItem('mentfxActivityLog');
        if (savedLog) {
            S.activityLog = JSON.parse(savedLog);
        } else if (window.activityLog) {
            S.activityLog = window.activityLog;
        }

        const savedProfile = localStorage.getItem('mentfxProfile');
        if (savedProfile) {
            S.userProfile = JSON.parse(savedProfile);
        } else if (window.userProfileSync) {
            S.userProfile = window.userProfileSync;
        }

        // Initial Renders
        UI.showTab('dashboard');
        UI.updateProfileUI();
        UI.updateClock();
        setInterval(UI.updateClock, 1000);

        // Sync with server if local and on the correct port (8000)
        if (window.location.port === '8000') {
            loadFromServer();
        } else {
            console.log('Running on secondary local port (5500). Server sync disabled to prevent 404s.');
        }

        setupEventListeners();
        console.log('Mentfx Dashboard Initialized');
    }

    function setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.nav-links li, .clickable-logo').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab || 'dashboard';
                UI.showTab(targetId);
            });
        });

        // View Toggling
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                S.currentViewMode = btn.dataset.mode;
                T.renderCurrentView();
            });
        });

        // Global Search
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (query.length > 0) handleGlobalSearch(query);
                else UI.showTab('dashboard');
            });
        }

        // Close sidebar on tab click (mobile)
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.addEventListener('click', () => UI.closeSidebar());
        });
    }

    async function loadFromServer() {
        try {
            const resp = await fetch('/api/load');
            if (resp.ok) {
                const data = await resp.json();
                if (data.webinars) S.appData = data.webinars;
                if (data.mastery) S.masteryProgress = data.mastery;
                if (data.profile) S.userProfile = data.profile;
                if (data.application) S.appApplicationData = data.application;
                
                S.saveLocalData();
                T.renderCurrentView();
                M.renderMastery();
                window.updateDashboard?.();
            }
        } catch (e) {
            console.warn('Local server not available');
        }
    }

    // Expose core functions to window for onclick compatibility
    window.toggleItemComplete = (id, category, event) => {
        if (event) event.stopPropagation();
        const S = window.MentfxState;
        let item;
        
        if (category === 'webinar') item = S.appData.find(w => w.id === id);
        else if (category === 'application') item = S.appApplicationData.find(a => a.id === id);
        else if (category === 'mastery') {
            const lesson = (window.masteryData || []).flatMap(m => m.lessons).find(l => l.id === id);
            item = { ...(S.masteryProgress[id] || { status: 'Not Started' }), name: lesson?.name || id };
        }
        
        if (!item) return;

        const isDone = item.status === 'Completed';
        const newStatus = isDone ? 'Not Started' : 'Completed';
        
        if (category === 'webinar' || category === 'application') item.status = newStatus;
        else S.masteryProgress[id] = { ...item, status: newStatus };

        // Log Activity if completed
        if (newStatus === 'Completed') {
            window.logActivity(category, id, item.name || id);
        }
        
        S.saveLocalData();
        UI.renderApplication();
        T.renderCurrentView();
        M.renderMastery();
        U.showToast(`${category.charAt(0).toUpperCase() + category.slice(1)} status updated`, 'success');
        window.updateDashboard?.();
    };

    let currentEditId = null;
    let currentEditType = null;

    window.openEditModal = (id, type) => {
        currentEditId = id;
        currentEditType = type;
        const S = window.MentfxState;
        let item;
        
        if (type === 'webinar') item = S.appData.find(w => w.id === id);
        else if (type === 'application') item = S.appApplicationData.find(a => a.id === id);
        else if (type === 'mastery') item = S.masteryProgress[id] || { status: 'Not Started', understanding: 0, notes: '', tags: [] };
        
        if (!item) return;

        document.getElementById('modal-title').textContent = `Update ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        document.getElementById('modal-name').value = item.name || '';
        document.getElementById('modal-link').value = item.link || '';
        document.getElementById('modal-status').value = item.status || 'Not Started';
        document.getElementById('modal-understanding').value = item.understanding || 0;
        document.getElementById('modal-understanding-val').textContent = item.understanding || 0;
        document.getElementById('modal-notes').value = item.notes || '';
        document.getElementById('modal-tags').value = (item.tags || []).join(', ');
        
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    };

    window.closeModal = () => {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    };

    window.saveChanges = () => {
        const S = window.MentfxState;
        const name = document.getElementById('modal-name').value.trim();
        const link = document.getElementById('modal-link').value.trim();
        const status = document.getElementById('modal-status').value;
        const understanding = parseInt(document.getElementById('modal-understanding').value);
        const notes = document.getElementById('modal-notes').value;
        const tags = document.getElementById('modal-tags').value.split(',').map(t => t.trim()).filter(t => t);
        
        if (!name) return window.MentfxUtils?.showToast('Name is required', 'error');

        let statusChangedToCompleted = false;

        if (currentEditType === 'webinar') {
            const item = S.appData.find(w => w.id === currentEditId);
            if (item) {
                if (status === 'Completed' && item.status !== 'Completed') statusChangedToCompleted = true;
                item.name = name;
                item.link = link;
                item.status = status;
                item.understanding = understanding;
                item.notes = notes;
                item.tags = tags;
            }
        } else if (currentEditType === 'application') {
            const item = S.appApplicationData.find(a => a.id === currentEditId);
            if (item) {
                if (status === 'Completed' && item.status !== 'Completed') statusChangedToCompleted = true;
                item.name = name;
                item.link = link;
                item.status = status;
                item.understanding = understanding;
                item.notes = notes;
                item.tags = tags;
            }
        } else if (currentEditType === 'mastery') {
            const lesson = (window.masteryData || []).flatMap(m => m.lessons).find(l => l.id === currentEditId);
            if (lesson) {
                lesson.name = name;
                lesson.link = link;
            }

            if (status === 'Completed' && (S.masteryProgress[currentEditId]?.status !== 'Completed')) statusChangedToCompleted = true;

            S.masteryProgress[currentEditId] = {
                ...S.masteryProgress[currentEditId],
                name,
                link,
                status,
                understanding,
                notes,
                tags
            };
        }

        if (statusChangedToCompleted) {
            window.logActivity(currentEditType, currentEditId, name);
        }
        
        S.saveLocalData();
        if (window.MentfxAdmin) {
            window.MentfxAdmin.saveToServer();
            window.MentfxAdmin.syncToProjectFiles();
        }
        UI.renderApplication();
        T.renderCurrentView();
        M.renderMastery();
        window.renderAdminManageList?.();
        window.closeModal();
        U.showToast('Changes saved successfully', 'success');
        window.updateDashboard?.();
    };

    window.handleGlobalSearch = (query) => {
        const S = window.MentfxState;
        const results = [];
        
        // Search Webinars
        S.appData.forEach(item => {
            if (item.name.toLowerCase().includes(query) || (item.notes && item.notes.toLowerCase().includes(query))) {
                results.push({ ...item, type: 'webinar' });
            }
        });
        
        // Search Mastery
        (window.masteryData || []).forEach(mod => {
            mod.lessons.forEach(lesson => {
                if (lesson.name.toLowerCase().includes(query)) {
                    results.push({ ...lesson, type: 'mastery', module: mod.module, status: S.masteryProgress[lesson.id]?.status || 'Not Started' });
                }
            });
        });
        
        // Search Application
        S.appApplicationData.forEach(item => {
            if (item.name.toLowerCase().includes(query)) {
                results.push({ ...item, type: 'application' });
            }
        });
        
        renderSearchResults(results, query);
    };

    function renderSearchResults(results, query) {
        const container = document.getElementById('search-results-content');
        const stats = document.getElementById('search-stats');
        if (!container || !stats) return;
        
        UI.showTab('search-results');
        stats.textContent = `Found ${results.length} matches for "${query}"`;
        
        container.innerHTML = '';
        if (results.length === 0) {
            container.innerHTML = '<div class="empty-state">No matches found. Try a different term.</div>';
            return;
        }

        results.forEach(item => {
            const card = document.createElement('div');
            card.className = 'webinar-card glass search-result-card';
            
            let typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
            if (item.type === 'mastery') typeLabel = `Mastery (Mod ${item.module})`;
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-month">${typeLabel}</span>
                    <span class="status-badge status-${(item.status || 'not-started').toLowerCase().replace(' ', '-')}">${item.status || 'Not Started'}</span>
                </div>
                <div class="card-title">${item.name}</div>
                <div class="card-footer">
                    ${item.link ? `<a href="${item.link}" target="_blank" class="btn-action">Watch</a>` : ''}
                    <button class="btn-action" onclick="openEditModal('${item.id}', '${item.type}')">Edit</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Add understanding range listener
    document.getElementById('modal-understanding')?.addEventListener('input', (e) => {
        document.getElementById('modal-understanding-val').textContent = e.target.value;
    });

    init();
});

