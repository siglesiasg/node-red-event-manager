import { NodeDef } from 'node-red';

export interface EventManagerCheckpointDef extends NodeDef {
    name: string;
    debugStatus: boolean;
}
