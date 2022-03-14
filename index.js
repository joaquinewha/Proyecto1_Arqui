var express = require("express");
var app = express();

var redis = require("redis")
var client = redis.createClient({
    host: '127.0.0.1',
    port: 6379,
});

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json()

var mysql = require("mysql");
var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "123456",
    port: 3333,
    database: "MyTwitter"
});

conn.connect(
    function(err){
    if (err) throw err;
    console.log("Connected");
});

async function main(){
    app.listen(8080, ()=>{
        console.log("Servidor http funcionando");
    });
    await client.connect()
    await client.expire('users',1)
}
main();

app.get("/", (req, res, next) => {
    res.send("Server running");
    
});

//Crear tweet: POST users/{user_id}/tweets/
app.post("/users/:userid/tweets", jsonParser, (req, res, next) => {
    aux=req.body
    const sql = "INSERT INTO MyTwitter.tweets "+
                "(tweet_id, user_sender_id, message, time_stamp) "+
                "VALUES ("+aux.tweeter_id+", "+req.params.userid+", '"+aux.message+"', '" +aux.time_stamp+"' )"
    console.log("El sql: "+sql)
    conn.query(sql, function (err, result){
        if (err) throw err;
        res.json(result);
    });
});

//Seguir: POST users/{user_id_A}/follows/{user_id_B}
app.post("/users/:userid_A/follows/:userid_B", jsonParser, (req, res, next) => {
    const sql = "INSERT INTO MyTwitter.follows "+
                "(user_follower_id, user_followee_id) "+
                "VALUES ("+req.params.userid_A+", "+req.params.userid_B+" )"
    console.log("El sql: "+sql)
    conn.query(sql, function (err, result){
        if (err) throw err;
        res.json(result);
    });
});

//timeline de la persona con ID x: GET users/{user_id}/follows/tweets
app.get("/users/:userid/follows/tweets", async (req, res, nest) =>{
    const default_expiration = 3600
    try{
        //await client.flushAll();
        const reply = await client.get('users')
        if(reply){
            return res.json(JSON.parse(reply))
        }

        const sql = "SELECT  MyTwitter.users.*, MyTwitter.tweets.* " +
                    "FROM tweets "+
                    "INNER JOIN users "+
                        "ON tweets.user_sender_id = users.user_id "+
                        "INNER JOIN follows "+
                            "ON users.user_id = follows.user_followee_id  "+
                    "WHERE follows.user_follower_id ="+req.params.userid+"";
        conn.query(sql, async function (err, result){
            console.log("Utilizando la basde de datos")
            if (err) throw err;
                var save =  await client.set('users',JSON.stringify(result));
                await client.expire('users',10)
                console.log(save);    
                res.json(result);
        }); 
    }
    catch(err){
        res.json(err)
    }
});


