/**
 * Created by leonliu on 12/6/2017.
 */
const { query } = require('../db/async-db');

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
        let sql = "select * from user;"
        // let datalist = await query(sql);
        let datalist = [
            {"id": 1, "name": "leon"}
        ];
        ctx.response.type = "application/json";
        ctx.response.body = datalist;
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