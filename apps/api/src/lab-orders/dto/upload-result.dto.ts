import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Either resultData (structured key/value, e.g. numeric panels) or
 * resultFileUrl (scanned report/imaging), or both — mirrors the
 * hybrid storage the LabOrder model was designed for.
 */
export class UploadResultDto {
  @IsObject()
  @IsOptional()
  resultData?: Record<string, string>;

  @IsString()
  @IsOptional()
  resultFileUrl?: string;
}
