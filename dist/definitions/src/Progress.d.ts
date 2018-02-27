export default class Progress {
    private readonly _progressBar;
    private _reRenderInterval;
    constructor(total?: number, hidden?: boolean);
    tick(message: string, count?: number): void;
    message(message?: string): void;
    terminate(message: string): void;
    private _startReRender();
    private _clearReRender();
}
