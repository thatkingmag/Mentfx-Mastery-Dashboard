/**
 * Mentfx State Module
 */
window.MentfxState = {
    appData: [],
    appApplicationData: [],
    masteryProgress: {},
    activityLog: [],
    userProfile: { name: 'Tshepo Moeletsi', motto: 'Above Dreams' },
    
    currentViewMode: 'list',
    currentMasteryViewMode: 'grid',
    isBulkEditMode: false,
    selectedItems: new Set(),
    collapsedModules: new Set(),

    // Chart instances
    trendChart: null,
    pieChartInstance: null,
    sidebarPieChartInstance: null,

    saveLocalData: function() {
        localStorage.setItem('mentfxData', JSON.stringify(this.appData));
        localStorage.setItem('mentfxApplication', JSON.stringify(this.appApplicationData));
        localStorage.setItem('mentfxMastery', JSON.stringify(this.masteryProgress));
        localStorage.setItem('mentfxActivityLog', JSON.stringify(this.activityLog));
        localStorage.setItem('mentfxProfile', JSON.stringify(this.userProfile));
    }
};
