import { Point, Facing } from './../util';
import { HumanState } from './human-states';

/** un-comment below to enable deterministic random for testing **/
import * as lodash from 'lodash';
import * as seedrandom from 'seedrandom'; // Seeded random numbers.
seedrandom('1', { global: true }); // Seed the random value.
_ = lodash.runInContext(); // Load with global seed.

abstract class Agent {
    constructor(public location: Point, public facing: Point = Facing.South) {}

    // Moves the agent, letting them know if they are blocked in current facing.
    // Returns new location (for convenience).
    abstract move(facingBlocked: boolean): Point;

    // Reacts to other agent (or lackthereof) it sees.
    // Returns the updated self (for convenience/transforming).
    see(target: Agent | null): Agent {
        return this; // No modification (default)
    }

    // Interacts with (modifies) other agent.
    // Returns the modified other (for convenience/transforming).
    interactWith(target: Agent): Agent | null {
        return target; // No modification (default).
    }

    abstract render(context: CanvasRenderingContext2D): void;
}

export default Agent;
