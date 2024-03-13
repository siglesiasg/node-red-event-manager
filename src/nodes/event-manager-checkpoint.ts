import { Node, NodeAPI, NodeMessageInFlow } from 'node-red';
import { EventManagerCheckpointDef } from './event-manager-checkpoint.def';
import { getSharedData } from './../libs/node-red-utils';
import { EventsQueue } from './../libs/events-queue';

export = (RED: NodeAPI): void => {

  RED.nodes.registerType('event-manager-checkpoint', eventManagerCheckpoint);

  function eventManagerCheckpoint(this: Node<EventManagerCheckpointDef>, config: EventManagerCheckpointDef) {

    RED.nodes.createNode(this, config); // First line always!

    this.debug('Event Manager Checkpoint created');

    this.status({ fill: 'green', shape: 'dot', text: 'Ready' });

    /** On Input */
    this.on('input', async (msg: NodeMessageInFlow, send, done) => {
      try {

        // Recover origin
        const _dispatchNodeId: string = (msg as any)._dispatchNodeId;
        if (!_dispatchNodeId) {
          throw new Error('Unable to get _dispatchNodeId attribute from message');
        }
        const eventsQueue: EventsQueue<NodeMessageInFlow> = getSharedData(RED, _dispatchNodeId, 'eventsQueue');

        eventsQueue.checkEvent();

        // Update origin node message
        if ('true' === config.debugStatus) {
          const nodeAny = RED.nodes.getNode(_dispatchNodeId) as any;
          nodeAny.status({ fill: eventsQueue.isPrintStatusWarning(), shape: 'dot', text: `${eventsQueue.printStatus()}` });

          // Update node as checked
          this.status({ fill: 'green', shape: 'dot', text: 'Checked' });
        }


        done();

      } catch (error: any) {
        this.status({ fill: 'red', shape: 'dot', text: error });
        this.debug('Errored');
        done(error);
      }

    });

    // removed -> "Node disabled / deleted" | !removed -> "Node is reestarted"
    this.on('close', async (removed: boolean, done: () => void) => {
      this.debug('Event Manager Checkpoint Closed');
      done();
    });

  }

}


