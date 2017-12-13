/**
 * Created by leonliu on 12/13/2017.
 */
module.exports = {
    APIError: (code, message)=>{
        this.code = code || 'internal:unknown_error';
        this.message = message || '';
    },
    restify: (pathPrefix)=>{
        pathPrefix = pathPrefix || '/api/';
        return async (ctx, next)=>{
            if(ctx.request.path.startsWith(pathPrefix)){
                // console.log(`Process API method ${ctx.request.method} - url -${ctx.request.url} -path-${ctx.request.path}...`);
                ctx.rest = (data)=>{
                    ctx.response.type = "application/json";
                    ctx.response.body = data;
                };
                try {
                    await next();
                }catch (err){
                    console.log('Process API error...');
                    ctx.response.status = 400;
                    ctx.response.type = 'application/json';
                    ctx.response.body = {
                        code: err.code || 'internal:unknown_error',
                        message: err.message || ''
                    };
                }
            }else{
                await next();
            }
        };
    }
};