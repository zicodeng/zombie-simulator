import Agent from './agent';
import Zombie from './zombie';
import { Point, Facing } from './../util';
import { HumanState, NormalState, ArmedState } from './human-states';

class Human extends Agent {
    // Store State object as an instance variable.
    public state: HumanState = _.random(0, 100) < 1
        ? new ArmedState(this) // 1/100 human is armed.
        : new NormalState(this);

    public speed: number = 0; // Chance to move.

    constructor(public location: Point, public facing: Point = Facing.South) {
        super(location, facing);
    }

    setState(newState: HumanState) {
        this.state = newState;
    }

    see(target: Agent | null): Agent {
        return this.state.see(target);
    }

    move(facingBlocked: boolean): Point {
        return this.state.move(facingBlocked);
    }

    render(context: CanvasRenderingContext2D) {
        this.state.render(context);
    }
}

export default Human;
