import { Test, TestingModule } from '@nestjs/testing';
import { VersionesService } from './versiones.service';
import { AuditoriaService } from './auditoria.service';

describe('VersionesService', () => {
  let service: VersionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionesService,
        {
          provide: AuditoriaService,
          useValue: { registrarCambio: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<VersionesService>(VersionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
