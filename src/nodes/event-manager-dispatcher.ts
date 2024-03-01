import { Node, NodeAPI, NodeMessageInFlow } from 'node-red';
import { EventManagerDispatcherDef } from './event-manager-dispatcher.def';
import { EventsQueue } from './../libs/events-queue';
import { addSharedData, deleteSharedData } from './../libs/node-red-utils';

export = (RED: NodeAPI): void => {

  RED.nodes.registerType('event-manager-dispatcher', eventManagerDispatcher);

  function eventManagerDispatcher(this: Node<EventManagerDispatcherDef>, config: EventManagerDispatcherDef) {

    RED.nodes.createNode(this, config); // First line always!

    this.debug('Event Manager Dispatcher created');

    // Create Queue
    const eventsQueue = new EventsQueue<NodeMessageInFlow>(config.maxConcurrency);
    eventsQueue.startConsumingEvents();

    // Save link
    addSharedData(this, 'eventsQueue', eventsQueue);

    this.status({ fill: 'green', shape: 'dot', text: 'Ready' });

    eventsQueue.setConsumeEvents((msg) => {

      // Update node status
      this.status({ fill: eventsQueue.isPrintStatusWarning(),  shape: 'dot', text: `${eventsQueue.printStatus()}` });

      // Add to msg current node id to perform checkpoint
      const dispatcherNodeId = `${this.id}`;
      RED.util.setMessageProperty(msg, '_dispatchNodeId', dispatcherNodeId, true);

      // Send message
      this.send(msg);

    });

    /** On Input */
    this.on('input', async (msg: NodeMessageInFlow, send, done) => {
      try {

        eventsQueue.enqueue(msg);

        // Update node status
        this.status({ fill: eventsQueue.isPrintStatusWarning(),  shape: 'dot', text: `${eventsQueue.printStatus()}` });

        done();

      } catch (error: any) {
        this.debug('Errored');
        done(error);
      }

    });

    // removed -> "Node disabled / deleted" | !removed -> "Node is reestarted"
    this.on('close', async (removed: boolean, done: () => void) => {
      this.debug('Event Manager Dispatcher Closed');
      deleteSharedData(this, 'eventsQueue');
      done();
    });

  }

}


