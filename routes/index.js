exports.index = function (req, res) {
  var model = {
    title: 'GeoEnrichment Demo',
    searchPrompt: 'Address',
    searchBtnLabel: 'Search'
  };
  handleAGOEnabledRequest(req, res, model,'map');
};

exports.tapestry = function (req, res) {
  var model = {
    title: 'GeoEnrichment Demo',
    searchPrompt: 'U.S. Zip Code',
    searchBtnLabel: 'Search'
  };
  handleAGOEnabledRequest(req, res, model,'tapestry');
};

function handleAGOEnabledRequest(req, res, model, view){
  if (!req.query.access_token || !req.query.expires_in
    || !req.query.username ) {
    var tokenModel = {
       view:view
    };
    res.render('tokencheck', tokenModel);
  } else {
    var expires = new Date().getTime() + (parseInt(req.query.expires_in) * 1000);
    model.agoToken = {token:req.query.access_token,expires:expires,ssl:false},
    model.userName = req.query.username;
    res.render(view, model);
  }
}