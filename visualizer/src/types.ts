// Types for the visualizer

// File System Access API types (for browsers that support it)
declare global {
    interface Window {
        showOpenFilePicker(options?: {
            types?: Array<{
                description?: string;
                accept: Record<string, string[]>;
            }>;
            multiple?: boolean;
            excludeAcceptAllOption?: boolean;
        }): Promise<FileSystemFileHandle[]>;
        showDirectoryPicker(options?: {
            mode?: 'read' | 'readwrite';
        }): Promise<FileSystemDirectoryHandle>;
    }

    interface FileSystemFileHandle {
        readonly kind: 'file';
        readonly name: string;
        getFile(): Promise<File>;
    }

    interface FileSystemDirectoryHandle {
        readonly kind: 'directory';
        readonly name: string;
        values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
        getFileHandle(name: string): Promise<FileSystemFileHandle>;
    }
}

export interface Point {
    x: number;
    y: number;
}

export interface GridLine {
    color: string;
    points: Point[];
}

export interface ItemBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface GridCommand {
    type: 'GRID';
    H: number;
    W: number;
    borderColor: string;
    textColor: string;
    gridColors: string[][];
    gridTexts: string[][];
    gridLines: GridLine[];
    wallVertical: string[];
    wallHorizontal: string[];
    bounds?: ItemBounds; // Optional bounds within canvas
}

export interface TextAreaCommand {
    type: 'TEXTAREA';
    text: string;
}

export interface ScoreCommand {
    type: 'SCORE';
    score: string;
}

export interface DebugCommand {
    type: 'DEBUG';
}

export interface Circle {
    x: number;
    y: number;
    r: number;
}

export interface Line2D {
    ax: number;
    ay: number;
    bx: number;
    by: number;
}

export interface Polygon {
    points: Point[];
}

export interface CircleGroup {
    lineColor: string;
    fillColor: string;
    circles: Circle[];
}

export interface LineGroup {
    color: string;
    lines: Line2D[];
}

export interface PolygonGroup {
    lineColor: string;
    fillColor: string;
    polygon: Polygon;
}

export interface TwoDPlaneCommand {
    type: '2D_PLANE';
    H: number;
    W: number;
    circleGroups: CircleGroup[];
    lineGroups: LineGroup[];
    polygonGroups: PolygonGroup[];
    bounds?: ItemBounds; // Optional bounds within canvas
}

export interface CanvasCommand {
    type: 'CANVAS';
    H: number;
    W: number;
}

export type Command = CanvasCommand | GridCommand | TextAreaCommand | ScoreCommand | DebugCommand | TwoDPlaneCommand;

export interface Frame {
    commands: Command[];
    rawText: string;
    showDebug: boolean;
    errors: string[];
}

export interface ParsedModes {
    [modeName: string]: Frame[];
}
