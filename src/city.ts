import Building from './building';
import Area from './area';
import Agent from './agents/agent';
import Human from './agents/human';
import Zombie from './agents/zombie';
import AgentFactory from './agents/agent-factory';

import { Point, Facing, Colors, Config } from './util';
import { NoLightStrategy, LightStrategy } from './building-strategies';

import * as lodash from 'lodash';

// This seeds Math.random(), so use original lodash context for non-deterministic random.
import * as seedrandom from 'seedrandom'; // Seeded random numbers.

let _ = lodash; //alias that can be modified (for seeding random numbers)

// Holds all the agents.
export class City extends Area {
    private outside: Agent[] = [];
    subareas: Area[] = [];

    constructor(
        readonly width: number,
        readonly height: number,
        private mapSeed: string | null
    ) {
        super();
        if (mapSeed) {
            seedrandom(mapSeed, { global: true }); // Seed the random value.
            _ = lodash.runInContext(); // Load with global seed.
        } else {
            _ = lodash; // Load original (unseeded) globals.
        }

        // Size accounts for border road.
        this.subareas = this.makeSubdivision(
            new Point(1, 1),
            new Point(width - 1, height - 1)
        );

        this.populate();
    }

    // Recursively divides the area into a block.
    private makeSubdivision(min: Point, max: Point, iter = -1): Area[] {
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
                    new Point(max.x - _.random(1, 2), max.y - _.random(1, 2)), // Max corner.
                    _.random(1.0) < 0.3
                        ? new NoLightStrategy()
                        : new LightStrategy()
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
        let possiblePlaces: { loc: Point; subarea: Area | null }[] = [];
        let walls = 0;
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                const loc = new Point(i, j);
                let subarea = this.areaAt(loc);
                if (subarea == null || !subarea.hasWallAt(loc)) {
                    possiblePlaces.push({ loc: loc, subarea: subarea });
                }
            }
        }

        // Sample and place people.
        let numHumans = Math.floor(
            this.width * this.height * Config.populationPercentage
        );

        const agentFactory = new AgentFactory();

        _.sampleSize(possiblePlaces, numHumans + 1).forEach((placeObj, idx) => {
            const newAgent =
                idx < numHumans
                    ? agentFactory.createHuman(placeObj.loc)
                    : agentFactory.createZombie(placeObj.loc);

            if (placeObj.subarea) {
                placeObj.subarea.addAgent(newAgent);
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
            // Replace old agent with new agent.
            this.outside[i] = agent.see(seenAgent);
        }

        // Use a "filter" to remove agents who have left this area and move to other area.
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
                let building = this.areaAt(nextSpot);
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
                const interactedAgent = agent.interactWith(target);
                if (interactedAgent) {
                    // Infect
                    this.outside[idx] = interactedAgent;
                } else {
                    // Remove this dead agent.
                    this.outside = _.pull(this.outside, agent);
                }
            }
        }

        // Move agents in buildings.
        for (let subarea of this.subareas) {
            subarea.moveAll(this);
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
                for (let subarea of this.subareas) {
                    if (subarea.hasWallAt(nextSpot)) return null; // Can't see anyone because hit wall.
                }
            }
        }

        return closest;
    }

    // Checks whether a list of areas has a specific location.
    // If has, return that area.
    public areaAt(location: Point): Area | null {
        // Linear search; could replace with a stored Map for faster access.
        for (let subarea of this.subareas) {
            if (subarea.contains(location)) return subarea;
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

        // Draw subareas.
        for (let subarea of this.subareas) {
            subarea.render(context);
        }

        // Draw people
        for (let agent of this.outside) {
            agent.render(context);
        }
    }
}
