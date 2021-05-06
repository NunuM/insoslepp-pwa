const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const Middlewares = require('./src/utils').AppMiddlewares;
const configs = require('./configs.json');

const api = require('./routes/api');
const indexRouter = require('./routes/index');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

indexRouter.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, configs.angularAppServingFolder + '/index.html'));
});

if (configs.inDev) {
    app.use(Middlewares.corsMiddleware);
}

app.use(logger(configs.accessLog));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, configs.angularAppServingFolder)));

app.use('/api', api);
app.use('/', indexRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

app.disable('x-powered-by');

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
