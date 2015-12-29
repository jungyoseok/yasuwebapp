//NodeJS Server

//Initialize our Express Web framework.
var express = require('express');
var app = express();

//socket IO stuff
var http = require('http').Server(app);
var io = require('socket.io')(http);

//native NodeJS module for resolving paths
var path = require('path');

//get our port # from c9's enviromental variable: PORT
var port = process.env.PORT;

var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
// var multer = require('multer');
var passport = require('passport');
var flash = require('connect-flash');
var MongoStore = require('connect-mongo')(session);

//setup, configure, and connect to MongoDB
var mongoose = require('mongoose');
var configDB = require('./server/config/database.js');
mongoose.connect(configDB.url);


app.use(bodyParser.json());
app.use(methodOverride());



//Set our view engine to EJS, and set the directory our views will be stored in
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'client', 'views'));

//serve static files from client folder.
//ex: libs/bootstrap/bootstrap.css in our html actually points to client/libs/bootstrap/bootstrap.css
app.use(express.static(path.resolve(__dirname, 'client')));
//
// app.use(multer({dest: './uploads/'}).single('file'));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({secret: 'anystringoftext',
         saveUninitialized: true,
         resave: true,
         store: new MongoStore({ mongooseConnection: mongoose.connection,
                      ttl: 2 * 24 * 60 * 60 })}));

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

var users = [];
io.on('connection', function(socket) {
  var username = '';
  console.log("A User has Connected!");
  
  socket.on('request-users', function(){
    socket.emit('users', {users: users});
  });
  
  socket.on('message', function(data){
    io.emit('message', {username: username, message: data.message});
  })
  
  socket.on('add-user', function(data){
    if(users.indexOf(data.username) == -1){
      io.emit('add-user', {
        username: data.username
      });
      username = data.username;
      users.push(data.username);
    } else {
      socket.emit('prompt-username', {
        message: 'User Already Exists'
      })
    }
  })
  
  socket.on('disconnect', function(){
    console.log(username + ' has disconnected!');
    users.splice(users.indexOf(username), 1);
    io.emit('remove-user', {username: username});
  })
});


//set our first route
app.get('/', function(req, res) {
  res.render('index.ejs');
});

var api = express.Router();
require('./server/routes/api')(api);
app.use('/api', api);

var auth = express.Router();
require('./app/routes/auth')(auth, passport);
app.use('/auth', auth);

var secure = express.Router();
require('./app/routes/secure')(secure);
app.use('/', secure);

app.get('/*', function(req, res) {
  res.render('index.ejs');
});

//make our app listen for incoming requests on the port assigned above
http.listen(port, function() {
  console.log('SERVER RUNNING... PORT: ' + port);
})