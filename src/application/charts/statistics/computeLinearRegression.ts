import type { LinearRegression } from '../model/statistics/LinearRegression';


const MIN_POINTS = 2;

export function computeLinearRegression(points: readonly (readonly [number, number])[]): LinearRegression | undefined {
  if (points.length < MIN_POINTS) {
    return undefined;
  }
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  const varianceX = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
  if (varianceX === 0) {
    return undefined;
  }
  const covariance = points.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
  const slope = covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const totalSquares = points.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0);
  const residualSquares = points.reduce((sum, [x, y]) => sum + (y - (slope * x + intercept)) ** 2, 0);
  const xs = points.map(([x]) => x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  return {
    slope,
    intercept,
    rSquared: totalSquares === 0 ? 1 : 1 - residualSquares / totalSquares,
    from: [minX, slope * minX + intercept],
    to: [maxX, slope * maxX + intercept],
  };
}
