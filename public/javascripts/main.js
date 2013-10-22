//init app
var map;
var gs;
var drawnItems;
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
  drawnItems = new L.FeatureGroup();
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
    geomAddHandler(type, layer);
  });

  //init geoservices
  gs = new Geoservices.Geoservices({token: agoToken});

  initNavBarHandlers();
});

//init nav bar handlers (add geocode to input and search button)
function initNavBarHandlers(){
  $('#searchBtn').on('click', function (e) {
    geocode($("#searchInput").val());
  });

  $('#searchInput').on('keypress',function (e) {
    if (e.which == 13) {
      e.preventDefault();
      geocode($("#searchInput").val());
    }

  });
}

//issues a geocode request
function geocode(searchText){
  gs.geocode({ text: searchText, sourceCountry:"USA"},function(err, res){
    if(res.locations && res.locations.length > 0){
      var ext = res.locations[0].extent;
      var geom = res.locations[0].feature.geometry;
      map.fitBounds([[ext.ymin,ext.xmin],[ext.ymax,ext.xmax]]);
      var marker = L.marker([geom.y, geom.x]);
      drawnItems.addLayer(marker);
      geomAddHandler('marker',marker)
    }else{
      alert('Sorry. No matches found.');
    }
  });
}

//Geo Enrich the specified layer
function geomAddHandler(type, layer) {
  var params;
  if (type === 'circle') {
    params = {studyAreas: [
      {"geometry": {"x": layer.getLatLng().lng, "y": layer.getLatLng().lat}}],
      studyAreasOptions: {"areaType": "RingBuffer", "bufferUnits": "esriMeters", "bufferRadii": [layer.getRadius()]}
    };
  }
  else if (type === 'rectangle' || type === 'polygon') {
   params = {studyAreas: [
      {"geometry":{"rings":layer.toGeoJSON().geometry.coordinates}}]
    };
  }
  else if(type === 'marker'){
     handleMarkerInit(layer);
    return;
  }
  else {
    return;
  }
   enrich(layer,params);
}

/**
 * Calls the enrich method using the specified params and
 * appends the results to a pop-up bound to the layer param
 * where layer is a Leaflet Layer (polygon, circle, rectangle, etc.)
 * @param layer
 * @param params
 */
function enrich(layer,params){
  progressBar(true);
  appendEnrichParams(params);
  gs.enrich(params, function (err, data) {
    if (err) {
      handleError(err);
    }
    else {
      progressBar(false);
      layer.bindPopup(buildStudyPopUp(data)).openPopup();
    }
  });
}

/**
 * Calls the enrich service for the given parameters.
 * Assumes that return geometry is set to true and that
 * geom type is polygon.  Adds a new layer for the polygon
 * and appends the results to a pop-up bound bound to the
 * polygon.
 * @param params
 */
function enrichAndDrawPoly(params){
  progressBar(true);
  appendEnrichParams(params);
 gs.enrich(params, function (err, data) {
    if (err) {
      handleError(err);
    }
    else {
      progressBar(false);
      var rings = data.results[0].value.FeatureSet[0].features[0].geometry.rings;
      var poly = L.GeoJSON.geometryToLayer({type:"Polygon",coordinates:rings});
      drawnItems.addLayer(poly);
      map.fitBounds(poly.getBounds());
      poly.bindPopup(buildStudyPopUp(data)).openPopup();
    }
  });
}

function appendEnrichParams(params){
  params.useData = {"sourceCountry":"US"}; //for now US only
  params.dataCollections = ["Age"];
  params.analysisVariables = ["POP01","POP02","POP03","POP04","POP05","POP06","POP07","POP08","POP09","POP10","POP11","POP12","POP13","POP14","POP15","POP16","POP17","POP18","POP19","POP20","POP21","POP22","POP23","POP24","POP25","POP26","POP27","POP28","POP29","POP30","POP31","POP32","POP33","POP34","POP35","POP36","POP37","POP38","POP39","POP40","POP41","POP42","POP43","POP44","POP45","POP46","POP47","POP48","POP49","POP50","POP51","POP52","POP53","POP54","POP55","POP56","POP57","POP58","POP59","POP60","POP61","POP62","POP63","POP64","POP65"];
}

function buildStudyPopUp(data){
  var detachedDiv = document.createElement("div");
  var ageContent = enrichmentToDonutHtml(data);
  var tapestryContent = enrichmentToTreeMapHtml(data);
  $(detachedDiv).load('/fragments/study-popup-fragment.html',function(){
    $(detachedDiv).find(".popup-tapestry-content").append(tapestryContent);
    $(detachedDiv).find(".popup-age-content").append(ageContent);
  });

  return detachedDiv;
}

/**
 * Builds a pop-up and content for marker adds (click on map or
 * geocode result).  Options in pop-up are add a ring or drive
 * time.  Handlers call enrich methods automatically.
 * @param marker
 */
