import Agent from './agent';
import Human from './human';
import Zombie from './zombie';
import { Point } from '../util';

export enum AgentType {
    HUMAN = 'Human',
    ZOMBIE = 'Zombie'
}

class AgentFactory {
    constructor() {}

    createAgent(agentType: AgentType, location: Point): Agent {
        switch (agentType) {
            case AgentType.HUMAN:
                return new Human(location);

            default:
                return new Zombie(location);
        }
    }
}

export default AgentFactory;
