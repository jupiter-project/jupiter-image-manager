import { Container, Singleton } from 'typescript-ioc';
import JupiterFs from 'jupiter-fs';
import { AppConfig } from '../app.config';
import { Logger } from './logger.service';

@Singleton
export class FileService {
  private logger = Container.get(Logger);
  private jupiterFs = JupiterFs(AppConfig.jupiterFs);

  async upload(name: string, buffer: Buffer) {
    this.logger.silly(this.upload.name);
    return await this.jupiterFs.writeFile(name, buffer);
  }

  async get(id: string): Promise<Buffer> {
    this.logger.silly(this.get.name);
    return await this.jupiterFs.getFile({id});
  }
}
