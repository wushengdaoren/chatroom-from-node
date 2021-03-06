var app = require('express')();
// var ejs = require('ejs');  //我是新引入的ejs插件
var http = require('http').Server(app);
var htp = require('http');
var qs = require('querystring');
var io = require('socket.io')(http);
var express=require('express');
var mysql  = require('mysql');
app.get('/', function(req, res){
    res.sendFile( __dirname + "/public/" + "login.html" );
});
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '123456789',
	port: '3306',
	database: 'chatroom',
	dateStrings:'true'
});
connection.connect();

app.post('/login',function (req,res) {//登录
    req.on('data',function(data){
        obj=JSON.parse(data);
		console.log(obj)
		 var selectSQL = "select userid,password,username from user where userid = '"+obj.userid+"' and password = '"+obj.password+"'";
		   //var selectSQL = "select password from user where account='"+req.query.account+"'";
		   res.set('Access-Control-Allow-Origin', '*')  // 允许任何一个域名访问
		      connection.query(selectSQL,function (err, result) {
		        if(err){
		         console.log('[login ERROR] - ',err.message);
		         return;
		        }
		        //console.log(result);
		        if(result=='')
		        {
		            console.log("帐号密码错误");
		            res.send({success:"01",message:"密码或账号错误！"});//如果登录失败就给客户端返回0，
		        }else{
					var sel ="select username from user where userid = '"+obj.userid+"'";
					connection.query(sel,function (err, result) {
						if(err){
						 console.log('[sel ERROR] - ',err.message);
						 return;
						}
						console.log("登录成功");
						res.send({success:"00",message:"登录成功!",param:result});//如果登录成就给客户端返回1
					})     
		        }
		});
    })
   // console.log("rsp:"+response);
   //res.end(JSON.stringify(response));
})

 //注册模块
app.post('/register', function (req, res) {
    req.on('data',function(data){
		obj=JSON.parse(data);
		console.log(obj)
		var selsql = "select userid from user where userid = '"+obj.userid+"'";
		res.set('Access-Control-Allow-Origin', '*')  // 允许任何一个域名访问
		connection.query(selsql,function(err, result){
		   console.log(result)
		   if(err){
			console.log('[login ERROR] - ',err.message);
			return;
		   }
		   if(result.length != 0){
			   console.log("该账号id已注册");
			   res.send({success:"10",message:"该账号id已注册！"});//如果该账号id已注册就给客户端返回10，
			}else{
			   var selnamesql = "select username from user where username = '"+obj.username+"'";
			   connection.query(selnamesql,function(err, result){
				   if(err) {console.log('[login ERROR] - ',err.message); return;}
				   if(result.length != 0 ){
					   console.log("该昵称已注册");
					   res.send({success:"11",message:"该昵称已注册！"});//如果昵称已注册就给客户端返回11，
				   }else{
					    var addSql = 'INSERT INTO user(userid,password,username) VALUES(?,?,?)';
					   	var  addSqlParams = [obj.userid,obj.password,obj.username];
						connection.query(addSql,addSqlParams,function (err, result) {
						   if(err){
							console.log('[INSERT ERROR] - ',err.message);
							return;//如果失败了就直接return不会继续下面的代码
						   }
						   res.send({success:"12",message:"注册成功！"});//如果注册成功就给客户端返回12，
						   console.log("注册成功");
						});
					}
			   })
		   }
		})
   })
});
//新增房间
app.post('/addroom',function (req,res) {
    req.on('data',function(data){
        obj=JSON.parse(data);
		var roomuser = obj.roomuser.toString()
		console.log(obj.roomuser.toString())
		 var addSql = 'INSERT INTO grouproom(roomname,roomuser) VALUES(?,?)';
		 var  addSqlParams = [obj.chatroom,roomuser];
		res.set('Access-Control-Allow-Origin', '*')  // 允许任何一个域名访问
		connection.query(addSql,addSqlParams,function (err, result) {
			if(err){
				console.log('[INSERT ERROR] - ',err.message);
				return;//如果失败了就直接return不会继续下面的代码
			}
			res.send({success:'00',message:'添加成功！'});
			io.emit('addroom',{roomname:obj.chatroom,roomuser:roomuser});
		})
    })
});
//获取聊天记录
app.post('/getmesg',function (req,res) {
    req.on('data',function(data){
        obj=JSON.parse(data);
		var selsql = "Select * from message where (UN='"+obj.username+"' and FN='"+obj.firename+"') or (UN='"+obj.firename+"'and FN='"+obj.username+"')";
		var selchat = "select * from message where FN='"+obj.roomname+"'";
		var sel = (obj.firename != '' && obj.roomname === '')?selsql:selchat;
		res.set('Access-Control-Allow-Origin', '*')  // 允许任何一个域名访问
		connection.query(sel,function (err, result) {
			if(err){
				console.log('[Select ERROR] - ',err.message);
				return;//如果失败了就直接return不会继续下面的代码
			}
			console.log(result)
			res.send(result);
		})
    })
});

