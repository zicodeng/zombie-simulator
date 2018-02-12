import Human from './human';
import Agent from './agent';
import Zombie from './zombie';
import { Point, Facing } from '../util';

export interface HumanState {
    see(target: Agent | null): Agent;
    move(facingBlocked: boolean): Point;
    render(context: CanvasRenderingContext2D): void;
}

export class NormalState implements HumanState {
    constructor(private human: Human) {
        this.human.speed = 0.5;
    }

    move(facingBlocked: boolean): Point {
        if (_.random(1.0) > this.human.speed) {
            // Return original position, don't move.
            return this.human.location;
        }

        // Keep moving on its facing direction if not blocked.
        if (!facingBlocked) {
            this.human.location.x += this.human.facing.x;
            this.human.location.y += this.human.facing.y;
        } else {
            this.human.facing =
                Facing.Directions[_.random(0, Facing.Directions.length - 1)];
        }

        return this.human.location;
    }

    // Runs away from zombies.
    see(target: Agent | null): Agent {
        if (target instanceof Zombie) {
            // Panic and turn around.
            this.human.setState(new PanickedState(this.human, true));
        } else if (
            target instanceof Human &&
            target.state instanceof PanickedState
        ) {
            // Panic without turning.
            this.human.setState(new PanickedState(this.human, false));
        } else {
            if (_.random(1.0) < 0.15)
                // Chance to turn anyway.
                this.human.facing =
                    Facing.Directions[
                        _.random(0, Facing.Directions.length - 1)
                    ];
        }
        return this.human;
    }

    render(context: CanvasRenderingContext2D) {
        context.fillStyle = '#F9A7B0'; // Pink
        context.fillRect(this.human.location.x, this.human.location.y, 1, 1);
    }
}

export class PanickedState implements HumanState {
    private fearLevel: number = 10;

    constructor(private human: Human, turnAround: boolean) {
        this.human.speed = 1;

        if (turnAround) {
            this.human.facing = new Point(
                -1 * this.human.facing.x,
                -1 * this.human.facing.y
            );
        }
    }

    move(facingBlocked: boolean): Point {
        if (_.random(1.0) > this.human.speed) {
            // Return original position, don't move.
            return this.human.location;
        }

        if (!facingBlocked) {
            this.human.location.x += this.human.facing.x;
            this.human.location.y += this.human.facing.y;
        } else {
            this.human.facing =
                Facing.Directions[_.random(0, Facing.Directions.length - 1)];
        }

        return this.human.location;
    }

    see(target: Agent | null): Agent {
        if (this.fearLevel > 0) {
            this.fearLevel--;
        }

        if (target instanceof Zombie) {
            this.fearLevel = 10;
        }

        if (this.fearLevel == 0) {
            this.human.setState(new NormalState(this.human));
        }

        return this.human;
    }

    render(context: CanvasRenderingContext2D) {
        context.fillStyle = '#FFF380'; // Yellow
        context.fillRect(this.human.location.x, this.human.location.y, 1, 1);
    }
}

export class ArmedState implements HumanState {
    constructor(private human: Human) {
        this.human.speed = 1; // Always move and try to help other survivors.
    }

    move(facingBlocked: boolean): Point {
        if (_.random(1.0) > this.human.speed) {
            // Return original position, don't move.
            return this.human.location;
        }

        if (!facingBlocked) {
            this.human.location.x += this.human.facing.x;
            this.human.location.y += this.human.facing.y;
        } else {
            this.human.facing =
                Facing.Directions[_.random(0, Facing.Directions.length - 1)];
        }

        return this.human.location;
    }

    see(target: Agent | null): Agent {
        if (_.random(1.0) < 0.5)
            // Chance to turn anyway.
            this.human.facing =
                Facing.Directions[_.random(0, Facing.Directions.length - 1)];
        return this.human;
    }

    render(context: CanvasRenderingContext2D) {
        context.fillStyle = 'blue'; // Yellow
        context.fillRect(this.human.location.x, this.human.location.y, 1, 1);
    }
}
