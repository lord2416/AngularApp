/**
 * Created by leonliu on 12/6/2017.
 */
import {BackUser} from '../controller/backend.export';
const router = require('koa-router')();

router
    .get('/', function (ctx, body) {
        ctx.body = 'Hello World!';
    })
    .post('/api/user', BackUser.create)
    .get('/api/user/:id', BackUser.get)
    .put('/api/user/:id', BackUser.put)
    .delete('/api/user/:id', BackUser.delete);

module.exports = router;
