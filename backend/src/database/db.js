const {Pool} = require('pg');
const dbConfig = require('../config/development');
const pool = new Pool(dbConfig.database);

const db = {
    query: (text,params) =>{
        return new Promise( (resolve,reject) =>{
            pool.query(text,params,(err,res)=>{
                if (err){
                    reject(err)
                }
                else{
                    resolve(res);
                }
            });
        });
    },
};

async function test_connection(){

    try{    
        pool.query('SELECT current_database();',(err, res)=>{
            if (err){
                console.error("connection to the database failed",err);
            }
            else{
                console.log("Connection to the database was successful",res.rows[0].current_database);
            }
        })
    }catch(err){

        if (err){
            console.error("there was a error connecting to the database", err);
        }
}

}

test_connection();

module.exports = db;
