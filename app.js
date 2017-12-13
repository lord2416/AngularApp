/**
 * Created by leonliu on 12/6/2017.
 */
const path = require('path');
const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const bodyParser = require('koa-bodyparser');
const KoaStatic = require('koa-static');
const {backendRouter} = require('./rest/index');
const rest = require('./rest/middleware/rest');
const timeSpend = require('./rest/middleware/timeSpend');

//static
app.use(KoaStatic(
    path.join(__dirname, './static')
));
app.use(bodyParser());

//timeSpend
app.use(timeSpend());

// bind .rest() for ctx:
app.use(rest.restify());

//routers
app.use(backendRouter.routes())
    .use(backendRouter.allowedMethods());

app.on('error', function(err, ctx){
    console.log(err)
    logger.error('server error', err, ctx);
    ctx.render('error', { message: ' service error!',error: err });
});

app.listen(3000);