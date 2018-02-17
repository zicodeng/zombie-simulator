import Agent from './agents/agent';
import Area from './area';

import { Point, Facing, Colors, Config } from './util';
import { BuildingStrategy } from './building-strategies';
import { City } from './city';

export class Building extends Area {
    private exits: Array<Point> = []; // In global coordinates.
    public population: Agent[] = [];

    constructor(
        readonly min: Point,
        readonly max: Point,
        private strategy: BuildingStrategy
    ) {
        super();
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

    moveAgents(): void {
        // Use a "filter" to remove agents who have left
        // The filter() callback has a "side effect" of moving agents.
        this.population = this.population.filter(agent => {
            let nextSpot = new Point(
                agent.location.x + agent.facing.x,
                agent.location.y + agent.facing.y
            );

            // If next spot is outside (not in this area), check outside (other areas).
            if (!this.contains(nextSpot)) {
                if (!this.composite) {
                    return;
                }
                let otherArea = this.composite.areaAt(nextSpot);
                if (otherArea === null) {
                    if (this.composite.agentAt(nextSpot) === null) {
                        this.composite.addAgent(agent);
                        return false;
                    }
                } else {
                    // Is another building (complex edge case).
                    let open =
                        otherArea.hasDoorAt(nextSpot) &&
                        otherArea.agentAt(nextSpot) === null;
                    if (open) {
                        otherArea.addAgent(agent);
                        return false;
                    }
                }
                agent.move(true); // Spot is another building, but we're blocked.
            } else if (this.hasWallAt(nextSpot) && !this.hasDoorAt(nextSpot)) {
                // Check walls.
                agent.move(true); // Blocked
            } else {
                agent.move(this.agentAt(nextSpot) !== null); // Move if not blocked.
            }

            return true; // Keep the agent.
        });
    }

    public lookAhead(start: Point, direction: Point): Agent | null {
        // Linear search for closest agent.
        let closest = null;
        const maxDistance = this.strategy.maxDistance;
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

    public render(context: CanvasRenderingContext2D) {
        context.fillStyle = Colors.wall; // Outside wall
        context.fillRect(
            this.min.x,
            this.min.y,
            this.max.x - this.min.x + 1,
            this.max.y - this.min.y + 1
        );

        this.strategy.setBuildingColor(context);

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
