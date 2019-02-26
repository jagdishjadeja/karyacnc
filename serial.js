//console.log("App Running");
var wsconnected = 0;
var lastw = "";
var oktosend = 1;
var connectionId = null;
var eline = 0;
var okwait = 0;
var running = 0;
var px = 0;
var py = 0;
var pz = 0;
var pe = 0;
var etime = new Date();
var checktemp = 1;
var isgrbl = 0;
var gcstyle = [];

function comconnect() {
    var bt = document.getElementById('btconnect');
    if (bt.innerHTML == "Connect") {
        connect(document.getElementById('comport').value);
        bt.innerHTML = 'Disconnect';
    } else {
        disconnect();
        bt.innerHTML = 'Connect';
    }
}

function testlaser() {
    sendgcode("M3 S255 P100");
    sendgcode("M3 S0");
}

function gcodemove(x, y, z) {
    var mm = document.getElementById('move').value;
    var mmz = document.getElementById('movez').value;
    px = px + x * mm;
    py = py + y * mm;
    pz = pz + z * mmz;
    sendgcode("G0 F5000 X" + (px) + " Y" + (py) + " Z" + (pz));
}

function gcoderight() {
    gcodemove(1, 0, 0);
}

function gcodeleft() {
    gcodemove(-1, 0, 0);
}

function gcodeup() {
    gcodemove(0, -1, 0);
}

function gcodedown() {
    gcodemove(0, 1, 0);
}

function gcodezup() {
    gcodemove(0, 0, 1);
}

function gcodezdown() {
    gcodemove(0, 0, -1);
}

function homing() {
    sendgcode("G28");
    px = 0;
    py = 0;
    pz = 0;
    pe = 0;
}

function setashome2() {
    if (isgrbl)
        sendgcode("g10 p0 l20 x0 y0 z0");
    else
        sendgcode("G92 X0 Y0 Z0 E0");
    px = 0;
    py = 0;
    pz = 0;
    pe = 0;
}

function setashome3() {
    sendgcode("G0 Z2");
    pz = 2;
}

function setashome() {
    sendgcode("G0 Z0");
    pz = 0;
}

function hardstop() {
    sendgcode("M2");
    sendgcode("G0 Z2 F5000");
    sendgcode("G0 X0 Y0");
    px = 0;
    py = 0;
    pz = 2;
    stopit();
}

var comtype = 0;
// 0 serial, 1 websocket
var egcodes = [];
var debugs = 2;
function sendgcode(g) {
    if (debugs & 1)
        console.log(g);
    try {
        if (comtype == 0)
            writeSerial(g + "\n");
        if (comtype == 1)
            ws.send(g + "\n");
    } catch (e) {}
}

var shapefinish = '';
var currentshape = 0;
function nextgcode() {
    if (comtype == 1 && !wsconnected) {
        //setTimeout(nextgcode,1000);
        return;
    }
    ;// wait until socket connected
    if (okwait > 0)
        return;
    if (!running)
        return;
    while (eline < egcodes.length) {
        var g = egcodes[eline];
        if (g.indexOf(";SHAPE") == 0) {
            var sp = g.split("#")[1] * 1;
            if (currentshape && (sp != currentshape)) {
                if (shapefinish)
                    shapefinish += ',';
                shapefinish += currentshape;
                $("shapes").value = shapefinish;
            }
            currentshape = sp;
        }
        eline++;
        if (g == ";PAUSE")
            pause();
        if ((g) && (g[0] != ';') && (g[0] != '(')) {
            okwait = 1;
            sendgcode(g.split(";")[0]);
            $("progress1").value = eline * 100 / egcodes.length;
            var bt = document.getElementById('btresume2');
            bt.innerHTML = "Resume from " + eline;
            return;
        }
    }
    sendgcode("G4");
    sendgcode("M114");
    stopit();
    var bt = document.getElementById('btexecute');
    bt.innerHTML = "Execute";
    var bt = document.getElementById('btexecute2');
    bt.innerHTML = "Engrave";
}
function idleloop() {

    if (wsconnected && checktemp) {
        if (!running)
            sendgcode("M105");
        checktemp = 0;
    }
    setTimeout(idleloop, 3000);
}

