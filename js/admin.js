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
            if (resp.ok) console.log('Data synced to local userData.json');
        } catch (e) {
            console.warn('Local server not available for sync');
        }
    },

    /**
     * Permanent Sync: Writes current state back to the source .js files
     */
    syncToProjectFiles: async function() {
        if (window.location.port !== '8000') return;
        const S = window.MentfxState;
        
        const filesToSync = [
            { name: 'data.js', variable: 'webinarData', data: S.appData },
            { name: 'applicationData.js', variable: 'applicationData', data: S.appApplicationData },
            { name: 'masteryData.js', variable: 'masteryData', data: window.masteryData }
        ];

        window.showToast('Syncing to project files...', 'info');

        try {
            for (const file of filesToSync) {
                const content = `window.${file.variable} = ${JSON.stringify(file.data, null, 4)};`;
                await fetch('/api/admin/save-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        content: content
                    })
                });
            }
            window.showToast('Project files updated successfully!', 'success');
        } catch (e) {
            console.error('Project sync failed:', e);
            window.showToast('Failed to sync to project files.', 'error');
        }
    },

    pushToGitHub: async function() {
        if (window.location.port !== '8000') return window.showToast('GitHub push only available on local server (port 8000)', 'warning');
        
        const confirmPush = confirm('This will push all your current local files to your live GitHub repository. Continue?');
        if (!confirmPush) return;

        window.showToast('Initiating GitHub Sync...', 'info');

        try {
            const resp = await fetch('/api/admin/push', { method: 'POST' });
            if (resp.ok) {
                window.showToast('Successfully pushed to GitHub!', 'success');
            } else {
                const err = await resp.text();
                throw new Error(err);
            }
        } catch (e) {
            console.error('GitHub push failed:', e);
            window.showToast('GitHub Push failed. Check your local console.', 'error');
        }
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

        // Filtering and search in manage list
        const searchInput = document.getElementById('admin-manage-search');
        const typeFilter = document.getElementById('admin-manage-type');
        const sortFilter = document.getElementById('admin-manage-sort');
        
        const triggerRefresh = () => this.renderAdminManageList();
        
        if (searchInput) searchInput.addEventListener('input', triggerRefresh);
        if (typeFilter) typeFilter.addEventListener('change', triggerRefresh);
        if (sortFilter) sortFilter.addEventListener('change', triggerRefresh);
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
        
        const type = document.getElementById('admin-manage-type')?.value || 'all';
        const sort = document.getElementById('admin-manage-sort')?.value || 'newest';
        const query = document.getElementById('admin-manage-search')?.value.toLowerCase() || '';

        let allItems = [
            ...S.appData.map((i, idx) => ({ ...i, type: 'webinar', globalIndex: idx })),
            ...S.appApplicationData.map((i, idx) => ({ ...i, type: 'application', globalIndex: idx + 1000 }))
        ];
        
        (window.masteryData || []).forEach(mod => {
            mod.lessons.forEach((lesson, idx) => {
                allItems.push({ ...lesson, type: 'mastery', module: mod.module, globalIndex: idx + (mod.module * 100) + 2000 });
            });
        });

        // Filter
        let filtered = allItems.filter(item => {
            const matchesType = type === 'all' || item.type === type;
            const matchesSearch = (item.name || '').toLowerCase().includes(query) || (item.id || '').toLowerCase().includes(query);
            return matchesType && matchesSearch;
        });

        // Sort
        filtered.sort((a, b) => {
            if (sort === 'az') return (a.name || '').localeCompare(b.name || '');
            if (sort === 'za') return (b.name || '').localeCompare(a.name || '');
            if (sort === 'oldest') return a.globalIndex - b.globalIndex;
            return b.globalIndex - a.globalIndex; // newest
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state">No items match your filters.</div>`;
            return;
        }

        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <div class="admin-item-info">
                    <span class="admin-badge badge-${item.type}">${item.type}</span>
                    <h4>${item.name}</h4>
                    <p style="font-size: 0.7rem; color: var(--text-muted);">${item.id} ${item.module !== undefined ? `• Mod ${item.module}` : ''}</p>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon" title="Edit" onclick="openEditModal('${item.id}', '${item.type}')">✎</button>
                    <button class="btn-icon delete" title="Delete" onclick="deleteAdminItem('${item.id}', '${item.type}')">🗑</button>
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
        this.syncToProjectFiles();
        window.showToast(`New ${category} added successfully!`, 'success');
        
        document.getElementById('admin-item-name').value = '';
        document.getElementById('admin-item-link').value = '';
        document.getElementById('admin-item-group').value = '';
        
        if (category === 'application') window.MentfxUI.renderApplication();
        else {
            window.MentfxTracker?.renderCurrentView();
            // Refresh manage list if we're on that tab
            if (document.getElementById('admin-section-manage').classList.contains('active')) {
                this.renderAdminManageList();
            }
        }
        window.updateDashboard?.();
    },

    deleteAdminItem: function(id, type) {
        const modal = document.getElementById('confirm-modal');
        const title = document.getElementById('confirm-title');
        const message = document.getElementById('confirm-message');
        const actionBtn = document.getElementById('confirm-action-btn');
        
        title.textContent = `Delete ${type.charAt(0).toUpperCase() + type.slice(1)}?`;
        message.textContent = `Are you sure you want to remove "${id}"? This will permanently delete it from the project files.`;
        
        // Setup action button
        actionBtn.onclick = async () => {
            const S = window.MentfxState;
            
            if (type === 'webinar') {
                S.appData = S.appData.filter(i => i.id !== id);
            } else if (type === 'application') {
                S.appApplicationData = S.appApplicationData.filter(i => i.id !== id);
            } else if (type === 'mastery') {
                // Remove from global definition
                (window.masteryData || []).forEach(mod => {
                    mod.lessons = mod.lessons.filter(l => l.id !== id);
                });
                // Remove from user progress
                delete S.masteryProgress[id];
            }
            
            S.saveLocalData();
            this.saveToServer();
            await this.syncToProjectFiles();
            this.renderAdminManageList();
            
            // Refresh appropriate views
            if (type === 'webinar') window.MentfxTracker?.renderCurrentView();
            if (type === 'mastery') window.MentfxMastery?.renderMastery();
            if (type === 'application') window.MentfxUI?.renderApplication();
            
            window.showToast(`${type} deleted`, 'info');
            window.updateDashboard?.();
            window.closeConfirmModal();
        };

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
};

window.closeConfirmModal = () => {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
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
window.closeConfirmModal = window.closeConfirmModal;

// Auto-init
document.addEventListener('DOMContentLoaded', () => window.MentfxAdmin.init());
