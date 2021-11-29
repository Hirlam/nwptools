// Global variables
var layout,a,b,form,chart,wins,form2,pop2,do_oldAB,title,vcheight,hmax;
var nlev,npbl,ppbl,nstr,pstr,npres,nsigm,p1,Hnlev,psmin,alf1,alf3,alfh;
var formData = [
    {type: "fieldset", name: "vlevs", label: "Required parameters", list: [
	{type: "input", name: 'nlev', label: 'Nlev total:', validate: "validLev", required: true, inputWidth: 100},
	{type: "input", name: 'npbl', label: 'Nlev PBL:', validate: "validLev", required: true, inputWidth: 100},
	{type: "input", name: 'ppbl', label: 'P top PBL (hPa):', validate: "validPres", required: true, inputWidth: 100},
	{type: "input", name: 'nstr', label: 'Nlev stratosphere:', validate: "validLev", required: true, inputWidth: 100},
	{type: "input", name: 'pstr', label: 'P tropopause (hPa):', validate: "validPres", required: true, inputWidth: 100},
	{type: "input", name: 'npres', label: 'Nlev pure pressure:', validate: "validLev", required: true, inputWidth: 100},
	{type: "input", name: 'nsigm', label: 'Nlev pure sigma:', validate: "validLev", required: true, inputWidth: 100},
	{type: "input", name: 'p1', label: 'P full level 1 (hPa):', validate: "validPres", required: true, inputWidth: 100},
	{type: "input", name: 'Hnlev', label: 'Thickness bottom layer (m):', validate: "validHeight", required: true, inputWidth: 100},
	{type: "input", name: 'psmin', label: 'Min. surf. pressure (hPa):', validate: "validPres", required: true, inputWidth: 100},
	{type: "input", name: 'alfh', label: 'alphaHyb (in [-3,-1]):', validate: "validAlfH", required: true, inputWidth: 100}
    ]},
    {type: "fieldset", name: "opts", label: "Optional parameters", list: [
	{type: "input", name: 'alf1', label: 'Strat. exp. alpha1 (in [1,5]):', validate: "validAlfN", required: false, inputWidth: 100},
	{type: "input", name: 'alf3', label: 'PBL exp. alpha3 (in [1,5]):', validate: "validAlfN", required: false, inputWidth: 100},
	{type: "checkbox", name: 'vcheight', label: 'Plot height (def=pressure): ', checked:false},
    ]},
    {type: "button", name: "draw", value: "Draw levels", offsetTop:10, offsetLeft:10},
    {type: "button", name: "dump", value: "Print ahalf, bhalf", offsetTop:10, offsetLeft:10},
    {type: "button", name: "old", value: "Plot old ahalf, bhalf", offsetTop:10, offsetLeft:10},
    {type: "button", name: "credit", value: "&copy;redit", offsetTop:10, offsetLeft:10},
    {type: "button", name: "clear", value: "Clear memory", offsetTop:10, offsetLeft:10}
];
var Ah = new Array();
var Bh = new Array();
var oldab = "";

// Constants
//var P00 = 101325.0;
var P00 = 100000.0;
//var PREF = 98945.37974;  // not used
var EPS = 0.0001;
var RD = 287.04;
var TREF = 288.0;
var G = 9.80665;
var LAPRXPK = true;   // todo: optional?
hmax = 40.;