function handleMarkerInit(marker){
  var detachedDiv = document.createElement("div");
  $(detachedDiv).load('/fragments/marker-init-fragment.html',function(){
    //Rings and Drivetimes
    $(detachedDiv).find(".btn-add-buffer").on('click', function (e) {
      var bufVal = $(detachedDiv).find(".point-buffer-select").val();
      var bufType = $(detachedDiv).find(".point-buffer-type-select").val();
      if(bufType == "Ring"){
        var circle = L.circle(marker.getLatLng(),1609.34 * bufVal);
        drawnItems.addLayer(circle);
        map.fitBounds(circle.getBounds());
        geomAddHandler("circle",circle);
        drawnItems.removeLayer(marker);
      }else if(bufType == "DriveTime"){
        var params = {
            studyAreas:[{"geometry":{"x":marker.getLatLng().lng,"y":marker.getLatLng().lat}}],
            studyAreasOptions:{"areaType":"DriveTimeBuffer","bufferUnits":"esriDriveTimeUnitsMinutes","bufferRadii":[bufVal]},
            returnGeometry:true
        }
        enrichAndDrawPoly(params);
        drawnItems.removeLayer(marker);
      }
    });
    //Standard Geogs
    $(detachedDiv).find(".btn-add-geog").on('click', function (e) {
      var geogLayer = $(detachedDiv).find(".std-geog-select").val();
        var params = {
            studyAreas:[{"geometry":{"x":marker.getLatLng().lng,"y":marker.getLatLng().lat},
              "areaType":"StandardGeography","intersectingGeographies":[{"sourceCountry":"US","layer":geogLayer}]}],
            returnGeometry:true
        }
        enrichAndDrawPoly(params);
        drawnItems.removeLayer(marker);

    });
    marker.bindPopup(detachedDiv).openPopup();

  });
}

//Generic AGO error handler
function handleError(err){
  progressBar(false);
  var message = "Error! :( Check Console";
  if(err && err.code) {
    if(err.code == 498){
      message = 'Oh no! Your arcgis.com token expired. Dismiss this message to log in again.';
      window.location.replace('/');
    }else if(err.code == 110023){
      message = 'Sorry we can\'t create a study area here.';
    }

  }
  console.log( err);
  alert(message);
}

function progressBar(show){
  show ? $('#progressBar').show() : $('#progressBar').hide();
}

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
  var enrichedData = data;
  var detachedHtml = d3.select(document.createElement("div"));
  detachedHtml.append('h3').text('Age Distribution');
  var chartContainer = detachedHtml.append("div")
    .attr("class","row");
  var legendHtml = chartContainer.append("div")
    .attr("class","col-md-4");
  var chartHtml = chartContainer.append("div")
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

    enrichedData = mergeFieldsAndValues(enrichedData, summaryFieldFunctions);

    var dataSets = [];
    dataSets.push(enrichedData.filter(function (d) {return d.name.indexOf('MALE') > -1;}));
    dataSets.push(enrichedData.filter(function (d) {return d.name.indexOf('FEM') > -1;}));

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


function enrichmentToTreeMapHtml(data) {
  var enrichedData = data;
  var detachedHtml = d3.select(document.createElement("div"));
  detachedHtml.append('h3').text('Tapestry Segmentation');


  var w = 400,
    h = 400,
    x = d3.scale.linear().range([0, w]),
    y = d3.scale.linear().range([0, h]),
    color = d3.scale.category20c(),
    root,
    node;

  var treemap = d3.layout.treemap()
    .round(false)
    .size([w, h])
    .sticky(true)
    .mode("squarify")
    .children(function (d) {
      return d.values;
    })
    .value(function (d) {
      return d.value;
    });

  var svg = detachedHtml.append("div")
    .attr("class", "chart")
    .style("width", w + "px")
    .style("height", h + "px")
    .append("svg:svg")
    .attr("width", w)
    .attr("height", h)
    .append("svg:g")
    .attr("transform", "translate(.5,.5)");


  d3.json("javascripts/tapestrysegments.json", function (segmentData) {
    var tapSegs = segmentData;
    var numFormat = d3.format(",");
    var perFormat = d3.format("%");

    enrichedData = mergeFieldsAndValues(enrichedData, null).filter(function (d) {
      return (d.name.indexOf('POP') > -1 && d.value > 0);
    });

    var nest = d3.nest();
    var nestedData = nest.key(function (d) {return tapSegs.segments[d.name].group})
      .entries(enrichedData);
    node = root = {key: "Tapestry", values: nestedData};

    var nodes = treemap.nodes(root)
      .filter(function (d) {
        return !d.values;
      });

    var cell = svg.selectAll("g")
      .data(nodes)
      .enter().append("svg:g")
      .attr("class", "cell")
      .attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      })
      .on("click", function (d) {
        return zoom(node == d.parent ? root : d.parent);
      });

    cell.append("svg:rect")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("width", function (d) {
        return (d.dx - 1) < 1 ? 0 : (d.dx - 1);
      })
      .attr("height", function (d) {
        return (d.dy - 1) < 1 ? 0 : (d.dy - 1);
      })
      .attr("class", "tap-rect")
      .style("fill", function (d) {
        return color(tapSegs.segments[d.name].group);
      })
      .append("title")
      .text(function (d, i) {
        return [ 'Group:', tapSegs.segments[d.name].group, '\n',
          'Segment:', tapSegs.segments[d.name].alias2, '\n',
          perFormat(d.value / d.parent.value), 'of segment population', '\n',
          numFormat(d.value), 'of', numFormat(d.parent.value), 'people'].join(' ');
      });
  });

  var zoom = function (d) {
    var kx = w / d.dx, ky = h / d.dy;
    x.domain([d.x, d.x + d.dx]);
    y.domain([d.y, d.y + d.dy]);

    var t = svg.selectAll("g.cell").transition()
      .duration(d3.event.altKey ? 7500 : 750)
      .attr("transform", function (d) {
        return "translate(" + x(d.x) + "," + y(d.y) + ")";
      });

    t.select("rect")
      .attr("width", function (d) {
        return kx * ((d.dx - 1) < 1 ? .1 : (d.dx - 1));
      })
      .attr("height", function (d) {
        return ky * ( (d.dy - 1) < 1 ? .1 : (d.dy - 1) );
      })

    node = d;
    d3.event.stopPropagation();
  }

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