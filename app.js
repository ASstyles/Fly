/* ==========================================================================
   FUEL TO FLY 4.0 - APP LOGIC
   ========================================================================== */

// --- Constants & Database Config ---
const STORAGE_PREFIX = 'ftf4_';
const DB_NAME = 'FuelToFlyRecordings';
const STORE_NAME = 'recordings';

const PRELOADED_TEAMS = [
    {
        id: 'team-1',
        number: '101',
        name: 'Team Horizon',
        schoolName: 'Horizon Academy',
        theme: 'Sustainability',
        productServiceName: 'AquaFilter Smart',
        ideaDescription: 'A self-cleaning smart solar water filter that measures purity levels in real time.',
        presentationRoom: 'Room A'
    },
    {
        id: 'team-2',
        number: '102',
        name: 'Team TechCare',
        schoolName: 'Saint Mary School',
        theme: 'Accessibility',
        productServiceName: 'SignTranslate Pro',
        ideaDescription: 'A wearable glove that translates sign language gestures into text and spoken audio.',
        presentationRoom: 'Room B'
    },
    {
        id: 'team-3',
        number: '103',
        name: 'Team EcoSorters',
        schoolName: 'Greenwood High',
        theme: 'Sustainability',
        productServiceName: 'SortWise Bin',
        ideaDescription: 'An AI-powered segregation bin that sorts municipal waste automatically at public disposal points.',
        presentationRoom: 'Room A'
    },
    {
        id: 'team-4',
        number: '104',
        name: 'Team Guardian',
        schoolName: 'City School',
        theme: 'Safety',
        productServiceName: 'SafeStep Mat',
        ideaDescription: 'A smart pressure-sensitive floor mat designed to detect falls in elderly care homes and alert guardians.',
        presentationRoom: 'Room C'
    },
    {
        id: 'team-5',
        number: '105',
        name: 'Team MindBloom',
        schoolName: 'DPS International',
        theme: 'Mental & Emotional Well-being',
        productServiceName: 'CalmSphere App',
        ideaDescription: 'A biometrics-integrated mobile app that provides real-time micro-meditation sessions for anxious students.',
        presentationRoom: 'Room D'
    },
    {
        id: 'team-6',
        number: '106',
        name: 'Team SolarStream',
        schoolName: 'Orchard Valley High',
        theme: 'Sustainability',
        productServiceName: 'SolarGrid IoT',
        ideaDescription: 'A decentralized micro-solar grid optimizer monitoring local energy storage and trading.',
        presentationRoom: 'Room A'
    },
    {
        id: 'team-7',
        number: '107',
        name: 'Team NeuroShield',
        schoolName: 'St. Jude School',
        theme: 'Safety',
        productServiceName: 'HelmetPulse',
        ideaDescription: 'A smart motorcycle helmet with automated crash warning system and SOS reporting.',
        presentationRoom: 'Room C'
    },
    {
        id: 'team-8',
        number: '108',
        name: 'Team BrailleRead',
        schoolName: 'National School for Blind',
        theme: 'Accessibility',
        productServiceName: 'TactileBook Reader',
        ideaDescription: 'A low-cost dynamic refreshable Braille reader that translates digital text on the fly.',
        presentationRoom: 'Room B'
    }
];

