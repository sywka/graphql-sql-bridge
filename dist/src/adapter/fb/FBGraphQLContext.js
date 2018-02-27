"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const promise_queue_1 = __importDefault(require("promise-queue"));
class FBGraphQLContext {
    constructor(database) {
        this._queue = new promise_queue_1.default(1);
        this._database = database;
    }
    async query(query, params) {
        return await this._queue.add(() => this._database.query(query, params));
    }
    async execute(query, params) {
        return await this._queue.add(() => this._database.execute(query, params));
    }
}
exports.default = FBGraphQLContext;
//# sourceMappingURL=FBGraphQLContext.js.map