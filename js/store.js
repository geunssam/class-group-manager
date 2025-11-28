/**
 * Store - 상태 관리 & localStorage
 */
class Store {
    constructor() {
        this.KEYS = {
            CLASSES: 'cgm_classes',
            CURRENT_GROUPS: 'cgm_current_groups',
            SETTINGS: 'cgm_settings',
            COOKIE_HISTORY: 'cgm_cookie_history'
        };
    }

    // === 학급 관리 ===

    getClasses() {
        const data = localStorage.getItem(this.KEYS.CLASSES);
        return data ? JSON.parse(data) : [];
    }

    saveClasses(classes) {
        localStorage.setItem(this.KEYS.CLASSES, JSON.stringify(classes));
    }

    addClass(name, students) {
        const classes = this.getClasses();
        const newClass = {
            id: Date.now().toString(),
            name: name,
            students: students,
            createdAt: new Date().toISOString()
        };
        classes.push(newClass);
        this.saveClasses(classes);
        return newClass;
    }

    updateClass(id, name, students) {
        const classes = this.getClasses();
        const index = classes.findIndex(c => c.id === id);
        if (index !== -1) {
            classes[index].name = name;
            classes[index].students = students;
            this.saveClasses(classes);
            return classes[index];
        }
        return null;
    }

    deleteClass(id) {
        const classes = this.getClasses();
        const filtered = classes.filter(c => c.id !== id);
        this.saveClasses(filtered);
    }

    getClassById(id) {
        const classes = this.getClasses();
        return classes.find(c => c.id === id) || null;
    }

    // === 모둠 관리 ===

    getCurrentGroups() {
        const data = localStorage.getItem(this.KEYS.CURRENT_GROUPS);
        return data ? JSON.parse(data) : [];
    }

    saveCurrentGroups(groups) {
        localStorage.setItem(this.KEYS.CURRENT_GROUPS, JSON.stringify(groups));
    }

    clearCurrentGroups() {
        localStorage.removeItem(this.KEYS.CURRENT_GROUPS);
    }

    // === 설정 ===

    getSettings() {
        const data = localStorage.getItem(this.KEYS.SETTINGS);
        return data ? JSON.parse(data) : {
            cookieMode: 'session',
            timerMode: 'global',
            defaultTime: 300,
            timerAlert: 'soundAndVisual',
            animationEnabled: true
        };
    }

    saveSettings(settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    }

    // === 쿠키 히스토리 (누적 모드용) ===

    getCookieHistory() {
        const data = localStorage.getItem(this.KEYS.COOKIE_HISTORY);
        return data ? JSON.parse(data) : [];
    }

    saveCookieHistory(history) {
        localStorage.setItem(this.KEYS.COOKIE_HISTORY, JSON.stringify(history));
    }

    addCookieRecord(classId, groups) {
        const history = this.getCookieHistory();
        const record = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            classId: classId,
            groups: groups.map(g => ({
                id: g.id,
                members: [...g.members],
                cookies: g.cookies
            }))
        };
        history.push(record);
        this.saveCookieHistory(history);
        return record;
    }

    getCookieHistoryByClass(classId) {
        const history = this.getCookieHistory();
        return history.filter(h => h.classId === classId);
    }

    getCookieStats(classId) {
        const history = this.getCookieHistoryByClass(classId);
        const studentCookies = {};

        history.forEach(record => {
            record.groups.forEach(group => {
                group.members.forEach(member => {
                    if (!studentCookies[member]) {
                        studentCookies[member] = 0;
                    }
                    studentCookies[member] += group.cookies;
                });
            });
        });

        return studentCookies;
    }

    clearCookieHistory(classId) {
        if (classId) {
            const history = this.getCookieHistory();
            const filtered = history.filter(h => h.classId !== classId);
            this.saveCookieHistory(filtered);
        } else {
            localStorage.removeItem(this.KEYS.COOKIE_HISTORY);
        }
    }
}

// 전역 store 인스턴스
const store = new Store();
