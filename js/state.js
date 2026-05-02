/**
 * Global State Management
 */

// Data storage (initially from global variables in data.js)
export let appData = [];
export let appApplicationData = [];
export let masteryProgress = {};
export let activityLog = [];

export let currentViewMode = 'list';
export let isBulkEditMode = false;
export const selectedItems = new Set();
export const collapsedModules = new Set();

// Chart instances
export let trendChart = null;
export let pieChartInstance = null;
export let sidebarPieChartInstance = null;

export function setAppData(data) { appData = data; }
export function setAppApplicationData(data) { appApplicationData = data; }
export function setMasteryProgress(data) { masteryProgress = data; }
export function setActivityLog(data) { activityLog = data; }
export function setTrendChart(val) { trendChart = val; }
export function setPieChartInstance(val) { pieChartInstance = val; }
export function setSidebarPieChartInstance(val) { sidebarPieChartInstance = val; }
export function setViewMode(val) { currentViewMode = val; }
export function setBulkEditMode(val) { isBulkEditMode = val; }

export function loadLocalData() {
    // Try to load from localStorage, fallback to default data.js variables if needed
    const savedWebinars = localStorage.getItem('mentfxData');
    if (savedWebinars) {
        appData = JSON.parse(savedWebinars);
    } else if (typeof window.mentfxData !== 'undefined') {
        appData = [...window.mentfxData];
    }

    const savedApp = localStorage.getItem('mentfxApplication');
    if (savedApp) {
        appApplicationData = JSON.parse(savedApp);
    } else if (typeof window.applicationData !== 'undefined') {
        appApplicationData = [...window.applicationData];
    }

    const savedProg = localStorage.getItem('mentfxMasteryProgress');
    if (savedProg) {
        masteryProgress = JSON.parse(savedProg);
    }

    const savedLog = localStorage.getItem('mentfxActivityLog');
    if (savedLog) {
        activityLog = JSON.parse(savedLog);
    }
}

export function saveLocalData() {
    localStorage.setItem('mentfxData', JSON.stringify(appData));
    localStorage.setItem('mentfxApplication', JSON.stringify(appApplicationData));
    localStorage.setItem('mentfxMasteryProgress', JSON.stringify(masteryProgress));
    localStorage.setItem('mentfxActivityLog', JSON.stringify(activityLog));
}
