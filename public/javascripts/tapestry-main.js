//init app
var gs;
var tapSegs;
$(document).ready(function () {
  //load tapestry segments
  d3.json("javascripts/tapestrysegments.json", function (segmentData) {
    tapSegs = segmentData;
  });

  //init geoservices
  gs = new Geoservices.Geoservices({token: agoToken});
  initNavBarHandlers();

  //Init with dummy data
  d3.json("tapestry-only.json", function(data) {
    updateCharts(data);
  });
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
      var geom = res.locations[0].feature.geometry;
      var params = {
          studyAreas:[{"geometry":{"x":geom.x,"y":geom.y},
            "areaType":"StandardGeography","intersectingGeographies":[{"sourceCountry":"US","layer":"US.ZIP5"}]}],
          returnGeometry:false
      }
      enrich(params);
    }else{
      alert('Sorry. No matches found.');
    }
  });
}




/**
 * Calls the enrich method using the specified params and
 * appends the results to a pop-up bound to the layer param
 * where layer is a Leaflet Layer (polygon, circle, rectangle, etc.)
 * @param params
 */
function enrich(params){
  progressBar(true);
  appendEnrichParams(params);
  gs.enrich(params, function (err, data) {
    if (err) {
      handleError(err);
    }
    else {
      progressBar(false);
      updateCharts(data);
    }
  });
}

/*function enrich(params){
  progressBar(true);
  d3.json("tapestry-only.json", function(data) {
    progressBar(false);
    updateCharts(data);
  });
}*/

function appendEnrichParams(params){
  params.useData = {"sourceCountry":"US"}; //for now US only
  params.analysisVariables = ["POP01","POP02","POP03","POP04","POP05","POP06","POP07","POP08","POP09","POP10","POP11","POP12","POP13","POP14","POP15","POP16","POP17","POP18","POP19","POP20","POP21","POP22","POP23","POP24","POP25","POP26","POP27","POP28","POP29","POP30","POP31","POP32","POP33","POP34","POP35","POP36","POP37","POP38","POP39","POP40","POP41","POP42","POP43","POP44","POP45","POP46","POP47","POP48","POP49","POP50","POP51","POP52","POP53","POP54","POP55","POP56","POP57","POP58","POP59","POP60","POP61","POP62","POP63","POP64","POP65"];
}


function updateCharts(data){
  var enrichedData = data;
  var w = 800,
    h = 800,
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

/*  d3.select("#treeChart")
    .style("opacity",1)
    .transition()
    .duration(600)
    .style("opacity",0).remove();*/
  d3.select("#treeChart").remove();
  var svg = d3.select("#chartcontainer")
    .append("svg:svg")
    //.attr("viewBox", "0 0 1200 850")
    .attr("id", "treeChart")
    .attr("width", w)
    .attr("height", h)
    .append("svg:g")
    .attr("transform", "translate(.5,.5)");


    var numFormat = d3.format(",");
    var perFormat = d3.format("%");

    enrichedData = mergeFieldsAndValues(enrichedData, null).filter(function (d) {
      return (d.name.indexOf('POP') > -1 && d.value > 0);
    });

    var nest = d3.nest();
    var nestedData = nest.key(function (d) {return tapSegs.segments[d.name].group})
            .entries(enrichedData);

    if($("#legend").length == 0){
      updateLegend(tapSegs,color);
    }

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

}

function updateLegend(tapSegs,color){
  var width = 500,
      height = 800;

  var nest = d3.nest();
  var nestedTap = nest.key(function (d) {return d.value.group})
    .key(function (d) {return d.value.alias2})
          .entries(d3.entries(tapSegs.segments));
  var root = {key:"Segments",values:nestedTap} ;

  var cluster = d3.layout.cluster()
      .size([height, width - 160])
      .children(function (d) {return d.values})
      .value(function (d) {return d.key;});

  var diagonal = d3.svg.diagonal()
      .projection(function(d) { return [d.y, d.x]; });

  var svg = d3.select("#legendcontainer")
      .append("svg")
      .attr("id","legend")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(40,0)");

    var nodes = cluster.nodes(root).filter(function(d) { return d.depth < 3; });
    var links = cluster.links(nodes).filter(function(d) {return d.source.depth < 2; });

    var link = svg.selectAll(".link")
        .data(links)
      .enter().append("path")
        .attr("class", "link")
        .attr("d", diagonal);

    var node = svg.selectAll(".node")
        .data(nodes)
      .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })

    node.append("circle")
        .attr("r", 4.5)
      .style("fill", function (d) {
        return d.depth == 2 ? color(d.parent.key) :  color(d.key);
      })

    node.append("text")
        .attr("dx", function(d) { return (d.depth == 1) ? -10: 10; })
        .attr("dy", 3)
        .style("text-anchor", function(d) { return  (d.depth == 1) ? "end" : "start"; })
        .text(function(d) { return (d.depth == 0) ? "" : d.key; });
}