function stopit() {
    stopinfo = 1;
    //var bt = document.getElementById('btexecute');
    //bt.innerHTML = "Execute";
    var bt = document.getElementById('btpause');
    bt.innerHTML = "PAUSE";
    running = 0;
    okwait = 0;
    egcodes = [];
}

function execute(gcodes) {
    shapefinish = "";
    setvalue("shapes", "");
    currentshape = 0;
    etime = new Date();
    console.log("Start " + etime);
    var bt = document.getElementById('btpause');
    bt.innerHTML = "PAUSE";
    egcodes = gcodes.split("\n");
    eline = 0;
    running = egcodes.length;
    okwait = 0;
    nextgcode();
    //sendgcode("M105");
}

function executegcodes() {
    var bt = document.getElementById('btexecute');
    if (bt.innerHTML == "Execute") {
        execute(document.getElementById('gcode').value);
        bt.innerHTML = "Stop";
    } else {
        bt.innerHTML = "Execute";
        stopit();
        sendgcode("M2");
    }
}
function executegcodes2() {
    var bt = document.getElementById('btexecute2');
    if (bt.innerHTML == "Engrave") {
        if ($("engravecut").checked)
            execute(document.getElementById('engcode').value + "\n" + document.getElementById('gcode').value);
        else
            execute(document.getElementById('engcode').value);
        bt.innerHTML = "Stop";
    } else {
        bt.innerHTML = "Engrave";
        stopit();
        sendgcode("M2");
    }
}

function executepgcodes() {
    execute(document.getElementById('pgcode').value);
//    pz = 2;
}

function pause() {
    var bt = document.getElementById('btpause');
    if (bt.innerHTML == "PAUSE") {
        running = 0;
        sendgcode("M3 S200 P10");
        bt.innerHTML = "RESUME";
    } else {
        running = 1;
        sendgcode("M3 S200");
        nextgcode();
        bt.innerHTML = "PAUSE";
    }
}
var ss = "";
var eeprom = {};
var ineeprom = 0;
var eppos = 0;
var resp1 = "";
var stopinfo = 0;
var onReadCallback = function(s) {
    resp1 += s;
    for (var i = 0; i < s.length; i++) {
        if (s[i] == "\n") {

            if (ss.indexOf("Z:") > 0) {
                px = parseFloat(ss.substr(ss.indexOf("X:") + 2));
                py = parseFloat(ss.substr(ss.indexOf("Y:") + 2));
                pz = parseFloat(ss.substr(ss.indexOf("Z:") + 2));
                pe = parseFloat(ss.substr(ss.indexOf("E:") + 2));
            }
            if (debugs & 2)
                console.log(ss);
            ss = "";
        } else
            ss += s[i];
        if ((s[i] == "\n") || (s[i] == " ") || (s[i] == "*")) {
            if (ineeprom > 0) {
                if (ineeprom == 3)
                    eppos = lastw;
                if (ineeprom == 2)
                    eeprom[eppos] = lastw;
                if (ineeprom == 1) {
                    var sel = document.getElementById("eepromid");
                    sel.innerHTML += "<option value=\"" + eeprom[eppos] + ":" + eppos + "\">" + lastw + "</option>";
                }
                ineeprom--;
            }
            if (lastw.toUpperCase().indexOf("EPR:") >= 0) {
                ineeprom = 3;
            }
            if (lastw.toUpperCase().indexOf("T:") >= 0) {
                document.getElementById("info3d").innerHTML = lastw;
                checktemp = 1;
            }
            if (!isgrbl && (lastw.toUpperCase().indexOf('GRBL') >= 0))
                isgrbl = 1;
            isok = (lastw.length == 2) && (lastw[0].toUpperCase() == 'O');
            if (isok || (lastw.toUpperCase().indexOf('OK') >= 0) || (lastw.toUpperCase().indexOf('ERROR:') >= 0) || (lastw.toUpperCase().indexOf('WAIT') >= 0)) {
                okwait = 0;
                if ((lastw.toUpperCase().indexOf('WAIT') >= 0)) {
					if (stopinfo) {
						var ms = etime.getTime();
						etime = new Date();
						console.log("Stop " + etime);
						ms = etime.getTime() - ms;
						mss = "Real time:" + mround(ms / 60000.0);
						console.log(mss);
						$("infolain").innerHTML = mss;
						stopinfo = 0;
					} else sendgcode("M114");
                }
                nextgcode();
            }
            lastw = "";
        } else
            lastw = lastw + s[i];
    }
}

