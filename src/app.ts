import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";

export const createApp = (): Application => {
    const app = express();

    app.use(helmet());
    app.use(cors());
    app.use(express.json());

    app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });
    
    return app;
}
