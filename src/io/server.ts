import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';
import * as fileUpload from 'express-fileupload';
import * as http from 'http';

import { Port } from './interfaces';
import { serverLogging, normalizePort } from './tools';

/**
 * Задаваемые пользователем параметры конфигурации сервера
 */
export interface ServerConfig {
  /** директория с View */
  viewDir?: string;

  /** директория с публичными файлами сервера */
  staticDir?: string;

  /** просшиваемый порт сервера */
  port?: Port;

  /** движок генерации View */
  viewEngine?: string;

  /** собственное логгирование */
  customLogger?: logger.FormatFn;
}

/**
 * Обработанные параметры конфигурации сервера
 */
interface InnerServerConfig {
  viewDir: string;
  staticDir: string;
  port: number;
  viewEngine: string;
  customLogger: logger.FormatFn;
}

function serverConfigAdapter(config: ServerConfig): InnerServerConfig {
  const res: ServerConfig = {
    port: 8000,
    customLogger: serverLogging,
    viewEngine: 'pug',
    ...config,
  };
  if (config.viewDir === void 0) {
    res.viewDir = path.join('.', 'view');
  }
  if (config.staticDir === void 0) {
    res.staticDir = path.join('.', 'public');
  }
  if (config.port !== void 0) {
    res.port = normalizePort(config.port);
  }

  return <InnerServerConfig>res;
}

/**
 * Реализация многофункционального сервера
 */
export class Server {
  public constructor(serverConfig: ServerConfig = {}) {
    const config: InnerServerConfig = serverConfigAdapter(serverConfig);

    const app: express.Application = express();
    app.set('views', config.viewDir);
    app.set('view engine', config.viewEngine);
    app.set('x-powered-by', false);

    app.use(logger(config.customLogger));
    app.use(fileUpload());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(config.staticDir));

    app.enable('trust proxy');

    this.app = app;
    this.config = config;
    this.server = null;
  }

  /**
   * Запуск сервера
   */
  public async start() {
    this.app.set('port', this.config.port);
    this.server = http.createServer(this.app);
    this.server.listen(this.config.port);
  }

  private app: express.Application;
  private config: InnerServerConfig;
  private server: http.Server | null;
}
