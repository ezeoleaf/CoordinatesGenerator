var colors = ['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF'];
var map;
var drawingManager;
var coordinates = [];
var timeCoordinates = [];
var shape = null;
var south,north,east,west;
var southToNorth,westToEast,currentPosition;
var positionsGenerated;
var clusterize = null;
var positionsGenerated;
var cantOfPositions;
var generated = false;
var globalLat = -32.4127198;
var globalLng = -63.232826;
var timer = null;
var polygon = null;
var polygonCoordinates = [];
var westToEastDistance = 0;
var southToNorthDistance = 0;
var clipboard,distanceSTN,exit,lastLine,countNotFound,currentLat,currentLng,nextLat,nextLng,currentPosition;
var zoom = 14;
var actualDate;
var circle = null;

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: globalLat, lng: globalLng},
		zoom: zoom
	});

	drawingManager = new google.maps.drawing.DrawingManager({
		drawingControl: true,
		drawingControlOptions: {
		  position: google.maps.ControlPosition.TOP_CENTER,
		  drawingModes: [
		    google.maps.drawing.OverlayType.CIRCLE,
		    google.maps.drawing.OverlayType.POLYGON,
		    google.maps.drawing.OverlayType.RECTANGLE
		  ]
		}
	});

	drawingManager.setMap(map);

	google.maps.event.addListener(drawingManager, 'circlecomplete', function(circle) {
		createCircle(circle);
	});

	google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(event) {
		createShape(event);
	});


	google.maps.event.addListener(drawingManager, 'polygoncomplete', function(event) {
		createPolygon(event);
	});

	var input = document.getElementById('pac-input');
	var searchBox = new google.maps.places.SearchBox(input);
	
	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});
	

	var markers = [];
	
	searchBox.addListener('places_changed', function() {
		var places = searchBox.getPlaces();

		if (places.length == 0) {
			return;
		}

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
			bounds.union(place.geometry.viewport);
		} else {
			bounds.extend(place.geometry.location);
		}
		});
		map.fitBounds(bounds);
		var center = getCenter(bounds);
		globalLat = center.lat();
		globalLng = center.lng();
	});
}

function getCenter(b)
{
	var bounds = {
		southwest: {lat: b.O.O, lng: b.j.O},
		northeast: {lat: b.O.j, lng: b.j.j}
	};

	var lat = (bounds.southwest.lat + bounds.northeast.lat)/2;
	var lng = (bounds.southwest.lng + bounds.northeast.lng)/2;

	var centerToReturn = getLatLngFromString(lat.toString(),lng.toString());
	return centerToReturn;
}

function setContentHeight()
{
	var btnCopyHeight = $('#divBtnCopy').height();
	var headerHeight = $('#divCoordinateHeader').height();
	var contentHeigth = $('#map').height() - headerHeight;
	$('#contentArea').css('height',contentHeigth+'px');
	$('#divBtnCopy').hide();
}

function createCircle(data)
{
	var d = data;
	south = data.getBounds().O.O;
	north = data.getBounds().O.j;
	east = data.getBounds().j.O;
	west = data.getBounds().j.j;

	circle = new google.maps.Circle({center: data.getCenter(),radius: data.getRadius()});

	shape = new google.maps.Rectangle({
		bounds: {
			north: north,
			south: south,
			east: east,
			west: west
		}
	});


	getDistancePolygon();

	drawingManager.setMap(null);
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

	getDistancePolygon();

	drawingManager.setMap(null);
}

Array.prototype.max = function() {
	return Math.max.apply(null, this);
};

Array.prototype.min = function() {
	return Math.min.apply(null, this);
};

