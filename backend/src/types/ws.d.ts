declare module 'ws' {
    export class WebSocketServer {
        clients: Set<{ readyState: number; send(data: string): void }>;

        constructor(options: { server: unknown; path?: string });
        on(event: 'connection', listener: (socket: { send(data: string): void }) => void): this;
    }
}
