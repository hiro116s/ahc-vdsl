import './styles.css';
import { ParsedModes, Frame, GridCommand, TwoDPlaneCommand, CanvasCommand } from './types';
import { parseStderr } from './parser';
import { createCanvasSvg, renderGridFromCommand, render2DPlaneFromCommand } from './renderer';
import { buildUrl } from './utils';

export interface Sample {
    id: string;
    title: string;
    description: string;
    dataFile: string;
    codeUrl?: string;
    category: string;
}

let samples: Sample[] = [];
let currentSample: Sample | null = null;
let parsedModes: ParsedModes = {};
let activeMode = "default";
let frames: Frame[] = [];
let currentFrameIndex = 0;
let isPlaying = false;
let playInterval: ReturnType<typeof setInterval> | null = null;

export async function initSamplesPage(): Promise<void> {
    // Load sample list
    try {
        const response = await fetch(buildUrl('/samples/index.json'));
        if (response.ok) {
            samples = await response.json();
        } else {
            console.error('Failed to load samples index');
            samples = [];
        }
    } catch (e) {
        console.error('Error loading samples:', e);
        samples = [];
    }

    renderSamplesPage();

    // Check URL for sample id (initial load)
    const params = new URLSearchParams(window.location.search);
    const sampleId = params.get('id');
    if (sampleId) {
        const sample = samples.find(s => s.id === sampleId);
        if (sample) {
            await selectSampleForce(sample.id);
        }
    }

    // Handle browser back/forward
    window.addEventListener('popstate', async (event) => {
        const params = new URLSearchParams(window.location.search);
        const sampleId = params.get('id');
        if (sampleId) {
            const sample = samples.find(s => s.id === sampleId);
            if (sample) {
                await selectSampleForce(sample.id);
            }
        } else {
            currentSample = null;
            clearVisualization();
            updateSampleSelection(null);
        }
    });
}

function renderSamplesPage(): void {
    const container = document.querySelector('.container') as HTMLDivElement;

    // Group samples by category dynamically
    const samplesByCategory = new Map<string, Sample[]>();
    samples.forEach(sample => {
        const cat = sample.category || 'other';
        if (!samplesByCategory.has(cat)) {
            samplesByCategory.set(cat, []);
        }
        samplesByCategory.get(cat)!.push(sample);
    });

    const renderSampleItems = (items: Sample[]) => items.map(sample => `
        <div class="sample-item" data-id="${sample.id}">
            <div class="sample-title">${sample.title}</div>
            <div class="sample-description">${sample.description}</div>
        </div>
    `).join('');

    // Build category sections
    let categorySections = '';
    samplesByCategory.forEach((items, categoryName) => {
        const displayName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
        categorySections += `
            <div class="sample-category">
                <div class="sample-category-header">${displayName}</div>
                ${renderSampleItems(items)}
            </div>
        `;
    });

    // Add navigation bar if not already present
    if (!document.querySelector('.navbar')) {
        const navbar = document.createElement('nav');
        navbar.className = 'navbar';
        navbar.innerHTML = `
            <div class="navbar-container">
                <a href="${buildUrl('/')}" class="navbar-brand">AHC VDSL Visualizer</a>
                <div class="navbar-links">
                    <a href="${buildUrl('/samples')}" class="navbar-link active">Samples</a>
                    <a href="https://github.com/hiro116s/ahc-vdsl" target="_blank" rel="noopener noreferrer" class="navbar-link">Documentation (Github)</a>
                </div>
            </div>
        `;
        document.body.insertBefore(navbar, document.body.firstChild);
    }

    container.innerHTML = `
        <div class="samples-layout">
            <div class="samples-sidebar">
                <div class="sample-list">
                    ${categorySections}
                </div>
            </div>

            <div class="samples-main">
                <div id="visualizerTitle" class="visualizer-title" style="display: none;"></div>
                
                <div id="linksContainer" class="links-container" style="display: none;">
                    <div id="codeLink" class="link-item" style="display: none;">
                        <span class="link-label">Source code:</span> <a href="#" target="_blank" class="code-link-url"></a>
                    </div>
                    <div id="dslDocLink" class="link-item" style="display: none;">
                        <span class="link-label">DSL code:</span> <a href="#" target="_blank" class="code-link-url"></a>
                    </div>
                </div>

                <div class="mode-selector" style="display: none;">
                    <h3>表示モード</h3>
                    <div class="mode-buttons"></div>
                </div>

                <div id="controls" style="margin-top: 10px; display: none;">
                    <input type="range" id="frameSlider" min="0" value="0" step="1" style="width: 100%;">
                    <div style="display: flex; align-items: center; margin-top: 5px; gap: 10px;">
                        <div style="display: flex; align-items: center; font-size: 12px; color: #555;">
                            <span style="margin-right: 5px;">Speed:</span>
                            <input type="range" id="speedSlider" min="1" max="180" value="20" style="width: 120px;">
                            <span id="speedValue" style="margin-left: 5px; width: 30px;">20fps</span>
                        </div>
                        <button id="prevBtn" style="padding: 5px 10px;">&lt;</button>
                        <button id="playBtn" style="padding: 5px 10px;">Play</button>
                        <button id="nextBtn" style="padding: 5px 10px;">&gt;</button>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <input type="number" id="frameNumberInput" min="1" value="1"
                                style="width: 60px; text-align: right; padding: 2px;">
                            <span id="totalFramesDisplay">/ 0</span>
                        </div>
                    </div>
                </div>

                <div id="scoreDisplay"
                    style="margin-top: 10px; font-weight: bold; font-size: 24px; color: #333; min-height: 35px; border-top: 1px solid #ccc; padding-top: 10px; margin-bottom: 10px;">
                </div>

                <div id="visSection"></div>
            </div>
        </div>
    `;

    // Add event listeners
    const sampleItems = container.querySelectorAll('.sample-item');
    sampleItems.forEach(item => {
        item.addEventListener('click', async () => {
            const id = (item as HTMLElement).dataset.id!;
            await selectSample(id);
        });
    });

    setupPlaybackControls();
}

