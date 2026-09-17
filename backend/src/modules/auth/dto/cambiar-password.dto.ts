import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @ApiProperty({
    description: 'Token temporal devuelto por POST /auth/primer-acceso',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  token: string;

  @ApiProperty({ example: 'miClaveSegura123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
