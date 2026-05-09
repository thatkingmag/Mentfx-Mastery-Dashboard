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
        const token = document.getElementById('admin-github-token')?.value || localStorage.getItem('mentfxGithubToken');
        if (!token) return window.showToast('Please enter your GitHub Token in Settings first!', 'warning');
        
        const owner = document.getElementById('admin-repo-owner')?.value || localStorage.getItem('mentfxGithubOwner') || 'thatkingmag';
        const repo = document.getElementById('admin-repo-name')?.value || localStorage.getItem('mentfxGithubRepo') || 'Mentfx-Mastery-Dashboard';
        const S = window.MentfxState;

        window.showToast('Initiating GitHub API Sync...', 'info');

        const filesToSync = [
            { path: 'index.html', content: null, localPath: 'index.html' },
            { path: 'styles.css', content: null, localPath: 'styles.css' },
            { path: 'data.js', variable: 'webinarData', data: S.appData },
            { path: 'applicationData.js', variable: 'applicationData', data: S.appApplicationData },
            { path: 'masteryData.js', variable: 'masteryData', data: window.masteryData },
            { 
                path: 'progressData.js', 
                content: `window.masteryProgress = ${JSON.stringify(S.masteryProgress, null, 4)};\nwindow.activityLog = ${JSON.stringify(S.activityLog, null, 4)};\nwindow.userProfileSync = ${JSON.stringify(S.userProfile, null, 4)};`
            },
            { path: 'js/tracker.js', content: null, localPath: 'js/tracker.js' },
            { path: 'js/admin.js', content: null, localPath: 'js/admin.js' },
            { path: 'js/ui.js', content: null, localPath: 'js/ui.js' },
            { path: 'js/utils.js', content: null, localPath: 'js/utils.js' },
            { path: 'js/state.js', content: null, localPath: 'js/state.js' },
            { path: 'js/mastery.js', content: null, localPath: 'js/mastery.js' },
            { path: 'js/dashboard.js', content: null, localPath: 'js/dashboard.js' },
            { path: 'js/gamification.js', content: null, localPath: 'js/gamification.js' },
            { path: 'js/analytics.js', content: null, localPath: 'js/analytics.js' },
            { path: 'app.js', content: null, localPath: 'app.js' }
        ];

        try {
            for (const file of filesToSync) {
                let content;
                if (file.variable) {
                    content = `window.${file.variable} = ${JSON.stringify(file.data, null, 4)};`;
                } else if (file.content) {
                    content = file.content;
                } else {
                    // Fetch local file content
                    if (window.location.protocol === 'file:') {
                        throw new Error("Local file access is restricted on 'file://' protocol. Please run the dashboard using a local server (e.g., 'npm run dev' or 'python -m http.server').");
                    }
                    
                    // Use relative path instead of absolute to handle subfolders/live servers correctly
                    const resp = await fetch(file.localPath);
                    if (!resp.ok) throw new Error(`Failed to read local ${file.localPath} (Status: ${resp.status}). Ensure the local server is running.`);
                    content = await resp.text();
                }
                
                // 1. Get current file SHA
                const getResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
                    headers: { 'Authorization': `token ${token}` }
                });
                
                let sha = null;
                if (getResp.ok) {
                    const fileData = await getResp.json();
                    sha = fileData.sha;
                } else if (getResp.status !== 404) {
                    const error = await getResp.json();
                    throw new Error(`Failed to get SHA for ${file.path}: ${error.message || getResp.statusText}`);
                }

                // 2. Update file
                const putResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Admin Update: Syncing ${file.path}`,
                        content: btoa(unescape(encodeURIComponent(content))),
                        sha: sha
                    })
                });

                if (!putResp.ok) {
                    const error = await putResp.json();
                    throw new Error(error.message || `Failed to update ${file.path}`);
                }
            }
            window.showToast('Successfully deployed to GitHub Pages!', 'success');
            
            // Update last sync time
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem('mentfxLastSync', timeStr);
            this.updateSyncUI();
        } catch (e) {
            console.error('GitHub Sync Error:', e);
            window.showToast(`Sync Error: ${e.message}`, 'error');
            const btn = document.getElementById('header-push-btn');
            if (btn) btn.classList.remove('syncing');
        }
    },

    pullFromGitHub: async function() {
        const token = document.getElementById('admin-github-token')?.value || localStorage.getItem('mentfxGithubToken');
        if (!token) return window.showToast('Please enter your GitHub Token first!', 'warning');
        
        const owner = document.getElementById('admin-repo-owner')?.value || localStorage.getItem('mentfxGithubOwner') || 'thatkingmag';
        const repo = document.getElementById('admin-repo-name')?.value || localStorage.getItem('mentfxGithubRepo') || 'Mentfx-Mastery-Dashboard';
        const S = window.MentfxState;

        window.showToast('Pulling latest data from GitHub...', 'info');

        const filesToPull = [
            { path: 'data.js', type: 'webinar' },
            { path: 'applicationData.js', type: 'application' },
            { path: 'progressData.js', type: 'progress' }
        ];

        try {
            for (const file of filesToPull) {
                const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?timestamp=${Date.now()}`, {
                    headers: { 'Authorization': `token ${token}` }
                });
                
                if (!resp.ok) throw new Error(`Failed to fetch ${file.path}`);
                const data = await resp.json();
                const content = decodeURIComponent(escape(atob(data.content)));
                
                // Parse the window.variable = ... format
                if (file.type === 'progress') {
                    // progressData.js has multiple variables. Split by "window." 
                    const parts = content.split('window.').filter(p => p.trim());
                    for (const part of parts) {
                        const eqIdx = part.indexOf('=');
                        const scIdx = part.lastIndexOf(';');
                        if (eqIdx > -1 && scIdx > -1) {
                            const varName = part.substring(0, eqIdx).trim();
                            const jsonStr = part.substring(eqIdx + 1, scIdx).trim();
                            try {
                                const varData = JSON.parse(jsonStr);
                                if (varName === 'masteryProgress') S.masteryProgress = varData;
                                if (varName === 'activityLog') S.activityLog = varData;
                                if (varName === 'userProfileSync') S.userProfile = varData;
                            } catch (e) {
                                console.warn(`Failed to parse variable ${varName}`, e);
                            }
                        }
                    }
                } else {
                    const eqIdx = content.indexOf('=');
                    const scIdx = content.lastIndexOf(';');
                    if (eqIdx > -1 && scIdx > -1) {
                        const jsonStr = content.substring(eqIdx + 1, scIdx).trim();
                        const jsonData = JSON.parse(jsonStr);
                        if (file.type === 'webinar') S.appData = jsonData;
                        if (file.type === 'application') S.appApplicationData = jsonData;
                    }
                }
            }
            
            S.saveLocalData();
        window.showToast('Data successfully synced from GitHub!', 'success');
            
            // Update last sync time
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem('mentfxLastSync', timeStr);
            this.updateSyncUI();

            location.reload(); // Refresh to apply everything
        } catch (e) {
            console.error('GitHub Pull Error:', e);
            window.showToast(`Pull Error: ${e.message}`, 'error');
            document.getElementById('header-sync-btn')?.classList.remove('syncing');
        }
    },

    updateSyncUI: function() {
        const lastSync = localStorage.getItem('mentfxLastSync');
        const el = document.getElementById('last-sync-time');
        if (el && lastSync) {
            el.textContent = `Synced ${lastSync}`;
            el.style.display = 'block';
        }
    },

    handleHeaderPush: function() {
        const modal = document.getElementById('confirm-modal');
        const title = document.getElementById('confirm-title');
        const message = document.getElementById('confirm-message');
        const actionBtn = document.getElementById('confirm-action-btn');
        
        if (!modal || !actionBtn) return this.pushToGitHub(); // Fallback if modal missing

        title.textContent = 'Push to Cloud?';
        message.textContent = 'This will upload your local progress and project files to your LIVE GitHub site. Continue?';
        actionBtn.textContent = 'Push';
        actionBtn.style.background = 'var(--accent)';
        
        actionBtn.onclick = async () => {
            window.closeConfirmModal();
            const btn = document.getElementById('header-push-btn');
            if (btn) btn.classList.add('syncing');
            try {
                await this.pushToGitHub();
            } finally {
                if (btn) btn.classList.remove('syncing');
            }
        };

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    },

    handleHeaderPull: function() {
        const modal = document.getElementById('confirm-modal');
        const title = document.getElementById('confirm-title');
        const message = document.getElementById('confirm-message');
        const actionBtn = document.getElementById('confirm-action-btn');
        
        if (!modal || !actionBtn) return this.pullFromGitHub(); // Fallback

        title.textContent = 'Pull from Cloud?';
        message.textContent = 'This will OVERWRITE your local browser data with the version from GitHub. Continue?';
        actionBtn.textContent = 'Pull';
        actionBtn.style.background = 'var(--accent)';
        
        actionBtn.onclick = async () => {
            window.closeConfirmModal();
            const btn = document.getElementById('header-pull-btn');
            if (btn) btn.classList.add('syncing');
            try {
                await this.pullFromGitHub();
            } finally {
                if (btn) btn.classList.remove('syncing');
            }
        };

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
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

        }

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
        const owner = localStorage.getItem('mentfxGithubOwner');
        const repo = localStorage.getItem('mentfxGithubRepo');
        const remember = localStorage.getItem('mentfxRememberToken') === 'true';
        
        if (token) {
            const tokenInput = document.getElementById('admin-github-token');
            if (tokenInput) tokenInput.value = token;
        }
        if (owner) {
            const ownerInput = document.getElementById('admin-repo-owner');
            if (ownerInput) ownerInput.value = owner;
        }
        if (repo) {
            const repoInput = document.getElementById('admin-repo-name');
            if (repoInput) repoInput.value = repo;
        }
        
        if (remember) {
            const rememberCheck = document.getElementById('admin-remember-token');
            if (rememberCheck) rememberCheck.checked = true;
        }
    },

    saveSettings: function() {
        const token = document.getElementById('admin-github-token').value;
        const owner = document.getElementById('admin-repo-owner').value;
        const repo = document.getElementById('admin-repo-name').value;
        const remember = document.getElementById('admin-remember-token').checked;
        
        if (remember) {
            localStorage.setItem('mentfxGithubToken', token);
            localStorage.setItem('mentfxGithubOwner', owner);
            localStorage.setItem('mentfxGithubRepo', repo);
            localStorage.setItem('mentfxRememberToken', 'true');
        } else {
            localStorage.removeItem('mentfxGithubToken');
            localStorage.removeItem('mentfxGithubOwner');
            localStorage.removeItem('mentfxGithubRepo');
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
                    <button class="btn-icon delete" title="Delete" onclick="deleteAdminItem('${item.id}', '${item.type}', '${(item.name || "").replace(/'/g, "\\'")}')">🗑</button>
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
    deleteAdminItem: function(id, type, name = '') {
        const modal = document.getElementById('confirm-modal');
        const title = document.getElementById('confirm-title');
        const message = document.getElementById('confirm-message');
        const actionBtn = document.getElementById('confirm-action-btn');
        
        const displayName = name || id;
        title.textContent = `Delete ${type.charAt(0).toUpperCase() + type.slice(1)}?`;
        message.textContent = `Are you sure you want to remove "${displayName}"? This will permanently delete it from the project files.`;
        actionBtn.textContent = 'Delete';
        actionBtn.style.background = 'var(--danger)';
        
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
window.handleAdminPush = window.MentfxAdmin.pushToGitHub.bind(window.MentfxAdmin);
window.handleAdminPull = window.MentfxAdmin.pullFromGitHub.bind(window.MentfxAdmin);
window.handleHeaderPush = window.MentfxAdmin.handleHeaderPush.bind(window.MentfxAdmin);
window.handleHeaderPull = window.MentfxAdmin.handleHeaderPull.bind(window.MentfxAdmin);
window.saveAdminSettings = window.MentfxAdmin.saveSettings.bind(window.MentfxAdmin);
window.resetAdminForm = window.MentfxAdmin.resetAdminForm.bind(window.MentfxAdmin);
window.closeConfirmModal = window.closeConfirmModal;

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.MentfxAdmin.init();
    window.MentfxAdmin.updateSyncUI();
});
