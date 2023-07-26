const rootController = {};


rootController.main = (req, res)=>{

    if ( req.cookies.user){

        res.locals.user = JSON.parse(req.cookies.user)
    }

    res.render('index',{user:res.locals.user});
}

module.exports = rootController;



