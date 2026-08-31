import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CargoDto {
  @ApiProperty({ example: 'Analista' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Cargo padre (solo en create; cambios posteriores vía setparent)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  parentId?: number | null;
}

export class CargoSetParentDto {
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Nuevo cargo padre; null para dejar el cargo como raíz',
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  parentId: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razon?: string;
}

export class SetCargoDto {
  @ApiProperty()
  @IsNumber()
  cargoId: number;
}
