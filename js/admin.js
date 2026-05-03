/**
 * Mentfx Admin Module
 */
window.MentfxAdmin = {
    saveToServer: async function() {
        if (window.location.port !== '8000') return;
        const S = window.MentfxState;
        const data = {
            webinars: S.appData,
            mastery: S.masteryProgress,
            profile: S.userProfile,
            application: S.appApplicationData
        };
        
        try {
            const resp = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (resp.ok) window.showToast('Data synced to local server', 'success');
        } catch (e) {
            console.warn('Local server not available for sync');
        }
    },

    pushToGitHub: async function() {
        window.showToast('Initiating GitHub Sync...', 'info');
        // logic for triggering the local bat or server-side git push
    },

    resetAdminForm: function() {
        document.getElementById('admin-item-name').value = '';
        document.getElementById('admin-item-link').value = '';
        document.getElementById('admin-item-group').value = '';
    },

    init: function() {
        this.setupListeners();
        this.loadSettings();
    },

    setupListeners: function() {
        // Tab switching
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.adminTab;
                document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
                const section = document.getElementById(`admin-section-${target}`);
                if (section) section.classList.add('active');
                
                if (target === 'manage') this.renderAdminManageList();
            });
        });

        // Search filter in manage list
        const searchInput = document.getElementById('admin-manage-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                document.querySelectorAll('.admin-item').forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.style.display = text.includes(query) ? 'flex' : 'none';
                });
            });
        }
    },

    loadSettings: function() {
        const token = localStorage.getItem('mentfxGithubToken');
        const remember = localStorage.getItem('mentfxRememberToken') === 'true';
        
        if (remember && token) {
            const tokenInput = document.getElementById('admin-github-token');
            if (tokenInput) tokenInput.value = token;
            const rememberCheck = document.getElementById('admin-remember-token');
            if (rememberCheck) rememberCheck.checked = true;
        }
    },

    saveSettings: function() {
        const token = document.getElementById('admin-github-token').value;
        const remember = document.getElementById('admin-remember-token').checked;
        
        if (remember) {
            localStorage.setItem('mentfxGithubToken', token);
            localStorage.setItem('mentfxRememberToken', 'true');
        } else {
            localStorage.removeItem('mentfxGithubToken');
            localStorage.setItem('mentfxRememberToken', 'false');
        }
        
        window.showToast('Admin settings saved', 'success');
    },

    renderAdminManageList: function() {
        const S = window.MentfxState;
        const container = document.getElementById('admin-manage-list');
        if (!container) return;
        
        container.innerHTML = '';
        const allItems = [
            ...S.appData.map(i => ({ ...i, type: 'webinar' })),
            ...S.appApplicationData.map(i => ({ ...i, type: 'application' }))
        ];
        
        // Add mastery lessons
        (window.masteryData || []).forEach(mod => {
            mod.lessons.forEach(lesson => {
                allItems.push({ ...lesson, type: 'mastery', module: mod.module });
            });
        });

        if (allItems.length === 0) {
            container.innerHTML = '<div class="empty-state">No items found to manage.</div>';
            return;
        }

        allItems.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <div class="admin-item-info">
                    <span class="admin-badge badge-${item.type}">${item.type}</span>
                    <h4>${item.name}</h4>
                    <p style="font-size: 0.7rem; color: var(--text-muted);">${item.id}</p>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon" onclick="openEditModal('${item.id}', '${item.type}')">✎</button>
                    <button class="btn-icon delete" onclick="deleteAdminItem('${item.id}', '${item.type}')">🗑</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    addNewItem: function() {
        const category = document.getElementById('admin-item-category').value;
        const name = document.getElementById('admin-item-name').value.trim();
        const link = document.getElementById('admin-item-link').value.trim();
        const group = document.getElementById('admin-item-group').value.trim() || 'New Additions';
        const S = window.MentfxState;
        
        if (!name) return window.showToast('Item name is required', 'error');
        
        const newItem = {
            id: name.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now(),
            name,
            link,
            status: 'Not Started',
            notes: '',
            rating: 0,
            tags: []
        };
        
        if (category === 'webinar') {
            newItem.monthGroup = group;
            S.appData.push(newItem);
        } else if (category === 'application') {
            newItem.category = group;
            S.appApplicationData.push(newItem);
        } else {
            return window.showToast('Adding Mastery lessons via UI is currently restricted.', 'info');
        }
        
        S.saveLocalData();
        this.saveToServer();
        window.showToast(`New ${category} added successfully!`, 'success');
        
        document.getElementById('admin-item-name').value = '';
        document.getElementById('admin-item-link').value = '';
        document.getElementById('admin-item-group').value = '';
        
        if (category === 'application') window.MentfxUI.renderApplication();
        else window.MentfxTracker?.renderCurrentView();
    },

    deleteAdminItem: function(id, type) {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
        const S = window.MentfxState;
        
        if (type === 'webinar') S.appData = S.appData.filter(i => i.id !== id);
        else if (type === 'application') S.appApplicationData = S.appApplicationData.filter(i => i.id !== id);
        
        S.saveLocalData();
        this.saveToServer();
        this.renderAdminManageList();
        window.showToast(`${type} deleted`, 'info');
    }
};

// Global Mappings
window.saveToServer = window.MentfxAdmin.saveToServer;
window.renderAdminManageList = window.MentfxAdmin.renderAdminManageList.bind(window.MentfxAdmin);
window.addNewItem = window.MentfxAdmin.addNewItem.bind(window.MentfxAdmin);
window.deleteAdminItem = window.MentfxAdmin.deleteAdminItem.bind(window.MentfxAdmin);
window.handleAdminPush = window.MentfxAdmin.pushToGitHub;
window.saveAdminSettings = window.MentfxAdmin.saveSettings.bind(window.MentfxAdmin);
window.resetAdminForm = window.MentfxAdmin.resetAdminForm.bind(window.MentfxAdmin);

// Auto-init
document.addEventListener('DOMContentLoaded', () => window.MentfxAdmin.init());
