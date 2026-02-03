import { ParsedModes, Frame, GridCommand, Command, GridLine, TwoDPlaneCommand, CircleGroup, LineGroup, PolygonGroup, CanvasCommand, ItemBounds, BarGraphCommand, BarGraphItem } from './types';

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
                // Check for overlapping items
                const items = pendingCommands[mode].filter(c => c.type === 'GRID' || c.type === '2D_PLANE');
                if (items.length > 1) {
                    // Get canvas size
                    const canvasCmd = pendingCommands[mode].find(c => c.type === 'CANVAS') as CanvasCommand | undefined;
                    const canvasW = canvasCmd ? canvasCmd.W : 800;
                    const canvasH = canvasCmd ? canvasCmd.H : 800;

                    // Check for overlaps
                    for (let i = 0; i < items.length; i++) {
                        for (let j = i + 1; j < items.length; j++) {
                            const item1 = items[i] as GridCommand | TwoDPlaneCommand;
                            const item2 = items[j] as GridCommand | TwoDPlaneCommand;

                            const bounds1 = item1.bounds || { left: 0, top: 0, right: canvasW, bottom: canvasH };
                            const bounds2 = item2.bounds || { left: 0, top: 0, right: canvasW, bottom: canvasH };

                            // Check if rectangles overlap
                            if (!(bounds1.right <= bounds2.left || bounds2.right <= bounds1.left ||
                                bounds1.bottom <= bounds2.top || bounds2.bottom <= bounds1.top)) {
                                pendingErrors[mode].push(`Item overlap detected: Items at positions (${bounds1.left},${bounds1.top})-(${bounds1.right},${bounds1.bottom}) and (${bounds2.left},${bounds2.top})-(${bounds2.right},${bounds2.bottom}) overlap.`);
                            }
                        }
                    }
                }

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
        } else if (cmd === 'CANVAS') {
            const result = parseCanvasCommand(parts, mode, pendingCommands, pendingErrors, lineIdx);
            lineIdx = result.lineIdx;
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
        } else if (cmd === 'GRID' || cmd.startsWith('GRID(')) {
            const result = parseGridCommand(lines, lineIdx, remaining, mode, pendingRawText, pendingCommands, pendingErrors);
            lineIdx = result.lineIdx;
        } else if (cmd === '2D_PLANE' || cmd.startsWith('2D_PLANE(')) {
            const result = parse2DPlaneCommand(lines, lineIdx, remaining, mode, pendingRawText, pendingCommands, pendingErrors);
            lineIdx = result.lineIdx;
        } else if (cmd === 'BAR_GRAPH') {
            const result = parseBarGraphCommand(lines, lineIdx, remaining, mode, pendingRawText, pendingCommands, pendingErrors);
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

function parseCanvasCommand(
    parts: string[],
    mode: string,
    pendingCommands: PendingCommands,
    pendingErrors: PendingErrors,
    lineIdx: number
): { lineIdx: number } {
    if (parts.length < 3) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: CANVAS command requires 2 parameters (H W), got ${parts.length - 1}`);
        return { lineIdx: lineIdx + 1 };
    }

    const H = parseFloat(parts[1]);
    const W = parseFloat(parts[2]);

    if (isNaN(H) || isNaN(W)) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: CANVAS H and W must be numbers, got H='${parts[1]}' W='${parts[2]}'`);
        return { lineIdx: lineIdx + 1 };
    }

    if (H <= 0 || W <= 0) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: CANVAS H and W must be positive, got H=${H} W=${W}`);
        return { lineIdx: lineIdx + 1 };
    }

    const canvasCommand: CanvasCommand = {
        type: 'CANVAS',
        H, W
    };

    pendingCommands[mode].push(canvasCommand);
    return { lineIdx: lineIdx + 1 };
}

function parseBoundsFromCommand(commandStr: string): ItemBounds | undefined {
    // Parse bounds like GRID(min_x, min_y, max_x, max_y) or 2D_PLANE(min_x, min_y, max_x, max_y)
    const match = commandStr.match(/\(([^)]+)\)/);
    if (!match) {
        return undefined;
    }

    const boundsStr = match[1];
    const boundsParts = boundsStr.split(',').map(s => s.trim());
    if (boundsParts.length !== 4) {
        return undefined;
    }

    const left = parseFloat(boundsParts[0]);
    const top = parseFloat(boundsParts[1]);
    const right = parseFloat(boundsParts[2]);
    const bottom = parseFloat(boundsParts[3]);

    if (isNaN(left) || isNaN(top) || isNaN(right) || isNaN(bottom)) {
        return undefined;
    }

    return { left, top, right, bottom };
}

function parseGridCommand(
    lines: string[],
    lineIdx: number,
    remaining: string,
    mode: string,
    pendingRawText: PendingRawText,
    pendingCommands: PendingCommands,
    pendingErrors: PendingErrors
): { lineIdx: number } {
    // Extract bounds if present in the command
    const bounds = parseBoundsFromCommand(remaining);

    // Remove bounds from remaining string if present
    let paramStr = remaining;
    if (bounds) {
        paramStr = remaining.replace(/GRID\([^)]+\)\s*/, 'GRID ').substring(5).trim();
    } else {
        paramStr = remaining.replace(/^GRID\s*/, '').trim();
    }

    const parts = paramStr.split(/\s+/);

    if (parts.length < 5) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: GRID command requires 5 parameters (H W borderColor textColor defaultCellColor), got ${parts.length}`);
        return { lineIdx: lineIdx + 1 };
    }

    const H = parseInt(parts[0]);
    const W = parseInt(parts[1]);
    const borderColor = parts[2];
    const textColor = parts[3];
    const defaultCellColor = parts[4];

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
                                // Interpret as (x, y) coordinates
                                const x = parseInt(lParts[2 + j * 2]);
                                const y = parseInt(lParts[2 + j * 2 + 1]);
                                if (y >= 0 && y < H && x >= 0 && x < W) {
                                    gridColors[y][x] = color;
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
        wallVertical, wallHorizontal,
        bounds
    };

    pendingCommands[mode].push(gridCommand);
    return { lineIdx };
}

