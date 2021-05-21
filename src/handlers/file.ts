import { ServerResponse, IncomingMessage } from 'http';
import { createWriteStream, WriteStream, createReadStream, mkdir, stat, readdir, unlink } from 'fs';
import { join, basename } from 'path';
import { logger, ENUM_LOG_LEVEL} from '../logger';

interface Context {
    file?: WriteStream;
    filename?: string;
    [key: string]: any;
}

const UPLOAD_FOLDER = 'uploads';

export async function list(req: IncomingMessage, res: ServerResponse) {
    const files = await promify<string[]>(readdir,UPLOAD_FOLDER);
    res.write(JSON.stringify(files));
    res.end();
}

export async function get(req: IncomingMessage, res: ServerResponse) {
    const paramsString: string = req.url.split('?').pop();
    const params: {[key:string]: string} = paramsString.split('&').reduce<any>((prev, pair) => {
        const [k, v] = pair.split('=');
        prev[k] = v;
        return prev
    }, {});
    const filename = basename(params.filename);
    const readStream = createReadStream(join(UPLOAD_FOLDER, filename));
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Content-Type', 'application/octet-stream');
    readStream.pipe(res);
    logger.log(ENUM_LOG_LEVEL.info, `sending file ${filename}`);
}

export async function deleteFile(req: IncomingMessage, res: ServerResponse) {
  const paramsString: string = req.url.split('?').pop();
  const params: {[key:string]: string} = paramsString.split('&').reduce<any>((prev, pair) => {
      const [k, v] = pair.split('=');
      prev[k] = v;
      return prev
  }, {});
  const uri = join(UPLOAD_FOLDER, basename(params.filename));
  try {
    await promify(stat, uri);
    await promify(unlink, uri);
    res.write('ok');
    res.end();
  } catch (e) {
    logger.log(ENUM_LOG_LEVEL.info, `error deleting ${uri}: ${e}`);
    res.statusCode = 400;
    res.write('file not found');
    res.end();
  }
}

export async function upload(req: IncomingMessage, res: ServerResponse) {
    const chunksProcesor = new ChunksProcesor(req, res);

    req.on('data', async (chunk) => {
      try {
        logger.log(ENUM_LOG_LEVEL.debug, 'data');
        await chunksProcesor.addChunk(chunk);
      } catch (e) {
        logger.log(ENUM_LOG_LEVEL.error, e);
        res.statusCode = 400;
        res.end();
      }
    });
      
    req.on('end', async (...args) => {
      try {
        logger.log(ENUM_LOG_LEVEL.debug, 'request end');
        await chunksProcesor.end();
      } catch (e) {
        logger.log(ENUM_LOG_LEVEL.error, e);
        res.statusCode = 400;
        res.end();
      }
    });

    req.on('error', (e) => {
      logger.log(ENUM_LOG_LEVEL.error, 'request error: ', e);
    });
}

async function promify<T>(fn: Function, ...args: Array<any>) {
    return new Promise<T>((resolve, reject) => {
        fn(...args, (e: Error, arg: T) => {
            if (e) {
                return reject(e);
            }
            return resolve(arg);
        })
    })
}

class ChunksProcesor {
  ctx: Context;
  queue: Array<Buffer>;
  complete: boolean;
  enableProcessing: boolean;
  processing: boolean;
  file: WriteStream;
  boundary: string;
  res: ServerResponse;
  started: boolean;

  constructor(req: IncomingMessage, res: ServerResponse) {
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      this.res = res;
      this.queue = [];
      this.processing = false;
      this.complete = false
      this.started = false;
      this.boundary = req.headers['content-type'].split(';')[1].split('=')[1].trim();
      this.ctx = {};
      this.enableProcessing = true;
    } else {
      this.enableProcessing = false;
      logger.log(ENUM_LOG_LEVEL.info, 'invalid content type');
      res.statusCode = 400;
      res.end(new Error('invalid content type'));
    }
  }

  async addChunk(chunk: Buffer) {
    this.started = true;
    if (!this.processing) {
      this.processing = true;
      this.queue.push(chunk);
      await this.process();
    }
  }

  async process() {
    if (!this.enableProcessing) return;
    if (this.queue.length) {
      try {
        logger.log(ENUM_LOG_LEVEL.debug, 'processing chunk for: ', this.ctx.filename);
        await this.processChunk(this.queue.shift());
        await this.process();
      } catch (e) {
        this.enableProcessing = false;
        await this.close(e);
      }
    } else {
      this.processing = false;
      if (this.complete) {
        await this.close();
      }
    }
  }

  async processChunk(chunk: Buffer) {
    const parts = await this.getParts(chunk, this.boundary);
    for (let part of parts) {
      if (await this.isNewPart(part)) {
        if (this.ctx.file) {
          logger.log(ENUM_LOG_LEVEL.info, `saved file: ${this.ctx.filename}`);
          this.ctx.file.close();
        }
        this.ctx = {};
        const content = await this.getContentChunk(part);
        let nextLine = content.subarray(0, content.indexOf('\r\n'));
        nextLine.toString().replace('Content-Disposition: form-data; ', '').split(';').map((pair) => {
          const [key, value] = pair.trim().split('=');
          this.ctx[key] = value.replace(/"/g, '');
        });
        if (this.ctx.filename) {
          if (!this.ctx.filename.endsWith('.tgz')) {
            throw new Error('invalid file type');
          }
          nextLine = content.subarray(nextLine.length + 2, content.length);
          this.ctx['Content-Type'] = nextLine.toString().replace('Content-Type: ', '');
          try {
              await promify(stat, UPLOAD_FOLDER);
          } catch (e) {
              if (e.code === 'ENOENT') {
                  await promify(mkdir, UPLOAD_FOLDER);
              }
          }
          this.ctx.file = createWriteStream(join(UPLOAD_FOLDER, this.ctx.filename));
        }
        part = part.subarray(content.length + 4, part.length);
      }
      if (this.ctx.file) {
        this.ctx.file.write(part);
      }
    }
  }

  async getParts(chunk: Buffer, boundary: string): Promise<Buffer[]> {
    if (!chunk.length) return [];
    let usedBoundary = `\r\n--${boundary}\r\n`;
    let i = chunk.indexOf(usedBoundary);
    if (i === -1) {
      usedBoundary = `--${boundary}\r\n`;
      i = chunk.indexOf(usedBoundary);
    }
    if (i === -1) {
      usedBoundary = `\r\n--${boundary}--\r\n`;
      i = chunk.indexOf(usedBoundary);
    }

    if (i === -1) {
      return [chunk];
    } else if (i === 0) {
      return this.getParts(chunk.subarray(i + usedBoundary.length, chunk.length), boundary);
    }
    return [].concat([chunk.subarray(0, i)], await this.getParts(chunk.subarray(i + usedBoundary.length, chunk.length), boundary));
  }

  async isNewPart(chunk: Buffer) {
    return chunk.indexOf('Content-Disposition') === 0;
  }

  async getContentChunk(chunk: Buffer) {
    const i = chunk.indexOf('\r\n\r\n');
    return chunk.subarray(0, i);
  }

  async end(e?: Error) {
    if (!this.started) return;
    this.complete = true;
    if (!this.processing) {
      await this.process();
    }
  }

  async close(e?: Error) {
    if(this.ctx.file) {
      this.ctx.file.close();
    }
    if (e) {
      logger.log(ENUM_LOG_LEVEL.error, e);
      this.res.statusCode = 500;
      return this.res.end(e.message);
    }
    logger.log(ENUM_LOG_LEVEL.info, 'process complete');
    return this.res.end('ok');
  }
}
