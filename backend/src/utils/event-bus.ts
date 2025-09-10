/**
 * Event Bus for inter-service communication
 */

import { EventEmitter } from 'events';

/**
 * Event Bus for managing events between services
 */
export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for high-volume events
  }

  /**
   * Emit event with error handling
   */
  emit(event: string, ...args: any[]): boolean {
    try {
      return super.emit(event, ...args);
    } catch (error) {
      console.error('Error emitting event:', event, error);
      return false;
    }
  }

  /**
   * Subscribe to event with error handling
   */
  on(event: string, listener: (...args: any[]) => void): this {
    const wrappedListener = (...args: any[]) => {
      try {
        listener(...args);
      } catch (error) {
        console.error('Error in event listener:', event, error);
      }
    };
    
    return super.on(event, wrappedListener);
  }
}
