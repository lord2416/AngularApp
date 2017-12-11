/**
 * Created by leonliu on 12/6/2017.
 */
class UserController{
    /**
     *
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async create(ctx){

    }

    /**
     *
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async get(ctx){
        let user = {
            name: "test",
            value: "1"
        };
        console.log(ctx.params);
        ctx.response.type = "application/json";
        ctx.response.body = user;
    }

    /**
     *
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async put(ctx){

    }

    /**
     *
     * @param ctx
     * @returns {Promise.<void>}
     */
    static async delete(ctx){

    }
}

export default UserController;