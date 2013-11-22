geoenrichment-demo
---

This is a simple web-app that uses esri's [geoenrichment API ](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r30000021r000000) to calculate age characteristics and Esri tapestry data for user defined areas.  A user can generate a drive time or standard geography around a point or draw a circle, rectangle, or custom polygon to define an area.  If you have an [arcgis.com](http://www.arcgis.com/home/) account you can demo the mapping app [here](http://geoenrichment-demo.herokuapp.com/map) (you can also create a [Trial Account](http://www.arcgis.com/features/free-trial.html)).  It should look something like this:

![My image](https://raw.github.com/briefjudofox/geoenrichment-demo/gh-pages/images/map.png)

You can click on a user defined area to see the age or tapestry characteristics:
![My image](https://raw.github.com/briefjudofox/geoenrichment-demo/gh-pages/images/age-popup.png)

![My image](https://raw.github.com/briefjudofox/geoenrichment-demo/gh-pages/images/tapestry-popup.png)

You can also see a full chart view of tapestry data by zipcode [here](http://geoenrichment-demo.herokuapp.com/tapestry).  It should look like this:

![My image](https://raw.github.com/briefjudofox/geoenrichment-demo/gh-pages/images/tapestry.png)

This app uses the following:
* [node.js](https://github.com/joyent/node)
* [Express](https://github.com/visionmedia/express)
* [Jade](https://github.com/visionmedia/jade)
* [Leaflet](https://github.com/Leaflet/Leaflet)
* [esri-leaflet](https://github.com/Esri/esri-leaflet)
* [geoservices-js](https://github.com/Esri/geoservices-js)
* [d3](https://github.com/mbostock/d3)
* [bootstrap](https://github.com/twbs/bootstrap)
