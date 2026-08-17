import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CatalogoItemDto {
  @ApiProperty({ example: 'Administrativo' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateCatalogoItemDto extends PartialType(CatalogoItemDto) {}

export class ClaseDto {
  @ApiProperty({ example: 'Dirección' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({ example: '#1976D2' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Aceptado por el front; se refleja en activo si no viene activo',
  })
  @IsOptional()
  @IsBoolean()
  oficial?: boolean;
}

export class UpdateClaseDto extends PartialType(ClaseDto) {}
