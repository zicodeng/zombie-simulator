import { Colors } from './util';

export interface BuildingStrategy {
    maxDistance: number;
    setBuildingColor(context: CanvasRenderingContext2D): void;
}

export class NoLightStrategy implements BuildingStrategy {
    public maxDistance: number = 1;

    constructor() {}

    setBuildingColor(context: CanvasRenderingContext2D) {
        context.fillStyle = 'black';
    }
}

export class LightStrategy implements BuildingStrategy {
    public maxDistance: number = 10;

    constructor() {}

    setBuildingColor(context: CanvasRenderingContext2D) {
        context.fillStyle = Colors.building;
    }
}
