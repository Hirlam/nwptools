// Global variables
var layout,a,b,tab,map,toolbar,wins,pop2,form2;
var lonlat = new Array();  // domain borders coordinates
var lolaez = new Array();  // similar, but including extension zone
var ntab = 19;  // Number of tabs, if increasing it remember also to extend default color tables
var tabarr = new Array(ntab);
var oa = new Array(ntab);
var oh = new Array(ntab);
// see e.g. http://en.wikipedia.org/wiki/Web_colors
var oadefcol = [ '#ff0000', '#ff8000', '#ff00ff', '#ffd700', '#b8860b',
		 '#ff69b4', '#b22222', '#880000', '#8b4513', '#000000',
	         '#111111', '#222222', '#333333', '#444444', '#555555',
	         '#666666', '#777777', '#888888', '#999999' ];
var ohdefcol = [ '#0000ff', '#00ff00', '#00ffff', '#008000', '#1e90ff',
		 '#00ff80', '#008080', '#808000', '#505050', '#000000',
	         '#111111', '#222222', '#333333', '#444444', '#555555',
	         '#666666', '#777777', '#888888', '#999999' ];
var divs = new Array(ntab);
for (var i=1; i<=ntab; i++) {
    oa[i-1] = { color: oadefcol[i-1], form: null, domain: null, domez: null };
    oh[i-1] = { color: ohdefcol[i-1], form: null, domain: null };
    divs[i-1] = document.createElement('div');
    divs[i-1].id = "cell"+i;
    divs[i-1].className = "cell";
    divs[i-1].innerHTML = '<table style="width:100%">' +
	'<tr><td><div id="formA'+i+'"></div></td>' +
	'<tr><td class="blank">&nbsp;</td>' +
	'<tr><td><div id="formH'+i+'"></div></td></table>';
}

// Map projections for the background
var nproj = 4;
var map_proj = [ 'EPSG:3857', 'EPSG:102018', 'EPSG:27562', 'EPSG:102021' ];
proj4.defs('EPSG:102018',
	   '+proj=stere +lat_0=90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:27562',
	   '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs');
proj4.defs('EPSG:102021',
	   '+proj=stere +lat_0=-90 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs');
ol.proj.proj4.register(proj4);  // important with openlayers 6.9.0

// Map projections menu
var mapOpts = [
    [ '0','obj','Spherical Mercator (EPSG:3857)',''],
    [ '1','obj','Polar Stereographic 90N (EPSG:102018)',''],
    [ '2','obj','Lambert France (EPSG:27562)','' ],
    [ '3','obj','Polar Stereographic 90S (EPSG:102021)','']
];
var defZoom = [ 3, 4, 4, 4 ];
var minZoom = [ 2, 2, 2, 2 ];
var map_view = new Array(nproj);
var mcx = [ 10.0, 10.0, 10.0, 0.0 ];
var mcy = [ 57.0, 57.0, 57.0, -90.0 ];
for (var i=0; i<nproj; i++) {
    map_view[i] = new ol.View({
	projection: map_proj[i],
	center: ol.proj.transform([mcx[i],mcy[i]],'EPSG:4326',map_proj[i]),
//	extent: ol.proj.get(map_proj[i]).getExtent(),
	zoom: defZoom[i],
	minZoom: minZoom[i]
    });
}
var mapix = 0;
var cval = getCookie("mapix");
if ( cval != "" ) mapix = parseInt(cval);
var proj_name = map_proj[mapix];
var iwin = null;

// Base layer menu
var baseOpts = [
    [ '10','obj','OpenStreetMap',''],
    [ '11','obj','Natural Earth',''],
];
var base_layers = [
    new ol.layer.Tile({
	source: new ol.source.OSM(),
	opacity: 0.7
    }),
    new ol.layer.Tile({
	source: new ol.source.TileWMS({
	    url: 'https://ahocevar.com/geoserver/wms',
	    crossOrigin: '',
	    params: {
		'LAYERS': 'ne:NE1_HR_LC_SR_W_DR,ne:ne_10m_admin_0_boundary_lines_land',
		'TILED': true,
	    },
	    projection: 'EPSG:4326',
	}),
	opacity: 0.7
    })
];
var basix = 0;
cval = getCookie("basix");
if ( cval != "" ) basix = parseInt(cval);

// Constants
var PIQ = Math.atan2(1.0,1.0);
var PI = 4.0*PIQ;
var RAD = PI / 180.0;
var DEG = 1.0 / RAD;
var REARTH = 6.37122e+6;

