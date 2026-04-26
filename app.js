document.addEventListener('DOMContentLoaded', () => {
    // 0. Register Chart.js Plugin for Center Text
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

    // 1. Initialize Data
    let appData = [];
    try {
        const stored = localStorage.getItem('mentfxData');
        if (stored) {
            appData = JSON.parse(stored);
            
            // Patch: Correct Webinar 99 date if it was previously saved as May
            const wb99 = appData.find(w => w.id === 'Webinar 99');
            if (wb99 && wb99.monthGroup === 'May 2023') {
                wb99.monthGroup = 'April 2023';
                localStorage.setItem('mentfxData', JSON.stringify(appData));
            }

            // Recover from the previous bug that might have saved an empty array
            if (appData.length === 0 && typeof webinarData !== 'undefined') {
                appData = webinarData;
                localStorage.setItem('mentfxData', JSON.stringify(appData));
            }
        } else {
            appData = typeof webinarData !== 'undefined' ? webinarData : [];
            localStorage.setItem('mentfxData', JSON.stringify(appData));
        }
    } catch (e) {
        console.log("Local storage not accessible, running in memory-only mode.");
        appData = typeof webinarData !== 'undefined' ? webinarData : [];
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
    let currentMasteryViewMode = 'grid';

    const storedMastery = localStorage.getItem('mentfxMastery');
    if (storedMastery) {
        masteryProgress = JSON.parse(storedMastery);
    }

    // Elements
    const trackerBody = document.getElementById('tracker-body');
    const searchFilter = document.getElementById('search-filter');
    const statusFilter = document.getElementById('status-filter');
    const modal = document.getElementById('edit-modal');
    
    // Navigation is handled by showTab() at the bottom of the script

    // View Toggling within Tracker
    let currentViewMode = 'list';
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tracker-mode').forEach(m => m.classList.remove('active'));
            
            btn.classList.add('active');
            currentViewMode = btn.dataset.mode;
            document.getElementById(`${currentViewMode}-mode`).classList.add('active');
            
            renderCurrentView();
        });
    });

    function renderCurrentView() {
        if (currentViewMode === 'list') renderTable();
        if (currentViewMode === 'grid') renderGrid();
        if (currentViewMode === 'calendar') renderCalendar();
    }

    // Filtering
    searchFilter.addEventListener('input', renderTable);
    statusFilter.addEventListener('change', renderTable);

    let chartInstance = null;
    let pieChartInstance = null;
    let sidebarPieChartInstance = null;

    // ---- Server Sync Logic ---- //
    async function loadFromServer() {
        try {
            const res = await fetch('/api/load');
            const data = await res.json();
            
            if (data.webinars && data.webinars.length > 0) {
                appData = data.webinars;
                localStorage.setItem('mentfxData', JSON.stringify(appData));
            }
            if (data.mastery) {
                masteryProgress = data.mastery;
                localStorage.setItem('mentfxMastery', JSON.stringify(masteryProgress));
            }
            if (data.profile && data.profile.name) {
                userProfile = data.profile;
                localStorage.setItem('mentfxProfile', JSON.stringify(userProfile));
                updateProfileUI();
            }
            
            renderCurrentView();
            updateDashboard();
            renderMastery(); // Ensure mastery view is updated if active
        } catch (e) {
            console.log("Could not load from server, using local data.");
        }
    }

    async function saveToServer() {
        try {
            const data = {
                webinars: appData,
                mastery: masteryProgress,
                profile: userProfile
            };
            await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.log("Could not save to server.");
        }
    }

    // Initial Render & Sync
    loadFromServer(); // This will fetch from server and then update UI
    renderCurrentView();
    updateDashboard();

    // ---- Functions ---- //

    function renderTable() {
        const term = searchFilter.value.toLowerCase();
        const stat = statusFilter.value;
        trackerBody.innerHTML = '';
        
        appData.forEach((wb, index) => {
            if (stat !== 'All' && wb.status !== stat) return;
            if (term && !wb.name.toLowerCase().includes(term) && !wb.notes.toLowerCase().includes(term)) return;

            const row = document.createElement('tr');
            let statusClass = 'status-not-started';
            if (wb.status === 'In Progress') statusClass = 'status-in-progress';
            if (wb.status === 'Completed') statusClass = 'status-completed';

            let linkHtml = wb.link ? `<a href="${wb.link}" target="_blank" class="link-btn">Watch</a>` : '<span style="color:#64748b">No Link</span>';

            row.innerHTML = `
                <td style="font-weight: 500;">${wb.name}</td>
                <td style="color: var(--text-muted);">${wb.monthGroup || 'Unknown'}</td>
                <td><span class="status-badge ${statusClass}">${wb.status}</span></td>
                <td><div style="display:flex; align-items:center; gap:5px;"><span style="color:var(--accent); font-weight:700">${wb.rating || 0}</span>/5</div></td>
                <td>${linkHtml}</td>
                <td><button class="btn-action" onclick="openEditModal('${wb.id}', ${index})">Update</button></td>
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
            if (stat !== 'All' && wb.status !== stat) return;
            if (term && !wb.name.toLowerCase().includes(term) && !wb.notes.toLowerCase().includes(term)) return;

            const card = document.createElement('div');
            card.className = 'webinar-card glass';

            let statusClass = 'status-not-started';
            if (wb.status === 'In Progress') statusClass = 'status-in-progress';
            if (wb.status === 'Completed') statusClass = 'status-completed';

            let linkHtml = wb.link ? `<a href="${wb.link}" target="_blank" class="btn-action">Watch</a>` : '';

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
                ${notesHtml}
                <div class="card-rating">Comprehension: ${wb.rating || 0}/5</div>
                <div class="card-footer">
                    ${linkHtml}
                    <button class="btn-action" style="flex:1" onclick="openEditModal('${wb.id}', ${index})">Edit & Notes</button>
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
            if (stat !== 'All' && wb.status !== stat) return;
            if (term && !wb.name.toLowerCase().includes(term) && !wb.notes.toLowerCase().includes(term)) return;
            
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

        if (currentEditType === 'webinar') {
            if (editingIndex === null) return;
            appData[editingIndex].status = status;
            appData[editingIndex].rating = rating;
            appData[editingIndex].notes = notes;
            
            localStorage.setItem('mentfxData', JSON.stringify(appData));
            renderCurrentView();
        } else {
            // Mastery
            masteryProgress[currentEditId] = {
                status: status,
                rating: rating,
                notes: notes
            };
            localStorage.setItem('mentfxMastery', JSON.stringify(masteryProgress));
            renderMastery();
        }
        
        closeModal();
        updateDashboard();
        saveToServer(); // Background sync
    };

    function saveWebinarLocally() {
        closeModal();
        renderCurrentView();
        updateDashboard();
        try {
            localStorage.setItem('mentfxData', JSON.stringify(appData));
        } catch (e) {}
    }

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
        
        const inProgressCountEl = document.getElementById('in-progress-count');
        if (inProgressCountEl) inProgressCountEl.textContent = inProgress;

        // Active Webinar Display
        const activeWebinarTitleEl = document.getElementById('active-webinar-title');
        const activeWebinarMonthEl = document.getElementById('active-webinar-month');
        
        // Find the first "In Progress" webinar
        const activeWb = appData.find(d => d.status === 'In Progress');
        if (activeWb) {
            if (activeWebinarTitleEl) activeWebinarTitleEl.textContent = activeWb.name;
            if (activeWebinarMonthEl) activeWebinarMonthEl.textContent = `From ${activeWb.monthGroup}`;
        } else {
            if (activeWebinarTitleEl) activeWebinarTitleEl.textContent = "No Active Webinar";
            if (activeWebinarMonthEl) activeWebinarMonthEl.textContent = "Start a new one below";
        }

        // 2. Mastery Course Stats
        let totalLessons = 0;
        let completedLessons = 0;
        let activeModule = null;
        let firstIncompleteModuleFound = false;

        masteryData.forEach(mod => {
            let modLessonsCount = mod.lessons.length;
            let modCompletedCount = 0;
            
            mod.lessons.forEach(lesson => {
                totalLessons++;
                const prog = masteryProgress[lesson.id];
                const isCompleted = prog && (prog === true || prog.status === 'Completed');
                
                if (isCompleted) {
                    completedLessons++;
                    modCompletedCount++;
                }
            });

            if (!firstIncompleteModuleFound && modCompletedCount < modLessonsCount) {
                activeModule = mod;
                firstIncompleteModuleFound = true;
            }
        });

        const masteryPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const masteryProgPctEl = document.getElementById('mastery-progress-pct');
        if (masteryProgPctEl) masteryProgPctEl.textContent = `${masteryPct}%`;
        
        const masteryProgFillEl = document.getElementById('mastery-progress-fill');
        if (masteryProgFillEl) masteryProgFillEl.style.width = `${masteryPct}%`;
        
        const masteryWatchedCountEl = document.getElementById('mastery-watched-count');
        if (masteryWatchedCountEl) masteryWatchedCountEl.textContent = `${completedLessons} / ${totalLessons} Lessons`;

        const activeTitleEl = document.getElementById('active-module-title');
        const activeProgEl = document.getElementById('active-module-progress');
        if (activeModule) {
            if (activeTitleEl) activeTitleEl.textContent = `Module ${activeModule.module}: ${activeModule.title}`;
            let modDone = activeModule.lessons.filter(l => {
                const p = masteryProgress[l.id];
                return p && (p === true || p.status === 'Completed');
            }).length;
            if (activeProgEl) activeProgEl.textContent = `${modDone} / ${activeModule.lessons.length} Lessons done`;
        } else if (totalLessons > 0 && completedLessons === totalLessons) {
            if (activeTitleEl) activeTitleEl.textContent = "All Modules Completed!";
            if (activeProgEl) activeProgEl.textContent = "Mastery Achieved";
        }

        const statusLabel = document.getElementById('course-status-label');
        if (statusLabel) {
            if (masteryPct === 0) statusLabel.textContent = "New Student";
            else if (masteryPct < 25) statusLabel.textContent = "Foundations";
            else if (masteryPct < 50) statusLabel.textContent = "Intermediate";
            else if (masteryPct < 75) statusLabel.textContent = "Advanced";
            else if (masteryPct < 100) statusLabel.textContent = "Almost Master";
            else statusLabel.textContent = "Mentfx Master";
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

        // Chart mapping
        const monthCounts = {};
        appData.forEach(wb => {
            if (wb.status === 'Completed' && wb.monthGroup) {
                monthCounts[wb.monthGroup] = (monthCounts[wb.monthGroup] || 0) + 1;
            }
        });

        const labels = Object.keys(monthCounts);
        const data = Object.values(monthCounts);

        const ctx = document.getElementById('monthlyChart').getContext('2d');
        
        if (chartInstance) chartInstance.destroy();

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
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });

        // Status Pie Chart
        const notStarted = total - completed - inProgress;
        const pieCtx = document.getElementById('statusPieChart').getContext('2d');
        if (pieChartInstance) pieChartInstance.destroy();
        
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
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { color: '#94a3b8', padding: 20, font: { family: 'Inter' } }
                    }
                },
                cutout: '70%',
                elements: {
                    center: {
                        text: `${pct}%`,
                        color: '#10b981',
                        fontStyle: 'Inter',
                        sidePadding: 20,
                        minFontSize: 12,
                        maxFontSize: 24
                    }
                }
            }
        });

        // Sidebar Combined Pie Chart (Mastery + Webinars)
        const totalCombined = total + totalLessons;
        const completedCombined = completed + completedLessons;
        
        // Calculate combined In Progress (approximate for Mastery as we treat status as binary or object)
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

        const sidebarCtx = document.getElementById('sidebarPieChart').getContext('2d');
        if (sidebarPieChartInstance) sidebarPieChartInstance.destroy();
        
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
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                cutout: '75%',
                elements: {
                    center: {
                        text: `${combinedPct}%`,
                        color: '#fff',
                        fontStyle: 'Inter',
                        sidePadding: 15,
                        maxFontSize: 16
                    }
                }
            }
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

    // Mastery View Switching
    document.querySelectorAll('.mastery-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMasteryViewMode = btn.dataset.modemastery;
            document.querySelectorAll('.mastery-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMastery();
        });
    });

    // Tab switching (Update to include Mastery)
    function showTab(targetId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(t => t.classList.remove('active'));
        
        const activeTab = document.querySelector(`.nav-links li[data-tab="${targetId}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        const view = document.getElementById(`${targetId}-view`);
        if (view) view.classList.add('active');

        if (targetId === 'tracker') renderCurrentView();
        if (targetId === 'dashboard') updateDashboard();
        if (targetId === 'mastery') renderMastery();
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

    document.querySelectorAll('.nav-links li, .clickable-logo').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab || 'dashboard';
            showTab(targetId);
        });
    });

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

    setInterval(updateClock, 1000);
    updateClock();
});
