import { ApiProperty } from '@nestjs/swagger';

export class PrimerAccesoResponseDto {
  @ApiProperty({
    description:
      'Token temporal (15 minutos) válido solo para definir la contraseña',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;
}
