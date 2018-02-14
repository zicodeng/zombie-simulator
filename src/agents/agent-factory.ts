import Agent from './agent';
import Human from './human';
import Zombie from './zombie';
import { Point } from '../util';

interface IAgentFactory {
    createHuman(location: Point): Agent;
    createZombie(location: Point): Agent;
}

class AgentFactory implements IAgentFactory {
    constructor() {}

    createHuman(location: Point): Agent {
        return new Human(location);
    }

    createZombie(location: Point): Agent {
        return new Zombie(location);
    }
}

export default AgentFactory;
