var express = require('express');
var path = require('path');
var app = express();
var port = 5000;
var http = require('http');

app.use('/',express.static(path.join(__dirname,'/')));
//app.get('/template',express.static(path.join(__dirname,'./AngularApp/template')));
app.get('/restapi/login',function(req,res){
	var data = {
		status:true,
		data:{
			user:'',
			date:new Date(),
			userUrl:'/user'
		}
	};
	res.send(data);
});
app.listen(port,function(){
	console.log('server running at port:'+port);
});
//http.createServer(app,function(){
//	console.log('server running at port:'+port);
//});
//app.listen(port);
