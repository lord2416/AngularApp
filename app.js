/**
 * Created by leonliu on 12/6/2017.
 */
const http = require('http');
const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const {backendRouter} = require('./rest/index');

app.use(backendRouter.route())
    .use(backendRouter.allowedMethods());

// response
app.on('error', function(err, ctx){
    console.log(err)
    logger.error('server error', err, ctx);
    ctx.render('error', { message: ' service error!',error: err });
});

http.createServer(app.callback()).listen(3000);