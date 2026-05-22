/**
 * Mentfx Tracker Module
 */
window.MentfxTracker = {
    populateYearFilter: function() {
        const yearFilter = document.getElementById('year-filter');
        if (!yearFilter || this.yearFilterPopulated) return;
        
        const S = window.MentfxState;
        const years = new Set();
        S.appData.forEach(wb => {
            const yearMatch = wb.monthGroup.match(/\d{4}/);
            if (yearMatch) years.add(yearMatch[0]);
        });
        
        const sortedYears = Array.from(years).sort();
        sortedYears.forEach(year => {
            const opt = document.createElement('option');
            opt.value = year;
            opt.textContent = year;
            yearFilter.appendChild(opt);
        });
        this.yearFilterPopulated = true;
    },

    getFilteredData: function() {
        const S = window.MentfxState;
        const searchFilter = document.getElementById('search-filter');
        const statusFilter = document.getElementById('status-filter');
        const ratingFilter = document.getElementById('rating-filter');
        const yearFilter = document.getElementById('year-filter');

        const term = searchFilter ? searchFilter.value.toLowerCase() : '';
        const stat = statusFilter ? statusFilter.value : 'All';
        const rat = ratingFilter?.value || 'All';
        const yearVal = yearFilter?.value || 'All';

        return S.appData.filter(wb => {
            const matchInTags = (wb.tags || []).some(t => t.toLowerCase().includes(term));
            if (stat !== 'All' && wb.status !== stat) return false;
            
            // Filter by Year
            const yearMatch = wb.monthGroup.match(/\d{4}/);
            const year = yearMatch ? yearMatch[0] : 'Other';
            if (yearVal !== 'All' && year !== yearVal) return false;

            if (rat !== 'All') {
                const r = wb.rating || 0;
                if (rat === '0') { if (r !== 0) return false; }
                else if (r < parseInt(rat)) return false;
            }
            if (term && !wb.name.toLowerCase().includes(term) && (!wb.notes || !wb.notes.toLowerCase().includes(term)) && !matchInTags) return false;
            return true;
        });
    },

    renderCurrentView: function() {
        const S = window.MentfxState;
        
        // Populate Year Filter options dynamically
        this.populateYearFilter();
        
        let mode = S.currentViewMode;
        
        // Update Progress Bar
        const total = S.appData.length;
        const completed = S.appData.filter(w => w.status === 'Completed').length;
        const pct = total ? Math.round((completed / total) * 100) : 0;
        
        const pctText = document.getElementById('webinar-progress-text');
        const pctBar = document.getElementById('webinar-progress-bar');
        if (pctText) pctText.textContent = `${pct}%`;
        if (pctBar) pctBar.style.width = `${pct}%`;

        // Mobile restriction: No list mode on mobile
        if (window.innerWidth <= 768 && mode === 'list') {
            mode = 'grid';
            S.currentViewMode = 'grid';
        }

        // Update view UI
        document.querySelectorAll('.tracker-mode').forEach(m => m.classList.remove('active'));
        const activeMode = document.getElementById(`${mode}-mode`);
        if (activeMode) activeMode.classList.add('active');

        // Update Toggle Buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        if (mode === 'list') this.renderTable();
        else if (mode === 'grid') this.renderGrid();
        else if (mode === 'calendar') this.renderCalendar();

        if (!this.listenersSet) {
            this.setupListeners();
            this.listenersSet = true;
        }
    },

    setTrackerView: function(mode) {
        window.MentfxState.currentViewMode = mode;
        this.renderCurrentView();
    },

    setupListeners: function() {
        ['search-filter', 'status-filter', 'rating-filter', 'sort-filter', 'year-filter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.renderCurrentView());
                el.addEventListener('change', () => this.renderCurrentView());
            }
        });
    },

    renderTable: function() {
        const S = window.MentfxState;
        const trackerBody = document.getElementById('tracker-body');
        const sortFilter = document.getElementById('sort-filter');

        if (!trackerBody) return;

        const sortBy = sortFilter?.value || 'default';
        
        trackerBody.innerHTML = '';
        
        let filtered = this.getFilteredData();
        filtered = this.getSortedData(filtered, sortBy);

        const isChronological = ['default', 'newest', 'year-oldest', 'year-newest'].includes(sortBy);
        let currentYear = null;

        filtered.forEach(wb => {
            // Render Year Divider header in Table if chronological sorting is active
            if (isChronological) {
                const yearMatch = wb.monthGroup.match(/\d{4}/);
                const year = yearMatch ? yearMatch[0] : 'Other';
                if (year !== currentYear) {
                    currentYear = year;
                    const dividerRow = document.createElement('tr');
                    dividerRow.className = 'year-divider-row';
                    dividerRow.innerHTML = `
                        <td colspan="8" class="year-divider-cell">
                            ${year}
                        </td>
                    `;
                    trackerBody.appendChild(dividerRow);
                }
            }

            const row = document.createElement('tr');
            const isDone = wb.status === 'Completed';
            const isSelected = S.selectedItems.has(wb.id);
            let statusClass = 'status-not-started';
            if (wb.status === 'In Progress') statusClass = 'status-in-progress';
            if (wb.status === 'Completed') statusClass = 'status-completed';

            row.innerHTML = `
                <td class="bulk-col"><input type="checkbox" class="bulk-check" data-id="${wb.id}" ${isSelected ? 'checked' : ''} onclick="toggleSelectItem('${wb.id}')"></td>
                <td><button class="btn-quick-done ${isDone ? 'done' : ''}" onclick="toggleItemComplete('${wb.id}', 'webinar', event)">${isDone ? '✓' : ''}</button></td>
                <td style="font-weight: 500;"><div>${wb.name}</div><div class="tag-container">${(wb.tags || []).map(t => `<span class="tag-badge">#${t}</span>`).join('')}</div></td>
                <td style="color: var(--text-muted);">${wb.monthGroup || 'Unknown'}</td>
                <td><span class="status-badge ${statusClass}">${wb.status}</span></td>
                <td>${wb.rating || 0}/5</td>
                <td>${wb.link ? `<a href="${wb.link}" target="_blank" class="link-btn">Watch</a>` : ''}</td>
                <td><button class="btn-action" onclick="openEditModal('${wb.id}', 'webinar')">Update</button></td>
            `;
            trackerBody.appendChild(row);
        });
    },

    getSortedData: function(data, sortBy) {
        const S = window.MentfxState;
        const sorted = [...data];
        switch (sortBy) {
            case 'newest': return sorted.reverse();
            case 'rating-high': return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'rating-low': return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
            case 'name-az': return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case 'year-newest':
                return sorted.sort((a, b) => {
                    const yearA = parseInt(a.monthGroup.match(/\d{4}/)?.[0] || 0);
                    const yearB = parseInt(b.monthGroup.match(/\d{4}/)?.[0] || 0);
                    if (yearB !== yearA) return yearB - yearA;
                    const idxA = S.appData.indexOf(a);
                    const idxB = S.appData.indexOf(b);
                    return idxB - idxA;
                });
            case 'year-oldest':
                return sorted.sort((a, b) => {
                    const yearA = parseInt(a.monthGroup.match(/\d{4}/)?.[0] || 0);
                    const yearB = parseInt(b.monthGroup.match(/\d{4}/)?.[0] || 0);
                    if (yearA !== yearB) return yearA - yearB;
                    const idxA = S.appData.indexOf(a);
                    const idxB = S.appData.indexOf(b);
                    return idxA - idxB;
                });
            default: return sorted;
        }
    },

    renderGrid: function() {
        const S = window.MentfxState;
        const container = document.getElementById('grid-container');
        if (!container) return;
        
        container.innerHTML = '';
        const sortElement = document.getElementById('sort-filter');
        const sortBy = sortElement ? sortElement.value : 'default';

        let filtered = this.getFilteredData();
        filtered = this.getSortedData(filtered, sortBy);

        const isChronological = ['default', 'newest', 'year-oldest', 'year-newest'].includes(sortBy);
        let currentYear = null;

        filtered.forEach(wb => {
            if (isChronological) {
                const yearMatch = wb.monthGroup.match(/\d{4}/);
                const year = yearMatch ? yearMatch[0] : 'Other';
                if (year !== currentYear) {
                    currentYear = year;
                    const divider = document.createElement('div');
                    divider.className = 'year-grid-divider';
                    divider.textContent = year;
                    container.appendChild(divider);
                }
            }

            const card = document.createElement('div');
            const isSelected = S.selectedItems.has(wb.id);
            card.className = `webinar-card glass ${isSelected ? 'selected' : ''}`;
            
            if (S.isBulkEditMode) {
                card.onclick = () => window.toggleSelectItem(wb.id);
                card.style.cursor = 'pointer';
            }
            
            const isDone = wb.status === 'Completed';
            const bulkCheckHtml = S.isBulkEditMode ? `<div class="card-bulk-check"><input type="checkbox" ${isSelected ? 'checked' : ''} onclick="toggleSelectItem('${wb.id}')"></div>` : '';

            card.innerHTML = `
                <div class="card-header">
                    ${bulkCheckHtml}
                    <button class="btn-quick-done ${isDone ? 'done' : ''}" onclick="toggleItemComplete('${wb.id}', 'webinar', event)">${isDone ? '✓' : ''}</button>
                    <span class="card-month">${wb.monthGroup}</span>
                    <span class="status-badge status-${wb.status.toLowerCase().replace(' ', '-')}">${wb.status}</span>
                </div>
                <div class="card-title">${wb.name}</div>
                <div class="card-footer">
                    ${wb.link ? `<a href="${wb.link}" target="_blank" class="btn-action">Watch</a>` : ''}
                    <button class="btn-action" onclick="openEditModal('${wb.id}', 'webinar')">Edit</button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    renderCalendar: function() {
        const S = window.MentfxState;
        const container = document.getElementById('calendar-container');
        if (!container) return;
        container.innerHTML = '';

        const yearGroups = {};
        S.appData.forEach(wb => {
            const yearMatch = wb.monthGroup.match(/\d{4}/);
            const year = yearMatch ? yearMatch[0] : 'Other';
            if (!yearGroups[year]) yearGroups[year] = {};
            if (!yearGroups[year][wb.monthGroup]) yearGroups[year][wb.monthGroup] = [];
            yearGroups[year][wb.monthGroup].push(wb);
        });

        Object.keys(yearGroups).sort().forEach(year => {
            const yearSection = document.createElement('div');
            yearSection.className = 'year-section';
            yearSection.innerHTML = `<div class="year-header">${year}</div>`;
            container.appendChild(yearSection);

            const months = yearGroups[year];
            Object.keys(months).forEach(month => {
                const monthCard = document.createElement('div');
                monthCard.className = 'calendar-month glass';
                monthCard.innerHTML = `<div class="month-header">${month}</div><div class="calendar-items-list"></div>`;
                const list = monthCard.querySelector('.calendar-items-list');

                months[month].forEach(wb => {
                    const item = document.createElement('div');
                    item.className = 'calendar-item';
                    
                    const watchHtml = wb.link ? `
                        <a href="${wb.link}" target="_blank" class="cal-watch-btn" title="Watch Webinar" onclick="event.stopPropagation()">
                            <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path><path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445z"></path></svg>
                        </a>
                    ` : '';

                    const isDone = wb.status === 'Completed';
                    item.innerHTML = `
                        <div style="display:flex; align-items:center; gap:0.5rem; flex:1; overflow:hidden;">
                            <button class="cal-done-btn ${isDone ? 'done' : ''}" onclick="toggleItemComplete('${wb.id}', 'webinar', event)">
                                ${isDone ? '✓' : ''}
                            </button>
                            <span class="item-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${wb.name}</span>
                        </div>
                        ${watchHtml}
                    `;
                    item.onclick = () => window.openEditModal(wb.id, 'webinar');
                    list.appendChild(item);
                });
                container.appendChild(monthCard);
            });
        });
    }
};

window.renderCurrentView = () => window.MentfxTracker.renderCurrentView();
window.setTrackerView = (mode) => window.MentfxTracker.setTrackerView(mode);

// ===== Bulk Edit Logic =====

window.toggleBulkEdit = () => {
    const S = window.MentfxState;
    S.isBulkEditMode = !S.isBulkEditMode;
    if (!S.isBulkEditMode) S.selectedItems.clear();
    
    const toolbar = document.getElementById('bulk-toolbar');
    const btn = document.getElementById('bulk-edit-btn');
    if (toolbar) toolbar.classList.toggle('active', S.isBulkEditMode);
    if (btn) btn.classList.toggle('active', S.isBulkEditMode);
    
    window.MentfxTracker.renderCurrentView();
    window.updateBulkCount();
};

window.toggleSelectItem = (id) => {
    const S = window.MentfxState;
    if (S.selectedItems.has(id)) S.selectedItems.delete(id);
    else S.selectedItems.add(id);
    
    window.MentfxTracker.renderCurrentView();
    window.updateBulkCount();
};

window.toggleSelectAll = (event) => {
    const S = window.MentfxState;
    const isChecked = event.target.checked;
    
    if (isChecked) {
        // Select all currently visible (filtered) items
        const filtered = window.MentfxTracker.getFilteredData();
        filtered.forEach(wb => S.selectedItems.add(wb.id));
    } else {
        S.selectedItems.clear();
    }
    
    window.MentfxTracker.renderCurrentView();
    window.updateBulkCount();
};

window.updateBulkCount = () => {
    const count = window.MentfxState.selectedItems.size;
    const el = document.getElementById('selected-count');
    if (el) el.textContent = count;
};

window.bulkUpdateStatus = (newStatus) => {
    const S = window.MentfxState;
    if (S.selectedItems.size === 0) return window.showToast('No items selected', 'error');
    
    let updatedCount = 0;
    S.appData.forEach(wb => {
        if (S.selectedItems.has(wb.id)) {
            const oldStatus = wb.status;
            wb.status = newStatus;
            updatedCount++;
            
            // Log activity if marking as completed
            if (newStatus === 'Completed' && oldStatus !== 'Completed') {
                window.logActivity?.('webinar', wb.name, 'Completed');
            }
        }
    });
    
    S.saveLocalData();
    window.toggleBulkEdit(); // Exit bulk mode
    window.showToast(`Updated ${updatedCount} items to ${newStatus}`, 'success');
    window.updateDashboard?.();
};

window.bulkDelete = () => {
    const S = window.MentfxState;
    if (S.selectedItems.size === 0) return window.showToast('No items selected', 'error');
    
    if (!confirm(`Are you sure you want to delete ${S.selectedItems.size} items?`)) return;
    
    S.appData = S.appData.filter(wb => !S.selectedItems.has(wb.id));
    
    S.saveLocalData();
    window.toggleBulkEdit();
    window.showToast('Selected items deleted', 'success');
    window.updateDashboard?.();
};
