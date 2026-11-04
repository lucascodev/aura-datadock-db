import type { TableRef } from '../../../domain/schema/model/TableRef';

export type TableLocation = Pick<TableRef, 'namespace' | 'name'>;
