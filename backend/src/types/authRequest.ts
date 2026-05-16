import { Request } from 'express';
import { AuthenticatedUser } from '../auth/types';

export type AuthRequest = Request & {
    auth?: AuthenticatedUser & {
        sessionId: string;
        csrfToken: string;
    };
};
