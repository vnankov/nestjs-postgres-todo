import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyNotesToNull({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class CreateTodoDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @Transform(emptyNotesToNull)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
