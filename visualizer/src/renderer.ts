import { GridCommand, GridLine } from './types';

const SVG_NS = "http://www.w3.org/2000/svg";

export function renderGrid(
    container: HTMLElement,
    H: number,
    W: number,
    borderColor: string,
    textColor: string,
    gridColors: string[][],
    gridTexts: string[][],
    gridLines: GridLine[],
    wallVertical: string[] = [],
    wallHorizontal: string[] = []
): void {
    const canvasSize = 800;
    const cellWidth = canvasSize / W;
    const cellHeight = canvasSize / H;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(canvasSize));
    svg.setAttribute("height", String(canvasSize));
    svg.style.margin = "10px 0";
    svg.style.display = "block";
    svg.style.overflow = "visible";

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

            svg.appendChild(rect);

            // Render Text
            if (textContent) {
                const charCount = textContent.length;
                const effectiveChars = Math.max(charCount, 1);

                let usedFontSize: number;
                if (charCount <= 4) {
                    usedFontSize = Math.min(cellHeight * 0.7, (cellWidth / effectiveChars) * 1.2);
                } else {
                    usedFontSize = Math.min(cellHeight * 0.6, cellWidth / 5.5);
                }

                usedFontSize = Math.min(usedFontSize, 30);

                const textElement = document.createElementNS(SVG_NS, "text");
                textElement.setAttribute("x", String(x * cellWidth + cellWidth / 2));
                textElement.setAttribute("y", String(y * cellHeight + cellHeight / 2));
                textElement.setAttribute("fill", textColor);
                textElement.setAttribute("font-size", String(usedFontSize));
                textElement.setAttribute("font-family", "sans-serif");
                textElement.setAttribute("text-anchor", "middle");
                textElement.setAttribute("dominant-baseline", "middle");
                textElement.setAttribute("pointer-events", "none");
                textElement.textContent = textContent;
                svg.appendChild(textElement);
            }
        }
    }

    // Render walls
    const wallWidth = 2;

    // Render vertical walls
    if (wallVertical.length > 0) {
        for (let j = 0; j <= W; j++) {
            if (j < wallVertical.length) {
                const wallString = wallVertical[j];
                for (let i = 0; i < H && i < wallString.length; i++) {
                    if (wallString[i] === 'Y') {
                        const line = document.createElementNS(SVG_NS, "line");
                        line.setAttribute("x1", String(j * cellWidth));
                        line.setAttribute("y1", String(i * cellHeight));
                        line.setAttribute("x2", String(j * cellWidth));
                        line.setAttribute("y2", String((i + 1) * cellHeight));
                        line.setAttribute("stroke", borderColor);
                        line.setAttribute("stroke-width", String(wallWidth));
                        line.setAttribute("pointer-events", "none");
                        svg.appendChild(line);
                    }
                }
            }
        }
    } else {
        // Default: all vertical walls exist
        for (let j = 0; j <= W; j++) {
            for (let i = 0; i < H; i++) {
                const line = document.createElementNS(SVG_NS, "line");
                line.setAttribute("x1", String(j * cellWidth));
                line.setAttribute("y1", String(i * cellHeight));
                line.setAttribute("x2", String(j * cellWidth));
                line.setAttribute("y2", String((i + 1) * cellHeight));
                line.setAttribute("stroke", borderColor);
                line.setAttribute("stroke-width", String(wallWidth));
                line.setAttribute("pointer-events", "none");
                svg.appendChild(line);
            }
        }
    }

    // Render horizontal walls
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
                        svg.appendChild(line);
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
                svg.appendChild(line);
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
            svg.appendChild(polyline);

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
                svg.appendChild(circle);
            }
        }
    }

    container.appendChild(svg);
}

export function renderGridFromCommand(container: HTMLElement, cmd: GridCommand): void {
    renderGrid(
        container,
        cmd.H,
        cmd.W,
        cmd.borderColor,
        cmd.textColor,
        cmd.gridColors,
        cmd.gridTexts,
        cmd.gridLines,
        cmd.wallVertical,
        cmd.wallHorizontal
    );
}
