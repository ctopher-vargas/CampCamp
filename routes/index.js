var express     = require("express"), 
    router      = express.Router(),
    passport   = require("passport"), 
    async       = require("async"),
    nodemailer  = require("nodemailer"),
    crypto      = require("crypto"),
    User        = require("../models/user"); 
    
var multer = require("multer"), 
    storage = multer.diskStorage({
        filename: function(req, file, callback){
            callback(null, Date.now() + file.originalname); 
        }
    });
var imageFilter = function(req, file, cb){
    //accepts image files only 
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
        return cb(new Error("Only image files are allowed!"), false); 
    }
    cb(null, true); 
}
var upload = multer({storage: storage, fileFilter: imageFilter}); 
var cloudinary = require("cloudinary"); 
cloudinary.config({
    cloud_name: "groovymensch", 
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
}); 

//ROUTES

router.get("/", function(req, res){
    res.render("landing")
}); 
router.get("/about", function(req, res){
    res.send("soon to be about page"); 
})
router.get("/contact", function(req, res){
    res.send("soon to be contact page"); 
})
//auth routes
//register
router.get("/register", function(req, res){
    res.render("register", {page: "register"}); 
}); 
router.post("/register", upload.single("avatar_img"), function(req, res){
    console.log("hello")
    var admin = false; 
    if(req.body.email === "ctopher.vargas@gmail.com"){
        admin = true; 
    }
    cloudinary.uploader.upload(req.file.path, function(result){
        var newUser = new User({
                            username: req.body.username, 
                            firstName: req.body.firstName, 
                            lastName: req.body.lastName, 
                            email: req.body.email, 
                            avatar: result.secure_url, 
                            avatarID: result.public_id, 
                            isAdmin: admin
                        }); 
        console.log(newUser); 
        User.register(newUser, req.body.password, function(err, user){
            if(err){
                req.flash("error", err.message); 
                return res.render("register"); 
            }
            passport.authenticate("local")(req, res, function(){
                req.flash("success", "Welcome to CampCamp " + user.username); 
                res.redirect("/campgrounds"); 
            }); 
        }); 
    }); 
}); 

//login

router.get("/login", function(req, res){
    res.render("login", {page: "login"}); 
}); 

router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds", 
        failureRedirect: "/login"
    }), function(req, res){
    res.send("you logged in " + req.body.username); 
});

//logout
router.get("/logout", function(req, res){
    req.logout(); 
    req.flash("success", "logged out"); 
    res.redirect("/campgrounds"); 
}); 

router.get("/forgot", function(req, res){
    res.render("forgot"); 
}); 
router.post("/forgot", function(req, res, next){
    async.waterfall([
        function(done){
            crypto.randomBytes(20, function(err, buf){
               var token = buf.toString('hex'); 
               done(err, token); 
            });
        }, 
        function(token, done){
            User.findOne({email: req.body.email}, function(err, user){
                if(!user){
                    req.flash("error", "no account with that email address exists."); 
                    return res.redirect("/forgot"); 
                }
                user.resetPasswordToken = token; 
                user.resetPasswordExpires = Date.now()+3600000; // 1 hour 
                user.save(function(err){
                    done(err, token, user); 
                }); 
            }); 
        }, 
        function(token, user, done){
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail', 
                auth: {
                    user: 'campcamp.trips@gmail.com',
                    pass: process.env.GMAILPW
                } 
            }); 
            var mailOptions = {
                to: user.email, 
                from: 'campcamp.trips@gmail.com', 
                subject: 'password reset for your campcamp account',
                text: 'You are receiving this because you (or someone else) has requiested the reset your password' + '\n\n'+
                      'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                      'If you did not request the password change, please igonore and your password will remain the same'
            }; 
            smtpTransport.sendMail(mailOptions, function(err){
                console.log('mail sent'); 
                req.flash('success', 'An email has been sent to ' + user.email + ' with further instructions.'); 
                done(err, 'done'); 
            }); 
        }
    ], function(err){
        if(err){
            return next(err); 
        }
        res.redirect("/campgrounds"); 
    });
}); 
router.get("/reset/:token", function(req, res){
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now() } }, function(err, user){
        if(!user){
            req.flash("error", "Password reset token is invalid or has expired"); 
            return res.redirect("/forgot"); 
        }
        res.render('reset', {token: req.params.token}); 
    }); 
}); 
router.post("/reset/:token", function(req, res){
    async.waterfall([
        function(done){
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user){
                if(err){
                    console.log(err); 
                } else {
                    if(!user){
                        req.flash("error", "Password reset token is invalid or has expired"); 
                        return res.redirect("back"); 
                    } else {
                        if(req.body.new_password === req.body.confirm_password){
                            user.setPassword(req.body.new_password, function(err){
                                if(err){
                                    console.log(err); 
                                } else {
                                    user.resetPasswordToken = undefined; 
                                    user.resetPasswordExpires = undefined; 
                                    user.save(function(err){
                                        if(err){
                                            console.log(err);
                                        }
                                        req.logIn(user, function(err){
                                                console.log("user logged in")
                                                done(err, user); 
                                        }); 
                                    }); 
                                }
                            }); 
                        } else {
                            req.flash("error", "passwords do not match"); 
                            return res.redirect("back"); 
                        }
                    }
                }
            }); 
        }, 
        function(user, done){
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail', 
                auth: {
                    user: 'campcamp.trips@gmail.com',
                    pass: process.env.GMAILPW
                }
            }); 
            
            var mailOptions = {
                to: user.email,
                from: 'campcamp.trips@gmail.com', 
                subject: 'Your password has been changed',
                text: 'Hello, \n\n' +
                'This is a confirmation that the password for your account ' + user.email + ' has been changed'
            }; 
            smtpTransport.sendMail(mailOptions, function(err){
                if(err){
                    console.log(err); 
                } else {
                    req.flash("success", "Your password has been successfully changed."); 
                    done(err, 'done');
                }
            }); 
        }
    ], function(err){
        if(err){
            console.log(err); 
        } else {
            res.redirect("/campgrounds"); 
        }
    }); 
});

module.exports = router; 