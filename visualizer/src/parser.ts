import { ParsedModes, Frame, GridCommand, Command, GridLine } from './types';

interface PendingCommands {
    [mode: string]: Command[];
}

interface PendingRawText {
    [mode: string]: string;
}

export function parseStderr(stderrText: string): ParsedModes {
    const parsedModes: ParsedModes = {};
    parsedModes["default"] = [];

    const pendingCommands: PendingCommands = {};
    const pendingRawText: PendingRawText = {};

    if (!stderrText) {
        return parsedModes;
    }

    const lines = stderrText.split('\n');
    let lineIdx = 0;

    while (lineIdx < lines.length) {
        const line = lines[lineIdx].trim();

        let mode = "default";
        let remaining = "";

        if (line.startsWith('$v(')) {
            const closeParen = line.indexOf(')');
            if (closeParen > 3) {
                mode = line.substring(3, closeParen);
                remaining = line.substring(closeParen + 1).trim();
            } else {
                lineIdx++;
                continue;
            }
        } else if (line.startsWith('$v')) {
            mode = "default";
            remaining = line.substring(2).trim();
        } else {
            lineIdx++;
            continue;
        }

        if (!parsedModes[mode]) parsedModes[mode] = [];
        if (!pendingCommands[mode]) pendingCommands[mode] = [];
        if (!pendingRawText[mode]) pendingRawText[mode] = "";

        pendingRawText[mode] += lines[lineIdx] + "\n";

        const parts = remaining.split(/\s+/);
        const cmd = parts[0];

        if (cmd === 'COMMIT') {
            if (pendingCommands[mode].length > 0) {
                parsedModes[mode].push({
                    commands: pendingCommands[mode],
                    rawText: pendingRawText[mode],
                    showDebug: pendingCommands[mode].some(c => c.type === 'DEBUG')
                });
                pendingCommands[mode] = [];
                pendingRawText[mode] = "";
            }
            lineIdx++;
        } else if (cmd === 'DEBUG') {
            pendingCommands[mode].push({ type: 'DEBUG' });
            lineIdx++;
        } else if (cmd === 'TEXTAREA') {
            const taIndex = remaining.indexOf('TEXTAREA');
            const text = remaining.substring(taIndex + 8).trim();
            pendingCommands[mode].push({ type: 'TEXTAREA', text });
            lineIdx++;
        } else if (cmd === 'SCORE') {
            const sIndex = remaining.indexOf('SCORE');
            const score = remaining.substring(sIndex + 5).trim();
            pendingCommands[mode].push({ type: 'SCORE', score });
            lineIdx++;
        } else if (cmd === 'GRID') {
            const result = parseGridCommand(lines, lineIdx, parts, mode, pendingRawText, pendingCommands);
            lineIdx = result.lineIdx;
        } else {
            lineIdx++;
        }
    }

    // Flush remaining commands
    for (const m in pendingCommands) {
        if (pendingCommands[m].length > 0) {
            parsedModes[m].push({
                commands: pendingCommands[m],
                rawText: pendingRawText[m] || "",
                showDebug: pendingCommands[m].some(c => c.type === 'DEBUG')
            });
        }
    }

    return parsedModes;
}