var listPorts = function() {
    chrome.serial.getDevices(onGotDevices);
};

var onGotDevices = function(ports) {
    var s = "";
    for (var i = 0; i < ports.length; i++) {
        if (ports[i].path)
            s = s + "<option value=" + ports[i].path + ">" + ports[i].path + "</option>";
    }
    document.getElementById("comport").innerHTML = s;
};
var baud = 115200;
var connect = function(path) {
    try {
        baud = parseFloat(getvalue("baudrate"));
    } catch (e) {
        baud = 115200 * 2;
    }

    var options = {
        bitrate: baud
    };
    chrome.serial.connect(path, options, onConnect)
};

var onConnect = function(connectionInfo) {
    //console.log(connectionInfo);
    connectionId = connectionInfo.connectionId;
};

var disconnect = function() {
    chrome.serial.disconnect(connectionId, onDisconnect);
};

var onDisconnect = function(result) {
    if (result) {//console.log("Disconnected from the serial port");
    } else {//console.log("Disconnect failed");
    }
};

//var setOnReadCallback = function(callback) {
//	onReadCallback = callback;
//	chrome.serial.onReceive.addListener(onReceiveCallback);
//};

var onReceiveCallback = function(info) {
    if (info.connectionId == connectionId && info.data) {
        var str = convertArrayBufferToString(info.data);
        //console.log(str);
        if (onReadCallback != null) {
            onReadCallback(str);
        }
    }
};
var onSend = function(sendInfo) {//console.log(sendInfo);
}