// Main function
function buildInterface() {
    layout = new dhtmlXLayoutObject(document.body,"2U");
    a = layout.cells("a");
    b = layout.cells("b");
    a.hideHeader();
    b.hideHeader();
    wins = new dhtmlXWindows();
    toolbar = b.attachToolbar();
    toolbar.addButtonSelect("bproj",1,"Map projection",mapOpts,'qgis24.png');
    toolbar.addText("tproj",2,mapOpts[mapix][2]);
    toolbar.addButtonSelect("bbase",3,"Map base layer",baseOpts,'qgis24.png');
    toolbar.addText("tbase",4,baseOpts[basix][2]);
    toolbar.attachEvent("onClick",toolbarClick);
    a.setWidth(270);
    for (var i=1; i<=ntab; i++) {
	document.body.appendChild(divs[i-1]);
	var formAData = [
	    {type: "fieldset", name: "lambps"+i, label: "HARMONIE grid "+i, list: [
		{type: "input", name: 'nlon'+i, label: 'Nlon:', validate: "validDim", required: true, inputWidth: 120},
		{type: "input", name: 'nlat'+i, label: 'Nlat:', validate: "validDim", required: true, inputWidth: 120},
		{type: "input", name: 'lonc'+i, label: 'LonC:', validate: "validLon", required: true, inputWidth: 115},
		{type: "input", name: 'latc'+i, label: 'LatC:', validate: "validLat", required: true, inputWidth: 115},
		{type: "input", name: 'lon0'+i, label: 'Lon0:', validate: "validLon", required: true, inputWidth: 115},
		{type: "input", name: 'lat0'+i, label: 'Lat0:', validate: "validLat", required: true, inputWidth: 115},
		{type: "input", name: 'gsize'+i, label: 'Gsize:', validate: "validGsize", required: true, inputWidth: 120},
		{type: "input", name: 'ezone'+i, label: "Ezone or E'-zonex:", validate: "validEzone", required: true, inputWidth: 60},
		{type: "input", name: 'ezony'+i, label: "0 (E) or E'-zoney:", validate: "validEzone", required: true, inputWidth: 60},
		{type: "checkbox", name: 'showez'+i, label: "Show E(')zone: ", checked:false},
		{type: "input", name: 'labela'+i, label: 'Label:', required: false, inputWidth: 150},
		{type: "checkbox", name: 'filla'+i, label: "Fill domain: ", checked:false},
		{type: "input", name: 'lwida'+i, label: 'Border line width:', validate: "validLwidth", value: 2, required: true, inputWidth: 80}
	    ]},
	    {type: "block", name: "blocka"+i, list: [
		{type: "button", name: "showa"+i, value: "Show"},
		{type: "newcolumn"},
		{type: "button", name: "hidea"+i, value: "Hide"},
		{type: "newcolumn"},
		{type: "button", name: "cola"+i, value: "Color"}
	    ]},
	    {type: "block", name: "block2a"+i, list: [
		{type: "newcolumn"},
		{type: "button", name: "qfila"+i, value: "QuickFill"},
		{type: "newcolumn"},
		{type: "button", name: "ezhelp"+i, value: "E(')zone help"}
	    ]}
	];
	oa[i-1].form = new dhtmlXForm("formA"+i,formAData);
	var formHData = [
	    {type: "fieldset", name: "rotll"+i, label: "HIRLAM (rotated spherical) grid "+i, list: [
		{type: "input", name: 'nlonh'+i, label: 'Nlon:', validate: "validDim", required: true, inputWidth: 120},
		{type: "input", name: 'nlath'+i, label: 'Nlat:', validate: "validDim", required: true, inputWidth: 120},
		{type: "input", name: 'south'+i, label: 'South:', validate: "validLat", required: true, inputWidth: 115},
		{type: "input", name: 'west'+i, label: 'West:', validate: "validLon", required: true, inputWidth: 120},
		{type: "input", name: 'north'+i, label: 'North:', validate: "validLat", required: true, inputWidth: 115},
		{type: "input", name: 'east'+i, label: 'East:', validate: "validLon", required: true, inputWidth: 120},
		{type: "input", name: 'polat'+i, label: 'PoLat:', validate: "validLat", required: true, inputWidth: 115},
		{type: "input", name: 'polon'+i, label: 'PoLon:', validate: "validLon", required: true, inputWidth: 115},
		{type: "input", name: 'labelh'+i, label: 'Label:', required: false, inputWidth: 150},
		{type: "checkbox", name: 'fillh'+i, label: "Fill domain: ", checked:false},
		{type: "input", name: 'lwidh'+i, label: 'Border line width:', validate: "validLwidth", value: 2, required: true, inputWidth: 80}
	    ]},
	    {type: "block", name: "blockh"+i, list: [
		{type: "button", name: "showh"+i, value: "Show"},
		{type: "newcolumn"},
		{type: "button", name: "hideh"+i, value: "Hide"},
		{type: "newcolumn"},
		{type: "button", name: "colh"+i, value: "Color"}
	    ]}
	];
	oh[i-1].form = new dhtmlXForm("formH"+i,formHData);
	tabarr[i-1] = { id: "tab"+i, text: ""+i, close: false };
    }
    tab = a.attachTabbar({ tabs: tabarr });
    for (var i=1; i<=ntab; i++) {
	tab.tabs("tab"+i).attachObject(divs[i-1]);
	oa[i-1].form.attachEvent("onButtonClick", function(id) {
	    var t = id.match(/^(showa|hidea|cola|qfila|ezhelp)(\d+)$/);
	    if (t.length < 3) {
		console.log("id was: "+id+", length = "+t.length);
	    } else if (t[1] == "showa") {
		showLambPS(t[2]);
	    } else if (t[1] == "hidea") {
		hideLambPS(t[2]);
	    } else if (t[1] == "cola") {
		var j = parseInt(t[2]);
		setColor(oa[j-1]);
	    } else if (t[1] == "qfila") {
		quickFillA(t[2]);
	    } else if (t[1] == "ezhelp") {
		showEZhelp(t[2]);
	    }
	});
	oh[i-1].form.attachEvent("onButtonClick", function(id) {
	    var t = id.match(/^(showh|hideh|colh)(\d+)$/);
	    if (t.length < 3) {
		console.log("id was: "+id+", length = "+t.length);
	    } else if (t[1] == "showh") {
		showRotLatLon(t[2]);
	    } else if (t[1] == "hideh") {
		hideRotLatLon(t[2]);
	    } else if (t[1] == "colh") {
		var j = parseInt(t[2]);
		setColor(oh[j-1]);
	    }
	});
	oa[i-1].form.enableLiveValidation(true);
	oh[i-1].form.enableLiveValidation(true);
    }
    tab.tabs("tab1").setActive();
    var height = b.getHeight();
    var mh = document.getElementById("mapholder");
    mh.style.height = height+"px";
    b.attachObject("mapholder");

    map = new ol.Map({
	target: 'mapholder',
	controls: ol.control.defaults({
	    attributionOptions: ({
		collapsible: false
	    })
	}).extend([
	    new ol.control.ScaleLine() /*,
	    new ol.control.MousePosition({
		coordinateFormat: ol.coordinate.createStringXY(4),
		projection: 'EPSG:4326',
//		target: document.getElementById("llholder"),
		undefinedHTML: '&nbsp;'
	    }) */
//	    new ol.control.ZoomToExtent()
	]),
	renderer: 'canvas',
	view: map_view[mapix]
    });
    map.addLayer(base_layers[basix]);
    b.dataType = "maps";
    b.dataObj = map;

    // Check if we have cookies to fill the forms
    for (var i=1; i<=ntab; i++) {
	var cval = getCookie("a"+i);
	if ( cval != "" ) {
	    var a = cval.split(":");
	    if ( a.length >= 10 ) {
		oa[i-1].form.setItemValue("nlon"+i,a[0]);
		oa[i-1].form.setItemValue("nlat"+i,a[1]);
		oa[i-1].form.setItemValue("lonc"+i,a[2]);
		oa[i-1].form.setItemValue("latc"+i,a[3]);
		oa[i-1].form.setItemValue("lon0"+i,a[4]);
		oa[i-1].form.setItemValue("lat0"+i,a[5]);
		oa[i-1].form.setItemValue("gsize"+i,a[6]);
		oa[i-1].form.setItemValue("ezone"+i,a[7]);
		oa[i-1].form.setItemValue("ezony"+i,a[8]);
		oa[i-1].form.setItemValue("labela"+i,a[9]);
		if (a.length > 10) oa[i-1].form.setItemValue("showez"+i,a[10]);
		if (a.length > 11) oa[i-1].form.setItemValue("filla"+i,a[11]);
		if (a.length > 12) oa[i-1].form.setItemValue("lwida"+i,a[12]);
	    }
	}
	cval = getCookie("h"+i);
	if ( cval != "" ) {
	    var a = cval.split(":");
	    if ( a.length >= 9 ) {
		oh[i-1].form.setItemValue("nlonh"+i,a[0]);
		oh[i-1].form.setItemValue("nlath"+i,a[1]);
		oh[i-1].form.setItemValue("west"+i,a[2]);
		oh[i-1].form.setItemValue("south"+i,a[3]);
		oh[i-1].form.setItemValue("east"+i,a[4]);
		oh[i-1].form.setItemValue("north"+i,a[5]);
		oh[i-1].form.setItemValue("polon"+i,a[6]);
		oh[i-1].form.setItemValue("polat"+i,a[7]);
		oh[i-1].form.setItemValue("labelh"+i,a[8]);
		if (a.length > 10) oa[i-1].form.setItemValue("fillh"+i,a[10]);
		if (a.length > 11) oa[i-1].form.setItemValue("lwidh"+i,a[11]);
	    }
	}
    }
}

