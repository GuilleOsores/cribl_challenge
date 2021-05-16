export enum ENUM_LOG_LEVEL {
    debug,
    info,
    error,
    none,
}

const PREFIX = [ 'DEBUG -', 'INFO -', 'ERROR -' ];

const LOG_LEVEL: ENUM_LOG_LEVEL = 'LOG_LEVEL' in process.env ? parseInt(process.env.LOG_LEVEL) : ENUM_LOG_LEVEL.info;

export const logger = {
    log(logLevel: ENUM_LOG_LEVEL, ...args: Array<any>) {
        if (LOG_LEVEL <= logLevel && logLevel !== ENUM_LOG_LEVEL.none) {
            console.log(PREFIX[LOG_LEVEL], ...args);
        }
    }
}