// Main function
function buildInterface() {
    layout = new dhtmlXLayoutObject(document.body,"2U");
    a = layout.cells("a");
    b = layout.cells("b");
    a.hideHeader();
    b.hideHeader();
    a.setWidth(350);
    form = new dhtmlXForm("form",formData);
    a.attachObject("cella");
    form.attachEvent("onButtonClick", function(id) {
	if (id == "draw") {
	    setCookie("oldab","",-1);   //delete it
	    if ( ! validateAll() ) return;
	    if (chart.last() >= 10) {
		location.reload(true);
	    } else {
		computeAB();
		drawLevels();
	    }
	} else if (id == "dump") {
	    if ( ! validateAll() ) return;
	    if ( ! do_oldAB ) computeAB();
	    dumpAB();
	} else if (id == "old") {
	    showOldAB();
	} else if (id == "credit") {
	    showCredit();
	} else if (id == "clear") {
	    clearForm();
	} else {
	    alert("Unknown action: "+id);
	}
    });
    form.enableLiveValidation(true);
    wins = new dhtmlXWindows();
    // Check for "oldab" cookie
    oldab = getCookie("oldab");
    do_oldAB = ( oldab != "" );
    if ( do_oldAB ) {
	title = "Half levels from user supplied lists";
    } else {
	title = "Half levels computed from input parameters";
    }
    // Check if we have a cookie to fill the form
    var cval = getCookie("v");
    if ( cval != "" ) {
	var a = cval.split(":");
	if ( a.length == 14 ) {
	    form.setItemValue("ppbl",a[2]);
	    form.setItemValue("pstr",a[4]);
	    form.setItemValue("psmin",a[9]);
	    if ( ! do_oldAB ) {
		form.setItemValue("nlev",a[0]);
		form.setItemValue("npbl",a[1]);
		form.setItemValue("nstr",a[3]);
		form.setItemValue("npres",a[5]);
		form.setItemValue("nsigm",a[6]);
		form.setItemValue("p1",a[7]);
		form.setItemValue("Hnlev",a[8]);
		form.setItemValue("alf1",a[10]);
		form.setItemValue("alf3",a[11]);
		form.setItemValue("alfh",a[12]);
		form.setItemValue("vcheight",a[13]);
	    }
	}
    } else {
	// default values
	form.setItemValue("ppbl",850);
	form.setItemValue("pstr",150);
	form.setItemValue("npres",2);
	form.setItemValue("nsigm",3);
	form.setItemValue("psmin",500);
	form.setItemValue("alfh",-1.5);
//	form.setItemValue("alf1",2.8);
//	form.setItemValue("alf3",1.7);
	form.setItemValue("vcheight",false);
    }
    createChart(title);
    if ( validateAll() ) {
//	alert("(Re)drawing graph takes some time ...");
	if (do_oldAB) {
	    var s = oldab.split(":");
	    Ah = s[0].split(",");
	    Bh = s[1].split(",");
	    vcheight = ( s[2] != "0" );
	    nlev = Ah.length - 1;
	    nstr = -1;
	    npbl = -1;
	    var pprev = 0.0;
	    for (var i=0; i<=nlev; i++) {
		Ah[i] = parseFloat(Ah[i]);
		Bh[i] = parseFloat(Bh[i]);
		var p = Ah[i] + Bh[i]*P00;
		if ( p >= pstr && pprev < pstr ) nstr=i-1;
		if ( p >= ppbl && pprev < ppbl ) npbl=nlev-i;
		pprev = p;
	    }
	    form.setItemValue("nlev","("+nlev+")");
	    form.setItemValue("nstr","("+nstr+")");
	    form.setItemValue("npbl","("+npbl+")");
	} else {
	    computeAB();
	}
	drawLevels();
    } else {
	alert("The form contains invalid data, check your input!");
    }
}

// Helper functions
function validLev(n,t) {
    if(t) return true;
    return ( (n == parseInt(n)) && n > 1 && n < 200 );
}
function validPres(p,t) {
    if(t) return true;
    return ( !isNaN(p) && p >= 0.01 && p < 1013.25 );
}
function validHeight(h,t) {
    if(t) return true;
    return ( !isNaN(h) && h >= 1.0 && h <= 200.0 );
}
function validAlfN(a,t) {
    if(t) return true;
    if(!a) return true;
    return ( !isNaN(a) && (a >= 1.0 && a <= 5.0) );
}
function validAlfH(a,t) {
    if(t) return true;
    return ( !isNaN(a) && a >= -3.0 && a <= -1.0 );
}

