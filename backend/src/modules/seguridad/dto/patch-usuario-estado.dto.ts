import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PatchUsuarioEstadoDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  enabled: boolean;
}