function getDistancePolygon()
{
	var origin = getLatLngFromString(south, east);
	var destination = getLatLngFromString(south, west);

	var service = new google.maps.DistanceMatrixService();
	service.getDistanceMatrix(
	{
		origins: [origin],
		destinations: [destination],
		travelMode: google.maps.TravelMode.WALKING,
	}, callbackWestToEast);

	origin = getLatLngFromString(south, east);
	destination = getLatLngFromString(north, east);

	service.getDistanceMatrix(
	{
		origins: [origin],
		destinations: [destination],
		travelMode: google.maps.TravelMode.WALKING,
	}, callbackSouthToNorth);
}

function callbackWestToEast(response, status) {
	westToEastDistance = (status == 'OK') ? (response.rows[0].elements[0].distance.value) : 10000;
}

function callbackSouthToNorth(response, status) {
	southToNorthDistance = (status == 'OK') ? (response.rows[0].elements[0].distance.value) : 10000;
}

function isPolygonValid()
{
	var totalDistance = westToEastDistance + southToNorthDistance;
	var toReturn = (totalDistance > 4000) ? false : true;
	return toReturn;
}

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
	var sCheck = $('#southToNorthS').is(':checked');
	var wCheck = $('#westToEastW').is(':checked');

	latNew = (sCheck) ? south : north;
	southToNorth = (sCheck) ? 's' : 'n';

	lngNew = (wCheck) ? west : east;
	westToEast = (wCheck) ? 'w' : 'e';

	currentPosition = getLatLngFromString(latNew,lngNew);
	
	return currentPosition;
}

function getDistanceBetweenPoints(start, end)
{
	var cantOfPointsSTN = 5;
	var totalDistance = Math.abs(start - end);
	var result = totalDistance / 5;
	if(result.toString().length > 7)
		result = parseFloat(result.toString().substring(0,7));

	return result;
}

function generateCoordinatesRectangleV()
{
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

			currentLat = currentPosition.lat();
			currentLng = currentPosition.lng();

			nextLat = (southToNorth == 's') ? (currentLat + distanceSTN) : (currentLat - distanceSTN);
			nextLng = currentLng;
			
			currentPosition = getLatLngFromString(nextLat,nextLng);
		}
		else
		{
			countNotFound++;
			if(countNotFound < 2)
			{
				currentLat = currentPosition.lat();
				currentLng = currentPosition.lng();
				
				nextLng = (westToEast == 'e') ? (currentLng - 0.0001) : (currentLng + 0.0001);

				if(currentLat <= north && currentLat >= south)
				{
					nextLat = currentLat;							
				}
				else
				{
					nextLat = (southToNorth == 's') ? (currentLat - distanceSTN) : (currentLat + distanceSTN);
				}

				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else if(countNotFound == 2 && !lastLine)
			{
				lastLine = true;

				nextLat = (southToNorth == 's') ? (currentLat - distanceSTN) : (currentLat + distanceSTN);
				nextLng = (westToEast == 'w') ? east : west;

				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else
			{
				exit = true;
			}
		}
	}while(!exit);
}