var writeSerial = function(str) {
    chrome.serial.send(connectionId, convertStringToArrayBuffer(str), onSend);
}
// Convert ArrayBuffer to string
var convertArrayBufferToString = function(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}
// Convert string to ArrayBuffer
var convertStringToArrayBuffer = function(str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function changematerial() {
    val = getvalue("material");
    val = val.split(",");
    setvalue("feed", val[0]);
    setvalue("repeat", val[1]);
    setvalue("matprice", val[2]);
    setvalue("cutprice", val[3]);
    harga = val[2];
    if (val.length == 5) {
        document.getElementById("cmode").value = 3;
        setvalue("zdown", val[4]);
        setvalue("tabc", 1.5);
    }
    if (val.length == 4) {
        document.getElementById("cmode").value = 1;
        setvalue("zdown", 0);
        setvalue("tabc", 0);

    }

}

function modechange() {
    val = getvalue("cmode");
    if (val == 1) {
        setvalue("pup", "");
        setvalue("pdn", "M3 S255");
    }
    if (val == 2) {
        setvalue("pup", "M3 S0");
        setvalue("pdn", "M3 S255");
    }
    if (val == 3) {
        setvalue("pup", "G0 F350 Z2");
        setvalue("pdn", "G0 F240 Z=cncz");
        //setvalue("feed", "3");
        //setvalue("zdown", "10");
    }
    if (val == 4) {
        setvalue("pup", "");
        setvalue("pdn", "");
        //setvalue("feed", "30");
        //setvalue("zdown", "10");
    }
}
//onclick="setashome();"
function initserial() {
    try {
        chrome.serial.onReceive.removeListener(onReceiveCallback);
        chrome.serial.onReceive.addListener(onReceiveCallback);
        listPorts();
        comtype = 0;
    } catch (e) {
        comtype = -1;
    }
}
setclick("btcekpos", function() {
    sendgcode("m114");
});
setclick("btinitser", initserial);
setclick("btconnect", comconnect);
setclick("btsethome", setashome);
setclick("btsethome2", setashome2);
setclick("btsethome3", setashome3);
setclick("bthoming", homing);
setclick("bthardstop", hardstop);
setclick("btpreview", executepgcodes);
setclick("btexecute", executegcodes);
setclick("btexecute2", executegcodes2);
setclick("btpause", pause);
setclick("bthit", testlaser);
setclick("btleft", gcodeleft);
setclick("btup", gcodeup);
setclick("btdn", gcodedown);
setclick("btright", gcoderight);
setclick("btzup", gcodezup);
setclick("btzdn", gcodezdown);
setclick("btrecode", refreshgcode);
setclick("btrecode2", refreshgcode);
setclick("btsend", function() {
    sendgcode(getvalue("edgcode"));
})
setclick("btmotoroff", function() {
    sendgcode("M84");
})
setevent("change", "cmode", modechange);

setevent("change", "material", changematerial);
setclick("btresume", function() {
    okwait = 0;
    sendgcode("m3 S255");
    nextgcode();
});
setclick("btsetcut", function() {
    setvalue("disablecut", getvalue("shapes"));
});

setclick("btengrave", function() {
    window.open("http://localhost:" + port + "/engrave", 'prn', 'width=700,height=500');
});
setclick("btresume2", function() {
    okwait = 0;
    var bt = document.getElementById('btresume2');
    ln = bt.innerHTML.split(" ")[2];
    eline = ln * 1;

    sendgcode("m3 S255");
    nextgcode();
});

// 3d printer

setclick("bt3home", function() {
    sendgcode("g28");
    pe = 0
});
setclick("btzero", function() {
    sendgcode("g10 p0 l20 x0 y0 z0");
});
setclick("bt3pla", function() {
    sendgcode("m104 s180");
});
setclick("bt3t0", function() {
    sendgcode("m104 s0");
});
setclick("bt3read", function() {
    sendgcode("m105");
});
setclick("bt3limit", function() {
    sendgcode("m119");
});
setclick("bt3eeprom", function() {
    document.getElementById("eepromid").innerHTML = "";
    sendgcode("m205");
});
setclick("bt3seteeprom", function() {
    sendgcode("M206 P" + eppos + " S" + getvalue("eepromval"));

});
setclick("bt3Eup", function() {
    pe -= 1 * getvalue("extmm");
    sendgcode("g0 E" + pe);
});
setclick("bt3Edn", function() {
    pe += 1 * getvalue("extmm");
    sendgcode("g0 E" + pe);
});
setevent("change", "eepromid", function() {
    var v = getvalue("eepromid").split(":");
    setvalue("eepromval", v[0]);
    eppos = v[1];
});

var hidd = true;
setclick("bthidden", function() {
    var d = 'none';
    if (hidd)
        d = 'block';
    hidd = !hidd;
    $("vars").style.display = d;
});
var hidd5 = true;
setclick("bthidden5", function() {
    var d = 'none';
    if (hidd5)
        d = 'block';
    hidd5 = !hidd5;
    $("vars3").style.display = d;
});
var hidd2 = true;
setclick("bthidden2", function() {
    var d = 'none';
    if (hidd2)
        d = 'block';
    hidd2 = !hidd2;
    $("vars2").style.display = d;
});
// gcode editor
var hidd3 = true;
setclick("bthidden3", function() {
    var d = 'none';
    if (hidd3)
        d = 'block';
    hidd3 = !hidd3;
    $("gcodepreview").style.display = d;
});
// gcode editor

setclick("btcopy1", function() {
    copy_to_clipboard('gcode');
});
setclick("btcopy2", function() {
    copy_to_clipboard('pgcode');
});

setclick("tracingbt", function() {
    tr = document.getElementById('tracing');
    tb = document.getElementById('tracingbt');
    if (tb.innerHTML == "GCODE SENDER") {
        tb.innerHTML = "TRACING IMAGE";
        tr.hidden = true;
    } else {
        tb.innerHTML = "GCODE SENDER";
        tr.hidden = false;
    }

});
setclick("wsconnect", function() {
    connectwebsock();
});

var stotype = 0;
try {
    storage = chrome.storage.local;

} catch (e) {
    stotype = 1;
    storage = localStorage;
}

function savesetting() {
    var a = document.getElementsByClassName("saveit");
    sett = {};
    for (var i = 0; i < a.length; i++) {
        if (a[i].type == 'text')
            sett[a[i].id] = a[i].value;
        if (a[i].type == 'select-one')
            sett[a[i].id] = a[i].value;
        if (a[i].type == 'checkbox')
            sett[a[i].id] = a[i].checked;
    }
	updatestyle("wcolor",getvalue("wcolor"));
	updatestyle("wtitle",getvalue("wtitle"));
    if (stotype == 1) {
        storage.setItem("settings", JSON.stringify(sett));
        storage.setItem("text1", text1);
        storage.setItem("gcstyle", JSON.stringify(gcstyle));
    } else {
        storage.set({
            "settings": sett,
            "text1": text1,
            "gcstyle": gcstyle
        });
    }
}
setclick("btsaveset", savesetting);
setclick("btgcode2vec", function() {
    text1 = gcodetoText1(getvalue("gcode"));
    refreshgcode();
});

function updatestyle(k,va){
	if (k=='wtitle'){
		$("title0").innerHTML=va;
	}
	if (k=='wcolor'){
		$("title1").style.background=va;
		$("title2").style.background=va;
	}
}
function updateweb(sett){
	for (var k in sett) {
		var a = $(k);
		if (a.type == 'checkbox')
			a.checked = sett[k];
		else
			setvalue(k, sett[k]);
		// custom
		updatestyle(k,sett[k]);
	}
}
try {
    if (stotype == 0) {
        storage.get("text1", function(r) {
            text1 = r.text1;
        })
        storage.get("gcstyle", function(r) {
            gcstyle = r.gcstyle;
        })
        storage.get("settings", function(r) {
			updateweb(r.settings);
        });
    } else {
        text1 = storage.text1;
        if (text1 == undefined)text1 = "";
        if (storage.gcstyle != undefined) gcstyle = JSON.parse(storage.gcstyle);
        if (storage.settings != undefined) {
			updateweb(JSON.parse(storage.settings));
        }
    }
    //connectwebsock();

} catch (e) {}

// websocket
var websockOK=0;
function reconnectwebsock(){
	if (websockOK){
		setTimeout(connectwebsock, 2000);
	}
}

function connectwebsock() {
	websockOK=0;
    if (wsconnected) {
        ws.close();
        return;
    }
    h = getvalue("wsip");
    if (h) {
        var lastcomtype = comtype;
        comtype = 1;
        var a = document.getElementById("status");
        a.innerHTML = "Web socket:Connecting...";

        function handlemessage(m) {
            msg = m.data;
            onReadCallback(msg);
            //if (debugs & 2) console.log(msg);
        }

        ws = new WebSocket('ws://' + h + ':81/',['arduino']);
        ws.onerror = function(e) {
            comtype = lastcomtype;
            a.innerHTML = "Web socket:Failed connect ! ";
            $("wsconnect").innerHTML = 'Connect';
            ws.close();
            wsconnected = 0;
			reconnectwebsock();

        }
        // back to serial if error.
        ws.onmessage = handlemessage;
        ws.onopen = function(e) {
            console.log('Ws Connected!');
            a.innerHTML = "Web socket:Connected";
            $("wsconnect").innerHTML = 'Close';
            wsconnected = 1;
            //nextgcode(); // 
			sendgcode("M114");
			websockOK=1;
			
        }
        ;

        ws.onclose = function(e) {
            console.log('ws Disconnected!');
            a = document.getElementById("status");
            a.innerHTML = "Web socket:disconnected";
            $("wsconnect").innerHTML = 'Connect';
            wsconnected = 0;
			reconnectwebsock();
        }
        ;
        idleloop();
    }
}

function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = false;
    if ("withCredentials"in xhr) {

        // Check if the XMLHttpRequest object has a "withCredentials" property.
        // "withCredentials" only exists on XMLHTTPRequest2 objects.
        xhr.open(method, url, true);

    } else if (typeof XDomainRequest != "undefined") {

        // Otherwise, check if XDomainRequest.
        // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
        xhr = new XDomainRequest();
        xhr.open(method, url);

    } else {

        // Otherwise, CORS is not supported by the browser.
        xhr = null;

    }
    return xhr;
}

