import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'admin@admin.com' })
  email: string;

  @ApiProperty({ example: 'Administrador', nullable: true })
  nombre: string | null;

  @ApiProperty({ example: ['ADMIN'], type: [String] })
  roles: string[];
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ type: LoginUserDto })
  user: LoginUserDto;
}