// --- IndexedDB Operations ---
function initDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function saveRecordingBlob(key, blob) {
    return initDb().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(blob, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

function getRecordingBlob(key) {
    return initDb().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}

function deleteRecordingBlob(key) {
    return initDb().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

function clearAllRecordings() {
    return initDb().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

// --- App State ---
const State = {
    judgeName: '',
    currentRound: '', // 'Round 1' or 'Round 2'
    selectedTeamId: '',
    activeScreen: 'screen-welcome',
    historyStack: [],
    
    // Core Collections
    teams: [],
    evaluations: [],
    awardManualOverrides: {}, // Format: { awardId: "Manual Team Name" }

    // Media Recording State
    mediaRecorder: null,
    recordedChunks: [],
    recordingTimer: null,
    recordingDurationSeconds: 0,
    activeRecordingBlob: null,
    activeRecordingType: null, // 'audio' or 'video'
    activeRecordingKey: null, // IDB storage key

    // Scoring parameters max limits
    limits: {
        originalityInnovation: 15,
        feasibilityPracticality: 5,
        marketPotential: 10,
        impactAccessibilityInclusion: 15,
        presentationQuality: 5
    }
};

// --- Helper functions ---
function renderIcons() {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        try {
            lucide.createIcons();
        } catch (e) {
            console.warn('Failed to render lucide icons:', e);
        }
    }
}

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    loadLocalData();
    setupEventListeners();
    navigateToScreen('screen-welcome', false);
});

// --- State Persistency ---
function loadLocalData() {
    // Load Judge Name
    State.judgeName = localStorage.getItem(STORAGE_PREFIX + 'judgeName') || '';
    if (State.judgeName) {
        document.getElementById('judge-name-input').value = State.judgeName;
        updateHeaderInfo();
    }

    // Load Teams
    const storedTeams = localStorage.getItem(STORAGE_PREFIX + 'teams');
    if (storedTeams) {
        State.teams = JSON.parse(storedTeams);
    } else {
        State.teams = [...PRELOADED_TEAMS];
        localStorage.setItem(STORAGE_PREFIX + 'teams', JSON.stringify(State.teams));
    }

    // Load Evaluations
    const storedEvaluations = localStorage.getItem(STORAGE_PREFIX + 'evaluations');
    if (storedEvaluations) {
        State.evaluations = JSON.parse(storedEvaluations);
    }

    // Load Award Overrides
    const storedAwards = localStorage.getItem(STORAGE_PREFIX + 'awardOverrides');
    if (storedAwards) {
        State.awardManualOverrides = JSON.parse(storedAwards);
    }
}

function saveEvaluationsToStorage() {
    localStorage.setItem(STORAGE_PREFIX + 'evaluations', JSON.stringify(State.evaluations));
}

function saveTeamsToStorage() {
    localStorage.setItem(STORAGE_PREFIX + 'teams', JSON.stringify(State.teams));
}

function saveAwardsToStorage() {
    localStorage.setItem(STORAGE_PREFIX + 'awardOverrides', JSON.stringify(State.awardManualOverrides));
}

// --- Routing & Screen Management ---
function navigateToScreen(screenId, pushHistory = true) {
    if (pushHistory && State.activeScreen !== screenId) {
        State.historyStack.push(State.activeScreen);
    }

    // Hide all screens, show active one
    document.querySelectorAll('.screen').forEach(scr => {
        scr.classList.remove('active');
    });

    const activeEl = document.getElementById(screenId);
    if (activeEl) {
        activeEl.classList.add('active');
        State.activeScreen = screenId;
    }

    // Show/Hide main header
    const mainHeader = document.getElementById('main-header');
    if (screenId === 'screen-welcome') {
        mainHeader.style.display = 'none';
    } else {
        mainHeader.style.display = 'block';
    }

    // Execute Screen Entry Tasks
    onScreenEntry(screenId);

    // Render Lucide icons
    renderIcons();

    // Scroll to top
    window.scrollTo(0, 0);
}

function handleBackNavigation() {
    // Stop recording if active
    if (State.mediaRecorder && State.mediaRecorder.state !== 'inactive') {
        stopRecordingAction(false);
    }

    if (State.historyStack.length > 0) {
        const prevScreen = State.historyStack.pop();
        navigateToScreen(prevScreen, false);
    } else {
        navigateToScreen('screen-welcome', false);
    }
}

function onScreenEntry(screenId) {
    switch (screenId) {
        case 'screen-welcome':
            // If judge name already loaded, ensure buttons reflect dashboard state
            break;
        case 'screen-team-select':
            renderTeamSelectScreen();
            break;
        case 'screen-score':
            setupScoringScreen();
            break;
        case 'screen-summary':
            renderSummaryScreen();
            break;
        case 'screen-detail':
            renderDetailScreen();
            break;
        case 'screen-export':
            // Reset import state
            document.getElementById('import-json-file').value = '';
            document.getElementById('import-file-name').textContent = 'No file chosen';
            document.getElementById('btn-import-confirm').disabled = true;
            break;
    }
}

// Update App Header displaying Judge name and Selected Round
function updateHeaderInfo() {
    document.getElementById('header-judge-display').textContent = State.judgeName || 'Judge';
    document.getElementById('header-round-display').textContent = State.currentRound || 'Round 1';
}

// --- SCREEN 3: TEAM SELECTION LOGIC ---
function renderTeamSelectScreen() {
    const searchVal = document.getElementById('team-search-input').value.toLowerCase();
    const activePill = document.querySelector('.theme-pill.active');
    const selectedTheme = activePill ? activePill.dataset.theme : 'All';
    const mountPoint = document.getElementById('teams-list-mount');
    
    mountPoint.innerHTML = '';

    // Filter teams based on Theme Pill & Search Input
    const filteredTeams = State.teams.filter(t => {
        const matchesTheme = (selectedTheme === 'All' || t.theme === selectedTheme);
        const matchesSearch = (
            t.name.toLowerCase().includes(searchVal) || 
            t.number.toLowerCase().includes(searchVal) || 
            t.productServiceName.toLowerCase().includes(searchVal) ||
            t.schoolName.toLowerCase().includes(searchVal)
        );
        return matchesTheme && matchesSearch;
    });

    document.getElementById('team-count-display').textContent = `${filteredTeams.length} Teams Available`;

    if (filteredTeams.length === 0) {
        mountPoint.innerHTML = `
            <div class="empty-media-state">
                <i data-lucide="info"></i>
                <span>No teams match your search or filter options.</span>
            </div>
        `;
        renderIcons();
        return;
    }

    filteredTeams.forEach(team => {
        // Find existing evaluation in selected round
        const evaluation = State.evaluations.find(ev => ev.teamId === team.id && ev.roundName === State.currentRound);
        const hasDraft = localStorage.getItem(`${STORAGE_PREFIX}draft_${State.currentRound}_${team.id}`) !== null;
        
        let statusClass = 'not-started';
        let statusText = 'Not Scored';
        let scoreDisplay = '';

        if (evaluation) {
            statusClass = 'evaluated';
            statusText = 'Scored';
            scoreDisplay = `<div class="evaluation-score-bubble color-success">${evaluation.totalScore}/50</div>`;
        } else if (hasDraft) {
            statusClass = 'draft';
            statusText = 'Draft Saved';
            scoreDisplay = `<div class="evaluation-score-bubble color-warning">Draft</div>`;
        }

        const card = document.createElement('div');
        card.className = `team-select-card ${statusClass}`;
        card.innerHTML = `
            <div class="team-info-left">
                <div class="team-num-badge">TEAM #${team.number}</div>
                <div class="team-name-title">${team.name}</div>
                <div class="team-idea-prod">${team.productServiceName}</div>
                <span class="team-tag-pill"><i data-lucide="tag"></i> ${team.theme}</span>
            </div>
            <div class="team-info-right">
                <div class="evaluation-status-label label-${statusClass}">
                    <i data-lucide="${statusClass === 'evaluated' ? 'check-circle' : (statusClass === 'draft' ? 'edit-2' : 'circle')}"></i>
                    ${statusText}
                </div>
                ${scoreDisplay}
            </div>
        `;

        card.addEventListener('click', () => {
            State.selectedTeamId = team.id;
            navigateToScreen('screen-score');
        });

        mountPoint.appendChild(card);
    });

    renderIcons();
}

// Add Manual Team Creation logic
function setupManualTeamActions() {
    const triggerBtn = document.getElementById('btn-trigger-add-team');
    const formPanel = document.getElementById('add-team-panel');
    const cancelBtn = document.getElementById('btn-cancel-add-team');
    const saveBtn = document.getElementById('btn-save-new-team');

    triggerBtn.addEventListener('click', () => {
        formPanel.style.display = formPanel.style.display === 'none' ? 'block' : 'none';
        triggerBtn.innerHTML = formPanel.style.display === 'none' ? '<i data-lucide="plus"></i> Add New Team' : '<i data-lucide="chevron-up"></i> Close Form';
        renderIcons();
    });

    cancelBtn.addEventListener('click', () => {
        formPanel.style.display = 'none';
        triggerBtn.innerHTML = '<i data-lucide="plus"></i> Add New Team';
        renderIcons();
        clearManualTeamForm();
    });

    saveBtn.addEventListener('click', () => {
        const name = document.getElementById('new-team-name').value.trim();
        const number = document.getElementById('new-team-number').value.trim();
        const school = document.getElementById('new-school-name').value.trim();
        const theme = document.getElementById('new-team-theme').value;
        const product = document.getElementById('new-product-name').value.trim();
        const desc = document.getElementById('new-idea-desc').value.trim();
        const room = document.getElementById('new-presentation-room').value.trim();

        if (!name || !number || !product) {
            showToast('Please fill in Team Name, Number, and Product fields.', 'alert-triangle');
            return;
        }

        // Check if number or name already exists
        const numberExists = State.teams.some(t => t.number === number);
        if (numberExists) {
            showToast(`Team number ${number} already exists!`, 'alert-triangle');
            return;
        }

        const newTeam = {
            id: 'team-' + Date.now(),
            number: number,
            name: name,
            schoolName: school,
            theme: theme,
            productServiceName: product,
            ideaDescription: desc,
            presentationRoom: room
        };

        State.teams.push(newTeam);
        saveTeamsToStorage();
        showToast(`Team "${name}" added successfully!`, 'check-circle');

        formPanel.style.display = 'none';
        triggerBtn.innerHTML = '<i data-lucide="plus"></i> Add New Team';
        clearManualTeamForm();
        renderTeamSelectScreen();
    });
}

function clearManualTeamForm() {
    document.getElementById('new-team-name').value = '';
    document.getElementById('new-team-number').value = '';
    document.getElementById('new-school-name').value = '';
    document.getElementById('new-team-theme').value = 'Sustainability';
    document.getElementById('new-product-name').value = '';
    document.getElementById('new-idea-desc').value = '';
    document.getElementById('new-presentation-room').value = '';
}


// --- SCREEN 4: SCORING LOGIC ---
function setupScoringScreen() {
    const team = State.teams.find(t => t.id === State.selectedTeamId);
    if (!team) return;

    // Reset scoring inputs & recorders
    resetScoringInputs();

    // Set Team Meta Info
    document.getElementById('score-team-title').textContent = team.name;
    document.getElementById('score-team-meta').textContent = `${State.currentRound} • Theme: ${team.theme}`;
    document.getElementById('score-brief-product').textContent = team.productServiceName;
    document.getElementById('score-brief-desc').textContent = team.ideaDescription || 'No description provided.';
    
    const schoolRow = document.getElementById('score-brief-school-row');
    if (team.schoolName) {
        schoolRow.style.display = 'flex';
        document.getElementById('score-brief-school').textContent = team.schoolName;
    } else {
        schoolRow.style.display = 'none';
    }

    // Set Draft ID for recording attachment
    State.activeRecordingKey = `rec_${State.currentRound}_${team.id}`;

    // Load Existing Evaluation OR Draft OR defaults
    const evalData = State.evaluations.find(ev => ev.teamId === team.id && ev.roundName === State.currentRound);
    const draftData = localStorage.getItem(`${STORAGE_PREFIX}draft_${State.currentRound}_${team.id}`);

    if (evalData) {
        populateScoringInputs(evalData);
        checkSavedRecordingAvailable(State.activeRecordingKey);
    } else if (draftData) {
        populateScoringInputs(JSON.parse(draftData));
        checkSavedRecordingAvailable(State.activeRecordingKey);
        showToast('Restored draft scores.', 'info');
    } else {
        // Defaults: 0s, trigger live total update
        updateScoringTotal();
    }
}

function resetScoringInputs() {
    // Slider values
    document.querySelectorAll('.score-slider').forEach(slider => {
        slider.value = 0;
    });
    // Number boxes
    document.querySelectorAll('.score-num-input').forEach(input => {
        input.value = 0;
    });

    // Notes
    document.getElementById('notes-strengths').value = '';
    document.getElementById('notes-concerns').value = '';
    document.getElementById('notes-inclusion').value = '';
    document.getElementById('notes-next-steps').value = '';
    document.getElementById('notes-overall').value = '';

    // Recording State
    State.activeRecordingBlob = null;
    State.activeRecordingType = null;
    document.getElementById('recording-preview-box').style.display = 'none';
    document.getElementById('preview-media-mount').innerHTML = '';
    updateRecordingUI('No recording attached', '00:00', false);
}

function populateScoringInputs(data) {
    // Sub-scores
    document.getElementById('score-input-originality-range').value = data.scores.originalityInnovation;
    document.getElementById('score-input-originality-num').value = data.scores.originalityInnovation;
    
    document.getElementById('score-input-feasibility-range').value = data.scores.feasibilityPracticality;
    document.getElementById('score-input-feasibility-num').value = data.scores.feasibilityPracticality;
    
    document.getElementById('score-input-market-range').value = data.scores.marketPotential;
    document.getElementById('score-input-market-num').value = data.scores.marketPotential;
    
    document.getElementById('score-input-impact-range').value = data.scores.impactAccessibilityInclusion;
    document.getElementById('score-input-impact-num').value = data.scores.impactAccessibilityInclusion;
    
    document.getElementById('score-input-presentation-range').value = data.scores.presentationQuality;
    document.getElementById('score-input-presentation-num').value = data.scores.presentationQuality;

    // Notes
    document.getElementById('notes-strengths').value = data.notes.strengths || '';
    document.getElementById('notes-concerns').value = data.notes.concerns || '';
    document.getElementById('notes-inclusion').value = data.notes.inclusionQuestion || '';
    document.getElementById('notes-next-steps').value = data.notes.nextStep || '';
    document.getElementById('notes-overall').value = data.notes.overallComment || '';

    updateScoringTotal();
}

function updateScoringTotal() {
    const orig = parseInt(document.getElementById('score-input-originality-num').value) || 0;
    const feas = parseInt(document.getElementById('score-input-feasibility-num').value) || 0;
    const markt = parseInt(document.getElementById('score-input-market-num').value) || 0;
    const impct = parseInt(document.getElementById('score-input-impact-num').value) || 0;
    const pres = parseInt(document.getElementById('score-input-presentation-num').value) || 0;

    const total = orig + feas + markt + impct + pres;
    document.getElementById('score-total-live').textContent = total.toString().padStart(2, '0');
    return total;
}

// Local draft autosave
function saveDraftEvaluation() {
    const team = State.teams.find(t => t.id === State.selectedTeamId);
    if (!team) return;

    const draft = getScoringData(team);
    localStorage.setItem(`${STORAGE_PREFIX}draft_${State.currentRound}_${team.id}`, JSON.stringify(draft));
    showToast('Draft saved successfully.', 'save');
}

// Package scoring fields into object schema
function getScoringData(team) {
    const orig = parseInt(document.getElementById('score-input-originality-num').value) || 0;
    const feas = parseInt(document.getElementById('score-input-feasibility-num').value) || 0;
    const markt = parseInt(document.getElementById('score-input-market-num').value) || 0;
    const impct = parseInt(document.getElementById('score-input-impact-num').value) || 0;
    const pres = parseInt(document.getElementById('score-input-presentation-num').value) || 0;

    const total = orig + feas + markt + impct + pres;

    return {
        evaluationId: `${State.currentRound}_${team.id}`,
        eventName: 'Fuel to Fly 4.0',
        judgeName: State.judgeName,
        roundName: State.currentRound,
        teamId: team.id,
        teamName: team.name,
        teamNumber: team.number,
        schoolName: team.schoolName,
        theme: team.theme,
        productServiceName: team.productServiceName,
        ideaDescription: team.ideaDescription,
        scores: {
            originalityInnovation: orig,
            feasibilityPracticality: feas,
            marketPotential: markt,
            impactAccessibilityInclusion: impct,
            presentationQuality: pres
        },
        totalScore: total,
        notes: {
            strengths: document.getElementById('notes-strengths').value.trim(),
            concerns: document.getElementById('notes-concerns').value.trim(),
            inclusionQuestion: document.getElementById('notes-inclusion').value.trim(),
            nextStep: document.getElementById('notes-next-steps').value.trim(),
            overallComment: document.getElementById('notes-overall').value.trim()
        },
        recording: {
            audioAvailable: State.activeRecordingType === 'audio',
            videoAvailable: State.activeRecordingType === 'video',
            fileName: State.activeRecordingType ? `${State.currentRound}_${team.name.replace(/\s+/g, '_')}.${State.activeRecordingType === 'audio' ? 'webm' : 'mp4'}` : '',
            storageKey: State.activeRecordingType ? State.activeRecordingKey : '',
            downloadStatus: 'Pending'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// Perform Save / Submit checks
function submitEvaluation(callback) {
    const team = State.teams.find(t => t.id === State.selectedTeamId);
    if (!team) return;

    // Strict Validations
    if (!State.currentRound) {
        showToast('Please select a evaluation round.', 'alert-triangle');
        return;
    }
    
    // Bounds validation checks
    const orig = parseInt(document.getElementById('score-input-originality-num').value);
    const feas = parseInt(document.getElementById('score-input-feasibility-num').value);
    const markt = parseInt(document.getElementById('score-input-market-num').value);
    const impct = parseInt(document.getElementById('score-input-impact-num').value);
    const pres = parseInt(document.getElementById('score-input-presentation-num').value);

    if (isNaN(orig) || isNaN(feas) || isNaN(markt) || isNaN(impct) || isNaN(pres)) {
        showToast('All evaluation fields are required.', 'alert-triangle');
        return;
    }

    if (orig < 0 || orig > 15 || feas < 0 || feas > 5 || markt < 0 || markt > 10 || impct < 0 || impct > 15 || pres < 0 || pres > 5) {
        showToast('Some scores exceed criteria bounds.', 'alert-triangle');
        return;
    }

    const finalData = getScoringData(team);
    const total = finalData.totalScore;

    // Warnings trigger modals
    // Case 1: Overwriting score
    const scoreExists = State.evaluations.some(ev => ev.teamId === team.id && ev.roundName === State.currentRound);
    
    if (scoreExists) {
        showConfirmationModal(
            'Overwrite Evaluation?',
            `You have already scored "${team.name}" in ${State.currentRound}. Saving this will overwrite the previous entry.`,
            () => performSaveStep(finalData, team.id, callback)
        );
        return;
    }

    // Case 2: Exceptionally low score
    if (total < 15) {
        showConfirmationModal(
            'Confirm Low Score',
            `You are saving a score of ${total}/50. This is exceptionally low (under 15 marks). Do you want to submit?`,
            () => performSaveStep(finalData, team.id, callback)
        );
        return;
    }

    // Case 3: Exceptionally high score
    if (total > 45) {
        showConfirmationModal(
            'Confirm High Score',
            `You are saving a score of ${total}/50. This is exceptionally high (over 45 marks). Do you want to submit?`,
            () => performSaveStep(finalData, team.id, callback)
        );
        return;
    }

    // Safe execution path
    performSaveStep(finalData, team.id, callback);
}

function performSaveStep(finalData, teamId, callback) {
    // Delete existing evaluation if present
    State.evaluations = State.evaluations.filter(ev => !(ev.teamId === teamId && ev.roundName === State.currentRound));
    
    // Add new
    State.evaluations.push(finalData);
    saveEvaluationsToStorage();

    // Clear Draft
    localStorage.removeItem(`${STORAGE_PREFIX}draft_${State.currentRound}_${teamId}`);

    // If media blob is loaded, confirm saving status
    if (State.activeRecordingBlob) {
        saveRecordingBlob(State.activeRecordingKey, State.activeRecordingBlob)
            .then(() => console.log('Blob saved to IndexedDB successfully.'))
            .catch(err => showToast('Failed to save pitch recording inside IndexedDB: ' + err.message, 'alert-triangle'));
    }

    showToast(`Evaluation for ${finalData.teamName} saved.`, 'check-circle');

    if (callback) {
        callback(finalData);
    }
}

// Next Team slider trigger
function getNextUnscoredTeamId() {
    const currentIndex = State.teams.findIndex(t => t.id === State.selectedTeamId);
    if (currentIndex === -1) return '';

    // Loop from next index to end, then wrap around
    for (let i = 1; i <= State.teams.length; i++) {
        const nextIdx = (currentIndex + i) % State.teams.length;
        const candidate = State.teams[nextIdx];
        const alreadyScored = State.evaluations.some(ev => ev.teamId === candidate.id && ev.roundName === State.currentRound);
        if (!alreadyScored && candidate.id !== State.selectedTeamId) {
            return candidate.id;
        }
    }
    
    // Default to the very next team index in array if all are evaluated
    const nextIdx = (currentIndex + 1) % State.teams.length;
    return State.teams[nextIdx].id;
}


// --- MEDIA RECORDER IMPLEMENTATION ---
function checkSavedRecordingAvailable(key) {
    getRecordingBlob(key).then(blob => {
        if (blob) {
            State.activeRecordingBlob = blob;
            State.activeRecordingType = blob.type.includes('video') ? 'video' : 'audio';
            
            updateRecordingUI(
                `${State.activeRecordingType === 'video' ? 'Video' : 'Audio'} recording loaded`, 
                'Available', 
                false
            );
            mountRecordingPreview(blob);
        }
    });
}

function startRecording(type) {
    const isVideo = (type === 'video');
    State.recordedChunks = [];
    State.activeRecordingType = type;
    
    const constraints = {
        audio: true,
        video: isVideo ? { facingMode: 'user', width: 640, height: 480 } : false
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            document.querySelector('.recording-card').classList.add('recording-active');
            
            // Handle visual display toggle
            document.getElementById('btn-rec-audio-start').style.display = 'none';
            document.getElementById('btn-rec-video-start').style.display = 'none';
            document.getElementById('btn-rec-stop').style.display = 'inline-flex';
            document.getElementById('recording-preview-box').style.display = 'none';

            State.mediaRecorder = new MediaRecorder(stream);
            
            State.mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    State.recordedChunks.push(e.data);
                }
            };

            State.mediaRecorder.onstop = () => {
                const mimeType = isVideo ? 'video/mp4' : 'audio/webm';
                const blob = new Blob(State.recordedChunks, { type: mimeType });
                State.activeRecordingBlob = blob;

                // Stop tracks to release camera/mic
                stream.getTracks().forEach(track => track.stop());

                // Mount UI Elements
                mountRecordingPreview(blob);
                
                document.querySelector('.recording-card').classList.remove('recording-active');
                document.getElementById('btn-rec-audio-start').style.display = 'inline-flex';
                document.getElementById('btn-rec-video-start').style.display = 'inline-flex';
                document.getElementById('btn-rec-stop').style.display = 'none';

                updateRecordingUI(`${isVideo ? 'Video' : 'Audio'} recorded`, formatTime(State.recordingDurationSeconds), false);
                showToast('Recording completed successfully.', 'check-circle');
            };

            // Start clock
            State.recordingDurationSeconds = 0;
            updateRecordingUI('Recording...', '00:00', true);
            State.recordingTimer = setInterval(() => {
                State.recordingDurationSeconds++;
                document.getElementById('recording-timer').textContent = formatTime(State.recordingDurationSeconds);
            }, 1000);

            State.mediaRecorder.start();
        })
        .catch(err => {
            console.error('Permission denied or camera issues:', err);
            showToast('Unable to access media recording hardware permissions.', 'alert-triangle');
        });
}

function stopRecordingAction(save = true) {
    if (State.mediaRecorder && State.mediaRecorder.state !== 'inactive') {
        clearInterval(State.recordingTimer);
        State.mediaRecorder.stop();
    }
}

function mountRecordingPreview(blob) {
    const mount = document.getElementById('preview-media-mount');
    mount.innerHTML = '';

    const previewBox = document.getElementById('recording-preview-box');
    previewBox.style.display = 'block';

    const url = URL.createObjectURL(blob);
    
    if (blob.type.includes('video')) {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.playsInline = true;
        mount.appendChild(video);
    } else {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        mount.appendChild(audio);
    }
}

function deleteRecordingAction() {
    showConfirmationModal(
        'Delete Recording?',
        'This will remove the media recording for this team. This action is irreversible.',
        () => {
            deleteRecordingBlob(State.activeRecordingKey).then(() => {
                State.activeRecordingBlob = null;
                State.activeRecordingType = null;
                
                document.getElementById('recording-preview-box').style.display = 'none';
                document.getElementById('preview-media-mount').innerHTML = '';
                updateRecordingUI('No recording attached', '00:00', false);
                
                // Update evaluation metadata if scored
                const evalData = State.evaluations.find(ev => ev.teamId === State.selectedTeamId && ev.roundName === State.currentRound);
                if (evalData) {
                    evalData.recording.audioAvailable = false;
                    evalData.recording.videoAvailable = false;
                    evalData.recording.fileName = '';
                    evalData.recording.storageKey = '';
                    saveEvaluationsToStorage();
                }

                showToast('Recording deleted.', 'trash-2');
            });
        }
    );
}

function downloadActiveRecording() {
    if (!State.activeRecordingBlob) return;
    
    const team = State.teams.find(t => t.id === State.selectedTeamId);
    const suffix = State.activeRecordingType === 'video' ? 'mp4' : 'webm';
    const filename = `${State.currentRound}_${team.name.replace(/\s+/g, '_')}_pitch.${suffix}`;
    
    const url = URL.createObjectURL(State.activeRecordingBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Update download status inside evaluation details
    const evalData = State.evaluations.find(ev => ev.teamId === State.selectedTeamId && ev.roundName === State.currentRound);
    if (evalData) {
        evalData.recording.downloadStatus = 'Downloaded';
        saveEvaluationsToStorage();
    }
}

function updateRecordingUI(statusText, timerText, isRecording) {
    document.getElementById('recording-status-text').textContent = statusText;
    document.getElementById('recording-timer').textContent = timerText;
    
    const visualizer = document.querySelector('.recording-card');
    if (isRecording) {
        visualizer.classList.add('recording-active');
    } else {
        visualizer.classList.remove('recording-active');
    }
}

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}


// --- SCREEN 6: SUMMARY DASHBOARD & AWARD LOGIC ---

// Sorting logic with tie-breaking rules
function getSortedEvaluations(roundFilter, themeFilter, sortKey) {
    let filtered = State.evaluations.filter(ev => {
        const matchesRound = (roundFilter === 'All' || ev.roundName === roundFilter);
        const matchesTheme = (themeFilter === 'All' || ev.theme === themeFilter);
        return matchesRound && matchesTheme;
    });

    // Custom sorting engine applying requested tie-breakers
    filtered.sort((a, b) => {
        // Primary sort key (typically totalScore)
        let primaryDiff = 0;
        if (sortKey === 'totalScore') {
            primaryDiff = b.totalScore - a.totalScore;
        } else {
            primaryDiff = b.scores[sortKey] - a.scores[sortKey];
            if (primaryDiff === 0) {
                // fallback to totalScore if sorting by subscore
                primaryDiff = b.totalScore - a.totalScore;
            }
        }

        if (primaryDiff !== 0) return primaryDiff;

        // TIE BREAKER 1: Accessibility & Inclusion Impact
        const tie1 = b.scores.impactAccessibilityInclusion - a.scores.impactAccessibilityInclusion;
        if (tie1 !== 0) return tie1;

        // TIE BREAKER 2: Innovation
        const tie2 = b.scores.originalityInnovation - a.scores.originalityInnovation;
        if (tie2 !== 0) return tie2;

        // TIE BREAKER 3: Feasibility
        const tie3 = b.scores.feasibilityPracticality - a.scores.feasibilityPracticality;
        if (tie3 !== 0) return tie3;

        // TIE BREAKER 4: Presentation
        const tie4 = b.scores.presentationQuality - a.scores.presentationQuality;
        if (tie4 !== 0) return tie4;

        return 0; // Absolute tie
    });

    // Tag ties inside the filtered array
    for (let i = 0; i < filtered.length; i++) {
        filtered[i].isTie = false;
        filtered[i].rank = i + 1; // Temporary layout rank
    }

    for (let i = 0; i < filtered.length - 1; i++) {
        const current = filtered[i];
        const next = filtered[i + 1];
        
        // If total score and ALL tie-breaker scores are equal, flag them as tied
        const absoluteTie = (
            current.totalScore === next.totalScore &&
            current.scores.impactAccessibilityInclusion === next.scores.impactAccessibilityInclusion &&
            current.scores.originalityInnovation === next.scores.originalityInnovation &&
            current.scores.feasibilityPracticality === next.scores.feasibilityPracticality &&
            current.scores.presentationQuality === next.scores.presentationQuality
        );

        if (absoluteTie) {
            current.isTie = true;
            next.isTie = true;
            next.rank = current.rank; // Display identical rank numbers
        }
    }

    return filtered;
}

function renderSummaryScreen() {
    const roundBtn = document.querySelector('[data-summary-round].active');
    const selectedRound = roundBtn ? roundBtn.dataset.summaryRound : 'Round 1';
    const selectedTheme = document.getElementById('summary-theme-select').value;
    const sortKey = document.getElementById('summary-sort-select').value;

    const listMount = document.getElementById('rankings-list-mount');
    const tieBanner = document.getElementById('tie-warning-banner');

    listMount.innerHTML = '';
    
    const sortedEvals = getSortedEvaluations(selectedRound, selectedTheme, sortKey);

    // Show tie warning banner if ties detected in list
    const hasTies = sortedEvals.some(ev => ev.isTie);
    tieBanner.style.display = hasTies ? 'flex' : 'none';

    if (sortedEvals.length === 0) {
        listMount.innerHTML = `
            <div class="empty-media-state">
                <i data-lucide="award"></i>
                <span>No evaluation records found for filters.</span>
            </div>
        `;
        renderIcons();
        renderAwardSuggestions(selectedRound); // Update award cards
        return;
    }

    sortedEvals.forEach(ev => {
        const hasRec = ev.recording.audioAvailable || ev.recording.videoAvailable;
        
        const card = document.createElement('div');
        card.className = `rank-card rank-${ev.rank}`;
        card.innerHTML = `
            <div class="rank-number-box">${ev.rank}</div>
            <div class="rank-details-main">
                <div class="rank-team-line">
                    <span class="rank-team-name">${ev.teamName}</span>
                    ${ev.isTie ? '<span class="rank-tie-tag">Tie</span>' : ''}
                </div>
                <div class="rank-idea-line">${ev.productServiceName} • ${ev.theme}</div>
                <div class="rank-indicators-line">
                    <span class="rank-indicator-badge">
                        <i data-lucide="accessibility" style="width:11px;height:11px;"></i> Inclusion: ${ev.scores.impactAccessibilityInclusion}
                    </span>
                    ${hasRec ? '<span class="rank-indicator-badge"><i data-lucide="mic" style="width:11px;height:11px;"></i> Rec</span>' : ''}
                    ${ev.notes.strengths || ev.notes.concerns ? '<span class="rank-indicator-badge"><i data-lucide="message-square" style="width:11px;height:11px;"></i> Notes</span>' : ''}
                </div>
            </div>
            <div class="rank-score-side">
                <div class="rank-total-marks">${ev.totalScore}/50</div>
                <div class="rank-round-lbl">${ev.roundName}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            State.selectedTeamId = ev.teamId;
            State.currentRound = ev.roundName;
            updateHeaderInfo();
            navigateToScreen('screen-detail');
        });

        listMount.appendChild(card);
    });

    renderIcons();
    
    // Auto populate recommended awards
    renderAwardSuggestions(selectedRound);
}

// Award calculations
function renderAwardSuggestions(activeRound) {
    const mount = document.getElementById('awards-mount');
    mount.innerHTML = '';

    // Calculate suggestions based only on the current round's evaluations
    const evals = State.evaluations.filter(ev => activeRound === 'All' || ev.roundName === activeRound);
    
    if (evals.length === 0) {
        mount.innerHTML = `
            <div class="empty-media-state">
                <span>Score teams to generate award suggestions.</span>
            </div>
        `;
        return;
    }

    const awards = [
        {
            id: 'sustainable',
            title: 'Most Sustainable Idea',
            icon: 'leaf',
            suggest: () => {
                const list = evals.filter(ev => ev.theme === 'Sustainability');
                if (list.length === 0) return 'No Sustainability Teams';
                // Find highest Impact
                list.sort((a,b) => b.scores.impactAccessibilityInclusion - a.scores.impactAccessibilityInclusion || b.totalScore - a.totalScore);
                return list[0].teamName;
            }
        },
        {
            id: 'inclusive',
            title: 'Best Inclusive Innovation',
            icon: 'accessibility',
            suggest: () => {
                // Highest impact Accessibility Score
                const list = [...evals];
                list.sort((a,b) => b.scores.impactAccessibilityInclusion - a.scores.impactAccessibilityInclusion || b.totalScore - a.totalScore);
                return list[0].teamName;
            }
        },
        {
            id: 'scalability',
            title: 'High Scalability Potential',
            icon: 'trending-up',
            suggest: () => {
                // Combined Market (10) + Feasibility (5)
                const list = [...evals];
                list.sort((a,b) => {
                    const sumB = b.scores.marketPotential + b.scores.feasibilityPracticality;
                    const sumA = a.scores.marketPotential + a.scores.feasibilityPracticality;
                    return sumB - sumA || b.totalScore - a.totalScore;
                });
                return list[0].teamName;
            }
        },
        {
            id: 'community',
            title: 'Community Impact Award',
            icon: 'users',
            suggest: () => {
                // High Impact Score overall
                const list = [...evals];
                list.sort((a,b) => b.scores.impactAccessibilityInclusion - a.scores.impactAccessibilityInclusion || b.totalScore - a.totalScore);
                return list[0].teamName;
            }
        }
    ];

    awards.forEach(award => {
        const suggestion = award.suggest();
        const storedOverrideKey = `${activeRound}_${award.id}`;
        const displayedWinner = State.awardManualOverrides[storedOverrideKey] || suggestion;

        const card = document.createElement('div');
        card.className = 'award-item-card';
        card.innerHTML = `
            <div class="award-icon-box">
                <i data-lucide="${award.icon}"></i>
            </div>
            <div class="award-content">
                <div class="award-title-label">${award.title}</div>
                <div class="award-winner-input-area">
                    <input type="text" id="award-winner-${award.id}" value="${displayedWinner}" placeholder="Winner name...">
                    <button class="btn-edit-award" data-award-id="${award.id}" title="Save manual override">
                        <i data-lucide="save" style="width:14px;height:14px;"></i>
                    </button>
                </div>
            </div>
        `;

        // Action to save manual award input overrides
        const input = card.querySelector('input');
        const saveBtn = card.querySelector('.btn-edit-award');
        
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = input.value.trim();
            if (val) {
                State.awardManualOverrides[storedOverrideKey] = val;
                saveAwardsToStorage();
                showToast('Award winner updated.', 'check-circle');
            }
        });

        mount.appendChild(card);
    });

    renderIcons();
}


// --- SCREEN 7: TEAM DETAILS VIEWER ---
function renderDetailScreen() {
    const team = State.teams.find(t => t.id === State.selectedTeamId);
    const ev = State.evaluations.find(e => e.teamId === State.selectedTeamId && e.roundName === State.currentRound);
    
    if (!team || !ev) {
        handleBackNavigation();
        return;
    }

    // Header values
    document.getElementById('detail-team-name').textContent = ev.teamName;
    document.getElementById('detail-product-name').textContent = ev.productServiceName || 'No Service Name';
    document.getElementById('detail-description').textContent = ev.ideaDescription || 'No description.';
    document.getElementById('detail-round').textContent = ev.roundName;
    document.getElementById('detail-theme').textContent = ev.theme;
    document.getElementById('detail-total-score').textContent = ev.totalScore;

    // Metadata
    document.getElementById('detail-team-number').textContent = ev.teamNumber;
    document.getElementById('detail-school-name').textContent = ev.schoolName || 'Anonymised';
    document.getElementById('detail-room').textContent = team.presentationRoom || '-';
    document.getElementById('detail-judge').textContent = ev.judgeName || '-';

    // Criteria subscore displays
    setDetailCriteriaRow('detail-score-originality', 'bar-originality', ev.scores.originalityInnovation, State.limits.originalityInnovation);
    setDetailCriteriaRow('detail-score-feasibility', 'bar-feasibility', ev.scores.feasibilityPracticality, State.limits.feasibilityPracticality);
    setDetailCriteriaRow('detail-score-market', 'bar-market', ev.scores.marketPotential, State.limits.marketPotential);
    setDetailCriteriaRow('detail-score-impact', 'bar-impact', ev.scores.impactAccessibilityInclusion, State.limits.impactAccessibilityInclusion);
    setDetailCriteriaRow('detail-score-presentation', 'bar-presentation', ev.scores.presentationQuality, State.limits.presentationQuality);

    // Notes
    document.getElementById('detail-notes-strengths').textContent = ev.notes.strengths || 'No strengths recorded.';
    document.getElementById('detail-notes-concerns').textContent = ev.notes.concerns || 'No concerns recorded.';
    document.getElementById('detail-notes-inclusion').textContent = ev.notes.inclusionQuestion || 'No accessibility inclusion feedback added.';
    document.getElementById('detail-notes-next-steps').textContent = ev.notes.nextStep || 'No next steps suggested.';
    document.getElementById('detail-notes-overall').textContent = ev.notes.overallComment || 'No comments.';

    // Media Details
    const recordMount = document.getElementById('detail-media-mount');
    recordMount.innerHTML = '';

    const availBox = document.getElementById('detail-recording-available');
    const unavailBox = document.getElementById('detail-recording-unavailable');

    const key = `rec_${State.currentRound}_${team.id}`;
    
    getRecordingBlob(key).then(blob => {
        if (blob) {
            availBox.style.display = 'block';
            unavailBox.style.display = 'none';

            const url = URL.createObjectURL(blob);
            if (blob.type.includes('video')) {
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.playsInline = true;
                recordMount.appendChild(video);
            } else {
                const audio = document.createElement('audio');
                audio.src = url;
                audio.controls = true;
                recordMount.appendChild(audio);
            }

            // Setup download button
            const dlBtn = document.getElementById('btn-detail-media-download');
            dlBtn.onclick = () => {
                const suffix = blob.type.includes('video') ? 'mp4' : 'webm';
                const filename = `${ev.roundName}_${ev.teamName.replace(/\s+/g, '_')}_pitch.${suffix}`;
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
            };
        } else {
            availBox.style.display = 'none';
            unavailBox.style.display = 'block';
        }
    }).catch(err => {
        availBox.style.display = 'none';
        unavailBox.style.display = 'block';
    });
}

function setDetailCriteriaRow(labelId, barId, score, max) {
    document.getElementById(labelId).textContent = score;
    const percent = (score / max) * 100;
    document.getElementById(barId).style.width = `${percent}%`;
}

function deleteEvaluationAction() {
    showConfirmationModal(
        'Delete Evaluation?',
        'Are you sure you want to delete this score card? This action will remove the score locally and cannot be undone.',
        () => {
            State.evaluations = State.evaluations.filter(ev => !(ev.teamId === State.selectedTeamId && ev.roundName === State.currentRound));
            saveEvaluationsToStorage();
            
            // Delete recording as well
            const key = `rec_${State.currentRound}_${State.selectedTeamId}`;
            deleteRecordingBlob(key).then(() => {
                showToast('Evaluation deleted.', 'trash-2');
                navigateToScreen('screen-summary');
            });
        }
    );
}

// --- SCREEN 8: DATA BACKUP / RESTORE / CSV EXPORT ---

// Download CSV format
function triggerCsvExport() {
    if (State.evaluations.length === 0) {
        showToast('No evaluations to export.', 'alert-triangle');
        return;
    }

    const headers = [
        'Rank', 'Team Number', 'Team Name', 'School Name', 'Round', 'Theme', 'Product / Service Name',
        'Originality & Innovation (15)', 'Feasibility & Practicality (5)', 'Market Potential (10)',
        'Social Impact, Accessibility & Inclusion (15)', 'Presentation Quality (5)', 'Total Score (50)',
        'Strengths', 'Concerns', 'Inclusion Question Answer', 'Suggested Next Step', 'Overall Comments', 'Date Created'
    ];

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.join(',') + '\n';

    // Group evaluations by round to correctly calculate ranking ranks
    const rounds = ['Round 1', 'Round 2'];
    let rankedEvals = [];

    rounds.forEach(r => {
        const sorted = getSortedEvaluations(r, 'All', 'totalScore');
        rankedEvals = [...rankedEvals, ...sorted];
    });

    rankedEvals.forEach(ev => {
        const row = [
            ev.rank,
            `"${ev.teamNumber}"`,
            `"${ev.teamName.replace(/"/g, '""')}"`,
            `"${(ev.schoolName || '').replace(/"/g, '""')}"`,
            `"${ev.roundName}"`,
            `"${ev.theme}"`,
            `"${(ev.productServiceName || '').replace(/"/g, '""')}"`,
            ev.scores.originalityInnovation,
            ev.scores.feasibilityPracticality,
            ev.scores.marketPotential,
            ev.scores.impactAccessibilityInclusion,
            ev.scores.presentationQuality,
            ev.totalScore,
            `"${(ev.notes.strengths || '').replace(/"/g, '""')}"`,
            `"${(ev.notes.concerns || '').replace(/"/g, '""')}"`,
            `"${(ev.notes.inclusionQuestion || '').replace(/"/g, '""')}"`,
            `"${(ev.notes.nextStep || '').replace(/"/g, '""')}"`,
            `"${(ev.notes.overallComment || '').replace(/"/g, '""')}"`,
            `"${ev.createdAt}"`
        ];
        csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FuelToFly4_EvaluationReport_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded.', 'check-circle');
}

