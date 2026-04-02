import { sampleRoutePoints } from './src/services/routeService.js';
const paths = [
    [[0, 0], [0, 1]], 
    [[0, 1], [0, 2], [0, 3]],
    [[0, 3], [0, 10]]
];
const pts = sampleRoutePoints(paths, 100);
console.log(pts);