function validateAll() {
    form.validate();
    nlev = parseInt(form.getItemValue("nlev"));
    if ( ! validLev(nlev,do_oldAB) ) return false;
    npbl = parseInt(form.getItemValue("npbl"));
    if ( ! validLev(npbl,do_oldAB) ) return false;
    ppbl = parseFloat(form.getItemValue("ppbl"));
    if ( ! validPres(ppbl) ) return false;
    nstr = parseInt(form.getItemValue("nstr"));
    if ( ! validLev(nstr,do_oldAB) ) return false;
    pstr = parseFloat(form.getItemValue("pstr"));
    if ( ! validPres(pstr) ) return false;
    npres = parseInt(form.getItemValue("npres"));
    if ( ! validLev(npres,do_oldAB) ) return false;
    nsigm = parseInt(form.getItemValue("nsigm"));
    if ( ! validLev(nsigm,do_oldAB) ) return false;
    p1 = parseFloat(form.getItemValue("p1"));
    if ( ! validPres(p1,do_oldAB) ) return false;
    Hnlev = parseFloat(form.getItemValue("Hnlev"));
    if ( ! validHeight(Hnlev,do_oldAB) ) return false;
    psmin = parseFloat(form.getItemValue("psmin"));
    if ( ! validPres(psmin) ) return false;
    alfh = parseFloat(form.getItemValue("alfh"));
    if ( ! validAlfH(alfh,do_oldAB) ) return false;
    alf1 = parseFloat(form.getItemValue("alf1"));
    if ( !isNaN(alf1) && ! validAlfN(alf1,do_oldAB) ) return false;
    alf3 = parseFloat(form.getItemValue("alf3"));
    if ( !isNaN(alf3) && ! validAlfN(alf3,do_oldAB) ) return false;
    vcheight = form.getItemValue("vcheight");
    // More sanity checks
    if ( psmin > 1000.0 || psmin < 100.0 ) {
	alert("Minimum surface pressure is invalid, please check!");
	return false;
    }
    if ( ! do_oldAB ) {
	if ( ppbl >= 1000.0 || ppbl <= pstr ) {
	    alert("Pressure at top of PBL is invalid, please check!");
	    return false;
	} else if ( pstr >= ppbl || pstr <= p1 ) {
	    alert("Pressure at tropopause is invalid, please check!");
	    return false;
	} else if ( nstr + npbl >= nlev-1 ) {
	    alert("Too many levels in PBL and/or stratosphere, please check!");
	    return false;
	} else if ( npres + nsigm >= nlev-1 ) {
	    alert("Too many pure pressure and/or sigma levels, please check!");
	    return false;
	}
	// form contains valid data, save cookie
	if (isNaN(alf1)) alf1 = "";
	if (isNaN(alf3)) alf3 = "";
	var cval = [nlev,npbl,ppbl,nstr,pstr,npres,nsigm,p1,Hnlev,psmin,alf1,alf3,alfh,vcheight].join(":");
	setCookie("v",cval,30);
    }
    ppbl *= 100.0;
    pstr *= 100.0;
    p1 *= 100.0;
    psmin *= 100.0;
    return true;
}

