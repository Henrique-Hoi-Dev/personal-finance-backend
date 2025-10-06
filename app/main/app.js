require('./bootstrap')();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compress = require('compression');
const cors = require('cors');
const hpp = require('hpp');
const i18n = require('i18n');
const middle = require('./middleware');
const addRouters = require('./routers');
const logger = require('../utils/logger');

const pinoHttp = require('pino-http')({
    logger: logger,
    customLogLevel: function (req, res, err) {
        if (req.headers['user-agent']?.includes('kube-probe')) {
            return 'silent';
        }
        return 'info';
    }
});

const app = express();

app.use(pinoHttp);

i18n.configure({
    locales: ['en'],
    defaultLocale: 'en',
    directory: __dirname + '/../../locale/error',
    objectNotation: false,
    register: global,
    updateFiles: false,
    syncFiles: false
});

const rawBodySaver = function (req, res, buffer, encoding) {
    if (buffer?.length) {
        req.rawBody = buffer.toString(encoding || 'utf8');
    }
};

app.use(compress());

const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://localhost:3001', 'http://users-ms:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400
};
app.use(cors(corsOptions));
app.use(
    bodyParser.json({
        limit: '10mb',
        verify: rawBodySaver
    })
);
app.use(
    bodyParser.urlencoded({
        verify: rawBodySaver,
        limit: '10mb',
        extended: true
    })
);

app.use(
    hpp({
        whitelist: []
    })
);

const routers = {};
routers.v1 = express.Router();

app.set('port', process.env.PORT_SERVER || 3000);
app.use(i18n.init);

app.disable('x-powered-by');

app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.hidePoweredBy());
app.use(helmet.xssFilter());
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));

app.use(cookieParser());

if (process.env.AVATAR_UPLOAD_DIR) {
    const avatarsDir = process.env.AVATAR_UPLOAD_DIR;
    app.use('/average/avatars', express.static(avatarsDir, { maxAge: '7d', dotfiles: 'ignore' }));
}

app.use('/v1/', routers.v1);
app.use('/', routers.v1);

addRouters(routers.v1);

app.use(middle.throw404);
app.use(middle.logError);
app.use(middle.handleError);
app.use(middle.errorHandler);

module.exports = app;
