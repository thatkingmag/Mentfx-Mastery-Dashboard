/**
 * Mentfx Tracker Module
 */
window.MentfxTracker = {
    renderCurrentView: function() {
        const S = window.MentfxState;
        const mode = S.currentViewMode;
        
        // Update Progress Bar
        const total = S.appData.length;
        const completed = S.appData.filter(w => w.status === 'Completed').length;
        const pct = total ? Math.round((completed / total) * 100) : 0;
        
        const pctText = document.getElementById('webinar-progress-text');
        const pctBar = document.getElementById('webinar-progress-bar');
        if (pctText) pctText.textContent = `${pct}%`;
        if (pctBar) pctBar.style.width = `${pct}%`;

        // Update view UI
        document.querySelectorAll('.tracker-mode').forEach(m => m.classList.remove('active'));
        const activeMode = document.getElementById(`${mode}-mode`);
        if (activeMode) activeMode.classList.add('active');

        if (mode === 'list') this.renderTable();
        else if (mode === 'grid') this.renderGrid();
        else if (mode === 'calendar') this.renderCalendar();

        if (!this.listenersSet) {
            this.setupListeners();
            this.listenersSet = true;
        }
    },

    setupListeners: function() {
        ['search-filter', 'status-filter', 'rating-filter', 'sort-filter'].forEach(id => {
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
        const searchFilter = document.getElementById('search-filter');
        const statusFilter = document.getElementById('status-filter');
        const ratingFilter = document.getElementById('rating-filter');
        const sortFilter = document.getElementById('sort-filter');

        if (!trackerBody) return;

        const term = searchFilter.value.toLowerCase();
        const stat = statusFilter.value;
        const rat = ratingFilter?.value || 'All';
        const sortBy = sortFilter?.value || 'default';
        
        trackerBody.innerHTML = '';
        
        let filtered = S.appData.filter(wb => {
            const matchInTags = (wb.tags || []).some(t => t.toLowerCase().includes(term));
            if (stat !== 'All' && wb.status !== stat) return false;
            if (rat !== 'All') {
                const r = wb.rating || 0;
                if (rat === '0') { if (r !== 0) return false; }
                else if (r < parseInt(rat)) return false;
            }
            if (term && !wb.name.toLowerCase().includes(term) && (!wb.notes || !wb.notes.toLowerCase().includes(term)) && !matchInTags) return false;
            return true;
        });

        filtered = this.getSortedData(filtered, sortBy);

        filtered.forEach(wb => {
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
        const sorted = [...data];
        switch (sortBy) {
            case 'newest': return sorted.reverse();
            case 'rating-high': return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'rating-low': return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
            case 'name-az': return sorted.sort((a, b) => a.name.localeCompare(b.name));
            default: return sorted;
        }
    },

    renderGrid: function() {
        const S = window.MentfxState;
        const container = document.getElementById('grid-container');
        if (!container) return;
        
        container.innerHTML = '';
        const searchFilter = document.getElementById('search-filter');
        const statusFilter = document.getElementById('status-filter');
        const term = searchFilter.value.toLowerCase();
        const stat = statusFilter.value;

        S.appData.forEach(wb => {
            if (stat !== 'All' && wb.status !== stat) return;
            if (term && !wb.name.toLowerCase().includes(term)) return;

            const card = document.createElement('div');
            const isSelected = S.selectedItems.has(wb.id);
            card.className = `webinar-card glass ${isSelected ? 'selected' : ''}`;
            
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
                    item.innerHTML = `<div class="item-status-dot status-${wb.status.toLowerCase().replace(' ', '-')}"></div><span>${wb.name}</span>`;
                    item.onclick = () => window.openEditModal(wb.id, 'webinar');
                    list.appendChild(item);
                });
                container.appendChild(monthCard);
            });
        });
    }
};

window.renderCurrentView = () => window.MentfxTracker.renderCurrentView();
