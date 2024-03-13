import { NodeDef } from 'node-red';

export interface EventManagerDispatcherDef extends NodeDef {
    name: string;
    maxConcurrency: number;
    debugStatus: boolean;
}
