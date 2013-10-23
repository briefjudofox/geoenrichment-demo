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

//Generic AGO error handler
function handleError(err){
  progressBar(false);
  var message = "Error! :( Check Console";
  if(err && err.code) {
    if(err.code == 498){
      message = 'Oh no! Your arcgis.com token expired. Dismiss this message to log in again.';
      window.location.replace(window.location.pathname);
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
