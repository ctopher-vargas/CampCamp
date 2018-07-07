var express = require("express"), 
    router  = express.Router({mergeParams: true}), 
    Campground = require("../models/campground"),
    Comment    = require("../models/comment"), 
    middleware = require("../middleware/index"); 
//=============
//comments route
//=============
router.get("/new", middleware.isLoggedIn, function(req, res){
    //find campground by id 
   Campground.findById(req.params.id, function(err, campground){
       if(err){
           console.log(err); 
       }
       else {
           res.render("comments/new", {campground: campground})
       }
   })
}); 

router.post("/", middleware.isLoggedIn, function(req, res){
    Campground.findById(req.params.id, function(err, campground){
        if(err){
            console.log(err);
            res.redirect("/campgrounds"); 
        } else {
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    req.flash("error", "Something went wrong"); 
                    console.log(err); 
                } else {
                    //add user name and id to comment
                    comment.author.id = req.user._id; 
                    comment.author.username = req.user.username; 
                    //save comment
                    comment.save(); 
                    campground.comments.push(comment); 
                    campground.save(); 
                    console.log(comment); 
                    req.flash("success", "Successfully added comment"); 
                    res.redirect("/campgrounds/" + campground.id); 
                }
            }); 
        }
    }); 
}); 
//-----------------
//edit comment

router.get("/:comment_id/edit", middleware.commentOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground){
        if(err || !foundCampground){
            req.flash("err", "Cannot find campground"); 
            return res.redirect("back"); 
        }
        Comment.findById(req.params.comment_id, function(err, comment){
            if(err){
                console.log("err"); 
                res.redirect("back"); 
            } else {
                res.render("comments/edit", {comment: comment, campground_id: req.params.id}); 
            }
        }); 
    }); 
     
}); 
//edit
router.put("/:comment_id",  middleware.commentOwnership, function(req, res){
     Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
        if(err){
            console.log(err); 
            res.redirect("back"); 
        } else {
            res.redirect("/campgrounds/"+req.params.id);
        }
     }); 
}); 

//delete  
router.delete("/:comment_id", middleware.commentOwnership, function(req, res){
   // res.send("delete this comment");
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err){
             console.log(err);    
        } else {
            //redirect to show page
            req.flash("success", "Successfully deleted comment"); 
            res.redirect("/campgrounds/" + req.params.id); 
        }
    }); 
}); 

module.exports = router; 