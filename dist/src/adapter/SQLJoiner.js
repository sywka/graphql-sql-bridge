"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const nesthydrationjs_1 = __importDefault(require("nesthydrationjs"));
const Analyzer_1 = __importDefault(require("./Analyzer"));
const AliasNamespace_1 = __importDefault(require("./AliasNamespace"));
const SQLObject_1 = __importDefault(require("./SQLObject"));
class SQLJoiner {
    static async join(info, options, callback) {
        const analyzer = new Analyzer_1.default();
        const queries = analyzer.resolveInfo(info);
        const sqlQueries = queries.map(query => {
            return SQLObject_1.default.createQuery(query, new AliasNamespace_1.default(options.minify));
        });
        const result = await callback(sqlQueries[0].sql); //TODO
        return nesthydrationjs_1.default().nest(result, sqlQueries[0].definitions);
    }
}
exports.default = SQLJoiner;
//# sourceMappingURL=SQLJoiner.js.map