"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
class BaseRouter {
    constructor(options) {
        this._options = options;
        this._router = express_1.Router();
        this.routes(this._router, this._options);
    }
    get router() {
        return this._router;
    }
}
exports.default = BaseRouter;
//# sourceMappingURL=BaseRouter.js.map