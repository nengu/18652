var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');

var userlist = [];

server.listen(process.env.PORT || 3000);
console.log('Server running ...');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/chatroomDB', function(err){
    if(err){
        console.log(err);
        throw err;
    }else{
        console.log('Connected to Mongodb :)');
    }
});

//Mongo Schema 
var msgSchema = mongoose.Schema({
    user: String,
    msg: String,
    timestamp: String
});

//Create collection named msgCollection
var msgCollection = mongoose.model('MessageChatRoom', msgSchema);

//Create route, send back index.html
app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

//Client get an connection event
io.sockets.on('connection', function(socket){

    //Reterive message once connected
    //Query-In from Mongo msgCollection
    msgCollection.find({},function(err,docs){
        if (err) throw err;
        console.log("Loading message ...");
        socket.emit('loading previous msg', docs);
        //create according event from client side 
    });

    socket.on('new user', function(data, callback){
        if (userlist.indexOf(data) != -1)
        {
            callback(false);
            console.log("OOPS, user exist");
        }else{ 
            callback(true);
            socket.username = data;
            //add to socket itself, each user has 'one socket'
            userlist.push(socket.username);
            updateUserlist();
        }
    });

    function updateUserlist(){
        io.sockets.emit('update usernames',userlist);
    }

    function getPrettyDate() {
        var date = new Date();
        var res = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        return res;
    }

    socket.on('send message', function(data){
        //Event 'new message' to broadcast to users
        var msg = data.trim();
        var currTime = getPrettyDate();

        var newMsg = new msgCollection(    {msg: msg,
                                            user: socket.username,
                                            timestamp: currTime});
        newMsg.save(function(err){
            if (err) throw err;
            console.log("Writing message to DB");
            io.sockets.emit('new message', {msg: msg,
                                            user: socket.username,
                                            timestamp: currTime});
        });

        //sockets.broadcast.emit('new message',data);
    });

    socket.on('disconnect', function(data){
        if(!socket.username) 
            {return;}
        else{
            userlist.splice(userlist.indexOf(socket.username), 1);
            updateUserlist();
            //broadcast once user left
        }
    });

});//End of io.socket
