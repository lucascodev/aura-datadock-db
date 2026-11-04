export interface LinearRegression {
  readonly slope: number;
  readonly intercept: number;
  readonly rSquared: number;
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
}
