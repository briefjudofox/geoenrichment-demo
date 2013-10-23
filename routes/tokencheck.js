exports.tokencheck = function(req, res){
  var tokenModel;
  if (req.query.d ) {
    var tokenModel = {
       view:req.query.d
    };
  }else{
    tokenModel = {
       view:'map'
    };
  }
  res.render('tokencheck', tokenModel);
};