function generateCoordinatesRectangleH()
{
	do
	{
		if(shape.getBounds().contains(currentPosition))
		{
			coordinates.push(currentPosition);

			if(countNotFound > 0)
			{
				countNotFound = 0;
				westToEast = (westToEast == 'w') ? 'e' : 'w';
			}

			currentLat = currentPosition.lat();
			currentLng = currentPosition.lng();

			nextLat = currentLat;
			nextLng = (westToEast == 'w') ? (currentLng + distanceSTN) : (currentLng - distanceSTN)
			
			currentPosition = getLatLngFromString(nextLat,nextLng);
		}
		else
		{
			countNotFound++;
			if(countNotFound < 2)
			{
				currentLat = currentPosition.lat();
				currentLng = currentPosition.lng();
				nextLat = (southToNorth == 's') ? (currentLat + 0.0001) : (currentLat - 0.0001);
				
				if(currentLng <= west && currentLng >= east)
				{
					nextLng = currentLng;
				}
				else
				{
					nextLng = (westToEast == 'w') ? (currentLng - distanceSTN) : (currentLng + distanceSTN);
				}

				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else if(countNotFound == 2 && !lastLine)
			{
				lastLine = true;
				nextLng = (westToEast == 'w') ? (currentLng - distanceSTN) : (currentLng + distanceSTN);
				nextLat = (southToNorth == 's') ? north : south;

				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else
			{
				exit = true;
			}
		}
	}while(!exit);
}

function generateCoordinatesPolygonV()
{
	do
	{
		currentLat = currentPosition.lat();
		currentLng = currentPosition.lng();

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

			nextLat = (southToNorth == 's') ? (currentLat + distanceSTN) : (currentLat - distanceSTN);
			nextLng = currentLng;
			
			currentPosition = getLatLngFromString(nextLat,nextLng);
		}
		else
		{
			countNotFound++;
			if(countNotFound < 2)
			{
				nextLng = (westToEast == 'e') ? (currentLng - 0.0001) : (currentLng + 0.0001);

				if(currentLat <= north && currentLat >= south)
				{
					nextLat = currentLat;							
				}
				else
				{
					nextLat = (southToNorth == 's') ? (currentLat - distanceSTN) : (currentLat + distanceSTN);
				}
				
				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else
			{
				exit = true;
			}
		}
	}while(!exit);
}

function generateCoordinatesPolygonH()
{
	do
	{
		currentLat = currentPosition.lat();
		currentLng = currentPosition.lng();

		if(shape.getBounds().contains(currentPosition))
		{
			if(google.maps.geometry.poly.containsLocation(currentPosition, polygon))
			{
				coordinates.push(currentPosition);
			}

			if(countNotFound > 0)
			{
				countNotFound = 0;
				westToEast = (westToEast == 'w') ? 'e' : 'w';
			}

			nextLng = (westToEast == 'w') ? (currentLng + distanceSTN) : (currentLng - distanceSTN);
			nextLat = currentLat;
			
			currentPosition = getLatLngFromString(nextLat,nextLng);
		}
		else
		{
			countNotFound++;
			if(countNotFound < 2)
			{

				nextLat = (southToNorth == 's') ? (currentLat + 0.0001) : (currentLat - 0.0001);

				if(currentLng <= west && currentLng >= east)
				{
					nextLng = currentLng;
				}
				else
				{
					nextLng = (westToEast == 'w') ? (currentLng - distanceSTN) : (currentLng + distanceSTN);
				}
				
				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else
			{
				exit = true;
			}
		}
	}while(!exit);
}

function generateCoordinatesCircleV()
{
	do
	{
		currentLat = currentPosition.lat();
		currentLng = currentPosition.lng();

		if(shape.getBounds().contains(currentPosition))
		{
			var distanceToCenter = google.maps.geometry.spherical.computeDistanceBetween(circle.getCenter(),currentPosition);
			if(circle.getBounds().contains(currentPosition) && (distanceToCenter < circle.radius))
			{
				coordinates.push(currentPosition);
			}

			if(countNotFound > 0)
			{
				countNotFound = 0;
				southToNorth = (southToNorth == 's') ? 'n' : 's';
			}

			nextLat = (southToNorth == 's') ? (currentLat + distanceSTN) : (currentLat - distanceSTN);
			nextLng = currentLng;
			
			currentPosition = getLatLngFromString(nextLat,nextLng);
		}
		else
		{
			countNotFound++;
			if(countNotFound < 2)
			{
				nextLng = (westToEast == 'e') ? (currentLng - 0.0001) : (currentLng + 0.0001);

				if(currentLat <= north && currentLat >= south)
				{
					nextLat = currentLat;							
				}
				else
				{
					nextLat = (southToNorth == 's') ? (currentLat - distanceSTN) : (currentLat + distanceSTN);
				}
				
				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else
			{
				exit = true;
			}
		}
	}while(!exit);
}

function generateCoordinatesCircleH()
{
	do
	{
		currentLat = currentPosition.lat();
		currentLng = currentPosition.lng();

		if(shape.getBounds().contains(currentPosition))
		{
			var distanceToCenter = google.maps.geometry.spherical.computeDistanceBetween(circle.getCenter(),currentPosition);
			if(circle.getBounds().contains(currentPosition) && (distanceToCenter < circle.radius))
			{
				coordinates.push(currentPosition);
			}

			if(countNotFound > 0)
			{
				countNotFound = 0;
				westToEast = (westToEast == 'w') ? 'e' : 'w';
			}

			nextLng = (westToEast == 'w') ? (currentLng + distanceSTN) : (currentLng - distanceSTN);
			nextLat = currentLat;
			
			currentPosition = getLatLngFromString(nextLat,nextLng);
		}
		else
		{
			countNotFound++;
			if(countNotFound < 2)
			{

				nextLat = (southToNorth == 's') ? (currentLat + 0.0001) : (currentLat - 0.0001);

				if(currentLng <= west && currentLng >= east)
				{
					nextLng = currentLng;
				}
				else
				{
					nextLng = (westToEast == 'w') ? (currentLng - distanceSTN) : (currentLng + distanceSTN);
				}
				
				currentPosition = getLatLngFromString(nextLat,nextLng);
			}
			else
			{
				exit = true;
			}
		}
	}while(!exit);
}

/*
google.maps.Circle.prototype.contains = function(latLng) {
  return this.getBounds().contains(latLng) && google.maps.geometry.spherical.computeDistanceBetween(this.getCenter(), latLng) <= this.getRadius();
}
*/

function generateCoordinates()
{
	var horizontalDraw = $('#directionH').is(':checked');
	if(shape != null && !generated)
	{
		exit = false;
		lastLine = false;
		countNotFound = 0;
		currentLat,currentLng,nextLat,nextLng;
		currentPosition = getInitialPosition();
		coordinates = [];
		if(polygon == null && circle == null)
		{
			if(horizontalDraw)
			{
				distanceSTN = getDistanceBetweenPoints(east,west);
				generateCoordinatesRectangleH();
			}
			else
			{
				distanceSTN = getDistanceBetweenPoints(north,south);
				generateCoordinatesRectangleV();
			}

			generated = true;
			generateTime();
			chooseDrawType();
		}
		else if(circle == null)
		{
			if(isPolygonValid())
			{
				distanceSTN = 0.00005;
				if(horizontalDraw)
					generateCoordinatesPolygonH();
				else
					generateCoordinatesPolygonV();

				generated = true;
				generateTime();
				chooseDrawType();
			}
			else
			{
				showNoty('danger','For performance purpoise, please draw a smaller polygon or a rectangle');
			}
		}
		else
		{
			if(isPolygonValid())
			{
				distanceSTN = 0.00005;
				if(horizontalDraw)
					generateCoordinatesCircleH();
				else
					generateCoordinatesCircleV();

				generated = true;
				generateTime();
				chooseDrawType();
			}
			else
			{
				showNoty('danger','For performance purpoise, please draw a smaller polygon or a rectangle');
			}
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

function getSecondsPerPoint()
{
	var timeFrom = $('#timeFrom').val();
	var timeTo = $('#timeTo').val();

	var vDate = actualDate.split('-');
	var vTimeFrom = timeFrom.split(':');
	var vTimeTo = timeTo.split(':');

	var millisecondsFrom = Date.UTC(vDate[0],vDate[1],vDate[2],vTimeFrom[0],vTimeFrom[1]);
	var millisecondsTo = Date.UTC(vDate[0],vDate[1],vDate[2],vTimeTo[0],vTimeTo[1]);

	var seconds = (millisecondsTo - millisecondsFrom) / 1000;
	var secondsPerPoint = parseInt(seconds / coordinates.length);
	return secondsPerPoint;
}

function setZero(val)
{
	if(val < 10)
		val = '0'+val;

	return val;
}

function generateTime()
{
	timeCoordinates = [];
	secondsPerPoint = getSecondsPerPoint();
	var dateToCreate = actualDate + ' ' + $('#timeFrom').val() + ':00';
	var dateToAdd = new Date(dateToCreate)

	for(var i = 0; i < coordinates.length;i++)
	{
		if(i != 0)
		{
			dateToAdd.setSeconds(dateToAdd.getSeconds() + secondsPerPoint);
		}

		var dateParsed = (dateToAdd.getFullYear()+'-'+setZero(dateToAdd.getMonth() + 1)+'-'+setZero(dateToAdd.getDate())+' '+setZero(dateToAdd.getHours())+':'+setZero(dateToAdd.getMinutes())+':'+setZero(dateToAdd.getSeconds()));

		timeCoordinates.push(dateParsed);
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
		template: '<div class="noty_message '+bgClass+'"><span class="glyphicon glyphicon-warning-sign" style="color: white" aria-hidden="true"></span><b><span class="noty_text"></span><div class="noty_close"></b></div></div>',
		animation: {
			open: 'animated pulse', // Animate.css class names
			close: 'animated bounceOutLeft', // Animate.css class names
			easing: 'swing', // easing
			speed: 500 // opening & closing animation speed
		},
		timeout: 3000,
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
			timer.stop();

	},250,false);
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
	var showDates = $('#showDates').is(':checked');
	for(var i=0;i<coordinates.length;i++)
	{
		var currentData = '<li>';
		if(showDates)
		{
			valText += timeCoordinates[i]+',';
			currentData += timeCoordinates[i]+',';
		}

		valText += coordinates[i].lat() +','+coordinates[i].lng() + '<br>';

		currentData += coordinates[i].lat() +','+coordinates[i].lng() + '</li>';
		data.push(currentData);
	}

	clusterize = new Clusterize({
		rows: data,
		scrollId: 'scrollArea',
		contentId: 'contentArea'
	});

	$('#resultCoordinates').html(valText);
	$('#resultCoordinates').show();
	$('#btnCopy').click();
	$('#resultCoordinates').hide();

	timer.play();

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

function cleanCoordinates()
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

	if(clusterize != null)
	{
		clusterize.clear();
		clusterize.destroy();
	}
	
	clipboard.destroy();
	clipboard = new Clipboard('#btnCopy');

	generated = false;
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
	circle = null;

	if(clusterize != null)
	{
		clusterize.clear();
		clusterize.destroy();
	}
	
	generated = false;

	drawingManager.setOptions({
		drawingControl: true
	});

	clipboard.destroy();
	clipboard = new Clipboard('#btnCopy');

	zoom = map.zoom;

	initMap();
	
}

function exportToCsv() {
	var myCsv = $('#resultCoordinates').html();
	myCsv = replaceAll('<br>','\n',myCsv);
	
	var blob = new Blob([myCsv], {type: 'text/csv'});
	if(window.navigator.msSaveOrOpenBlob) {
		window.navigator.msSaveBlob(blob, 'datos.csv');
	}
	else{
		var elem = window.document.createElement('a');
		elem.href = window.URL.createObjectURL(blob);
		elem.download = 'datos.csv';
		document.body.appendChild(elem);
		elem.click();
		document.body.removeChild(elem);
	}
}

function replaceAll(find, replace,str) { var re = new RegExp(find, 'g'); str = str.replace(re, replace); return str; }

function setActualDate()
{
	var now = new Date();
	year = now.getFullYear();
	month = now.getMonth() + 1;
	day = now.getDate();
	if(month.toString().length == 1) month = '0'+month;
	if(day.toString().length == 1) day = '0'+day;
	actualDate = year+'-'+month+'-'+day;
	$('#dateDay').val(actualDate);
}

function setChangedDate()
{
	actualDate = $('#dateDay').val();
}