// web socket server, to receive gcode from other
var port = 8888;
var isServer = false;
function startserver() {
    if (http.Server && http.WebSocketServer) {
        // Listen for HTTP connections.
        port = getvalue("wsport") * 1;
        var server = new http.Server();
        var wsServer = new http.WebSocketServer(server);
        server.listen(port);
        isServer = true;

        server.addEventListener('request', function(req) {
            var url = req.headers.url;
            if (url == '/')
                url = '/engrave';
            if (url == '/engrave')
                url = '/graf.html';
            // Serve the pages of this chrome application.
            req.serveUrl(url);
            return true;
        });

        // A list of connected websockets.
        var connectedSockets = [];

        wsServer.addEventListener('request', function(req) {
            console.log('Client connected');
            var socket = req.accept();
            connectedSockets.push(socket);

            // When a message is received on one socket, rebroadcast it on all
            // connected sockets.
            var buff = "";
            socket.addEventListener('message', function(e) {
                if (e.data == ">PAUSE") {
                    socket.send("DATA");
                    //setvalue("engcode",buff);
                }
                if (e.data == ">FINISH") {
                    socket.send("OK");
                    setvalue("engcode", buff);
                    buff = "";
                }
                if (e.data == ">REVECTOR") {
                    text1 = gcodetoText1(buff);
                    refreshgcode();
                    buff = "";
                } else {
                    buff += e.data;
                }
            });

            // When a socket is closed, remove it from the list of connected sockets.
            socket.addEventListener('close', function() {
                console.log('Client disconnected');
                for (var i = 0; i < connectedSockets.length; i++) {
                    if (connectedSockets[i] == socket) {
                        connectedSockets.splice(i, 1);
                        break;
                    }
                }
            });
            socket.send("DATA");
            return true;
        });
    }
}

window.onresize = function() {
    var nw = Math.max(100, window.innerWidth - 765);
    var v = $('myCanvas1');
    v.width = nw*2;
	nh=Math.max(300, 500 * nw / 600);
    v.height = nh*2;
	$('myCanvas1td').width=nw+50;
	$('myCanvas1div').style.width=nw+50;
	$('myCanvas1div').style.height=nh;
    gcode_verify();
}

setTimeout(function() {
    //var h=window.location.host;
    //a = document.activeElement;
    //if ((a.tagName == "DIV") && (stotype == 1)) a.remove();
    //if (h)setvalue("wsip",h);
    startserver();
    window.onresize();
    if (text1)
        refreshgcode();
    hideId("gcodepreview");
    hideId("gcodeinit");
}, 2000);
