import { Point } from './util';
import Agent from './agents/agent';

abstract class Area {
    protected subareas: Area[] = [];

    abstract moveAll(composite?: Area): void;

    abstract agentAt(location: Point): Agent | null;

    abstract addAgent(agent: Agent): void;

    abstract render(context: CanvasRenderingContext2D): void;

    hasDoorAt(location: Point): boolean {
        return false;
    }

    hasWallAt(location: Point): boolean {
        return false;
    }

    areaAt(location: Point): Area | null {
        return null;
    }

    contains(location: Point): boolean {
        return false;
    }
}

export default Area;