// After Pierre Benard's (Fortran) algorithm
function computeAB() {
    do_oldAB = false;
    setCookie("oldab","",-1);   //delete it
    var p1h;
    if (LAPRXPK) {
	p1h = 2.0*p1;
    } else {
	p1h = Math.E * p1;
    }
    var x1 = 1.0 / nlev;
    var x2 = nstr*x1;
    var x3 = (nlev-npbl)*x1;
    var x4 = (nlev-1)*x1;
    var xp3 = 1.0 - x3;
    var xp4 = 1.0 - x4;
    var y1 = p1h/P00;
    var y2 = pstr/P00;
    var y3 = ppbl/P00;
    var pN = P00*Math.exp( -G*Hnlev/(RD*TREF) )
    var y4 = pN/P00;
    var yp3 = 1.0 - y3;
    var yp4 = 1.0 - y4;
    var a1 = (((0.8*y3-y2)/(x3-x2)) - y1/x1)*(x1*(x2-x1)/(x1*y2-x2*y1));
    var a3 = (((1.4*y2-y3)/(x2-x3))-yp4/xp4)*(xp4*(xp3-xp4)/(xp4*yp3-xp3*yp4));
    if ( isNaN(alf1) || alf1 == "" ) alf1 = a1;
    if ( isNaN(alf3) || alf3 == "" ) alf3 = a3;
    var fac1 = (x1*y2 - x2*y1)*nlev*Math.pow( x2-x1, -alf1 );
    var M = new Array();
    M[0] = 0.0;
    for (var i=1; i<=nstr; i++) {
	var x = i*x1;
	M[i] = x*y1/x1 + fac1*Math.pow( x-x1, alf1 );
    }
    var x2m = x2 - EPS;
//    var x2mm = x2 - 2.0*EPS;
    var z2m = x2m*y1/x1 + fac1*Math.pow( x2m-x1, alf1 );
//    var z2mm = x2mm*y1/x1 + fac1*Math.pow( x2mm-x1, alf1 );
    var d1 = (M[nstr] - z2m)/EPS;
//    var d11 = (M[nstr-1] - 2.0*z2m + z2mm)/(EPS*EPS);
    var fac3 = (xp4*yp3-xp3*yp4)*Math.pow( x4-x3, -alf3 )/xp4;
    for (var i=nlev-npbl; i<nlev-1; i++) {
	var x = i*x1;
	M[i] = 1.0 - (1.0-x)*(yp4/xp4) - fac3*Math.pow( x4-x, alf3 );
    }
    var x3p = (nlev-npbl)*x1 + EPS;
//    var x3pp = (nlev-npbl)/nlev + 2.0*EPS;
    var z3p = 1.0 - (1.0-x3p)*yp4/xp4 - fac3*Math.pow( x4-x3p, alf3 );
//    var z3pp = 1.0 - (1.0-x3pp)*yp4/xp4 - fac3*Math.pow( x4-x3pp, alf3 );
    var d2 = (z3p - M[nlev-npbl])/EPS;
//    var d22 = (z3pp - 2.0*z3p + M[nlev-npbl-1])/(EPS*EPS);
    var dx = x3 - x2;
    var dy = y3 - y2;
    var s = dy/dx;
    for (var i=nstr+1; i<=nlev-npbl-1; i++) {
	var x = i*x1;
	M[i] = y2+(x-x2)*d1+(dx*(s-d1)+(x-x3)*(d1+d2-2.0*s))*(x-x2)*(x-x2)/(dx*dx);
    }
    for (var i=nlev-1; i<=nlev; i++) {
	var x = i*x1;
	M[i] = 1.0 - (1.0-x)*yp4/xp4;
    }
    for (var i=0; i<=nlev; i++) {
	if (M[i] < 0.0) M[i] = 0.0;
	if (M[i] > 1.0) M[i] = 1.0;
    }
    var H = new Array();
    var etap = M[npres];
    var etas = M[nlev-nsigm];
    var aa = alfh*etas*etas/(etas-etap);
    var bb = 1.0 + aa/etas;
    for(var i=0; i<=npres; i++) {
	H[i] = 0.0;
    }
    for(var i=npres+1; i<=nlev-nsigm-1; i++) {
	var x = M[i];
	H[i] = aa/(bb-Math.pow( (x-etap)/(etas-etap), alfh ));
    }
    for (var i=nlev-nsigm; i<=nlev; i++) {
	H[i] = M[i];
    }
    Ah.length = 0;
    Bh.length = 0;
    for (var i=0; i<=nlev; i++) {
	if (H[i] < 0.0) H[i] = 0.0;
	if (H[i] > 1.0) H[i] = 1.0;
	Ah.push( P00*(M[i] - H[i]) );
	Bh.push( H[i] );
    }
}