// Helper functions
function validDim(n) {
    return ( (n == parseInt(n)) && n > 1 && n < 100000 );
}
function validEzone(n) {
    return ( (n == parseInt(n)) && n >= 0 && n < 10000 );
}
function validLon(a) {
    return ( !isNaN(a) && a >= -180.0 && a <= 180.0 );
}
function validLat(a) {
    return ( !isNaN(a) && a >= -90.0 && a <= 90.0 );
}
function validGsize(a) {
    return ( !isNaN(a) && a > 0.0 );
}
function validLwidth(n) {
    return ( (n == parseInt(n)) && n >= 1 && n <= 20 );
}

// Draw Lambert or pol. ster. domain
function showLambPS(ix) {
    oa[ix-1].form.validate();
    var nlon = parseInt(oa[ix-1].form.getItemValue("nlon"+ix));
    if ( ! validDim(nlon) ) return false;
    var nlat = parseInt(oa[ix-1].form.getItemValue("nlat"+ix));
    if ( ! validDim(nlat) ) return false;
    var lonc = parseFloat(oa[ix-1].form.getItemValue("lonc"+ix));
    if ( ! validLon(lonc) ) return false;
    var latc = parseFloat(oa[ix-1].form.getItemValue("latc"+ix));
    if ( ! validLat(latc) ) return false;
    var lon0 = parseFloat(oa[ix-1].form.getItemValue("lon0"+ix));
    if ( ! validLon(lon0) ) return false;
    var lat0 = parseFloat(oa[ix-1].form.getItemValue("lat0"+ix));
    if ( ! validLat(lat0) ) return false;
    var is_lamb = ( Math.abs(lat0) < 90.0 );
    var gsize = parseFloat(oa[ix-1].form.getItemValue("gsize"+ix));
    if ( ! validGsize(gsize) ) return false;
    var ezonx = parseInt(oa[ix-1].form.getItemValue("ezone"+ix));
    if ( ! validEzone(ezonx) ) return false;
    var ezony = parseInt(oa[ix-1].form.getItemValue("ezony"+ix));
    if ( ! validEzone(ezony) ) return false;
    var ezone = 0
    // What kind of extension zone do we have?
    if ( ezony == 0 ) {
	ezone = ezonx
	ezonx = 0
    }
    var showez = oa[ix-1].form.getItemValue("showez"+ix);
    var label = oa[ix-1].form.getItemValue("labela"+ix);
    var filla = oa[ix-1].form.getItemValue("filla"+ix);
    var lwida = parseInt(oa[ix-1].form.getItemValue("lwida"+ix));
    if ( ! validLwidth(lwida) ) return false;
    var msg = "";
    var nlonx = nlon + ezonx;
    if ( ! hasValidPrimeFactors(nlonx) ) {
	var vp = findNearestSPFnumbers(nlonx);
	msg += "Nlon="+nlonx+" does not have valid prime factors!<br>"
	    + "The closest valid ones are "+vp.prev+" and "+vp.next+"<br>";
    }
    var nlatx = nlat + ezony;
    if ( ! hasValidPrimeFactors(nlatx) ) {
	var vp = findNearestSPFnumbers(nlatx);
	msg += "<br>Nlat="+nlatx+" does not have valid prime factors!<br>"
	    + "The closest valid ones are "+vp.prev+" and "+vp.next+"<br>";
    }
    if ( ezone > nlon-2 || ezone > nlat-2 ) {
	msg += "<br>Ezone="+ezone+" is too large!";
    }
    // Preliminary computations needed for the pole test
    var obj,dg,proj_str;
    if ( is_lamb ) {
	proj_str = '+proj=lcc +lat_0='+lat0+' +lat_1='+lat0+' +lat_2='+lat0+' +lon_0='+lon0+' +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';
    } else {
	proj_str = '+proj=stere +lat_0='+lat0+' +lon_0='+lon0+' +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';
    }
    obj = proj4('WGS84',proj_str).forward({x:lonc,y:latc});
    var xc = obj.x;
    var yc = obj.y;
    dg = gsize;
    var xl  = xc - 0.5*(nlon-ezone-1)*dg;
    var xri = xc + 0.5*(nlon-ezone-1)*dg;
    var yb  = yc - 0.5*(nlat-ezone-1)*dg;
    var yti = yc + 0.5*(nlat-ezone-1)*dg;
    var xre = xri + (ezone+ezonx)*dg;
    var yte = yti + (ezone+ezony)*dg;
    if ( is_lamb ) {
	var objp = proj4('WGS84',proj_str).forward({x:0.0,y:90.0});
	if ( objp.x >= xl && objp.x <= xre && objp.y >= yb && objp.y <= yte ) {
	    msg += "<br>Projection is Lambert but north pole is inside (extended) domain.<br>"
		+ "You should switch to polar stereographic, i.e., set lat0=90 !<br>";
	}
	var objp = proj4('WGS84',proj_str).forward({x:0.0,y:-90.0});
	if ( objp.x >= xl && objp.x <= xre && objp.y >= yb && objp.y <= yte ) {
	    msg += "<br>Projection is Lambert but south pole is inside (extended) domain.<br>"
		+ "You should switch to polar stereographic, i.e., set lat0=-90 !<br>";
	}
    }
    if ( msg != "" ) {
	dhtmlx.message({
	    type: "alert-warning",
	    title: "WARNING",
	    text: msg
	});
    }
    // form contains valid data
    var ezon1 = (ezony > 0 ? ezonx : ezone);
    var cval = [nlon,nlat,lonc,latc,lon0,lat0,gsize,ezon1,ezony,label,showez,filla,lwida].join(":");
    setCookie("a"+ix,cval,730);
    if (oa[ix-1].domain != null) map.removeLayer(oa[ix-1].domain);
    if (oa[ix-1].domez != null) map.removeLayer(oa[ix-1].domez);
    lonlat.length = 0;
    lolaez.length = 0;
    for(var i=0; i<nlon+ezonx; i+=5) {
	var x = xl + i*dg;
	obj = proj4('WGS84',proj_str).inverse({x:x,y:yb});
	if (i<nlon-ezone) lonlat.push( [ obj.x, obj.y ] );
	if (showez) lolaez.push( [ obj.x, obj.y ] );
    }
    for(var j=0; j<nlat+ezony; j+=5) {
	var y = yb + j*dg;
	obj = proj4('WGS84',proj_str).inverse({x:xri,y:y});
	if (j<nlat-ezone) lonlat.push( [ obj.x, obj.y ] );
	if (showez) {
	    obj = proj4('WGS84',proj_str).inverse({x:xre,y:y});
	    lolaez.push( [ obj.x, obj.y ] );
	}
    }
    obj = proj4('WGS84',proj_str).inverse({x:xri,y:yti});
    lonlat.push( [ obj.x, obj.y ] );
    for(var i=0; i<nlon+ezonx; i+=5) {
	var x = xre - i*dg;
	obj = proj4('WGS84',proj_str).inverse({x:x,y:yti});
	if (i>ezone+ezonx) lonlat.push( [ obj.x, obj.y ] );
	if (showez) {
	    obj = proj4('WGS84',proj_str).inverse({x:x,y:yte});
	    lolaez.push( [ obj.x, obj.y ] );
	}
    }
    obj = proj4('WGS84',proj_str).inverse({x:xl,y:yti});
    lonlat.push( [ obj.x, obj.y ] );
    for(var j=0; j<nlat+ezony; j+=5) {
	var y = yte - j*dg;
	obj = proj4('WGS84',proj_str).inverse({x:xl,y:y});
	if (j>ezone+ezony) lonlat.push( [ obj.x, obj.y ] );
	if (showez) lolaez.push( [ obj.x, obj.y ] );
    }
    var fac = filla ? (showez ? 0.15 : 0.25) : 0.0;
    var fill = new ol.style.Fill({
	color: hex2rgba(oa[ix-1].color,fac)
    });
    var stroke = new ol.style.Stroke({
	color: oa[ix-1].color,
	width: lwida
    });
    var txtstroke = new ol.style.Stroke({
	color: oa[ix-1].color,
	width: 1
    });
    oa[ix-1].domain = new ol.layer.Vector({
	source: new ol.source.Vector({
	    features: [
		new ol.Feature({
		    geometry: new ol.geom.Polygon([lonlat]).transform('EPSG:4326',proj_name),
		    name: 'adom'+ix
		})]
	}),
	style: new ol.style.Style({
	    stroke: stroke,
	    fill: fill,
	    text: new ol.style.Text({
		font: '12px Helvetica',
		text: label,
		fill: fill,
		stroke: txtstroke
	    })
	})
    });
    if (showez) {
	oa[ix-1].domez = new ol.layer.Vector({
	    source: new ol.source.Vector({
		features: [
		    new ol.Feature({
			geometry: new ol.geom.Polygon([lolaez]).transform('EPSG:4326',proj_name),
			name: 'alis'+ix
		    })]
	    }),
	    style: new ol.style.Style({
		stroke: stroke,
		fill: fill
	    })
	});
	map.addLayer( oa[ix-1].domez );
    }
    map.addLayer( oa[ix-1].domain );
}

