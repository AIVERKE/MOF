import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
}

export class SetCargoDto {
  @ApiProperty()
  @IsNumber()
  cargoId: number;
}
