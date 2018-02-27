/// <reference types="express" />
import { Router } from "express";
export default abstract class BaseRouter<Options> {
    private readonly _options;
    private readonly _router;
    protected constructor(options?: Options);
    readonly router: Router;
    protected abstract routes(router: Router, options: Options): any;
}