// Update only the visual selection state (no loading)
function updateSampleSelection(id: string | null): void {
    const container = document.querySelector('.container') as HTMLDivElement;
    const sampleItems = container.querySelectorAll('.sample-item');

    sampleItems.forEach(item => {
        const itemEl = item as HTMLElement;
        if (itemEl.dataset.id === id) {
            itemEl.classList.add('selected');
        } else {
            itemEl.classList.remove('selected');
        }
    });
}

// Select and load sample (skips if same sample already selected)
async function selectSample(id: string | null): Promise<void> {
    // Skip if the same sample is already selected
    if (currentSample && currentSample.id === id) {
        return;
    }

    updateSampleSelection(id);

    if (id) {
        const sample = samples.find(s => s.id === id);
        if (sample) {
            // Update URL
            const url = buildUrl(`/samples?id=${sample.id}`);
            history.pushState({ sampleId: sample.id }, '', url);
            await loadAndRenderSample(sample);
        }
    }
}

// Force select and load sample (used for initial load and popstate)
async function selectSampleForce(id: string): Promise<void> {
    // Reset currentSample to force reload
    currentSample = null;
    updateSampleSelection(id);

    const sample = samples.find(s => s.id === id);
    if (sample) {
        await loadAndRenderSample(sample);
    }
}

