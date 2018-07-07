var express = require("express"), 
    router  = express.Router(),
    passport = require("passport"),
    middleware = require("../middleware"),
    Campground = require("../models/campground"),
    User    = require("../models/user"); 

var multer = require("multer"), 
    storage = multer.diskStorage({
        filename: function(req, file, callback){
            callback(null, Date.now() + file.originalname); 
        }
    }); 
var imageFilter = function(req, file, cb){
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
        return cb(new Error("Only image files are allowed!"), false); 
    }
    cb(null, true); 
}
var upload = multer = multer({storage: storage, fileFilter: imageFilter}); 
var cloudinary = require("cloudinary"); 
cloudinary.config({
    cloud_name: "groovymensch", 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
}); 

//===============
//User routes
//===============

//show route    
router.get("/:user_id", function(req, res){
    User.findById(req.params.user_id, function(err, foundUser){
        if(err || !foundUser){
           // req.flash("error", "User does not exist"); 
            res.redirect("/campgrounds"); 
        } else {
            //find user campgrounds
            Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds){
                if(err){
                    console.log(err); 
                    res.redirect("/"); 
                } else {
                    res.render("users/show", {user: foundUser, campgrounds: campgrounds}); 
                }
            });
        }
    }); 
}); 

//edit route
router.get("/:user_id/edit", middleware.isLoggedIn, middleware.userOwnership, function(req, res){
    res.render("users/edit");
}); 
//update route
router.put("/:user_id", middleware.isLoggedIn, middleware.userOwnership, upload.single("avatar_image"), function(req, res){
    User.findById(req.params.user_id,  async function(err, user){
        if(err){
            console.log(err);
            req.flash("error", "Something went wrong"); 
            res.redirect("/campgrounds"); 
        } else {
            if(req.file){
                console.log(req.file); 
                try {
                    await cloudinary.v2.uploader.destroy(user.avatarID); 
                    var result = await cloudinary.v2.uploader.upload(req.file.path); 
                    console.log(result); 
                    user.avatar = result.secure_url; 
                    user.avatarID = result.public_id; 
                } catch(e) {
                    req.flash("error", e); 
                    return res.redirect("back"); 
                }
            }
            user.firstName = req.body.user.firstName; 
            user.lastName  = req.body.user.lastName; 
            user.email     = req.body.user.email; 
            user.save(); 
            res.redirect("/users/" + req.params.user_id); 
        }
    }); 
});
//destroy route //!!!!DELETE IMAGES ASSOCIATED WITH EVERYTHING
router.delete("/:user_id", middleware.isLoggedIn, middleware.userOwnership, function(req, res){
   User.findById(req.params.user_id, function(err, user){
        if(err){
             console.log(err);    
        } else {
            Campground.find().where('author.id').equals(req.params.user_id).exec(function(e, campgrounds){
                if(err){
                    console.log(e); 
                    res.redirect("back");  
                } else {
                   campgrounds.forEach(function(camp){
                       camp.remove(); 
                   });   
                }
            });
            //redirect to show page
            user.remove(); 
            res.redirect("/campgrounds/"); 
        }
    }); 
}); 
    
module.exports = router;