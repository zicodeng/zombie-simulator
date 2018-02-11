import { Point, Facing } from './util';
import { Agent, Human, Zombie } from './agents';

import * as lodash from 'lodash';

// This seeds Math.random(), so use original lodash context for non-deterministic random.
import * as seedrandom from 'seedrandom'; // Seeded random numbers.

let _ = lodash; //alias that can be modified (for seeding random numbers)

const Colors = {
    // From mapbox.streets-basic.
    building: '#d9ccbf',
    outside: '#ede5c9', //'#dee0c1'
    wall: '#c8c2ac'
};

// City creation parameters; can adjust here.
const Config = {
    populationPercentage: 0.05, // 5% density works nicely.
    blockSize: { min: 15, max: 40 },
    buildingSize: { min: 10, max: 25 },
    numberExits: { min: 2, max: 10 }
};

// Holds all the agents.
export class City {
    private outside: Agent[] = [];
    private buildings: Building[] = [];

    constructor(
        readonly width: number,
        readonly height: number,
        private mapSeed: string | null
    ) {
        if (mapSeed) {
            seedrandom(mapSeed, { global: true }); // Seed the random value.
            _ = lodash.runInContext(); // Load with global seed.
        } else {
            _ = lodash; // Load original (unseeded) globals.
        }

        // Size accounts for border road.
        this.buildings = this.makeSubdivision(
            new Point(1, 1),
            new Point(width - 1, height - 1)
        );

        this.populate();
    }

    // Recursively divides the area into a block.
    private makeSubdivision(min: Point, max: Point, iter = -1): Building[] {
        if (iter === 0) {
            return [];
        } // If counted down.

        const width = max.x - min.x;
        const height = max.y - min.y;

        // A valid building size needs to be greater than
        // configured buildingSize and smaller than blockSize.
        const atWidth = width < Config.blockSize.max;
        const atHeight = height < Config.blockSize.max;
        if (atWidth && atHeight) {
            if (
                width > Config.buildingSize.min &&
                height > Config.buildingSize.min
            ) {
                let building = new Building(
                    new Point(min.x + _.random(1, 2), min.y + _.random(1, 2)), // Min corner.
                    new Point(max.x - _.random(1, 2), max.y - _.random(1, 2)) // Max corner.
                );
                return [building]; // List of created (single) building.
            } else {
                return []; // List of no buildings.
            }
        }

        // Determine to divide the area by X or Y.
        let divideOnX = _.random(0, 1) === 1;
        if (atHeight) divideOnX = true;
        if (atWidth) divideOnX = false;

        let sub1, sub2;
        if (divideOnX) {
            const div = _.random(min.x, max.x);
            sub1 = this.makeSubdivision(
                new Point(min.x, min.y),
                new Point(div, max.y),
                --iter
            );
            sub2 = this.makeSubdivision(
                new Point(div, min.y),
                new Point(max.x, max.y),
                --iter
            );
        } else {
            const div = _.random(min.y, max.y);
            sub1 = this.makeSubdivision(
                new Point(min.x, min.y),
                new Point(max.x, div),
                --iter
            );
            sub2 = this.makeSubdivision(
                new Point(min.x, div),
                new Point(max.x, max.y),
                --iter
            );
        }
        return _.concat(sub1, sub2);
    }

