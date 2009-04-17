if (typeof(SJL) == 'undefined' || ( ! SJL instanceof Object)) SJL = new Object();

if (typeof(SJL.SLGoogleMap) == 'undefined' || ( ! SJL.SLGoogleMap instanceof Object)) {
	
	SJL.SLGoogleMap = function() {		
		
		/**
		 * The Map "class" constructor.
		 * @param 	object 		init 			Initialisation object containing information essential to the construction of the map.
		 * @param 	object 		options		Map UI options.
		 */
		function Map(init, options) {
						
			// Check that we have the required information.			
			if ( ! init instanceof Object ||
				typeof(init.map_container) == 'undefined' ||
				typeof(init.map_lat) == 'undefined' ||
				typeof(init.map_lng) == 'undefined' ||
				typeof(init.map_zoom) == 'undefined' ||
				typeof(init.pin_lat) == 'undefined' ||
				typeof(init.pin_lng) == 'undefined') {
					return false;
				}
				
			// Set the default map options.
			var map_options = {
				'ui_zoom'					: false,
				'ui_scale' 				: false,
				'ui_overview'			: false,
				'map_drag'				: false,
				'map_click_zoom'	: false,
				'map_scroll_zoom'	: false,
				'pin_drag'				: false,
				'background'			: '#FFFFFF'
			}
			
			// Override the default options.			
			for (o in options) {
				if (map_options[o] != 'undefined') {
					map_options[o] = options[o];
				}
			}
			
			// Create the map.
			this.__map = new GMap2(document.getElementById(init.map_container), {backgroundColor: map_options['background']});
			this.__map.setCenter(new GLatLng(init.map_lat, init.map_lng), init.map_zoom);		// MUST explicitly call setCenter.
			
			// Customise the map UI.			
			ui = this.__map.getDefaultUI();

			// Can't be doing with implementing the code to remember this right now.
			ui.controls.maptypecontrol = false;
			ui.controls.menumaptypecontrol = false;
			
			// Everything else is controlled by our map_options object.
			// - Zoom / pan controls.
			if (this.__map.getSize().height <= 325) {
				ui.controls.smallzoomcontrol3d = map_options.ui_zoom;
				ui.controls.largemapcontrol3d = false;
			} else {
				ui.controls.smallzoomcontrol3d = false;
				ui.controls.largemapcontrol3d = map_options.ui_zoom;
			}
			
			// - Map dragging.
			map_options.map_drag ? this.__map.enableDragging() : this.__map.disableDragging();
			
			// - Map zooming.
			ui.zoom.doubleclick = map_options.map_click_zoom;
			ui.zoom.scrollwheel = map_options.map_scroll_zoom;
			
			// - Scale control.
			ui.controls.scalecontrol = map_options.ui_scale;
			
			// Set the UI options.
			this.__map.setUI(ui);
			
			// - Overview control (need to do this separately, for reasons best known to Google).
			if (map_options.ui_overview) {
				this.__map.addControl(new GOverviewMapControl());
			}
			
			// A shortcut variable that we can reference in our function literals below.
			var t = this;
			
			// Add the map "pin".
			this.__marker = new GMarker(new GLatLng(init.pin_lat, init.pin_lng), {clickable: map_options.pin_drag, draggable: map_options.pin_drag, autoPan: true});
			this.__map.addOverlay(this.__marker);
			
			// Add an event listener to the map "pin".
			if (map_options.pin_drag) {
				this.__marker_listener = GEvent.addListener(this.__marker, 'dragend', function(latlng) {
					t.set_location(latlng);
				});
			}			
			
			// If we have a "map_field", we need to update it every time our map changes.
			if (typeof(init.map_field) != 'undefined') {
				this.__map_field = jQuery('#' + init.map_field);
			
				// Add the event listener.
				if (this.__map_field.length) {				
					this.__map_listener = GEvent.addListener(this.__map, 'moveend', function() {
						var map_data = t.get_location();
						var pin_data = t.get_marker();						
						var field_data = map_data.latlng.lat() + ',' + map_data.latlng.lng() + ',' + map_data.zoom + ',' + pin_data.lat() + ',' + pin_data.lng();
						t.__map_field.val(field_data);
					});
				}
			}
			
			// If we have an "address_input" field, and an "address_submit" field, we need to
			// link these to our map.
			if (typeof(init.address_input) != 'undefined' && typeof(init.address_submit) != 'undefined') {
				this.__address_input 	= jQuery('#' + init.address_input);
				this.__address_submit	= jQuery('#' + init.address_submit);
			
				if (this.__address_input.length && this.__address_submit.length) {
					this.__in_lookup = false;
				
					// Set a flag every time we enter or leave the address_input field.
					this.__address_input.unbind('focus').bind('focus', function(e) {
						t.__in_lookup = true;
					}).unbind('blur').bind('blur', function() {
						t.__in_lookup = false;
					});
				
					// Find the specified address.
					this.__address_submit.unbind('click').bind('click', function(e) {
						var address = jQuery.trim(t.__address_input.val());
						if (address !== '') t.pinpoint_address(address, function() {
							// Update the map and pin data.
							var map_data = t.get_location();
							var pin_data = t.get_marker();						
							var field_data = map_data.latlng.lat() + ',' + map_data.latlng.lng() + ',' + map_data.zoom + ',' + pin_data.lat() + ',' + pin_data.lng();
							t.__map_field.val(field_data);
						});
						return false;
					}).parents('form').submit(function(e) {
						if (t.__in_lookup) {
							t.__address_submit.click();
							return false;
						}
					});
				}
			}
			
			return this;
		}
		
		
		/**
		 * Sets the map location and zoom level.
		 * @param 	int 	latlng 	A GLatLng object containing the marker's latitude and longitude.
		 * @param		int		zoom		The map zoom level.
		 * @return 	object 	An object containing the map's latitude, longitude, and zoom.
		 */
		Map.prototype.set_location = function(latlng, zoom) {			
			// Check the parameters.
			if (jQuery.isFunction(latlng.lat) == false) {				
				if ((typeof(latlng.lat) == 'undefined') || (typeof(latlng.lng) == 'undefined')) {
					return false;
				} else {
					latlng = new GLatLng(latlng.lat, latlng.lng);
				}			
			}

			if (this.__map) {
				this.__map.setZoom(zoom);
				this.__map.panTo(latlng);
			}
			return this.get_location();
		}
		
		
		/**
		 * Gets the map location and zoom level.
		 * @return 	object 	An anonymous object with two properties: latlng (GLatLng object); zoom (integer).
		 */
		Map.prototype.get_location = function() {
			if (this.__map) {
				loc = this.__map.getCenter();				
				return {
					latlng: loc,
					zoom: this.__map.getZoom()
				};
			} else {
				return false;
			}
		}
		
		
		/**
		 * Sets the location of the map marker.
		 * @param 	object		latlng				A GLatLng object, or an anonymous object with the properties lat and lng.
		 * @return 	object 		A GLatLng object containing the marker's latitude and longitude.
		 */
		Map.prototype.set_marker = function(latlng) {
			// Check the parameters.
			if (jQuery.isFunction(latlng.lat) == false) {				
				if ((typeof(latlng.lat) == 'undefined') || (typeof(latlng.lng) == 'undefined')) {
					return false;
				} else {
					latlng = new GLatLng(latlng.lat, latlng.lng);
				}				
			}

			this.__marker.setLatLng(latlng);
			return this.get_marker();
		}


		/**
		 * Returns the latitude and longitude of the map marker. If no marker exists,
		 * return FALSE.
		 * @return 		object 		A GLatLng object containing the marker's latitude and longitude.
		 */		
		Map.prototype.get_marker = function() {
			if (this.__marker) {
				loc = this.__marker.getLatLng();
				return loc;
			} else {
				return false;
			}
		}
		
		
		/**
		 * Attempts to locate the given address on the map.
		 * @param 	string		address			The address to locate (can be a postcode).
		 * @param		function	callback		The function to call when we're all done here (optional).
		 */		
		Map.prototype.pinpoint_address = function(address, callback) {
			var regexp, geo, map, local;

			if (jQuery.trim(address) == '') return;

			// Google Maps is rather bad at locating UK postcodes, so we need
			// to be sneaky. If we get given a postcode, we use the Google AJAX
			// search API to get its latitude and longitude.
			regexp = new RegExp("(GIR 0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]|[A-HK-Y][0-9]([0-9]|[ABEHMNPRV-Y]))|[0-9][A-HJKS-UW])[ ]*[0-9][ABD-HJLNP-UW-Z]{2})", "i");

			// Convenience variable.
			t = this;

			if (address.match(regexp)) {
				local = new GlocalSearch();

				// Search callback handler.
				local.setSearchCompleteCallback(null, function() {	
					if (local.results[0]) {
						t.set_location({lat: local.results[0].lat, lng: local.results[0].lng});
						t.set_marker({lat: local.results[0].lat, lng: local.results[0].lng});
						
						if (callback instanceof Function) {
							callback();
						}
					}
				});

				// Execute the postcode search.
				local.execute(address + ", UK");
			} else {
				// Create a new GClientGeocoder object to help us find the address.
				geo = new GClientGeocoder();
				geo.getLatLng(address, function(latlng) {
					if (latlng !== null) {
						t.set_location(latlng);
						t.set_marker(latlng);
						
						if (callback instanceof Function) {
							callback();
						}
					}
				});
			} // if - else
			
		}
		
		
		// Return our publically-accessible object.
		return ({Map : Map});	
		
	}();
}


// Create the Google Maps.
jQuery(document).ready(function() {
	if (GBrowserIsCompatible() && typeof(SJL.google_maps) !== 'undefined' && SJL.google_maps instanceof Array) {
		for (var i in SJL.google_maps) {
			map = new SJL.SLGoogleMap.Map(SJL.google_maps[i].init, SJL.google_maps[i].options);
		}
	}
	
});

// Unload the Google Maps stuff.
jQuery(document).unload(GUnload());