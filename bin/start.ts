import express, {NextFunction, Request, Response} from "express";
import {express as expressMiddleware} from "graphql-voyager/middleware";
import FBExpress from "../src/adapter/fb/FBExpress";

const app = express();

app.use("/schema/viewer", (req: Request, res: Response, next: NextFunction) => {
    expressMiddleware({
        endpointUrl: "/",
        displayOptions: req.query
    })(req, res, next);
});
app.use(new FBExpress({
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
        // "GD_PLACE",
        // "WG_POSITION"
    ]
}).router);

app.listen(3002, "192.168.0.62");