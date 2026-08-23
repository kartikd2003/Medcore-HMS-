import { IsInt } from 'class-validator';

/**
 * Delta-based, not absolute — "receive 50 units" or "correct by -3"
 * is what actually happens at a pharmacy counter, and a delta can't
 * silently clobber a concurrent adjustment the way overwriting
 * stockQty directly could.
 */
export class AdjustStockDto {
  @IsInt()
  delta: number;
}
