import { NodeStatusFill } from "node-red";


export class EventsQueue<T> {

  private elements: T[] = [];
  private onConsumeEvents: ((element: T) => void) | null = null;

  private isConsuming = false;
  private maxConcurrency: number;

  private currentlyUncheckedEvents = 0;

  constructor(maxConcurrency: number = Infinity) {
    this.maxConcurrency = maxConcurrency;
  }

  setMaxConcurrency(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  getAvailableSlots(): number {
    return this.maxConcurrency - this.currentlyUncheckedEvents;
  }

  // Add an element to the queue
  enqueue(element: T) {
    this.elements.push(element);
  }

  // Remove and return an element from the front of the queue
  dequeue(): T | undefined {
    return this.elements.shift();
  }

  // Get the size of the queue
  size(): number {
    return this.elements.length;
  }

  startConsumingEvents() {
    this.isConsuming = true;
    this.consumeEvents();
  }

  stopConsumingEvents() {
    this.isConsuming = false;
  }

  checkEvent() {
    if (this.currentlyUncheckedEvents === 0) {
      return;
    }
    this.currentlyUncheckedEvents--;
  }

  // Set event handlers
  setConsumeEvents(callback: (element: T) => void) {
    this.onConsumeEvents = callback;
  }

  printStatus(): string {
    return `Pending ${this.elements.length}. Available slots ${this.getAvailableSlots()} of ${this.maxConcurrency}`;
  }

  isPrintStatusWarning(): NodeStatusFill {
    if (this.getAvailableSlots() === 0) {
      return 'yellow';
    } else {
      return 'green';
    }
  }


  private async consumeEvents() {

    while (this.isConsuming) {

      // Stepping
      await new Promise(f => setTimeout(f, 10));

      // Loop to inject pending in slots available
      while (this.size() > 0) {
        // No pool for more events
        if (this.currentlyUncheckedEvents >= this.maxConcurrency) {
          break;
        }
        this.currentlyUncheckedEvents++;
        this.onConsumeEvents(this.dequeue());
      }

    }
  }

}
