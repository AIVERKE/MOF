import { Test, TestingModule } from '@nestjs/testing';
import { VersionesController } from './versiones.controller';
import { AuditoriaService } from './auditoria.service';

describe('VersionesController', () => {
  let controller: VersionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionesController],
      providers: [
        {
          provide: AuditoriaService,
          useValue: { findAll: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<VersionesController>(VersionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
