/**
 * Class Group Manager - Main App
 */
class App {
    constructor() {
        this.currentClassId = null;
        this.currentGroups = [];
        this.remainingStudents = [];
        this.excludedStudents = []; // 이번 뽑기에서 제외할 학생

        // 전체 타이머
        this.timerSeconds = 300;
        this.timerInterval = null;
        this.isTimerRunning = false;

        // 모둠별 타이머
        this.timerMode = 'global'; // 'global' or 'perGroup'
        this.groupTimers = {}; // { groupId: { seconds, interval, running } }
        this.defaultTimerSeconds = 300;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadClasses();
        this.updateStudentInfo();
    }

    // === 이벤트 바인딩 ===

    bindEvents() {
        // 학급 선택
        document.getElementById('classSelect').addEventListener('change', (e) => {
            this.currentClassId = e.target.value;
            this.excludedStudents = []; // 학급 변경 시 제외 목록 초기화
            this.renderExcludeSection();
        });

        // 모둠 뽑기
        document.getElementById('btnPick').addEventListener('click', () => this.pickGroups());
        document.getElementById('btnReset').addEventListener('click', () => this.resetGroups());

        // 모둠 인원/개수 증감 버튼
        const groupSizeInput = document.getElementById('groupSize');
        const groupCountInput = document.getElementById('groupCount');

        document.getElementById('btnGroupSizeMinus').addEventListener('click', (e) => {
            e.preventDefault();
            const val = parseInt(groupSizeInput.value) - 1;
            if (val >= parseInt(groupSizeInput.min)) {
                groupSizeInput.value = val;
            }
        });

        document.getElementById('btnGroupSizePlus').addEventListener('click', (e) => {
            e.preventDefault();
            const val = parseInt(groupSizeInput.value) + 1;
            if (val <= parseInt(groupSizeInput.max)) {
                groupSizeInput.value = val;
            }
        });

        document.getElementById('btnGroupCountMinus').addEventListener('click', (e) => {
            e.preventDefault();
            const val = parseInt(groupCountInput.value) - 1;
            if (val >= parseInt(groupCountInput.min)) {
                groupCountInput.value = val;
            }
        });

        document.getElementById('btnGroupCountPlus').addEventListener('click', (e) => {
            e.preventDefault();
            const val = parseInt(groupCountInput.value) + 1;
            if (val <= parseInt(groupCountInput.max)) {
                groupCountInput.value = val;
            }
        });

        // 학급 편집 모달
        document.getElementById('btnEditClass').addEventListener('click', () => this.openClassModal());
        document.getElementById('btnCloseModal').addEventListener('click', () => this.closeClassModal());
        document.getElementById('btnSaveClass').addEventListener('click', () => this.saveClass());
        document.getElementById('btnDeleteClass').addEventListener('click', () => this.deleteCurrentClass());

        // 학생 제외 모달
        document.getElementById('btnExclude').addEventListener('click', () => this.openExcludeModal());
        document.getElementById('btnCloseExclude').addEventListener('click', () => this.closeExcludeModal());
        document.getElementById('btnConfirmExclude').addEventListener('click', () => this.closeExcludeModal());
        document.getElementById('excludeModal').addEventListener('click', (e) => {
            if (e.target.id === 'excludeModal') this.closeExcludeModal();
        });

        // CSV 파일 가져오기
        document.getElementById('csvFileInput').addEventListener('change', (e) => this.importCSV(e));

        // 남는 학생 처리 모달
        document.getElementById('btnDistribute').addEventListener('click', () => this.distributeRemaining());
        document.getElementById('btnSeparate').addEventListener('click', () => this.separateRemaining());
        document.getElementById('btnCancelPick').addEventListener('click', () => this.closeRemainingModal());

        // 타이머
        document.getElementById('btnTimerStart').addEventListener('click', () => this.startTimer());
        document.getElementById('btnTimerPause').addEventListener('click', () => this.pauseTimer());
        document.getElementById('btnTimerReset').addEventListener('click', () => this.resetTimer());

        // 타이머 프리셋
        document.querySelectorAll('.timer-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const seconds = parseInt(e.target.dataset.time);
                this.setTimerPreset(seconds, e.target);
            });
        });

        // 커스텀 타이머
        document.getElementById('customTime').addEventListener('change', (e) => {
            const seconds = parseInt(e.target.value);
            if (seconds >= 10 && seconds <= 3600) {
                this.timerSeconds = seconds;
                this.updateTimerDisplay();
                document.querySelectorAll('.timer-preset').forEach(b => b.classList.remove('active'));
            }
        });

        // 타이머 모드 전환 (select 및 탭 버튼)
        document.getElementById('timerMode').addEventListener('change', (e) => {
            this.setTimerMode(e.target.value);
            this.updateTimerTabs(e.target.value);
        });

        // 탭 버튼 이벤트
        const tabGlobal = document.getElementById('tabGlobalTimer');
        const tabPerGroup = document.getElementById('tabPerGroupTimer');
        if (tabGlobal) {
            tabGlobal.addEventListener('click', () => {
                this.setTimerMode('global');
                document.getElementById('timerMode').value = 'global';
                this.updateTimerTabs('global');
            });
        }
        if (tabPerGroup) {
            tabPerGroup.addEventListener('click', () => {
                this.setTimerMode('perGroup');
                document.getElementById('timerMode').value = 'perGroup';
                this.updateTimerTabs('perGroup');
            });
        }

        // 모둠별 타이머 일괄 제어
        document.getElementById('btnStartAllTimers').addEventListener('click', () => this.startAllGroupTimers());
        document.getElementById('btnResetAllTimers').addEventListener('click', () => this.resetAllGroupTimers());

        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
                e.preventDefault();
                if (this.timerMode === 'global') {
                    if (this.isTimerRunning) {
                        this.pauseTimer();
                    } else {
                        this.startTimer();
                    }
                }
            }
        });

        // 설정 모달 (두 개의 버튼)
        document.getElementById('btnSettings').addEventListener('click', () => this.openSettingsModal());
        const btnSettings2 = document.getElementById('btnSettings2');
        if (btnSettings2) btnSettings2.addEventListener('click', () => this.openSettingsModal());
        document.getElementById('btnCloseSettings').addEventListener('click', () => this.closeSettingsModal());

        // 설정 변경
        document.querySelectorAll('input[name="cookieMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.updateCookieMode(e.target.value));
        });
        document.querySelectorAll('input[name="timerAlert"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.updateTimerAlert(e.target.value));
        });
        document.getElementById('animationEnabled').addEventListener('change', (e) => {
            this.updateAnimationEnabled(e.target.checked);
        });

        // 통계 모달
        document.getElementById('btnShowStats').addEventListener('click', () => this.openStatsModal());
        document.getElementById('btnCloseStats').addEventListener('click', () => this.closeStatsModal());
        document.getElementById('btnSaveCookies').addEventListener('click', () => this.saveCookieRecord());
        document.getElementById('btnClearStats').addEventListener('click', () => this.clearCookieHistory());

        // 모달 외부 클릭 닫기
        document.getElementById('classModal').addEventListener('click', (e) => {
            if (e.target.id === 'classModal') this.closeClassModal();
        });
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') this.closeSettingsModal();
        });
        document.getElementById('statsModal').addEventListener('click', (e) => {
            if (e.target.id === 'statsModal') this.closeStatsModal();
        });
    }

    // === 학급 관리 ===

    loadClasses() {
        const classes = store.getClasses();
        const select = document.getElementById('classSelect');

        // 기존 옵션 제거 (첫번째 제외)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // 학급 옵션 추가
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = `${cls.name} (${cls.students.length}명)`;
            select.appendChild(option);
        });

        // 이전 선택 복원
        if (this.currentClassId) {
            select.value = this.currentClassId;
        }
    }

    updateStudentInfo() {
        // 학생 정보 표시 요소가 없으면 무시
        const info = document.getElementById('studentInfo');
        if (!info) return;

        if (!this.currentClassId) {
            info.textContent = '학급을 선택하면 학생 수가 표시됩니다';
            return;
        }

        const cls = store.getClassById(this.currentClassId);
        if (cls) {
            const groupSize = parseInt(document.getElementById('groupSize').value);
            const groupCount = parseInt(document.getElementById('groupCount').value);
            const total = groupSize * groupCount;
            const diff = cls.students.length - total;

            let message = `총 ${cls.students.length}명`;
            if (diff > 0) {
                message += ` (${diff}명 남음)`;
            } else if (diff < 0) {
                message += ` (${Math.abs(diff)}명 부족)`;
            } else {
                message += ` (딱 맞음!)`;
            }
            info.textContent = message;
        }
    }

    openClassModal() {
        document.getElementById('classModal').classList.remove('hidden');
        this.renderClassList();

        // 현재 선택된 학급 정보 표시
        if (this.currentClassId) {
            const cls = store.getClassById(this.currentClassId);
            if (cls) {
                document.getElementById('className').value = cls.name;
                document.getElementById('studentList').value = cls.students.join('\n');
            }
        } else {
            document.getElementById('className').value = '';
            document.getElementById('studentList').value = '';
        }
    }

    closeClassModal() {
        document.getElementById('classModal').classList.add('hidden');
    }

    renderClassList() {
        const container = document.getElementById('classList');
        const classes = store.getClasses();

        if (classes.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">저장된 학급이 없습니다</p>';
            return;
        }

        container.innerHTML = classes.map(cls => {
            const isSelected = cls.id === this.currentClassId;
            return `
                <div class="class-item flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${isSelected ? 'bg-sky-200 border-2 border-sky-500 shadow-md' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'}"
                     data-class-id="${cls.id}"
                     onclick="app.selectClass('${cls.id}')">
                    <span class="font-medium ${isSelected ? 'text-sky-800' : 'text-gray-700'}">${cls.name}</span>
                    <span class="${isSelected ? 'text-sky-700 font-bold' : 'text-gray-500'} text-sm">${cls.students.length}명</span>
                </div>
            `;
        }).join('');
    }

    selectClass(id) {
        this.currentClassId = id;
        const cls = store.getClassById(id);
        if (cls) {
            // 입력 필드 업데이트
            document.getElementById('className').value = cls.name;
            document.getElementById('studentList').value = cls.students.join('\n');

            // 헤더 select 업데이트
            const classSelect = document.getElementById('classSelect');
            if (classSelect) {
                classSelect.value = id;
            }

            // 학급 목록 하이라이트 업데이트
            this.renderClassList();

            // 제외 섹션 업데이트
            this.excludedStudents = [];
            this.renderExcludeSection();

            this.showToast(`'${cls.name}' 선택됨`);
        }
    }

    saveClass() {
        const name = document.getElementById('className').value.trim();
        if (!name) {
            this.showToast('학급 이름을 입력해주세요');
            return;
        }

        const studentsText = document.getElementById('studentList').value;
        const students = this.parseStudents(studentsText);

        if (this.currentClassId) {
            // 기존 학급 수정
            const currentClass = store.getClassById(this.currentClassId);
            if (currentClass && currentClass.name !== name) {
                // 이름이 변경된 경우 - 새 학급으로 저장할지 확인
                const existingClass = store.getClasses().find(c => c.name === name && c.id !== this.currentClassId);
                if (existingClass) {
                    this.showToast('같은 이름의 학급이 이미 있습니다');
                    return;
                }
            }
            store.updateClass(this.currentClassId, name, students);
            this.showToast('저장되었습니다');
        } else {
            // 새 학급 생성
            const existingClass = store.getClasses().find(c => c.name === name);
            if (existingClass) {
                this.showToast('같은 이름의 학급이 이미 있습니다');
                return;
            }
            const newClass = store.addClass(name, students);
            this.currentClassId = newClass.id;
            this.showToast(`'${name}' 학급이 추가되었습니다`);
        }

        this.loadClasses();
        this.renderClassList();
        this.renderExcludeSection();
    }

    deleteCurrentClass() {
        if (!this.currentClassId) {
            this.showToast('삭제할 학급을 선택해주세요');
            return;
        }

        if (confirm('정말 이 학급을 삭제하시겠습니까?')) {
            store.deleteClass(this.currentClassId);
            this.currentClassId = null;
            this.excludedStudents = [];
            this.loadClasses();
            this.renderClassList();
            this.renderExcludeSection();

            document.getElementById('className').value = '';
            document.getElementById('studentList').value = '';
            document.getElementById('classSelect').value = '';

            this.showToast('학급이 삭제되었습니다');
        }
    }

    parseStudents(text) {
        return text
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    importCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const names = this.parseCSVContent(content);

                if (names.length === 0) {
                    this.showToast('명단을 찾을 수 없습니다');
                    return;
                }

                // 현재 텍스트에 추가할지 대체할지 결정
                const currentList = document.getElementById('studentList').value.trim();
                if (currentList) {
                    if (confirm(`기존 명단(${currentList.split('\n').length}명)을 대체할까요?\n'취소'를 누르면 기존 명단 뒤에 추가됩니다.`)) {
                        document.getElementById('studentList').value = names.join('\n');
                    } else {
                        document.getElementById('studentList').value = currentList + '\n' + names.join('\n');
                    }
                } else {
                    document.getElementById('studentList').value = names.join('\n');
                }

                this.showToast(`${names.length}명의 학생을 가져왔습니다`);
            } catch (err) {
                this.showToast('파일을 읽는 중 오류가 발생했습니다');
                console.error(err);
            }
        };

        reader.readAsText(file, 'UTF-8');

        // 파일 입력 초기화 (같은 파일 다시 선택 가능하도록)
        event.target.value = '';
    }

    parseCSVContent(content) {
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0) return [];

        const names = [];

        // 첫 줄이 헤더인지 확인
        const firstLine = lines[0];
        const isHeader = firstLine.includes('이름') ||
                         firstLine.includes('성명') ||
                         firstLine.includes('name') ||
                         firstLine.toLowerCase().includes('name');

        // 컬럼 구분자 감지 (콤마 또는 탭)
        const delimiter = firstLine.includes('\t') ? '\t' : ',';
        const columns = firstLine.split(delimiter).map(c => c.trim().toLowerCase());

        // 이름 열 인덱스 찾기
        let nameColumnIndex = columns.findIndex(c =>
            c === '이름' || c === '성명' || c === 'name' || c === '학생명'
        );

        // 이름 열을 찾지 못하면 첫 번째 열 사용
        if (nameColumnIndex === -1) {
            nameColumnIndex = 0;
        }

        const startLine = isHeader ? 1 : 0;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(delimiter);
            const name = parts[nameColumnIndex]?.trim();

            // 유효한 이름인지 확인 (숫자만 있는 경우 제외, 빈 값 제외)
            if (name && !/^\d+$/.test(name) && name.length > 0 && name.length < 20) {
                names.push(name);
            }
        }

        return names;
    }

    // === 학생 제외 기능 ===

    renderExcludeSection() {
        const btnExclude = document.getElementById('btnExclude');
        const excludeCount = document.getElementById('excludeCount');

        if (!this.currentClassId) {
            btnExclude.classList.add('hidden');
            return;
        }

        const cls = store.getClassById(this.currentClassId);
        if (!cls || cls.students.length === 0) {
            btnExclude.classList.add('hidden');
            return;
        }

        // 결석 버튼 표시
        btnExclude.classList.remove('hidden');
        this.updateExcludeButton();
    }

    updateExcludeButton() {
        const excludeCount = document.getElementById('excludeCount');
        if (this.excludedStudents.length > 0) {
            excludeCount.textContent = `(${this.excludedStudents.length}명)`;
        } else {
            excludeCount.textContent = '';
        }
    }

    openExcludeModal() {
        if (!this.currentClassId) {
            this.showToast('먼저 학급을 선택해주세요');
            return;
        }

        const cls = store.getClassById(this.currentClassId);
        if (!cls) return;

        const studentCheckList = document.getElementById('studentCheckList');

        // 학생 목록 렌더링 (탭하면 선택/해제)
        studentCheckList.innerHTML = cls.students.map(name => {
            const isExcluded = this.excludedStudents.includes(name);
            return `
                <div class="student-item p-2 rounded-lg cursor-pointer transition text-center text-sm ${isExcluded ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-sky-100 text-sky-800 border-2 border-sky-300'}"
                     data-name="${name}"
                     onclick="app.toggleStudentExclude('${name}')">
                    ${name}
                </div>
            `;
        }).join('');

        this.updateExcludeSummary(cls);
        document.getElementById('excludeModal').classList.remove('hidden');
    }

    closeExcludeModal() {
        document.getElementById('excludeModal').classList.add('hidden');
        this.updateExcludeButton();
    }

    toggleStudentExclude(name) {
        const studentItem = document.querySelector(`.student-item[data-name="${name}"]`);
        if (!studentItem) return;

        if (this.excludedStudents.includes(name)) {
            // 제외 해제 (참여로 변경)
            this.excludedStudents = this.excludedStudents.filter(n => n !== name);
            studentItem.classList.remove('bg-red-100', 'text-red-700', 'border-red-300');
            studentItem.classList.add('bg-sky-100', 'text-sky-800', 'border-sky-300');
        } else {
            // 제외 추가
            this.excludedStudents.push(name);
            studentItem.classList.remove('bg-sky-100', 'text-sky-800', 'border-sky-300');
            studentItem.classList.add('bg-red-100', 'text-red-700', 'border-red-300');
        }

        const cls = store.getClassById(this.currentClassId);
        this.updateExcludeSummary(cls);
    }

    updateExcludeSummary(cls) {
        const summary = document.getElementById('excludeSummary');
        const participating = cls.students.length - this.excludedStudents.length;
        summary.textContent = `참여 ${participating}명 / 제외 ${this.excludedStudents.length}명`;
    }

    // === 모둠 뽑기 ===

    async pickGroups() {
        if (!this.currentClassId) {
            this.showToast('먼저 학급을 선택해주세요');
            return;
        }

        const cls = store.getClassById(this.currentClassId);
        if (!cls || cls.students.length === 0) {
            this.showToast('학생 명단이 비어있습니다');
            return;
        }

        // 제외된 학생 필터링
        const activeStudents = cls.students.filter(s => !this.excludedStudents.includes(s));
        if (activeStudents.length === 0) {
            this.showToast('참여 학생이 없습니다');
            return;
        }

        const groupSize = parseInt(document.getElementById('groupSize').value);
        const groupCount = parseInt(document.getElementById('groupCount').value);

        const settings = store.getSettings();

        // 애니메이션 활성화 시 (제외된 학생 제외한 activeStudents 사용)
        if (settings.animationEnabled !== false) {
            await this.pickGroupsWithAnimation(activeStudents, groupSize, groupCount);
        } else {
            this.pickGroupsInstant(activeStudents, groupSize, groupCount);
        }
    }

    pickGroupsInstant(students, groupSize, groupCount) {
        // 셔플
        const shuffled = this.shuffleArray([...students]);

        // 모둠 구성
        this.currentGroups = [];
        for (let i = 0; i < groupCount; i++) {
            this.currentGroups.push({
                id: i + 1,
                members: shuffled.splice(0, groupSize),
                cookies: 0
            });
        }

        // 남는 학생
        this.remainingStudents = shuffled;

        if (this.remainingStudents.length > 0) {
            this.openRemainingModal();
        } else {
            this.renderGroups();
            store.saveCurrentGroups(this.currentGroups);
        }
    }

    async pickGroupsWithAnimation(students, groupSize, groupCount) {
        const overlay = document.getElementById('pickingOverlay');
        const emoji = document.getElementById('pickingEmoji');
        const message = document.getElementById('pickingMessage');

        // 오버레이 표시
        overlay.classList.remove('hidden');

        // 셔플 애니메이션 (1.5초)
        const emojis = ['🎲', '🎰', '🎯', '✨', '🎪'];
        let emojiIndex = 0;

        const emojiInterval = setInterval(() => {
            emoji.textContent = emojis[emojiIndex % emojis.length];
            emojiIndex++;
        }, 200);

        await this.sleep(1500);
        clearInterval(emojiInterval);

        // 실제 셔플 수행
        const shuffled = this.shuffleArray([...students]);

        // 모둠 구성
        this.currentGroups = [];
        for (let i = 0; i < groupCount; i++) {
            this.currentGroups.push({
                id: i + 1,
                members: shuffled.splice(0, groupSize),
                cookies: 0
            });
        }
        this.remainingStudents = shuffled;

        // 결과 발표 메시지
        emoji.textContent = '🎉';
        message.textContent = '모둠 완성!';

        await this.sleep(500);

        // 오버레이 숨기기
        overlay.classList.add('hidden');

        // 남는 학생 처리
        if (this.remainingStudents.length > 0) {
            this.openRemainingModal();
        } else {
            // 카드 애니메이션과 함께 렌더링
            await this.renderGroupsWithAnimation();
            store.saveCurrentGroups(this.currentGroups);
        }
    }

    async renderGroupsWithAnimation() {
        const container = document.getElementById('groupsContainer');
        container.innerHTML = '';

        // 카드 하나씩 순차적으로 표시
        for (let idx = 0; idx < this.currentGroups.length; idx++) {
            const group = this.currentGroups[idx];
            const timerHtml = this.timerMode === 'perGroup' ? this.renderGroupTimer(group.id) : '';
            const memberCount = group.members.length;
            const gridClass = memberCount === 1 ? 'flex justify-center' : 'grid grid-cols-2 gap-1';

            const cardHtml = `
                <div class="group-card bg-white rounded-xl shadow-sm p-3 group-color-${(idx % 8) + 1} flex flex-col card-reveal" style="animation-delay: ${idx * 0.1}s">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-base font-bold text-gray-800">${group.id}모둠</h3>
                        <span class="text-xs text-gray-500">${memberCount}명</span>
                    </div>
                    ${timerHtml}
                    <div class="flex-1 ${gridClass}" id="group-members-${group.id}">
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                        <div class="flex items-center gap-1">
                            <span class="text-sm">🍪</span>
                            <span class="text-sm font-bold text-gray-800 cookie-count" data-group="${group.id}">${group.cookies}</span>
                        </div>
                        <div class="flex gap-1">
                            <button class="cookie-btn w-6 h-6 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs"
                                    onclick="app.addCookie(${group.id})">+</button>
                            <button class="cookie-btn w-6 h-6 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                                    onclick="app.removeCookie(${group.id})">-</button>
                        </div>
                    </div>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', cardHtml);
            await this.sleep(100);

            // 멤버 이름 순차 표시
            const membersContainer = document.getElementById(`group-members-${group.id}`);
            for (let mIdx = 0; mIdx < group.members.length; mIdx++) {
                const name = group.members[mIdx];
                membersContainer.insertAdjacentHTML('beforeend', `
                    <div class="student-tag bg-sky-100 text-sky-800 px-2 py-1 rounded-xl text-xs text-center truncate name-reveal" style="animation-delay: ${mIdx * 0.1}s">${name}</div>
                `);
                await this.sleep(80);
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    shuffleArray(array) {
        // Fisher-Yates 셔플
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    openRemainingModal() {
        document.getElementById('remainingInfo').textContent =
            `${this.remainingStudents.length}명의 학생이 남았습니다: ${this.remainingStudents.join(', ')}`;
        document.getElementById('remainingModal').classList.remove('hidden');
    }

    closeRemainingModal() {
        document.getElementById('remainingModal').classList.add('hidden');
    }

    distributeRemaining() {
        // 남는 학생을 기존 모둠에 분배
        this.remainingStudents.forEach((student, idx) => {
            const groupIdx = idx % this.currentGroups.length;
            this.currentGroups[groupIdx].members.push(student);
        });
        this.remainingStudents = [];

        this.closeRemainingModal();
        this.renderGroups();
        store.saveCurrentGroups(this.currentGroups);
        this.showToast('남은 학생이 모둠에 분배되었습니다');
    }

    separateRemaining() {
        // 남는 학생으로 별도 모둠 생성
        this.currentGroups.push({
            id: this.currentGroups.length + 1,
            members: [...this.remainingStudents],
            cookies: 0
        });
        this.remainingStudents = [];

        this.closeRemainingModal();
        this.renderGroups();
        store.saveCurrentGroups(this.currentGroups);
        this.showToast('별도 모둠이 생성되었습니다');
    }

    resetGroups() {
        if (this.currentGroups.length === 0) {
            this.showToast('초기화할 모둠이 없습니다');
            return;
        }

        this.currentGroups = [];
        this.remainingStudents = [];
        this.groupTimers = {};
        store.saveCurrentGroups(this.currentGroups);
        this.renderGroups();
        this.showToast('모둠이 초기화되었습니다');
    }

    renderGroups() {
        const container = document.getElementById('groupsContainer');

        if (this.currentGroups.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <p class="text-lg">모둠을 뽑아주세요</p>
                    <p class="text-sm mt-2">학급을 선택하고 '모둠 뽑기' 버튼을 누르세요</p>
                </div>
            `;
            return;
        }

        // 모둠별 타이머 초기화 (perGroup 모드일 때)
        if (this.timerMode === 'perGroup') {
            this.currentGroups.forEach(group => {
                if (!this.groupTimers[group.id]) {
                    this.groupTimers[group.id] = {
                        seconds: this.defaultTimerSeconds,
                        interval: null,
                        running: false
                    };
                }
            });
        }

        container.innerHTML = this.currentGroups.map((group, idx) => {
            const timerHtml = this.timerMode === 'perGroup' ? this.renderGroupTimer(group.id) : '';
            const memberCount = group.members.length;
            const gridClass = memberCount === 1 ? 'flex justify-center' : 'grid grid-cols-2 gap-1';

            return `
            <div class="group-card bg-white rounded-xl shadow-sm p-3 group-color-${(idx % 8) + 1} flex flex-col">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-base font-bold text-gray-800">${group.id}모둠</h3>
                    <span class="text-xs text-gray-500">${memberCount}명</span>
                </div>
                ${timerHtml}
                <div class="flex-1 ${gridClass}">
                    ${group.members.map(name => `
                        <div class="student-tag bg-sky-100 text-sky-800 px-2 py-1 rounded-xl text-xs text-center truncate">${name}</div>
                    `).join('')}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                    <div class="flex items-center gap-1">
                        <span class="text-sm">🍪</span>
                        <span class="text-sm font-bold text-gray-800 cookie-count" data-group="${group.id}">${group.cookies}</span>
                    </div>
                    <div class="flex gap-1">
                        <button class="cookie-btn w-6 h-6 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs"
                                onclick="app.addCookie(${group.id})">+</button>
                        <button class="cookie-btn w-6 h-6 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                                onclick="app.removeCookie(${group.id})">-</button>
                    </div>
                </div>
            </div>
        `}).join('');
    }

    renderGroupTimer(groupId) {
        const timer = this.groupTimers[groupId];
        const minutes = Math.floor(timer.seconds / 60);
        const seconds = timer.seconds % 60;
        const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        return `
            <div class="group-timer mb-2 p-2 bg-gray-50 rounded-lg" data-group-timer="${groupId}">
                <div class="flex items-center justify-between">
                    <span class="text-xl font-mono font-bold ${timer.seconds <= 10 && timer.seconds > 0 ? 'text-red-600' : 'text-gray-800'}"
                          id="groupTimerDisplay-${groupId}">${timeDisplay}</span>
                    <div class="flex gap-1">
                        <button class="px-2 py-1 text-xs ${timer.running ? 'hidden' : ''} bg-green-500 hover:bg-green-600 text-white rounded"
                                id="groupTimerStart-${groupId}"
                                onclick="app.startGroupTimer(${groupId})">▶</button>
                        <button class="px-2 py-1 text-xs ${timer.running ? '' : 'hidden'} bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                                id="groupTimerPause-${groupId}"
                                onclick="app.pauseGroupTimer(${groupId})">⏸</button>
                        <button class="px-2 py-1 text-xs bg-gray-400 hover:bg-gray-500 text-white rounded"
                                onclick="app.resetGroupTimer(${groupId})">↺</button>
                    </div>
                </div>
            </div>
        `;
    }

    // === 쿠키 관리 ===

    addCookie(groupId) {
        const group = this.currentGroups.find(g => g.id === groupId);
        if (group) {
            group.cookies++;
            this.updateCookieDisplay(groupId, group.cookies, true);
            store.saveCurrentGroups(this.currentGroups);
        }
    }

    removeCookie(groupId) {
        const group = this.currentGroups.find(g => g.id === groupId);
        if (group && group.cookies > 0) {
            group.cookies--;
            this.updateCookieDisplay(groupId, group.cookies, false);
            store.saveCurrentGroups(this.currentGroups);
        }
    }

    updateCookieDisplay(groupId, count, animate) {
        const el = document.querySelector(`.cookie-count[data-group="${groupId}"]`);
        if (el) {
            el.textContent = count;
            if (animate) {
                el.classList.add('cookie-bounce');
                setTimeout(() => el.classList.remove('cookie-bounce'), 300);
            }
        }
    }

    // === 타이머 ===

    setTimerMode(mode) {
        // 기존 타이머 정리
        if (this.timerMode === 'global') {
            this.pauseTimer();
        } else {
            this.stopAllGroupTimers();
        }

        this.timerMode = mode;

        // UI 업데이트
        const globalSection = document.getElementById('globalTimerSection');
        const perGroupSection = document.getElementById('perGroupTimerSection');

        if (mode === 'global') {
            globalSection.classList.remove('hidden');
            perGroupSection.classList.add('hidden');
        } else {
            globalSection.classList.add('hidden');
            perGroupSection.classList.remove('hidden');
            // 모둠별 타이머 초기화
            this.groupTimers = {};
        }

        // 모둠 카드 다시 렌더링 (타이머 포함/미포함)
        this.renderGroups();
    }

    updateTimerTabs(mode) {
        const tabGlobal = document.getElementById('tabGlobalTimer');
        const tabPerGroup = document.getElementById('tabPerGroupTimer');

        if (!tabGlobal || !tabPerGroup) return;

        if (mode === 'global') {
            tabGlobal.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
            tabGlobal.classList.remove('text-gray-500');
            tabPerGroup.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
            tabPerGroup.classList.add('text-gray-500');
        } else {
            tabPerGroup.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
            tabPerGroup.classList.remove('text-gray-500');
            tabGlobal.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
            tabGlobal.classList.add('text-gray-500');
        }
    }

    setTimerPreset(seconds, button) {
        this.defaultTimerSeconds = seconds;
        this.timerSeconds = seconds;
        this.updateTimerDisplay();

        // 활성 상태 표시 (모든 프리셋 버튼에서)
        document.querySelectorAll('.timer-preset').forEach(b => b.classList.remove('active'));
        // 같은 data-time 값을 가진 모든 버튼에 활성 상태 적용
        document.querySelectorAll(`.timer-preset[data-time="${seconds}"]`).forEach(b => b.classList.add('active'));

        const customTime = document.getElementById('customTime');
        if (customTime) customTime.value = '';

        // 모둠별 타이머 모드일 때 모든 모둠 타이머 시간 변경
        if (this.timerMode === 'perGroup') {
            Object.keys(this.groupTimers).forEach(groupId => {
                const timer = this.groupTimers[groupId];
                if (!timer.running) {
                    timer.seconds = seconds;
                    this.updateGroupTimerDisplay(parseInt(groupId));
                }
            });
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timerSeconds / 60);
        const seconds = this.timerSeconds % 60;
        document.getElementById('timerDisplay').textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    startTimer() {
        if (this.timerSeconds <= 0) return;

        this.isTimerRunning = true;
        document.getElementById('btnTimerStart').classList.add('hidden');
        document.getElementById('btnTimerPause').classList.remove('hidden');

        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            this.updateTimerDisplay();

            // 10초 이하 경고
            if (this.timerSeconds <= 10 && this.timerSeconds > 0) {
                document.getElementById('timerDisplay').parentElement.classList.add('timer-warning');
            }

            // 타이머 종료
            if (this.timerSeconds <= 0) {
                this.timerComplete();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isTimerRunning = false;
        clearInterval(this.timerInterval);
        document.getElementById('btnTimerStart').classList.remove('hidden');
        document.getElementById('btnTimerPause').classList.add('hidden');
    }

    resetTimer() {
        this.pauseTimer();

        // 활성화된 프리셋 찾기
        const activePreset = document.querySelector('.timer-preset.active');
        if (activePreset) {
            this.timerSeconds = parseInt(activePreset.dataset.time);
        } else {
            this.timerSeconds = 300;
        }

        this.updateTimerDisplay();
        document.getElementById('timerDisplay').parentElement.classList.remove('timer-warning');
    }

    timerComplete() {
        this.pauseTimer();
        document.getElementById('timerDisplay').parentElement.classList.remove('timer-warning');

        // 알림
        this.showToast('⏰ 시간이 종료되었습니다!');
        this.playAlertSound();
    }

    playAlertSound() {
        const settings = store.getSettings();
        if (settings.timerAlert === 'visualOnly') return;

        // 소리 알림 (Web Audio API)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;

            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                audioContext.close();
            }, 500);
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    // === 모둠별 타이머 ===

    startGroupTimer(groupId) {
        const timer = this.groupTimers[groupId];
        if (!timer || timer.seconds <= 0) return;

        timer.running = true;

        // UI 업데이트
        const startBtn = document.getElementById(`groupTimerStart-${groupId}`);
        const pauseBtn = document.getElementById(`groupTimerPause-${groupId}`);
        if (startBtn) startBtn.classList.add('hidden');
        if (pauseBtn) pauseBtn.classList.remove('hidden');

        timer.interval = setInterval(() => {
            timer.seconds--;
            this.updateGroupTimerDisplay(groupId);

            if (timer.seconds <= 0) {
                this.groupTimerComplete(groupId);
            }
        }, 1000);
    }

    pauseGroupTimer(groupId) {
        const timer = this.groupTimers[groupId];
        if (!timer) return;

        timer.running = false;
        clearInterval(timer.interval);

        // UI 업데이트
        const startBtn = document.getElementById(`groupTimerStart-${groupId}`);
        const pauseBtn = document.getElementById(`groupTimerPause-${groupId}`);
        if (startBtn) startBtn.classList.remove('hidden');
        if (pauseBtn) pauseBtn.classList.add('hidden');
    }

    resetGroupTimer(groupId) {
        this.pauseGroupTimer(groupId);

        const timer = this.groupTimers[groupId];
        if (timer) {
            timer.seconds = this.defaultTimerSeconds;
            this.updateGroupTimerDisplay(groupId);
        }
    }

    updateGroupTimerDisplay(groupId) {
        const timer = this.groupTimers[groupId];
        if (!timer) return;

        const display = document.getElementById(`groupTimerDisplay-${groupId}`);
        if (display) {
            const minutes = Math.floor(timer.seconds / 60);
            const seconds = timer.seconds % 60;
            display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // 10초 이하 경고
            if (timer.seconds <= 10 && timer.seconds > 0) {
                display.classList.add('text-red-600');
                display.classList.remove('text-gray-800');
            } else {
                display.classList.remove('text-red-600');
                display.classList.add('text-gray-800');
            }
        }
    }

    groupTimerComplete(groupId) {
        this.pauseGroupTimer(groupId);

        const group = this.currentGroups.find(g => g.id === groupId);
        const groupName = group ? `${group.id}모둠` : `모둠 ${groupId}`;

        this.showToast(`⏰ ${groupName} 시간 종료!`);
        this.playAlertSound();

        // 시각적 강조
        const timerEl = document.querySelector(`[data-group-timer="${groupId}"]`);
        if (timerEl) {
            timerEl.classList.add('timer-warning');
            setTimeout(() => timerEl.classList.remove('timer-warning'), 3000);
        }
    }

    stopAllGroupTimers() {
        Object.keys(this.groupTimers).forEach(groupId => {
            this.pauseGroupTimer(parseInt(groupId));
        });
    }

    // 모든 모둠 타이머 일괄 시작
    startAllGroupTimers() {
        Object.keys(this.groupTimers).forEach(groupId => {
            const timer = this.groupTimers[groupId];
            if (!timer.running && timer.seconds > 0) {
                this.startGroupTimer(parseInt(groupId));
            }
        });
    }

    // 모든 모둠 타이머 일괄 리셋
    resetAllGroupTimers() {
        Object.keys(this.groupTimers).forEach(groupId => {
            this.resetGroupTimer(parseInt(groupId));
        });
    }

    // === 설정 모달 ===

    openSettingsModal() {
        const settings = store.getSettings();

        // 현재 설정 반영
        document.querySelector(`input[name="cookieMode"][value="${settings.cookieMode}"]`).checked = true;
        document.querySelector(`input[name="timerAlert"][value="${settings.timerAlert}"]`).checked = true;
        document.getElementById('animationEnabled').checked = settings.animationEnabled !== false;

        document.getElementById('settingsModal').classList.remove('hidden');
    }

    closeSettingsModal() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    updateCookieMode(mode) {
        const settings = store.getSettings();
        settings.cookieMode = mode;
        store.saveSettings(settings);
        this.showToast(mode === 'cumulative' ? '누적 모드로 변경됨' : '일회성 모드로 변경됨');
    }

    updateTimerAlert(alertType) {
        const settings = store.getSettings();
        settings.timerAlert = alertType;
        store.saveSettings(settings);
    }

    updateAnimationEnabled(enabled) {
        const settings = store.getSettings();
        settings.animationEnabled = enabled;
        store.saveSettings(settings);
    }

    // === 통계 모달 ===

    openStatsModal() {
        this.closeSettingsModal();
        this.renderStats();
        document.getElementById('statsModal').classList.remove('hidden');
    }

    closeStatsModal() {
        document.getElementById('statsModal').classList.add('hidden');
    }

    renderStats() {
        const container = document.getElementById('statsContent');

        if (!this.currentClassId) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">학급을 선택해주세요</p>';
            return;
        }

        const cls = store.getClassById(this.currentClassId);
        const stats = store.getCookieStats(this.currentClassId);
        const history = store.getCookieHistoryByClass(this.currentClassId);

        // 학생별 쿠키 순위
        const sortedStudents = Object.entries(stats)
            .sort((a, b) => b[1] - a[1]);

        let html = `
            <div class="mb-4">
                <h3 class="font-bold text-gray-800 mb-2">${cls.name}</h3>
                <p class="text-sm text-gray-500">총 ${history.length}회 기록</p>
            </div>
        `;

        if (sortedStudents.length === 0) {
            html += '<p class="text-gray-500 text-center py-4">아직 저장된 쿠키 기록이 없습니다</p>';
        } else {
            html += '<div class="space-y-2">';
            sortedStudents.forEach(([name, cookies], idx) => {
                const rank = idx + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                html += `
                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span class="flex items-center gap-2">
                            <span class="w-6 text-center text-sm text-gray-500">${medal || rank}</span>
                            <span>${name}</span>
                        </span>
                        <span class="font-bold text-amber-600">🍪 ${cookies}</span>
                    </div>
                `;
            });
            html += '</div>';
        }

        // 최근 기록
        if (history.length > 0) {
            html += `
                <div class="mt-6 pt-4 border-t border-gray-200">
                    <h4 class="font-bold text-gray-700 mb-2">최근 기록</h4>
                    <div class="space-y-1 text-sm">
            `;
            history.slice(-5).reverse().forEach(record => {
                const date = new Date(record.date).toLocaleDateString('ko-KR');
                const totalCookies = record.groups.reduce((sum, g) => sum + g.cookies, 0);
                html += `
                    <div class="flex justify-between text-gray-600">
                        <span>${date}</span>
                        <span>🍪 ${totalCookies}</span>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        container.innerHTML = html;
    }

    saveCookieRecord() {
        if (!this.currentClassId || this.currentGroups.length === 0) {
            this.showToast('저장할 모둠 정보가 없습니다');
            return;
        }

        const totalCookies = this.currentGroups.reduce((sum, g) => sum + g.cookies, 0);
        if (totalCookies === 0) {
            this.showToast('부여된 쿠키가 없습니다');
            return;
        }

        store.addCookieRecord(this.currentClassId, this.currentGroups);
        this.renderStats();
        this.showToast('쿠키 기록이 저장되었습니다');
    }

    clearCookieHistory() {
        if (!this.currentClassId) {
            this.showToast('학급을 선택해주세요');
            return;
        }

        if (confirm('이 학급의 모든 쿠키 기록을 삭제하시겠습니까?')) {
            store.clearCookieHistory(this.currentClassId);
            this.renderStats();
            this.showToast('쿠키 기록이 초기화되었습니다');
        }
    }

    // === 유틸리티 ===

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        toastMessage.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 앱 초기화
const app = new App();