//获取房间列表
app.get('/getroom',function(req,res){
	var selsql = "select * from grouproom";
	res.set('Access-Control-Allow-Origin', '*')  // 允许任何一个域名访问
	connection.query(selsql,function(err, result){
	   console.log(result)
	   if(err) {console.log('[login ERROR] - ',err.message); return;}
	   res.send(result)
    })
});
//获取所有用户
app.get('/getuser',function(req,res){
	res.set('Access-Control-Allow-Origin', '*')  // 允许任何一个域名访问
	var selsql = "select userid,username from user";
	connection.query(selsql,function(err, result){
	   console.log(result)
	   if(err) {console.log('[login ERROR] - ',err.message); return;}
	   var ss = {}
	   for(let i in result){
		   ss[result[i].userid] = result[i].username
	   }
	   res.send({'result':result,'user':ss})
    })
});
 app.use(express.static('./public'));//设置静态文件目录
//在线用户
var onlineUsers = {};
//当前在线人数
var onlineCount = 0;
//在线用户的socketid集合
var arrAllSocket = {};

io.on('connection', function(socket){
	console.log('a user connected');
	//监听新用户加入
	socket.on('login', function(obj){
		var select = "select * from CACHEMSG where firename = '"+obj.username+"'";
		connection.query(select,function(err, result){//查询该用户是否有未收到的消息
			if(err) {console.log('[select ERROR] - ',err.message); return;}
			if(result.length != 0){
				for(let i of result){//逐条发送
					io.sockets.connected[socket.id].emit("meg",i);
				}
				var delSql = "DELETE FROM CACHEMSG where firename = '"+obj.username+"'";
				connection.query(delSql,function (err, result) {//删除已读消息
					if(err) {console.log('[DELETE ERROR] - ',err.message); return;}
				})
			}
		})
		//将新加入用户的唯一标识当作socket的名称，后面退出的时候会用到
		socket.name = obj.userid;
		//检查在线列表，如果不在里面就加入
		if(!onlineUsers.hasOwnProperty(obj.userid)) {
			onlineUsers[obj.userid] = obj.username;
			arrAllSocket[obj.username] = socket.id
			//在线人数+1
			onlineCount++;
		}

		//向所有客户端广播用户加入
		io.emit('login', {onlineUsers:onlineUsers, user:obj});
		console.log(obj.username+'加入了聊天室');
	});

	//监听用户退出
socket.on('disconnect', function(){
		//将退出的用户从在线列表中删除
		if(onlineUsers.hasOwnProperty(socket.name)) {
			//退出用户的信息
			var obj = {userid:socket.name, username:onlineUsers[socket.name]};

			//删除
			delete onlineUsers[socket.name];
			delete arrAllSocket[onlineUsers[socket.name]]
			//在线人数-1
			onlineCount--;

			//向所有客户端广播用户退出
			io.emit('logout', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
			console.log(obj.username+'退出了聊天室');
		}
	});

	//监听用户发布聊天内容
socket.on('meg', function(obj){
		console.log(obj.date)
		var addSql = 'INSERT INTO message(UN,FN,Content,Time) VALUES(?,?,?,?)';
		var fire = (obj.firename != '' && obj.roomname === '')?obj.firename:obj.roomname;
		var  addSqlParams = [obj.username,fire,obj.content,obj.date];
		connection.query(addSql,addSqlParams,function (err, result) {
			if(err) {console.log('[login ERROR] - ',err.message); return;}
		})
		if(obj.firename != '' && obj.roomname === ''){//单聊
			var target = arrAllSocket[obj.firename];
			console.log(io.sockets.connected[target])
			if (io.sockets.connected[target]) {//对方在线
				io.sockets.connected[target].emit("meg",obj);
			}else{//对方不在线保存消息到表CACHEMSG
				var inSql = 'INSERT INTO CACHEMSG(username,firename,content) VALUES(?,?,?)';
				connection.query(inSql,[obj.username,obj.firename,obj.content],function (err, result) {
					if(err) {console.log('[login ERROR] - ',err.message); return;}
				})
			}
		}else{//向所有客户端广播发布的消息
			io.emit('roommeg', obj);
		}
		console.log(obj.username+'对'+obj.firename+obj.roomname+'说：'+obj.content);
	});
});

http.listen(3535, '127.0.0.1',function(){
	console.log('listening on *:3535');
});
