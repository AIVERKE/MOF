import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class PrimerAccesoDto {
  @ApiProperty({ example: 'operador@umsa.bo' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '8123456' })
  @IsString()
  @IsNotEmpty()
  ci: string;
}
