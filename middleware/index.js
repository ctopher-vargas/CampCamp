var Campground  = require("../models/campground"),
    Comment     = require("../models/comment"), 
    User        = require("../models/user")

var middlewareObj = {}; 

//all the middleware
middlewareObj.campOwnership = function(req, res, next){
     //user logged in
    if(req.isAuthenticated()){
        Campground.findById(req.params.id, function(err, camp){
            if(err || !camp){
                req.flash("error", "Campground Not Found"); 
                res.redirect("back"); 
            } else {
                //does user own campground
                if(camp.author.id.equals(req.user._id) || req.user.isAdmin){
                     next(); 
                }
                else {
                    req.flash("error", "You Don't Have Permission"); 
                    res.redirect("back"); 
                }
            }
        }); 
    } else {
        req.flash("error", "Please Login First"); 
        res.redirect("back"); 
    }
}

middlewareObj.userOwnership = function(req, res, next){
    if(req.isAuthenticated()){
        User.findById(req.params.user_id, function(err, user){
            if(err || !user){
                req.flash("error", "User not found"); 
                res.redirect("back"); 
            } else { 
                if(req.user._id.equals(user.id) || req.user.isAdmin){
                    next(); 
                } else {
                    res.send("not the user"); 
                }
            }
        }); 
    }
}

middlewareObj.commentOwnership = function(req, res, next){
     //user logged in
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, comment){
            if(err || !comment){
                req.flash("error", "Comment not found"); 
                res.redirect("back"); 
            } else {
                //does user own campground
                if(comment.author.id.equals(req.user._id) || req.user.isAdmin){
                     next(); 
                }
                else {
                    req.flash("error", "You don't have permission to do that"); 
                    res.redirect("back"); 
                }
            }
        }); 
    } else {
        req.flash("error", "You need to be logged in"); 
        res.redirect("back"); 
    }
}

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next(); 
    } 
    req.flash("error", "Please Login First"); 
    res.redirect("/login"); 
}

module.exports = middlewareObj; 