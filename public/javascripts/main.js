//init map
var map;
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

/*    if (type === 'marker') {
      layer.bindPopup('A popup!');
    }*/

    drawnItems.addLayer(layer);
  });

});

//add point click event
$('#addPinBtn').on('click', function (e) {
  map.addOneTimeEventListener('click', function (e) {
    L.marker(e.latlng).addTo(map);
  });
});