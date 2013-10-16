exports.index = function (req, res) {
  if (!req.query.access_token || !req.query.expires_in
    || !req.query.username ) {
    res.render('tokencheck', null);
  } else {

    var expires = new Date().getTime() + (parseInt(req.query.expires_in) * 1000);
    var model = {

      agoToken:{token:req.query.access_token,expires:expires,ssl:false},
      userName:req.query.username,
      title: 'GeoEnrichment Demo',
      searchPrompt: 'Address',
      searchBtnLabel: 'Search'
    };


    res.render('index', model);
  }
};