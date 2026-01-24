// Types for the visualizer

export interface Point {
    x: number;
    y: number;
}

export interface GridLine {
    color: string;
    points: Point[];
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

export type Command = GridCommand | TextAreaCommand | ScoreCommand | DebugCommand;

export interface Frame {
    commands: Command[];
    rawText: string;
    showDebug: boolean;
    errors: string[];
}

export interface ParsedModes {
    [modeName: string]: Frame[];
}
