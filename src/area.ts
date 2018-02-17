import { Point } from './util';
import Agent from './agents/agent';

abstract class Area {
    protected composite: Area | null = null;
    protected population: Agent[] = [];
    protected subareas: Area[] = [];

    moveAll(): void {
        this.lookAround();
        this.moveAgents();
        this.interact();
        this.moveSubarea();
    }

    abstract render(context: CanvasRenderingContext2D): void;

    abstract moveAgents(): void;

    abstract lookAhead(start: Point, direction: Point): Agent | null;

    abstract contains(location: Point): boolean;

    public addAgent(agent: Agent): void {
        this.population.unshift(agent); // Add to front so act first when arriving.
    }

    agentAt(location: Point): Agent | null {
        for (let agent of this.population) {
            if (
                agent.location.x == location.x &&
                agent.location.y == location.y
            )
                return agent;
        }
        return null;
    }

    lookAround(): void {
        // Look around.
        for (let i = 0; i < this.population.length; i++) {
            let agent = this.population[i];
            let seenAgent = this.lookAhead(agent.location, agent.facing);
            this.population[i] = agent.see(seenAgent);
        }
    }

    interact(): void {
        // Interact with people next to each agent.
        for (let agent of this.population) {
            let nextSpot = new Point(
                agent.location.x + agent.facing.x,
                agent.location.y + agent.facing.y
            );
            let target = this.agentAt(nextSpot);
            if (target) {
                let idx = this.population.indexOf(target);
                const interactedAgent = agent.interactWith(target);
                if (interactedAgent) {
                    // Infect
                    this.population[idx] = interactedAgent;
                } else {
                    // Remove this dead agent.
                    this.population = _.pull(this.population, agent);
                }
            }
        }
    }

    moveSubarea(): void {
        // Move agents in buildings.
        for (let subarea of this.subareas) {
            subarea.moveAll();
        }
    }

    setComposite(composite: Area): void {
        this.composite = composite;
    }

    hasDoorAt(location: Point): boolean {
        return false;
    }

    hasWallAt(location: Point): boolean {
        return false;
    }

    areaAt(location: Point): Area | null {
        return null;
    }
}

export default Area;
