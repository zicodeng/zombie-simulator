import * as _ from 'lodash';

// Convenience class
export class Point {
    constructor(public x: number, public y: number) {}
}

// Convenience enum for facing
export class Facing {
    // Hack to provide readonly object enums
    static get North() {
        return { x: 0, y: -1 };
    }
    static get East() {
        return { x: 1, y: 0 };
    }
    static get South() {
        return { x: 0, y: 1 };
    }
    static get West() {
        return { x: -1, y: 0 };
    }

    static readonly Directions = [
        Facing.North,
        Facing.East,
        Facing.South,
        Facing.West
    ];

    static turnLeftFrom(dir: Point): Point {
        return Facing.Directions[(_.findIndex(Facing.Directions, dir) + 3) % 4];
    }

    static turnRightFrom(dir: Point): Point {
        return Facing.Directions[(_.findIndex(Facing.Directions, dir) + 1) % 4];
    }
}

export const Colors = {
    // From mapbox.streets-basic.
    building: '#d9ccbf',
    outside: '#ede5c9', //'#dee0c1'
    wall: '#c8c2ac'
};

// City creation parameters; can adjust here.
export const Config = {
    populationPercentage: 0.05, // 5% density works nicely.
    blockSize: { min: 15, max: 40 },
    buildingSize: { min: 10, max: 25 },
    numberExits: { min: 2, max: 10 }
};
