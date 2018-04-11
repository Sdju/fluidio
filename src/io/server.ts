import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';
import * as fileUpload from 'express-fileupload';
import chalk from 'chalk';
import * as moment from 'moment';

import * as http from 'http';

/** Тип для указания порта */
export type Port = string | number;

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


function getIp(req: express.Request): string {
  const ipString: string | string[] | undefined = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress;
  return (typeof ipString === 'string') ? ipString.split(',')[0] : 'xxx.xxx.xxx.xxx';
}

function serverLogging(tokens: logger.TokenIndexer,
                       req: express.Request,
                       res: express.Response): string {
  const time = chalk.blue(moment({}).format('HH:mm:ss:SSS'));
  const ip = getIp(req);
  const method = chalk.blueBright(tokens.method(req, res));
  const url = tokens.url(req, res);
  const statusNum = tokens.status(req, res);
  const status = (+statusNum >= 400)
    ? chalk.red(statusNum)
    : ((+statusNum >= 300) ? chalk.green(statusNum) : chalk.blue(statusNum));
  const size = tokens.res(req, res, 'content-length');
  const respTime = tokens['response-time'](req, res);
  return `(${time}) [${ip}] ${method} ${url} ${status} - ${respTime}ms (${size || 0} bytes)`;
}

function normalizePort(val: Port): number {
  const port: number = (typeof val === 'string') ? parseInt(val, 10) : val;
  if (isNaN(port)) {
    return <number>val;
  }
  if (port >= 0) {
    return port;
  }
  throw Error(`Unsupported port value: ${val}`);
}

function serverConfigAdapter(config: ServerConfig): InnerServerConfig {
  const res: ServerConfig = {
    port: 8000,
    customLogger: serverLogging,
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
