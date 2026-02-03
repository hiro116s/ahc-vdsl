import { GridCommand, GridLine, TwoDPlaneCommand, CircleGroup, LineGroup, PolygonGroup } from './types';

const SVG_NS = "http://www.w3.org/2000/svg";

// Create a canvas SVG element
export function createCanvasSvg(container: HTMLElement, canvasW: number, canvasH: number): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(canvasW));
    svg.setAttribute("height", String(canvasH));
    svg.setAttribute("viewBox", `0 0 ${canvasW} ${canvasH}`);
    svg.style.margin = "10px 0";
    svg.style.display = "block";
    svg.style.overflow = "visible";
    container.appendChild(svg);
    return svg;
}

export function renderGrid(
    svg: SVGSVGElement,
    H: number,
    W: number,
    borderColor: string,
    textColor: string,
    gridColors: string[][],
    gridTexts: string[][],
    gridLines: GridLine[],
    wallVertical: string[] = [],
    wallHorizontal: string[] = [],
    left: number = 0,
    top: number = 0,
    right: number = 800,
    bottom: number = 800
): void {
    // Calculate the actual drawing area based on bounds
    const drawWidth = right - left;
    const drawHeight = bottom - top;
    const cellWidth = drawWidth / W;
    const cellHeight = drawHeight / H;

    // Create a group for this grid item with offset
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${left}, ${top})`);

    // Find maximum character count across all cells
    let maxCharCount = 1;
    if (gridTexts) {
        for (let y = 0; y < H; y++) {
            if (y < gridTexts.length) {
                for (let x = 0; x < W; x++) {
                    if (x < gridTexts[y].length) {
                        const rawText = gridTexts[y][x];
                        const displayText = rawText.length > 5 ? rawText.substring(0, 5) + "..." : rawText;
                        maxCharCount = Math.max(maxCharCount, displayText.length);
                    }
                }
            }
        }
    }

    // Calculate unified font size based on maximum character count
    let unifiedFontSize: number;
    if (maxCharCount <= 4) {
        unifiedFontSize = Math.min(cellHeight * 0.7, (cellWidth / maxCharCount) * 1.2);
    } else {
        unifiedFontSize = Math.min(cellHeight * 0.6, cellWidth / 5.5);
    }
    unifiedFontSize = Math.min(unifiedFontSize, 30);

    // Render cells
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const rect = document.createElementNS(SVG_NS, "rect");
            rect.setAttribute("x", String(x * cellWidth));
            rect.setAttribute("y", String(y * cellHeight));
            rect.setAttribute("width", String(cellWidth));
            rect.setAttribute("height", String(cellHeight));

            let fill = "#FFFFFF";
            if (y < gridColors.length && x < gridColors[y].length) {
                fill = gridColors[y][x];
            }

            rect.setAttribute("fill", fill);
            rect.setAttribute("stroke", "none");

            // Add tooltip
            const title = document.createElementNS(SVG_NS, "title");
            let titleText = `(${y}, ${x})`;

            let textContent = "";
            if (gridTexts && y < gridTexts.length && x < gridTexts[y].length) {
                const rawText = gridTexts[y][x];
                titleText += `: ${rawText}`;

                if (rawText.length > 5) {
                    textContent = rawText.substring(0, 5) + "...";
                } else {
                    textContent = rawText;
                }
            }
            title.textContent = titleText;
            rect.appendChild(title);

            g.appendChild(rect);

            // Render Text
            if (textContent) {
                const textElement = document.createElementNS(SVG_NS, "text");
                textElement.setAttribute("x", String(x * cellWidth + cellWidth / 2));
                textElement.setAttribute("y", String(y * cellHeight + cellHeight / 2));
                textElement.setAttribute("fill", textColor);
                textElement.setAttribute("font-size", String(unifiedFontSize));
                textElement.setAttribute("font-family", "sans-serif");
                textElement.setAttribute("text-anchor", "middle");
                textElement.setAttribute("dominant-baseline", "middle");
                textElement.setAttribute("pointer-events", "none");
                textElement.textContent = textContent;
                g.appendChild(textElement);
            }
        }
    }

    // Render walls
    const wallWidth = 2;

    // Render vertical walls
    // wallVertical[i][j] = 'Y' means vertical wall at row i, column j exists
    if (wallVertical.length > 0) {
        for (let i = 0; i < H; i++) {
            if (i < wallVertical.length) {
                const wallString = wallVertical[i];
                for (let j = 0; j <= W && j < wallString.length; j++) {
                    if (wallString[j] === 'Y') {
                        const line = document.createElementNS(SVG_NS, "line");
                        line.setAttribute("x1", String(j * cellWidth));
                        line.setAttribute("y1", String(i * cellHeight));
                        line.setAttribute("x2", String(j * cellWidth));
                        line.setAttribute("y2", String((i + 1) * cellHeight));
                        line.setAttribute("stroke", borderColor);
                        line.setAttribute("stroke-width", String(wallWidth));
                        line.setAttribute("pointer-events", "none");
                        g.appendChild(line);
                    }
                }
            }
        }
    } else {
        // Default: all vertical walls exist
        for (let i = 0; i < H; i++) {
            for (let j = 0; j <= W; j++) {
                const line = document.createElementNS(SVG_NS, "line");
                line.setAttribute("x1", String(j * cellWidth));
                line.setAttribute("y1", String(i * cellHeight));
                line.setAttribute("x2", String(j * cellWidth));
                line.setAttribute("y2", String((i + 1) * cellHeight));
                line.setAttribute("stroke", borderColor);
                line.setAttribute("stroke-width", String(wallWidth));
                line.setAttribute("pointer-events", "none");
                g.appendChild(line);
            }
        }
    }

    // Render horizontal walls
    // wallHorizontal[i][j] = 'Y' means horizontal wall at row i, column j exists
    if (wallHorizontal.length > 0) {
        for (let i = 0; i <= H; i++) {
            if (i < wallHorizontal.length) {
                const wallString = wallHorizontal[i];
                for (let j = 0; j < W && j < wallString.length; j++) {
                    if (wallString[j] === 'Y') {
                        const line = document.createElementNS(SVG_NS, "line");
                        line.setAttribute("x1", String(j * cellWidth));
                        line.setAttribute("y1", String(i * cellHeight));
                        line.setAttribute("x2", String((j + 1) * cellWidth));
                        line.setAttribute("y2", String(i * cellHeight));
                        line.setAttribute("stroke", borderColor);
                        line.setAttribute("stroke-width", String(wallWidth));
                        line.setAttribute("pointer-events", "none");
                        g.appendChild(line);
                    }
                }
            }
        }
    } else {
        // Default: all horizontal walls exist
        for (let i = 0; i <= H; i++) {
            for (let j = 0; j < W; j++) {
                const line = document.createElementNS(SVG_NS, "line");
                line.setAttribute("x1", String(j * cellWidth));
                line.setAttribute("y1", String(i * cellHeight));
                line.setAttribute("x2", String((j + 1) * cellWidth));
                line.setAttribute("y2", String(i * cellHeight));
                line.setAttribute("stroke", borderColor);
                line.setAttribute("stroke-width", String(wallWidth));
                line.setAttribute("pointer-events", "none");
                g.appendChild(line);
            }
        }
    }

    // Render Lines
    if (gridLines && gridLines.length > 0) {
        for (const lineData of gridLines) {
            const color = lineData.color;
            const points = lineData.points;
            if (points.length < 2) continue;

            let pointsStr = "";
            for (const pt of points) {
                const px = pt.x * cellWidth + cellWidth / 2;
                const py = pt.y * cellHeight + cellHeight / 2;
                pointsStr += `${px},${py} `;
            }

            const polyline = document.createElementNS(SVG_NS, "polyline");
            polyline.setAttribute("points", pointsStr.trim());
            polyline.setAttribute("fill", "none");
            polyline.setAttribute("stroke", color);
            polyline.setAttribute("stroke-width", "3");
            polyline.setAttribute("stroke-linejoin", "round");
            polyline.setAttribute("stroke-linecap", "round");
            polyline.setAttribute("pointer-events", "none");
            g.appendChild(polyline);

            // Draw circles at vertices
            const circleRadius = Math.min(cellWidth, cellHeight) * 0.05;
            for (const pt of points) {
                const px = pt.x * cellWidth + cellWidth / 2;
                const py = pt.y * cellHeight + cellHeight / 2;

                const circle = document.createElementNS(SVG_NS, "circle");
                circle.setAttribute("cx", String(px));
                circle.setAttribute("cy", String(py));
                circle.setAttribute("r", String(circleRadius));
                circle.setAttribute("fill", color);
                circle.setAttribute("pointer-events", "none");
                g.appendChild(circle);
            }
        }
    }

    svg.appendChild(g);
}

export function renderGridFromCommand(svg: SVGSVGElement, cmd: GridCommand, canvasW: number = 800, canvasH: number = 800): void {
    const bounds = cmd.bounds || { left: 0, top: 0, right: canvasW, bottom: canvasH };
    renderGrid(
        svg,
        cmd.H,
        cmd.W,
        cmd.borderColor,
        cmd.textColor,
        cmd.gridColors,
        cmd.gridTexts,
        cmd.gridLines,
        cmd.wallVertical,
        cmd.wallHorizontal,
        bounds.left,
        bounds.top,
        bounds.right,
        bounds.bottom
    );
}

export function render2DPlane(
    svg: SVGSVGElement,
    H: number,
    W: number,
    circleGroups: CircleGroup[],
    lineGroups: LineGroup[],
    polygonGroups: PolygonGroup[],
    left: number = 0,
    top: number = 0,
    right: number = 800,
    bottom: number = 800
): void {
    // Calculate the actual drawing area based on bounds
    const drawWidth = right - left;
    const drawHeight = bottom - top;

    // Create a group for this 2D plane item with offset
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${left}, ${top})`);

    // Add a white background
    const background = document.createElementNS(SVG_NS, "rect");
    background.setAttribute("x", "0");
    background.setAttribute("y", "0");
    background.setAttribute("width", String(drawWidth));
    background.setAttribute("height", String(drawHeight));
    background.setAttribute("fill", "white");
    g.appendChild(background);

    // Render polygons first (so they appear behind circles and lines)
    for (const polygonGroup of polygonGroups) {
        const { lineColor, fillColor, polygon } = polygonGroup;
        const points = polygon.points;

        if (points.length < 3) continue;

        let pointsStr = "";
        for (const pt of points) {
            const px = (pt.x / W) * drawWidth;
            const py = (pt.y / H) * drawHeight;
            pointsStr += `${px},${py} `;
        }

        const polygonElement = document.createElementNS(SVG_NS, "polygon");
        polygonElement.setAttribute("points", pointsStr.trim());
        polygonElement.setAttribute("fill", fillColor);
        polygonElement.setAttribute("stroke", lineColor);
        polygonElement.setAttribute("stroke-width", "2");
        polygonElement.setAttribute("stroke-linejoin", "miter");
        g.appendChild(polygonElement);
    }

    // Render lines
    for (const lineGroup of lineGroups) {
        const { color, width, points } = lineGroup;
        if (points.length < 2) continue;

        let pointsStr = "";
        for (const pt of points) {
            const px = (pt.x / W) * drawWidth;
            const py = (pt.y / H) * drawHeight;
            pointsStr += `${px},${py} `;
        }

        const polyline = document.createElementNS(SVG_NS, "polyline");
        polyline.setAttribute("points", pointsStr.trim());
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", color);
        polyline.setAttribute("stroke-width", String(width));
        polyline.setAttribute("stroke-linejoin", "round");
        polyline.setAttribute("stroke-linecap", "round");
        g.appendChild(polyline);
    }

    // Render circles
    for (const circleGroup of circleGroups) {
        const { lineColor, fillColor, circles } = circleGroup;

        for (const circle of circles) {
            const cx = (circle.x / W) * drawWidth;
            const cy = (circle.y / H) * drawHeight;
            const r = (circle.r / W) * drawWidth; // Scale radius based on width

            const circleElement = document.createElementNS(SVG_NS, "circle");
            circleElement.setAttribute("cx", String(cx));
            circleElement.setAttribute("cy", String(cy));
            circleElement.setAttribute("r", String(r));
            circleElement.setAttribute("fill", fillColor);
            circleElement.setAttribute("stroke", lineColor);
            circleElement.setAttribute("stroke-width", "2");

            // Add tooltip
            const title = document.createElementNS(SVG_NS, "title");
            title.textContent = `Circle at (${circle.x.toFixed(2)}, ${circle.y.toFixed(2)}), r=${circle.r.toFixed(2)}`;
            circleElement.appendChild(title);

            g.appendChild(circleElement);
        }
    }

    svg.appendChild(g);
}

export function render2DPlaneFromCommand(svg: SVGSVGElement, cmd: TwoDPlaneCommand, canvasW: number = 800, canvasH: number = 800): void {
    const bounds = cmd.bounds || { left: 0, top: 0, right: canvasW, bottom: canvasH };
    render2DPlane(
        svg,
        cmd.H,
        cmd.W,
        cmd.circleGroups,
        cmd.lineGroups,
        cmd.polygonGroups,
        bounds.left,
        bounds.top,
        bounds.right,
        bounds.bottom
    );
}
