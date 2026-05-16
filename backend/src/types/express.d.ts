import { AuthenticatedUser } from '../auth/types';

declare global {
    namespace Express {
        interface Request {
            auth?: AuthenticatedUser & {
                sessionId: string;
                csrfToken: string;
            };
        }
    }
}

export {};
