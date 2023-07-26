class CustomError extends Error {
    constructor(message, status){
        super(message);
        this.status = status;
    }
}

module.exports = {
    CustomError: CustomError,

    customErrorHandler: ( err, req, res, next)=>{

        if ( err instanceof  CustomError){
            res.status(err.status);
            res.json({error:err.message});
        }
        else{
            next(err);
        }
    },
};