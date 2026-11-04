import type { ResultSetView } from '../../../contracts/ResultsMessages';

export type RowsResult = Extract<ResultSetView, { status: 'rows' }>;
