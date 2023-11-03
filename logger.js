import winston from 'winston';

const LOG_FILENAME = 'combined.log'

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: LOG_FILENAME })
  ]
});
 export default logger;
