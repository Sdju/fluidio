import * as express from 'express';
import * as logger from 'morgan';
import chalk from 'chalk';
import * as moment from 'moment';
import { Port } from './interfaces';

/**
 * Пытается вернуть IP клиента по его запросу.
 * В случае если IP не был найден возвращает xxx.xxx.xxx.xxx
 * */
export function getIp(req: express.Request): string {
  const ipString: string | string[] | undefined = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress;
  return (typeof ipString === 'string') ? ipString.split(',')[0] : 'xxx.xxx.xxx.xxx';
}

/**
 * Дефолтная функция логгирования для библиотек morgan
 * */
export function serverLogging(tokens: logger.TokenIndexer,
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

/**
 * Пытается нормализовать порт к цеочисленному значению
 * */
export function normalizePort(val: Port): number {
  const port: number = (typeof val === 'string') ? parseInt(val, 10) : val;
  if (isNaN(port)) {
    return <number>val;
  }
  if (port >= 0) {
    return port;
  }
  throw Error(`Unsupported port value: ${val}`);
}
