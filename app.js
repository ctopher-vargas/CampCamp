require("dotenv").config(); 
    
var express    = require("express"),
    app        = express(), 
    bodyParser = require("body-parser"),
    mongoose   = require("mongoose"),
    flash      = require("connect-flash"),
    passport   = require("passport"),
    LocalStrategy = require("passport-local"),
    methodOverride = require("method-override"),
    User       = require("./models/user"),
    seedDB     = require("./seeds"); 
    
var commentRoutes    = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    userRoutes       = require("./routes/users"),
    indexRoutes      = require("./routes/index");

app.locals.moment = require('moment'); 
    
//mongoose.connect("mongodb://localhost/camp_camp"); 
mongoose.connect("mongodb://chris:rosie101@ds231961.mlab.com:31961/campcamp"); 
app.use(bodyParser.urlencoded({extended: true})); 
app.set("view engine", "ejs"); 
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method")); 
app.use(flash()); 
//seed the database
//seedDB(); 

//passport configuration
app.use(require("express-session")({
        secret: "TootsieFootsie and RosiePosie", 
        resave: false,
        saveUninitialize: false
 })); 
 app.use(passport.initialize()); 
 app.use(passport.session()); 
 passport.use(new LocalStrategy(User.authenticate())); 
 passport.serializeUser(User.serializeUser()); 
 passport.deserializeUser(User.deserializeUser()); 

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success"); 
    res.locals.error   = req.flash("error"); 
    next(); 
}); 

app.use("/", indexRoutes); 
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/users/", userRoutes); 
app.use("/campgrounds", campgroundRoutes); 

app.listen(process.env.PORT, process.envIP, function(){
    console.log("CampCamp server has started..."); 
}); 