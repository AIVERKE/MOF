import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CargoDto {
  @ApiProperty({ example: 'Analista', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @ApiPropertyOptional({
    example: 'Responsable de análisis de procesos',
    maxLength: 512,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  descripcion?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    example: 26,
    nullable: true,
    minimum: 1,
    maximum: 99,
    description: 'Nivel jerárquico (mayor = más alto); null = sin nivel',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  @Max(99)
  nivelOrden?: number | null;

  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description:
      'Cargo padre (solo en create; cambios posteriores vía setparent)',
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
