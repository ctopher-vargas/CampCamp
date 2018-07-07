var express = require("express"),
    router  = express.Router(),
    Campground = require("../models/campground"), 
    middleware = require("../middleware"), 
    NodeGeocoder = require("node-geocoder"); 
    
var options = {
    provider: 'google', 
    httpAdapter: 'https', 
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
}; 

var geocoder = NodeGeocoder(options); 

var multer  = require("multer"), 
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


//=================
//campground routes
//=================
router.get("/", function(req, res){
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), "gi"); 
        Campground.find({name: regex}, function(err, searchCampgrounds){
             if(err){
                console.log(err); 
            } else {
                if(searchCampgrounds.length == 0){
                    req.flash("error", "no matches found"); 
                    res.redirect("back"); 
                } else {
                    res.render("campgrounds/index", {campgrounds: searchCampgrounds, currentUser: req.user, page: "campgrounds"}); 
                }
            }
        }); 
    } else {
        Campground.find({}, function(err, allCampgrounds){
            if(err){
                console.log(err); 
            } else {
                res.render("campgrounds/index", {campgrounds: allCampgrounds, currentUser: req.user, page: "campgrounds"}); 
            }
        }); 
    }
}); 

router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("campgrounds/new");
}); 
//SHOW - show more info about one campground
router.get("/:id", function(req, res){
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
         if(err || !foundCampground){
            req.flash("error", "campground not found"); 
            res.redirect("/campgrounds"); 
        } else {
            res.render("campgrounds/show", {campground: foundCampground});     
        }
    }); 
}); 

router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res){
    geocoder.geocode(req.body.location, function(err, data){
        if(err || !data.length){
            req.flash("error", "Invalid address"); 
            console.log(err); 
            return res.redirect("back"); 
        }
        cloudinary.uploader.upload(req.file.path, function(result){
            var newCampground = {
                name: req.body.campground.name, 
                image: result.secure_url, 
                imageID: result.public_id,
                price: req.body.campground.price, 
                description: req.body.campground.description, 
                location: data[0].formattedAddress, 
                lat: data[0].latitude, 
                lng: data[0].longitude,
                author: {
                    id: req.user._id,
                    username: req.user.username
                }
            }
            console.log(result.secure_url); 
            Campground.create(newCampground, function(err, campground){
                if(err){
                    req.flash("error", err.message); 
                    return res.redirect("back"); 
                }
                console.log(campground); 
                res.redirect('/campgrounds/' + campground.id); 
            }); 
        });
    }); 
});

//Edit
router.get("/:id/edit", middleware.campOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, camp){
        res.render("campgrounds/edit", {campground: camp}); 
    }); 
}); 

//put
router.put("/:id", middleware.campOwnership, upload.single("image"), function(req, res){
    //find and update
    Campground.findById(req.params.id, async function(err, campground){
        if(err){
            console.log(err); 
            res.redirect("/campgrounds"); 
        } else {
            if(req.file){
                try {
                    await cloudinary.v2.uploader.destroy(campground.imageID); 
                    var result = await cloudinary.v2.uploader.upload(req.file.path); 
                    campground.image = result.secure_url; 
                    campground.imageID = result.public_id; 
                } catch(err) {
                    req.flash("error", err.message); 
                    return res.redirect("back"); 
                }
            }
            campground.name = req.body.campground.name; 
            campground.description = req.body.campground.description; 
            campground.price = req.body.campground.price; 
            campground.location = req.body.location; 
            campground.save(); 
            res.redirect("/campgrounds/"+req.params.id);
        }
    }); 
}); 
//destroy
router.delete("/:id", middleware.campOwnership, function(req, res){
    Campground.findByIdAndRemove(req.params.id, async function(error, campground){
        if(error){
            req.flash("error", "Unable to delete from database"); 
             console.log(error);    
        } else {
            //redirect to show page
            try{
                await cloudinary.v2.uploader.destroy(campground.imageID);
                req.flash("success", "Successfully deleted the campground"); 
                campground.remove(); 
                res.redirect("/campgrounds/"); 
            } catch(err) {
                console.log(err); 
                req.flash("error", err); 
                return res.redirect("back"); 
            }
            res.redirect("/campgrounds/"); 
        }
    }); 
});

function escapeRegex(text){
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); 
}
module.exports = router;