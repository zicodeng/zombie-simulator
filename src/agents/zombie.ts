import Agent from './agent';
import Human from './human';
import { Point, Facing } from './../util';

class Zombie extends Agent {
    private timePursuing = 0;
    speed: number = 0.2; // Chance to move.

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

    // Chases humans!
    see(target: Agent | null): Agent {
        if (this.timePursuing > 0) this.timePursuing--;

        if (target instanceof Human) {
            this.timePursuing = 10; // Start chasing.
        } else if (this.timePursuing === 0 && !target) {
            // If don't see anything, it wanders again.
            this.facing =
                Facing.Directions[_.random(0, Facing.Directions.length - 1)];
        }
        return this;
    }

    // Bites humans!
    interactWith(target: Agent): Agent {
        if (target instanceof Human) {
            return new Zombie(target.location, target.facing);
        }
        return target;
    }

    render(context: CanvasRenderingContext2D) {
        context.fillStyle = '#0f0'; // Green.
        context.fillRect(this.location.x, this.location.y, 1, 1);
    }
}

export default Zombie;
