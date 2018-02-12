import { Point, Facing, Colors, Config } from './util';
import Agent from './agents/agent';
import { BuildingStrategy } from './building-strategies';

export class Building {
    private exits: Array<Point> = []; // In global coordinates.
    public population: Agent[] = [];

    constructor(
        readonly min: Point,
        readonly max: Point,
        private strategy?: BuildingStrategy
    ) {
        let width = this.max.x - this.min.x;
        let height = this.max.y - this.min.y;

        // Define exits.
        let perimeter = width * 2 + height * 2;
        let numExits = _.random(Config.numberExits.min, Config.numberExits.max);
        let spots = _.sampleSize(_.range(1, perimeter - 3), numExits);
        this.exits = spots.map(spot => {
            if (spot < width) return new Point(this.min.x + spot, this.min.y); // Top wall
            spot -= width;
            spot++; // Move around corner.
            if (spot < height) return new Point(this.max.x, this.min.y + spot); // Left wall.
            spot -= height;
            spot++;
            if (spot < width) return new Point(this.max.x - spot, this.max.y); // Bottom wall
            spot -= width;
            spot++;
            return new Point(this.min.x, this.max.y - spot); // Right wall
        });
    }

    public lookAhead(start: Point, direction: Point): Agent | null {
        // Linear search for closest agent.
        let closest = null;
        const maxDistance = this.strategy ? this.strategy.maxDistance : 10;
        let closestDist = maxDistance + 1;

        for (let agent of this.population) {
            let loc = agent.location;
            let dx = (loc.x - start.x) * direction.x; // Distance scaled by facing.
            let dy = (loc.y - start.y) * direction.y; // Distance scaled by facing.
            if (
                (start.x == loc.x && (dy > 0 && dy < closestDist)) ||
                (start.y == loc.y && (dx > 0 && dx < closestDist))
            ) {
                // Can see agent.
                closestDist = Math.max(dx, dy);
                closest = agent;
            }
        }

        return closest;
    }

    // Walls are consider to be "in" the building.
    public contains(location: Point): boolean {
        return (
            location.x >= this.min.x &&
            location.x <= this.max.x &&
            location.y >= this.min.y &&
            location.y <= this.max.y
        );
    }

    // Includes doors (basically: on border).
    public hasWallAt(location: Point): boolean {
        // console.log('loc:', location, 'min:',this.min, 'max:',this.max);
        let potentialWall =
            location.x === this.min.x ||
            location.x === this.max.x ||
            location.y === this.min.y ||
            location.y === this.max.y;
        return potentialWall && this.contains(location);
    }

    public hasDoorAt(location: Point): boolean {
        for (let exit of this.exits) {
            if (exit.x === location.x && exit.y === location.y) return true;
        }
        return false;
    }

    public agentAt(location: Point): Agent | null {
        for (let agent of this.population) {
            if (
                agent.location.x == location.x &&
                agent.location.y == location.y
            )
                return agent;
        }
        return null;
    }

    public addAgent(agent: Agent) {
        this.population.unshift(agent); // Add to front so act first when arriving.
    }

    public render(context: CanvasRenderingContext2D) {
        context.fillStyle = Colors.wall; // Outside wall
        context.fillRect(
            this.min.x,
            this.min.y,
            this.max.x - this.min.x + 1,
            this.max.y - this.min.y + 1
        );

        this.strategy
            ? this.strategy.setBuildingColor(context)
            : (context.fillStyle = Colors.building); // Inside floor
        context.fillRect(
            this.min.x + 1,
            this.min.y + 1,
            this.max.x - this.min.x - 1,
            this.max.y - this.min.y - 1
        );

        // Exits (rendered individually)
        context.fillStyle = Colors.building;
        for (let exit of this.exits) {
            context.fillRect(exit.x, exit.y, 1, 1); // Building.WALL_WIDTH, Building.WALL_WIDTH);
        }

        // Agents
        for (let agent of this.population) {
            agent.render(context);
        }
    }
}

export default Building;