function parse2DPlaneCommand(
    lines: string[],
    lineIdx: number,
    remaining: string,
    mode: string,
    pendingRawText: PendingRawText,
    pendingCommands: PendingCommands,
    pendingErrors: PendingErrors
): { lineIdx: number } {
    // Extract bounds if present in the command
    const bounds = parseBoundsFromCommand(remaining);

    // Remove bounds from remaining string if present
    let paramStr = remaining;
    if (bounds) {
        paramStr = remaining.replace(/2D_PLANE\([^)]+\)\s*/, '2D_PLANE ').substring(9).trim();
    } else {
        paramStr = remaining.replace(/^2D_PLANE\s*/, '').trim();
    }

    const parts = paramStr.split(/\s+/);

    if (parts.length < 2) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: 2D_PLANE command requires 2 parameters (H W), got ${parts.length}`);
        return { lineIdx: lineIdx + 1 };
    }

    const H = parseFloat(parts[0]);
    const W = parseFloat(parts[1]);

    if (isNaN(H) || isNaN(W)) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: 2D_PLANE H and W must be numbers, got H='${parts[1]}' W='${parts[2]}'`);
        return { lineIdx: lineIdx + 1 };
    }

    if (H <= 0 || W <= 0) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: 2D_PLANE H and W must be positive, got H=${H} W=${W}`);
        return { lineIdx: lineIdx + 1 };
    }

    const circleGroups: CircleGroup[] = [];
    const lineGroups: LineGroup[] = [];
    const polygonGroups: PolygonGroup[] = [];

    lineIdx++;

    while (lineIdx < lines.length) {
        let header = lines[lineIdx].trim();
        while (header === '' && lineIdx < lines.length - 1) {
            pendingRawText[mode] += lines[lineIdx] + "\n";
            lineIdx++;
            header = lines[lineIdx].trim();
        }

        if (header !== 'CIRCLES' && header !== 'LINES' && header !== 'POLYGONS') {
            break;
        }

        pendingRawText[mode] += lines[lineIdx] + "\n";

        if (header === 'CIRCLES') {
            lineIdx++;
            if (lineIdx < lines.length) {
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const cn = parseInt(lines[lineIdx].trim());
                lineIdx++;
                for (let k = 0; k < cn; k++) {
                    if (lineIdx >= lines.length) break;
                    pendingRawText[mode] += lines[lineIdx] + "\n";
                    const lLine = lines[lineIdx].trim();
                    const lParts = lLine.split(/\s+/);
                    if (lParts.length >= 3) {
                        const lineColor = lParts[0];
                        const fillColor = lParts[1];
                        const circleCount = parseInt(lParts[2]);
                        const circles = [];
                        for (let j = 0; j < circleCount; j++) {
                            const baseIdx = 3 + j * 3;
                            if (baseIdx + 2 < lParts.length) {
                                const x = parseFloat(lParts[baseIdx]);
                                const y = parseFloat(lParts[baseIdx + 1]);
                                const r = parseFloat(lParts[baseIdx + 2]);
                                if (!isNaN(x) && !isNaN(y) && !isNaN(r)) {
                                    circles.push({ x, y, r });
                                }
                            }
                        }
                        if (circles.length > 0) {
                            circleGroups.push({ lineColor, fillColor, circles });
                        }
                    }
                    lineIdx++;
                }
            }
        } else if (header === 'LINES') {
            lineIdx++;
            if (lineIdx < lines.length) {
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const ln = parseInt(lines[lineIdx].trim());
                lineIdx++;
                for (let k = 0; k < ln; k++) {
                    if (lineIdx >= lines.length) break;
                    pendingRawText[mode] += lines[lineIdx] + "\n";
                    const lLine = lines[lineIdx].trim();
                    const lParts = lLine.split(/\s+/);
                    if (lParts.length >= 2) {
                        const color = lParts[0];
                        const lineCount = parseInt(lParts[1]);
                        const lines2D = [];
                        for (let j = 0; j < lineCount; j++) {
                            const baseIdx = 2 + j * 4;
                            if (baseIdx + 3 < lParts.length) {
                                const ax = parseFloat(lParts[baseIdx]);
                                const ay = parseFloat(lParts[baseIdx + 1]);
                                const bx = parseFloat(lParts[baseIdx + 2]);
                                const by = parseFloat(lParts[baseIdx + 3]);
                                if (!isNaN(ax) && !isNaN(ay) && !isNaN(bx) && !isNaN(by)) {
                                    lines2D.push({ ax, ay, bx, by });
                                }
                            }
                        }
                        if (lines2D.length > 0) {
                            lineGroups.push({ color, lines: lines2D });
                        }
                    }
                    lineIdx++;
                }
            }
        } else if (header === 'POLYGONS') {
            lineIdx++;
            if (lineIdx < lines.length) {
                pendingRawText[mode] += lines[lineIdx] + "\n";
                const pn = parseInt(lines[lineIdx].trim());
                lineIdx++;
                for (let k = 0; k < pn; k++) {
                    if (lineIdx >= lines.length) break;
                    pendingRawText[mode] += lines[lineIdx] + "\n";
                    const lLine = lines[lineIdx].trim();
                    const lParts = lLine.split(/\s+/);
                    if (lParts.length >= 3) {
                        const lineColor = lParts[0];
                        const fillColor = lParts[1];
                        const vertexCount = parseInt(lParts[2]);
                        const points = [];
                        for (let j = 0; j < vertexCount; j++) {
                            const baseIdx = 3 + j * 2;
                            if (baseIdx + 1 < lParts.length) {
                                const x = parseFloat(lParts[baseIdx]);
                                const y = parseFloat(lParts[baseIdx + 1]);
                                if (!isNaN(x) && !isNaN(y)) {
                                    points.push({ x, y });
                                }
                            }
                        }
                        if (points.length > 0) {
                            polygonGroups.push({ lineColor, fillColor, polygon: { points } });
                        }
                    }
                    lineIdx++;
                }
            }
        }
    }

    const twoDPlaneCommand: TwoDPlaneCommand = {
        type: '2D_PLANE',
        H, W,
        circleGroups, lineGroups, polygonGroups,
        bounds
    };

    pendingCommands[mode].push(twoDPlaneCommand);
    return { lineIdx };
}

function parseBarGraphCommand(
    lines: string[],
    lineIdx: number,
    remaining: string,
    mode: string,
    pendingRawText: PendingRawText,
    pendingCommands: PendingCommands,
    pendingErrors: PendingErrors
): { lineIdx: number } {
    const paramStr = remaining.replace(/^BAR_GRAPH\s*/, '').trim();
    const parts = paramStr.split(/\s+/);

    if (parts.length < 3) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: BAR_GRAPH requires 3 parameters (fill_color y_min y_max), got ${parts.length}`);
        return { lineIdx: lineIdx + 1 };
    }

    const fillColor = parts[0];
    const yMin = parseFloat(parts[1]);
    const yMax = parseFloat(parts[2]);

    if (isNaN(yMin) || isNaN(yMax)) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: BAR_GRAPH y_min and y_max must be numbers`);
        return { lineIdx: lineIdx + 1 };
    }

    if (yMin >= yMax) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: BAR_GRAPH y_min must be less than y_max`);
        return { lineIdx: lineIdx + 1 };
    }

    lineIdx++;

    if (lineIdx >= lines.length) {
        pendingErrors[mode].push(`Line ${lineIdx}: BAR_GRAPH expected data line but reached end of input`);
        return { lineIdx };
    }

    pendingRawText[mode] += lines[lineIdx] + "\n";
    const dataLine = lines[lineIdx].trim();
    const dataParts = dataLine.split(/\s+/);

    const n = parseInt(dataParts[0]);
    if (isNaN(n) || n <= 0) {
        pendingErrors[mode].push(`Line ${lineIdx + 1}: BAR_GRAPH data count must be a positive integer`);
        return { lineIdx: lineIdx + 1 };
    }

    const items: BarGraphItem[] = [];
    for (let i = 0; i < n; i++) {
        const labelIdx = 1 + i * 2;
        const valueIdx = 2 + i * 2;
        if (valueIdx >= dataParts.length) {
            pendingErrors[mode].push(`Line ${lineIdx + 1}: BAR_GRAPH expected ${n} items but data ended at item ${i}`);
            break;
        }
        const label = dataParts[labelIdx];
        const value = parseFloat(dataParts[valueIdx]);
        if (isNaN(value)) {
            pendingErrors[mode].push(`Line ${lineIdx + 1}: BAR_GRAPH value for '${label}' is not a number`);
            continue;
        }
        items.push({ label, value });
    }

    lineIdx++;

    const barGraphCommand: BarGraphCommand = {
        type: 'BAR_GRAPH',
        fillColor,
        yMin,
        yMax,
        items
    };

    pendingCommands[mode].push(barGraphCommand);
    return { lineIdx };
}
