document.addEventListener('DOMContentLoaded', () => {
    // 0.0 PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker: Registered'))
                .catch(err => console.log(`Service Worker: Error: ${err}`));
        });
    }

    // 0.1 Toast System
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('toast-visible'), 10);

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }
    try {
        if (typeof Chart !== 'undefined') {
            Chart.register({
                id: 'centerText',
                afterDraw: (chart) => {
                    if (chart.config.options.elements && chart.config.options.elements.center) {
                        const ctx = chart.ctx;
                        const centerConfig = chart.config.options.elements.center;
                        const fontStyle = centerConfig.fontStyle || 'Inter';
                        const txt = centerConfig.text;
                        const color = centerConfig.color || '#fff';
                        const sidePadding = centerConfig.sidePadding || 20;
                        const sidePaddingCalculated = (sidePadding / 100) * (chart.innerRadius * 2);
                        
                        ctx.font = `bold 16px ${fontStyle}`;
                        
                        const stringWidth = ctx.measureText(txt).width;
                        const elementWidth = (chart.innerRadius * 2) - sidePaddingCalculated;

                        const widthRatio = elementWidth / stringWidth;
                        const newFontSize = Math.floor(30 * widthRatio);
                        const elementHeight = (chart.innerRadius * 2);

                        const fontSizeToUse = Math.min(newFontSize, elementHeight, centerConfig.maxFontSize || 25);
                        const textAlign = centerConfig.textAlign || 'center';
                        const textBaseline = centerConfig.textBaseline || 'middle';

                        ctx.textAlign = textAlign;
                        ctx.textBaseline = textBaseline;
                        ctx.font = `700 ${fontSizeToUse}px ${fontStyle}`;
                        ctx.fillStyle = color;

                        const centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
                        const centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);
                        ctx.fillText(txt, centerX, centerY);
                    }
                }
            });
        }
    } catch (e) {
        console.error("Chart.js centerText plugin registration failed:", e);
    }

    // 1. Initialize Data
    let appData = [];
    try {
        const stored = localStorage.getItem('mentfxData');
        if (stored) {
            appData = JSON.parse(stored);
            
            // Sync with source data (webinarData) to get new links, month groups, etc.
            if (typeof webinarData !== 'undefined') {
                let hasChanges = false;
                webinarData.forEach(source => {
                    const local = appData.find(w => w.id === source.id);
                    if (local) {
                        // Update metadata fields if they differ
                        if (local.link !== source.link || 
                            local.monthGroup !== source.monthGroup || 
                            local.name !== source.name) {
                            local.link = source.link;
                            local.monthGroup = source.monthGroup;
                            local.name = source.name;
                            hasChanges = true;
                        }
                    } else {
                        // Add new webinars that aren't in local storage yet
                        appData.push(source);
                        hasChanges = true;
                    }
                });
                
                if (hasChanges) {
                    localStorage.setItem('mentfxData', JSON.stringify(appData));
                }
            }
        } else {
            appData = typeof webinarData !== 'undefined' ? webinarData : [];
            localStorage.setItem('mentfxData', JSON.stringify(appData));
        }
    } catch (e) {
        console.log("Local storage not accessible, running in memory-only mode.");
        appData = typeof webinarData !== 'undefined' ? webinarData : [];
    }

    // 1.5. Initialize Application Data
    let appApplicationData = [];
    try {
        const storedApp = localStorage.getItem('mentfxApplication');
        if (storedApp) {
            appApplicationData = JSON.parse(storedApp);
            
            // Sync with source (applicationData.js)
            if (typeof applicationData !== 'undefined') {
                let hasChanges = false;
                applicationData.forEach(source => {
                    const local = appApplicationData.find(a => a.id === source.id);
                    if (local) {
                        if (local.link !== source.link || local.name !== source.name || local.category !== source.category) {
                            local.link = source.link;
                            local.name = source.name;
                            local.category = source.category;
                            hasChanges = true;
                        }
                    } else {
                        appApplicationData.push(source);
                        hasChanges = true;
                    }
                });
                if (hasChanges) localStorage.setItem('mentfxApplication', JSON.stringify(appApplicationData));
            }
        } else {
            appApplicationData = typeof applicationData !== 'undefined' ? applicationData : [];
            localStorage.setItem('mentfxApplication', JSON.stringify(appApplicationData));
        }
    } catch (e) {
        appApplicationData = typeof applicationData !== 'undefined' ? applicationData : [];
    }

    // Initialize Profile
    let userProfile = { name: 'Tshepo Moeletsi', motto: 'Above Dreams' };
    const storedProfile = localStorage.getItem('mentfxProfile');
    if (storedProfile) {
        userProfile = JSON.parse(storedProfile);
    }
    updateProfileUI();

    // Mastery Progress & View Mode State
    let masteryProgress = {};
    let collapsedModules = new Set();
    let currentMasteryViewMode = 'grid'; // Default view mode


    const storedMastery = localStorage.getItem('mentfxMastery');
    if (storedMastery) {
        masteryProgress = JSON.parse(storedMastery);
    }

    let activityLog = [];
    const storedActivity = localStorage.getItem('mentfxActivityLog');
    if (storedActivity) {
        activityLog = JSON.parse(storedActivity);
    }

    // Elements
    const trackerBody = document.getElementById('tracker-body');
    const searchFilter = document.getElementById('search-filter');
    const statusFilter = document.getElementById('status-filter');
    const modal = document.getElementById('edit-modal');

    
    let trendChart = null;

    // Filter out any previous mock data to ensure a clean slate
    const originalLength = activityLog.length;
    activityLog = activityLog.filter(log => log.id !== 'mock');
    if (activityLog.length !== originalLength) {
        localStorage.setItem('mentfxActivityLog', JSON.stringify(activityLog));
    }


    // State Variables
    let currentViewMode = 'list';
    let chartInstance = null;
    let pieChartInstance = null;
    let sidebarPieChartInstance = null;
    let isBulkEditMode = false;
    let selectedItems = new Set();


    // ---- Event Listeners (Moved to top for robustness) ----
    document.querySelectorAll('.nav-links li, .clickable-logo').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab || 'dashboard';
            if (typeof showTab === 'function') showTab(targetId);
            // Clear global search when switching tabs
            const gs = document.getElementById('global-search');
            if (gs) gs.value = '';
        });
    });

    const globalSearchInput = document.getElementById('global-search');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length > 0) {
                if (typeof handleGlobalSearch === 'function') handleGlobalSearch(query);
            } else {
                if (typeof showTab === 'function') showTab('dashboard');
            }
        });
    }

    // View Toggling within Tracker
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tracker-mode').forEach(m => m.classList.remove('active'));
            
            btn.classList.add('active');
            currentViewMode = btn.dataset.mode;
            const modeEl = document.getElementById(`${currentViewMode}-mode`);
            if (modeEl) modeEl.classList.add('active');
            
            renderCurrentView();
        });
    });

    // Mastery View Switching
    document.querySelectorAll('.mastery-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMasteryViewMode = btn.dataset.modemastery;
            document.querySelectorAll('.mastery-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMastery();
        });
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Esc to close any active modal
        if (e.key === 'Escape') {
            if (typeof closeModal === 'function') closeModal();
            const profileModal = document.getElementById('profile-modal');
            if (profileModal && profileModal.classList.contains('active')) {
                profileModal.classList.remove('active');
                profileModal.style.opacity = '0';
                profileModal.style.pointerEvents = 'none';
            }
        }
        
        // Ctrl+S or Cmd+S to Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault(); // Prevent browser save
            
            // If main edit modal is open
            const editModal = document.getElementById('edit-modal');
            if (editModal && editModal.classList.contains('active')) {
                if (typeof saveChanges === 'function') saveChanges();
            }
            
            // If Admin Manage form is open/active
            const adminView = document.getElementById('admin-view');
            if (adminView && adminView.classList.contains('active')) {
                if (typeof handleAdminPush === 'function') handleAdminPush();
            }
        }
    });

    // Initial Render & Sync
    try {
        loadFromServer();
    } catch (e) {
        console.error("loadFromServer failed:", e);
    }

    // Handle responsiveness for dynamic elements like Heatmap
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (typeof renderHeatmap === 'function') renderHeatmap();
        }, 250);
    });

    document.body.style.overflowX = 'hidden';
    
    renderCurrentView();
    updateDashboard();

    // ---- Functions ---- //

    function renderCurrentView() {
        if (currentViewMode === 'list') renderTable();
        else if (currentViewMode === 'grid') renderGrid();
        else if (currentViewMode === 'calendar') renderCalendar();
    }

    function renderTable() {
        const term = searchFilter.value.toLowerCase();
        const stat = statusFilter.value;
        const sortBy = document.getElementById('sort-filter')?.value || 'default';
        trackerBody.innerHTML = '';
        
        let filtered = appData.filter(wb => {
            const matchInTags = (wb.tags || []).some(t => t.toLowerCase().includes(term));
            if (stat !== 'All' && wb.status !== stat) return false;
            if (term && !wb.name.toLowerCase().includes(term) && (!wb.notes || !wb.notes.toLowerCase().includes(term)) && !matchInTags) return false;
            return true;
        });

        // Apply Sorting
        filtered = getSortedData(filtered, sortBy);

        filtered.forEach((wb, index) => {
            const row = document.createElement('tr');
            let statusClass = 'status-not-started';
            if (wb.status === 'In Progress') statusClass = 'status-in-progress';
            if (wb.status === 'Completed') statusClass = 'status-completed';

            let linkHtml = wb.link ? `<a href="${wb.link}" target="_blank" class="link-btn" onclick="logActivity('${wb.id}', 'webinar', 'view')">Watch</a>` : '<span style="color:#64748b">No Link</span>';
            let tagsHtml = (wb.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join('');

            const isDone = wb.status === 'Completed';
            const isSelected = selectedItems.has(wb.id);

            row.innerHTML = `
                <td class="bulk-col">
                    <input type="checkbox" class="bulk-check" data-id="${wb.id}" 
                           ${isSelected ? 'checked' : ''} 
                           onclick="toggleSelectItem('${wb.id}')">
                </td>
                <td>
                    <button class="btn-quick-done ${isDone ? 'done' : ''}" 
                            title="${isDone ? 'Mark as Not Started' : 'Quick Complete'}"
                            onclick="toggleItemComplete('${wb.id}', 'webinar', event)">
                        ${isDone ? '✓' : ''}
                    </button>
                </td>
                <td style="font-weight: 500;">
                    <div>${wb.name}</div>
                    <div class="tag-container">${tagsHtml}</div>
                </td>
                <td style="color: var(--text-muted);">${wb.monthGroup || 'Unknown'}</td>
                <td><span class="status-badge ${statusClass}">${wb.status}</span></td>
                <td><div style="display:flex; align-items:center; gap:5px;"><span style="color:var(--accent); font-weight:700">${wb.rating || 0}</span>/5</div></td>
                <td>${linkHtml}</td>
                <td><button class="btn-action" onclick="openEditModal('${wb.id}', 'webinar')">Update</button></td>
            `;
            trackerBody.appendChild(row);
        });
    }

    function getSortedData(data, sortBy) {
        const sorted = [...data];
        switch (sortBy) {
            case 'newest':
                return sorted.reverse(); // data.js is already chronologically ascending
            case 'rating-high':
                return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'rating-low':
                return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
            case 'status-progress':
                const order = { 'In Progress': 0, 'Not Started': 1, 'Completed': 2 };
                return sorted.sort((a, b) => order[a.status] - order[b.status]);
            case 'status-done':
                return sorted.sort((a, b) => (b.status === 'Completed' ? 1 : 0) - (a.status === 'Completed' ? 1 : 0));
            case 'name-az':
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            default:
                return sorted; // Oldest to newest
        }
    }

    function renderGrid() {
        const container = document.getElementById('grid-container');
        const term = searchFilter.value.toLowerCase();
        const stat = statusFilter.value;
        const sortBy = document.getElementById('sort-filter')?.value || 'default';
        container.innerHTML = '';

        let filtered = appData.filter(wb => {
            const matchInTags = (wb.tags || []).some(t => t.toLowerCase().includes(term));
            if (stat !== 'All' && wb.status !== stat) return false;
            if (term && !wb.name.toLowerCase().includes(term) && (!wb.notes || !wb.notes.toLowerCase().includes(term)) && !matchInTags) return false;
            return true;
        });

        filtered = getSortedData(filtered, sortBy);

        filtered.forEach((wb, index) => {
            const card = document.createElement('div');
            card.className = 'webinar-card glass';

            let statusClass = 'status-not-started';
            if (wb.status === 'In Progress') statusClass = 'status-in-progress';
            if (wb.status === 'Completed') statusClass = 'status-completed';

            let linkHtml = wb.link ? `<a href="${wb.link}" target="_blank" class="btn-action" onclick="logActivity('${wb.id}', 'webinar', 'view')">Watch</a>` : '';
            let tagsHtml = (wb.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join('');

            let notesHtml = '';
            if (wb.notes) {
                notesHtml = `<div class="lesson-notes-preview" style="margin-top:0.5rem; opacity:0.7">${wb.notes}</div>`;
            }

            const isDone = wb.status === 'Completed';

            card.innerHTML = `
                <div class="card-header">
                    <button class="btn-quick-done ${isDone ? 'done' : ''}" 
                            title="${isDone ? 'Mark as Not Started' : 'Quick Complete'}"
                            onclick="toggleItemComplete('${wb.id}', 'webinar', event)">
                        ${isDone ? '✓' : ''}
                    </button>
                    <span class="card-month">${wb.monthGroup}</span>
                    <span class="status-badge ${statusClass}">${wb.status}</span>
                </div>
                <div class="card-title">${wb.name}</div>
                <div class="tag-container">${tagsHtml}</div>
                ${notesHtml}
                <div class="card-rating">Comprehension: ${wb.rating || 0}/5</div>
                <div class="card-footer">
                    ${linkHtml}
                    <button class="btn-action" style="flex:1" onclick="openEditModal('${wb.id}', 'webinar')">Edit & Notes</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function renderCalendar() {
        const container = document.getElementById('calendar-container');
        const term = searchFilter.value.toLowerCase();
        const stat = statusFilter.value;
        container.innerHTML = '';

        // Group by Year, then by Month Group
        const yearGroups = {};
        appData.forEach(wb => {
            const matchInTags = (wb.tags || []).some(t => t.toLowerCase().includes(term));
            if (stat !== 'All' && wb.status !== stat) return;
            if (term && !wb.name.toLowerCase().includes(term) && (!wb.notes || !wb.notes.toLowerCase().includes(term)) && !matchInTags) return;
            
            const yearMatch = wb.monthGroup.match(/\d{4}/);
            const year = yearMatch ? yearMatch[0] : 'Other';
            
            if (!yearGroups[year]) yearGroups[year] = {};
            if (!yearGroups[year][wb.monthGroup]) yearGroups[year][wb.monthGroup] = [];
            
            yearGroups[year][wb.monthGroup].push(wb);
        });

        // Loop years
        Object.keys(yearGroups).sort().forEach(year => {
            // Year header row
            const yearHeader = document.createElement('div');
            yearHeader.className = 'year-section';
            yearHeader.innerHTML = `<div class="year-header">${year}</div>`;
            container.appendChild(yearHeader);

            // Months for this year
            const months = yearGroups[year];
            Object.keys(months).forEach(month => {
                const card = document.createElement('div');
                card.className = 'calendar-month glass';
                
                let itemsHtml = '';
                months[month].forEach(wb => {
                    let statusClass = 'dot-not-started';
                    if (wb.status === 'In Progress') statusClass = 'dot-in-progress';
                    if (wb.status === 'Completed') statusClass = 'dot-completed';

                    const watchLink = wb.link ? `
                        <a href="${wb.link}" target="_blank" onclick="event.stopPropagation()" class="cal-watch-btn" title="Watch Webinar">
                            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </a>
                    ` : '';

                    itemsHtml += `
                        <div class="calendar-item" onclick="openEditModal('${wb.id}')" style="cursor:pointer">
                            <div style="display:flex; align-items:center; gap:0.75rem; flex:1; overflow:hidden;">
                                <div class="item-status-dot ${statusClass}"></div>
                                <span class="item-name" title="${wb.name}">${wb.name}</span>
                            </div>
                            ${watchLink}
                        </div>
                    `;
                });

                card.innerHTML = `
                    <div class="month-header">${month}</div>
                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        ${itemsHtml}
                    </div>
                `;
                container.appendChild(card);
            });
        });
    }

    let currentEditType = 'webinar';
    let currentEditId = null;
    let editingIndex = null;
    
    window.openEditModal = (id, type = 'webinar') => {
        try {
            currentEditType = type;
            currentEditId = id;

            let dataObj = null;
            if (type === 'webinar') {
                editingIndex = appData.findIndex(w => w.id === id);
                if (editingIndex === -1) {
                    showToast('Error: Could not find webinar id: ' + id, 'error');
                    return;
                }
                dataObj = appData[editingIndex];
            } else if (type === 'application') {
                editingIndex = appApplicationData.findIndex(a => a.id === id);
                if (editingIndex === -1) {
                    showToast('Error: Could not find application item id: ' + id, 'error');
                    return;
                }
                dataObj = appApplicationData[editingIndex];
            } else {
                // Mastery
                const lesson = masteryProgress[id] || { status: 'Not Started', rating: 0, notes: '' };
                // Handle legacy boolean data
                if (typeof lesson === 'boolean') {
                    dataObj = { status: lesson ? 'Completed' : 'Not Started', rating: 0, notes: '' };
                } else {
                    dataObj = lesson;
                }
                
                // Find lesson name for title
                let lessonName = 'Lesson';
                masteryData.forEach(mod => {
                    const l = mod.lessons.find(ls => ls.id === id);
                    if (l) lessonName = l.name;
                });
                dataObj.name = lessonName;
            }
            
            document.getElementById('modal-title').textContent = `Update: ${dataObj.name}`;
            document.getElementById('modal-status').value = dataObj.status || 'Not Started';
            document.getElementById('modal-understanding').value = dataObj.rating || 0;
            document.getElementById('modal-understanding-val').textContent = dataObj.rating || 0;
            document.getElementById('modal-notes').value = dataObj.notes || '';
            document.getElementById('modal-tags').value = (dataObj.tags || []).join(', ');
            
            modal.style.opacity = '1';
            modal.style.pointerEvents = 'all';
            modal.classList.add('active');
        } catch(e) {
            showToast('Critical Error in openEditModal: ' + e.message, 'error');
        }
    };

    window.closeModal = () => {
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
        modal.classList.remove('active');
        editingIndex = null;
    };

    window.saveChanges = () => {
        const status = document.getElementById('modal-status').value;
        const rating = parseInt(document.getElementById('modal-understanding').value);
        const notes = document.getElementById('modal-notes').value;
        const tags = document.getElementById('modal-tags').value.split(',').map(t => t.trim()).filter(t => t !== '');

        if (currentEditType === 'webinar') {
            if (editingIndex === null) return;
            appData[editingIndex].status = status;
            appData[editingIndex].rating = rating;
            appData[editingIndex].notes = notes;
            appData[editingIndex].tags = tags;
            
            localStorage.setItem('mentfxData', JSON.stringify(appData));
            renderCurrentView();
        } else if (currentEditType === 'application') {
            if (editingIndex === null) return;
            appApplicationData[editingIndex].status = status;
            appApplicationData[editingIndex].rating = rating;
            appApplicationData[editingIndex].notes = notes;
            appApplicationData[editingIndex].tags = tags;
            
            localStorage.setItem('mentfxApplication', JSON.stringify(appApplicationData));
            renderApplication();
        } else {
            // Mastery
            masteryProgress[currentEditId] = {
                status: status,
                rating: rating,
                notes: notes,
                tags: tags
            };
            localStorage.setItem('mentfxMastery', JSON.stringify(masteryProgress));
            renderMastery();
        }
        
        logActivity(currentEditId, currentEditType, rating);
        
        closeModal();
        updateDashboard();
        showAutoSave();
        saveToServer(); // Background sync
    };

    function logActivity(id, type, rating) {
        const today = new Date().toISOString().split('T')[0];
        activityLog.push({
            date: today,
            id: id,
            type: type,
            rating: rating
        });
        
        // Keep last 2000 entries
        if (activityLog.length > 2000) activityLog.shift();
        localStorage.setItem('mentfxActivityLog', JSON.stringify(activityLog));
        
        // Refresh analytics if on dashboard
        if (document.getElementById('dashboard-view').classList.contains('active')) {
            renderAnalytics();
        }
    }

    window.saveProfile = () => {
        userProfile.name = document.getElementById('profile-name-input').value || 'User';
        userProfile.motto = document.getElementById('profile-motto-input').value || 'Above Dreams';
        
        localStorage.setItem('mentfxProfile', JSON.stringify(userProfile));
        updateProfileUI();
        closeProfileModal();
        showAutoSave();
        saveToServer(); // Background sync
    };

    // Data Export/Import Logic
    window.showAutoSave = () => {
        const toast = document.getElementById('save-toast');
        if (!toast) return;
        toast.classList.add('active');
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    };

    window.exportProgress = () => {
        const data = {
            mentfxData: JSON.parse(localStorage.getItem('mentfxData') || '[]'),
            mentfxMastery: JSON.parse(localStorage.getItem('mentfxMastery') || '{}'),
            mentfxProfile: JSON.parse(localStorage.getItem('mentfxProfile') || '{}'),
            mentfxApplication: JSON.parse(localStorage.getItem('mentfxApplication') || '[]'),
            mentfxActivityLog: JSON.parse(localStorage.getItem('mentfxActivityLog') || '[]'),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mentfx_progress_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    window.importProgress = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('Are you sure you want to import data? This will overwrite your current progress.')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.mentfxData) localStorage.setItem('mentfxData', JSON.stringify(data.mentfxData));
                if (data.mentfxMastery) localStorage.setItem('mentfxMastery', JSON.stringify(data.mentfxMastery));
                if (data.mentfxProfile) localStorage.setItem('mentfxProfile', JSON.stringify(data.mentfxProfile));
                if (data.mentfxApplication) localStorage.setItem('mentfxApplication', JSON.stringify(data.mentfxApplication));
                if (data.mentfxActivityLog) localStorage.setItem('mentfxActivityLog', JSON.stringify(data.mentfxActivityLog));

                showToast('Import successful! Reloading...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                showToast('Error importing data: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    };

    // Range input sync

    document.getElementById('modal-understanding').addEventListener('input', (e) => {
        document.getElementById('modal-understanding-val').textContent = e.target.value;
    });

    // Close modal on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    function updateDashboard() {
        // 1. Webinar Tracker Stats
        const total = appData.length;
        const completed = appData.filter(d => d.status === 'Completed').length;
        const inProgress = appData.filter(d => d.status === 'In Progress').length;
        
        const rated = appData.filter(d => d.rating > 0);
        const avgUnderstanding = rated.length ? (rated.reduce((sum, d) => sum + d.rating, 0) / rated.length).toFixed(1) : 0;
        
        const pct = total ? Math.round((completed / total) * 100) : 0;

        const overallProgEl = document.getElementById('overall-progress');
        const watchedCountEl = document.getElementById('watched-count');
        
        if (overallProgEl) overallProgEl.style.width = `${pct}%`;
        if (watchedCountEl) watchedCountEl.textContent = `${completed} / ${total} Watched`;
        
        const progFillEl = document.getElementById('progress-fill');
        if (progFillEl) progFillEl.style.width = `${pct}%`;

        // Active Webinar Display
        const activeWebinarTitleEl = document.getElementById('active-webinar-title');
        const activeWebinarMonthEl = document.getElementById('active-webinar-month');
        
        const activeWb = appData.find(d => d.status === 'In Progress');
        if (activeWb) {
            if (activeWebinarTitleEl) activeWebinarTitleEl.textContent = activeWb.name;
            if (activeWebinarMonthEl) activeWebinarMonthEl.textContent = `From ${activeWb.monthGroup}`;
        } else {
            if (activeWebinarTitleEl) activeWebinarTitleEl.textContent = "No Active Webinar";
            if (activeWebinarMonthEl) activeWebinarMonthEl.textContent = "Start a new one below";
        }

        // 2. Mastery Stats
        const totalLessons = masteryData.reduce((acc, mod) => acc + mod.lessons.length, 0);
        const completedLessons = Object.values(masteryProgress).filter(p => p.status === 'Completed' || p === true).length;
        const masteryPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

        const masteryPctEl = document.getElementById('mastery-progress-pct');
        if (masteryPctEl) masteryPctEl.textContent = `${masteryPct}%`;
        const masteryFillEl = document.getElementById('mastery-progress-fill');
        if (masteryFillEl) masteryFillEl.style.width = `${masteryPct}%`;
        const masteryWatchedCountEl = document.getElementById('mastery-watched-count');
        if (masteryWatchedCountEl) masteryWatchedCountEl.textContent = `${completedLessons} / ${totalLessons} Lessons`;
        
        const masteryProgTxt = document.getElementById('mastery-progress-text');
        if (masteryProgTxt) masteryProgTxt.textContent = `${masteryPct}%`;
        const masteryProgBar = document.getElementById('mastery-progress-bar');
        if (masteryProgBar) masteryProgBar.style.width = `${masteryPct}%`;

        const statusLabel = document.getElementById('course-status-label');
        if (statusLabel) {
            if (masteryPct === 0) statusLabel.textContent = "New Student";
            else if (masteryPct < 25) statusLabel.textContent = "Foundations";
            else if (masteryPct < 50) statusLabel.textContent = "Intermediate";
            else if (masteryPct < 75) statusLabel.textContent = "Advanced";
            else if (masteryPct < 100) statusLabel.textContent = "Almost Master";
            else statusLabel.textContent = "Mentfx Master";
        }
        
        // 3. Application Stats
        const totalApp = appApplicationData.length;
        const completedApp = appApplicationData.filter(a => a.status === 'Completed').length;
        const appPct = totalApp ? Math.round((completedApp / totalApp) * 100) : 0;
        
        const appPctEl = document.getElementById('app-progress-pct');
        if (appPctEl) appPctEl.textContent = `${appPct}%`;
        const appFillEl = document.getElementById('app-progress-fill');
        if (appFillEl) appFillEl.style.width = `${appPct}%`;
        const appCountEl = document.getElementById('app-watched-count');
        if (appCountEl) appCountEl.textContent = `${completedApp} / ${totalApp} Completed`;
        
        const appProgTxt = document.getElementById('app-progress-text');
        if (appProgTxt) appProgTxt.textContent = `${appPct}%`;
        const appProgBar = document.getElementById('app-progress-bar');
        if (appProgBar) appProgBar.style.width = `${appPct}%`;

        const latestAppEl = document.getElementById('latest-app-concept');
        if (latestAppEl) {
            const lastCompleted = [...appApplicationData].reverse().find(a => a.status === 'Completed');
            latestAppEl.textContent = lastCompleted ? lastCompleted.name : "Study started";
        }

        // Mini sidebar sync
        const miniProgTxtEl = document.getElementById('mini-progress-txt');
        if (miniProgTxtEl) miniProgTxtEl.textContent = `${pct}%`;
        const miniProgFillEl = document.getElementById('mini-progress-fill');
        if (miniProgFillEl) miniProgFillEl.style.width = `${pct}%`;
        
        const miniMasteryTxtEl = document.getElementById('mini-mastery-txt');
        if (miniMasteryTxtEl) miniMasteryTxtEl.textContent = `${masteryPct}%`;
        const miniMasteryFillEl = document.getElementById('mini-mastery-fill');
        if (miniMasteryFillEl) miniMasteryFillEl.style.width = `${masteryPct}%`;

        const miniAppTxtEl = document.getElementById('mini-app-txt');
        if (miniAppTxtEl) miniAppTxtEl.textContent = `${appPct}%`;
        const miniAppFillEl = document.getElementById('mini-app-fill');
        if (miniAppFillEl) miniAppFillEl.style.width = `${appPct}%`;

        // Update Charts
        const monthCounts = {};
        appData.forEach(wb => {
            if (wb.status === 'Completed' && wb.monthGroup) {
                monthCounts[wb.monthGroup] = (monthCounts[wb.monthGroup] || 0) + 1;
            }
        });

        const labels = Object.keys(monthCounts);
        const data = Object.values(monthCounts);

        if (chartInstance) {
            chartInstance.data.labels = labels.length ? labels : ['No Data'];
            chartInstance.data.datasets[0].data = data.length ? data : [0];
            chartInstance.update();
        } else {
            const chartEl = document.getElementById('monthlyChart');
            if (chartEl) {
                const ctx = chartEl.getContext('2d');
                chartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels.length ? labels : ['No Data'],
                        datasets: [{
                            label: 'Completed Webinars',
                            data: data.length ? data : [0],
                            backgroundColor: '#3b82f6',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                            x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                        }
                    }
                });
            }
        }

        const notStarted = total - completed - inProgress;
        if (pieChartInstance) {
            pieChartInstance.data.datasets[0].data = [completed, inProgress, notStarted];
            pieChartInstance.options.elements.center.text = `${pct}%`;
            pieChartInstance.update();
        } else {
            const pieEl = document.getElementById('statusPieChart');
            if (pieEl) {
                const pieCtx = pieEl.getContext('2d');
                pieChartInstance = new Chart(pieCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Completed', 'In Progress', 'Not Started'],
                        datasets: [{
                            data: [completed, inProgress, notStarted],
                            backgroundColor: ['#10b981', '#3b82f6', '#475569'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20, font: { family: 'Inter' } } } },
                        cutout: '70%',
                        elements: {
                            center: { text: `${pct}%`, color: '#10b981', fontStyle: 'Inter', sidePadding: 20, minFontSize: 12, maxFontSize: 24 }
                        }
                    }
                });
            }
        }

        // Sidebar Combined Pie Chart
        const totalCombined = total + totalLessons;
        const completedCombined = completed + completedLessons;
        let inProgressMastery = 0;
        masteryData.forEach(mod => {
            mod.lessons.forEach(l => {
                const p = masteryProgress[l.id];
                if (p && p.status === 'In Progress') inProgressMastery++;
            });
        });
        const inProgressCombined = inProgress + inProgressMastery;
        const notStartedCombined = totalCombined - completedCombined - inProgressCombined;
        const combinedPct = totalCombined ? Math.round((completedCombined / totalCombined) * 100) : 0;

        if (sidebarPieChartInstance) {
            sidebarPieChartInstance.data.datasets[0].data = [completedCombined, inProgressCombined, notStartedCombined];
            sidebarPieChartInstance.options.elements.center.text = `${combinedPct}%`;
            sidebarPieChartInstance.update();
        } else {
            const sidebarEl = document.getElementById('sidebarPieChart');
            if (sidebarEl) {
                const sidebarCtx = sidebarEl.getContext('2d');
                sidebarPieChartInstance = new Chart(sidebarCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Completed', 'In Progress', 'Not Started'],
                        datasets: [{
                            data: [completedCombined, inProgressCombined, notStartedCombined],
                            backgroundColor: ['#10b981', '#3b82f6', '#475569'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: { enabled: true } },
                        cutout: '75%',
                        elements: {
                            center: { text: `${combinedPct}%`, color: '#fff', fontStyle: 'Inter', sidePadding: 15, maxFontSize: 16 }
                        }
                    }
                });
            }
        }
        renderAnalytics();
    }

    function renderAnalytics() {
        renderHeatmap();
        renderComprehensionTrends();
    }

    function renderHeatmap() {
        const grid = document.getElementById('heatmap-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // Group by date and count activity
        const activityMap = {};
        activityLog.forEach(log => {
            activityMap[log.date] = (activityMap[log.date] || 0) + 1;
        });

        const today = new Date();
        
        // On mobile, show only last 18 weeks (126 days) to prevent horizontal scroll
        const isMobile = window.innerWidth <= 768;
        const weeksToShow = isMobile ? 18 : 53;
        const totalDays = weeksToShow * 7;
        
        // Update CSS grid columns dynamically
        grid.style.gridTemplateColumns = `repeat(${weeksToShow}, 1fr)`;

        const start = new Date(today);
        start.setDate(today.getDate() - (totalDays - 1));
        // Adjust to the Sunday of that week
        start.setDate(start.getDate() - start.getDay());

        for (let i = 0; i < totalDays; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const dateStr = current.toISOString().split('T')[0];
            const count = activityMap[dateStr] || 0;

            const box = document.createElement('div');
            box.className = 'heatmap-box';
            
            let level = 0;
            if (count > 0) level = 1;
            if (count > 2) level = 2;
            if (count > 4) level = 3;
            if (count > 6) level = 4;
            
            box.classList.add(`level-${level}`);
            box.title = `${dateStr}: ${count} activity`;
            grid.appendChild(box);
        }
    }

    function handleEmptyState(containerId, hasData, icon, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Find or create the empty state div
        let emptyDiv = container.parentElement.querySelector('.empty-state-container');
        
        if (!hasData) {
            if (!emptyDiv) {
                emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-state-container';
                container.parentElement.appendChild(emptyDiv);
            }
            emptyDiv.innerHTML = `<span class="empty-state-icon">${icon}</span><p>${message}</p>`;
            container.style.display = 'none';
        } else {
            if (emptyDiv) emptyDiv.remove();
            container.style.display = 'block';
        }
    }

    function renderComprehensionTrends() {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;

        // Group by date and calculate average rating
        const trendData = {};
        const ratedLogs = activityLog.filter(log => typeof log.rating === 'number' && log.rating > 0);
        
        handleEmptyState('trendChart', ratedLogs.length > 0, '📊', 'No comprehension data yet. Start rating your webinars to see your progress!');
        
        if (ratedLogs.length === 0) return;

        ratedLogs.forEach(log => {
            const date = log.date.split('T')[0];
            if (!trendData[date]) trendData[date] = { sum: 0, count: 0 };
            trendData[date].sum += log.rating;
            trendData[date].count++;
        });

        const sortedDates = Object.keys(trendData).sort();
        // Limit to last 30 entries for readability
        const recentDates = sortedDates.slice(-30);
        
        const labels = recentDates.map(d => d.split('-').slice(1).join('/')); // MM/DD
        const data = recentDates.map(d => (trendData[d].sum / trendData[d].count).toFixed(1));

        if (trendChart) trendChart.destroy();

        try {
            if (typeof Chart === 'undefined') return;
            trendChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: labels.length ? labels : ['No Data'],
                    datasets: [{
                        label: 'Avg Comprehension',
                        data: data.length ? data : [0],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        pointRadius: labels.length > 1 ? 3 : 5,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: window.innerWidth <= 768 ? 1.6 : 2,
                    interaction: {
                        intersect: true,
                        mode: 'index'
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: window.innerWidth > 768, // Disable tooltips on mobile to prioritize scrolling
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        y: {
                            min: 0,
                            max: 5,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 6 }
                        }
                    }
                }
            });
        } catch (chartErr) {
            console.error("Error rendering Trend Chart:", chartErr);
        }
    }

    function renderApplication() {
        const container = document.getElementById('app-grid');
        if (!container) return;
        container.innerHTML = '';

        appApplicationData.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'webinar-card glass';

            let statusClass = 'status-not-started';
            if (item.status === 'In Progress') statusClass = 'status-in-progress';
            if (item.status === 'Completed') statusClass = 'status-completed';

            let linkHtml = item.link ? `<a href="${item.link}" target="_blank" class="btn-action">Watch</a>` : '';
            let notesHtml = item.notes ? `<div class="lesson-notes-preview" style="margin-top:0.5rem; opacity:0.7">${item.notes}</div>` : '';
            let tagsHtml = (item.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join('');

            const isDone = item.status === 'Completed';

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-month">${item.category || 'Study'}</span>
                    <span class="status-badge ${statusClass}">${item.status}</span>
                </div>
                <div class="card-title">${item.name}</div>
                <div class="tag-container">${tagsHtml}</div>
                ${notesHtml}
                <div class="card-rating">Comprehension: ${item.rating || 0}/5</div>
                <div class="card-footer">
                    <button class="btn-quick-done ${isDone ? 'done' : ''}" 
                            style="width:36px; height:36px;"
                            title="${isDone ? 'Mark as Not Started' : 'Quick Complete'}"
                            onclick="toggleItemComplete('${item.id}', 'application', event)">
                        ${isDone ? '✓' : ''}
                    </button>
                    ${linkHtml}
                    <button class="btn-action" style="flex:1" onclick="openEditModal('${item.id}', 'application')">Edit & Notes</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Profile Logic
    const profileModal = document.getElementById('profile-modal');
    
    window.openProfileModal = () => {
        document.getElementById('profile-name-input').value = userProfile.name;
        document.getElementById('profile-motto-input').value = userProfile.motto;
        profileModal.classList.add('active');
        profileModal.style.opacity = '1';
        profileModal.style.pointerEvents = 'all';
    };

    window.closeProfileModal = () => {
        profileModal.classList.remove('active');
        profileModal.style.opacity = '0';
        profileModal.style.pointerEvents = 'none';
    };

    window.saveProfile = () => {
        userProfile.name = document.getElementById('profile-name-input').value || 'User';
        userProfile.motto = document.getElementById('profile-motto-input').value || 'Above Dreams';
        
        localStorage.setItem('mentfxProfile', JSON.stringify(userProfile));
        updateProfileUI();
        closeProfileModal();
        saveToServer(); // Background sync
    };

    // Mastery Logic already initialized at top


    function renderMastery() {
        if (currentMasteryViewMode === 'grid') renderMasteryGrid();
        else renderMasteryList();
        updateMasteryOverallStats();
    }

    function renderMasteryGrid() {
        const grid = document.getElementById('mastery-grid');
        grid.innerHTML = '';
        grid.classList.add('active');
        document.getElementById('mastery-list').classList.remove('active');

        masteryData.forEach(mod => {
            const isCollapsed = collapsedModules.has(mod.module);
            const card = document.createElement('div');
            card.className = `module-card ${isCollapsed ? 'collapsed' : ''}`;
            
            const total = mod.lessons.length;
            const completed = mod.lessons.filter(l => masteryProgress[l.id]?.status === 'Completed').length;
            const pct = total ? Math.round((completed / total) * 100) : 0;

            // Progress Ring SVG
            const radius = 16;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (pct / 100) * circumference;

            card.innerHTML = `
                <div class="module-card-header" onclick="toggleModule(${mod.module})">
                    <div class="progress-ring-container">
                        <svg class="progress-ring" width="40" height="40">
                            <circle class="progress-ring-bg" stroke-width="3" fill="transparent" r="${radius}" cx="20" cy="20"/>
                            <circle class="progress-ring-circle" stroke="var(--accent)" stroke-width="3" 
                                    stroke-dasharray="${circumference} ${circumference}" 
                                    stroke-dashoffset="${offset}" 
                                    stroke-linecap="round" fill="transparent" r="${radius}" cx="20" cy="20"/>
                        </svg>
                        <span class="progress-ring-val">${pct}%</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.25rem;">
                        <span class="module-progress-chip">${completed}/${total} Done</span>
                        <h3>Module ${mod.module}: ${mod.title}</h3>
                    </div>
                    <svg class="collapse-chevron" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="lesson-list">
                    ${mod.lessons.map(lesson => {
                        const prog = masteryProgress[lesson.id] || { status: 'Not Started' };
                        const isDone = prog === true || prog.status === 'Completed';
                        const isInProgress = prog.status === 'In Progress';
                        const statusClass = isDone ? 'completed' : (isInProgress ? 'in-progress' : '');
                        let icon = isDone ? '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 20 20" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : (isInProgress ? '<div style="width:8px; height:8px; background:var(--primary); border-radius:50%"></div>' : '');
                        
                        let notesHtml = '';
                        if (prog.notes) {
                            notesHtml = `
                                <div class="lesson-notes-wrapper" style="width:100%">
                                    <div class="lesson-notes-preview">${prog.notes}</div>
                                    <button class="notes-toggle-btn" onclick="toggleNoteExpansion(this, event)">Read More</button>
                                </div>
                            `;
                        }

                        return `
                            <div class="lesson-item ${statusClass}" onclick="openEditModal('${lesson.id}', 'mastery')">
                                <div style="display:flex; flex-direction:column; width:100%;">
                                    <div style="display:flex; align-items:center; gap:0.6rem; width:100%;">
                                        <button class="btn-quick-done ${isDone ? 'done' : ''}" 
                                                style="width:24px; height:24px; font-size:0.7rem; border-width:1px;"
                                                title="Quick Complete"
                                                onclick="toggleItemComplete('${lesson.id}', 'mastery', event)">
                                            ${isDone ? '✓' : ''}
                                        </button>
                                        <span style="flex:1">${lesson.name}</span>
                                        <a href="${lesson.link}" target="_blank" class="lesson-link" onclick="event.stopPropagation()">
                                            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                        </a>
                                    </div>
                                    <div class="tag-container">${(prog.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join('')}</div>
                                    ${notesHtml}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function renderMasteryList() {
        const body = document.getElementById('mastery-list-body');
        body.innerHTML = '';
        document.getElementById('mastery-list').classList.add('active');
        document.getElementById('mastery-grid').classList.remove('active');

        masteryData.forEach(mod => {
            const isCollapsed = collapsedModules.has(mod.module);
            
            // Module Header Row
            const headerRow = document.createElement('tr');
            headerRow.className = `module-separator-row ${isCollapsed ? 'collapsed' : ''}`;
            headerRow.onclick = () => toggleModule(mod.module);
            headerRow.style.cursor = 'pointer';
            headerRow.innerHTML = `
                <td colspan="3">
                    <div class="module-separator-content">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                            <span>Module ${mod.module}: ${mod.title}</span>
                            <svg class="collapse-chevron" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    </div>
                </td>
            `;
            body.appendChild(headerRow);

            if (!isCollapsed) {
                mod.lessons.forEach(lesson => {
                    const prog = masteryProgress[lesson.id] || { status: 'Not Started' };
                    const isDone = prog === true || prog.status === 'Completed';
                    const isInProgress = prog.status === 'In Progress';

                    const tr = document.createElement('tr');
                    tr.onclick = () => openEditModal(lesson.id, 'mastery');
                    tr.style.cursor = 'pointer';

                    let icon = '';
                    if (isDone) icon = '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 20 20" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
                    else if (isInProgress) icon = '<div style="width:8px; height:8px; background:var(--primary); border-radius:50%"></div>';

                    let notesHtml = '';
                    if (prog.notes) {
                        notesHtml = `
                            <div class="lesson-notes-wrapper">
                                <div class="lesson-notes-preview">${prog.notes}</div>
                                <button class="notes-toggle-btn" onclick="toggleNoteExpansion(this, event)">Read More</button>
                            </div>
                        `;
                    }

                    tr.innerHTML = `
                        <td>
                            <button class="btn-quick-done ${isDone ? 'done' : ''}" 
                                    style="width:28px; height:28px; font-size:0.75rem;"
                                    title="Quick Complete"
                                    onclick="toggleItemComplete('${lesson.id}', 'mastery', event)">
                                ${isDone ? '✓' : ''}
                            </button>
                        </td>
                        <td>
                            <div style="font-weight:500;">${lesson.name}</div>
                            <div class="tag-container">${(prog.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join('')}</div>
                            ${notesHtml}
                        </td>
                        <td style="text-align:right">
                            <a href="${lesson.link}" target="_blank" class="lesson-link" onclick="event.stopPropagation()">
                                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1.1em" width="1.1em" xmlns="http://www.w3.org/2000/svg"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        </td>
                    `;
                    body.appendChild(tr);
                });
            }
        });
    }

    window.toggleModule = (modId) => {
        if (collapsedModules.has(modId)) collapsedModules.delete(modId);
        else collapsedModules.add(modId);
        renderMastery();
    };

    function updateMasteryOverallStats() {
        let totalCount = 0;
        let doneCount = 0;
        masteryData.forEach(m => {
            m.lessons.forEach(l => {
                totalCount++;
                const prog = masteryProgress[l.id];
                if (prog && (prog === true || prog.status === 'Completed')) {
                    doneCount++;
                }
            });
        });

        const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        document.getElementById('mastery-progress-text').textContent = `${percent}%`;
        document.getElementById('mastery-progress-bar').style.width = `${percent}%`;
    }

    window.toggleLesson = (id) => {
        // Quick toggle for backwards compatibility or fast check
        const current = masteryProgress[id];
        let isDone = current === true || (current && current.status === 'Completed');
        
        if (isDone) {
            masteryProgress[id] = { status: 'Not Started', rating: 0, notes: '' };
        } else {
            masteryProgress[id] = { status: 'Completed', rating: 0, notes: '' };
        }
        
        localStorage.setItem('mentfxMastery', JSON.stringify(masteryProgress));
        renderMastery();
        updateDashboard(); // Sync with dashboard stats
        saveToServer(); // Background sync
    };

    window.toggleNoteExpansion = (el, event) => {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const btn = el;
        const wrapper = btn.closest('.lesson-notes-wrapper');
        const noteEl = wrapper ? wrapper.querySelector('.lesson-notes-preview') : null;
        
        if (noteEl) {
            const isExpanded = noteEl.classList.toggle('expanded');
            btn.textContent = isExpanded ? 'Show Less' : 'Read More';
        }
    };


    // Tab switching (Update to include Mastery)
    window.showTab = (targetId) => {
        console.log(`Switching to tab: ${targetId}`);
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(t => t.classList.remove('active'));
        
        const activeTab = document.querySelector(`.nav-links li[data-tab="${targetId}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        const view = document.getElementById(`${targetId}-view`);
        if (view) {
            view.classList.add('active');
            document.querySelector('.main-content').scrollTop = 0;
            console.log(`View ${targetId}-view is now active.`);
        } else {
            console.error(`View ${targetId}-view not found!`);
        }

        if (targetId === 'tracker') renderCurrentView();
        if (targetId === 'dashboard') updateDashboard();
        if (targetId === 'mastery') renderMastery();
        if (targetId === 'application') renderApplication();
        if (targetId === 'admin') renderAdminManageList();
    };

    // Dashboard Quick Filters
    document.getElementById('in-progress-card').onclick = () => {
        statusFilter.value = 'In Progress';
        showTab('tracker');
    };

    document.getElementById('active-webinar-card').onclick = () => {
        statusFilter.value = 'In Progress';
        showTab('tracker');
    };

    document.getElementById('webinar-progress-card').onclick = () => {
        statusFilter.value = 'Completed';
        showTab('tracker');
    };


    // Filtering
    if (searchFilter) searchFilter.addEventListener('input', renderTable);
    if (statusFilter) statusFilter.addEventListener('change', renderTable);

    function handleGlobalSearch(query) {
        showTab('search-results');
        const resultsContainer = document.getElementById('search-results-content');
        const statsEl = document.getElementById('search-stats');
        resultsContainer.innerHTML = '';

        let matches = [];

        // Search Webinars
        appData.forEach(wb => {
            const matchInTags = (wb.tags || []).some(t => t.toLowerCase().includes(query));
            if (wb.name.toLowerCase().includes(query) || (wb.notes && wb.notes.toLowerCase().includes(query)) || matchInTags) {
                matches.push({ ...wb, type: 'webinar' });
            }
        });

        // Search Mastery
        masteryData.forEach(mod => {
            mod.lessons.forEach(lesson => {
                const prog = masteryProgress[lesson.id] || {};
                const matchInTags = (prog.tags || []).some(t => t.toLowerCase().includes(query));
                if (lesson.name.toLowerCase().includes(query) || (prog.notes && prog.notes.toLowerCase().includes(query)) || matchInTags) {
                    matches.push({ ...lesson, type: 'mastery', status: prog.status || 'Not Started', rating: prog.rating || 0, tags: prog.tags || [] });
                }
            });
        });

        // Search Application
        appApplicationData.forEach(app => {
            const matchInTags = (app.tags || []).some(t => t.toLowerCase().includes(query));
            if (app.name.toLowerCase().includes(query) || (app.notes && app.notes.toLowerCase().includes(query)) || matchInTags) {
                matches.push({ ...app, type: 'application' });
            }
        });

        statsEl.textContent = `Found ${matches.length} matches across all categories.`;

        matches.forEach(item => {
            const card = document.createElement('div');
            card.className = 'webinar-card glass';

            let statusClass = 'status-not-started';
            if (item.status === 'In Progress') statusClass = 'status-in-progress';
            if (item.status === 'Completed') statusClass = 'status-completed';

            let typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
            let tagsHtml = (item.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join('');

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-month">${typeLabel}</span>
                    <span class="status-badge ${statusClass}">${item.status || 'Not Started'}</span>
                </div>
                <div class="card-title">${item.name}</div>
                <div class="tag-container">${tagsHtml}</div>
                <div class="card-rating">Comprehension: ${item.rating || 0}/5</div>
                <div class="card-footer">
                    <button class="btn-action" style="flex:1" onclick="openEditModal('${item.id}', '${item.type}')">View & Edit</button>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
    }

    // Update showTab to handle search-results and ensure global accessibility
    const originalShowTab = showTab;
    window.showTab = (targetId) => {
        if (targetId === 'search-results') {
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.nav-links li').forEach(t => t.classList.remove('active'));
            const searchView = document.getElementById('search-results-view');
            if (searchView) {
                searchView.classList.add('active');
                document.querySelector('.main-content').scrollTop = 0;
            }
            return;
        }
        originalShowTab(targetId);
    };

    // Initial Load
    showTab('dashboard');

    function updateProfileUI() {
        const initials = userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const avatarUrl = userProfile.avatarUrl;
        
        const avatarElements = [
            document.getElementById('display-avatar'),
            document.getElementById('profile-avatar-preview')
        ];

        avatarElements.forEach(el => {
            if (avatarUrl) {
                el.style.backgroundImage = `url(${avatarUrl})`;
                el.textContent = '';
            } else {
                el.style.backgroundImage = 'none';
                el.textContent = initials;
            }
        });

        document.getElementById('display-name').textContent = userProfile.name;
    }

    // Handle Profile Pic Upload
    document.getElementById('profile-pic-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                userProfile.avatarUrl = event.target.result;
                updateProfileUI();
            };
            reader.readAsDataURL(file);
        }
    });

    // Global modal click closer for profile
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeProfileModal();
    });

    // Clock Logic
    function updateClock() {
        const now = new Date();
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options);
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        
        const fullStr = `${dateStr} | ${timeStr}`;
        
        const clocks = ['dashboard-clock', 'tracker-clock'];
        clocks.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = fullStr;
        });
    }

    // Expose functions to window for onclick handlers
    window.openEditModal = openEditModal;
    window.saveChanges = saveChanges;
    window.closeModal = closeModal;
    window.openProfileModal = openProfileModal;
    window.closeProfileModal = closeProfileModal;
    window.saveProfile = saveProfile;
    window.exportProgress = exportProgress;
    window.importProgress = importProgress;
    window.renderAnalytics = renderAnalytics;
    window.updateDashboard = updateDashboard;
    window.renderHeatmap = renderHeatmap;
    window.renderComprehensionTrends = renderComprehensionTrends;
    window.logActivity = logActivity;
    window.showToast = showToast;
    window.toggleItemComplete = toggleItemComplete;

    // Admin view — defined here early so onclick="showAdminView()" always resolves,
    // even if later code throws. The full body is also set at line ~1465.
    window.showAdminView = () => {
        try {
            if (typeof closeProfileModal === 'function') closeProfileModal();
            showTab('admin');
            if (typeof loadAdminSettings === 'function') loadAdminSettings();
        } catch (e) {
            console.error('Error opening admin view:', e);
        }
    };


    // Server sync implementations
    // --- Bulk Edit System ---
    window.toggleBulkEdit = () => {
        isBulkEditMode = !isBulkEditMode;
        selectedItems.clear();
        
        const btn = document.getElementById('bulk-edit-btn');
        const toolbar = document.getElementById('bulk-actions-toolbar');
        
        if (isBulkEditMode) {
            btn.classList.add('active');
            toolbar.classList.remove('hide');
            document.body.classList.add('bulk-edit-mode');
        } else {
            btn.classList.remove('active');
            toolbar.classList.add('hide');
            document.body.classList.remove('bulk-edit-mode');
        }
        
        updateSelectionCount();
        renderCurrentView();
    };

    window.toggleSelectItem = (id) => {
        if (selectedItems.has(id)) selectedItems.delete(id);
        else selectedItems.add(id);
        updateSelectionCount();
    };

    window.toggleSelectAll = (e) => {
        const checked = e.target.checked;
        const checkboxes = trackerBody.querySelectorAll('.bulk-check');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            const id = cb.dataset.id;
            if (checked) selectedItems.add(id);
            else selectedItems.delete(id);
        });
        updateSelectionCount();
    };

    function updateSelectionCount() {
        const el = document.getElementById('selected-count');
        if (el) el.textContent = selectedItems.size;
        
        const selectAll = document.getElementById('select-all-bulk');
        if (selectAll) {
            const checkboxes = trackerBody.querySelectorAll('.bulk-check');
            if (checkboxes.length > 0) {
                selectAll.checked = Array.from(checkboxes).every(cb => cb.checked);
            }
        }
    }

    window.bulkUpdateStatus = (newStatus) => {
        if (selectedItems.size === 0) return;
        
        appData.forEach(wb => {
            if (selectedItems.has(wb.id)) {
                wb.status = newStatus;
                if (newStatus === 'Completed' && wb.rating === 0) wb.rating = 3; // Default rating if none
                logActivity(wb.id, 'webinar', newStatus === 'Completed' ? 'complete' : 'update');
            }
        });
        
        localStorage.setItem('mentfxData', JSON.stringify(appData));
        showToast(`Updated ${selectedItems.size} items to ${newStatus}`, 'success');
        
        toggleBulkEdit();
        updateDashboard();
        renderCurrentView();
        saveToServer();
    };

    window.bulkDelete = () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) return;
        
        appData = appData.filter(wb => !selectedItems.has(wb.id));
        localStorage.setItem('mentfxData', JSON.stringify(appData));
        
        showToast(`Deleted ${selectedItems.size} items`, 'success');
        
        toggleBulkEdit();
        updateDashboard();
        renderCurrentView();
        saveToServer();
    };

    async function loadFromServer() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;
        
        console.log("Local Server sync: Loading data...");
        try {
            const resp = await fetch('/api/load');
            if (!resp.ok) throw new Error('Failed to load from server');
            const data = await resp.json();
            
            if (data.webinars && data.webinars.length > 0) {
                appData = data.webinars;
                localStorage.setItem('mentfxData', JSON.stringify(appData));
            }
            if (data.mastery && Object.keys(data.mastery).length > 0) {
                masteryProgress = data.mastery;
                localStorage.setItem('mentfxMastery', JSON.stringify(masteryProgress));
            }
            if (data.profile && data.profile.name) {
                userProfile = data.profile;
                localStorage.setItem('mentfxProfile', JSON.stringify(userProfile));
                updateProfileUI();
            }
            if (data.application && data.application.length > 0) {
                appApplicationData = data.application;
                localStorage.setItem('mentfxApplication', JSON.stringify(appApplicationData));
            }
            
            // Refresh all views
            renderCurrentView();
            renderMastery();
            renderApplication();
            updateDashboard();
            console.log("Local Server sync: Success");
        } catch (e) {
            console.warn("Local Server sync failed (Is scratch/server.js running?):", e);
        }
    }

    async function saveToServer() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;
        
        const data = {
            webinars: appData,
            mastery: masteryProgress,
            profile: userProfile,
            application: appApplicationData
        };

        try {
            const resp = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!resp.ok) throw new Error('Save failed');
            console.log("Local Server sync: Data saved successfully");
            showToast('Progress synced to local server', 'success');
        } catch (e) {
            console.error("Local Server sync save failed:", e);
        }
    }

    // High Impact Helper Functions
    function updateStreak() {
        if (!activityLog || activityLog.length === 0) return;

        // Get unique dates from activityLog
        const dates = [...new Set(activityLog.map(log => log.date.split('T')[0]))].sort().reverse();
        if (dates.length === 0) return;

        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Check if current streak is alive
        if (dates[0] === today || dates[0] === yesterday) {
            currentStreak = 1;
            for (let i = 0; i < dates.length - 1; i++) {
                const d1 = new Date(dates[i]);
                const d2 = new Date(dates[i+1]);
                const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }

        // Calculate best streak
        tempStreak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const d1 = new Date(dates[i]);
            const d2 = new Date(dates[i+1]);
            const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                tempStreak++;
            } else {
                if (tempStreak > bestStreak) bestStreak = tempStreak;
                tempStreak = 1;
            }
        }
        if (tempStreak > bestStreak) bestStreak = tempStreak;

        // Update UI
        document.getElementById('streak-current').textContent = currentStreak;
        document.getElementById('streak-best').textContent = bestStreak;
        document.getElementById('streak-days').textContent = dates.length;

        const streakMsg = document.getElementById('streak-msg');
        if (currentStreak > 0) {
            streakMsg.textContent = currentStreak > 2 ? `You're on fire! Keep it up! 🔥` : `Great start! Keep going! 🚀`;
            document.querySelector('.streak-fire').style.opacity = '1';
        } else {
            streakMsg.textContent = `Start studying to build your streak!`;
            document.getElementById('streak-current').classList.add('cold');
        }
    }

    function renderNextUp() {
        const nextUpGrid = document.getElementById('next-up-grid');
        if (!nextUpGrid) return;
        nextUpGrid.innerHTML = '';

        // 1. Next Webinar
        const nextWebinar = appData.find(w => w.status === 'Not Started' || w.status === 'In Progress');
        
        // 2. Next Mastery Lesson
        let nextMastery = null;
        if (typeof masteryData !== 'undefined') {
            for (const mod of masteryData) {
                const unstarted = mod.lessons.find(l => {
                    const prog = masteryProgress[l.id];
                    return !prog || prog.status !== 'Completed';
                });
                if (unstarted) {
                    nextMastery = unstarted;
                    nextMastery.moduleTitle = mod.title;
                    break;
                }
            }
        }

        const items = [];
        if (nextWebinar) items.push({ ...nextWebinar, type: 'Webinar', sub: nextWebinar.monthGroup });
        if (nextMastery) items.push({ ...nextMastery, type: 'Mastery', sub: nextMastery.moduleTitle });

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'next-up-card glass';
            card.onclick = () => {
                if (item.type === 'Webinar') {
                    showTab('tracker');
                    searchFilter.value = item.name;
                    renderCurrentView();
                } else {
                    showTab('mastery');
                    // Scroll to lesson?
                }
            };

            card.innerHTML = `
                <div class="next-up-type">${item.type}</div>
                <div class="next-up-title">${item.name}</div>
                <div class="next-up-sub">${item.sub}</div>
                <div class="next-up-cta">Continue Watching →</div>
            `;
            nextUpGrid.appendChild(card);
        });
    }

    function toggleItemComplete(id, category, event) {
        if (event) event.stopPropagation(); // Prevent opening modal

        if (category === 'webinar') {
            const item = appData.find(w => w.id === id);
            if (!item) return;
            const newStatus = item.status === 'Completed' ? 'Not Started' : 'Completed';
            item.status = newStatus;
            
            if (newStatus === 'Completed') {
                if (event && event.target) {
                    const el = event.target.closest('.webinar-card') || event.target.closest('tr') || event.target;
                    el.classList.add('status-completed-pulse');
                    setTimeout(() => el.classList.remove('status-completed-pulse'), 1000);
                }
                logActivity(id, 'webinar', 'complete');
                showToast(`Webinar completed! 🎯`, 'success');
            } else {
                showToast(`Webinar status reset`, 'info');
            }
            localStorage.setItem('mentfxData', JSON.stringify(appData));
            renderCurrentView();
        } else if (category === 'application') {
            const item = appApplicationData.find(a => a.id === id);
            if (!item) return;
            const newStatus = item.status === 'Completed' ? 'Not Started' : 'Completed';
            item.status = newStatus;
            
            if (newStatus === 'Completed') {
                logActivity(id, 'application', 'complete');
                showToast(`Application item completed! 🎯`, 'success');
            } else {
                showToast(`Status reset`, 'info');
            }
            localStorage.setItem('mentfxApplication', JSON.stringify(appApplicationData));
            renderApplication();
        } else if (category === 'mastery') {
            const prog = masteryProgress[id] || { status: 'Not Started', rating: 0, notes: '', tags: [] };
            const isDone = prog.status === 'Completed';
            const newStatus = isDone ? 'Not Started' : 'Completed';
            
            masteryProgress[id] = { ...prog, status: newStatus };
            
            if (newStatus === 'Completed') {
                if (event && event.target) {
                    const el = event.target.closest('.mastery-module-card') || event.target;
                    el.classList.add('status-completed-pulse');
                    setTimeout(() => el.classList.remove('status-completed-pulse'), 1000);
                }
                logActivity(id, 'mastery', 'complete');
                showToast(`Lesson completed! 🎯`, 'success');
            } else {
                showToast(`Lesson status reset`, 'info');
            }
            localStorage.setItem('mentfxMastery', JSON.stringify(masteryProgress));
            renderMastery();
        }

        saveToServer();
        updateDashboard();
        updateStreak();
        if (typeof renderNextUp === 'function') renderNextUp();
    }

    // Admin Logic
    window.showAdminView = () => {
        console.log("Opening Admin View...");
        try {
            if (typeof closeProfileModal === 'function') closeProfileModal();
            showTab('admin');
            loadAdminSettings();
        } catch (e) {
            console.error("Error opening admin view:", e);
        }
    };

    // Tab Switching for Admin
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.adminTab;
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`admin-section-${target}`).classList.add('active');
        });
    });

    function loadAdminSettings() {
        const token = localStorage.getItem('mentfx_github_token');
        if (token) {
            document.getElementById('admin-github-token').value = token;
            document.getElementById('admin-remember-token').checked = true;
        }
    }

    window.resetAdminForm = () => {
        document.getElementById('admin-item-name').value = '';
        document.getElementById('admin-item-link').value = '';
        document.getElementById('admin-item-group').value = '';
    };

    async function handleAdminPush() {
        const category = document.getElementById('admin-item-category').value;
        const name = document.getElementById('admin-item-name').value.trim();
        const link = document.getElementById('admin-item-link').value.trim();
        const group = document.getElementById('admin-item-group').value.trim();
        const token = document.getElementById('admin-github-token').value.trim();
        const owner = document.getElementById('admin-repo-owner').value.trim();
        const repo = document.getElementById('admin-repo-name').value.trim();
        const remember = document.getElementById('admin-remember-token').checked;
        const localOnly = document.getElementById('admin-local-only').checked;

        if (!localOnly && (!name || !link || !group || !token)) {
            showToast('Please fill in all fields and provide your GitHub token.', 'error');
            return;
        }
        
        if (localOnly && (!name || !link || !group)) {
            showToast('Please fill in the Item Name, Link, and Group fields.', 'error');
            return;
        }

        if (!localOnly) {
            if (remember) localStorage.setItem('mentfx_github_token', token);
            else localStorage.removeItem('mentfx_github_token');
        }

        const btn = document.getElementById('btn-push-update');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = localOnly ? 'Saving...' : 'Syncing...';

        if (localOnly) {
            try {
                const newItem = { id: Date.now().toString(), name, link, group, status: 'Not Started', rating: 0, notes: '', tags: [] };
                
                if (category === 'webinar') {
                    if (typeof webinarData !== 'undefined') webinarData.unshift(newItem);
                    appData.unshift(newItem);
                    localStorage.setItem('mentfxData', JSON.stringify(appData));
                } else if (category === 'mastery') {
                    if (typeof masteryData !== 'undefined') masteryData.unshift(newItem); 
                    localStorage.setItem('mentfxMasteryData', JSON.stringify(masteryData));
                } else {
                    if (typeof applicationData !== 'undefined') applicationData.unshift(newItem);
                    appApplicationData.unshift(newItem);
                    localStorage.setItem('mentfxApplication', JSON.stringify(appApplicationData));
                }

                showToast('Saved successfully to local storage.', 'success');
                resetAdminForm();
                renderAdminManageList();
                if (typeof saveToServer === 'function') saveToServer(); 
                return;
            } catch (localErr) {
                showToast('Error saving locally: ' + localErr.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            return;
        }

        try {
            // Determine which file to update
            let filePath = 'data.js';
            let arrayName = 'webinarData';
            if (category === 'mastery') {
                filePath = 'masteryData.js';
                arrayName = 'masteryData';
            } else if (category === 'application') {
                filePath = 'applicationData.js';
                arrayName = 'applicationData';
            }

            // 1. Get current file content & SHA
            const getResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
                headers: { 'Authorization': `token ${token}` }
            });

            if (!getResp.ok) throw new Error(`Failed to fetch ${filePath} from GitHub`);
            const fileData = await getResp.json();
            const currentContent = atob(fileData.content);
            const sha = fileData.sha;

            // 2. Parse and update
            const regex = new RegExp(`const ${arrayName} = ([\\s\\S]*?);`);
            const arrayMatch = currentContent.match(regex);
            if (!arrayMatch) throw new Error(`Could not parse ${filePath} structure`);
            let dataArray;
            try {
                dataArray = Function('"use strict"; return ' + arrayMatch[1])();
            } catch (parseErr) {
                throw new Error('Could not evaluate ' + filePath + ': ' + parseErr.message);
            }
            
            const itemId = name.toLowerCase().replace(/\s+/g, '-');
            let newItem = {
                id: itemId,
                name: name,
                link: link
            };

            if (category === 'webinar') {
                newItem.monthGroup = group;
                // Merge with existing properties if any
                const existing = dataArray.find(item => item.id === itemId);
                if (existing) {
                    newItem = { ...existing, ...newItem };
                } else {
                    newItem.status = "Not Started";
                    newItem.notes = "";
                    newItem.rating = 0;
                }
                
                const existingIndex = dataArray.findIndex(item => item.id === itemId);
                if (existingIndex > -1) dataArray[existingIndex] = newItem;
                else dataArray.push(newItem);
            } else if (category === 'mastery') {
                const modNum = parseInt(group) || 0;
                let mod = dataArray.find(m => m.module === modNum);
                if (!mod) {
                    mod = { module: modNum, title: `Module ${modNum}`, lessons: [] };
                    dataArray.push(mod);
                    // Sort modules by number
                    dataArray.sort((a, b) => a.module - b.module);
                }
                
                const lessonItem = { id: itemId, name: name, link: link };
                const lIdx = mod.lessons.findIndex(l => l.id === itemId);
                if (lIdx > -1) mod.lessons[lIdx] = lessonItem;
                else mod.lessons.push(lessonItem);
            } else if (category === 'application') {
                newItem.category = group;
                // Merge with existing
                const existing = dataArray.find(item => item.id === itemId);
                if (existing) {
                    newItem = { ...existing, ...newItem };
                } else {
                    newItem.status = "Not Started";
                    newItem.notes = "";
                    newItem.rating = 0;
                }
                
                const existingIndex = dataArray.findIndex(item => item.id === itemId);
                if (existingIndex > -1) dataArray[existingIndex] = newItem;
                else dataArray.push(newItem);
            }

            const newContent = `const ${arrayName} = ${JSON.stringify(dataArray, null, 4)};\n`;

            // 3. Push back to GitHub
            const putResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Admin: Update ${name} in ${category} list`,
                    content: btoa(unescape(encodeURIComponent(newContent))),
                    sha: sha,
                    branch: 'main'
                })
            });

            if (!putResp.ok) {
                const error = await putResp.json();
                throw new Error(error.message || 'Failed to update GitHub');
            }

            // 4. Update Local State Immediately
            updateLocalState(category, newItem);

            // 5. Sync with Local Server (if running locally)
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                try {
                    await fetch('/api/admin/save-file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileName: filePath, content: newContent })
                    });
                    console.log(`Local ${filePath} updated.`);
                } catch (e) {
                    console.warn("Failed to sync with local server:", e);
                }
            }

            showToast(`Successfully synced ${name}!`, 'success');
            resetAdminForm();
            
        } catch (err) {
            console.error(err);
            showToast('Sync Error: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    function updateLocalState(category, item) {
        if (category === 'webinar') {
            const idx = appData.findIndex(w => w.id === item.id);
            if (idx > -1) appData[idx] = { ...appData[idx], ...item };
            else appData.push(item);
            localStorage.setItem('mentfxData', JSON.stringify(appData));
        } else if (category === 'mastery') {
            if (typeof masteryData !== 'undefined') {
                const modNum = parseInt(item.module) || 0;
                let mod = masteryData.find(m => m.module === modNum);
                if (mod) {
                    const lIdx = mod.lessons.findIndex(l => l.id === item.id);
                    if (lIdx > -1) mod.lessons[lIdx] = { ...mod.lessons[lIdx], ...item };
                    else mod.lessons.push(item);
                } else {
                    // New module
                    masteryData.push({ module: modNum, title: `Module ${modNum}`, lessons: [item] });
                    masteryData.sort((a, b) => a.module - b.module);
                }
            }
        } else if (category === 'application') {
            const idx = appApplicationData.findIndex(a => a.id === item.id);
            if (idx > -1) appApplicationData[idx] = { ...appApplicationData[idx], ...item };
            else appApplicationData.push(item);
            localStorage.setItem('mentfxApplication', JSON.stringify(appApplicationData));
        }
        
        // Refresh UI
        updateDashboard();
        if (category === 'webinar') renderCurrentView();
        if (category === 'mastery') renderMastery();
        if (category === 'application') renderApplication();
        
        // Also save to local server if possible
        saveToServer();
    }

    window.renderAdminManageList = () => {
        const list = document.getElementById('admin-manage-list');
        list.innerHTML = '';
        
        let allItems = [
            ...appData.map(i => ({ ...i, type: 'webinar' })),
            ...appApplicationData.map(i => ({ ...i, type: 'application' }))
        ];

        // Add Mastery lessons to the management list
        if (typeof masteryData !== 'undefined') {
            masteryData.forEach(mod => {
                mod.lessons.forEach(l => {
                    allItems.push({ ...l, type: 'mastery', moduleNum: mod.module, moduleTitle: mod.title });
                });
            });
        }

        // Search/Filter
        const query = document.getElementById('admin-manage-search').value.toLowerCase();
        const filtered = allItems.filter(i => 
            i.name.toLowerCase().includes(query) || 
            (i.id && i.id.toLowerCase().includes(query)) ||
            (i.monthGroup && i.monthGroup.toLowerCase().includes(query)) ||
            (i.category && i.category.toLowerCase().includes(query))
        );

        filtered.forEach(item => {
            const el = document.createElement('div');
            el.className = 'admin-item';
            
            let subtitle = '';
            if (item.type === 'webinar') subtitle = item.monthGroup || 'No Group';
            else if (item.type === 'application') subtitle = item.category || 'No Category';
            else if (item.type === 'mastery') subtitle = `Module ${item.moduleNum}: ${item.moduleTitle}`;

            el.innerHTML = `
                <div class="admin-item-info">
                    <span class="admin-badge badge-${item.type}">${item.type}</span>
                    <h4>${item.name}</h4>
                    <p>${subtitle}</p>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon" onclick="editAdminItem('${item.id}', '${item.type}')" title="Edit">
                        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="1.1em" width="1.1em" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon delete" onclick="deleteAdminItem('${item.id}', '${item.type}')" title="Delete">
                        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="1.1em" width="1.1em" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            `;
            list.appendChild(el);
        });
    };

    window.editAdminItem = (id, type) => {
        let item;
        let groupVal = '';
        if (type === 'webinar') {
            item = appData.find(w => w.id === id);
            groupVal = item ? item.monthGroup : '';
        } else if (type === 'application') {
            item = appApplicationData.find(a => a.id === id);
            groupVal = item ? item.category : '';
        } else if (type === 'mastery') {
            masteryData.forEach(mod => {
                const l = mod.lessons.find(ls => ls.id === id);
                if (l) {
                    item = l;
                    groupVal = mod.module;
                }
            });
        }
        
        if (item) {
            document.getElementById('admin-item-category').value = type;
            document.getElementById('admin-item-name').value = item.name;
            document.getElementById('admin-item-link').value = item.link;
            document.getElementById('admin-item-group').value = groupVal;
            
            // Switch to Add tab
            document.querySelector('[data-admin-tab="add"]').click();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    window.deleteAdminItem = async (id, type) => {
        if (!confirm(`Are you sure you want to delete this ${type}? This will sync to GitHub.`)) return;
        
        const token = document.getElementById('admin-github-token').value.trim();
        const owner = document.getElementById('admin-repo-owner').value.trim();
        const repo = document.getElementById('admin-repo-name').value.trim();
        
        if (!token) {
            showToast('Please provide your GitHub token in Settings to delete from the cloud.', 'error');
            return;
        }

        try {
            // Determine which file to update
            let filePath = 'data.js';
            let arrayName = 'webinarData';
            if (type === 'mastery') {
                filePath = 'masteryData.js';
                arrayName = 'masteryData';
            } else if (type === 'application') {
                filePath = 'applicationData.js';
                arrayName = 'applicationData';
            }

            // 1. Get current file content & SHA from GitHub
            const getResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
                headers: { 'Authorization': `token ${token}` }
            });

            if (!getResp.ok) throw new Error(`Failed to fetch ${filePath} from GitHub`);
            const fileData = await getResp.json();
            const currentContent = atob(fileData.content);
            const sha = fileData.sha;

            // 2. Parse and update
            const regex = new RegExp(`const ${arrayName} = ([\\s\\S]*?);`);
            const arrayMatch = currentContent.match(regex);
            if (!arrayMatch) throw new Error(`Could not parse ${filePath} structure`);
            let dataArray;
            try {
                dataArray = Function('"use strict"; return ' + arrayMatch[1])();
            } catch (parseErr) {
                throw new Error('Could not evaluate ' + filePath + ': ' + parseErr.message);
            }
            
            // Delete logic
            if (type === 'mastery') {
                dataArray.forEach(mod => {
                    mod.lessons = mod.lessons.filter(l => l.id !== id);
                });
            } else {
                dataArray = dataArray.filter(item => item.id !== id);
            }

            const newContent = `const ${arrayName} = ${JSON.stringify(dataArray, null, 4)};\n`;

            // 3. Push back to GitHub
            const putResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Admin: Delete ${id} from ${type} list`,
                    content: btoa(unescape(encodeURIComponent(newContent))),
                    sha: sha,
                    branch: 'main'
                })
            });

            if (!putResp.ok) {
                const error = await putResp.json();
                throw new Error(error.message || 'Failed to update GitHub');
            }

            // 4. Update Local State
            if (type === 'webinar') {
                appData = appData.filter(w => w.id !== id);
                localStorage.setItem('mentfxData', JSON.stringify(appData));
            } else if (type === 'mastery') {
                if (typeof masteryData !== 'undefined') {
                    masteryData.forEach(mod => {
                        mod.lessons = mod.lessons.filter(l => l.id !== id);
                    });
                }
                delete masteryProgress[id];
                localStorage.setItem('mentfxMastery', JSON.stringify(masteryProgress));
            } else if (type === 'application') {
                appApplicationData = appApplicationData.filter(a => a.id !== id);
                localStorage.setItem('mentfxApplication', JSON.stringify(appApplicationData));
            }

            // 5. Sync with Local Server
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                try {
                    await fetch('/api/admin/save-file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileName: filePath, content: newContent })
                    });
                } catch (e) {
                    console.warn("Failed to sync with local server:", e);
                }
                saveToServer();
            }

            showToast(`Successfully deleted ${id}!`, 'success');
            renderAdminManageList();
            updateDashboard();
            renderCurrentView();
            renderMastery();
            renderApplication();

        } catch (err) {
            console.error(err);
            showToast('Error deleting item: ' + err.message, 'error');
        }
    };

    document.getElementById('admin-manage-search').addEventListener('input', renderAdminManageList);

    window.handleAdminPush = handleAdminPush;


    // 5. Smart Admin Labels
    const adminCategorySelect = document.getElementById('admin-item-category');
    if (adminCategorySelect) {
        adminCategorySelect.addEventListener('change', (e) => {
            const cat = e.target.value;
            const nameLbl = document.getElementById('admin-label-name');
            const groupLbl = document.getElementById('admin-label-group');
            const nameInp = document.getElementById('admin-item-name');
            const groupInp = document.getElementById('admin-item-group');

            if (cat === 'webinar') {
                nameLbl.textContent = 'Webinar Name';
                groupLbl.textContent = 'Month Group';
                nameInp.placeholder = 'e.g. Webinar 259';
                groupInp.placeholder = 'e.g. June 2026';
            } else if (cat === 'mastery') {
                nameLbl.textContent = 'Lesson Name';
                groupLbl.textContent = 'Module Number';
                nameInp.placeholder = 'e.g. Psychology of Trading';
                groupInp.placeholder = 'e.g. 5';
            } else {
                nameLbl.textContent = 'Application Name';
                groupLbl.textContent = 'Category';
                nameInp.placeholder = 'e.g. Psychology Notion';
                groupInp.placeholder = 'e.g. Psychology';
            }
        });
    }

    // 6. Mobile Sidebar Toggle
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (hamburgerBtn && sidebar && overlay) {
        const toggleSidebar = () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        };

        hamburgerBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);

        // Close when clicking nav links on mobile
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.addEventListener('click', () => {
                if (window.innerWidth <= 1024) toggleSidebar();
            });
        });
    }

    updateClock();
    setInterval(updateClock, 1000);

    // Initializations for new features
    updateStreak();
    renderNextUp();

    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            renderCurrentView();
        });
    }

    // Tag Click Filtering Logic
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-badge')) {
            const tagName = e.target.textContent.replace('#', '').trim();
            // If it's a global search tag, just update global search
            if (e.target.closest('#search-results-view')) {
                document.getElementById('global-search').value = tagName;
                handleGlobalSearch(tagName);
                return;
            }
            
            // Otherwise, filter the active view
            const activeView = document.querySelector('.view.active');
            if (activeView.id === 'tracker-view') {
                searchFilter.value = tagName;
                renderCurrentView();
            } else if (activeView.id === 'dashboard-view') {
                document.getElementById('global-search').value = tagName;
                handleGlobalSearch(tagName);
            } else {
                // For other views, we use global search as a fallback for specific tag filtering
                document.getElementById('global-search').value = tagName;
                handleGlobalSearch(tagName);
            }
        }
    });
});
