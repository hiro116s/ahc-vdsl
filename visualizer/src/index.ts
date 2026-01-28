import './styles.css';
import { ParsedModes, Frame, GridCommand, TwoDPlaneCommand, CanvasCommand, LineGraphCommand } from './types';
import { parseStderr } from './parser';
import { createCanvasSvg, renderGridFromCommand, render2DPlaneFromCommand, renderLineGraphFromCommand } from './renderer';

// DOM Elements
const seedInput = document.getElementById('seedInput') as HTMLInputElement;
const stderrInput = document.getElementById('stderrInput') as HTMLTextAreaElement;
const frameSlider = document.getElementById('frameSlider') as HTMLInputElement;
const frameNumberInput = document.getElementById('frameNumberInput') as HTMLInputElement;
const totalFramesDisplay = document.getElementById('totalFramesDisplay') as HTMLSpanElement;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
const speedValue = document.getElementById('speedValue') as HTMLSpanElement;
const prevBtn = document.getElementById('prevBtn') as HTMLButtonElement;
const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement;
const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const modeButtonsContainer = document.querySelector('.mode-buttons') as HTMLDivElement;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
const collapseAllBtn = document.getElementById('collapseAllBtn') as HTMLButtonElement;

// State
let parsedModes: ParsedModes = {};
let activeMode = "default";
let frames: Frame[] = [];
let currentFrameIndex = 0;
let isPlaying = false;
let playInterval: ReturnType<typeof setInterval> | null = null;
let currentStderrText = "";

// Event Listeners
seedInput.addEventListener('input', loadFilesForSeed);
refreshBtn.addEventListener('click', loadFilesForSeed);
stderrInput.addEventListener('input', parseAndVisualize);

frameSlider.addEventListener('input', (e) => {
    currentFrameIndex = parseInt((e.target as HTMLInputElement).value);
    renderCurrentFrame();
    updateControls();
});

frameNumberInput.addEventListener('change', (e) => {
    let val = parseInt((e.target as HTMLInputElement).value);
    if (isNaN(val)) val = 1;
    if (val < 1) val = 1;
    if (val > frames.length) val = frames.length;
    currentFrameIndex = val - 1;
    renderCurrentFrame();
    updateControls();
});

speedSlider.addEventListener('input', (e) => {
    const fps = parseInt((e.target as HTMLInputElement).value);
    speedValue.textContent = fps + "fps";
    if (isPlaying) {
        if (playInterval) clearInterval(playInterval);
        playInterval = setInterval(() => {
            if (currentFrameIndex < frames.length - 1) {
                currentFrameIndex++;
            } else {
                togglePlay();
                return;
            }
            renderCurrentFrame();
            updateControls();
        }, 1000 / fps);
    }
});

prevBtn.addEventListener('click', () => {
    if (currentFrameIndex > 0) {
        currentFrameIndex--;
        renderCurrentFrame();
        updateControls();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentFrameIndex < frames.length - 1) {
        currentFrameIndex++;
        renderCurrentFrame();
        updateControls();
    }
});

playBtn.addEventListener('click', togglePlay);

collapseAllBtn.addEventListener('click', () => {
    const details = document.querySelectorAll('details');
    const allOpen = Array.from(details).every(d => d.open);
    details.forEach(d => {
        if (allOpen) d.removeAttribute('open');
        else d.setAttribute('open', '');
    });
    collapseAllBtn.textContent = allOpen ? '入力欄を展開' : '入力欄を折り畳む';
});

function togglePlay(): void {
    if (isPlaying) {
        if (playInterval) clearInterval(playInterval);
        playBtn.textContent = 'Play';
        isPlaying = false;
    } else {
        if (frames.length > 0 && currentFrameIndex >= frames.length - 1) {
            currentFrameIndex = 0;
        }
        playBtn.textContent = 'Pause';
        isPlaying = true;
        const fps = parseInt(speedSlider.value);
        playInterval = setInterval(() => {
            if (currentFrameIndex < frames.length - 1) {
                currentFrameIndex++;
            } else {
                togglePlay();
                return;
            }
            renderCurrentFrame();
            updateControls();
        }, 1000 / fps);
    }
}

function updateControls(): void {
    frameSlider.value = String(currentFrameIndex);
    frameNumberInput.value = String(currentFrameIndex + 1);
    totalFramesDisplay.textContent = `/ ${Math.max(frames.length, 1)}`;

    const controls = document.getElementById('controls') as HTMLDivElement;
    if (frames.length <= 1) {
        controls.style.display = 'none';
    } else {
        controls.style.display = 'block';
    }
}

async function loadFilesForSeed(): Promise<void> {
    const seed = seedInput.value;
    stderrInput.value = "";

    try {
        const errRes = await fetch(`err/${seed}.txt`);

        if (errRes.ok) {
            const text = await errRes.text();
            currentStderrText = text;
            if (text.length > 1000) {
                stderrInput.value = text.substring(0, 1000) + "\n... (truncated)";
            } else {
                stderrInput.value = text;
            }
        } else {
            currentStderrText = "";
            stderrInput.value = "";
        }
    } catch (e) {
        console.error("Error loading files:", e);
    }

    parseAndVisualize();
}

