
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
      polyline:false
    },
    edit:false
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

//Geo Enrich the specified layer
function enrich(type, layer) {
  var enrichService = gs.GeoEnrichmentService({token: agoToken});
  var params;
  if (type === 'circle') {
    params = {studyAreas: [
      {"geometry": {"x": layer.getLatLng().lng, "y": layer.getLatLng().lat}}],
      studyAreasOptions: {"areaType": "RingBuffer", "bufferUnits": "esriMeters", "bufferRadii": [layer.getRadius()]},
      dataCollections: ["Age"]
    };
  }
  else if (type === 'rectangle' || type === 'polygon') {
   params = {studyAreas: [
      {"geometry":{"rings":layer.toGeoJSON().geometry.coordinates}}],
      dataCollections: ["Age"]
    };
  } else {
    return;
  }
  enrichService.enrich(params, function (err, data) {
    if (err) {
      handleError(err);
    }
    else {
      var content = enrichmentToDonutHtml(data);
      layer.bindPopup(content).openPopup();
    }
  });
}

//Generic AGO error handler
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

//leaflet to ago related
//function toAgoPolygon()

//////////////d3 related

/**
 * Returns a detached div containing SVG based legend and donut charts
 * for the proved json data. The data param must be an AGO GeoEnrichment
 * JSON response.  Method depends on d3 and bootstrap css.
 * @TODO method is currently specific to AGE variables, but should be made
 * generic.
 * @param data
 * @returns {*}
 */
function enrichmentToDonutHtml(data){
  var detachedHtml = d3.select(document.createElement("div"))
    .attr("class","row");
  var legendHtml = detachedHtml.append("div")
    .attr("class","col-md-4");
  var chartHtml = detachedHtml.append("div")
      .attr("class","col-md-8");

  var radius = 74,
    padding = 10;
  var color = d3.scale.category20();

  var arc = d3.svg.arc()
    .outerRadius(radius)
    .innerRadius(radius - 40);

  var pie = d3.layout.pie()
    .sort(null)
    .value(function (d) {
      return d.value;
    });

    var summaryFieldFunctions = [
      {field: 'total', func: function (entries) {
        return d3.sum(entries, function (entry) {
          return (entry.key.indexOf('MALE') > -1 || entry.key.indexOf('FEM') > -1) ? entry.value : 0;
        })
      }},
      {field: 'maleTotal', func: function (entries) {
        return d3.sum(entries, function (entry) {
          return (entry.key.indexOf('MALE') > -1) ? entry.value : 0;
        })
      }},
      {field: 'femaleTotal', func: function (entries) {
        return d3.sum(entries, function (entry) {
          return (entry.key.indexOf('FEM') > -1) ? entry.value : 0;
        })
      }}
    ];

    data = mergeFieldsAndValues(data, summaryFieldFunctions);

    var dataSets = [];
    dataSets.push(data.filter(function (d) {return d.name.indexOf('MALE') > -1;}));
    dataSets.push(data.filter(function (d) {return d.name.indexOf('FEM') > -1;}));

    color.domain(dataSets[0].map(function (d) {return d.alias.split(' ')[2]}));

    var legend = legendHtml.append("svg")
      .attr("class", "legend")
      .attr("width", radius)
      .attr("height", radius * 5)
      .selectAll("g")
      .data(color.domain().slice().reverse())
      .enter().append("g")
      .attr("transform", function (d, i) {
        return "translate(0," + i * 20 + ")";
      });

    legend.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

    legend.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .text(function (d) {
        return d;
      });


    var numFormat = d3.format(",");
    var perFormat = d3.format("%");

    // console.log([values]);
    var svg = chartHtml.selectAll(".pie")
      .data(dataSets)
      .enter().append("svg")
      .attr("class", "pie")
      .attr("width", radius * 2)
      .attr("height", radius * 2)
      .append("g")
      .attr("transform", "translate(" + radius  + "," + radius + ")");

    svg.selectAll(".arc")
      .data(function (d, i) {
        return pie(dataSets[i])
      })
      .enter().append("path")
      .attr("class", "arc")
      .attr("d", arc)
      .style("fill", function (d) {
        return color(d.data.alias.split(' ')[2]);
      })
      .append("title")
      .text(function (d, i) {
        var isMale = d.data.name.indexOf('MALE') > -1;
        return [d.data.alias, ': ', numFormat(d.data.value), '\n',
          perFormat(d.data.value / d.data.total), ' of total population', '\n',
          perFormat(d.data.value / d.data[isMale ? 'maleTotal' : 'femaleTotal']),
          'of ', isMale ? 'male ' : 'female ', 'population'].join(' ');
      });


    svg.append("text")
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .text(function (d) {
        return d[0].alias.split(',')[0];
      });

    return detachedHtml[0][0];
}

/**
 * Given a geoenrichment result, merge values with corresponding fields.
 * If optional summaryFunctions param is provided iterate summary functions
 * with entries to produce summary vars (e.g. sum, max, mean, etc.).  The
 * dynamic summary fields will be appended to each field object.
 *
 * SummaryFunctions takes the form:
 * [{field:'Your Field Name',func:function(entries){...return your summation here},...]
*
* @param data
 * @param summaryFunctions
 * @returns {*}
 */
function mergeFieldsAndValues(data, summaryFunctions) {
  var fields = data.results[0].value.FeatureSet[0].fields;
  var values = data.results[0].value.FeatureSet[0].features[0].attributes;
  var entries = d3.entries(values);
  var summaries = {};
  if (summaryFunctions) {
    for (var i = 0; i < summaryFunctions.length; i++) {
      summaries[summaryFunctions[i].field] = summaryFunctions[i].func(entries);
    }
  }
  for (var i = 0; i < fields.length; i++) {
    fields[i].value = values[fields[i].name];
    for (var key in summaries) {
      fields[i][key] = summaries[key];
    }
  }
  return fields;
}