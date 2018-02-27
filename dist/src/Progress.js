"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const Progress_1 = __importDefault(require("Progress"));
class Progress {
    constructor(total = 10, hidden) {
        if (!hidden) {
            this._progressBar = new Progress_1.default("[:bar] (:percent :elapseds) :message", {
                complete: "▇",
                incomplete: "-",
                // stream: process.stdout,
                width: 40,
                total
            });
            this._startReRender();
        }
    }
    tick(message, count) {
        if (!this._progressBar)
            return;
        this.message(message);
        this._progressBar.tick(count);
    }
    message(message = "") {
        if (!this._progressBar)
            return;
        this._progressBar.render({ message });
    }
    terminate(message) {
        if (!this._progressBar)
            return;
        this._clearReRender();
        this._progressBar.render({ message });
        this._progressBar.terminate();
    }
    _startReRender() {
        if (!this._progressBar)
            return;
        this._reRenderInterval = setInterval(() => {
            if (this._progressBar.complete) {
                this._clearReRender();
            }
            else
                this._progressBar.render();
        }, 500);
    }
    _clearReRender() {
        if (!this._progressBar)
            return;
        clearInterval(this._reRenderInterval);
        this._reRenderInterval = null;
    }
}
exports.default = Progress;
//# sourceMappingURL=Progress.js.map