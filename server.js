require('dotenv').config();
const chalk = require('chalk');
const debug = require('debug')('app');
const morgan = require('morgan');
var express = require('express');
var passport = require('passport');
var mongoose = require('mongoose');
const User = require('./models/user');
var Strategy = require('passport-windowslive').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;


// Configure the Facebook strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new GoogleStrategy({
  clientID: process.env['GOOGLE_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  callbackURL: 'http://localhost:3000/auth/google/callback'
},
  function (accessToken, refreshToken, profile, done) {
    //check user table for anyone with a facebook ID of profile.id
    User.findOne({ googleId: profile.id }, function (err, user) {
      if (err) {
        debug(`Error finding User: ${err}`);
        return done(err);
      }
      // No User was found... so create a new user with values from Google
      if (!user) {
        const newUser = {
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails,
          username: profile.username,
          provider: 'google',
          google: profile._json,
          accesstoken: accessToken,
          refreshtoken: refreshToken
        }
        //save to DB
        User.create(newUser, function(err, newlyCreatedUser) {
          if (err) {
            debug(`ERROR saving user to DB: ${err}`);
            return done (err)
          } else {
            //found user
            debug(`Created user: ${newlyCreatedUser}`);
            return done(newlyCreatedUser);
          }
        });
      } else {
        // user already exist
        debug(`User already exist: ${user}`);
        return done (err, user);
      }
    });
  }
));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


//connect to DB engine with mongoose
var userdb = process.env.USERDB
//console.log(userdb);
var pass = process.env.DBPWD
//console.log(pass);
var dbs = process.env.DB
//console.log(dbs); 
                                       
const db = 'mongodb+srv://'+userdb+':'+pass+'@cluster0.4vkik.gcp.mongodb.net/'+dbs+'?retryWrites=true&w=majority'
mongoose
    .connect(db, { 
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false
      })
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));


// Create a new Express application.
var app = express();

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


// This code loads the user profile into the locals property of the response. 
// This will make it available to all of the views in the app.
app.use(function(req, res, next) {
  // Set the authenticated user in the
  // template locals
  if (req.user) {
    res.locals.user = req.user.profile;
  }
  next();
});

// Define routes.
app.get('/',
  function(req, res) {
    res.render('home', { user: req.user });
  });

app.get('/login',
  function(req, res){
    res.render('login');
  });

// windows
app.get('/login/windowslive',
  passport.authenticate('windowslive'));

app.get('/return', 
  passport.authenticate('windowslive', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('profile', { user: req.user });
  });


// Google routes
app.get('/auth/google',
passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

//Server
var server = app.listen(process.env.PORT || 3000, function(){
  var port = server.address().port;
  debug(`Express is running on port ${port}`);
});