// Download JSON Backup
function triggerJsonBackup() {
    const backup = {
        eventName: 'Fuel to Fly 4.0',
        judgeName: State.judgeName,
        teams: State.teams,
        evaluations: State.evaluations,
        awardOverrides: State.awardManualOverrides,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FuelToFly4_JSON_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON Backup downloaded.', 'check-circle');
}

// Restore JSON backup
function setupJsonRestore() {
    const fileInput = document.getElementById('import-json-file');
    const fileNameSpan = document.getElementById('import-file-name');
    const restoreBtn = document.getElementById('btn-import-confirm');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            restoreBtn.disabled = false;
        } else {
            fileNameSpan.textContent = 'No file chosen';
            restoreBtn.disabled = true;
        }
    });

    restoreBtn.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.eventName !== 'Fuel to Fly 4.0' || !Array.isArray(data.evaluations) || !Array.isArray(data.teams)) {
                    showToast('Invalid backup file. Missing critical evaluation metadata.', 'alert-triangle');
                    return;
                }

                showConfirmationModal(
                    'Restore Data?',
                    'This will completely overwrite current teams, scores, and judge assignments on this browser. Proceed?',
                    () => {
                        // Load data into state
                        State.judgeName = data.judgeName || '';
                        State.teams = data.teams;
                        State.evaluations = data.evaluations;
                        State.awardManualOverrides = data.awardOverrides || {};

                        // Save state to storage
                        localStorage.setItem(STORAGE_PREFIX + 'judgeName', State.judgeName);
                        saveTeamsToStorage();
                        saveEvaluationsToStorage();
                        saveAwardsToStorage();

                        document.getElementById('judge-name-input').value = State.judgeName;
                        updateHeaderInfo();

                        showToast('Database restored successfully!', 'check-circle');
                        navigateToScreen('screen-welcome');
                    }
                );
            } catch (err) {
                showToast('Failed to parse JSON file.', 'alert-triangle');
            }
        };
        reader.readAsText(file);
    });
}