function hideLambPS(ix) {
    if (oa[ix-1].domain != null) map.removeLayer(oa[ix-1].domain);
    oa[ix-1].domain = null;
    if (oa[ix-1].domez != null) map.removeLayer(oa[ix-1].domez);
    oa[ix-1].domez = null;
}

function showRotLatLon(ix) {
    oh[ix-1].form.validate();
    var nlon = parseInt(oh[ix-1].form.getItemValue("nlonh"+ix));
    if ( ! validDim(nlon) ) return false;
    var nlat = parseInt(oh[ix-1].form.getItemValue("nlath"+ix));
    if ( ! validDim(nlat) ) return false;
    var west = parseFloat(oh[ix-1].form.getItemValue("west"+ix));
    if ( ! validLon(west) ) return false;
    var south = parseFloat(oh[ix-1].form.getItemValue("south"+ix));
    if ( ! validLat(south) ) return false;
    var east = parseFloat(oh[ix-1].form.getItemValue("east"+ix));
    if ( ! validLon(east) ) return false;
    var north = parseFloat(oh[ix-1].form.getItemValue("north"+ix));
    if ( ! validLat(north) ) return false;
    var polon = parseFloat(oh[ix-1].form.getItemValue("polon"+ix));
    if ( ! validLon(polon) ) return false;
    var polat = parseFloat(oh[ix-1].form.getItemValue("polat"+ix));
    if ( ! validLat(polat) ) return false;
    var label = oh[ix-1].form.getItemValue("labelh"+ix);
    var fillh = oh[ix-1].form.getItemValue("fillh"+ix);
    var lwidh = parseInt(oh[ix-1].form.getItemValue("lwidh"+ix));
    if ( ! validLwidth(lwidh) ) return false;
    // form contains valid data
    var cval = [nlon,nlat,west,south,east,north,polon,polat,label,fillh,lwidh].join(":");
    setCookie("h"+ix,cval,730);
    if (oh[ix-1].domain != null) map.removeLayer(oh[ix-1].domain);
    var obj;
    lonlat.length = 0;
    var dx = (east - west)/(nlon-1);
    var dy = (north - south)/(nlat-1);
    for(var i=0; i<nlon-5; i+=5) {
	var x = i*dx + west;
	obj = rll2geo(x,south,polon,polat);
	lonlat.push( [ obj.lon, obj.lat ] );
    }
    for(var j=0; j<nlat-5; j+=5) {
	var y = j*dy + south;
	obj = rll2geo(east,y,polon,polat);
	lonlat.push( [ obj.lon, obj.lat ] );
    }
    for(var i=0; i<nlon-5; i+=5) {
	var x = east - i*dx;
	obj = rll2geo(x,north,polon,polat);
	lonlat.push( [ obj.lon, obj.lat ] );
    }
    for(var j=0; j<nlat-5; j+=5) {
	var y = north - j*dy;
	obj = rll2geo(west,y,polon,polat);
	lonlat.push( [ obj.lon, obj.lat ] );
    }
    var fac = fillh ? 0.15 : 0.0;
    var fill = new ol.style.Fill({
	color: hex2rgba(oh[ix-1].color,fac)
    });
    var stroke = new ol.style.Stroke({
	color: oh[ix-1].color,
	width: lwidh
    });
    var txtstroke = new ol.style.Stroke({
	color: oh[ix-1].color,
	width: 1
    });
    oh[ix-1].domain = new ol.layer.Vector({
	source: new ol.source.Vector({
	    features: [
		new ol.Feature({
		    geometry: new ol.geom.Polygon([lonlat]).transform('EPSG:4326',proj_name),
		    name: 'hdom'+ix
		})]
	}),
	style: new ol.style.Style({
	    stroke: stroke,
	    fill: fill,
	    text: new ol.style.Text({
		font: '12px Helvetica',
		text: label,
		fill: fill,
		stroke: txtstroke
	    })
	})
    });
    
    map.addLayer( oh[ix-1].domain );
}

