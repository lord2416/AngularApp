/**
 * Created by leonliu on 12/11/2017.
 */
const timeSpend = ()=>{
    return async (ctx, next)=>{
        let start = new Date().getTime();
        await next();
        let spend = new Date().getTime()-start;
        console.log(`${ctx.request.method} : ${ctx.request.url} Time: ${spend}ms`);
    };
};

module.exports = timeSpend;