import type { HydratedDocument } from "mongoose";

import type { ISession } from "../modules/auth/session.model.js";
import type { IUser } from "../modules/auth/user.model.js";

declare global {
    namespace Express {
        interface Request {
            auth?: {
                user: HydratedDocument<IUser>;
                session: HydratedDocument<ISession>;
                tokenSource: "cookie" | "bearer";
            };
        }
    }
}

export {};
