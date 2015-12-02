var colors = ['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF'];
var map;
var drawingManager;
var coordinates = [];
var shape = null;
var south,north,east,west;
var southToNorth,westToEast,currentPosition;
var positionsGenerated;
var clusterize = null;
var positionsGenerated;
var cantOfPositions;
var generated = false;
var globalLat = -34.397;
var globalLng = 150.644;
var timer = null;
var polygon = null;
var polygonCoordinates = [];

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: globalLat, lng: globalLng},
		zoom: 14
	});

	drawingManager = new google.maps.drawing.DrawingManager({
		drawingControl: true,
		drawingControlOptions: {
		  position: google.maps.ControlPosition.TOP_CENTER,
		  drawingModes: [
		    //google.maps.drawing.OverlayType.CIRCLE,
		    google.maps.drawing.OverlayType.POLYGON,
		    google.maps.drawing.OverlayType.RECTANGLE
		  ]
		}
	});

	drawingManager.setMap(map);

	google.maps.event.addListener(drawingManager, 'circlecomplete', function(circle) {
		createShape(circle);
	});

	google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(event) {
		createShape(event);
	});


	google.maps.event.addListener(drawingManager, 'polygoncomplete', function(event) {
		createPolygon(event);
	});

	var input = document.getElementById('pac-input');
	var searchBox = new google.maps.places.SearchBox(input);
	//map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

	// Bias the SearchBox results towards current map's viewport.
	
	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});
	

	var markers = [];
	// [START region_getplaces]
	// Listen for the event fired when the user selects a prediction and retrieve
	// more details for that place.
	searchBox.addListener('places_changed', function() {
		var places = searchBox.getPlaces();

		if (places.length == 0) {
			return;
		}

		// For each place, get the icon, name and location.
		var bounds = new google.maps.LatLngBounds();
		places.forEach(function(place) {
			var icon = {
				url: place.icon,
				size: new google.maps.Size(71, 71),
				origin: new google.maps.Point(0, 0),
				anchor: new google.maps.Point(17, 34),
				scaledSize: new google.maps.Size(25, 25)
		};
		  
		if (place.geometry.viewport) {
			// Only geocodes have viewport.
			bounds.union(place.geometry.viewport);
		} else {
			bounds.extend(place.geometry.location);
		}
		});
		map.fitBounds(bounds);
		globalLat = bounds.O.O;
		globalLng = bounds.j.O;
	});
}

function setContentHeight()
{
	var btnCopyHeight = $('#divBtnCopy').height();
	var headerHeight = $('#divCoordinateHeader').height();
	var contentHeigth = $('#idMap').height() - btnCopyHeight - headerHeight - 10;
	$('#contentArea').css('height',contentHeigth+'px');
}

var oneClick = true;

function copyCoordinates()
{
	$('#resultCoordinates').show();
	if(oneClick)
	{
		oneClick = false;
		$('#btnCopy').click();
	}
	
	$('#resultCoordinates').hide();
}

function createPolygon(data)
{
	var coordinatesPolygon = [];
	var latPolygon = [];
	var lngPolygon = [];

	for(var i=0;i<data.getPath().j.length;i++)
	{
		var positionCoordinatePolygon = getLatLngFromString(data.getPath().j[i].lat(),data.getPath().j[i].lng());
		coordinatesPolygon.push(positionCoordinatePolygon);
		latPolygon.push(data.getPath().j[i].lat());
		lngPolygon.push(data.getPath().j[i].lng());
	}

	polygon = new google.maps.Polygon({paths: coordinatesPolygon});
	//For the polygon, get south, north, west, east
	south = Math.min.apply(null, latPolygon);
	north = Math.max.apply(null, latPolygon);
	east = Math.max.apply(null, lngPolygon);
	west = Math.min.apply(null, lngPolygon);

	shape = new google.maps.Rectangle({
		bounds: {
			north: north,
			south: south,
			east: east,
			west: west
		}
	});

	drawingManager.setMap(null);
}

Array.prototype.max = function() {
	return Math.max.apply(null, this);
};

Array.prototype.min = function() {
	return Math.min.apply(null, this);
};

function createShape(data)
{
	var coords = [];
	
	north = data.bounds.getNorthEast().lat();
	east = data.bounds.getNorthEast().lng();
	south = data.bounds.getSouthWest().lat();
	west = data.bounds.getSouthWest().lng();


	shape = new google.maps.Rectangle({
		bounds: {
			north: north,
			south: south,
			east: east,
			west: west
		}
	});

	drawingManager.setMap(null);
}

function getLatLngFromString(lat,lng) {
	return new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
}

function getInitialPosition()
{

	var latNew,lngNew;

	latNew = ($('#southToNorthS').is(':checked')) ? south : north;
	southToNorth = ($('#southToNorthS').is(':checked')) ? 's' : 'n';

	lngNew = ($('#westToEastW').is(':checked')) ? west : east;
	westToEast = ($('#westToEastW').is(':checked')) ? 'w' : 'e';

	currentPosition = getLatLngFromString(latNew,lngNew);
	
	return currentPosition;
}