function hideRotLatLon(ix) {
    if (oh[ix-1].domain != null) map.removeLayer(oh[ix-1].domain);
    oh[ix-1].domain = null;
}

function quickFillA(ix) {
    var fDat = [
	{type: "label", label: "Paste a domain definition from Harmonie_domains.pm into the textarea below:" },
	{type: "input", name: "ddef", value: "",
	 rows:2, note:{text:"Irrelevant characters (>{},',newline,#comments) will be ignored."},
	 inputWidth: 950, inputHeight: 650
	},
	{type: "fieldset", name: "buttons", label: "", list: [
	    {type: "button", name: "go", value: "Parse", offsetTop:0, offsetLeft:0},
	    {type: "newcolumn"},
	    {type: "button", name: "clear", value: "Clear", offsetTop:0, offsetLeft:20}
	]}
    ];
    pop2 = wins.createWindow("dDef",300,100,1000,800);
    pop2.setText("Enter domain definition");
    pop2.attachForm(fDat);
    form2 = pop2.getAttachedObject();
    form2.attachEvent("onButtonClick", function(id) {
	if (id == "go") {
	    var text = form2.getItemValue("ddef");
	    var saved_text = text;
	    text = text.replace(/[ \'\"\{\}>;,]/g,'');
	    var A = text.split("\n");
	    var msg = "";
	    if (A.length > 1) {
		oa[ix-1].form.setItemValue("ezone"+ix,"11");
		oa[ix-1].form.setItemValue("ezony"+ix,"0");
	    }
	    for (var j=0; j<A.length; j++) {
		var line = A[j];
		var i = line.indexOf('#');
		if (i == 0) {
		    continue;
		} else if (i > 0) {
		    line = line.slice(0,i);
		}
		i = line.indexOf('=');
		if (i < 0) continue;
		var nam = line.slice(0,i);
		var val = line.slice(i+1);
		if (val == "") {
		    oa[ix-1].form.setItemValue("labela"+ix,nam);
		    continue;
		}
		nam = nam.toLowerCase();
		if (nam in {nlon:0,nlat:0,lonc:0,latc:0,lon0:0,lat0:0,gsize:0,ezone:0}) {
		    oa[ix-1].form.setItemValue(nam+ix,val);
		}
	    }
	    wins.window("dDef").close();
	} else if (id == "clear") {
	    form2.setItemValue("ddef","");
	}
    });
}

function showEZhelp(id) {
    var left = window.screenX + 280;
    var top = window.screenY + 180 ;
    if (! iwin || iwin.closed) {
	var attr = 'popup=yes,left='+left+',top='+top+',width=620,height=600,' +
	    'scrollbars=no,status=no,menubar=no,toolbar=no,replace=no';
	iwin = window.open("include/ezones.html","xwin",attr);
    }
    iwin.focus();
}

// Handle a click in the map area toolbar
function toolbarClick(id) {
    var ix = parseInt(id);
    var redraw = false;
    if (ix >=0 && ix < nproj && ix != mapix) {
	mapix = ix;
	redraw = true;
	proj_name = map_proj[mapix];
	map.setView(map_view[mapix]);
	toolbar.setItemText("tproj",mapOpts[mapix][2]);
	setCookie("mapix",mapix,730);
    } else if (ix >= 10 && ix <= 11) {
	ix = ix - 10;
	if (ix != basix) {
	    map.removeLayer(base_layers[basix]);
	    basix = ix;
	    redraw = true;
	    map.addLayer(base_layers[basix]);
	    toolbar.setItemText("tbase",baseOpts[basix][2]);
	    setCookie("basix",basix,730);
	}
    }
    if (redraw) {
	for (var i=1; i<=ntab; i++) {
	    if (oa[i-1].domain != null) {
		hideLambPS(i);
		showLambPS(i);
	    }
	    if (oh[i-1].domain != null) {
		hideRotLatLon(i);
		showRotLatLon(i);
	    }
	}
    }
}

//TODO: replace these with proj4 equivalent
function geo2rll(lon,lat,plon,plat) {
    var splat = Math.sin( (90.0 + plat)*RAD );
    var cplat = Math.cos( (90.0 + plat)*RAD );
    var xm = (lon - plon)*RAD;
    var ym = lat*RAD;
    var sxm = Math.sin(xm);
    var cxm = Math.cos(xm);
    var sym = Math.sin(ym);
    var cym = Math.cos(ym);
    var syr = cplat*sym - splat*cym*cxm;
    if (syr < -1.0) syr = -1.0;
    if (syr >  1.0) syr =  1.0;
    var yr = Math.atan2(syr,Math.sqrt(1.0-syr*syr));
    var cyr = Math.cos(yr);
    var cxr = (cplat*cym*cxm + splat*sym) / cyr;
    if (cxr < -1.0) cxr = -1.0;
    if (cxr >  1.0) cxr =  1.0;
    var sxr = cym*sxm / cyr;
    var xr = Math.atan2(Math.sqrt(1.0-cxr*cxr),cxr);
    if (sxr < 0.0) xr = -xr;

    return { x: xr*DEG, y: yr*DEG };
}

function rll2geo(rlon,rlat,plon,plat) {
    var splat = Math.sin((plat+90.0)*RAD);
    var cplat = Math.cos((plat+90.0)*RAD);
    var sxr = Math.sin(rlon*RAD);
    var cxr = Math.cos(rlon*RAD);
    var syr = Math.sin(rlat*RAD);
    var cyr = Math.cos(rlat*RAD);
    var sym = cplat*syr + splat*cyr*cxr;
    if (sym < -1.0) sym = -1.0;
    if (sym >  1.0) sym =  1.0;
    var yg = Math.atan2(sym,Math.sqrt(1.0-sym*sym));
    var cym = Math.cos(yg);
    var cxm = (cplat*cyr*cxr - splat*syr) / cym;
    if (cxm < -1.0) cxm = -1.0;
    if (cxm >  1.0) cxm =  1.0;
    var sxm = cyr*sxr / cym;
    var xg = Math.atan2(Math.sqrt(1.0-cxm*cxm),cxm);
    if (sxm < 0.0) xg = -xg;
    var lon = xg*DEG + plon;
    var lat = yg*DEG;

    return { lon: lon, lat: lat };
}

function setColor(obj) {
    var myColorPicker = new dhtmlXColorPicker({
	parent : obj.form,
	color : obj.color,
	custom_colors : false
    });
    myColorPicker.attachEvent("onSelect", function(color,node){
	obj.color = color.replace(/-1/g,'0');   //workaround for bug
    });
    myColorPicker.setPosition(100,100);   //but does not work
    myColorPicker.show();
}

function hex2rgba(col,opacity) {
    var t = col.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
    if ( t.length < 4 ) {
	return 'rgba(127,127,127,0.5)';
    } else {
	var r = parseInt('0x'+t[1]);
	var g = parseInt('0x'+t[2]);
	var b = parseInt('0x'+t[3]);
	return 'rgba('+r+','+g+','+b+','+opacity+')';
    }
}

function hasValidPrimeFactors(n) {
    var spf = [2,3,5];
    var Nf = new Array(spf.length);
    var rest = n;
    for (var i=0; i<spf.length; i++) {
	var p = spf[i];
	Nf[i] = 0;
	while( rest % p == 0 ) {
	    rest = rest / p;
	    Nf[i]++;
	}
    }
    return ( rest == 1 && Nf[0] > 0 );
}

function findNearestSPFnumbers(n) {
    var prev = NaN;
    for(var i=n-1; i>1; i--) {
	if ( hasValidPrimeFactors(i) ) {
	    prev = i;
	    break;
	}
    }
    var next = NaN;
    for(var i=n+1; i<2*n; i++) {
	if ( hasValidPrimeFactors(i) ) {
	    next = i;
	    break;
	}
    }
    return { prev: prev, next: next };
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toGMTString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
    }
    return "";
}
