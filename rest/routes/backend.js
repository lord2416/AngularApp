/**
 * Created by leonliu on 12/6/2017.
 */
import {BackUser} from '../controller/backend.export';
const router = require('koa-router')();

router
    .get('/', function (ctx, body) {
        ctx.body = 'Hello World!';
    })
    .post('/user', BackUser.create)
    .get('/user/:id', BackUser.get)
    .put('/user/:id', BackUser.put)
    .delete('/user/:id', BackUser.delete);

module.exports = router;
