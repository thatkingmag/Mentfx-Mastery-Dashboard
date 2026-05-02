import { 
    appData, isBulkEditMode, selectedItems, saveLocalData, currentViewMode 
} from './state.js';
import { showToast } from './utils.js';

export function renderTable() {
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
    
    let filtered = appData.filter(wb => {
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

    filtered = getSortedData(filtered, sortBy);

    filtered.forEach(wb => {
        const row = document.createElement('tr');
        const isDone = wb.status === 'Completed';
        const isSelected = selectedItems.has(wb.id);
        
        row.innerHTML = `
            <td class="bulk-col">
                <input type="checkbox" class="bulk-check" data-id="${wb.id}" 
                       ${isSelected ? 'checked' : ''} 
                       onclick="window.toggleSelectItem('${wb.id}')">
            </td>
            <td>
                <button class="btn-quick-done ${isDone ? 'done' : ''}" 
                        onclick="window.toggleItemComplete('${wb.id}', 'webinar', event)">
                    ${isDone ? '✓' : ''}
                </button>
            </td>
            <td>${wb.name}</td>
            <td>${wb.monthGroup}</td>
            <td><span class="status-badge status-${wb.status.toLowerCase().replace(' ', '-')}">${wb.status}</span></td>
            <td>${wb.rating || 0}/5</td>
            <td><button class="btn-action" onclick="window.openEditModal('${wb.id}', 'webinar')">Update</button></td>
        `;
        trackerBody.appendChild(row);
    });
}

function getSortedData(data, sortBy) {
    const sorted = [...data];
    // ... sort logic ...
    return sorted;
}

export function renderGrid() {
    // ... grid logic ...
}