// Create dhtmlx chart object and attach to layout
function createChart(title) {
    var xAxis, yAxis;
    if ( vcheight ) {
	xAxis = { title: title, template: "", lines: false, start: 0, end: 10 };
	yAxis = { title: "Z (km)", start: 0, step: 1, end: hmax };
    } else {
	xAxis = { title: title, template: "", lines: false, start: 0, end: 10 };
	yAxis = { title: "P (hPa)", start: -1000, step: 50, end: 0 };
    }
    b.attachChart({
	view: "spline",
	container: "chartholder",
	value: "#p#",
//	label: "#x#",
	legend: {
	    align: "right",
	    valign: "top",
	    width: 0,
	    marker: {
		radius: 0,
		width: 0,
		height: 0
	    }
	},
	line: {
	    color: "#FF0000",
	    width: 1
	},
	item: {
	    radius: 0
	},
	xAxis: xAxis,
	yAxis: yAxis
    });
    chart = b.getAttachedObject();
    var data = [
	{ id: 0, p: 0, x: 0 },
	{ id: 1, p: 0, x: 10 }
    ];
    chart.parse(data,"json");
    chart.hideSeries(0);
    chart.clearAll();
}

function drawLevels() {
//    b.progressOn();
    var data = new Array();
    var pmax = 100000;
    var pampl = 0.5*(pmax-psmin);
    if ( ! vcheight ) {
	for (var i=0; i<=10; i++) {
	    var obj = {};
	    obj.id = i;
	    obj.x = i;
	    var ps = pmax - pampl*(1.0 + Math.cos(i*Math.PI/5.0-Math.PI));
	    for (var k=0; k<=nlev; k++) {
		var s = "p" + k;
		var p = Ah[k] + Bh[k]*ps;
		obj[s] = -p/100.0;
	    }
	    data.push( obj );
	}
    } else {
	for (var i=0; i<=10; i++) {
	    var obj = {};
	    obj.id = i;
	    obj.x = i;
	    var ps = pmax - pampl*(1.0 + Math.cos(i*Math.PI/5.0-Math.PI));
	    var tmp = RD*Math.log(pmax/ps)/G;
	    var Tmean = TREF*(1.0 - 0.0065*0.5*tmp);
	    var Hp = 0.001*Tmean*tmp;
	    var pp = ps;
	    for (var k=nlev; k>=1; k--) {
		var s = "p" + k;
		var pm = Ah[k] + Bh[k]*ps;
		var T;   // approximate ICAO temperature profile
		if (Hp <= 11.) {
		    T = TREF - 6.5*Hp;
		} else if (Hp <= 20.) {
		    T = 216.5;
		} else if (Hp <= 32.) {
		    T = 216.5 + (Hp - 20.)
		} else {
		    T = 228.5 + 2.8*(Hp - 32.)
		}
		var Hm = Hp + 0.001*RD*T*Math.log(pp/pm)/G;
		obj[s] = 0.5*(Hm + Hp);
		Hp = Hm;
		pp = pm;
	    }
	    hmax = Math.floor(obj.p1 + 1.);
	    data.push( obj );
	}
    }
    createChart(title);
    for (var k=0; k<=nlev; k++) {
	var v = "#p" + k + "#";
	var c = "#FF0000";
	var w = 1;
	if (k == nlev) {
	    c = "#000000";
	    w = 2;
	} else if (k <= nstr) {
	    c = "#0000FF";
	    if (k == nstr) w = 2;
	} else if (k >= nlev-npbl) {
	    c = "#22AA22";
	    if (k == nlev-npbl) w = 2;
	}
	chart.addSeries({
	    value: v,
	    line: {
		color: c,
		width: w
	    }
	});
    }
    chart.parse(data,"json");
    data = null;
//    b.progressOff();
}

function dumpAB() {
    if (do_oldAB) {
	var s = oldab.split(":");
	Ah = s[0].split(",");
	Bh = s[1].split(",");
	for (var i=0; i<=nlev; i++) {
	    Ah[i] = parseFloat(Ah[i]);
	    Bh[i] = parseFloat(Bh[i]);
	}
    }
    var a8 = new Array();
    var b8 = new Array();
    for (var i=0; i<=nlev; i++) {
	a8[i] = Ah[i].toPrecision(8);
	b8[i] = Bh[i].toPrecision(8);
    }
    var ahalf = a8.join(", ");
    var bhalf = b8.join(", ");
    var popup = wins.createWindow("AB",70,70,900,700);
    var html = "ahalf="+ahalf+"<p>" +
	"bhalf="+bhalf+"<p>";
    var title;
    if ( do_oldAB ) {
	title = "User supplied half level coefficients";
    } else {
	title = "Computed hybrid half levels (for namelist)";
    }
    popup.setText(title);
    popup.attachHTMLString(html);
}

