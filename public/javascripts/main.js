

//init map
var map;
var gs;
$(document).ready(function () {

  map = L.map('map', {

    center: [37.8, -96.9],
    zoom: 4
  });

  //In FF map was getting retina class in browser for some reason...work-around is to remove it.  Not a problem in chrome
  $('#map').removeClass('leaflet-retina');

  // Add ArcGIS Online Basemaps - Streets, Topographic, Gray, Gray Labels, Ocean, NationalGeographic, Imagery, ImageryLabels
  L.esri.basemapLayer("Gray").addTo(map);

  //Add FeatureGroup for draw tool
  var drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  //Init draw tool
  var drawControl = new L.Control.Draw({
    draw:{
      polyline:{metric:false}
    },
    edit: {
      featureGroup: drawnItems
    }
  });

  map.addControl(drawControl);

  //add to layer after draw
  map.on('draw:created', function (e) {
    var type = e.layerType,
      layer = e.layer;
    drawnItems.addLayer(layer);
    enrich(type, layer);
  });

  //init geoservices
  gs = new Geoservices.Geoservices();
});

function enrich(type, layer){
    var enrichService = gs.GeoEnrichmentService({token:agoToken});
    var params;
    if (type === 'circle') {
      params = {studyAreas:[{"geometry":{"x":layer.getLatLng().lng,"y":layer.getLatLng().lat}}],
        studyAreasOptions:{"areaType":"RingBuffer","bufferUnits":"esriMeters","bufferRadii":[layer.getRadius()]},
        dataCollections : ["Age"]
      };
      enrichService.enrich(params,function (err, data) {
        if(err){handleError(err);}
        else{
          var content = enrichmentToHtml(data);
          layer.bindPopup(content).openPopup();
        }
      });

    }
}
function enrichmentToHtml(res){
  var htmlContent = [];
  var attributes = res.results[0].value.FeatureSet[0].features[0].attributes;
  $.each(res.results[0].value.FeatureSet[0].fields,function(i,field){
    htmlContent.push('<p>',field.alias,':',attributes[field.name],'</p>');
  });
  return htmlContent.join('');
}

/*function enrichmentToDonutHtml(res){
  var htmlContent = [];
  var attributes = res.results[0].value.FeatureSet[0].features[0].attributes;
  $.each(res.results[0].value.FeatureSet[0].fields,function(i,field){
    htmlContent.push('<p>',field.alias,':',attributes[field.name],'</p>');
  });
  return htmlContent.join('');
}*/

function handleError(err){
  if(err && err.code && err.code == 498){
    alert('Oh no! Your arcgis.com token expired. Dismiss this message to log in again.');
    window.location.replace('/');
  }else{
    alert('Error...check console');
    console.log( err);
  }
}

//add point click event
$('#addPinBtn').on('click', function (e) {
  map.addOneTimeEventListener('click', function (e) {
    L.marker(e.latlng).addTo(map);
  });
});