function getDistanceSouthToNorth()
{
	var cantOfPointsSTN = 5;
	var totalDistance = Math.abs(north - south);
	var result = totalDistance / 5;
	if(result.toString().length > 7)
		result = parseFloat(result.toString().substring(0,7));

	return result;
}

function generateCoordinatesRectangle()
{
	coordinates = [];
	var distanceSTN = getDistanceSouthToNorth();
	var exit = false;
	var countNotFound = 0;
	var currentLat,currentLng,nextLat,nextLng;
	var currentPosition = getInitialPosition();
	do
	{
		if(shape.getBounds().contains(currentPosition))
		{
			coordinates.push(currentPosition);

			if(countNotFound > 0)
			{
				countNotFound = 0;
				southToNorth = (southToNorth == 's') ? 'n' : 's';
			}

			if(southToNorth == 's')
			{
				currentLat = currentPosition.lat();
				currentLng = currentPosition.lng();

				nextLat = currentLat + distanceSTN;
				nextLng = currentLng;
			}
			else
			{
				currentLat = currentPosition.lat();
				currentLng = currentPosition.lng();

				nextLat = currentLat - distanceSTN;
				nextLng = currentLng;	
			}
			currentPosition = getLatLngFromString(nextLat,nextLng);
		}
		else
		{
			countNotFound++;
			if(countNotFound < 2)
			{
				if(westToEast == 'e')
				{
					currentLat = currentPosition.lat();
					currentLng = currentPosition.lng();

					if(currentLat <= north && currentLat >= south)
					{
						nextLat = currentLat;							
					}
					else
					{
						if(southToNorth == 's')
						{
							nextLat = currentLat - distanceSTN;
						}
						else
						{
							nextLat = currentLat + distanceSTN;	
						}
					}

					nextLng = currentLng - 0.0001;
				}
				else
				{
					currentLat = currentPosition.lat();
					currentLng = currentPosition.lng();

					if(currentLat <= north && currentLat >= south)
					{
						nextLat = currentLat;							
					}
					else
					{
						if(southToNorth == 's')
						{
							nextLat = currentLat - distanceSTN;
						}
						else
						{
							nextLat = currentLat + distanceSTN;	
						}
					}

					nextLng = currentLng + 0.0001;
				}
				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else
			{
				exit = true;
			}
		}
	}while(!exit);

	generated = true;

	chooseDrawType();
	
}

function generateCoordinatesPolygon()
{
	coordinates = [];
	var distanceSTN = 0.00005;
	var exit = false;
	var countNotFound = 0;
	var currentLat,currentLng,nextLat,nextLng;
	var currentPosition = getInitialPosition();
	do
	{
		if(shape.getBounds().contains(currentPosition))
		{
			if(google.maps.geometry.poly.containsLocation(currentPosition, polygon))
			{
				coordinates.push(currentPosition);
			}

			if(countNotFound > 0)
			{
				countNotFound = 0;
				southToNorth = (southToNorth == 's') ? 'n' : 's';
			}

			if(southToNorth == 's')
			{
				currentLat = currentPosition.lat();
				currentLng = currentPosition.lng();

				nextLat = currentLat + distanceSTN;
				nextLng = currentLng;
			}
			else
			{
				currentLat = currentPosition.lat();
				currentLng = currentPosition.lng();

				nextLat = currentLat - distanceSTN;
				nextLng = currentLng;	
			}
			currentPosition = getLatLngFromString(nextLat,nextLng);
		}
		else
		{
			countNotFound++;
			if(countNotFound < 2)
			{
				if(westToEast == 'e')
				{
					currentLat = currentPosition.lat();
					currentLng = currentPosition.lng();

					if(currentLat <= north && currentLat >= south)
					{
						nextLat = currentLat;							
					}
					else
					{
						if(southToNorth == 's')
						{
							nextLat = currentLat - distanceSTN;
						}
						else
						{
							nextLat = currentLat + distanceSTN;	
						}
					}

					nextLng = currentLng - 0.0001;
				}
				else
				{
					currentLat = currentPosition.lat();
					currentLng = currentPosition.lng();

					if(currentLat <= north && currentLat >= south)
					{
						nextLat = currentLat;							
					}
					else
					{
						if(southToNorth == 's')
						{
							nextLat = currentLat - distanceSTN;
						}
						else
						{
							nextLat = currentLat + distanceSTN;	
						}
					}

					nextLng = currentLng + 0.0001;
				}
				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else
			{
				exit = true;
			}
		}
	}while(!exit);

	generated = true;

	chooseDrawType();
}

function generateCoordinates()
{
	if(shape != null && !generated)
	{
		if(polygon == null)
		{
			generateCoordinatesRectangle();
		}
		else
		{
			generateCoordinatesPolygon();
		}	
	}
	else if(shape == null)
	{
		showNoty('danger','You must draw a rectangle!');
	}
	else if(generated)
	{
		showNoty('danger','The positions are already generated!');
	}
	else
	{
		showNoty('danger','A wild bug appear! Please contact me!');
	}
	
}

function showNoty(type,text)
{
	var bgClass;
	switch(type)
	{
		case 'danger':
			bgClass = 'bg-danger';
			break;
		case 'warning':
			bgClass = 'bg-warning';
			break;
		case 'success':
			bgClass = 'bg-success';
			break;
		default:
			bgClass = 'bg-info';
			break;
	}

	var n = noty({
		text: text,
		type: type,
		theme: 'defaultTheme', // or 'relax'
		template: '<div class="noty_message '+bgClass+'"><span class="noty_text"></span><div class="noty_close"></div></div>',
		animation: {
			open: {height: 'toggle'}, // jQuery animate function property object
			close: {height: 'toggle'}, // jQuery animate function property object
			easing: 'swing', // easing
			speed: 1500 // opening & closing animation speed
		},
		timeout: 10,
	});
}

function getColor()
{
	var randomIndex = Math.floor((Math.random() * colors.length));
	var colorToReturn = colors[randomIndex];
	return colorToReturn;
}

function drawPath()
{

	var initialPosition = 0;
	var cantOfPoints = (polygon != null) ? 50 : 25;
	var noMorePositions = false;
	positionsGenerated = []
	cantOfPositions = -1;
	var lineColor = getColor();

	timer = $.timer(function(){
		
		var newCoordinates = [];

		for(var i = initialPosition; i <= (initialPosition + cantOfPoints);i++)
		{
			newCoordinates.push(coordinates[i]);
			if(i == (coordinates.length -1))
			{
				noMorePositions = true;
				break;
			}
		}

		if((initialPosition + cantOfPoints) < coordinates.length)
		{
			initialPosition += cantOfPoints;
		}
		else
		{
			initialPosition = initialPosition + (coordinates.length - initialPosition);
		}
		
		cantOfPositions++;

		positionsGenerated.push(new google.maps.Polyline({
			path: newCoordinates,
			geodesic: true,
			strokeColor: lineColor,
			strokeOpacity: 1.0,
			strokeWeight: 2
		}));

		positionsGenerated[cantOfPositions].setMap(map);

		if(noMorePositions)
		{
			timer.stop();
		}

	},250,true);
}

function showCoordinatesWrap()
{
	var valText = '';
	for(var i=0;i<coordinates.length;i++)
	{
		valText += coordinates[i].lat() +','+coordinates[i].lng() + ';';
	}
	$('#resultCoordinates').val(valText);
}

function showCoordinates()
{
	var data = [];
	var valText = '';
	//console.log(coordinates.length);

	for(var i=0;i<coordinates.length;i++)
	{
		valText += coordinates[i].lat() +','+coordinates[i].lng() + '<br>';

		var currentData = '<li>'+coordinates[i].lat() +','+coordinates[i].lng() + '</li>';
		data.push(currentData);
	}

	$('#resultCoordinates').html(valText);
	$('#btnCopy').click();
	$('#resultCoordinates').hide();
	
	clusterize = new Clusterize({
		rows: data,
		scrollId: 'scrollArea',
		contentId: 'contentArea'
	});
	//console.log(clusterize.getRowsAmount());
	
}

function chooseDrawType()
{
	drawPath();
	showCoordinates();
	/*
	This is done to show the coordinates in one line.
	But it is not proper with clusterize.
	If you use textbox, it works well
	if($('#wrapCheck').is(':checked'))
	{
		showCoordinatesWrap();
	}
	else
	{
		showCoordinates();
	}
	*/
}

function locateMe()
{

	var infoWindow = new google.maps.InfoWindow({map: map});

	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			var pos = {
			lat: position.coords.latitude,
			lng: position.coords.longitude
			};

	//infoWindow.setPosition(pos);
	//infoWindow.setContent('Location found.');
			map.setCenter(pos);
		}, function() {
			handleLocationError(true, infoWindow, map.getCenter());
		});
	}
	else
	{
	// Browser doesn't support Geolocation
	handleLocationError(false, infoWindow, map.getCenter());
	}
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) 
{
	infoWindow.setPosition(pos);
	infoWindow.setContent(browserHasGeolocation ? 'Error: The Geolocation service failed.' : 'Error: Your browser doesn\'t support geolocation.');
}

function resetCoordinates()
{
	if(timer != null)
	{
		timer.stop();
		timer = null;	
	}
	
	for(var i = 0; i <= cantOfPositions;i++)
	{
		positionsGenerated[i].setMap(null);
	}

	$('#resultCoordinates').html('');

	if(shape != null)
	{
		shape.setMap(null);
		shape = null;	
	}

	polygon = null;

	if(clusterize != null)
	{
		clusterize.clear();
		clusterize.destroy();
		//clusterize = null;
	}
	
	generated = false;

	drawingManager.setOptions({
		drawingControl: true
	});

	initMap();
	
}