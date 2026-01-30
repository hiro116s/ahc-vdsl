import './styles.css';
import { ParsedModes, Frame, GridCommand, TwoDPlaneCommand, CanvasCommand } from './types';
import { parseStderr } from './parser';
import { createCanvasSvg, renderGridFromCommand, render2DPlaneFromCommand } from './renderer';
import { initSamplesPage } from './samples';

// Router: Check current path and initialize appropriate page
function initRouter(): void {
    const path = window.location.pathname;

    if (path === '/samples' || path === '/samples/') {
        initSamplesPage();
    } else {
        initMainPage();
    }
}

function initMainPage(): void {
    // DOM Elements
    const codeInput = document.getElementById('codeInput') as HTMLTextAreaElement;
    const selectFileBtn = document.getElementById('selectFileBtn') as HTMLButtonElement;
    const selectDirBtn = document.getElementById('selectDirBtn') as HTMLButtonElement;
    const fileListInput = document.getElementById('fileListInput') as HTMLInputElement;
    const fileListOptions = document.getElementById('fileListOptions') as HTMLDataListElement;
    const updateBtn = document.getElementById('updateBtn') as HTMLButtonElement;
    const directModeRadio = document.getElementById('directModeRadio') as HTMLInputElement;
    const fileModeRadio = document.getElementById('fileModeRadio') as HTMLInputElement;
    const frameSlider = document.getElementById('frameSlider') as HTMLInputElement;
    const frameNumberInput = document.getElementById('frameNumberInput') as HTMLInputElement;
    const totalFramesDisplay = document.getElementById('totalFramesDisplay') as HTMLSpanElement;
    const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    const speedValue = document.getElementById('speedValue') as HTMLSpanElement;
    const prevBtn = document.getElementById('prevBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement;
    const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    const modeButtonsContainer = document.querySelector('.mode-buttons') as HTMLDivElement;

    // State
    let parsedModes: ParsedModes = {};
    let activeMode = "default";
    let frames: Frame[] = [];
    let currentFrameIndex = 0;
    let isPlaying = false;
    let playInterval: ReturnType<typeof setInterval> | null = null;
    let fullCodeText = ""; // Store full code text
    let fileHandle: FileSystemFileHandle | null = null; // File System Access API handle
    let directoryHandle: FileSystemDirectoryHandle | null = null; // Directory handle
    let directoryFiles: Map<string, FileSystemFileHandle> = new Map(); // Files in selected directory
    let inputMode: 'direct' | 'file' = 'file'; // Current input mode (default: file)
    let lastProcessedFileName = ''; // Track last processed file to avoid duplicate alerts

    // Check if File System Access API is supported
    const supportsFileSystemAccess = 'showOpenFilePicker' in window;
    const supportsDirectoryPicker = 'showDirectoryPicker' in window;

    if (!supportsFileSystemAccess) {
        fileModeRadio.disabled = true;
        fileModeRadio.title = 'File System Access API is not supported in this browser';
        const fileLabel = fileModeRadio.parentElement as HTMLLabelElement;
        if (fileLabel) {
            fileLabel.style.opacity = '0.5';
            fileLabel.style.cursor = 'not-allowed';
        }
    }

    if (!supportsDirectoryPicker) {
        selectDirBtn.disabled = true;
        selectDirBtn.title = 'Directory Picker API is not supported in this browser';
        selectDirBtn.style.opacity = '0.5';
    }

    // Mode switching
    function switchInputMode(mode: 'direct' | 'file'): void {
        inputMode = mode;

        if (mode === 'direct') {
            // Direct input mode
            codeInput.placeholder = 'Enter your code here...';
            selectFileBtn.style.display = 'none';
            selectDirBtn.style.display = 'none';
            fileListInput.style.display = 'none';
        } else {
            // File input mode
            codeInput.placeholder = 'DSLを含むファイルまたはディレクトリを選択してください。更新ボタンでファイルから再読み込みされるので、変更したファイルを再度選択する必要はありません。';
            selectFileBtn.style.display = 'inline-block';
            selectDirBtn.style.display = 'inline-block';
            if (fileHandle || (directoryHandle && directoryFiles.size > 0)) {
                fileListInput.style.display = 'inline-block';
            }
        }
    }

    directModeRadio.addEventListener('change', () => {
        if (directModeRadio.checked) {
            switchInputMode('direct');
        }
    });

    fileModeRadio.addEventListener('change', () => {
        if (fileModeRadio.checked) {
            switchInputMode('file');
        }
    });

    // Initialize with file mode
    switchInputMode('file');

    // Event Listeners
    selectFileBtn.addEventListener('click', async () => {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'Text Files',
                        accept: {
                            'text/plain': ['.txt', '.log'],
                            'text/*': ['.txt', '.log', '.stderr']
                        }
                    }
                ],
                multiple: false
            });
            // Clear directory mode
            directoryHandle = null;
            directoryFiles.clear();
            fileListOptions.innerHTML = '';
            lastProcessedFileName = '';

            fileHandle = handle;

            // Show file name in input (read-only)
            const file = await handle.getFile();
            fileListInput.value = file.name;
            fileListInput.readOnly = true;
            fileListInput.style.display = 'inline-block';
            fileListInput.style.backgroundColor = '#f5f5f5';

            await loadFileFromHandle();
        } catch (err: any) {
            // User cancelled the file picker or other error
            if (err.name !== 'AbortError') {
                console.error('Error selecting file:', err);
                alert('ファイルの選択に失敗しました: ' + err.message);
            }
        }
    });

    selectDirBtn.addEventListener('click', async () => {
        try {
            const handle = await window.showDirectoryPicker({
                mode: 'read'
            });
            directoryHandle = handle;

            // Clear single file mode
            fileHandle = null;
            lastProcessedFileName = '';

            // Make input editable for directory mode (autocomplete)
            fileListInput.readOnly = false;
            fileListInput.style.backgroundColor = '#ffffff';

            // Enumerate files in directory
            await loadDirectoryFiles();
        } catch (err: any) {
            // User cancelled the directory picker or other error
            if (err.name !== 'AbortError') {
                console.error('Error selecting directory:', err);
                alert('ディレクトリの選択に失敗しました: ' + err.message);
            }
        }
    });

    async function handleFileSelection(): Promise<void> {
        // Skip if input is read-only (single file mode)
        if (fileListInput.readOnly) {
            return;
        }

        const selectedFileName = fileListInput.value.trim();

        // Skip if we've already processed this file
        if (selectedFileName === lastProcessedFileName) {
            return;
        }

        if (selectedFileName && directoryFiles.has(selectedFileName)) {
            lastProcessedFileName = selectedFileName;
            fileHandle = directoryFiles.get(selectedFileName)!;
            await loadFileFromHandle();
        } else if (selectedFileName) {
            // File not found in directory - only show error once
            lastProcessedFileName = selectedFileName;
            alert(`ファイル "${selectedFileName}" が見つかりません。`);
        }
    }

    // Reset lastProcessedFileName when user starts typing
    fileListInput.addEventListener('input', () => {
        if (fileListInput.value.trim() !== lastProcessedFileName) {
            lastProcessedFileName = '';
        }
    });

    fileListInput.addEventListener('change', handleFileSelection);
    fileListInput.addEventListener('blur', handleFileSelection);
    fileListInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            handleFileSelection();
        }
    });

    updateBtn.addEventListener('click', async () => {
        if (inputMode === 'file') {
            // File input mode: reload from file
            if (fileHandle) {
                await loadFileFromHandle();
            } else {
                alert('ファイルが選択されていません。「ファイル選択」または「ディレクトリ選択」ボタンからファイルを選択してください。');
            }
        } else {
            // Direct input mode: parse from textarea
            parseAndVisualize();
        }
    });

    async function loadFileFromHandle(): Promise<void> {
        if (!fileHandle) return;

        try {
            const file = await fileHandle.getFile();
            const text = await file.text();
            fullCodeText = text;

            // Update textarea with file content
            if (text.length > 5000) {
                codeInput.value = text.substring(0, 5000) + "\n\n... (truncated)";
            } else {
                codeInput.value = text;
            }

            // Parse and visualize
            parseAndVisualize();
        } catch (err: any) {
            console.error('Error reading file:', err);
            alert('ファイルの読み込みに失敗しました: ' + err.message);
        }
    }

    async function loadDirectoryFiles(): Promise<void> {
        if (!directoryHandle) return;

        try {
            directoryFiles.clear();
            fileListOptions.innerHTML = '';
            fileListInput.value = '';

            // Enumerate all files in directory (non-recursive)
            for await (const entry of directoryHandle.values()) {
                if (entry.kind === 'file') {
                    directoryFiles.set(entry.name, entry);
                }
            }

            if (directoryFiles.size === 0) {
                alert('選択したディレクトリにファイルが見つかりませんでした。');
                return;
            }

            // Sort files by name
            const sortedFileNames = Array.from(directoryFiles.keys()).sort();

            // Populate datalist for autocomplete
            sortedFileNames.forEach(fileName => {
                const option = document.createElement('option');
                option.value = fileName;
                fileListOptions.appendChild(option);
            });

            // Show input field
            fileListInput.style.display = 'inline-block';

            // Load first file automatically
            const firstFileName = sortedFileNames[0];
            fileListInput.value = firstFileName;
            lastProcessedFileName = firstFileName;
            fileHandle = directoryFiles.get(firstFileName)!;
            await loadFileFromHandle();
        } catch (err: any) {
            console.error('Error loading directory files:', err);
            alert('ディレクトリ内のファイル読み込みに失敗しました: ' + err.message);
        }
    }

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

    function parseAndVisualize(): void {
        // Disable update button to prevent clicking on truncated text
        updateBtn.disabled = true;

        // Store full code text from textarea (use existing fullCodeText if available)
        if (!fullCodeText || codeInput.value !== fullCodeText.substring(0, 5000) + "\n\n... (truncated)") {
            fullCodeText = codeInput.value;
        }
        const codeText = fullCodeText;

        // Truncate display if too long
        if (fullCodeText.length > 5000) {
            codeInput.value = fullCodeText.substring(0, 5000) + "\n\n... (truncated)";
        }

        currentFrameIndex = 0;
        if (isPlaying) togglePlay();

        parsedModes = parseStderr(codeText);

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

        // Re-enable update button after processing
        updateBtn.disabled = false;
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

    // Initialize main page - start with empty visualization
    parseAndVisualize();
}

// Initialize
initRouter();
