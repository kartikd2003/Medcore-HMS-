import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';

class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number; // 0 = Sunday .. 6 = Saturday

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm' })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:mm' })
  endTime: string;

  @IsInt()
  @Min(5)
  @Max(120)
  slotMins: number;
}

/**
 * Replaces a doctor's entire weekly template in one call rather than
 * exposing per-slot CRUD — a doctor's week is edited as a whole
 * ("I work Mon/Wed/Fri 9-1"), not slot by slot, so the API mirrors
 * that mental model.
 */
export class SetAvailabilityDto {
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  @ArrayMinSize(1)
  slots: AvailabilitySlotDto[];
}
