// TO REFACTOR

var Q = require('q');
var geocoder = require('geocoder');
var sleep = require('sleep');

var eventEmitter = require(__base + 'services/CustomEventEmitter');
var winston = require(__base + 'services/CustomWinston.js');


/** listened events **/
var CRAWLED_EVENT = 'crawled';

/** fired events **/
var GEOCODE_OK = 'geocode_ok';
var GEOCODE_MULTIPLE = 'geocode_multiple';
var GEOCODE_ERROR = 'geocode_error';

/** attributes **/
function GeoCoderService(name) {



}

/** methods **/
GeoCoderService.prototype = {
  
  /**
   * TODO
   * @return {void}
   */
  init: function () {
	  var self = this;
	  eventEmitter.on(CRAWLED_EVENT, function(crawledModule) {
      winston.info ("starting geocoding ...");
		  if (crawledModule) {
			  var concertsList = crawledModule.band.concerts;

        concertsList.forEach (function (concert) {
          self.searchGeometry(concert).then (function (data) {
            if (data.results.length === 1) {
        	    var geometry = data.results[0].geometry;
              
        	    concert.geometry = {
                lat: geometry.location.lat,
                lon: geometry.location.lng 
              };
        	    eventEmitter.emit(GEOCODE_OK, concert);
            }
            else {
              var location = concert.location;
              winston.warn ("multiple geometries for location %s %d", location, data.results.length);
              try {
                var geometries = data.results.map (function (geometry) {
                  
                  var conv = {
                    formatted_address: geometry.formatted_address,
                    lat: geometry.geometry.location.lat,
                    lon: geometry.geometry.location.lng
                  };
                  
                  return conv;
                });

                var send = {
                  bandName: concert.bandName,
                  date: concert.date,
                  location: concert.location,
                  styles: concert.styles,
                  geometries: geometries
                };

                eventEmitter.emit(GEOCODE_MULTIPLE, send);
              } catch (e) {
                console.log (e);
                console.log(e.stack);
              }
            }
            
          }).fail (function (error) {
            winston.error("error getting geometry");
	          console.log (error.stack);
            eventEmitter.emit (GEOCODE_ERROR, error);
          });
        });
		  }
	  });
  },

  /**
   * TODO
   * @param  {[type]} concert TODO
   * @return {void}
   */
  searchGeometry: function (concert) {
    var geocoderPromisify = Q.nbind(geocoder.geocode, geocoder);
    var location = concert.location;

    return geocoderPromisify(location).then (function (data) {
      var deferred = Q.defer ();
      sleep.usleep (500000);

      try {
        
	      if (data.status === 'OK') {
          deferred.resolve (data);
	      }
	      else {
          winston.error (data);
          deferred.reject(Error (location));
	      }
      } catch(e) {
        console.log ('exception %s', e);
      }

      return deferred.promise;
    }).fail (function (err) {
      console.log (err);
    });
  }
};

module.exports = new GeoCoderService();
