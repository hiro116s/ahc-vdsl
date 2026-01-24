import { ParsedModes, Frame, GridCommand, Command, GridLine } from './types';

interface PendingCommands {
    [mode: string]: Command[];
}

interface PendingRawText {
    [mode: string]: string;
}

interface PendingErrors {
    [mode: string]: string[];
}

export function parseStderr(stderrText: string): ParsedModes {
    const parsedModes: ParsedModes = {};
    parsedModes["default"] = [];

    const pendingCommands: PendingCommands = {};
    const pendingRawText: PendingRawText = {};
    const pendingErrors: PendingErrors = {};

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
        if (!pendingErrors[mode]) pendingErrors[mode] = [];

        pendingRawText[mode] += lines[lineIdx] + "\n";

        const parts = remaining.split(/\s+/);
        const cmd = parts[0];

        if (cmd === 'COMMIT') {
            if (pendingCommands[mode].length > 0) {
                parsedModes[mode].push({
                    commands: pendingCommands[mode],
                    rawText: pendingRawText[mode],
                    showDebug: pendingCommands[mode].some(c => c.type === 'DEBUG'),
                    errors: pendingErrors[mode]
                });
                pendingCommands[mode] = [];
                pendingRawText[mode] = "";
                pendingErrors[mode] = [];
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
            const result = parseGridCommand(lines, lineIdx, parts, mode, pendingRawText, pendingCommands, pendingErrors);
            lineIdx = result.lineIdx;
        } else {
            // Unknown command
            if (cmd && cmd.length > 0) {
                pendingErrors[mode].push(`Line ${lineIdx + 1}: Unknown command '${cmd}'`);
            }
            lineIdx++;
        }
    }

    // Flush remaining commands
    for (const m in pendingCommands) {
        if (pendingCommands[m].length > 0) {
            parsedModes[m].push({
                commands: pendingCommands[m],
                rawText: pendingRawText[m] || "",
                showDebug: pendingCommands[m].some(c => c.type === 'DEBUG'),
                errors: pendingErrors[m] || []
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
    pendingCommands: PendingCommands,
    pendingErrors: PendingErrors
): { lineIdx: number } {
    if (parts.length < 6) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: GRID command requires 5 parameters (H W borderColor textColor defaultCellColor), got ${parts.length - 1}`);
        return { lineIdx: lineIdx + 1 };
    }

    const H = parseInt(parts[1]);
    const W = parseInt(parts[2]);
    const borderColor = parts[3];
    const textColor = parts[4];
    const defaultCellColor = parts[5];

    if (isNaN(H) || isNaN(W)) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: GRID H and W must be integers, got H='${parts[1]}' W='${parts[2]}'`);
        return { lineIdx: lineIdx + 1 };
    }

    if (H <= 0 || W <= 0) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: GRID H and W must be positive, got H=${H} W=${W}`);
        return { lineIdx: lineIdx + 1 };
    }

    const gridColors: string[][] = [];
    for (let r = 0; r < H; r++) gridColors.push(new Array(W).fill(defaultCellColor));

    const gridTexts: string[][] = [];
    for (let r = 0; r < H; r++) gridTexts.push(new Array(W).fill(""));

    const gridLines: GridLine[] = [];

    // Initialize walls with default values (all walls exist)
    // wallVertical: H rows, each row has W+1 characters (for W+1 vertical lines)
    // wv[i][j] = 'Y' means vertical wall at row i, column j exists
    const wallVertical: string[] = [];
    for (let i = 0; i < H; i++) {
        wallVertical.push('Y'.repeat(W + 1));
    }

    // wallHorizontal: H+1 rows, each row has W characters (for H+1 horizontal lines)
    // wh[i][j] = 'Y' means horizontal wall at row i, column j exists
    const wallHorizontal: string[] = [];
    for (let i = 0; i <= H; i++) {
        wallHorizontal.push('Y'.repeat(W));
    }

    lineIdx++;

    while (lineIdx < lines.length) {
        let header = lines[lineIdx].trim();
        while (header === '' && lineIdx < lines.length - 1) {
            pendingRawText[mode] += lines[lineIdx] + "\n";
            lineIdx++;
            header = lines[lineIdx].trim();
        }

        if (header !== 'CELL_COLORS' && header !== 'CELL_COLORS_POS' && header !== 'CELL_TEXT' && header !== 'LINES' && header !== 'WALL_VERTICAL' && header !== 'WALL_HORIZONTAL') {
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
        } else if (header === 'WALL_VERTICAL') {
            // H rows, each row has W+1 characters
            const startLineIdx = lineIdx;
            lineIdx++;
            for (let i = 0; i < H; i++) {
                if (lineIdx >= lines.length) {
                    pendingErrors[mode].push(`Line ${startLineIdx + 1}: WALL_VERTICAL expects ${H} rows, but only ${i} rows found`);
                    break;
                }
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const wallLine = lines[lineIdx].trim();
                if (wallLine.length < W + 1) {
                    pendingErrors[mode].push(`Line ${lineIdx + 1}: WALL_VERTICAL row ${i} expects ${W + 1} characters, got ${wallLine.length}`);
                }
                if (wallLine.length >= W + 1) {
                    wallVertical[i] = wallLine.substring(0, W + 1);
                } else {
                    wallVertical[i] = wallLine;
                }
                lineIdx++;
            }
        } else if (header === 'WALL_HORIZONTAL') {
            const startLineIdx = lineIdx;
            lineIdx++;
            for (let i = 0; i <= H; i++) {
                if (lineIdx >= lines.length) {
                    pendingErrors[mode].push(`Line ${startLineIdx + 1}: WALL_HORIZONTAL expects ${H + 1} rows, but only ${i} rows found`);
                    break;
                }
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const wallLine = lines[lineIdx].trim();
                if (wallLine.length < W) {
                    pendingErrors[mode].push(`Line ${lineIdx + 1}: WALL_HORIZONTAL row ${i} expects ${W} characters, got ${wallLine.length}`);
                }
                if (wallLine.length >= W) {
                    wallHorizontal[i] = wallLine.substring(0, W);
                }
                lineIdx++;
            }
        } else if (header === 'LINES') {
            lineIdx++;
            if (lineIdx < lines.length) {
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const numLines = parseInt(lines[lineIdx].trim());
                lineIdx++;
                for (let k = 0; k < numLines; k++) {
                    if (lineIdx >= lines.length) break;
                    pendingRawText[mode] += lines[lineIdx] + "\n";
                    const lLine = lines[lineIdx].trim();
                    const lParts = lLine.split(/\s+/);
                    if (lParts.length >= 2) {
                        const color = lParts[0];
                        const numPoints = parseInt(lParts[1]);
                        const points = [];
                        for (let p = 0; p < numPoints; p++) {
                            if (2 + p * 2 + 1 < lParts.length) {
                                const x = parseInt(lParts[2 + p * 2]);
                                const y = parseInt(lParts[2 + p * 2 + 1]);
                                points.push({ x, y });
                            }
                        }
                        if (points.length > 0) {
                            gridLines.push({ color, points });
                        }
                    }
                    lineIdx++;
                }
            }
        }
    }

    const gridCommand: GridCommand = {
        type: 'GRID',
        H, W, borderColor, textColor,
        gridColors, gridTexts, gridLines,
        wallVertical, wallHorizontal
    };

    pendingCommands[mode].push(gridCommand);
    return { lineIdx };
}