function parseGridCommand(
    lines: string[],
    lineIdx: number,
    parts: string[],
    mode: string,
    pendingRawText: PendingRawText,
    pendingCommands: PendingCommands
): { lineIdx: number } {
    if (parts.length < 6) {
        return { lineIdx: lineIdx + 1 };
    }

    const H = parseInt(parts[1]);
    const W = parseInt(parts[2]);
    const borderColor = parts[3];
    const textColor = parts[4];
    const defaultCellColor = parts[5];

    const gridColors: string[][] = [];
    for (let r = 0; r < H; r++) gridColors.push(new Array(W).fill(defaultCellColor));

    const gridTexts: string[][] = [];
    for (let r = 0; r < H; r++) gridTexts.push(new Array(W).fill(""));

    const gridLines: GridLine[] = [];

    lineIdx++;

    while (lineIdx < lines.length) {
        let header = lines[lineIdx].trim();
        while (header === '' && lineIdx < lines.length - 1) {
            pendingRawText[mode] += lines[lineIdx] + "\n";
            lineIdx++;
            header = lines[lineIdx].trim();
        }

        if (header !== 'CELL_COLORS' && header !== 'CELL_COLORS_POS' && header !== 'CELL_TEXT' && header !== 'LINES') {
            break;
        }

        pendingRawText[mode] += lines[lineIdx] + "\n";

        if (header === 'CELL_COLORS') {
            lineIdx++;
            for (let i = 0; i < H; i++) {
                if (lineIdx >= lines.length) break;
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const rowLine = lines[lineIdx].trim();
                const rowColors = rowLine.split(/\s+/);
                for (let c = 0; c < Math.min(W, rowColors.length); c++) {
                    gridColors[i][c] = rowColors[c];
                }
                lineIdx++;
            }
        } else if (header === 'CELL_COLORS_POS') {
            lineIdx++;
            if (lineIdx < lines.length) {
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const n = parseInt(lines[lineIdx].trim());
                lineIdx++;
                for (let k = 0; k < n; k++) {
                    if (lineIdx >= lines.length) break;
                    pendingRawText[mode] += lines[lineIdx] + "\n";
                    const lLine = lines[lineIdx].trim();
                    const lParts = lLine.split(/\s+/);
                    if (lParts.length >= 2) {
                        const color = lParts[0];
                        const count = parseInt(lParts[1]);
                        for (let j = 0; j < count; j++) {
                            if (2 + j * 2 + 1 < lParts.length) {
                                const r = parseInt(lParts[2 + j * 2]);
                                const c = parseInt(lParts[2 + j * 2 + 1]);
                                if (r >= 0 && r < H && c >= 0 && c < W) {
                                    gridColors[r][c] = color;
                                }
                            }
                        }
                    }
                    lineIdx++;
                }
            }
        } else if (header === 'CELL_TEXT') {
            lineIdx++;
            for (let i = 0; i < H; i++) {
                if (lineIdx >= lines.length) break;
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const rowLine = lines[lineIdx].trim();
                const regex = /"([^"]*)"|([^\s]+)/g;
                let match;
                let c = 0;
                while ((match = regex.exec(rowLine)) !== null && c < W) {
                    gridTexts[i][c] = match[1] !== undefined ? match[1] : match[2];
                    c++;
                }
                lineIdx++;
            }
        } else if (header === 'LINES') {
            lineIdx++;
            if (lineIdx < lines.length) {
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const lineN = parseInt(lines[lineIdx].trim());
                lineIdx++;
                for (let k = 0; k < lineN; k++) {
                    if (lineIdx >= lines.length) break;
                    pendingRawText[mode] += lines[lineIdx] + "\n";
                    const lLine = lines[lineIdx].trim();
                    const lParts = lLine.split(/\s+/);
                    if (lParts.length >= 2) {
                        const color = lParts[0];
                        const count = parseInt(lParts[1]);
                        const points: { x: number; y: number }[] = [];
                        for (let p = 0; p < count; p++) {
                            if (2 + p * 2 + 1 < lParts.length) {
                                points.push({
                                    x: parseInt(lParts[2 + p * 2]),
                                    y: parseInt(lParts[2 + p * 2 + 1])
                                });
                            }
                        }
                        gridLines.push({ color, points });
                    }
                    lineIdx++;
                }
            }
        } else {
            break;
        }
    }

    const gridCommand: GridCommand = {
        type: 'GRID',
        H, W, borderColor, textColor,
        gridColors, gridTexts, gridLines
    };

    pendingCommands[mode].push(gridCommand);

    return { lineIdx };
}
