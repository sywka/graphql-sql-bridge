"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const middleware_1 = require("graphql-voyager/middleware");
const FBExpress_1 = __importDefault(require("../src/adapter/fb/FBExpress"));
const app = express_1.default();
app.use("/schema/viewer", (req, res, next) => {
    middleware_1.express({
        endpointUrl: "/",
        displayOptions: req.query
    })(req, res, next);
});
app.use(new FBExpress_1.default({
    host: "brutto",
    port: 3053,
    user: "SYSDBA",
    password: "masterkey",
    database: "k:\\bases\\broiler\\GDBASE_2017_10_02.FDB",
    graphiql: true,
    maxConnectionPool: 100,
    // excludePattern: "AT_+",
    include: [
        "GD_CONTACT",
        "GD_PEOPLE",
    ]
}).router);
app.listen(3002, "192.168.0.62");
//# sourceMappingURL=start.js.map