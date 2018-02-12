import Agent from './agent';
import Zombie from './zombie';
import { Point, Facing } from './../util';

class Human extends Agent {
    protected speed: number = 0.5; // Chance to move (percentage)

    constructor(public location: Point, public facing: Point = Facing.South) {
        super(location, facing);
    }

    move(facingBlocked: boolean = false) {
        if (_.random(1.0) > this.speed) return this.location; // Don't move.

        if (!facingBlocked) {
            this.location.x += this.facing.x;
            this.location.y += this.facing.y;
        } else {
            this.facing =
                Facing.Directions[_.random(0, Facing.Directions.length - 1)];
        }

        return this.location;
    }

    // Runs away from zombies.
    see(target: Agent | null): Agent {
        if (target instanceof Zombie) {
            // Panic and turn around.
            return new PanickedHuman(
                this.location,
                new Point(-1 * this.facing.x, -1 * this.facing.y)
            );
        } else if (target instanceof PanickedHuman) {
            // Panic without turning.
            return new PanickedHuman(this.location, this.facing);
        } else {
            if (_.random(1.0) < 0.15)
                // Chance to turn anyway.
                this.facing =
                    Facing.Directions[
                        _.random(0, Facing.Directions.length - 1)
                    ];
        }
        return this;
    }

    render(context: CanvasRenderingContext2D) {
        context.fillStyle = '#F9A7B0'; //pink
        context.fillRect(this.location.x, this.location.y, 1, 1);
    }
}

export default Human;

class PanickedHuman extends Human {
    private fearLevel: number = 10;

    constructor(public location: Point, public facing: Point = Facing.South) {
        super(location, facing);
        this.speed = 1.0; // Always move
    }

    see(target: Agent | null): Agent {
        if (this.fearLevel > 0) {
            this.fearLevel--;
        }

        if (target instanceof Zombie) {
            this.fearLevel = 10;
        }

        if (this.fearLevel == 0) {
            return new Human(this.location, this.facing);
        }

        return this;
    }

    render(context: CanvasRenderingContext2D) {
        context.fillStyle = '#FFF380'; // Yellow
        context.fillRect(this.location.x, this.location.y, 1, 1);
    }
}