    private populate() {
        let possiblePlaces: { loc: Point; building: Building | null }[] = [];
        let walls = 0;
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                const loc = new Point(i, j);
                let building = this.buildingAt(loc);
                if (building == null || !building.hasWallAt(loc)) {
                    possiblePlaces.push({ loc: loc, building: building });
                }
            }
        }

        // Sample and place people.
        let numHumans = Math.floor(
            this.width * this.height * Config.populationPercentage
        );

        _.sampleSize(possiblePlaces, numHumans + 1).forEach((placeObj, idx) => {
            let newAgent;
            if (idx < numHumans)
                newAgent = new Human(placeObj.loc); //last person is a zombie!
            else newAgent = new Zombie(placeObj.loc);

            if (placeObj.building) {
                placeObj.building.addAgent(newAgent);
            } else {
                this.outside.push(newAgent);
            }
        });
    }

    public moveAll() {
        // Look around.
        for (let i = 0; i < this.outside.length; i++) {
            let agent = this.outside[i];
            let seenAgent = this.lookAhead(agent.location, agent.facing);
            this.outside[i] = agent.see(seenAgent);
        }

        // Use a "filter" to remove agents who have left
        // The filter() callback has a "side effect" of moving agents.
        this.outside = this.outside.filter(agent => {
            let nextSpot = new Point(
                agent.location.x + agent.facing.x,
                agent.location.y + agent.facing.y
            );

            // Check boundaries.
            if (
                nextSpot.x < 0 ||
                nextSpot.x >= this.width ||
                nextSpot.y < 0 ||
                nextSpot.y >= this.height
            ) {
                agent.move(true); // Blocked by city limits.
            } else {
                // Check buildings.
                let building = this.buildingAt(nextSpot);
                if (building) {
                    let open =
                        building.hasDoorAt(nextSpot) &&
                        building.agentAt(nextSpot) === null;
                    if (open) {
                        building.addAgent(agent); // Building will handle movement.
                        return false; // Don't keep the agent.
                    } else {
                        agent.move(true); // Blocked
                    }
                } else {
                    agent.move(this.agentAt(nextSpot) !== null);
                }
            }
            return true; // Keep the agent.
        });

        // Interact with whoever is next to the agent.
        for (let agent of this.outside) {
            let nextSpot = new Point(
                agent.location.x + agent.facing.x,
                agent.location.y + agent.facing.y
            );
            let target = this.agentAt(nextSpot);
            if (target) {
                let idx = this.outside.indexOf(target);
                this.outside[idx] = agent.interactWith(target);
            }
        }

        // Move agents in buildings.
        for (let building of this.buildings) {
            // Look around.
            for (let i = 0; i < building.population.length; i++) {
                let agent = building.population[i];
                let seenAgent = this.lookAhead(agent.location, agent.facing);
                building.population[i] = agent.see(seenAgent);
            }

            // Use a "filter" to remove agents who have left
            // The filter() callback has a "side effect" of moving agents.
            building.population = building.population.filter(agent => {
                let nextSpot = new Point(
                    agent.location.x + agent.facing.x,
                    agent.location.y + agent.facing.y
                );

                // If next spot is outside, check outside.
                if (!building.contains(nextSpot)) {
                    let otherBuilding = this.buildingAt(nextSpot);
                    if (otherBuilding === null) {
                        if (this.agentAt(nextSpot) === null) {
                            this.addAgent(agent);
                            return false;
                        }
                    } else {
                        // Is another building (complex edge case).
                        let open =
                            otherBuilding.hasDoorAt(nextSpot) &&
                            otherBuilding.agentAt(nextSpot) === null;
                        if (open) {
                            otherBuilding.addAgent(agent);
                            return false;
                        }
                    }
                    agent.move(true); // Spot is another building, but we're blocked.
                } else if (
                    building.hasWallAt(nextSpot) &&
                    !building.hasDoorAt(nextSpot)
                ) {
                    // Check walls.
                    agent.move(true); // Blocked
                } else {
                    agent.move(this.agentAt(nextSpot) !== null); // Move if not blocked.
                }

                return true; // Keep the agent.
            });

            // Interact with people next to each agent.
            for (let agent of building.population) {
                let nextSpot = new Point(
                    agent.location.x + agent.facing.x,
                    agent.location.y + agent.facing.y
                );
                let target = this.agentAt(nextSpot);
                if (target) {
                    let idx = building.population.indexOf(target);
                    building.population[idx] = agent.interactWith(target);
                }
            }
        }
    }

    public lookAhead(
        start: Point,
        direction: Point,
        maxDistance = 10
    ): Agent | null {
        // Linear search for closest agent
        let closest = null;
        let closestDist = maxDistance + 1;
        for (let agent of this.outside) {
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

        // Check for intervening walls.
        if (closest) {
            for (let i = 1; i < closestDist; i++) {
                let nextSpot = new Point(
                    start.x + direction.x * i,
                    start.y + direction.y * i
                );
                for (let building of this.buildings) {
                    if (building.hasWallAt(nextSpot)) return null; // Can't see anyone because hit wall.
                }
            }
        }

        return closest;
    }

    public buildingAt(location: Point): Building | null {
        // Linear search; could replace with a stored Map for faster access.
        for (let building of this.buildings) {
            if (building.contains(location)) return building;
        }
        return null;
    }

    public agentAt(location: Point): Agent | null {
        for (let agent of this.outside) {
            if (
                agent.location.x == location.x &&
                agent.location.y == location.y
            )
                return agent;
        }
        return null;
    }

    public addAgent(agent: Agent) {
        this.outside.unshift(agent); // Add to front so act first when arriving.
    }

    public render(context: CanvasRenderingContext2D) {
        // Default (outside)
        context.fillStyle = Colors.outside;
        context.fillRect(0, 0, this.width, this.height); // Clear to default.

        // Draw buildings.
        for (let building of this.buildings) {
            building.render(context);
        }

        // Draw people
        for (let agent of this.outside) {
            agent.render(context);
        }
    }
}

export class Building {
    private exits: Array<Point> = []; // In global coordinates.
    public population: Agent[] = [];

    constructor(readonly min: Point, readonly max: Point) {
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

    public lookAhead(
        start: Point,
        direction: Point,
        maxDistance = 10
    ): Agent | null {
        // Linear search for closest agent.
        let closest = null;
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
        context.fillStyle = Colors.building; // Inside floor
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
