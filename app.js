document.addEventListener('DOMContentLoaded', () => {
    // 0. Register Chart.js Plugin for Center Text
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

    // Initial Render & Sync
    try {
        loadFromServer();
    } catch (e) {
        console.error("loadFromServer failed:", e);
    }
    
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
        trackerBody.innerHTML = '';
        
        appData.forEach((wb, index) => {
            const matchInTags = (wb.tags || []).some(t => t.toLowerCase().includes(term));
            if (stat !== 'All' && wb.status !== stat) return;
            if (term && !wb.name.toLowerCase().includes(term) && (!wb.notes || !wb.notes.toLowerCase().includes(term)) && !matchInTags) return;

            const row = document.createElement('tr');
            let statusClass = 'status-not-started';
            if (wb.status === 'In Progress') statusClass = 'status-in-progress';
            if (wb.status === 'Completed') statusClass = 'status-completed';

            let linkHtml = wb.link ? `<a href="${wb.link}" target="_blank" class="link-btn">Watch</a>` : '<span style="color:#64748b">No Link</span>';
            let tagsHtml = (wb.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join('');

            row.innerHTML = `
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

    function renderGrid() {
        const container = document.getElementById('grid-container');
        const term = searchFilter.value.toLowerCase();
        const stat = statusFilter.value;
        container.innerHTML = '';

        appData.forEach((wb, index) => {
            const matchInTags = (wb.tags || []).some(t => t.toLowerCase().includes(term));
            if (stat !== 'All' && wb.status !== stat) return;
            if (term && !wb.name.toLowerCase().includes(term) && (!wb.notes || !wb.notes.toLowerCase().includes(term)) && !matchInTags) return;

            const card = document.createElement('div');
            card.className = 'webinar-card glass';

            let statusClass = 'status-not-started';
            if (wb.status === 'In Progress') statusClass = 'status-in-progress';
            if (wb.status === 'Completed') statusClass = 'status-completed';

            let linkHtml = wb.link ? `<a href="${wb.link}" target="_blank" class="btn-action">Watch</a>` : '';
            let tagsHtml = (wb.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join('');

            let notesHtml = '';
            if (wb.notes) {
                notesHtml = `<div class="lesson-notes-preview" style="margin-top:0.5rem; opacity:0.7">${wb.notes}</div>`;
            }

            card.innerHTML = `
                <div class="card-header">
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
                    alert('Error: Could not find webinar id: ' + id);
                    return;
                }
                dataObj = appData[editingIndex];
            } else if (type === 'application') {
                editingIndex = appApplicationData.findIndex(a => a.id === id);
                if (editingIndex === -1) {
                    alert('Error: Could not find application item id: ' + id);
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
            alert('Critical Error in openEditModal: ' + e.message);
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

                alert('Import successful! The page will now reload.');
                window.location.reload();
            } catch (err) {
                alert('Error importing data: ' + err.message);
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
        if (overallProgEl) overallProgEl.textContent = `${pct}%`;
        
        const progFillEl = document.getElementById('progress-fill');
        if (progFillEl) progFillEl.style.width = `${pct}%`;

        const watchedCountEl = document.getElementById('watched-count');
        if (watchedCountEl) watchedCountEl.textContent = `${completed} / ${total} Watched`;

        const inProgressEl = document.getElementById('in-progress-count');
        if (inProgressEl) inProgressEl.textContent = inProgress;

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
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        
        // Start from Sunday of the week 1 year ago
        const start = new Date(oneYearAgo);
        start.setDate(start.getDate() - start.getDay());

        // Create 371 boxes (53 weeks * 7 days)
        for (let i = 0; i < 371; i++) {
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

    function renderComprehensionTrends() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        // Group by date and calculate average rating
        const trendData = {};
        activityLog.forEach(log => {
            if (!trendData[log.date]) trendData[log.date] = { sum: 0, count: 0 };
            trendData[log.date].sum += log.rating || 0;
            trendData[log.date].count++;
        });

        const sortedDates = Object.keys(trendData).sort();
        // Limit to last 30 entries for readability
        const recentDates = sortedDates.slice(-30);
        
        const labels = recentDates.map(d => d.split('-').slice(1).join('/')); // MM/DD
        const data = recentDates.map(d => (trendData[d].sum / trendData[d].count).toFixed(1));

        if (trendChart) trendChart.destroy();

        trendChart = new Chart(ctx, {
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
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
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
                        ticks: { color: 'rgba(255,255,255,0.5)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 7 }
                    }
                }
            }
        });
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
            
            let modCompleted = 0;
            const lessonsHtml = mod.lessons.map(lesson => {
                const prog = masteryProgress[lesson.id] || { status: 'Not Started' };
                const isDone = prog === true || prog.status === 'Completed';
                const isInProgress = prog.status === 'In Progress';
                
                if (isDone) modCompleted++;

                let statusClass = '';
                if (isDone) statusClass = 'completed';
                else if (isInProgress) statusClass = 'in-progress';

                let icon = '';
                if (isDone) icon = '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 20 20" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
                else if (isInProgress) icon = '<div style="width:8px; height:8px; background:var(--primary); border-radius:50%"></div>';

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
                                <div class="lesson-check">
                                    ${icon}
                                </div>
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
            }).join('');

            card.innerHTML = `
                <div class="module-card-header" onclick="toggleModule(${mod.module})">
                    <div style="display:flex; flex-direction:column; gap:0.25rem;">
                        <span class="module-progress-chip">${modCompleted}/${mod.lessons.length} Done</span>
                        <h3>Module ${mod.module}: ${mod.title}</h3>
                    </div>
                    <svg class="collapse-chevron" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="lesson-list">
                    ${lessonsHtml}
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
                            <div class="lesson-status-badge ${isDone ? 'completed' : (isInProgress ? 'in-progress' : '')}">
                                ${icon}
                            </div>
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
    function showTab(targetId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(t => t.classList.remove('active'));
        
        const activeTab = document.querySelector(`.nav-links li[data-tab="${targetId}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        const view = document.getElementById(`${targetId}-view`);
        if (view) {
            view.classList.add('active');
            // Scroll to top of main content
            document.querySelector('.main-content').scrollTop = 0;
        }

        if (targetId === 'tracker') renderCurrentView();
        if (targetId === 'dashboard') updateDashboard();
        if (targetId === 'mastery') renderMastery();
        if (targetId === 'application') renderApplication();
    }

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

    // Stubs for server sync (to be implemented if backend is added)
    function loadFromServer() { console.log("Cloud sync: Loading data..."); }
    function saveToServer() { console.log("Cloud sync: Saving data..."); }

    updateClock();

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
