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
    if ('true' === config.consumeEventsOnStart) {
      eventsQueue.startConsumingEvents();
      this.status({ fill: 'green', shape: 'dot', text: 'Consuming events' });
    } else {
      this.status({ fill: 'yellow',  shape: 'dot', text: 'Not consuming events' });
    }

    // Save link
    addSharedData(this, 'eventsQueue', eventsQueue);

    eventsQueue.setConsumeEvents((msg) => {

      // Debug node status
      if ('true' === config.debugStatus) {
        this.status({ fill: eventsQueue.isPrintStatusWarning(),  shape: 'dot', text: `${eventsQueue.printStatus()}` });
      }

      // Add to msg current node id to perform checkpoint
      const dispatcherNodeId = `${this.id}`;
      RED.util.setMessageProperty(msg, '_dispatchNodeId', dispatcherNodeId, true);

      // Send message
      this.send(msg);

    });

    /** On Input -> Check if it's a config message or enqueue all messages */
    this.on('input', async (msg: NodeMessageInFlow, send, done) => {
      try {

        // Message of loading config
        if (dinamicConfig(this, msg)) {
          done();
          return; // Do not enqueue this message
        }

        if (!eventsQueue.isConsumingEvents()) {
          this.status({ fill: 'yellow',  shape: 'dot', text: `Not consuming events. In queue: ${eventsQueue.size()}` });
        }

        // Enqueue message to be sent
        eventsQueue.enqueue(msg);

        // Update node status
        if ('true' === config.debugStatus) {
          this.status({ fill: eventsQueue.isPrintStatusWarning(),  shape: 'dot', text: `${eventsQueue.printStatus()}` });
        }
        done();

      } catch (error: any) {
        this.debug('Errored');
        done(error);
      }

    });

    // removed -> "Node disabled / deleted" | !removed -> "Node is reestarted"
    this.on('close', async (removed: boolean, done: () => void) => {
      this.debug('Event Manager Dispatcher Closed');
      eventsQueue.stopConsumingEvents();
      deleteSharedData(this, 'eventsQueue');
      done();
    });


    function dinamicConfig(node: Node<EventManagerDispatcherDef>, msg: NodeMessageInFlow): boolean {
      const payload = RED.util.getMessageProperty(msg, 'payload');

      if (payload && (payload.isEventManagerConfig === true || payload.isEventManagerConfig === 'true')) {

        // Set the concurrency
        if (payload.maxConcurrency && !isNaN(+payload.maxConcurrency)) {
          eventsQueue.setMaxConcurrency(Number(payload.maxConcurrency));
        }

        if (payload.consumeEvents || payload.consumeEvents === false) {
          if (payload.consumeEvents) {
            node.status({ fill: 'green', shape: 'dot', text: 'Consuming events' });
            eventsQueue.startConsumingEvents();
          } else {
            node.status({ fill: 'yellow',  shape: 'dot', text: `Not consuming events. In queue: ${eventsQueue.size()}` });
            eventsQueue.stopConsumingEvents();
          }
        }
        // Print debug
        if ('true' === config.debugStatus) {
          node.status({ fill: eventsQueue.isPrintStatusWarning(),  shape: 'dot', text: `${eventsQueue.printStatus()}` });
        }

        return true;
      }

      return false;
    }

  }

}


