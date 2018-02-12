import Building from './building';
import { Point, Facing, Colors, Config } from './util';
import Agent from './agents/agent';
import Human from './agents/human';
import Zombie from './agents/zombie';
import AgentFactory, { AgentType } from './agents/agent-factory';

import * as lodash from 'lodash';

// This seeds Math.random(), so use original lodash context for non-deterministic random.
import * as seedrandom from 'seedrandom'; // Seeded random numbers.

let _ = lodash; //alias that can be modified (for seeding random numbers)

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

        const agentFactory = new AgentFactory();

        _.sampleSize(possiblePlaces, numHumans + 1).forEach((placeObj, idx) => {
            const agentType =
                idx < numHumans ? AgentType.HUMAN : AgentType.ZOMBIE;
            const newAgent = agentFactory.createAgent(agentType, placeObj.loc);

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

        // Use a "filter" to remove agents who have left.
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
                    const interactedAgent = agent.interactWith(target);
                    if (interactedAgent) {
                        // Infect
                        building.population[idx] = interactedAgent;
                    } else {
                        // Remove this dead agent.
                        building.population = _.pull(
                            building.population,
                            agent
                        );
                    }
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