function parseAndVisualize(e?: Event): void {
    if (e && e.target === stderrInput) {
        currentStderrText = stderrInput.value;
    }
    if (!currentStderrText && stderrInput.value) {
        currentStderrText = stderrInput.value;
    }

    const stderrText = currentStderrText;

    currentFrameIndex = 0;
    if (isPlaying) togglePlay();

    parsedModes = parseStderr(stderrText);

    const modes = Object.keys(parsedModes).filter(m => parsedModes[m].length > 0);
    if (modes.length === 0) modes.push("default");

    updateModeSelector(modes);

    if (parsedModes[activeMode] && parsedModes[activeMode].length > 0) {
        switchMode(activeMode);
    } else if (modes.length > 0) {
        switchMode(modes[0]);
    } else {
        switchMode("default");
    }
}

function updateModeSelector(modes: string[]): void {
    modeButtonsContainer.innerHTML = '';
    modes.sort();

    const defaultIdx = modes.indexOf("default");
    if (defaultIdx > -1) {
        modes.splice(defaultIdx, 1);
        modes.unshift("default");
    }

    modes.forEach(mode => {
        const btn = document.createElement('button');
        btn.className = 'mode-button';
        if (mode === activeMode) btn.classList.add('active');
        btn.textContent = mode;
        btn.dataset.mode = mode;
        btn.addEventListener('click', () => switchMode(mode));
        modeButtonsContainer.appendChild(btn);
    });
}

function switchMode(mode: string): void {
    activeMode = mode;
    frames = parsedModes[mode] || [];

    currentFrameIndex = 0;
    if (frames.length > 0) {
        frameSlider.max = String(frames.length - 1);
        currentFrameIndex = frames.length - 1;
    } else {
        frameSlider.max = "0";
    }

    const buttons = modeButtonsContainer.querySelectorAll('.mode-button');
    buttons.forEach(b => {
        const btnElement = b as HTMLButtonElement;
        if (btnElement.dataset.mode === mode) btnElement.classList.add('active');
        else btnElement.classList.remove('active');
    });

    updateControls();
    renderCurrentFrame();
}

function renderCurrentFrame(): void {
    const visContainer = document.getElementById('visSection') as HTMLDivElement;
    visContainer.innerHTML = '';

    visContainer.style.display = 'flex';
    visContainer.style.alignItems = 'flex-start';
    visContainer.style.gap = '20px';

    const canvasDiv = document.createElement('div');
    canvasDiv.style.flex = '0 0 auto';

    const infoDiv = document.createElement('div');
    infoDiv.style.width = '350px';
    infoDiv.style.flexShrink = '0';
    infoDiv.style.display = 'flex';
    infoDiv.style.flexDirection = 'column';
    infoDiv.style.gap = '10px';

    visContainer.appendChild(canvasDiv);
    visContainer.appendChild(infoDiv);

    const scoreDisplay = document.getElementById('scoreDisplay') as HTMLDivElement;
    scoreDisplay.textContent = '';

    if (frames.length === 0 || currentFrameIndex >= frames.length) return;

    const frame = frames[currentFrameIndex];
    const commands = frame.commands;

    // Get canvas size from CANVAS command or use default
    const canvasCmd = commands.find(c => c.type === 'CANVAS') as CanvasCommand | undefined;
    const canvasW = canvasCmd ? canvasCmd.W : 800;
    const canvasH = canvasCmd ? canvasCmd.H : 800;

    // Display errors if any
    if (frame.errors && frame.errors.length > 0) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';
        const errorLabel = document.createElement('div');
        errorLabel.className = 'error-label';
        errorLabel.textContent = `Errors (${frame.errors.length})`;
        errorContainer.appendChild(errorLabel);

        const errorList = document.createElement('div');
        errorList.className = 'error-list';
        for (const error of frame.errors) {
            const errorItem = document.createElement('div');
            errorItem.className = 'error-item';
            errorItem.textContent = error;
            errorList.appendChild(errorItem);
        }
        errorContainer.appendChild(errorList);
        infoDiv.appendChild(errorContainer);
    }

    if (frame.showDebug) {
        const debugContainer = document.createElement('div');
        const label = document.createElement('div');
        label.className = 'debug-label';
        label.textContent = 'DEBUG';
        debugContainer.appendChild(label);
        const ta = document.createElement('textarea');
        ta.className = 'debug-textarea';
        ta.readOnly = true;
        ta.value = frame.rawText;
        debugContainer.appendChild(ta);
        infoDiv.appendChild(debugContainer);
    }

    // Create single SVG canvas for all items
    const svg = createCanvasSvg(canvasDiv, canvasW, canvasH);

    for (const cmd of commands) {
        if (cmd.type === 'GRID') {
            renderGridFromCommand(svg, cmd as GridCommand, canvasW, canvasH);
        } else if (cmd.type === '2D_PLANE') {
            render2DPlaneFromCommand(svg, cmd as TwoDPlaneCommand, canvasW, canvasH);
        } else if (cmd.type === 'LINE_GRAPH') {
            renderLineGraphFromCommand(svg, cmd as LineGraphCommand, canvasW, canvasH);
        } else if (cmd.type === 'CANVAS') {
            // Canvas command is handled above for sizing, no visual rendering needed
        } else if (cmd.type === 'TEXTAREA') {
            const ta = document.createElement('textarea');
            ta.className = 'info-textarea';
            ta.readOnly = true;
            ta.value = cmd.text;
            infoDiv.appendChild(ta);
        } else if (cmd.type === 'SCORE') {
            scoreDisplay.textContent = `Score = ${cmd.score}`;
        }
    }
}

// Initialize
loadFilesForSeed();
