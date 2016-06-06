class CoordinateGenerator
{
	constructor(contents = [])
	{
		this.initialize();
		this.initMap();
	}
	
	initialize()
	{
		this.colors = ['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF'];
		this.polygonCoordinates = this.timeCoordinates = this.coordinates = [];
		this.circle = this.polygon = this.timer = this.clusterize = this.shape = null;
		this.generated = false;
		this.globalLat = -32.4127198;
		this.globalLng = -63.232826;
		this.zoom = 14;
		this.westToEastDistance = 0;
		this.southToNorthDistance = 0;
	}
	
	initMap()
	{
		this.map = new google.maps.Map(document.getElementById('map'), {
			center: {lat: this.globalLat, lng: this.globalLng},
			zoom: this.zoom
		});

		this.drawingManager = new google.maps.drawing.DrawingManager({
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

		this.drawingManager.setMap(this.map);

		google.maps.event.addListener(this.drawingManager, 'circlecomplete', function(figure) {
			createCircle(figure);
		});

		google.maps.event.addListener(this.drawingManager, 'rectanglecomplete', function(figure) {
			createShape(figure);
		});


		google.maps.event.addListener(this.drawingManager, 'polygoncomplete', function(figure) {
			createPolygon(figure);
		});

		let input = document.getElementById('pac-input');
		let searchBox = new google.maps.places.SearchBox(input);
		
		this.map.addListener('bounds_changed', function() {
			searchBox.setBounds(this.map.getBounds());
		});
		

		let markers = [];
		
		searchBox.addListener('places_changed', function() {
			let places = searchBox.getPlaces();

			if (places.length == 0) {
				return;
			}

			let bounds = new google.maps.LatLngBounds();
			places.forEach(function(place)
			{
				if (place.geometry.viewport)
				{
					bounds.union(place.geometry.viewport);
				}
				else
				{
					bounds.extend(place.geometry.location);
				}
			});
			this.map.fitBounds(bounds);
			let center = this.getCenter(bounds);
			this.globalLat = center.lat();
			this.globalLng = center.lng();
		});	
	}
	
	getCenter(b)
	{
		let bounds = {
			southwest: {lat: b.O.O, lng: b.j.O},
			northeast: {lat: b.O.j, lng: b.j.j}
		};

		let lat = (bounds.southwest.lat + bounds.northeast.lat)/2;
		let lng = (bounds.southwest.lng + bounds.northeast.lng)/2;

		return this.getLatLngFromString(lat.toString(),lng.toString());
	}
	
	setContentHeight()
	{
		let btnCopyHeight = $('#divBtnCopy').height();
		let headerHeight = $('#divCoordinateHeader').height();
		let contentHeigth = $('#map').height() - headerHeight;
		$('#contentArea').css('height',contentHeigth+'px');
		$('#divBtnCopy').hide()
	}
	
	createCircle(data)
	{
		this.south = data.getBounds().O.O;
		this.north = data.getBounds().O.j;
		this.east = data.getBounds().j.O;
		this.west = data.getBounds().j.j;

		this.circle = new google.maps.Circle({center: data.getCenter(),radius: data.getRadius()});

		this.shape = new google.maps.Rectangle({
			bounds: {
				north: this.north,
				south: this.south,
				east: this.east,
				west: this.west
			}
		});
		
		this.getDistancePolygon();
		this.drawingManager.setMap(null);
	}
	
	createPolygon(data)
	{
		let coordinatesPolygon = [];
		let latPolygon = [];
		let lngPolygon = [];

		for(let i = 0;i < data.getPath().j.length; i++)
		{
			let positionCoordinatePolygon = this.getLatLngFromString(data.getPath().j[i].lat(),data.getPath().j[i].lng());
			coordinatesPolygon.push(positionCoordinatePolygon);
			latPolygon.push(data.getPath().j[i].lat());
			lngPolygon.push(data.getPath().j[i].lng());
		}

		this.polygon = new google.maps.Polygon({paths: coordinatesPolygon});
		
		this.south = Math.min.apply(null, latPolygon);
		this.north = Math.max.apply(null, latPolygon);
		this.east = Math.max.apply(null, lngPolygon);
		this.west = Math.min.apply(null, lngPolygon);

		this.shape = new google.maps.Rectangle({
			bounds: {
				north: this.north,
				south: this.south,
				east: this.east,
				west: this.west
			}
		});

		this.getDistancePolygon();

		this.drawingManager.setMap(null);
	}
	
	getDistancePolygon()
	{
		let origin = this.getLatLngFromString(south, east);
		let destination = this.getLatLngFromString(south, west);

		let service = new google.maps.DistanceMatrixService();
		service.getDistanceMatrix(
		{
			origins: [origin],
			destinations: [destination],
			travelMode: google.maps.TravelMode.WALKING,
		}, this.callbackWestToEast);

		origin = this.getLatLngFromString(south, east);
		destination = this.getLatLngFromString(north, east);

		service.getDistanceMatrix(
		{
			origins: [origin],
			destinations: [destination],
			travelMode: google.maps.TravelMode.WALKING,
		}, this.callbackSouthToNorth);
	}
	
	callbackWestToEast(response, status) {
		this.westToEastDistance = (status == 'OK') ? (response.rows[0].elements[0].distance.value) : 10000;
	}

	callbackSouthToNorth(response, status) {
		this.southToNorthDistance = (status == 'OK') ? (response.rows[0].elements[0].distance.value) : 10000;
	}

	isPolygonValid()
	{
		let totalDistance = this.westToEastDistance + this.southToNorthDistance;
		//let toReturn = (totalDistance > 10000) ? false : true;
		return (totalDistance > 10000);
	}

	createShape(data)
	{
		let coords = [];
		
		this.north = data.bounds.getNorthEast().lat();
		this.east = data.bounds.getNorthEast().lng();
		this.south = data.bounds.getSouthWest().lat();
		this.west = data.bounds.getSouthWest().lng();


		this.shape = new google.maps.Rectangle({
			bounds: {
				north: this.north,
				south: this.south,
				east: this.east,
				west: this.west
			}
		});

		this.drawingManager.setMap(null);
	}

	getLatLngFromString(lat,lng) {
		return new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
	}

	getInitialPosition()
	{

		let latNew,lngNew;
		let sCheck = $('#southToNorthS').is(':checked');
		let wCheck = $('#westToEastW').is(':checked');

		latNew = (sCheck) ? south : north;
		this.southToNorth = (sCheck) ? 's' : 'n';

		lngNew = (wCheck) ? west : east;
		this.westToEast = (wCheck) ? 'w' : 'e';

		this.currentPosition = this.getLatLngFromString(latNew,lngNew);
		
		return currentPosition;
	}

	getDistanceBetweenPoints(start, end)
	{
		let cantOfPointsSTN = 5;
		let totalDistance = Math.abs(start - end);
		let result = totalDistance / 5;
		if(result.toString().length > 7)
			result = parseFloat(result.toString().substring(0,7));

		return result;
	}

	generateCoordinatesRectangleV()
	{
		do
		{
			if(this.shape.getBounds().contains(this.currentPosition))
			{
				this.coordinates.push(this.currentPosition);

				if(this.countNotFound > 0)
				{
					this.countNotFound = 0;
					this.southToNorth = (this.southToNorth == 's') ? 'n' : 's';
				}
				
				this.currentLat = this.currentPosition.lat();
				this.currentLng = this.currentPosition.lng();

				this.nextLat = (this.southToNorth == 's') ? (this.currentLat + this.distanceSTN) : (this.currentLat - this.distanceSTN);
				this.nextLng = this.currentLng;
				
				this.currentPosition = this.getLatLngFromString(nextLat,nextLng);
			}
			else
			{
				this.countNotFound++;
				if(this.countNotFound < 2)
				{
					this.currentLat = this.currentPosition.lat();
					this.currentLng = this.currentPosition.lng();
					
					this.nextLng = (this.westToEast == 'e') ? (this.currentLng - 0.0001) : (this.currentLng + 0.0001);

					if(this.currentLat <= this.north && this.currentLat >= this.south)
					{
						this.nextLat = this.currentLat;							
					}
					else
					{
						this.nextLat = (this.southToNorth == 's') ? (this.currentLat - this.distanceSTN) : (this.currentLat + this.distanceSTN);
					}

					this.currentPosition = this.getLatLngFromString(this.nextLat,this.nextLng);
				}
				else if(this.countNotFound == 2 && !this.lastLine)
				{
					this.lastLine = true;

					this.nextLat = (this.southToNorth == 's') ? (this.currentLat - this.distanceSTN) : (this.currentLat + this.distanceSTN);
					this.nextLng = (this.westToEast == 'w') ? this.east : this.west;

					this.currentPosition = this.getLatLngFromString(this.nextLat,this.nextLng);
				}
				else
				{
					this.exit = true;
				}
			}
		}while(!this.exit);
	}

	generateCoordinatesRectangleH()
	{
		do
		{
			if(this.shape.getBounds().contains(this.currentPosition))
			{
				this.coordinates.push(this.currentPosition);

				if(this.countNotFound > 0)
				{
					this.countNotFound = 0;
					this.westToEast = (this.westToEast == 'w') ? 'e' : 'w';
				}

				this.currentLat = this.currentPosition.lat();
				this.currentLng = this.currentPosition.lng();

				this.nextLat = this.currentLat;
				this.nextLng = (this.westToEast == 'w') ? (this.currentLng + this.distanceSTN) : (this.currentLng - this.distanceSTN)
				
				this.currentPosition = this.getLatLngFromString(this.nextLat,this.nextLng);
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

	generateCoordinatesPolygonV()
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

	generateCoordinatesPolygonH()
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

	generateCoordinatesCircleV()
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

	generateCoordinatesCircleH()
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
	generateCoordinates()
	{
		let horizontalDraw = $('#directionH').is(':checked');
		if(this.shape != null && !this.generated)
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

	getSecondsPerPoint()
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

	setZero(val)
	{
		if(val < 10)
			val = '0'+val;

		return val;
	}

	generateTime()
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

	showNoty(type,text)
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

	getColor()
	{
		var randomIndex = Math.floor((Math.random() * colors.length));
		var colorToReturn = colors[randomIndex];
		return colorToReturn;
	}

	drawPath()
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

	showCoordinatesWrap()
	{
		var valText = '';
		for(var i=0;i<coordinates.length;i++)
		{
			valText += coordinates[i].lat() +','+coordinates[i].lng() + ';';
		}
		$('#resultCoordinates').val(valText);
	}

	showCoordinates()
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

	chooseDrawType()
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
	
	cleanCoordinates()
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

	resetCoordinates()
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

	exportToCsv() {
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

	replaceAll(find, replace,str) { var re = new RegExp(find, 'g'); str = str.replace(re, replace); return str; }

	setActualDate()
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

	setChangedDate()
	{
		actualDate = $('#dateDay').val();
	}
}

Array.prototype.max = function() {
	return Math.max.apply(null, this);
};

Array.prototype.min = function() {
	return Math.min.apply(null, this);
};