// Copy Summary text to Clipboard
function triggerClipboardSummary() {
    const rounds = ['Round 1', 'Round 2'];
    let clipText = `### Fuel to Fly 4.0 Evaluation Summary\n`;
    clipText += `Judge: ${State.judgeName}\n`;
    clipText += `Date: ${new Date().toLocaleDateString()}\n\n`;

    rounds.forEach(r => {
        const list = getSortedEvaluations(r, 'All', 'totalScore');
        if (list.length > 0) {
            clipText += `#### ${r} Standings\n`;
            clipText += `Rank | Team | Theme | Total Score\n`;
            clipText += `---|---|---|---\n`;
            list.forEach(ev => {
                clipText += `${ev.rank} | ${ev.teamName} (#${ev.teamNumber}) | ${ev.theme} | **${ev.totalScore}/50**\n`;
            });
            clipText += `\n`;
        }
    });

    navigator.clipboard.writeText(clipText)
        .then(() => showToast('Summary copied to clipboard.', 'copy'))
        .catch(err => showToast('Clipboard copying failed.', 'alert-triangle'));
}

// Native printer layout generator
function triggerPrintSummary() {
    const mount = document.getElementById('print-mount');
    mount.innerHTML = '';

    const rounds = ['Round 1', 'Round 2'];
    let printHtml = `
        <div class="print-header">
            <h1>FUEL TO FLY 4.0</h1>
            <p>Entrepreneurship Conclave Evaluation Report</p>
        </div>
        <div class="print-meta-grid">
            <div><strong>Judge:</strong> ${State.judgeName || 'Amit Kothari'}</div>
            <div><strong>Print Date:</strong> ${new Date().toLocaleString()}</div>
        </div>
    `;

    rounds.forEach(r => {
        const sorted = getSortedEvaluations(r, 'All', 'totalScore');
        if (sorted.length > 0) {
            printHtml += `
                <h2 style="font-family:Outfit; margin-top:20px; font-size:14pt; border-bottom:2px solid #000;">${r} Standings</h2>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Team Number</th>
                            <th>Team Name</th>
                            <th>Theme</th>
                            <th>Product Name</th>
                            <th>Innovation (15)</th>
                            <th>Feasibility (5)</th>
                            <th>Market (10)</th>
                            <th>Impact (15)</th>
                            <th>Presentation (5)</th>
                            <th>Total (50)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            sorted.forEach(ev => {
                printHtml += `
                    <tr>
                        <td>${ev.rank}</td>
                        <td>${ev.teamNumber}</td>
                        <td><strong>${ev.teamName}</strong></td>
                        <td>${ev.theme}</td>
                        <td>${ev.productServiceName}</td>
                        <td>${ev.scores.originalityInnovation}</td>
                        <td>${ev.scores.feasibilityPracticality}</td>
                        <td>${ev.scores.marketPotential}</td>
                        <td>${ev.scores.impactAccessibilityInclusion}</td>
                        <td>${ev.scores.presentationQuality}</td>
                        <td><strong>${ev.totalScore}</strong></td>
                    </tr>
                `;
            });

            printHtml += `
                    </tbody>
                </table>
            `;
        }
    });

    // Append Notes detail sections for review
    printHtml += `<div class="print-notes-section"><h2>Judge Notes &amp; Comments Review</h2>`;
    
    rounds.forEach(r => {
        const sorted = getSortedEvaluations(r, 'All', 'totalScore');
        if (sorted.length > 0) {
            printHtml += `<h3 style="margin-top:15px; text-transform:uppercase;">${r} Detailed Observations</h3>`;
            sorted.forEach(ev => {
                printHtml += `
                    <div class="print-team-notes-card">
                        <h3><strong>${ev.teamName}</strong> (Total: ${ev.totalScore}/50)</h3>
                        <div class="print-notes-grid">
                            <div class="print-note-row"><strong>Strengths:</strong> ${ev.notes.strengths || '-'}</div>
                            <div class="print-note-row"><strong>Concerns:</strong> ${ev.notes.concerns || '-'}</div>
                            <div class="print-note-row"><strong>Inclusion Question:</strong> ${ev.notes.inclusionQuestion || '-'}</div>
                            <div class="print-note-row"><strong>Suggested Next Step:</strong> ${ev.notes.nextStep || '-'}</div>
                            <div class="print-note-row"><strong>Overall Comments:</strong> ${ev.notes.overallComment || '-'}</div>
                        </div>
                    </div>
                `;
            });
        }
    });

    printHtml += `</div>`;

    mount.innerHTML = printHtml;
    
    // Trigger native printing popup
    window.print();
}

function resetEntireDatabase() {
    showConfirmationModal(
        'Format Database?',
        'This will erase all evaluations, manual teams, and judge profiles from this browser. This cannot be undone.',
        () => {
            localStorage.clear();
            clearAllRecordings().then(() => {
                State.judgeName = '';
                State.currentRound = '';
                State.selectedTeamId = '';
                State.evaluations = [];
                State.awardManualOverrides = {};
                State.teams = [...PRELOADED_TEAMS];
                
                document.getElementById('judge-name-input').value = '';
                updateHeaderInfo();

                showToast('Database formatted successfully.', 'trash-2');
                navigateToScreen('screen-welcome');
            });
        }
    );
}

// --- UTILITY UI WIDGETS ---

// Toast Notifications
function showToast(message, iconName = 'info') {
    const toast = document.getElementById('app-toast');
    const msgSpan = document.getElementById('toast-message');
    const icon = document.getElementById('toast-icon');

    msgSpan.textContent = message;
    icon.setAttribute('data-lucide', iconName);
    renderIcons();

    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// Dynamic Modals
function showConfirmationModal(title, bodyText, onConfirm) {
    const modal = document.getElementById('app-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = bodyText;

    const cancelBtn = document.getElementById('btn-modal-cancel');
    const confirmBtn = document.getElementById('btn-modal-confirm');

    modal.style.display = 'flex';

    const handleClose = () => {
        modal.style.display = 'none';
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    cancelBtn.onclick = handleClose;
    confirmBtn.onclick = () => {
        handleClose();
        if (onConfirm) onConfirm();
    };
}


// --- EVENT LISTENERS INITIALIZATION ---
function setupEventListeners() {
    // Welcome Panel
    document.getElementById('btn-welcome-start').addEventListener('click', () => {
        const name = document.getElementById('judge-name-input').value.trim();
        if (!name) {
            showToast('Please enter your name.', 'alert-triangle');
            return;
        }
        State.judgeName = name;
        localStorage.setItem(STORAGE_PREFIX + 'judgeName', name);
        updateHeaderInfo();
        navigateToScreen('screen-round');
    });

    document.getElementById('btn-welcome-summary').addEventListener('click', () => {
        navigateToScreen('screen-summary');
    });

    document.getElementById('btn-welcome-export').addEventListener('click', () => {
        navigateToScreen('screen-export');
    });

    document.getElementById('btn-welcome-reset').addEventListener('click', () => {
        resetEntireDatabase();
    });

    // Choose Round Screen
    document.querySelectorAll('.round-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            State.currentRound = btn.dataset.round;
            updateHeaderInfo();
            navigateToScreen('screen-team-select');
        });
    });

    document.getElementById('btn-round-back').addEventListener('click', handleBackNavigation);

    // Team Selector Screen
    document.getElementById('btn-team-select-back').addEventListener('click', handleBackNavigation);
    
    document.getElementById('team-search-input').addEventListener('input', () => {
        renderTeamSelectScreen();
    });

    // Theme filter pills
    document.querySelectorAll('.theme-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.theme-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            renderTeamSelectScreen();
        });
    });

    setupManualTeamActions();

    // Scoring Panel Screen
    document.getElementById('btn-score-back').addEventListener('click', handleBackNavigation);

    // Slider <-> number input synchronization
    const syncSliderInput = (sliderId, inputId) => {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);

        slider.addEventListener('input', () => {
            input.value = slider.value;
            updateScoringTotal();
        });

        input.addEventListener('input', () => {
            let val = parseInt(input.value) || 0;
            const max = parseInt(slider.max);
            if (val < 0) val = 0;
            if (val > max) val = max;
            input.value = val;
            slider.value = val;
            updateScoringTotal();
        });
    };

    syncSliderInput('score-input-originality-range', 'score-input-originality-num');
    syncSliderInput('score-input-feasibility-range', 'score-input-feasibility-num');
    syncSliderInput('score-input-market-range', 'score-input-market-num');
    syncSliderInput('score-input-impact-range', 'score-input-impact-num');
    syncSliderInput('score-input-presentation-range', 'score-input-presentation-num');

    // Sticky save/draft commands
    document.getElementById('btn-score-draft').addEventListener('click', saveDraftEvaluation);
    
    document.getElementById('btn-score-save').addEventListener('click', () => {
        submitEvaluation((ev) => {
            // Populate Confirmation details
            document.getElementById('conf-team-intro').textContent = `"${ev.teamName}" has been successfully evaluated.`;
            document.getElementById('conf-round-display').textContent = ev.roundName;
            document.getElementById('conf-team-display').textContent = ev.teamName;
            document.getElementById('conf-score-value').textContent = ev.totalScore;
            
            navigateToScreen('screen-confirmation');
        });
    });

    document.getElementById('btn-score-save-next').addEventListener('click', () => {
        submitEvaluation(() => {
            const nextTeamId = getNextUnscoredTeamId();
            if (nextTeamId) {
                State.selectedTeamId = nextTeamId;
                setupScoringScreen();
                showToast('Switched to next team.', 'play');
            } else {
                showToast('All teams completed! Reviewing summary.', 'award');
                navigateToScreen('screen-summary');
            }
        });
    });

    // Recording actions
    document.getElementById('btn-rec-audio-start').addEventListener('click', () => startRecording('audio'));
    document.getElementById('btn-rec-video-start').addEventListener('click', () => startRecording('video'));
    document.getElementById('btn-rec-stop').addEventListener('click', () => stopRecordingAction(true));
    document.getElementById('btn-rec-delete').addEventListener('click', deleteRecordingAction);
    document.getElementById('btn-rec-download').addEventListener('click', downloadActiveRecording);

    // Confirmation Screen
    document.getElementById('btn-conf-next').addEventListener('click', () => {
        const nextId = getNextUnscoredTeamId();
        if (nextId) {
            State.selectedTeamId = nextId;
            navigateToScreen('screen-score');
        } else {
            showToast('All teams evaluated in this round.', 'info');
            navigateToScreen('screen-team-select');
        }
    });

    document.getElementById('btn-conf-summary').addEventListener('click', () => {
        navigateToScreen('screen-summary');
    });

    document.getElementById('btn-conf-edit').addEventListener('click', () => {
        navigateToScreen('screen-score');
    });

    // Summary screen
    document.getElementById('btn-summary-back').addEventListener('click', () => {
        navigateToScreen('screen-welcome', false);
        State.historyStack = [];
    });

    document.querySelectorAll('[data-summary-round]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-summary-round]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderSummaryScreen();
        });
    });

    document.getElementById('summary-theme-select').addEventListener('change', renderSummaryScreen);
    document.getElementById('summary-sort-select').addEventListener('change', renderSummaryScreen);
    
    document.getElementById('btn-summary-export-panel').addEventListener('click', () => {
        navigateToScreen('screen-export');
    });

    // Details panel screen
    document.getElementById('btn-detail-back').addEventListener('click', handleBackNavigation);
    
    document.getElementById('btn-detail-edit').addEventListener('click', () => {
        navigateToScreen('screen-score');
    });

    document.getElementById('btn-detail-delete').addEventListener('click', deleteEvaluationAction);

    // Export panel screen
    document.getElementById('btn-export-back').addEventListener('click', handleBackNavigation);
    document.getElementById('btn-export-csv').addEventListener('click', triggerCsvExport);
    document.getElementById('btn-export-json').addEventListener('click', triggerJsonBackup);
    document.getElementById('btn-export-clipboard').addEventListener('click', triggerClipboardSummary);
    document.getElementById('btn-export-print').addEventListener('click', triggerPrintSummary);

    setupJsonRestore();
}