async function loadAndRenderSample(sample: Sample): Promise<void> {
    currentSample = sample;

    // Update visualizer title using sample title
    const titleElement = document.getElementById('visualizerTitle') as HTMLDivElement;
    titleElement.textContent = sample.title;
    titleElement.style.display = 'block';

    // Update links container
    const linksContainer = document.getElementById('linksContainer') as HTMLDivElement;
    const codeLinkDiv = document.getElementById('codeLink') as HTMLDivElement;
    const dslDocLinkDiv = document.getElementById('dslDocLink') as HTMLDivElement;

    let hasAnyLink = false;

    // Update code link
    if (sample.codeUrl) {
        const codeLink = codeLinkDiv.querySelector('a') as HTMLAnchorElement;
        codeLink.href = sample.codeUrl;
        codeLink.textContent = sample.codeUrl;
        codeLinkDiv.style.display = 'block';
        hasAnyLink = true;
    } else {
        codeLinkDiv.style.display = 'none';
    }

    // Calculate DSL doc link from dataFile (link to the raw .txt file)
    const dslDocUrl = buildUrl(`/samples/${sample.dataFile}`);
    const dslLink = dslDocLinkDiv.querySelector('a') as HTMLAnchorElement;
    dslLink.href = dslDocUrl;
    dslLink.textContent = dslDocUrl;
    dslDocLinkDiv.style.display = 'block';
    hasAnyLink = true;

    linksContainer.style.display = hasAnyLink ? 'block' : 'none';

    try {
        const response = await fetch(buildUrl(`/samples/${sample.dataFile}`));
        if (!response.ok) {
            throw new Error(`Failed to load sample data: ${sample.dataFile}`);
        }
        const text = await response.text();
        parseAndVisualize(text);
    } catch (e) {
        console.error('Error loading sample:', e);
        const visSection = document.getElementById('visSection') as HTMLDivElement;
        visSection.innerHTML = `<div class="error-message">Failed to load sample: ${sample.dataFile}</div>`;
    }
}

function parseAndVisualize(stderrText: string): void {
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
    const modeSelector = document.querySelector('.mode-selector') as HTMLDivElement;
    const modeButtonsContainer = modeSelector.querySelector('.mode-buttons') as HTMLDivElement;

    if (modes.length <= 1 && modes[0] === 'default') {
        modeSelector.style.display = 'none';
        return;
    }

    modeSelector.style.display = 'block';
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
    const frameSlider = document.getElementById('frameSlider') as HTMLInputElement;
    if (frames.length > 0) {
        frameSlider.max = String(frames.length - 1);
        currentFrameIndex = frames.length - 1;
    } else {
        frameSlider.max = "0";
    }

    const modeButtonsContainer = document.querySelector('.mode-buttons') as HTMLDivElement;
    const buttons = modeButtonsContainer.querySelectorAll('.mode-button');
    buttons.forEach(b => {
        const btnElement = b as HTMLButtonElement;
        if (btnElement.dataset.mode === mode) btnElement.classList.add('active');
        else btnElement.classList.remove('active');
    });

    updateControls();
    renderCurrentFrame();
}

function updateControls(): void {
    const frameSlider = document.getElementById('frameSlider') as HTMLInputElement;
    const frameNumberInput = document.getElementById('frameNumberInput') as HTMLInputElement;
    const totalFramesDisplay = document.getElementById('totalFramesDisplay') as HTMLSpanElement;
    const controls = document.getElementById('controls') as HTMLDivElement;

    frameSlider.value = String(currentFrameIndex);
    frameNumberInput.value = String(currentFrameIndex + 1);
    totalFramesDisplay.textContent = `/ ${Math.max(frames.length, 1)}`;

    if (frames.length <= 1) {
        controls.style.display = 'none';
    } else {
        controls.style.display = 'block';
    }
}

function setupPlaybackControls(): void {
    const frameSlider = document.getElementById('frameSlider') as HTMLInputElement;
    const frameNumberInput = document.getElementById('frameNumberInput') as HTMLInputElement;
    const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    const speedValue = document.getElementById('speedValue') as HTMLSpanElement;
    const prevBtn = document.getElementById('prevBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement;
    const playBtn = document.getElementById('playBtn') as HTMLButtonElement;

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
}

function togglePlay(): void {
    const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;

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

function clearVisualization(): void {
    const visSection = document.getElementById('visSection') as HTMLDivElement;
    visSection.innerHTML = '';
    const scoreDisplay = document.getElementById('scoreDisplay') as HTMLDivElement;
    scoreDisplay.textContent = '';
    const controls = document.getElementById('controls') as HTMLDivElement;
    controls.style.display = 'none';
    const modeSelector = document.querySelector('.mode-selector') as HTMLDivElement;
    modeSelector.style.display = 'none';
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