function showOldAB() {
    var abhtext = "";
    if (do_oldAB) {
	var s = oldab.split(":");
	Ah = s[0].split(",");
	Bh = s[1].split(",");
	for (var i=0; i<=nlev; i++) {
	    Ah[i] = parseFloat(Ah[i]).toPrecision(8);
	    Bh[i] = parseFloat(Bh[i]).toPrecision(8);
	}
	var ahalf = Ah.join(", ");
	var bhalf = Bh.join(", ");
	abhtext = "ahalf="+ahalf+"\n" +	"bhalf="+bhalf+"\n";
    }
    var fDat = [
	{type: "label", label: "Paste ahalf,bhalf definitions into the textarea below:" },
	{type: "input", name: "abh", value: abhtext,
	 rows:2, note:{text:"Irrelevant characters (>,',newline,commas at end of list) will be ignored."},
	 inputWidth: 950, inputHeight: 650
	},
	{type: "fieldset", name: "buttons", label: "", list: [
	    {type: "button", name: "go", value: "Plot", offsetTop:0, offsetLeft:0},
	    {type: "newcolumn"},
	    {type: "button", name: "clear", value: "Clear", offsetTop:0, offsetLeft:20}
	]}
    ];
    pop2 = wins.createWindow("oldAB",70,70,1000,815);
    pop2.setText("Enter old ahalf, bhalf lists");
    pop2.attachForm(fDat);
    form2 = pop2.getAttachedObject();
    form2.attachEvent("onButtonClick", function(id) {
	if (id == "go") {
	    var text = form2.getItemValue("abh");
	    var saved_text = text;
	    text = text.replace(/[ \'>;\n]/g,'').toLowerCase();
	    var msg = "";
	    var a1 = text.indexOf("ahalf=");
	    if ( a1 < 0 ) msg += "String 'ahalf=' not found!<br>";
	    var b1 = text.indexOf("bhalf=");
	    if ( b1 < 0 ) msg += "String 'bhalf=' not found!<br>";
	    if ( msg == "" ) {
		if (a1 < b1) {
		    astr = text.slice(a1+6,b1-1);
		    bstr = text.slice(b1+6);
		} else {
		    astr = text.slice(a1+6);
		    bstr = text.slice(b1+6,a1-1);
		}
		astr = astr.replace(/,+$/,'');
		bstr = bstr.replace(/,+$/,'');
		Ah = astr.split(',');
		Bh = bstr.split(',');
		var nleva = Ah.length - 1;
		var nlevb = Bh.length - 1;
		if (nleva != nlevb) {
		    msg += "ahalf indicates "+nleva+" levels, but "
			+ "bhalf indicates "+nlevb+" levels!";
		} else {
		    var nnan = 0;
		    for (var i=0; i<=nleva; i++) {
			Ah[i] = parseFloat(Ah[i]);
			Bh[i] = parseFloat(Bh[i]);
			if ( isNaN(Ah[i]) || isNaN(Bh[i]) ) {
			    nnan++;
			}
		    }
		    if (nnan > 0) msg += "Found invalid data in ahalf and/or bhalf, please check!";
		}
		if (msg != "") {
		    dhtmlx.message({
			type: "alert-error",
			title: "ERROR",
			text: msg
		    });
		} else {
		    vcheight = form.getItemValue("vcheight");
		    var cval = astr+":"+bstr+":"+vcheight;
		    setCookie("oldab",cval,1);
		    location.reload();
		}
	    }
	    wins.window("oldAB").close();
	} else if (id == "clear") {
	    form2.setItemValue("abh","");
	}
    });
}

function showCredit() {
    var popup = wins.createWindow("AB",70,70,900,700);
    popup.setText("Origin of algorithm");
    popup.attachURL("about_vlevs.html");
}

function clearForm() {
    setCookie("oldab","",-1);
    setCookie("v","",-1);
    location.reload();
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
